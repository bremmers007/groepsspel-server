"""Gekke 88: teams kiezen zelf opdrachten en sturen tekst, foto of video als bewijs.

Bewijs zonder wifi blijft op de telefoon staan en wordt verstuurd zodra de server
bereikbaar is. Elke inzending heeft een eigen ID, zodat een tweede poging niet dubbel telt.
"""
import uuid
from games_base import PhoneGame, PlayError, load_json
from evidence import validate, view_for

MEDIA = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm', 'video/3gpp': '.3gp'}
MAX_MEDIA = 40 * 1024 * 1024


class CrazyGame(PhoneGame):
    gid = 'crazy88'
    title = 'Gekke 88'
    teams_fixed = 'free'
    min_players = 2
    max_players = 60
    late_join = True
    stale_check = False

    def __init__(self, game, rng=None, tasks=None):
        self.tasks = tasks or load_json('crazy88-tasks.json')
        super().__init__(game, rng)

    def blank_extra(self):
        return {'minutes': 120, 'ends_at': None, 'subs': {}, 'bonus': {}, 'evidence': {'mode': 'app', 'link': ''}}

    def active_tasks(self):
        f = self.s.get('filters') or {}
        if not f: return self.tasks
        need_rank = {'niets': 0, 'papier': 1, 'spullen': 2}; allow = {'niets': 0, 'papier': 1, 'alles': 2}[f.get('needs', 'alles')]
        return [t for t in self.tasks if (f.get('where', 'overal') == 'overal' or t.get('where', 'overal') in ('overal', f['where']))
                and need_rank.get(t.get('needs', 'niets'), 0) <= allow and t.get('minutes', 5) <= f.get('max_minutes', 10)
                and t.get('age', 6) <= f.get('age', 12)]

    def task(self, tid):
        t = next((t for t in self.active_tasks() if t['id'] == tid), None)
        if not t: raise PlayError('Onbekende opdracht.')
        return t

    def media_dir(self):
        d = self.game.directory / 'spel-media'; d.mkdir(exist_ok=True); return d

    # ---------------------------------------------------------------- spelleider
    def host_action(self, data):
        s = self.s; act = data.get('action'); ph = s['phase']
        if act == 'settings':
            if ph != 'lobby': raise PlayError('Instellingen alleen in de lobby.')
            m = data.get('minutes', 120)
            if type(m) is not int or not 30 <= m <= 480: raise PlayError('Kies 30 tot 480 minuten.')
            s['minutes'] = m
            s['evidence'] = validate(data.get('evidence_mode', s.get('evidence', {}).get('mode', 'app')), data.get('evidence_link', s.get('evidence', {}).get('link', '')))
            # 0.14: filters op plek, benodigdheden, duur per opdracht en leeftijd van de jongste speler
            f = data.get('filters', s.get('filters') or {})
            if not isinstance(f, dict): raise PlayError('Ongeldige filters.')
            where = f.get('where', 'overal'); needs = f.get('needs', 'alles'); maxmin = f.get('max_minutes', 10); age = f.get('age', 12)
            if where not in ('overal', 'binnen', 'buiten') or needs not in ('niets', 'papier', 'alles') or maxmin not in (3, 5, 10) or age not in (6, 8, 10, 12):
                raise PlayError('Ongeldige filters.')
            s['filters'] = {'where': where, 'needs': needs, 'max_minutes': maxmin, 'age': age}
            if len(self.active_tasks()) < 20: raise PlayError('Met deze filters blijven er minder dan 20 opdrachten over. Kies ruimer.')
        elif act == 'evidence':
            s['evidence'] = validate(data.get('mode', s.get('evidence', {}).get('mode', 'app')), data.get('link', s.get('evidence', {}).get('link', '')))
        elif act == 'add_team':
            name = str(data.get('name', '')).strip()[:30]
            if not name or any(t['name'].casefold() == name.casefold() for t in s['teams']): raise PlayError('Kies een unieke teamnaam.')
            s['teams'].append({'id': 't' + str(len(s['teams']) + 1), 'name': name})
        elif act == 'start':
            if ph != 'lobby': raise PlayError('Het spel loopt al.')
            if len([t for t in s['teams'] if self.team_players(t['id'])]) < 1: raise PlayError('Er is nog geen team met spelers.')
            if any(not p.get('team') for p in s['players']): raise PlayError('Iedereen moet eerst in een team zitten.')
            s['ends_at'] = self.now() + s['minutes'] * 60; s['started_at'] = self.now()
            self.set_phase('play'); self.log('Gekke 88 is begonnen!')
        elif act == 'grade':
            sub = s['subs'].get(data.get('id'))
            if not sub: raise PlayError('Inzending niet gevonden.')
            if sub['status'] == 'approved' and data.get('approve'): raise PlayError('Al goedgekeurd.')
            task = self.task(sub['task']); approve = data.get('approve') is True
            pts = data.get('points', task['points'])
            if type(pts) is not int or not 0 <= pts <= task['points'] + 3: raise PlayError('Ongeldig puntenaantal.')
            if approve and any(x['team'] == sub['team'] and x['task'] == sub['task'] and x['status'] == 'approved' for x in s['subs'].values()):
                raise PlayError('Dit team heeft deze opdracht al goedgekeurd gekregen.')
            sub.update(status='approved' if approve else 'rejected', points=pts if approve else 0, note=str(data.get('note', ''))[:200],
                       wall=bool(data.get('wall', True)) and approve)
            if approve: self.log(f"{self.name(sub['team'])}: opdracht {task['n']} goedgekeurd (+{pts}).")
        elif act == 'bonus':
            team = self.team(data.get('team')); pts = data.get('points')
            if not team or type(pts) is not int or not -50 <= pts <= 50: raise PlayError('Ongeldige bonus.')
            s['bonus'][team['id']] = s['bonus'].get(team['id'], 0) + pts
            self.log(f"Bonus voor {team['name']}: {pts:+d}.")
        elif act == 'extend':
            if ph != 'play': raise PlayError('Het spel loopt niet.')
            s['ends_at'] = max(s['ends_at'], self.now()) + 15 * 60
        elif act == 'finish':
            if ph != 'play': raise PlayError('Het spel loopt niet.')
            self.set_phase('end'); self.log('Tijd! De uitslag is bekend.')
        else:
            raise PlayError('Onbekende actie.')

    def tick(self):
        # Na de eindtijd blijven inzendingen welkom; de spelleider sluit af met 'Uitslag'.
        return False

    # -------------------------------------------------------------- spelers
    def check_submit(self, p, task_id, sid, ts):
        s = self.s
        if s['phase'] != 'play': raise PlayError('Er kunnen nu geen inzendingen bij.')
        if not p.get('team'): raise PlayError('Je zit nog niet in een team.')
        try: uuid.UUID(str(sid))
        except ValueError: raise PlayError('Ongeldig inzendnummer.')
        self.task(task_id)
        if s['ends_at'] and ts and ts > s['ends_at'] + 60: raise PlayError('Deze inzending is na de eindtijd gemaakt.')
        if any(x['team'] == p['team'] and x['task'] == task_id and x['status'] in ('pending', 'approved') and x['id'] != sid for x in s['subs'].values()):
            raise PlayError('Voor deze opdracht ligt al bewijs van jullie team klaar.')

    def player_action(self, p, data, offline=False):
        act = data.get('action')
        if act != 'submit': raise PlayError('Onbekende actie.')
        sid = str(data.get('sid', '')); task_id = data.get('task'); ts = data.get('ts') or self.now()
        if sid in self.s['subs']: return
        self.check_submit(p, task_id, sid, ts)
        via_whatsapp = data.get('via_whatsapp') is True
        if via_whatsapp and (self.s.get('evidence') or {}).get('mode') not in ('whatsapp', 'both'):
            raise PlayError('WhatsApp-bewijs is niet ingeschakeld voor deze sessie.')
        text = str(data.get('text', '')).strip()[:1500]
        if via_whatsapp:
            # 0.14.3: een korte meldcode die het team bij de foto in WhatsApp zet, zodat de spelleider hem direct vindt
            code = self.whatsapp_code(p['team'], task_id)
            self.add_sub(p, sid, task_id, text or 'Bewijs staat in de WhatsApp-groep.', None, None, ts)
            self.s['subs'][sid].update(via_whatsapp=True, code=code)
            return
        if not text: raise PlayError('Schrijf jullie antwoord of voeg een foto of video toe.')
        self.add_sub(p, sid, task_id, text, None, None, ts)

    def whatsapp_code(self, team_id, task_id):
        import re, unicodedata
        name = re.sub(r'[^A-Z0-9]', '', unicodedata.normalize('NFKD', self.name(team_id).upper()))[:5] or str(team_id).upper()
        return f"{name}-{self.task(task_id)['n']}"

    def add_sub(self, p, sid, task_id, text, media, mime, ts):
        self.s['subs'][sid] = {'id': sid, 'team': p['team'], 'by': p['id'], 'task': task_id, 'text': text, 'media': media, 'mime': mime,
                               'status': 'pending', 'points': 0, 'note': '', 'ts': ts, 'at': self.now(), 'wall': False}

    def upload(self, key, headers, raw):
        """Rauwe upload van foto of video (header X-Task, X-Submission, X-Text, X-Ts)."""
        with self.game.lock:
            p = self.by_token(key); p['seen'] = self.now()
            if (self.s.get('evidence') or {}).get('mode') == 'whatsapp':
                raise PlayError('In dit spel gaan foto\'s en video\'s via de WhatsApp-groep. Meld de opdracht hier aan met "Bewijs staat in WhatsApp".')
            mime = headers.get('Content-Type', '').split(';')[0].strip().lower()
            if mime not in MEDIA: raise PlayError('Gebruik een foto (JPG/PNG) of video (MP4/MOV/WEBM).')
            if not 0 < len(raw) <= MAX_MEDIA: raise PlayError('Bestand is leeg of groter dan 40 MB. Neem een kortere video op.', 413)
            sid = headers.get('X-Submission', ''); task_id = headers.get('X-Task', '')
            if sid in self.s['subs']: return {'saved': True, 'duplicate': True}
            try: ts = float(headers.get('X-Ts', '0')) / 1000 or self.now()
            except ValueError: ts = self.now()
            self.check_submit(p, task_id, sid, ts)
            if mime.startswith('image/') and not (raw[:3] == b'\xff\xd8\xff' or raw[:8] == b'\x89PNG\r\n\x1a\n' or raw[8:12] == b'WEBP'): raise PlayError('Ongeldige afbeelding.')
            media = str(uuid.uuid4()) + MEDIA[mime]
            (self.media_dir() / media).write_bytes(raw)
            from urllib.parse import unquote
            text = unquote(headers.get('X-Text', ''))[:1500]
            self.add_sub(p, sid, task_id, text, media, mime, ts)
            self.save(); return {'saved': True}

    def media_allowed(self, name, key, host_ok):
        """Host ziet alles; team ziet eigen bewijs; publiek alleen goedgekeurde fotomuur."""
        sub = next((x for x in self.s['subs'].values() if x['media'] == name), None)
        if not sub: return None
        if host_ok: return sub
        if key:
            try:
                p = self.by_token(key)
                if p.get('team') == sub['team']: return sub
            except PlayError: pass
        return sub if sub['wall'] else None

    # ------------------------------------------------------------------ view
    def result_scores(self):
        return {t['id']: self.team_score(t['id']) for t in self.s['teams'] if self.team_players(t['id'])}

    def team_score(self, tid):
        return sum(x['points'] for x in self.s['subs'].values() if x['team'] == tid and x['status'] == 'approved') + self.s['bonus'].get(tid, 0)

    def extra_view(self, out, role, me):
        s = self.s
        out['settings'] = {'minutes': s['minutes']}; out['ends_at'] = s['ends_at']
        out['evidence'] = view_for(s.get('evidence'), role)
        out['tasks'] = self.active_tasks(); out['filters'] = self.s.get('filters') or {}
        out['board'] = sorted([{'team': t['id'], 'name': t['name'], 'score': self.team_score(t['id']),
                                'done': sum(1 for x in s['subs'].values() if x['team'] == t['id'] and x['status'] == 'approved'),
                                'pending': sum(1 for x in s['subs'].values() if x['team'] == t['id'] and x['status'] == 'pending')} for t in s['teams']],
                              key=lambda r: -r['score'])
        wall = [x for x in s['subs'].values() if x['wall'] and x['media'] and x['mime'].startswith('image/')]
        out['wall'] = [{'media': x['media'], 'team': self.name(x['team']), 'task': self.task(x['task'])['text']} for x in sorted(wall, key=lambda x: -x['at'])[:12]]
        if role == 'host':
            out['subs'] = sorted([{**x, 'team_name': self.name(x['team']), 'by_name': self.name(x['by']), 'task_text': self.task(x['task'])['text'], 'task_n': self.task(x['task'])['n'], 'max': self.task(x['task'])['points']}
                                  for x in s['subs'].values()], key=lambda x: (x['status'] != 'pending', x['at']))
        if me and me.get('team'):
            out['me']['subs'] = {x['task']: {'status': x['status'], 'points': x['points'], 'note': x['note'], 'id': x['id']}
                                 for x in sorted(s['subs'].values(), key=lambda x: x['at']) if x['team'] == me['team']}
            out['me']['team_name'] = self.name(me['team'])
