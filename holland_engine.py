"""Echt Hollands!: tv-show met twee teams, zes rondes en teamtelefoons."""
from games_base import PhoneGame, PlayError, load_json
from show_engine import matches

ROUNDS = [
    {'key': 'kennis', 'title': 'Hollandse kennis', 'kind': 'buzz', 'count': 8, 'points': 1,
     'intro': 'Wie het eerst drukt, mag antwoorden. Fout? Dan mag het andere team.'},
    {'key': 'taal', 'title': 'Wat betekent het?', 'kind': 'choice', 'count': 6, 'points': 1,
     'intro': 'Een woord uit een dialect of van vroeger. Kies op de telefoon wat het betekent.'},
    {'key': 'gezegden', 'title': 'Maak het af', 'kind': 'text', 'count': 6, 'points': 1,
     'intro': 'Typ op de telefoon hoe het gezegde verdergaat.'},
    {'key': 'uitbeelden', 'title': 'Zonder woorden', 'kind': 'act', 'seconds': 60, 'points': 1,
     'intro': 'Eén speler per team beeldt uit. De woorden staan alleen op zijn telefoon. Zestig seconden.'},
    {'key': 'schatten', 'title': 'Hoeveel ongeveer?', 'kind': 'estimate', 'count': 4, 'points': 2,
     'intro': 'Overleg en vul een getal in. Het team dat het dichtst zit, krijgt twee punten.'},
    {'key': 'finale', 'title': 'De finale', 'kind': 'buzz', 'count': 8, 'points': 2,
     'intro': 'Dubbele punten! Wie het eerst drukt, mag antwoorden.'},
]
TIEBREAK = {'key': 'beslissing', 'title': 'Beslissingsvraag', 'kind': 'estimate', 'count': 1, 'points': 1, 'intro': 'Gelijke stand! Eén schatvraag beslist.'}


class HollandGame(PhoneGame):
    gid = 'holland'
    title = 'Echt Hollands!'
    teams_fixed = ['Team Oranje', 'Team Blauw']
    min_players = 2
    max_players = 16
    late_join = True

    def __init__(self, game, rng=None, content=None):
        self.content = content or load_json('holland-content.json')
        super().__init__(game, rng)

    def blank_extra(self):
        return {'rounds': [], 'r': 0, 'qi': 0, 'stage': 'intro', 'items': [], 'scores': {}, 'answers': {}, 'buzz': None,
                'attempted': [], 'turn': None, 'actors': {}, 'words': [], 'history': [], 'override': {}}

    def round(self): return self.s['rounds'][self.s['r']]
    def item(self):
        s = self.s
        return s['items'][s['qi']] if s['qi'] < len(s['items']) else None
    def team_ids(self): return [t['id'] for t in self.s['teams']]

    def phase_id(self):
        s = self.s
        return f"{s['phase']}:{s.get('r')}:{s.get('qi')}:{s.get('stage')}"

    # ---------------------------------------------------------------- spelleider
    def host_action(self, data):
        s = self.s; act = data.get('action')
        if act == 'settings':
            if s['phase'] != 'lobby': raise PlayError('Teamnamen wijzig je in de lobby.')
            names = data.get('names')
            if not isinstance(names, list) or len(names) != 2 or not all(isinstance(n, str) and n.strip() for n in names): raise PlayError('Geef beide teams een naam.')
            for t, n in zip(s['teams'], names): t['name'] = n.strip()[:24]
        elif act == 'start':
            if s['phase'] != 'lobby': raise PlayError('De show loopt al.')
            for p in s['players']:
                if not p.get('team'):
                    sizes = {t['id']: len(self.team_players(t['id'])) for t in s['teams']}; p['team'] = min(sizes, key=sizes.get)
            if any(not self.team_players(t) for t in self.team_ids()): raise PlayError('Elk team heeft minimaal één telefoon nodig.')
            c = self.content
            kennis = self.rng.sample(c['kennis'], len(c['kennis']))
            pools = {'kennis': kennis[:8], 'finale': kennis[8:16], 'taal': self.rng.sample(c['taal'], 6),
                     'gezegden': self.rng.sample(c['gezegden'], 6), 'schatten': self.rng.sample(c['schatten'], 5)}
            s['rounds'] = [dict(r) for r in ROUNDS]
            s['pools'] = pools; s['tiebreak_q'] = pools['schatten'].pop()
            s['words'] = self.rng.sample(c['uitbeelden'], len(c['uitbeelden']))
            s['scores'] = {t: 0 for t in self.team_ids()}; s['actors'] = {t: 0 for t in self.team_ids()}; s['history'] = []
            s['r'] = 0; self.enter_round(); self.set_phase('show'); self.log('De show begint!')
        elif act == 'next': self.next()
        elif act == 'judge':
            self.need_kind('buzz')
            if s['stage'] != 'question' or not s['buzz']: raise PlayError('Er heeft nog niemand gedrukt.')
            team = s['buzz']
            if data.get('correct') is True:
                self.award(team, self.round()['points'], 'goed'); self.reveal()
            else:
                s['attempted'].append(team); s['buzz'] = None
                if all(t in s['attempted'] for t in self.team_ids()): self.reveal()
        elif act == 'reveal':
            if s['stage'] != 'question': raise PlayError('Er staat geen vraag open.')
            self.reveal()
        elif act == 'override':
            if s['stage'] != 'reveal' or self.round()['kind'] != 'text': raise PlayError('Alleen bij Maak het af kun je een antwoord alsnog goedkeuren.')
            team = data.get('team')
            if team not in self.team_ids(): raise PlayError('Kies een team.')
            key = f"{s['r']}:{s['qi']}:{team}"
            if s['override'].get(key): raise PlayError('Dit antwoord is al goedgekeurd.')
            s['override'][key] = True; self.award(team, self.round()['points'], 'alsnog goed')
        elif act == 'start_turn':
            self.need_kind('act')
            if s['stage'] != 'question' or s['turn']: raise PlayError('Er loopt al een beurt.')
            team = s['items'][s['qi']]['team']; members = self.team_players(team)
            actor = members[s['actors'][team] % len(members)]; s['actors'][team] += 1
            s['turn'] = {'team': team, 'actor': actor['id'], 'ends_at': self.now() + self.round()['seconds'], 'got': [], 'passed': [], 'word': self.draw_word()}
            s['stage'] = 'acting'
        elif act == 'stop_turn':
            if s['stage'] != 'acting': raise PlayError('Er loopt geen beurt.')
            self.end_turn()
        elif act == 'finish':
            self.finish()
        else:
            raise PlayError('Onbekende actie.')

    def need_kind(self, kind):
        if self.s['phase'] != 'show' or self.round()['kind'] != kind: raise PlayError('Deze knop hoort bij een andere ronde.')

    def enter_round(self):
        s = self.s; r = self.round()
        if r['kind'] == 'act':
            order = self.team_ids()
            s['items'] = [{'team': t} for t in order]
        elif r['key'] == 'beslissing':
            s['items'] = [s['tiebreak_q']]
        else:
            s['items'] = s['pools'][r['key']][:r['count']]
        s.update(qi=0, stage='intro', answers={}, buzz=None, attempted=[], turn=None)

    def next(self):
        s = self.s
        if s['phase'] != 'show': raise PlayError('De show loopt niet.')
        if s['stage'] == 'intro': s['stage'] = 'question'; return
        if s['stage'] in ('question', 'acting'): raise PlayError('Rond eerst deze vraag af.')
        s['qi'] += 1; s.update(answers={}, buzz=None, attempted=[], turn=None)
        if s['qi'] < len(s['items']): s['stage'] = 'question'; return
        # ronde klaar
        if s['r'] + 1 < len(s['rounds']):
            s['r'] += 1; self.enter_round(); return
        a, b = (s['scores'][t] for t in self.team_ids())
        if a == b and s['rounds'][-1]['key'] != 'beslissing':
            s['rounds'].append(dict(TIEBREAK)); s['r'] += 1; self.enter_round(); return
        self.finish()

    def finish(self):
        s = self.s; sc = s['scores']; ids = self.team_ids()
        best = max(sc.values()) if sc else 0; winners = [t for t in ids if sc.get(t) == best]
        s['winners'] = winners; self.set_phase('end')
        self.log('Einde van de show: ' + ' en '.join(self.name(t) for t in winners) + (' winnen!' if len(winners) > 1 else ' wint!'))

    def award(self, team, pts, why):
        self.s['scores'][team] += pts
        self.s['history'].append({'r': self.s['r'], 'team': team, 'points': pts, 'why': why})

    def reveal(self):
        s = self.s; r = self.round(); it = self.item(); ids = self.team_ids()
        if r['kind'] == 'choice':
            for t, v in s['answers'].items():
                if v == it['correct']: self.award(t, r['points'], 'goed')
        elif r['kind'] == 'text':
            for t, v in s['answers'].items():
                if matches(v, [[it['a']] + it.get('alt', [])]) is not None: self.award(t, r['points'], 'goed')
        elif r['kind'] == 'estimate':
            given = {t: v for t, v in s['answers'].items() if isinstance(v, (int, float))}
            if given:
                best = min(abs(v - it['a']) for v in given.values())
                for t, v in given.items():
                    if abs(v - it['a']) == best: self.award(t, r['points'], 'dichtstbij')
        s['stage'] = 'reveal'

    def draw_word(self):
        s = self.s
        if not s['words']: s['words'] = self.rng.sample(self.content['uitbeelden'], len(self.content['uitbeelden']))
        return s['words'].pop()

    def end_turn(self):
        s = self.s; t = s['turn']
        if t['got']: self.award(t['team'], len(t['got']) * self.round()['points'], f"{len(t['got'])} woorden geraden")
        s['items'][s['qi']]['result'] = {'got': t['got'], 'passed': t['passed']}
        s['stage'] = 'reveal'

    def tick(self):
        s = self.s
        if s['phase'] == 'show' and s.get('stage') == 'acting' and self.now() >= s['turn']['ends_at']:
            self.end_turn(); return True

    # -------------------------------------------------------------- spelers
    def player_action(self, p, data, offline=False):
        s = self.s; act = data.get('action'); team = p.get('team')
        if s['phase'] != 'show' or not team: raise PlayError('Wacht op de volgende vraag.')
        r = self.round()
        if act == 'buzz':
            if r['kind'] != 'buzz' or s['stage'] != 'question': raise PlayError('De buzzer staat nu niet open.')
            if s['buzz']: raise PlayError('Er heeft al iemand gedrukt.', 409)
            if team in s['attempted']: raise PlayError('Jullie hebben deze vraag al geprobeerd.')
            s['buzz'] = team; s['buzzed_by'] = p['id']
        elif act == 'answer':
            if r['kind'] not in ('choice', 'text', 'estimate') or s['stage'] != 'question': raise PlayError('Er staat geen vraag open.')
            if team in s['answers']: raise PlayError('Jullie team heeft al geantwoord.', 409)
            v = data.get('value')
            if r['kind'] == 'choice':
                if type(v) is not int or not 0 <= v < len(self.item()['options']): raise PlayError('Kies een antwoord.')
            elif r['kind'] == 'text':
                if not isinstance(v, str) or not v.strip(): raise PlayError('Typ jullie antwoord.')
                v = v.strip()[:80]
            else:
                try: v = float(str(v).replace('.', '').replace(',', '.')) if isinstance(v, str) else float(v)
                except (TypeError, ValueError): raise PlayError('Vul een getal in.')
                if v != v or abs(v) > 1e12: raise PlayError('Vul een getal in.')
                v = int(v) if v == int(v) else v
            s['answers'][team] = v
            if all(t in s['answers'] for t in self.team_ids()): self.reveal()
        elif act == 'act':
            if s['stage'] != 'acting' or s['turn']['actor'] != p['id']: raise PlayError('Jij beeldt nu niet uit.')
            if self.now() >= s['turn']['ends_at']: self.end_turn(); return
            res = data.get('result')
            if res not in ('got', 'pass'): raise PlayError('Kies geraden of pas.')
            s['turn']['got' if res == 'got' else 'passed'].append(s['turn']['word']); s['turn']['word'] = self.draw_word()
        else:
            raise PlayError('Onbekende actie.')

    # ------------------------------------------------------------------ view
    def extra_view(self, out, role, me):
        s = self.s
        out['scores'] = s['scores']
        if s['phase'] == 'lobby': return
        if s['phase'] == 'end':
            out['winners'] = s.get('winners', []); out['history'] = s['history']; return
        r = self.round(); it = self.item(); stage = s['stage']
        out['round'] = {'index': s['r'], 'total': len(s['rounds']), 'title': r['title'], 'kind': r['kind'], 'intro': r['intro'], 'points': r['points']}
        out['stage'] = stage; out['qi'] = s['qi']; out['count'] = len(s['items'])
        out['answered'] = list(s['answers'])
        out['buzz'] = s['buzz']; out['attempted'] = s['attempted']
        q = None
        if it and stage != 'intro':
            if r['kind'] == 'buzz': q = {'q': it['q']}
            elif r['kind'] == 'choice': q = {'q': f"Wat betekent ‘{it['word']}’?", 'word': it['word'], 'region': it['region'], 'options': it['options']}
            elif r['kind'] == 'text': q = {'q': it['q']}
            elif r['kind'] == 'estimate': q = {'q': it['q'], 'unit': it['unit']}
            elif r['kind'] == 'act': q = {'team': it['team']}
            if stage == 'reveal':
                if r['kind'] in ('buzz', 'text'): q['answer'] = it['a']
                if r['kind'] == 'choice': q['correct'] = it['correct']
                if r['kind'] == 'estimate': q['answer'] = it['a']
                if r['kind'] in ('choice', 'text', 'estimate'): q['given'] = s['answers']
                if r['kind'] == 'text': q['right'] = [t for t, v in s['answers'].items() if matches(v, [[it['a']] + it.get('alt', [])]) is not None]
                if r['kind'] == 'act': q['result'] = it.get('result')
                q['overridden'] = [k.split(':')[2] for k in s['override'] if k.startswith(f"{s['r']}:{s['qi']}:")]
        if role == 'host' and it and stage == 'question' and r['kind'] == 'buzz': q['answer'] = it['a']   # quizmaster ziet het antwoord
        out['question'] = q
        if s['turn']:
            t = s['turn']; out['turn'] = {'team': t['team'], 'actor': t['actor'], 'actor_name': self.name(t['actor']), 'ends_at': t['ends_at'], 'got': len(t['got']), 'passed': len(t['passed'])}
            if me and me['id'] == t['actor'] and stage == 'acting': out['me']['word'] = t['word']
        if me:
            out['me']['answered'] = me.get('team') in s['answers']
            out['me']['answer'] = s['answers'].get(me.get('team'))
