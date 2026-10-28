"""Gedeelde basis voor telefoonspellen (Moordspel, Stratego, Holland, Gekke 88, Smokkeltocht).

Elk spel is een subklasse van PhoneGame. De server is de enige bron van waarheid;
`view()` bouwt per rol (public, host, player) een eigen witte lijst. Acties die een
telefoon zonder wifi heeft verzameld, komen via `sync()` binnen en worden op volgorde
van tijdstip en met een uniek actie-ID precies één keer verwerkt.
"""
import copy
import json
import random
import secrets
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class PlayError(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status


def load_json(name):
    return json.loads((ROOT / name).read_text('utf-8'))


class PhoneGame:
    gid = 'base'
    title = 'Spel'
    teams_fixed = None          # bv. ['Rood', 'Blauw'] of None (geen teams) of 'free' (spelers kiezen naam van team)
    min_players = 2
    max_players = 40
    late_join = False           # nieuwe spelers na de start toegestaan?
    stale_check = True          # verouderde schermen weigeren (fase-ID)

    def __init__(self, game, rng=None):
        self.game = game
        self.rng = rng or random.SystemRandom()
        store = game.s.setdefault('spel', {})
        if self.gid not in store:
            store[self.gid] = self.blank()
        self.s = store[self.gid]
        for p in self.s['players']: p['seen'] = 0
        self.flash = None

    # ---------------------------------------------------------------- opslag
    def blank(self):
        base = {'id': str(uuid.uuid4()), 'code': str(secrets.randbelow(900000) + 100000), 'phase': 'lobby',
                'players': [], 'teams': [], 'log': [], 'revision': 0, 'seen_actions': [], 'started_at': None}
        base.update(self.blank_extra())
        return base

    def blank_extra(self): return {}

    def save(self):
        self.s['revision'] += 1
        self.game._save()

    def now(self): return self.game.clock()

    def log(self, text, public=True):
        self.s['log'].append({'at': self.now(), 'text': text, 'public': public})
        self.s['log'] = self.s['log'][-150:]

    # ------------------------------------------------------------- spelers
    def player(self, ident): return next((p for p in self.s['players'] if p['id'] == ident), None)
    def team(self, ident): return next((t for t in self.s['teams'] if t['id'] == ident), None)
    def team_players(self, team_id): return [p for p in self.s['players'] if p.get('team') == team_id]
    def name(self, ident):
        p = self.player(ident) or self.team(ident)
        return p['name'] if p else ''

    def by_token(self, key):
        p = next((p for p in self.s['players'] if isinstance(key, str) and secrets.compare_digest(p['token'], key)), None)
        if not p: raise PlayError('Meld je opnieuw aan met je persoonlijke code.', 403)
        return p

    def ensure_teams(self):
        if isinstance(self.teams_fixed, list) and not self.s['teams']:
            self.s['teams'] = [{'id': 't' + str(i + 1), 'name': n} for i, n in enumerate(self.teams_fixed)]

    def join(self, data):
        with self.game.lock:
            if str(data.get('code', '')).strip() != self.s['code']: raise PlayError('Onjuiste spelcode.', 403)
            access = str(data.get('access_code', '')).strip().upper()
            if access:
                p = next((p for p in self.s['players'] if secrets.compare_digest(p['access'], access)), None)
                if not p: raise PlayError('Onjuiste persoonlijke code.', 403)
            else:
                if self.s['phase'] != 'lobby' and not self.late_join: raise PlayError('Het spel is begonnen. Gebruik je persoonlijke code om terug te komen.')
                name = str(data.get('name', '')).strip()[:30]
                if not name: raise PlayError('Vul je naam in.')
                if any(x['name'].casefold() == name.casefold() for x in self.s['players']): raise PlayError('Die naam is al gekozen. Voeg bijvoorbeeld een initiaal toe.')
                if len(self.s['players']) >= self.max_players: raise PlayError(f'Maximaal {self.max_players} spelers.')
                p = {'id': str(uuid.uuid4()), 'token': secrets.token_urlsafe(24), 'access': secrets.token_hex(3).upper(), 'name': name, 'seen': 0, 'team': None}
                self.ensure_teams()
                team = data.get('team')
                if self.teams_fixed == 'free':
                    team_name = str(team or '').strip()[:30] or (self.roster_team(name) or '')[:30]
                    if team_name:
                        t = next((t for t in self.s['teams'] if t['name'].casefold() == team_name.casefold()), None)
                        if not t:
                            if len(self.s['teams']) >= 12: raise PlayError('Maximaal twaalf teams.')
                            t = {'id': 't' + str(len(self.s['teams']) + 1), 'name': team_name}; self.s['teams'].append(t)
                        p['team'] = t['id']
                elif isinstance(self.teams_fixed, list) and team in [t['id'] for t in self.s['teams']]:
                    p['team'] = team
                self.on_join(p, data)
                self.s['players'].append(p)
            p['seen'] = self.now(); self.save()
            return {'token': p['token']}

    def on_join(self, p, data): pass

    # ------------------------------------------------------------ verzoeken
    def phase_id(self): return f"{self.s['phase']}:{self.s['revision_phase'] if 'revision_phase' in self.s else ''}"

    def set_phase(self, phase):
        self.s['phase'] = phase
        self.s['revision_phase'] = self.s.get('revision_phase', 0) + 1
        if phase == 'end': self.s['ended_at'] = self.now()

    # ------------------------------------------------------- 0.15: uitslag voor het klassement van de app
    def final_results(self):
        """Einduitslag als [{'name', 'score'}] voor ieder team (of iedere speler zonder teams), of None.
        De app zet dit om naar rangpunten; ruwe punten van verschillende spellen worden daar nooit opgeteld."""
        if self.s.get('phase') != 'end' or not self.s.get('players'): return None
        scores = self.result_scores()
        if not scores: return None
        return [{'name': self.name(k), 'score': v} for k, v in scores.items() if self.name(k)]

    def result_scores(self):
        """Standaard: s['scores'] (team- of speler-id → punten). Spellen met een eigen telling overschrijven dit."""
        return dict(self.s.get('scores') or {})

    def roster_team(self, name):
        """0.15: team van deze speler volgens 'Mijn groep' in de app (als de spelleider de groep heeft gedeeld)."""
        for r in (self.game.s.get('roster') or {}).get('players', []):
            if r.get('name', '').casefold() == name.casefold(): return r.get('team') or None
        return None

    def host_request(self, key, data):
        with self.game.lock:
            self.game.host(key)
            before = copy.deepcopy(self.s)
            try:
                act = data.get('action')
                if act == 'remove':
                    if self.s['phase'] != 'lobby': raise PlayError('Verwijder spelers alleen in de lobby.')
                    self.s['players'] = [p for p in self.s['players'] if p['id'] != data.get('id')]
                elif act == 'move_team':
                    p = self.player(data.get('id')); t = self.team(data.get('team'))
                    if not p or not t or self.s['phase'] != 'lobby': raise PlayError('Wissel teams alleen in de lobby.')
                    p['team'] = t['id']
                elif act == 'show_code':
                    p = self.player(data.get('id'))
                    if not p: raise PlayError('Speler niet gevonden.')
                    self.log(f"De persoonlijke code van {p['name']} is op de pc opnieuw getoond.")
                    self.flash = {'kind': 'code', 'name': p['name'], 'access': p['access']}
                elif act == 'area':
                    self.set_area(data)
                elif act == 'reset':
                    keep = self.s['players']; code = self.s['code']; teams = self.s['teams']
                    self.s.clear(); self.s.update(self.blank()); self.s['code'] = code; self.s['teams'] = teams
                    self.s['players'] = [self.reset_player(p) for p in keep]
                else:
                    self.host_action(data)
            except Exception:
                self.s.clear(); self.s.update(before); raise
            self.save(); return self.view(key, 'host')

    def set_area(self, data):
        """0.14: afgesproken speelgebied voor buitenspellen: omschrijving, optioneel middelpunt en straal."""
        text = str(data.get('text', '')).strip()[:400]
        radius = data.get('radius', 0)
        if type(radius) is not int or radius not in (0, 300, 500, 1000, 2000, 5000): raise PlayError('Kies een geldige straal.')
        center = data.get('center')
        if center is not None:
            if not (isinstance(center, list) and len(center) == 2 and all(isinstance(x, (int, float)) for x in center)
                    and -90 <= center[0] <= 90 and -180 <= center[1] <= 180): raise PlayError('Ongeldig middelpunt.')
            center = [round(float(center[0]), 5), round(float(center[1]), 5)]
        elif radius: center = (self.s.get('area') or {}).get('center')
        if radius and not center: raise PlayError('Kies eerst een middelpunt (gebruik je locatie) of zet de afstandscontrole uit.')
        self.s['area'] = {'text': text, 'radius': radius, 'center': center if radius else None}
        self.log('Het speelgebied is vastgelegd.' if text or radius else 'Het speelgebied is gewist.')

    def reset_player(self, p):
        return {k: p[k] for k in ('id', 'token', 'access', 'name', 'seen', 'team')}

    def player_request(self, key, data):
        with self.game.lock:
            p = self.by_token(key); p['seen'] = self.now()
            if self.stale_check and data.get('phase_id') not in (None, self.phase_id()):
                raise PlayError('Het spel is verder gegaan. Je scherm wordt bijgewerkt.', 409)
            before = copy.deepcopy(self.s)
            try: self.player_action(p, data, offline=False)
            except Exception:
                self.s.clear(); self.s.update(before); raise
            self.save(); return self.view(key, 'player')

    def sync(self, key, data):
        """Offline verzamelde acties: [{id, ts, ...}]. Elke actie telt één keer; fouten worden teruggemeld."""
        with self.game.lock:
            p = self.by_token(key); p['seen'] = self.now()
            actions = data.get('actions')
            if not isinstance(actions, list) or len(actions) > 200: raise PlayError('Ongeldige wachtrij.')
            results = []
            for a in sorted([a for a in actions if isinstance(a, dict)], key=lambda a: a.get('ts', 0)):
                aid = str(a.get('id', ''))[:60]
                if not aid: continue
                if aid in self.s['seen_actions']: results.append({'id': aid, 'ok': True, 'duplicate': True}); continue
                before = copy.deepcopy(self.s)
                try:
                    ts = a.get('ts'); ts = ts / 1000 if isinstance(ts, (int, float)) and ts > 1e11 else ts
                    if not isinstance(ts, (int, float)) or ts > self.now() + 120: ts = self.now()
                    self.player_action(p, {**a, 'ts': ts}, offline=True)
                    results.append({'id': aid, 'ok': True})
                except PlayError as e:
                    self.s.clear(); self.s.update(before); results.append({'id': aid, 'ok': False, 'error': e.message})
                self.s['seen_actions'] = (self.s['seen_actions'] + [aid])[-3000:]
            self.save()
            out = self.view(key, 'player'); out['synced'] = results
            return out

    def host_action(self, data): raise PlayError('Onbekende actie.')
    def player_action(self, p, data, offline=False): raise PlayError('Onbekende actie.')

    # ------------------------------------------------------------------ view
    def connected(self, p): return self.now() - p.get('seen', 0) < 10

    def public_players(self, role):
        return [{'id': p['id'], 'name': p['name'], 'team': p.get('team'), 'connected': self.connected(p)} for p in self.s['players']]

    def view(self, key=None, role='public'):
        with self.game.lock:
            me = None
            if role == 'host': self.game.host(key)
            elif role == 'player': me = self.by_token(key); me['seen'] = self.now()
            elif role != 'public': raise PlayError('Onbekende schermrol.')
            if self.tick(): self.save()
            out = {'game': self.gid, 'title': self.title, 'phase': self.s['phase'], 'phase_id': self.phase_id(), 'code': self.s['code'],
                   'revision': self.s['revision'], 'server_time': self.now(), 'players': self.public_players(role),
                   'teams': copy.deepcopy(self.s['teams']),
                   'log': [{'at': l['at'], 'text': l['text']} for l in self.s['log'] if l['public'] or role == 'host'][-14:]}
            if self.s.get('area'): out['area'] = copy.deepcopy(self.s['area'])
            if me: out['me'] = {'id': me['id'], 'name': me['name'], 'access': me['access'], 'team': me.get('team')}
            self.extra_view(out, role, me)
            if role == 'host' and self.flash: out['flash'] = self.flash; self.flash = None
            return copy.deepcopy(out)

    def tick(self): pass
    def extra_view(self, out, role, me): pass
