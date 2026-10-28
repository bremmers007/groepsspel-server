"""Geheime missies: iedereen krijgt op de eigen telefoon een geheime opdracht.

Een missie is gelukt als het 'slachtoffer' het op zijn eigen telefoon bevestigt of de
spelleider het goedkeurt. Wie denkt dat een ander met een missie bezig is, kan die
ontmaskeren door uit drie opdrachten de juiste te kiezen. Goed geraden: de missie van de
ander mislukt. Fout geraden: strafpunt en tien minuten niet ontmaskeren.
"""
import uuid
from games_base import PhoneGame, PlayError, load_json

POINTS = {1: 2, 2: 3, 3: 5}
UNMASK_REWARD = 2
UNMASK_PENALTY = 1
UNMASK_COOLDOWN = 600
BUSTED_WAIT = 120
MAX_SKIPS = 2


class MissionsGame(PhoneGame):
    gid = 'missies'
    title = 'Geheime missies'
    teams_fixed = None
    min_players = 3
    max_players = 40
    late_join = True
    stale_check = False

    def __init__(self, game, rng=None, missions=None):
        self.bank = missions or load_json('missions.json')
        super().__init__(game, rng)

    def blank_extra(self):
        return {'minutes': 180, 'confirm': 'slachtoffer', 'levels': [1, 2, 3], 'where': 'overal', 'ends_at': None,
                'active': {}, 'claims': {}, 'done': [], 'scores': {}, 'used': [], 'skips': {}, 'cooldown': {}, 'blocked': {}}

    def mission(self, mid): return next((m for m in self.bank if m['id'] == mid), None)

    # ------------------------------------------------------------- toewijzen
    def fits(self, m):
        """0.14: filter op niveau en plek (binnen/buiten); missies voor 'overal' passen altijd."""
        s = self.s; where = s.get('where', 'overal')
        return m['level'] in s['levels'] and (where == 'overal' or m.get('where', 'overal') in ('overal', where))

    def assign(self, p):
        s = self.s
        busy = {a['mid'] for a in s['active'].values()} | {c['mid'] for c in s['claims'].values() if c['status'] in ('wacht', 'betwist')}
        pool = [m for m in self.bank if self.fits(m) and m['id'] not in busy and m['id'] not in s['used']]
        if not pool:
            pool = [m for m in self.bank if self.fits(m) and m['id'] not in busy]
            s['used'] = []
        if not pool: raise PlayError('Er zijn geen vrije missies meer. Voeg een moeilijkheid toe of beëindig het spel.')
        m = self.rng.choice(pool)
        decoys = self.rng.sample([x for x in self.bank if x['id'] != m['id']], 2)
        options = [m['id']] + [d['id'] for d in decoys]
        self.rng.shuffle(options)
        s['used'].append(m['id'])
        s['active'][p['id']] = {'mid': m['id'], 'since': self.now(), 'options': options}

    # ---------------------------------------------------------------- spelleider
    def host_action(self, data):
        s = self.s; act = data.get('action'); ph = s['phase']
        if act == 'settings':
            if ph != 'lobby': raise PlayError('Instellingen alleen in de lobby.')
            m = data.get('minutes', s['minutes'])
            if type(m) is not int or not 20 <= m <= 2880: raise PlayError('Kies 20 minuten tot twee dagen (2880 minuten).')
            confirm = data.get('confirm', s['confirm'])
            if confirm not in ('slachtoffer', 'spelleider'): raise PlayError('Onbekende controlevorm.')
            levels = data.get('levels', s['levels'])
            if not isinstance(levels, list) or not levels or any(l not in (1, 2, 3) for l in levels): raise PlayError('Kies minstens één moeilijkheid.')
            where = data.get('where', s.get('where', 'overal'))
            if where not in ('overal', 'binnen', 'buiten'): raise PlayError('Kies binnen, buiten of overal.')
            s.update(minutes=m, confirm=confirm, levels=sorted(set(levels)), where=where)
        elif act == 'start':
            if ph != 'lobby': raise PlayError('Het spel loopt al.')
            if len(s['players']) < self.min_players: raise PlayError(f'Minimaal {self.min_players} spelers.')
            s['scores'] = {p['id']: 0 for p in s['players']}
            for p in s['players']: self.assign(p)
            s['started_at'] = self.now(); s['ends_at'] = self.now() + s['minutes'] * 60
            self.set_phase('play'); self.log('De geheime missies zijn uitgedeeld. Veel succes en houd je gezicht in de plooi!')
        elif act in ('approve', 'reject'):
            c = s['claims'].get(data.get('id'))
            if not c or c['status'] not in ('wacht', 'betwist'): raise PlayError('Deze melding is al afgehandeld.')
            self.resolve(c, act == 'approve', 'de spelleider')
        elif act == 'swap':
            p = self.player(data.get('id'))
            if not p or ph != 'play': raise PlayError('Speler niet gevonden.')
            s['active'].pop(p['id'], None); s['blocked'].pop(p['id'], None); self.assign(p)
            self.log(f"{p['name']} kreeg via de spelleider een nieuwe missie.", public=False)
        elif act == 'adjust':
            p = self.player(data.get('id')); pts = data.get('points')
            if not p or type(pts) is not int or not -20 <= pts <= 20: raise PlayError('Ongeldige correctie.')
            s['scores'][p['id']] = s['scores'].get(p['id'], 0) + pts; self.log(f"Correctie voor {p['name']}: {pts:+d}.")
        elif act == 'extend':
            if ph != 'play': raise PlayError('Het spel loopt niet.')
            s['ends_at'] = max(s['ends_at'], self.now()) + 30 * 60
        elif act == 'finish':
            if ph != 'play': raise PlayError('Het spel loopt niet.')
            self.end()
        else:
            raise PlayError('Onbekende actie.')

    def end(self):
        self.set_phase('end'); self.log('Einde van de geheime missies! Alle lopende missies worden onthuld.')

    def resolve(self, c, ok, by):
        s = self.s; p = self.player(c['player']); m = self.mission(c['mid'])
        if ok:
            c['status'] = 'gelukt'; pts = POINTS[m['level']]
            s['scores'][c['player']] = s['scores'].get(c['player'], 0) + pts
            s['done'].append({'player': c['player'], 'mid': c['mid'], 'at': self.now(), 'by': by})
            self.log(f"Missie gelukt voor {p['name']} (+{pts}): {m['text']}")
        else:
            c['status'] = 'afgekeurd'
            self.log(f"De missie van {p['name']} is afgekeurd door {by}.")
        if p and s['phase'] == 'play' and p['id'] not in s['active']: self.assign(p)

    def on_join(self, p, data):
        if self.s['phase'] == 'play':
            self.s['scores'][p['id']] = 0; self.assign(p)

    # -------------------------------------------------------------- spelers
    def player_action(self, p, data, offline=False):
        s = self.s; act = data.get('action'); now = self.now()
        if s['phase'] != 'play': raise PlayError('Het spel loopt nu niet.')
        if act == 'claim':
            a = s['active'].get(p['id'])
            if not a: raise PlayError('Je hebt nu geen missie.')
            victim = data.get('victim') or None
            if victim is not None:
                v = self.player(victim)
                if not v or v['id'] == p['id']: raise PlayError('Kies wie je missie heeft uitgevoerd.')
            note = str(data.get('note', '')).strip()[:200]
            cid = str(uuid.uuid4())
            status = 'wacht'
            s['claims'][cid] = {'id': cid, 'player': p['id'], 'mid': a['mid'], 'victim': victim, 'note': note, 'at': now, 'status': status}
            del s['active'][p['id']]
            if s['confirm'] == 'spelleider' or not victim:
                self.log(f"{p['name']} meldt een gelukte missie. De spelleider beoordeelt.", public=False)
        elif act == 'confirm':
            c = s['claims'].get(data.get('claim'))
            if not c or c['victim'] != p['id'] or c['status'] != 'wacht' or s['confirm'] != 'slachtoffer': raise PlayError('Deze vraag is al afgehandeld.')
            if data.get('yes') is True: self.resolve(c, True, p['name'])
            else:
                c['status'] = 'betwist'; self.log(f"{p['name']} herkent de missie van {self.name(c['player'])} niet. De spelleider beslist.", public=False)
        elif act == 'unmask':
            if now < s['cooldown'].get(p['id'], 0): raise PlayError('Je mag nog even niemand ontmaskeren.')
            target = self.player(data.get('target'))
            if not target or target['id'] == p['id']: raise PlayError('Kies een andere speler.')
            a = s['active'].get(target['id'])
            if not a: raise PlayError(f"{target['name']} heeft op dit moment geen missie.")
            guess = data.get('guess')
            if guess not in a['options']: raise PlayError('Kies een van de drie opdrachten.')
            m = self.mission(a['mid'])
            if guess == a['mid']:
                s['scores'][p['id']] = s['scores'].get(p['id'], 0) + UNMASK_REWARD
                del s['active'][target['id']]; s['blocked'][target['id']] = now + BUSTED_WAIT
                s['done'].append({'player': target['id'], 'mid': a['mid'], 'at': now, 'by': p['name'], 'busted': True})
                self.log(f"Ontmaskerd! {p['name']} betrapte {target['name']} (+{UNMASK_REWARD}). De missie was: {m['text']}")
            else:
                s['scores'][p['id']] = s['scores'].get(p['id'], 0) - UNMASK_PENALTY
                s['cooldown'][p['id']] = now + UNMASK_COOLDOWN
                self.log(f"{p['name']} beschuldigde {target['name']} ten onrechte (−{UNMASK_PENALTY}).")
        elif act == 'skip':
            if s['skips'].get(p['id'], 0) >= MAX_SKIPS: raise PlayError('Je hebt al twee keer gewisseld.')
            if p['id'] not in s['active']: raise PlayError('Je hebt nu geen missie om te wisselen.')
            s['skips'][p['id']] = s['skips'].get(p['id'], 0) + 1
            del s['active'][p['id']]; self.assign(p)
        else:
            raise PlayError('Onbekende actie.')

    def tick(self):
        s = self.s; changed = False
        if s['phase'] != 'play': return False
        for pid, until in list(s['blocked'].items()):
            if self.now() >= until:
                del s['blocked'][pid]; p = self.player(pid)
                if p and pid not in s['active']:
                    try: self.assign(p); changed = True
                    except PlayError: pass
        if s['ends_at'] and self.now() >= s['ends_at']:
            self.end(); changed = True
        return changed

    # ------------------------------------------------------------------ view
    def ranking(self):
        return sorted(({'id': p['id'], 'name': p['name'], 'score': self.s['scores'].get(p['id'], 0),
                        'done': sum(1 for d in self.s['done'] if d['player'] == p['id'] and not d.get('busted'))} for p in self.s['players']),
                      key=lambda r: -r['score'])

    def extra_view(self, out, role, me):
        s = self.s
        out['settings'] = {'minutes': s['minutes'], 'confirm': s['confirm'], 'levels': s['levels'], 'where': s.get('where', 'overal')}
        out['ends_at'] = s['ends_at']; out['ranking'] = self.ranking(); out['points'] = POINTS
        out['done'] = [{'name': self.name(d['player']), 'text': self.mission(d['mid'])['text'], 'busted': bool(d.get('busted')), 'by': d['by']} for d in s['done']][-40:]
        if s['phase'] == 'end':
            out['unfinished'] = [{'name': self.name(pid), 'text': self.mission(a['mid'])['text']} for pid, a in s['active'].items()]
        if role == 'host':
            out['claims'] = [{**c, 'name': self.name(c['player']), 'victim_name': self.name(c['victim']) if c['victim'] else '',
                              'text': self.mission(c['mid'])['text'], 'level': self.mission(c['mid'])['level']}
                             for c in s['claims'].values() if c['status'] in ('wacht', 'betwist')]
            out['busy'] = {pid: ('missie' if pid in s['active'] else 'wacht' if pid in s['blocked'] else 'gemeld') for pid in (p['id'] for p in s['players'])}
        if me and s['phase'] in ('play', 'end'):
            pid = me['id']; a = s['active'].get(pid)
            m = self.mission(a['mid']) if a else None
            out['me'].update(
                mission={'id': m['id'], 'text': m['text'], 'level': m['level'], 'points': POINTS[m['level']]} if m else None,
                blocked_until=s['blocked'].get(pid), cooldown_until=s['cooldown'].get(pid, 0), skips_left=MAX_SKIPS - s['skips'].get(pid, 0),
                score=s['scores'].get(pid, 0),
                pending=[{'id': c['id'], 'status': c['status'], 'text': self.mission(c['mid'])['text']} for c in s['claims'].values() if c['player'] == pid and c['status'] in ('wacht', 'betwist')],
                confirm=[{'id': c['id'], 'from': self.name(c['player']), 'text': self.mission(c['mid'])['text'], 'note': c['note']}
                         for c in s['claims'].values() if c['victim'] == pid and c['status'] == 'wacht' and s['confirm'] == 'slachtoffer'],
                targets=[{'id': t, 'name': self.name(t), 'options': [{'id': o, 'text': self.mission(o)['text']} for o in a2['options']]}
                         for t, a2 in s['active'].items() if t != pid])
