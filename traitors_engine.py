"""Het Verraad: weekendspel met geheime rollen op eigen telefoons.

De server is de enige bron van waarheid. Elke view wordt per rol opgebouwd uit
een witte lijst van velden: het beamerscherm en de pc-console krijgen nooit
rollen, nachtkeuzes of stemmen vóór de onthulling.
"""
import copy
import random
import secrets
import uuid

MIN_PLAYERS = 5
MAX_PLAYERS = 24
PHASES = ('lobby', 'roles', 'day', 'mission', 'table', 'vote', 'reveal', 'banish',
          'night', 'morning', 'endgame', 'end')


class TraitorsError(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status


def suggested_traitors(count):
    """1 verrader op 5–7 spelers, 2 op 8–12, 3 op 13–17, 4 vanaf 18."""
    if count < 8: return 1
    if count < 13: return 2
    if count < 18: return 3
    return 4


class Traitors:
    def __init__(self, game, missions, rng=None):
        self.game, self.missions = game, missions
        self.rng = rng or random.SystemRandom()
        if 'traitors' not in game.s:
            game.s['traitors'] = self.blank()
        self.s = game.s['traitors']
        for p in self.s['players']: p['seen'] = 0

    # ------------------------------------------------------------------ basis
    def blank(self):
        return {'id': str(uuid.uuid4()), 'code': str(secrets.randbelow(900000) + 100000), 'phase': 'lobby',
                'day': 0, 'players': [], 'pot': 0, 'settings': {'traitors': 0, 'endgame_at': 4, 'ultimatum': False},
                'log': [], 'mission': None, 'missions_done': [], 'vote': None, 'banished': None, 'night': None,
                'morning': None, 'endgame': None, 'result': None, 'acks': [], 'revision': 0}

    def save(self):
        self.s['revision'] += 1
        self.game._save()

    def now(self): return self.game.clock()
    def player(self, ident): return next((p for p in self.s['players'] if p['id'] == ident), None)
    def alive(self): return [p for p in self.s['players'] if p['status'] == 'alive']
    def alive_ids(self): return [p['id'] for p in self.alive()]
    def traitors_alive(self): return [p for p in self.alive() if p['role'] == 'traitor']
    def faithful_alive(self): return [p for p in self.alive() if p['role'] == 'faithful']
    def name(self, ident): return (self.player(ident) or {}).get('name', '')

    def log(self, text):
        self.s['log'].append({'day': self.s['day'], 'text': text})
        self.s['log'] = self.s['log'][-80:]

    def by_token(self, key):
        p = next((p for p in self.s['players'] if isinstance(key, str) and secrets.compare_digest(p['token'], key)), None)
        if not p: raise TraitorsError('Meld je opnieuw aan met je persoonlijke code.', 403)
        return p

    # ------------------------------------------------------------- aansluiten
    def join(self, data):
        with self.game.lock:
            if str(data.get('code', '')).strip() != self.s['code']: raise TraitorsError('Onjuiste spelcode.', 403)
            access = str(data.get('access_code', '')).strip().upper()
            if access:
                p = next((p for p in self.s['players'] if secrets.compare_digest(p['access'], access)), None)
                if not p: raise TraitorsError('Onjuiste persoonlijke code.', 403)
            else:
                if self.s['phase'] != 'lobby': raise TraitorsError('Het spel is begonnen. Gebruik je persoonlijke code om terug te komen.')
                name = str(data.get('name', '')).strip()[:30]
                if not name: raise TraitorsError('Vul je naam in.')
                if any(x['name'].casefold() == name.casefold() for x in self.s['players']): raise TraitorsError('Die naam is al gekozen. Voeg bijvoorbeeld een initiaal toe.')
                if len(self.s['players']) >= MAX_PLAYERS: raise TraitorsError(f'Maximaal {MAX_PLAYERS} spelers.')
                p = {'id': str(uuid.uuid4()), 'token': secrets.token_urlsafe(24), 'access': secrets.token_hex(3).upper(),
                     'name': name, 'seen': 0, 'status': 'alive', 'role': None, 'shield': False, 'recruited': False, 'out_day': None}
                self.s['players'].append(p)
            p['seen'] = self.now(); self.save()
            return {'token': p['token']}

    # -------------------------------------------------------------- spelleider
    def host_action(self, data):
        s = self.s; act = data.get('action'); ph = s['phase']
        if act == 'settings':
            if ph != 'lobby': raise TraitorsError('Instellingen kun je alleen in de lobby wijzigen.')
            n = data.get('traitors', 0); end = data.get('endgame_at', 4)
            if type(n) is not int or not 0 <= n <= 4: raise TraitorsError('Kies 0 (automatisch) tot 4 verraders.')
            if type(end) is not int or not 3 <= end <= 6: raise TraitorsError('Het eindspel begint bij 3 tot 6 spelers.')
            s['settings'].update(traitors=n, endgame_at=end, ultimatum=data.get('ultimatum') is True)
        elif act == 'simple':
            # 0.14: eenvoudige variant voor beginners en kleine groepen: één verrader, kort eindspel, geen ultimatum.
            if ph != 'lobby': raise TraitorsError('Kies de variant in de lobby.')
            s['settings'].update(traitors=1, endgame_at=3, ultimatum=False)
        elif act == 'remove':
            if ph != 'lobby': raise TraitorsError('Gebruik tijdens het spel "Speler vertrekt".')
            s['players'] = [p for p in s['players'] if p['id'] != data.get('id')]
        elif act == 'start': self.start()
        elif act == 'roles_done':
            self.need(ph, 'roles')
            s['phase'] = 'day'; s['day'] = 1; s['acks'] = []; self.log('Dag 1 begint.')
        elif act == 'mission':
            self.need(ph, 'day')
            m = next((m for m in self.missions if m['id'] == data.get('id')), None)
            if not m: raise TraitorsError('Kies een opdracht uit de lijst.')
            mission = {'id': m['id'], 'title': m['title'], 'text': m['text'], 'kind': m['kind'], 'shield': bool(m.get('shield')),
                       'suggested': m.get('suggested', 0), 'earned': 0}
            if m['kind'] == 'quiz':
                pool = [q for q in self.game.packs.get('nl', []) if q.get('options')]
                mission.update(questions=self.rng.sample(pool, min(m.get('questions', 8), len(pool))), index=0,
                               revealed=False, per_correct=m.get('per_correct', 100), correct=0)
                if not mission['questions']: raise TraitorsError('Geen quizvragen beschikbaar.')
            s['mission'] = mission; s['phase'] = 'mission'
        elif act == 'quiz_reveal':
            m = self.quiz()
            m['revealed'] = True
        elif act == 'quiz_mark':
            m = self.quiz()
            if not m['revealed']: raise TraitorsError('Onthul eerst het antwoord.')
            if data.get('correct') is True:
                m['correct'] += 1; m['earned'] += m['per_correct']
            m['index'] += 1; m['revealed'] = False
        elif act == 'mission_done':
            self.need(ph, 'mission')
            m = s['mission']; amount = data.get('amount', m['earned'])
            if type(amount) is not int or not -100000 <= amount <= 100000: raise TraitorsError('Vul een geldig bedrag in.')
            shields = data.get('shields', [])
            if not isinstance(shields, list) or any(x not in self.alive_ids() for x in shields): raise TraitorsError('Een schild gaat alleen naar spelers die nog meedoen.')
            s['pot'] = max(0, s['pot'] + amount)
            for ident in shields: self.player(ident)['shield'] = True
            s['missions_done'].append(m['id'])
            self.log(f"Opdracht ‘{m['title']}’: {'+' if amount >= 0 else '−'}€{abs(amount)} in de pot.")
            s['mission'] = None; s['phase'] = 'day'
        elif act == 'mission_cancel':
            self.need(ph, 'mission'); s['mission'] = None; s['phase'] = 'day'
        elif act == 'table':
            self.need(ph, 'day'); s['phase'] = 'table'
        elif act == 'open_vote':
            if ph not in ('table', 'endgame'): raise TraitorsError('Open de stemming vanuit de ronde tafel.')
            if ph == 'endgame' and not (s['endgame'] or {}).get('decided') == 'continue': raise TraitorsError('Het eindspel vraagt eerst of iedereen wil stoppen.')
            self.open_vote(self.alive_ids(), endgame=ph == 'endgame')
        elif act == 'close_vote':
            self.need(ph, 'vote'); self.close_vote(force=True)
        elif act == 'reveal_next':
            self.need(ph, 'reveal')
            v = s['vote']
            if v['shown'] < len(v['order']): v['shown'] += 1
            else: self.after_reveal()
        elif act == 'reveal_all':
            self.need(ph, 'reveal'); s['vote']['shown'] = len(s['vote']['order'])
        elif act == 'banish_reveal':
            self.need(ph, 'banish'); s['banished']['shown'] = True
        elif act == 'banish_done':
            self.need(ph, 'banish')
            if not s['banished']['shown']: raise TraitorsError('Onthul eerst de rol.')
            self.after_banish()
        elif act == 'close_night':
            self.need(ph, 'night'); self.resolve_night(force=True)
        elif act == 'morning_reveal':
            self.need(ph, 'morning'); s['morning']['shown'] = True
        elif act == 'morning_done':
            self.need(ph, 'morning')
            if not s['morning']['shown']: raise TraitorsError('Onthul eerst wie er ontbreekt.')
            s['morning'] = None
            for p in s['players']: p['shield'] = False
            if not self.check_end():
                s['day'] += 1
                if len(self.alive()) <= s['settings']['endgame_at']:
                    self.log(f"Dag {s['day']}: nog {len(self.alive())} spelers. Het eindspel begint."); self.start_endgame()
                else:
                    s['phase'] = 'day'; self.log(f"Dag {s['day']} begint.")
        elif act == 'endgame_close':
            self.need(ph, 'endgame'); self.close_endgame(force=True)
        elif act == 'leave':
            p = self.player(data.get('id'))
            if not p or p['status'] != 'alive' or ph in ('lobby', 'end'): raise TraitorsError('Deze speler doet niet meer mee.')
            if ph in ('vote', 'night', 'reveal', 'banish', 'morning'): raise TraitorsError('Laat een speler vertrekken tijdens de dag of de ronde tafel.')
            p['status'] = 'left'; p['out_day'] = s['day']; p['shield'] = False
            self.log(f"{p['name']} verlaat het spel en was {'een Verrader' if p['role'] == 'traitor' else 'Getrouw'}.")
            self.check_end()
        elif act == 'show_code':
            p = self.player(data.get('id'))
            if not p: raise TraitorsError('Speler niet gevonden.')
            self.log(f"De persoonlijke code van {p['name']} is op de pc opnieuw getoond.")
            self.shown_code = {'id': p['id'], 'name': p['name'], 'access': p['access']}
        elif act == 'reset':
            keep = [{**p, 'status': 'alive', 'role': None, 'shield': False, 'recruited': False, 'out_day': None} for p in s['players']]
            code = s['code']; s.clear(); s.update(self.blank()); s['players'] = keep; s['code'] = code
        else:
            raise TraitorsError('Onbekende actie.')

    def need(self, phase, wanted):
        if phase != wanted: raise TraitorsError('Deze stap past nu niet in het spel.', 409)

    def quiz(self):
        m = self.s.get('mission')
        if self.s['phase'] != 'mission' or not m or m['kind'] != 'quiz' or m['index'] >= len(m['questions']):
            raise TraitorsError('Er is geen quizvraag actief.', 409)
        return m

    def start(self):
        s = self.s
        self.need(s['phase'], 'lobby')
        n = len(s['players'])
        if n < MIN_PLAYERS: raise TraitorsError(f'Minimaal {MIN_PLAYERS} spelers nodig.')
        count = s['settings']['traitors'] or suggested_traitors(n)
        if count * 2 >= n: raise TraitorsError('Te veel verraders voor deze groep.')
        chosen = set(p['id'] for p in self.rng.sample(s['players'], count))
        for p in s['players']:
            p.update(role='traitor' if p['id'] in chosen else 'faithful', status='alive', shield=False, recruited=False, out_day=None)
        s.update(phase='roles', day=0, pot=0, start_traitors=count, log=[], acks=[], missions_done=[], recruited_once=False)
        self.log(f'{n} spelers, {count} {"verrader" if count == 1 else "verraders"}. Niemand weet wie.')

    # --------------------------------------------------------------- stemmen
    def open_vote(self, candidates, endgame=False, second=False):
        s = self.s
        s['vote'] = {'id': str(uuid.uuid4()), 'voters': self.alive_ids(), 'candidates': candidates, 'ballots': {},
                     'second': second, 'endgame': endgame, 'order': [], 'shown': 0, 'tally': {}, 'outcome': None}
        s['phase'] = 'vote'

    def cast(self, p, target):
        v = self.s['vote']
        if p['id'] not in v['voters']: raise TraitorsError('Je stemt deze ronde niet mee.')
        if p['id'] in v['ballots']: raise TraitorsError('Je stem is al uitgebracht.', 409)
        if target == p['id'] or target not in v['candidates']: raise TraitorsError('Kies een andere speler.')
        v['ballots'][p['id']] = target
        if len(v['ballots']) == len(v['voters']): self.close_vote()

    def close_vote(self, force=False):
        s = self.s; v = s['vote']
        if not v['ballots']: raise TraitorsError('Er is nog niet gestemd.')
        tally = {}
        for target in v['ballots'].values(): tally[target] = tally.get(target, 0) + 1
        top = max(tally.values()); leaders = [i for i, n in tally.items() if n == top]
        order = list(v['ballots']); self.rng.shuffle(order)
        v.update(order=order, tally=tally, shown=0, missing=[i for i in v['voters'] if i not in v['ballots']])
        if len(leaders) == 1: v['outcome'] = {'kind': 'banish', 'id': leaders[0]}
        elif not v['second']: v['outcome'] = {'kind': 'revote', 'ids': leaders}
        else: v['outcome'] = {'kind': 'draw', 'ids': leaders, 'id': self.rng.choice(leaders)}
        s['phase'] = 'reveal'

    def after_reveal(self):
        s = self.s; out = s['vote']['outcome']
        if out['kind'] == 'revote':
            self.log('Gelijke stand: er wordt opnieuw gestemd tussen ' + ' en '.join(self.name(i) for i in out['ids']) + '.')
            self.open_vote(out['ids'], endgame=s['vote']['endgame'], second=True); return
        if out['kind'] == 'draw':
            self.log('Opnieuw gelijk: het lot wijst ' + self.name(out['id']) + ' aan.')
        p = self.player(out['id'])
        p['status'] = 'banished'; p['out_day'] = s['day']; p['shield'] = False
        s['banished'] = {'id': p['id'], 'role': p['role'], 'shown': False, 'endgame': s['vote']['endgame']}
        s['phase'] = 'banish'

    def after_banish(self):
        s = self.s; b = s['banished']
        self.log(f"{self.name(b['id'])} is verbannen en was {'een Verrader' if b['role'] == 'traitor' else 'Getrouw'}.")
        endgame = b['endgame']; s['banished'] = None; s['vote'] = None
        if self.check_end(): return
        if endgame or len(self.alive()) <= s['settings']['endgame_at']: self.start_endgame(); return
        self.start_night()

    # ------------------------------------------------------------------ nacht
    def start_night(self):
        s = self.s
        can_recruit = len(self.traitors_alive()) < s['start_traitors'] and len(self.faithful_alive()) > 1
        s['night'] = {'picks': {}, 'mode': 'murder', 'can_recruit': can_recruit, 'decided': None,
                      'offer': None, 'asleep': [], 'id': str(uuid.uuid4())}
        s['phase'] = 'night'

    def night_pick(self, p, data):
        n = self.s['night']
        if p['role'] != 'traitor': raise TraitorsError('Je slaapt. Tik alleen op Welterusten.')
        if n['decided']: raise TraitorsError('Jullie keuze voor vannacht staat vast.', 409)
        mode = data.get('mode', 'murder'); target = data.get('target')
        if mode not in ('murder', 'recruit') or (mode == 'recruit' and not n['can_recruit']): raise TraitorsError('Kies vermoorden.')
        if target not in [f['id'] for f in self.faithful_alive()]: raise TraitorsError('Kies een Getrouwe die nog meedoet.')
        n['picks'][p['id']] = {'mode': mode, 'target': target}
        traitors = [t['id'] for t in self.traitors_alive()]
        picks = [n['picks'].get(t) for t in traitors]
        if all(picks) and len({(x['mode'], x['target']) for x in picks}) == 1:
            self.decide_night(picks[0]['mode'], picks[0]['target'])

    def decide_night(self, mode, target):
        n = self.s['night']; n['decided'] = {'mode': mode, 'target': target}
        # De nacht blijft duren tot de pc 'De ochtend breekt aan' kiest: zo verraadt het
        # beamerscherm niet wanneer de verraders klaar zijn.
        if mode == 'recruit': n['offer'] = {'target': target, 'answer': None}

    def resolve_night(self, force=False):
        s = self.s; n = s['night']
        if force and not n['decided']:
            picks = list(n['picks'].values())
            if picks:
                counts = {}
                for x in picks: counts[(x['mode'], x['target'])] = counts.get((x['mode'], x['target']), 0) + 1
                best = max(counts.values()); choice = self.rng.choice([k for k, c in counts.items() if c == best])
                self.decide_night(*choice)
                if n['offer'] and n['offer']['answer'] is None: return
            else:
                n['decided'] = {'mode': 'none', 'target': None}
        if force and n['offer'] and n['offer']['answer'] is None:
            n['offer']['answer'] = 'decline'
        d = n['decided']; result = {'murdered': None, 'shielded': False, 'recruited': False, 'declined': False, 'shown': False}
        if d['mode'] == 'murder':
            victim = self.player(d['target'])
            if victim['shield']: result['shielded'] = True
            else:
                victim['status'] = 'murdered'; victim['out_day'] = s['day']; result['murdered'] = victim['id']
        elif d['mode'] == 'recruit':
            target = self.player(d['target'])
            if n['offer']['answer'] == 'accept':
                target['role'] = 'traitor'; target['recruited'] = True; result['recruited'] = True; s['recruited_once'] = True
            elif s['settings']['ultimatum'] and not target['shield']:
                target['status'] = 'murdered'; target['out_day'] = s['day']; result['murdered'] = target['id']
            else:
                result['declined'] = True
        s['morning'] = result; s['night'] = None; s['phase'] = 'morning'
        if result['murdered']: self.log(f"{self.name(result['murdered'])} is vermoord.")
        elif result['shielded']: self.log('Een schild redde vannacht een leven.')
        else: self.log('Niemand is vannacht vermoord.')

    def offer_answer(self, p, answer):
        n = self.s['night']
        if not n or not n['offer'] or n['offer']['target'] != p['id'] or n['offer']['answer'] is not None: raise TraitorsError('Er ligt geen aanbod voor je klaar.')
        if answer not in ('accept', 'decline'): raise TraitorsError('Kies aannemen of weigeren.')
        n['offer']['answer'] = answer

    # -------------------------------------------------------------- eindspel
    def start_endgame(self):
        self.s['endgame'] = {'votes': {}, 'decided': None, 'round': (self.s.get('endgame') or {}).get('round', 0) + 1}
        self.s['phase'] = 'endgame'

    def endgame_vote(self, p, choice):
        e = self.s['endgame']
        if e['decided']: raise TraitorsError('De groep heeft al besloten.', 409)
        if choice not in ('end', 'continue'): raise TraitorsError('Kies stoppen of doorgaan.')
        if p['id'] in e['votes']: raise TraitorsError('Je keuze is al uitgebracht.', 409)
        e['votes'][p['id']] = choice
        if len(e['votes']) == len(self.alive()): self.close_endgame()

    def close_endgame(self, force=False):
        e = self.s['endgame']
        if e['decided']: raise TraitorsError('De groep heeft al besloten.', 409)
        if not e['votes'] and not force: return
        alive = self.alive_ids()
        stop = all(e['votes'].get(i) == 'end' for i in alive)
        e['decided'] = 'end' if stop else 'continue'
        if stop: self.finish()
        elif len(alive) <= 2: self.finish()

    def check_end(self):
        """Direct einde als er geen verraders meer zijn of als zij in de meerderheid zijn."""
        traitors, faithful = self.traitors_alive(), self.faithful_alive()
        if not traitors or len(traitors) >= len(faithful):
            self.finish(); return True
        return False

    def finish(self):
        s = self.s; traitors = self.traitors_alive(); alive = self.alive()
        winners = traitors if traitors else alive
        share = s['pot'] // max(1, len(winners))
        s['result'] = {'side': 'traitors' if traitors else 'faithful', 'winners': [p['id'] for p in winners], 'share': share}
        s['phase'] = 'end'; s['ended_at'] = self.now()
        self.log(('Het Verraad winnen' if traitors else 'De Getrouwen winnen') + f" €{s['pot']} (€{share} per winnaar).")

    def final_results(self):
        """0.15: winnaars krijgen hun deel van de pot, de rest 0 (voor rangpunten in de app)."""
        s = self.s; r = s.get('result')
        if s.get('phase') != 'end' or not r: return None
        return [{'name': p['name'], 'score': r['share'] if p['id'] in r['winners'] else 0} for p in s['players']]

    # ------------------------------------------------------------ spelersactie
    def player_action(self, key, data):
        with self.game.lock:
            p = self.by_token(key); p['seen'] = self.now(); s = self.s; act = data.get('action')
            if data.get('phase_id') not in (None, self.phase_id()): raise TraitorsError('Het spel is verder gegaan. Je scherm wordt bijgewerkt.', 409)
            if act == 'ack':
                if s['phase'] == 'roles' and p['id'] not in s['acks']: s['acks'].append(p['id'])
                elif s['phase'] == 'night' and p['status'] == 'alive' and p['id'] not in s['night']['asleep']: s['night']['asleep'].append(p['id'])
            elif p['status'] != 'alive': raise TraitorsError('Je doet niet meer mee, maar kijk gerust verder.')
            elif act == 'vote' and s['phase'] == 'vote': self.cast(p, data.get('target'))
            elif act == 'night' and s['phase'] == 'night': self.night_pick(p, data)
            elif act == 'offer' and s['phase'] == 'night': self.offer_answer(p, data.get('answer'))
            elif act == 'endgame' and s['phase'] == 'endgame': self.endgame_vote(p, data.get('choice'))
            else: raise TraitorsError('Deze keuze past nu niet in het spel.', 409)
            self.save(); return self.view(key, 'player')

    def host_request(self, key, data):
        with self.game.lock:
            self.game.host(key)
            before = copy.deepcopy(self.s)
            try: self.host_action(data)
            except Exception:
                self.s.clear(); self.s.update(before); raise
            self.save(); return self.view(key, 'host')

    # ------------------------------------------------------------------ views
    def phase_id(self):
        s = self.s
        tag = {'vote': (s.get('vote') or {}).get('id'), 'night': (s.get('night') or {}).get('id'),
               'endgame': (s.get('endgame') or {}).get('round')}.get(s['phase'], '')
        return f"{s['phase']}:{s['day']}:{tag}"

    def hidden_victim(self, p):
        m = self.s.get('morning')
        return self.s['phase'] == 'morning' and m and not m['shown'] and m.get('murdered') == p['id']

    def public_player(self, p, reveal_all=False):
        status = 'alive' if self.hidden_victim(p) else p['status']
        out = {'id': p['id'], 'name': p['name'], 'status': status, 'connected': self.now() - p['seen'] < 8}
        known = reveal_all or status in ('banished', 'left', 'murdered')
        if known and not (self.s['phase'] == 'banish' and (self.s['banished'] or {}).get('id') == p['id'] and not self.s['banished']['shown']):
            out['role'] = p['role']
        return out

    def view(self, key=None, role='public'):
        with self.game.lock:
            s = self.s; me = None
            if role == 'host': self.game.host(key)
            elif role == 'player': me = self.by_token(key); me['seen'] = self.now()
            elif role != 'public': raise TraitorsError('Onbekende schermrol.')
            ended = s['phase'] == 'end'
            out = {'phase': s['phase'], 'phase_id': self.phase_id(), 'day': s['day'], 'pot': s['pot'], 'code': s['code'],
                   'revision': s['revision'], 'players': [self.public_player(p, ended) for p in s['players']],
                   'log': copy.deepcopy(s['log'][-12:]), 'alive': len(self.alive()),
                   'traitors_start': s.get('start_traitors'), 'settings': copy.deepcopy(s['settings'])}
            if s['phase'] == 'lobby': out['suggested'] = suggested_traitors(len(s['players']))
            if s['phase'] == 'roles': out['acks'] = len(s['acks'])
            if s['phase'] == 'mission' and s['mission']:
                m = s['mission']
                out['mission'] = {k: m[k] for k in ('title', 'text', 'kind', 'shield', 'suggested', 'earned')}
                if m['kind'] == 'quiz':
                    out['mission'].update(index=m['index'], total=len(m['questions']), correct=m['correct'], revealed=m['revealed'])
                    if m['index'] < len(m['questions']):
                        q = m['questions'][m['index']]
                        out['mission']['question'] = {'q': q['q'], 'options': q['options']}
                        if m['revealed']: out['mission']['question']['correct'] = q['correct']
            if s['phase'] == 'vote':
                v = s['vote']
                out['vote'] = {'candidates': v['candidates'], 'voted': len(v['ballots']), 'voters': len(v['voters']), 'second': v['second'], 'endgame': v['endgame'],
                               'has_voted': [i for i in v['voters'] if i in v['ballots']]}
            if s['phase'] == 'reveal':
                v = s['vote']; shown = v['order'][:v['shown']]
                out['reveal'] = {'shown': [{'voter': i, 'target': v['ballots'][i]} for i in shown], 'total': len(v['order']), 'second': v['second']}
                if v['shown'] >= len(v['order']):
                    out['reveal'].update(tally=v['tally'], outcome={k: x for k, x in v['outcome'].items()})
            if s['phase'] == 'banish':
                b = s['banished']; out['banished'] = {'id': b['id'], 'shown': b['shown']}
                if b['shown']: out['banished']['role'] = b['role']
            if s['phase'] == 'night':
                n = s['night']; out['night'] = {'asleep': len(n['asleep']), 'ready': bool(n['decided']) and not (n['offer'] and n['offer']['answer'] is None)}
            if s['phase'] == 'morning':
                m = s['morning']; out['morning'] = {'shown': m['shown']}
                if m['shown']: out['morning'].update({k: m[k] for k in ('murdered', 'shielded', 'recruited', 'declined')})
                # Een rekrutering blijft geheim: de groep hoort alleen dat niemand stierf.
                if m['shown'] and m['recruited']: out['morning'].update(recruited=False, declined=False)
                if m['shown'] and m['declined']: out['morning'].update(declined=False)
            if s['phase'] == 'endgame':
                e = s['endgame']; out['endgame'] = {'voted': len(e['votes']), 'total': len(self.alive()), 'decided': e['decided'], 'round': e['round']}
                if e['decided']: out['endgame']['votes'] = copy.deepcopy(e['votes'])
            if ended: out['result'] = copy.deepcopy(s['result'])
            if role == 'host':
                out['missions'] = [{k: m.get(k) for k in ('id', 'title', 'where', 'minutes', 'kind', 'shield', 'suggested', 'text')} for m in self.missions]
                out['missions_done'] = s['missions_done']
                out['shields'] = [p['id'] for p in s['players'] if p['shield']]
                if getattr(self, 'shown_code', None): out['shown_code'] = self.shown_code; self.shown_code = None
            if me: out['me'] = self.private(me)
            return copy.deepcopy(out)

    def private(self, me):
        s = self.s
        out = {'id': me['id'], 'name': me['name'], 'access': me['access'], 'status': 'alive' if self.hidden_victim(me) else me['status'], 'role': me['role'], 'shield': me['shield'], 'recruited': me['recruited']}
        if me['role'] == 'traitor':
            out['team'] = [{'id': p['id'], 'name': p['name'], 'status': p['status']} for p in s['players'] if p['role'] == 'traitor' and p['id'] != me['id']]
        if s['phase'] == 'roles': out['acked'] = me['id'] in s['acks']
        if s['phase'] == 'vote':
            out['ballot'] = s['vote']['ballots'].get(me['id']); out['can_vote'] = me['id'] in s['vote']['voters']
        if s['phase'] == 'night':
            n = s['night']; out['asleep'] = me['id'] in n['asleep']
            if me['role'] == 'traitor' and me['status'] == 'alive':
                out['conclave'] = {'picks': {self.name(t): x for t, x in n['picks'].items()}, 'mine': n['picks'].get(me['id']),
                                   'can_recruit': n['can_recruit'], 'decided': n['decided'],
                                   'targets': [{'id': p['id'], 'name': p['name']} for p in self.faithful_alive()],
                                   'offer_open': bool(n['offer'] and n['offer']['answer'] is None)}
            if n['offer'] and n['offer']['target'] == me['id'] and n['offer']['answer'] is None:
                out['offer'] = {'ultimatum': s['settings']['ultimatum']}
        if s['phase'] == 'endgame': out['endgame_choice'] = s['endgame']['votes'].get(me['id'])
        return out
