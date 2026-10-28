"""Muziekbingo: ieder team heeft een eigen bingokaart op de telefoon.

De DJ (spelleider) speelt nummers af via de eigen muziek-app; de pc toont welk nummer aan
de beurt is. Teams strepen zelf af op hun telefoon. Een BINGO-melding controleert de
server: alleen vakjes die zijn afgestreept én al gespeeld zijn, tellen. Eerst wordt
gespeeld om een rij (horizontaal, verticaal of diagonaal), daarna om een volle kaart.
Meldingen binnen vijf seconden na de eerste geldige bingo delen in de punten.
"""
from games_base import PhoneGame, PlayError, load_json

POINTS = {'line': 5, 'full': 10}
FALSE_BINGO = 2
WINDOW = 5


def lines(size):
    rows = [[r * size + c for c in range(size)] for r in range(size)]
    cols = [[r * size + c for r in range(size)] for c in range(size)]
    return rows + cols + [[i * size + i for i in range(size)], [i * size + size - 1 - i for i in range(size)]]


class BingoGame(PhoneGame):
    gid = 'bingo'
    title = 'Muziekbingo'
    teams_fixed = 'free'
    min_players = 2
    max_players = 80
    late_join = True
    stale_check = False

    def __init__(self, game, rng=None, songs=None):
        raw = songs or load_json('bingo-songs.json')
        seen, self.default_songs = set(), []
        for r in raw:  # 0.14: dubbele nummers in de startlijst geven dubbele bingovakjes
            key = (str(r['title']).casefold().strip(), str(r['artist']).casefold().strip())
            if key not in seen: seen.add(key); self.default_songs.append({'title': r['title'], 'artist': r['artist']})
        super().__init__(game, rng)

    def blank_extra(self):
        return {'size': 4, 'songs': [dict(x) for x in self.default_songs], 'custom': False, 'deck': [], 'played': [],
                'current': None, 'revealed': False, 'cards': {}, 'marks': {}, 'pattern': 'line', 'winners': {'line': [], 'full': []},
                'window_until': None, 'scores': {}, 'false': {}, 'round': 1, 'used': []}

    # ---------------------------------------------------------------- spelleider
    def host_action(self, data):
        s = self.s; act = data.get('action'); ph = s['phase']
        if act == 'settings':
            if ph != 'lobby': raise PlayError('Instellingen alleen in de lobby.')
            size = data.get('size', s['size'])
            if size not in (3, 4, 5): raise PlayError('Kies een kaart van 3×3, 4×4 of 5×5.')
            s['size'] = size
        elif act == 'songs':
            if ph != 'lobby': raise PlayError('Wijzig de muzieklijst in de lobby.')
            if data.get('default'):
                s['songs'] = [dict(x) for x in self.default_songs]; s['custom'] = False; return
            rows = data.get('songs')
            if not isinstance(rows, list) or not 9 <= len(rows) <= 300: raise PlayError('Gebruik 9 tot 300 nummers.')
            out, seen = [], set()
            for r in rows:
                if not isinstance(r, dict): raise PlayError('Ongeldige muzieklijst.')
                title = str(r.get('title', '')).strip()[:120]; artist = str(r.get('artist', '')).strip()[:120]
                if not title or not artist: raise PlayError('Elk nummer heeft een titel en artiest nodig.')
                key = (title.casefold(), artist.casefold())
                if key in seen: continue
                seen.add(key); out.append({'title': title, 'artist': artist})
            s['songs'] = out; s['custom'] = True
        elif act == 'add_team':
            name = str(data.get('name', '')).strip()[:30]
            if not name or any(t['name'].casefold() == name.casefold() for t in s['teams']): raise PlayError('Kies een unieke teamnaam.')
            if len(s['teams']) >= 12: raise PlayError('Maximaal twaalf teams.')
            s['teams'].append({'id': 't' + str(len(s['teams']) + 1), 'name': name})
            if ph == 'play': self.deal(s['teams'][-1]['id'])
        elif act == 'start':
            if ph != 'lobby': raise PlayError('Het spel loopt al.')
            teams = [t for t in s['teams'] if self.team_players(t['id'])]
            if not teams: raise PlayError('Er is nog geen team met spelers.')
            if any(not p.get('team') for p in s['players']): raise PlayError('Iedereen moet eerst in een team zitten.')
            if len(s['songs']) < s['size'] ** 2 + 3: raise PlayError(f"Voor een {s['size']}×{s['size']}-kaart zijn minstens {s['size'] ** 2 + 3} nummers nodig.")
            s['deck'] = list(range(len(s['songs']))); self.rng.shuffle(s['deck'])
            s['scores'] = {t['id']: 0 for t in s['teams']}
            for t in s['teams']: self.deal(t['id'])
            s['started_at'] = self.now(); self.set_phase('play'); self.log('De bingokaarten zijn uitgedeeld. Eerst spelen we om een rij!')
        elif act == 'next':
            if ph != 'play': raise PlayError('Het spel loopt niet.')
            if not s['deck']: raise PlayError('Alle nummers zijn gespeeld.')
            s['current'] = s['deck'].pop(0); s['played'].append(s['current']); s['revealed'] = False
            self.log(f"Nummer {len(s['played'])} wordt gedraaid.")
        elif act == 'reveal':
            if ph != 'play' or s['current'] is None: raise PlayError('Er speelt nog geen nummer.')
            s['revealed'] = True; song = s['songs'][s['current']]
            self.log(f"Nummer {len(s['played'])}: {song['title']} – {song['artist']}.")
        elif act == 'adjust':
            team = self.team(data.get('team')); pts = data.get('points')
            if not team or type(pts) is not int or not -20 <= pts <= 20: raise PlayError('Ongeldige correctie.')
            s['scores'][team['id']] = s['scores'].get(team['id'], 0) + pts; self.log(f"Correctie {team['name']}: {pts:+d}.")
        elif act == 'new_round':
            # 0.14: zelfde teams en muzieklijst, nieuwe kaarten; de scores lopen door. Nummers die al
            # gedraaid zijn, komen pas terug als de lijst anders te kort is.
            if ph not in ('play', 'end'): raise PlayError('Start eerst het spel.')
            used = set(s.get('used', [])) | set(s['played'])
            fresh = [i for i in range(len(s['songs'])) if i not in used]
            if len(fresh) < s['size'] ** 2 + 3: fresh, used = list(range(len(s['songs']))), set()
            s['used'] = sorted(used); s['deck'] = fresh; self.rng.shuffle(s['deck'])
            s['played'] = []; s['current'] = None; s['revealed'] = False
            s['pattern'] = 'line'; s['winners'] = {'line': [], 'full': []}; s['window_until'] = None
            s['round'] = s.get('round', 1) + 1
            for t in s['teams']:
                if t['id'] in s['cards'] or self.team_players(t['id']): self.deal(t['id'], pool=fresh)
            self.set_phase('play'); self.log(f"Ronde {s['round']}: nieuwe kaarten uitgedeeld. Eerst weer om een rij!")
        elif act == 'finish':
            if ph != 'play': raise PlayError('Het spel loopt niet.')
            self.set_phase('end'); self.log('Einde van de muziekbingo.')
        else:
            raise PlayError('Onbekende actie.')

    def deal(self, team, pool=None):
        s = self.s; n = s['size'] ** 2
        pool = list(pool) if pool and len(pool) >= n else list(range(len(s['songs'])))
        s['cards'][team] = self.rng.sample(pool, n); s['marks'][team] = []  # sample: nooit twee keer hetzelfde nummer
        s['scores'].setdefault(team, 0)

    def on_join(self, p, data):
        if self.s['phase'] == 'play' and p.get('team') and p['team'] not in self.s['cards']: self.deal(p['team'])

    def valid_cells(self, team):
        s = self.s; card = s['cards'][team]; played = set(s['played'])
        return {i for i in s['marks'][team] if card[i] in played}

    def has(self, team, pattern):
        good = self.valid_cells(team); size = self.s['size']
        if pattern == 'full': return len(good) == size * size
        return any(all(i in good for i in line) for line in lines(size))

    # -------------------------------------------------------------- spelers
    def player_action(self, p, data, offline=False):
        s = self.s; act = data.get('action'); team = p.get('team')
        if s['phase'] != 'play': raise PlayError('De bingo loopt nu niet.')
        if team not in s['cards']: raise PlayError('Jullie team heeft nog geen kaart.')
        if act == 'mark':
            i = data.get('cell')
            if type(i) is not int or not 0 <= i < s['size'] ** 2: raise PlayError('Ongeldig vakje.')
            marks = s['marks'][team]
            if i in marks: marks.remove(i)
            else: marks.append(i)
        elif act == 'claim':
            pattern = s['pattern']
            if pattern is None: raise PlayError('Er valt niets meer te winnen.')
            if team in s['winners'][pattern]: raise PlayError('Jullie bingo is al geteld.')
            in_window = s['window_until'] is not None and self.now() <= s['window_until']
            if s['winners'][pattern] and not in_window: raise PlayError('Net te laat: deze bingo is al gevallen.')
            if self.has(team, pattern):
                s['winners'][pattern].append(team); s['scores'][team] += POINTS[pattern]
                if s['window_until'] is None: s['window_until'] = self.now() + WINDOW
                self.log(f"BINGO! {self.name(team)} heeft {'een rij' if pattern == 'line' else 'een volle kaart'} (+{POINTS[pattern]}).")
            else:
                s['scores'][team] -= FALSE_BINGO; s['false'][team] = s['false'].get(team, 0) + 1
                played = set(s['played']); card = s['cards'][team]
                s['marks'][team] = [i for i in s['marks'][team] if card[i] in played]
                self.log(f"Valse bingo van {self.name(team)} (−{FALSE_BINGO}). Niet-gespeelde vakjes zijn weer vrijgemaakt.")
        else:
            raise PlayError('Onbekende actie.')

    def tick(self):
        s = self.s
        if s['phase'] == 'play' and s['window_until'] is not None and self.now() > s['window_until']:
            s['window_until'] = None
            if s['pattern'] == 'line': s['pattern'] = 'full'; self.log('De rij is gevallen. Nu spelen we om een volle kaart!')
            else: s['pattern'] = None; self.set_phase('end'); self.log('Volle kaart! Einde van de muziekbingo.')
            return True
        return False

    # ------------------------------------------------------------------ view
    def extra_view(self, out, role, me):
        s = self.s
        out['settings'] = {'size': s['size'], 'songs': len(s['songs']), 'custom': s['custom']}
        out['pattern'] = s['pattern']; out['winners'] = s['winners']; out['scores'] = s['scores']; out['points'] = POINTS
        out['played_count'] = len(s['played']); out['left'] = len(s['deck']); out['round'] = s.get('round', 1)
        cur = s['songs'][s['current']] if s['current'] is not None else None
        if s['revealed'] or s['phase'] == 'end' or role == 'host':
            out['current'] = cur
        out['revealed_list'] = [s['songs'][i] for i in (s['played'] if s['phase'] == 'end' else s['played'][:-1] if not s['revealed'] else s['played'])][-12:]
        if role == 'host':
            out['revealed'] = s['revealed']; out['false'] = s['false']
            if s['phase'] == 'lobby': out['song_list'] = s['songs'][:300]
            out['progress'] = {t: {'valid': len(self.valid_cells(t)), 'marked': len(s['marks'][t])} for t in s['cards']}
        if me and s['phase'] in ('play', 'end') and me.get('team') in s['cards']:
            team = me['team']; card = s['cards'][team]; marks = set(s['marks'][team])
            out['me'].update(card=[{'i': i, 'title': s['songs'][x]['title'], 'artist': s['songs'][x]['artist'], 'marked': i in marks} for i, x in enumerate(card)],
                             won=[k for k, v in s['winners'].items() if team in v])
