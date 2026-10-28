"""Smokkeltocht: smokkelaars brengen lading langs posten naar de markt; de douane controleert.

Alles wat een smokkelaar doet, gebeurt op zijn eigen telefoon en werkt ook zonder wifi:
een postcode intikken (het bordje bij de post), lading laden, afleveren, of een controle
waarbij de douanier zijn pincode op de telefoon van de smokkelaar intikt. De server
verwerkt de wachtrij op tijdsvolgorde en is de baas over voorraad en punten.
"""
import secrets
from games_base import PhoneGame, PlayError

GOODS = {
    'koffie': {'name': 'Koffie', 'weight': 1, 'value': 2, 'legal': True, 'via': []},
    'chocolade': {'name': 'Chocolade', 'weight': 2, 'value': 5, 'legal': False, 'via': ['midden']},
    'goud': {'name': 'Goud', 'weight': 3, 'value': 10, 'legal': False, 'via': ['midden', 'toren']},
}
POSTS = {'haven': 'De haven (laden)', 'midden': 'De molen (middenpost)', 'toren': 'De toren', 'markt': 'De markt (afleveren)'}
CAPACITY = 3
STOCK = {'koffie': 8, 'chocolade': 6, 'goud': 3}


def fnv(text):
    h = 2166136261
    for ch in text.encode('utf-8'):
        h ^= ch; h = (h * 16777619) & 0xFFFFFFFF
    return format(h, '08x')


class SmuggleGame(PhoneGame):
    gid = 'smokkel'
    title = 'Smokkeltocht'
    teams_fixed = ['Smokkelaars Rood', 'Smokkelaars Blauw', 'Douane']
    min_players = 3
    max_players = 60
    late_join = True
    stale_check = False

    def blank_extra(self):
        return {'minutes': 75, 'ends_at': None, 'posts': {}, 'salt': secrets.token_hex(4), 'stock': {}, 'runners': {},
                'pins': {}, 'scores': {}, 'events': [], 'douane_team': 't3'}

    def is_douane(self, p): return p.get('team') == self.s['douane_team']
    def smuggler_teams(self): return [t for t in self.s['teams'] if t['id'] != self.s['douane_team']]

    # ---------------------------------------------------------------- spelleider
    def host_action(self, data):
        s = self.s; act = data.get('action'); ph = s['phase']
        if act == 'settings':
            if ph != 'lobby': raise PlayError('Instellingen alleen in de lobby.')
            m = data.get('minutes', 75)
            if type(m) is not int or not 20 <= m <= 240: raise PlayError('Kies 20 tot 240 minuten.')
            s['minutes'] = m
        elif act == 'add_team':
            if ph != 'lobby': raise PlayError('Teams toevoegen kan alleen in de lobby.')
            if len(self.smuggler_teams()) >= 4: raise PlayError('Maximaal vier smokkelteams.')
            colors = ['Groen', 'Geel', 'Paars']
            name = 'Smokkelaars ' + colors[len(self.smuggler_teams()) - 2]
            s['teams'].append({'id': 't' + str(len(s['teams']) + 1), 'name': name})
        elif act == 'start':
            if ph != 'lobby': raise PlayError('Het spel loopt al.')
            for p in s['players']:
                if not p.get('team'):
                    smug = self.smuggler_teams(); sizes = {t['id']: len(self.team_players(t['id'])) for t in smug}
                    douane = len(self.team_players(s['douane_team']))
                    p['team'] = s['douane_team'] if douane * 4 < len(s['players']) - douane and douane < 1 + len(s['players']) // 5 else min(sizes, key=sizes.get)
            if not self.team_players(s['douane_team']): raise PlayError('Er is minimaal één douanier nodig.')
            if sum(1 for t in self.smuggler_teams() if self.team_players(t['id'])) < 1: raise PlayError('Er is minimaal één smokkelteam nodig.')
            used = set()
            for post in POSTS:
                code = None
                while not code or code in used: code = ''.join(secrets.choice('0123456789') for _ in range(4))
                used.add(code); s['posts'][post] = code
            s['stock'] = {t['id']: dict(STOCK) for t in self.smuggler_teams()}
            s['scores'] = {t['id']: 0 for t in s['teams']}
            for p in s['players']: self.init_player(p)
            self.set_phase('setup'); self.log('Posten en pincodes zijn klaar. Hang de postbordjes op.')
        elif act == 'go':
            if ph != 'setup': raise PlayError('Maak eerst de posten klaar.')
            s['ends_at'] = self.now() + s['minutes'] * 60; s['started_at'] = self.now()
            self.set_phase('play'); self.log('De smokkeltocht is begonnen!')
        elif act == 'extend':
            if ph != 'play': raise PlayError('Het spel loopt niet.')
            s['ends_at'] = max(s['ends_at'], self.now()) + 10 * 60
        elif act == 'finish':
            if ph != 'play': raise PlayError('Het spel loopt niet.')
            self.set_phase('end'); self.log('Einde smokkeltocht.')
        elif act == 'adjust':
            team = self.team(data.get('team')); pts = data.get('points')
            if not team or type(pts) is not int or not -50 <= pts <= 50: raise PlayError('Ongeldige correctie.')
            s['scores'][team['id']] += pts; self.log(f"Correctie {team['name']}: {pts:+d}.")
        else:
            raise PlayError('Onbekende actie.')

    def init_player(self, p):
        s = self.s
        if self.is_douane(p):
            if p['id'] not in s['pins']:
                pin = None
                while not pin or pin in s['pins'].values(): pin = ''.join(secrets.choice('0123456789') for _ in range(4))
                s['pins'][p['id']] = pin
        else:
            s['runners'].setdefault(p['id'], {'cargo': [], 'status': 'free', 'delivered': 0, 'inspected': {}})

    def on_join(self, p, data):
        if self.s['phase'] in ('setup', 'play'):
            if not p.get('team'):
                smug = self.smuggler_teams(); sizes = {t['id']: len(self.team_players(t['id'])) for t in smug}; p['team'] = min(sizes, key=sizes.get)
            self.init_player(p)

    def post_of(self, code):
        code = str(code or '').strip()
        return next((k for k, v in self.s['posts'].items() if v == code), None)

    # -------------------------------------------------------------- spelers
    def player_action(self, p, data, offline=False):
        s = self.s; act = data.get('action'); ts = data.get('ts') or self.now()
        if s['phase'] != 'play': raise PlayError('De smokkeltocht loopt nu niet.')
        if self.is_douane(p): raise PlayError('Douaniers controleren op de telefoon van de smokkelaar.')
        r = s['runners'][p['id']]; team = p['team']
        if act == 'inspect':
            pin = str(data.get('pin', '')).strip()
            officer = next((pid for pid, v in s['pins'].items() if v == pin), None)
            if not officer: raise PlayError('Onbekende douanepincode.')
            if r['status'] == 'caught': raise PlayError('Deze smokkelaar is al gepakt en moet terug naar de haven.')
            if ts - r['inspected'].get(officer, -1e9) < 300: raise PlayError('Deze douanier mag jou pas na vijf minuten weer controleren.')
            r['inspected'][officer] = ts
            contraband = [c for c in r['cargo'] if not GOODS[c['good']]['legal']]
            if contraband:
                value = sum(GOODS[c['good']]['value'] for c in contraband)
                r['cargo'] = [c for c in r['cargo'] if GOODS[c['good']]['legal']]; r['status'] = 'caught'
                s['scores'][s['douane_team']] += value
                self.event(f"Douane {self.name(officer)} pakt {p['name']}: {', '.join(GOODS[c['good']]['name'] for c in contraband)} in beslag (+{value}).")
            else:
                s['scores'][s['douane_team']] -= 2; s['scores'][team] += 1
                self.event(f"Vals alarm! {p['name']} had niets verbodens bij zich (douane −2, {self.name(team)} +1).")
            return
        post = self.post_of(data.get('post'))
        if not post: raise PlayError('Onbekende postcode. Kijk goed op het bordje.')
        if act == 'load':
            if post != 'haven': raise PlayError('Laden kan alleen in de haven.')
            goods = data.get('goods') or []
            if not isinstance(goods, list) or any(g not in GOODS for g in goods): raise PlayError('Kies geldige lading.')
            r['status'] = 'free'
            weight = sum(GOODS[c['good']]['weight'] for c in r['cargo']) + sum(GOODS[g]['weight'] for g in goods)
            if weight > CAPACITY: raise PlayError(f'Je kunt maximaal gewicht {CAPACITY} dragen.')
            need = {g: goods.count(g) for g in goods}
            for g, n in need.items():
                if s['stock'][team][g] < n: raise PlayError(f"Jullie voorraad {GOODS[g]['name'].lower()} is op.")
            for g in goods:
                s['stock'][team][g] -= 1; r['cargo'].append({'good': g, 'visited': []})
            if goods: self.event(f"{p['name']} laadt in de haven.", public=False)
        elif act == 'visit':
            if r['status'] == 'caught': raise PlayError('Je bent gepakt. Ga eerst terug naar de haven.')
            if post not in ('midden', 'toren'): raise PlayError('Deze post is geen tussenstop.')
            for c in r['cargo']:
                via = GOODS[c['good']]['via']
                if len(c['visited']) < len(via) and via[len(c['visited'])] == post: c['visited'].append(post)
        elif act == 'deliver':
            if r['status'] == 'caught': raise PlayError('Je bent gepakt. Ga eerst terug naar de haven.')
            if post != 'markt': raise PlayError('Afleveren kan alleen op de markt.')
            done = [c for c in r['cargo'] if c['visited'] == GOODS[c['good']]['via']]
            if not done: raise PlayError('Geen lading die al klaar is om af te leveren. Heb je alle tussenposten bezocht?')
            value = sum(GOODS[c['good']]['value'] for c in done)
            r['cargo'] = [c for c in r['cargo'] if c not in done]; r['delivered'] += len(done)
            s['scores'][team] += value
            self.event(f"{p['name']} ({self.name(team)}) levert af op de markt: +{value}.")
        else:
            raise PlayError('Onbekende actie.')

    def event(self, text, public=True):
        self.s['events'].append({'at': self.now(), 'text': text, 'public': public}); self.s['events'] = self.s['events'][-200:]
        self.log(text, public)

    # ------------------------------------------------------------------ view
    def extra_view(self, out, role, me):
        s = self.s
        out['settings'] = {'minutes': s['minutes']}; out['ends_at'] = s['ends_at']
        out['douane_team'] = s['douane_team']
        out['scores'] = s['scores']
        out['goods'] = GOODS; out['posts_names'] = POSTS; out['capacity'] = CAPACITY
        out['caught'] = {pid: r['status'] == 'caught' for pid, r in s['runners'].items()}
        if role == 'host' and s['phase'] != 'lobby':
            out['posts'] = s['posts']; out['stock'] = s['stock']
        if me and s['phase'] in ('setup', 'play', 'end'):
            p = self.player(me['id'])
            if self.is_douane(p):
                out['me']['douane'] = True; out['me']['pin'] = s['pins'].get(p['id'])
                out['me']['catches'] = sum(1 for e in s['events'] if e['text'].startswith(f"Douane {p['name']} pakt"))
            elif p['id'] in s['runners']:
                r = s['runners'][p['id']]
                out['me'].update(runner=r, stock=s['stock'].get(p['team']), salt=s['salt'],
                                 post_hashes={fnv(s['salt'] + code): post for post, code in s['posts'].items()},
                                 pin_hashes=[fnv(s['salt'] + pin) for pin in s['pins'].values()])
