"""Het Moordspel: moordmysterie met een personage per telefoon.

Per scenario zijn er drie mogelijke daders; de server kiest er willekeurig één.
De pc-console en de beamer krijgen nooit de dader of geheime aanwijzingen te zien.
"""
from games_base import PhoneGame, PlayError, load_json

PHASES = ['lobby', 'intro', 'round1', 'round2', 'round3', 'accuse', 'reveal', 'end']
LEVELS = {  # 0.14: moeilijkheid. Verschuift de daderspecifieke aanwijzingen en het aantal deelbare aanwijzingen.
    'makkelijk': {'shift': -1, 'share': 3, 'evidence': -1},
    'normaal': {'shift': 0, 'share': 2, 'evidence': 0},
    'moeilijk': {'shift': 1, 'share': 1, 'evidence': 1},
}
ROUND_OF = {'round1': 1, 'round2': 2, 'round3': 3, 'accuse': 3, 'reveal': 3, 'end': 3}


class MurderGame(PhoneGame):
    gid = 'moord'
    title = 'Het Moordspel'
    min_players = 6

    def __init__(self, game, rng=None, scenarios=None):
        self.scenarios = scenarios or load_json('murder-scenarios.json')
        super().__init__(game, rng)

    @property
    def max_players(self):
        return max(len(s['characters']) for s in self.scenarios)

    def blank_extra(self):
        return {'scenario': None, 'culprit': None, 'cast': {}, 'acks': [], 'shared': [], 'accusations': {},
                'minutes': 25, 'level': 'normaal', 'ends_at': None, 'reveal_step': 0, 'result': None}

    def scenario(self, sid=None):
        sid = sid or self.s['scenario']
        sc = next((x for x in self.scenarios if x['id'] == sid), None)
        if not sc: raise PlayError('Kies een scenario.')
        return sc

    def char(self, cid): return next(c for c in self.scenario()['characters'] if c['id'] == cid)
    def char_of(self, pid): return self.s['cast'].get(pid)
    def player_of(self, cid): return next((pid for pid, c in self.s['cast'].items() if c == cid), None)

    # ---------------------------------------------------------------- spelleider
    def host_action(self, data):
        s = self.s; act = data.get('action'); ph = s['phase']
        if act == 'settings':
            if ph != 'lobby': raise PlayError('Kies het scenario in de lobby.')
            self.scenario(data.get('scenario')); s['scenario'] = data['scenario']
            minutes = data.get('minutes', 25)
            if type(minutes) is not int or not 10 <= minutes <= 60: raise PlayError('Kies 10 tot 60 minuten per ronde.')
            s['minutes'] = minutes
            level = data.get('level', s.get('level', 'normaal'))
            if level not in LEVELS: raise PlayError('Kies makkelijk, normaal of moeilijk.')
            s['level'] = level
        elif act == 'start':
            if ph != 'lobby': raise PlayError('Het spel loopt al.')
            sc = self.scenario(s['scenario'] or self.scenarios[0]['id']); s['scenario'] = sc['id']
            players = s['players']; core = [c for c in sc['characters'] if c['core']]; extra = [c for c in sc['characters'] if not c['core']]
            if len(players) < len(core): raise PlayError(f'Dit scenario heeft minimaal {len(core)} spelers nodig.')
            if len(players) > len(core) + len(extra): raise PlayError(f'Dit scenario past bij maximaal {len(core) + len(extra)} spelers.')
            order = players[:]; self.rng.shuffle(order)
            roles = core + extra[:len(players) - len(core)]
            s['cast'] = {p['id']: c['id'] for p, c in zip(order, roles)}
            s['culprit'] = self.rng.choice(list(sc['culprits']))
            s.update(acks=[], shared=[], accusations={}, reveal_step=0, result=None)
            self.set_phase('intro'); self.log(f"Het spel begint: {sc['title']}.")
        elif act == 'next':
            idx = PHASES.index(ph)
            if ph in ('lobby', 'reveal', 'end'): raise PlayError('Deze stap past nu niet.')
            nxt = PHASES[idx + 1]
            self.set_phase(nxt)
            if nxt.startswith('round'):
                s['ends_at'] = self.now() + s['minutes'] * 60
                self.log({'round1': 'Ronde 1: de eerste verhoren.', 'round2': 'Ronde 2: nieuw bewijs.', 'round3': 'Ronde 3: de wending.'}[nxt])
            else:
                s['ends_at'] = None
            if nxt == 'accuse': self.log('De beschuldigingen worden ingeleverd.')
            if nxt == 'reveal': self.score(); s['reveal_step'] = 0
        elif act == 'reveal_next':
            if ph != 'reveal': raise PlayError('De ontknoping is nog niet begonnen.')
            steps = len(self.scenario()['culprits'][s['culprit']]['reconstruction'])
            if s['reveal_step'] < steps + 1: s['reveal_step'] += 1
            else: self.set_phase('end')
        elif act == 'extend':
            if not s['ends_at']: raise PlayError('Er loopt geen ronde.')
            s['ends_at'] = max(s['ends_at'], self.now()) + 5 * 60
        else:
            raise PlayError('Onbekende actie.')

    def result_scores(self):
        pts = (self.s.get('result') or {}).get('points') or {}
        return {p['id']: pts.get(p['id'], 0) for p in self.s['players']}

    def score(self):
        s = self.s; cu = self.scenario()['culprits'][s['culprit']]; culprit_pid = self.player_of(s['culprit'])
        points = {}; named = 0; voters = 0
        for pid, a in s['accusations'].items():
            if pid == culprit_pid: continue
            voters += 1
            pts = (3 if a['who'] == s['culprit'] else 0) + (1 if a['means'] == cu['means'] else 0) + (1 if a['motive'] == cu['motive'] else 0)
            points[pid] = pts; named += a['who'] == s['culprit']
        escaped = named * 2 < max(1, voters)
        if culprit_pid: points[culprit_pid] = 5 if escaped else 0
        s['result'] = {'points': points, 'named': named, 'voters': voters, 'escaped': escaped}

    # -------------------------------------------------------------- spelers
    def player_action(self, p, data, offline=False):
        s = self.s; act = data.get('action'); ph = s['phase']; me = self.char_of(p['id'])
        if act == 'ack':
            if ph != 'intro': raise PlayError('Je hebt je personage al bevestigd.')
            if p['id'] not in s['acks']: s['acks'].append(p['id'])
        elif act == 'share':
            if ph not in ('round1', 'round2', 'round3'): raise PlayError('Bewijs delen kan alleen tijdens de rondes.')
            to = data.get('to'); clue = data.get('clue')
            if to == p['id'] or to not in s['cast']: raise PlayError('Kies een andere speler.')
            mine = self.clues_for(p['id'])
            if type(clue) is not int or not 0 <= clue < len(mine): raise PlayError('Kies een aanwijzing die je zelf hebt.')
            text = mine[clue]['text']
            if mine[clue].get('confession'): raise PlayError('Dit deel kun je niet delen.')
            if any(x['from'] == p['id'] and x['to'] == to and x['text'] == text for x in s['shared']): raise PlayError('Die aanwijzing heb je al gedeeld met deze speler.')
            limit = self.level()['share']
            if sum(1 for x in s['shared'] if x['from'] == p['id'] and x['round'] == ROUND_OF[ph]) >= limit: raise PlayError(f"Je mag per ronde {limit} aanwijzingen delen." if limit > 1 else "Je mag per ronde één aanwijzing delen.")
            s['shared'].append({'from': p['id'], 'to': to, 'text': text, 'round': ROUND_OF[ph]})
        elif act == 'accuse':
            if ph != 'accuse': raise PlayError('Beschuldigen kan pas in de beschuldigingsronde.')
            sc = self.scenario(); who = data.get('who'); means = data.get('means'); motive = data.get('motive')
            if who not in self.s['cast'].values() or who == me: raise PlayError('Kies een ander personage.')
            if type(means) is not int or not 0 <= means < len(sc['means']) or type(motive) is not int or not 0 <= motive < len(sc['motives']): raise PlayError('Kies een middel en een motief.')
            if p['id'] in s['accusations']: raise PlayError('Je beschuldiging is al ingeleverd.', 409)
            s['accusations'][p['id']] = {'who': who, 'means': means, 'motive': motive}
        else:
            raise PlayError('Deze keuze past nu niet in het spel.', 409)

    def level(self): return LEVELS.get(self.s.get('level', 'normaal'), LEVELS['normaal'])

    @staticmethod
    def shifted(rnd, shift): return max(1, min(3, rnd + shift))

    def clues_for(self, pid):
        """Aanwijzingen van deze speler tot en met de huidige ronde, inclusief overgenomen extra rollen."""
        s = self.s; sc = self.scenario(); cid = self.char_of(pid); rnd = ROUND_OF.get(s['phase'], 0)
        if not cid: return []
        cu = sc['culprits'][s['culprit']]
        if s['phase'] == 'intro':
            return [{'round': 0, 'text': cu['confession'], 'confession': True}] if cid == s['culprit'] else []
        if not rnd: return []
        present = set(s['cast'].values())
        holders = {cid} | {c['id'] for c in sc['characters'] if not c['core'] and c['id'] not in present and c.get('fallback') == cid}
        out = []
        if cid == s['culprit']: out.append({'round': 1, 'text': cu['confession'], 'confession': True})
        shift = self.level()['shift']
        for cl in [(c, c['round']) for c in sc['clues']] + [(c, self.shifted(c['round'], shift)) for c in cu['clues']]:
            cl, when = cl
            if cl['to'] in holders and when <= rnd:
                out.append({'round': when, 'text': cl['text'], 'via': None if cl['to'] == cid else self.char(cl['to'])['name']})
        return sorted(out, key=lambda x: x['round'])

    # ------------------------------------------------------------------ view
    def extra_view(self, out, role, me):
        s = self.s
        if role == 'host': out['scenarios'] = [{k: x[k] for k in ('id', 'title', 'tagline', 'audience')} | {'min': sum(c['core'] for c in x['characters']), 'max': len(x['characters'])} for x in self.scenarios]
        out['settings'] = {'scenario': s['scenario'], 'minutes': s['minutes'], 'level': s.get('level', 'normaal'), 'share': self.level()['share']}
        if s['phase'] == 'lobby': return
        sc = self.scenario(); rnd = ROUND_OF.get(s['phase'], 0)
        out['scenario'] = {k: sc[k] for k in ('id', 'title', 'tagline', 'opening', 'setting', 'facts', 'victim', 'means', 'motives')}
        out['cast'] = [{'player': pid, 'name': self.name(pid), 'character': cid, 'role': self.char(cid)['name'], 'bio': self.char(cid)['bio']} for pid, cid in s['cast'].items()]
        out['ends_at'] = s['ends_at']
        out['acks'] = len(s['acks'])
        out['accused'] = len(s['accusations'])
        cu = sc['culprits'][s['culprit']]
        ev_shift = self.level()['evidence']
        out['evidence'] = [e | {'round': r} for e, r in [(e, e['round']) for e in sc['evidence']] + [(e, self.shifted(e['round'], ev_shift)) for e in cu['evidence']] if r <= rnd] if rnd else []
        out['evidence'].sort(key=lambda e: e['round'])
        if s['phase'] in ('reveal', 'end'):
            step = s['reveal_step'] if s['phase'] == 'reveal' else 99
            out['reveal'] = {'step': step, 'steps': cu['reconstruction'][:step], 'total': len(cu['reconstruction'])}
            if step > len(cu['reconstruction']) or s['phase'] == 'end':
                out['reveal'].update(culprit=s['culprit'], culprit_player=self.player_of(s['culprit']), means=cu['means'], motive=cu['motive'], result=s['result'],
                                     accusations={pid: a for pid, a in s['accusations'].items()})
        if me:
            cid = self.char_of(me['id'])
            if cid:
                c = self.char(cid)
                out['me']['character'] = {'id': cid, 'name': c['name'], 'bio': c['bio'], 'secret': c['secret'], 'alibi': c['alibi']}
                out['me']['clues'] = self.clues_for(me['id'])
                out['me']['received'] = [{'from': self.name(x['from']), 'text': x['text'], 'round': x['round']} for x in s['shared'] if x['to'] == me['id']]
                out['me']['shared_count'] = sum(1 for x in s['shared'] if x['from'] == me['id'] and x['round'] == rnd)
                out['me']['acked'] = me['id'] in s['acks']
                out['me']['accusation'] = s['accusations'].get(me['id'])
                if cid == s['culprit']:
                    out['me']['culprit'] = True
                    if rnd >= 3: out['me']['task'] = cu['task']
