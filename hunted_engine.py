"""Opgejaagd: vluchtteams lopen langs drie posten naar een extractiepunt, jagers proberen ze te tikken.

- Vluchters melden zich bij een post met de code van het bordje. Dat levert punten op,
  maar de jagers zien meteen waar ze zijn geweest.
- Elke vluchter heeft een eigen vangcode. Wie getikt wordt, laat die code zien en de
  jager typt hem in op zijn eigen telefoon.
- Op vaste pingmomenten zien de jagers de laatst bekende plek van elk vluchtteam: de
  gedeelde locatie (alleen als een vluchter dat zelf aanzet) of anders de laatste post.
- In de laatste minuten gaat de extractie open. Wie daar de code intikt, is ontsnapt.
Codes worden als hash naar de telefoons gestuurd, zodat inchecken en vangen ook zonder
wifi werkt; de server verwerkt de wachtrij later op tijdsvolgorde.
"""
import secrets
from games_base import PhoneGame, PlayError
from smuggle_engine import fnv

POST_POINTS = 3
EXTRACT_POINTS = 5
CAPTURE_POINTS = 3
GPS_FRESH = 300


class HuntedGame(PhoneGame):
    gid = 'opgejaagd'
    title = 'Opgejaagd'
    teams_fixed = ['Jagers', 'Vluchtteam 1', 'Vluchtteam 2']
    min_players = 3
    max_players = 60
    late_join = True
    stale_check = False

    def blank_extra(self):
        return {'minutes': 90, 'ping_minutes': 10, 'extract_minutes': 15, 'post_names': ['Post 1', 'Post 2', 'Post 3'],
                'extract_name': 'Het extractiepunt', 'ends_at': None, 'next_ping': None, 'extract_open': False,
                'codes': {}, 'capture': {}, 'status': {}, 'progress': {}, 'scores': {}, 'pings': [], 'gps': {},
                'share': {}, 'notices': [], 'salt': secrets.token_hex(4), 'hunters': 't1'}

    def is_hunter(self, p): return p.get('team') == self.s['hunters']
    def fugitive_teams(self): return [t for t in self.s['teams'] if t['id'] != self.s['hunters']]
    def fugitives(self, team=None): return [p for p in self.s['players'] if not self.is_hunter(p) and p.get('team') and (team is None or p['team'] == team)]
    def extract_at(self): return (self.s['ends_at'] or 0) - self.s['extract_minutes'] * 60

    # ---------------------------------------------------------------- spelleider
    def host_action(self, data):
        s = self.s; act = data.get('action'); ph = s['phase']
        if act == 'settings':
            if ph != 'lobby': raise PlayError('Instellingen alleen in de lobby.')
            m = data.get('minutes', s['minutes']); pm = data.get('ping_minutes', s['ping_minutes']); em = data.get('extract_minutes', s['extract_minutes'])
            if type(m) is not int or not 30 <= m <= 240: raise PlayError('Kies 30 tot 240 minuten.')
            if type(pm) is not int or not 3 <= pm <= 30: raise PlayError('Kies een ping elke 3 tot 30 minuten.')
            if type(em) is not int or not 5 <= em <= m // 2: raise PlayError('De extractie gaat 5 minuten tot de helft van de speeltijd voor het einde open.')
            names = data.get('post_names', s['post_names'])
            if not isinstance(names, list) or len(names) != 3 or any(not isinstance(n, str) or not n.strip() for n in names): raise PlayError('Geef de drie posten een naam.')
            ex = str(data.get('extract_name', s['extract_name'])).strip()[:80]
            if not ex: raise PlayError('Geef het extractiepunt een naam.')
            s.update(minutes=m, ping_minutes=pm, extract_minutes=em, post_names=[n.strip()[:60] for n in names], extract_name=ex)
        elif act == 'add_team':
            if ph != 'lobby': raise PlayError('Teams toevoegen kan alleen in de lobby.')
            if len(self.fugitive_teams()) >= 6: raise PlayError('Maximaal zes vluchtteams.')
            s['teams'].append({'id': 't' + str(len(s['teams']) + 1), 'name': 'Vluchtteam ' + str(len(self.fugitive_teams()) + 1)})
        elif act == 'start':
            if ph != 'lobby': raise PlayError('Het spel loopt al.')
            for p in s['players']:
                if not p.get('team'):
                    hunters = len(self.team_players(s['hunters']))
                    if hunters * 3 < len(s['players']) - hunters: p['team'] = s['hunters']
                    else:
                        sizes = {t['id']: len(self.team_players(t['id'])) for t in self.fugitive_teams()}; p['team'] = min(sizes, key=sizes.get)
            if not self.team_players(s['hunters']): raise PlayError('Er is minimaal één jager nodig.')
            if not self.fugitives(): raise PlayError('Er is minimaal één vluchter nodig.')
            used = set()
            for key in ('p1', 'p2', 'p3', 'ex'):
                code = None
                while not code or code in used: code = ''.join(secrets.choice('0123456789') for _ in range(4))
                used.add(code); s['codes'][key] = code
            s['scores'] = {t['id']: 0 for t in s['teams']}
            s['progress'] = {t['id']: [] for t in self.fugitive_teams()}
            for p in s['players']: self.init_player(p)
            self.set_phase('setup'); self.log('De posten, codes en vangcodes zijn klaar. Hang de bordjes op.')
        elif act == 'go':
            if ph != 'setup': raise PlayError('Maak eerst de posten klaar.')
            s['started_at'] = self.now(); s['ends_at'] = self.now() + s['minutes'] * 60; s['next_ping'] = self.now() + s['ping_minutes'] * 60
            self.set_phase('play'); self.log('De jacht is geopend! Vluchters, maak dat je wegkomt.')
        elif act == 'extend':
            if ph != 'play': raise PlayError('Het spel loopt niet.')
            s['ends_at'] = max(s['ends_at'], self.now()) + 10 * 60
        elif act == 'ping_now':
            if ph != 'play': raise PlayError('Het spel loopt niet.')
            self.ping(); s['next_ping'] = self.now() + s['ping_minutes'] * 60
        elif act == 'message':
            to = data.get('to'); text = str(data.get('text', '')).strip()[:200]
            if to not in ('jagers', 'vluchters', 'iedereen') or not text: raise PlayError('Kies voor wie de melding is en typ een tekst.')
            s['notices'].append({'at': self.now(), 'to': to, 'text': text}); s['notices'] = s['notices'][-50:]
        elif act == 'release':
            p = self.player(data.get('id'))
            if not p or s['status'].get(p['id']) != 'gevangen': raise PlayError('Deze speler is niet gevangen.')
            s['status'][p['id']] = 'vrij'; s['scores'][s['hunters']] -= CAPTURE_POINTS
            self.log(f"{p['name']} is door de spelleider vrijgelaten (vangst teruggedraaid).")
        elif act == 'adjust':
            team = self.team(data.get('team')); pts = data.get('points')
            if not team or type(pts) is not int or not -50 <= pts <= 50: raise PlayError('Ongeldige correctie.')
            s['scores'][team['id']] += pts; self.log(f"Correctie {team['name']}: {pts:+d}.")
        elif act == 'finish':
            if ph != 'play': raise PlayError('Het spel loopt niet.')
            self.end('De spelleider heeft het spel beëindigd.')
        else:
            raise PlayError('Onbekende actie.')

    def init_player(self, p):
        s = self.s
        if not self.is_hunter(p) and p['id'] not in s['capture']:
            code = None
            while not code or code in s['capture'].values(): code = ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(4))
            s['capture'][p['id']] = code; s['status'][p['id']] = 'vrij'

    def on_join(self, p, data):
        if self.s['phase'] in ('setup', 'play'):
            if not p.get('team'):
                sizes = {t['id']: len(self.team_players(t['id'])) for t in self.fugitive_teams()}; p['team'] = min(sizes, key=sizes.get)
            self.init_player(p)

    def end(self, why):
        self.set_phase('end'); self.log('Einde van de jacht. ' + why)

    # ------------------------------------------------------------- pings
    def last_seen(self, team):
        s = self.s; free = [p for p in self.fugitives(team) if s['status'].get(p['id']) == 'vrij']
        if not free: return None
        fixes = [s['gps'][p['id']] for p in free if p['id'] in s['gps'] and s['share'].get(p['id']) and self.now() - s['gps'][p['id']]['at'] <= GPS_FRESH]
        if fixes:
            f = max(fixes, key=lambda x: x['at']); return {'kind': 'gps', 'lat': f['lat'], 'lng': f['lng'], 'acc': f['acc']}
        prog = s['progress'].get(team) or []
        return {'kind': 'post', 'post': s['post_names'][prog[-1]] if prog else 'Startpunt'}

    def ping(self):
        for t in self.fugitive_teams():
            seen = self.last_seen(t['id'])
            if seen: self.s['pings'].append({'at': self.now(), 'team': t['id'], **seen})
        self.s['pings'] = self.s['pings'][-120:]
        self.log('Ping! De jagers zien de laatst bekende plek van elk vluchtteam.')

    def tick(self):
        s = self.s
        if s['phase'] != 'play': return False
        changed = False
        while s['next_ping'] and self.now() >= s['next_ping'] and self.now() < s['ends_at']:
            self.ping(); s['next_ping'] += s['ping_minutes'] * 60; changed = True
        if not s['extract_open'] and self.now() >= self.extract_at():
            s['extract_open'] = True; self.log(f"De extractie is open: {s['extract_name']}. Vluchters, haast je!"); changed = True
        free = [p for p in self.fugitives() if s['status'].get(p['id']) == 'vrij']
        if self.now() >= s['ends_at']: self.end('De tijd is om.'); changed = True
        elif not free and self.fugitives(): self.end('Er zijn geen vrije vluchters meer.'); changed = True
        return changed

    # -------------------------------------------------------------- spelers
    def player_action(self, p, data, offline=False):
        s = self.s; act = data.get('action'); ts = data.get('ts') or self.now()
        if act == 'share':
            s['share'][p['id']] = data.get('on') is True
            if not s['share'][p['id']]: s['gps'].pop(p['id'], None)
            return
        if s['phase'] != 'play': raise PlayError('De jacht loopt nu niet.')
        if ts > s['ends_at'] + 5: raise PlayError('Deze actie kwam na het einde van de jacht.')
        if self.is_hunter(p):
            if act != 'capture': raise PlayError('Jagers kunnen alleen vangen.')
            code = str(data.get('code', '')).strip().upper()
            pid = next((k for k, v in s['capture'].items() if v == code), None)
            if not pid: raise PlayError('Onbekende vangcode.')
            st = s['status'].get(pid); victim = self.player(pid)
            if st == 'gevangen': raise PlayError(f"{victim['name']} was al gevangen.")
            if st == 'ontsnapt': raise PlayError(f"{victim['name']} is al ontsnapt.")
            s['status'][pid] = 'gevangen'; s['gps'].pop(pid, None); s['scores'][s['hunters']] += CAPTURE_POINTS
            self.log(f"Gevangen! {p['name']} tikte {victim['name']} ({self.name(victim['team'])}).")
            return
        st = s['status'].get(p['id'])
        if st != 'vrij': raise PlayError('Je bent gevangen.' if st == 'gevangen' else 'Je bent al ontsnapt.')
        if act == 'locate':
            if not s['share'].get(p['id']): raise PlayError('Locatie delen staat uit.')
            try: lat, lng, acc = float(data['lat']), float(data['lng']), float(data.get('acc', 0))
            except (KeyError, TypeError, ValueError): raise PlayError('Ongeldige locatie.')
            if not (-90 <= lat <= 90 and -180 <= lng <= 180 and 0 <= acc < 100000): raise PlayError('Ongeldige locatie.')
            s['gps'][p['id']] = {'lat': round(lat, 5), 'lng': round(lng, 5), 'acc': round(acc), 'at': min(ts, self.now())}
        elif act == 'checkin':
            code = str(data.get('code', '')).strip()
            key = next((k for k, v in s['codes'].items() if v == code), None)
            if not key: raise PlayError('Onbekende code. Kijk goed op het bordje.')
            team = p['team']; prog = s['progress'].setdefault(team, [])
            if key == 'ex':
                if ts < self.extract_at(): raise PlayError('De extractie is nog niet open.')
                if len(prog) < 3: raise PlayError('Jullie team moet eerst alle drie de posten bezoeken.')
                s['status'][p['id']] = 'ontsnapt'; s['gps'].pop(p['id'], None); s['scores'][team] += EXTRACT_POINTS
                self.log(f"Ontsnapt! {p['name']} ({self.name(team)}) haalde de extractie (+{EXTRACT_POINTS}).")
                return
            idx = int(key[1]) - 1
            if idx in prog: raise PlayError('Jullie team heeft deze post al gehaald.')
            if idx != len(prog): raise PlayError(f"Ga eerst naar {s['post_names'][len(prog)]}.")
            prog.append(idx); s['scores'][team] += POST_POINTS
            self.log(f"{self.name(team)} meldde zich bij {s['post_names'][idx]} (+{POST_POINTS}). De jagers weten nu waar ze waren!")
            s['pings'].append({'at': min(ts, self.now()), 'team': team, 'kind': 'post', 'post': s['post_names'][idx], 'checkin': True})
        else:
            raise PlayError('Onbekende actie.')

    # ------------------------------------------------------------------ view
    def extra_view(self, out, role, me):
        s = self.s
        out['settings'] = {k: s[k] for k in ('minutes', 'ping_minutes', 'extract_minutes', 'post_names', 'extract_name')}
        out['ends_at'] = s['ends_at']; out['next_ping'] = s['next_ping']; out['extract_at'] = self.extract_at() if s['ends_at'] else None
        out['extract_open'] = s['extract_open']; out['hunters'] = s['hunters']; out['scores'] = s['scores']
        out['status'] = {pid: st for pid, st in s['status'].items()}
        out['progress'] = {t: len(v) for t, v in s['progress'].items()}
        if role == 'host':
            out['codes'] = s['codes']; out['capture'] = s['capture']; out['pings'] = s['pings'][-40:]
            out['gps'] = {pid: g for pid, g in s['gps'].items()}; out['share'] = s['share']; out['notices'] = s['notices'][-10:]
        if me and s['phase'] in ('setup', 'play', 'end'):
            p = self.player(me['id'])
            if self.is_hunter(p):
                out['me'].update(hunter=True, salt=s['salt'], capture_hashes={fnv(s['salt'] + c): pid for pid, c in s['capture'].items()},
                                 pings=s['pings'][-30:], notices=[n for n in s['notices'] if n['to'] in ('jagers', 'iedereen')][-5:])
            elif p['id'] in s['capture']:
                team = p['team']; prog = s['progress'].get(team, [])
                out['me'].update(fugitive=True, capture=s['capture'][p['id']], share=bool(s['share'].get(p['id'])), salt=s['salt'],
                                 post_hashes={fnv(s['salt'] + c): k for k, c in s['codes'].items()}, team_progress=prog,
                                 next_post=s['post_names'][len(prog)] if len(prog) < 3 else None,
                                 extract_name=s['extract_name'] if s['extract_open'] else None,
                                 own_pings=[x for x in s['pings'] if x['team'] == team][-3:],
                                 notices=[n for n in s['notices'] if n['to'] in ('vluchters', 'iedereen')][-5:])
