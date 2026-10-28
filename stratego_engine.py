"""Rangen & Vlaggen: buitenspel met geheime rangen op de telefoon.

Duels werken ook zonder wifi: elke telefoon kent de spelsleutel, toont een eigen
duelcode en berekent zelf de uitslag. Zodra de telefoon weer verbinding heeft, verwerkt
de server het duel met de rangen die hij zelf kent. Een duel tussen twee spelers
wordt binnen 90 seconden maar één keer geteld.
"""
import secrets
from games_base import PhoneGame, PlayError

ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
RANKS = ['B', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
NAMES = {'10': 'Maarschalk', '9': 'Generaal', '8': 'Kolonel', '7': 'Majoor', '6': 'Kapitein', '5': 'Luitenant', '4': 'Sergeant',
         '3': 'Mineur', '2': 'Verkenner', '1': 'Spion', 'B': 'Bom'}
REDRAW = ['2', '3', '4', '5', '6', '7', '8']


def ranks_for(n):
    """Rangen voor een team van n spelers. Altijd één Maarschalk en één Spion; Bom vanaf 5 spelers."""
    out = ['10', '1']
    if n >= 4: out.append('9')
    if n >= 5: out.append('B')
    out.append('3')
    cycle = ['2', '8', '7', '6', '5', '2', '4', '3', '6', '5', '2', '7', '4']
    i = 0
    while len(out) < n: out.append(cycle[i % len(cycle)]); i += 1
    return out[:n]


def encode(number, rank, key):
    idx = RANKS.index(rank); value = ((number << 4) | idx) ^ key
    check = (number * 7 + idx * 3 + key) % 32
    full = (value << 5) | check
    return ALPHA[(full >> 10) & 31] + ALPHA[(full >> 5) & 31] + ALPHA[full & 31]


def decode(code, key):
    code = str(code or '').strip().upper().replace('0', 'O').replace('1', 'I')
    if len(code) != 3 or any(c not in ALPHA for c in code): return None
    full = (ALPHA.index(code[0]) << 10) | (ALPHA.index(code[1]) << 5) | ALPHA.index(code[2])
    value = (full >> 5) ^ key; check = full & 31
    number, idx = value >> 4, value & 15
    if idx >= len(RANKS) or (number * 7 + idx * 3 + key) % 32 != check: return None
    return number, RANKS[idx]


def outcome(mine, theirs, i_tagged):
    """'win', 'lose' of 'both' (allebei terug naar de basis)."""
    if mine == 'B': return 'lose' if theirs == '3' else 'win'
    if theirs == 'B': return 'win' if mine == '3' else 'lose'
    if mine == '1' and theirs == '10': return 'win' if i_tagged else 'lose'
    if mine == '10' and theirs == '1': return 'lose' if not i_tagged else 'win'
    a, b = int(mine), int(theirs)
    return 'win' if a > b else 'lose' if a < b else 'both'


class StrategoGame(PhoneGame):
    gid = 'stratego'
    title = 'Rangen & Vlaggen'
    teams_fixed = ['Rood', 'Blauw']
    min_players = 4
    max_players = 60
    late_join = True
    stale_check = False

    def blank_extra(self):
        return {'key': secrets.randbelow(1024), 'minutes': 60, 'ends_at': None, 'duels': [], 'winner': None, 'flag': None,
                'base_codes': {}, 'scout_minutes': 10}

    def on_join(self, p, data):
        p.update(number=None, rank=None, status='field', losses=0, wins=0, scouted_at=0)
        if self.s['phase'] != 'lobby':
            self.place_late(p)

    def place_late(self, p):
        if not p.get('team'):
            sizes = {t['id']: len(self.team_players(t['id'])) for t in self.s['teams']}
            p['team'] = min(sizes, key=sizes.get)
        p['number'] = max([x.get('number') or 0 for x in self.s['players']] + [0]) + 1
        p['rank'] = self.rng.choice(REDRAW); p['status'] = 'out'

    def reset_player(self, p):
        out = super().reset_player(p); out.update(number=None, rank=None, status='field', losses=0, wins=0, scouted_at=0); return out

    # ---------------------------------------------------------------- spelleider
    def host_action(self, data):
        s = self.s; act = data.get('action'); ph = s['phase']
        if act == 'settings':
            if ph != 'lobby': raise PlayError('Instellingen alleen in de lobby.')
            minutes = data.get('minutes', 60)
            if type(minutes) is not int or not 15 <= minutes <= 180: raise PlayError('Kies 15 tot 180 minuten.')
            names = data.get('names')
            if names:
                if not isinstance(names, list) or len(names) != 2 or not all(isinstance(n, str) and n.strip() for n in names): raise PlayError('Geef beide teams een naam.')
                for t, n in zip(s['teams'], names): t['name'] = n.strip()[:20]
            s['minutes'] = minutes
        elif act == 'balance':
            if ph != 'lobby': raise PlayError('Teams verdelen kan alleen in de lobby.')
            players = s['players'][:]; self.rng.shuffle(players)
            for i, p in enumerate(players): p['team'] = s['teams'][i % 2]['id']
        elif act == 'start':
            if ph != 'lobby': raise PlayError('Het spel loopt al.')
            for p in s['players']:
                if not p.get('team'):
                    sizes = {t['id']: len(self.team_players(t['id'])) for t in s['teams']}; p['team'] = min(sizes, key=sizes.get)
            sizes = [len(self.team_players(t['id'])) for t in s['teams']]
            if min(sizes) < 2: raise PlayError('Elk team heeft minimaal twee spelers nodig.')
            numbers = list(range(1, len(s['players']) + 1)); self.rng.shuffle(numbers)
            for p, n in zip(s['players'], numbers): p['number'] = n
            for t in s['teams']:
                members = self.team_players(t['id']); ranks = ranks_for(len(members)); self.rng.shuffle(ranks)
                for p, r in zip(members, ranks): p.update(rank=r, status='field', losses=0, wins=0, scouted_at=0)
            s['base_codes'] = {t['id']: ''.join(secrets.choice('0123456789') for _ in range(4)) for t in s['teams']}
            self.set_phase('setup'); self.log('Rangen verdeeld. De teams verstoppen hun vlag.')
        elif act == 'go':
            if ph != 'setup': raise PlayError('Verdeel eerst de rangen.')
            s['ends_at'] = self.now() + s['minutes'] * 60; s['started_at'] = self.now()
            self.set_phase('play'); self.log('Start! De jacht op de vlag is begonnen.')
        elif act == 'flag':
            if ph != 'play': raise PlayError('Het spel loopt niet.')
            t = self.team(data.get('team'))
            if not t: raise PlayError('Kies het team dat de vlag veroverde.')
            s['flag'] = t['id']; self.finish(t['id'], f"{t['name']} verovert de vlag!")
        elif act == 'finish':
            if ph != 'play': raise PlayError('Het spel loopt niet.')
            self.finish_by_score()
        elif act == 'extend':
            if ph != 'play': raise PlayError('Het spel loopt niet.')
            s['ends_at'] = max(s['ends_at'], self.now()) + 10 * 60
        elif act == 'void_duel':
            d = next((d for d in s['duels'] if d['id'] == data.get('id')), None)
            if not d or d.get('void'): raise PlayError('Duel niet gevonden.')
            d['void'] = True; self.log('Een duel is door de spelleider geschrapt.')
        else:
            raise PlayError('Onbekende actie.')

    def result_scores(self):
        return {t['id']: self.score(t['id']) + (1 if self.s.get('winner') == t['id'] else 0) for t in self.s['teams']}

    def score(self, team_id):
        return sum(1 for d in self.s['duels'] if not d.get('void') and d['winner_team'] == team_id)

    def finish_by_score(self):
        a, b = self.s['teams']; sa, sb = self.score(a['id']), self.score(b['id'])
        if sa == sb: self.finish(None, f'Tijd voorbij: gelijkspel, {sa} tegen {sb} gewonnen duels.')
        else:
            w = a if sa > sb else b; self.finish(w['id'], f"Tijd voorbij: {w['name']} wint met {max(sa, sb)} tegen {min(sa, sb)} gewonnen duels.")

    def finish(self, team_id, text):
        self.s['winner'] = team_id; self.set_phase('end'); self.log(text)

    def tick(self):
        if self.s['phase'] == 'play' and self.s['ends_at'] and self.now() >= self.s['ends_at']:
            self.finish_by_score()
            return True

    # -------------------------------------------------------------- spelers
    def by_number(self, n): return next((p for p in self.s['players'] if p.get('number') == n), None)

    def player_action(self, p, data, offline=False):
        s = self.s; act = data.get('action'); ts = data.get('ts') or self.now()
        if s['phase'] not in ('play',) and act != 'checkin': raise PlayError('Het spel loopt nu niet.')
        if act == 'duel':
            info = decode(data.get('code'), s['key'])
            if not info: raise PlayError('Onbekende duelcode. Controleer de drie tekens.')
            other = self.by_number(info[0])
            if not other: raise PlayError('Onbekende duelcode.')
            if other['team'] == p['team']: raise PlayError('Dat is iemand van je eigen team.')
            for d in s['duels']:
                if {d['a'], d['b']} == {p['id'], other['id']} and abs(d['ts'] - ts) < 90: return  # al geteld
            if p['status'] != 'field': raise PlayError('Je bent uitgeschakeld. Ga eerst terug naar je basis.')
            if other['status'] != 'field' and not offline: raise PlayError(f"{other['name']} is al uitgeschakeld.")
            tagged = data.get('tagged') is True
            res = outcome(p['rank'], other['rank'], tagged)
            loser = [p] if res == 'lose' else [other] if res == 'win' else [p, other]
            winner = other if res == 'lose' else p if res == 'win' else None
            for x in loser:
                x['status'] = 'out'; x['losses'] += 1
            if winner: winner['wins'] += 1
            s['duels'].append({'id': secrets.token_hex(4), 'a': p['id'], 'b': other['id'], 'ts': ts, 'result': res,
                               'winner': winner['id'] if winner else None, 'winner_team': winner['team'] if winner else None})
            s['duels'] = s['duels'][-500:]
            self.log(f"{p['name']} en {other['name']}: {'gelijk, allebei terug naar de basis' if not winner else winner['name'] + ' wint'}.")
        elif act == 'checkin':
            if s['phase'] not in ('play', 'setup'): raise PlayError('Het spel loopt nu niet.')
            code = str(data.get('base', '')).strip()
            if code != s['base_codes'].get(p['team']): raise PlayError('Dat is niet de code van jullie basis.')
            if p['status'] == 'field' and s['phase'] == 'play': raise PlayError('Je bent al in het veld.')
            p['status'] = 'field'
            if p['losses'] >= 3 and p['rank'] not in ('B',):
                new = data.get('new_rank')
                p['rank'] = new if new in REDRAW else self.rng.choice(REDRAW); p['losses'] = 0
        elif act == 'scout':
            if p['rank'] != '2': raise PlayError('Alleen een Verkenner kan scannen.')
            if ts - p['scouted_at'] < s['scout_minutes'] * 60 - 5: raise PlayError('Je scan laadt nog op.')
            info = decode(data.get('code'), s['key'])
            if not info or not self.by_number(info[0]) or self.by_number(info[0])['team'] == p['team']: raise PlayError('Onbekende code van een tegenstander.')
            p['scouted_at'] = ts
        else:
            raise PlayError('Onbekende actie.')

    # ------------------------------------------------------------------ view
    def extra_view(self, out, role, me):
        s = self.s
        out['settings'] = {'minutes': s['minutes']}
        out['ends_at'] = s['ends_at']; out['winner'] = s['winner']
        out['scores'] = {t['id']: self.score(t['id']) for t in s['teams']}
        out['status'] = {p['id']: p.get('status', 'field') for p in s['players']}
        out['duels'] = [{'id': d['id'], 'a': self.name(d['a']), 'b': self.name(d['b']), 'winner': self.name(d['winner']) if d['winner'] else None,
                         'void': bool(d.get('void')), 'ts': d['ts']} for d in s['duels'][-12:]][::-1]
        out['counts'] = {t['id']: {'field': sum(1 for p in self.team_players(t['id']) if p.get('status') == 'field'),
                                   'out': sum(1 for p in self.team_players(t['id']) if p.get('status') == 'out')} for t in s['teams']}
        if role == 'host' and s['phase'] != 'lobby': out['base_codes'] = s['base_codes']
        if s['phase'] == 'end':
            out['ranks'] = {p['id']: p['rank'] for p in s['players']}
        if me:
            p = self.player(me['id'])
            if p.get('rank'):
                out['me'].update(rank=p['rank'], rank_name=NAMES[p['rank']], number=p['number'], status=p['status'], losses=p['losses'], wins=p['wins'],
                                 code=encode(p['number'], p['rank'], s['key']), key=s['key'], scouted_at=p['scouted_at'], scout_minutes=s['scout_minutes'],
                                 redraw=REDRAW, names=NAMES, numbers={str(x['number']): {'name': x['name'], 'team': x['team']} for x in s['players'] if x.get('number')})
