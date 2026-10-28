"""Groepsspel online: dezelfde spelserver, maar met afzonderlijke spelkamers en zonder pc.

Start achter een https-proxy (bijvoorbeeld een hostingdienst met automatische certificaten):

    python server.py --online --public-url https://spel.voorbeeld.nl --port 8080 --bind 0.0.0.0 --trust-proxy

Hoe het werkt
- Iedere groep krijgt een eigen spelkamer (code van 6 tekens) met een eigen, volledig gescheiden
  speltoestand in data/kamers/<CODE>. Er is geen account nodig.
- Wie een kamer maakt, krijgt een beheercookie (HttpOnly) met de spelleidersleutel van die kamer.
  Alleen met die cookie geeft /api/bootstrap de spelleidersleutel vrij.
- Telefoons komen via /k/<CODE>/... binnen: de server zet een kamercookie en stuurt door naar de
  gewone spelpagina. Alle bestaande spelpagina's en API's werken daardoor ongewijzigd.
- Kamers die 48 uur niet gebruikt zijn, worden automatisch verwijderd. Er zijn grenzen aan het
  aantal kamers, het aantal nieuwe kamers per IP-adres, mislukte kamercodes en opslag per kamer.
"""
import json
import os
import re
import secrets
import shutil
import threading
import time
from http.cookies import SimpleCookie
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs, quote

from server import Handler, Game, GameError, ROOT, VERSION

ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
ROOM_RE = re.compile(r'[A-Z2-9]{6}')
IDLE_SECONDS = 48 * 3600
ROOM_STORAGE = 400 * 1024 * 1024
CREATE_PER_HOUR = 6
BAD_CODES_PER_10MIN = 20
PAGES = ('/spel/', '/verraders', '/shows', '/controller', '/screen', '/host', '/team', '/display')


class Rooms:
    def __init__(self, folder, packs, tasks, max_rooms):
        self.folder = Path(folder); self.folder.mkdir(parents=True, exist_ok=True)
        self.packs, self.tasks, self.max_rooms = packs, tasks, max_rooms
        self.lock = threading.Lock(); self.rooms = {}; self.used = {}
        self.created = {}; self.bad = {}
        for d in sorted(self.folder.iterdir()):
            if d.is_dir() and ROOM_RE.fullmatch(d.name) and (d / 'session.json').is_file():
                self.used[d.name] = (d / 'session.json').stat().st_mtime

    def get(self, code):
        if not code or not ROOM_RE.fullmatch(code): return None
        with self.lock:
            if code not in self.used: return None
            g = self.rooms.get(code)
            if g is None:
                g = self.rooms[code] = Game(self.folder / code, self.packs, self.tasks)
            self.used[code] = time.time()
            return g

    def create(self, ip):
        now = time.time()
        with self.lock:
            hist = [t for t in self.created.get(ip, []) if now - t < 3600]
            if len(hist) >= CREATE_PER_HOUR: raise GameError('Je hebt net al een paar spelkamers gemaakt. Probeer het over een uur opnieuw.', 429)
            if len(self.used) >= self.max_rooms: raise GameError('De spelserver is vol. Probeer het later opnieuw.', 503)
            code = None
            while not code or code in self.used: code = ''.join(secrets.choice(ALPHABET) for _ in range(6))
            g = self.rooms[code] = Game(self.folder / code, self.packs, self.tasks)
            g.s['name'] = 'Spelkamer ' + code; g._save()
            self.used[code] = now; self.created[ip] = hist + [now]
            return code, g

    def bad_code(self, ip):
        now = time.time()
        with self.lock:
            hist = [t for t in self.bad.get(ip, []) if now - t < 600] + [now]
            self.bad[ip] = hist
            return len(hist) > BAD_CODES_PER_10MIN

    def blocked(self, ip):
        now = time.time()
        with self.lock:
            return len([t for t in self.bad.get(ip, []) if now - t < 600]) > BAD_CODES_PER_10MIN

    def storage(self, code):
        total = 0
        for root, _, files in os.walk(self.folder / code):
            for f in files:
                try: total += os.path.getsize(os.path.join(root, f))
                except OSError: pass
        return total

    def cleanup(self):
        now = time.time()
        with self.lock:
            old = [c for c, t in self.used.items() if now - t > IDLE_SECONDS]
            for c in old:
                self.used.pop(c, None); self.rooms.pop(c, None)
                shutil.rmtree(self.folder / c, ignore_errors=True)
            for table in (self.created, self.bad):
                for ip in list(table):
                    table[ip] = [t for t in table[ip] if now - t < 3600]
                    if not table[ip]: del table[ip]
        return old


class OnlineHandler(Handler):
    server_version = 'Groepsspel-online'

    # --------------------------------------------------------- hulpmiddelen
    def cookies(self):
        c = SimpleCookie()
        try: c.load(self.headers.get('Cookie', ''))
        except Exception: pass
        return {k: v.value for k, v in c.items()}

    def room_code(self):
        return self.cookies().get('gs_kamer', '').upper()

    @property
    def game(self):
        g = self.server.rooms.get(self.room_code())
        if not g: raise GameError('Geen spelkamer gekozen. Scan de QR-code of open de link van de spelleider.', 404)
        return g

    def client_ip(self):
        if self.server.trust_proxy:
            fwd = self.headers.get('X-Forwarded-For', '')
            if fwd: return fwd.split(',')[0].strip()
        return self.client_address[0]

    def secure(self): return self.server.public_url.startswith('https://')

    def cookie_header(self, name, value, max_age, http_only=False):
        parts = [f'{name}={value}', 'Path=/', f'Max-Age={max_age}', 'SameSite=Lax']
        if http_only: parts.append('HttpOnly')
        if self.secure(): parts.append('Secure')
        return '; '.join(parts)

    def redirect(self, location, cookies=()):
        self.send_response(302); self.send_header('Location', location); self.send_header('Cache-Control', 'no-store')
        for c in cookies: self.send_header('Set-Cookie', c)
        self.end_headers()

    def end_headers(self):
        if self.secure(): self.send_header('Strict-Transport-Security', 'max-age=31536000')
        super().end_headers()

    def expected_origins(self):
        return [self.server.public_url.rstrip('/'), 'http://' + self.headers.get('Host', ''), 'https://' + self.headers.get('Host', '')]

    def check_host(self):
        name = self.headers.get('Host', '').rsplit(':', 1)[0].lower()
        if name in self.server.allowed_hosts: return
        raise GameError('Onbekend adres voor deze spelserver.', 403)

    def may_manage(self):
        g = self.server.rooms.get(self.room_code())
        return bool(g) and self.is_host(g)

    def is_host(self, g):
        key = self.cookies().get('gs_beheer', '')
        return bool(key) and secrets.compare_digest(key, g.s['host_key'])

    def join_base(self, code): return self.server.public_url.rstrip('/') + '/k/' + code

    def json_with_cookies(self, data, cookies, status=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status); self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Cache-Control', 'no-store')
        for c in cookies: self.send_header('Set-Cookie', c)
        self.end_headers(); self.wfile.write(body)

    # ------------------------------------------------------------------ GET
    def do_GET(self):
        split = urlsplit(self.path); path = split.path; query = parse_qs(split.query)
        try:
            self.check_host()
            if path in ('/', '/kamer', '/online.js'):
                return self.send_web('online.html' if path != '/online.js' else 'online.js')
            if path == '/api/ping':
                g = self.server.rooms.get(self.room_code())
                return self.json_response({'time': time.time(), 'product': 'groepsspel', 'version': VERSION, 'online': True, 'room': self.room_code() if g else None})
            if path == '/api/kamer':
                code = self.room_code(); g = self.server.rooms.get(code)
                if not g: return self.json_response({'room': None})
                games = {gid: {'title': pg.title, 'phase': pg.s['phase'], 'players': len(pg.s['players'])} for gid, pg in g.games.items()}
                games['verraden'] = {'title': 'Het Verraad', 'phase': g.traitors.s.get('phase', 'lobby'), 'players': len(g.traitors.s.get('players', []))}
                out = {'room': code, 'host': self.is_host(g), 'join': self.join_base(code), 'games': games}
                if out['host']: out['beheer'] = self.join_base(code) + '?beheer=' + g.s['host_key']
                return self.json_response(out)
            m = re.fullmatch(r'/k/([A-Za-z0-9]{6})(/.*)?', path)
            if m:
                ip = self.client_ip()
                if self.server.rooms.blocked(ip): raise GameError('Te veel onjuiste kamercodes. Wacht tien minuten.', 429)
                code = m[1].upper(); g = self.server.rooms.get(code)
                if not g:
                    self.server.rooms.bad_code(ip)
                    return self.redirect('/?fout=kamer')
                cookies = [self.cookie_header('gs_kamer', code, IDLE_SECONDS)]
                beheer = query.get('beheer', [''])[0]
                if beheer and secrets.compare_digest(beheer, g.s['host_key']):
                    cookies.append(self.cookie_header('gs_beheer', beheer, IDLE_SECONDS, http_only=True))
                rest = m[2] or '/kamer'
                if not rest.startswith('/') or rest.startswith('//') or rest.startswith('/k/'): rest = '/kamer'
                q = '&'.join(f'{k}={quote(v[0])}' for k, v in query.items() if k != 'beheer')
                return self.redirect(rest + ('?' + q if q else ''), cookies)
            if path == '/api/bootstrap':
                g = self.game
                if not self.is_host(g): raise GameError('Alleen de spelleider van deze kamer kan het spel beheren. Open de beheerlink op dit apparaat.', 403)
                return self.json_response({'host_key': g.s['host_key'], 'urls': [self.join_base(self.room_code())]})
            if path == '/api/export' or path.startswith('/media/') or path.startswith('/api/') or path.startswith('/show-audio/'):
                pass
            elif path.startswith(PAGES) and not self.server.rooms.get(self.room_code()):
                return self.redirect('/?terug=' + quote(path))
            return super().do_GET()
        except GameError as e: self.json_response({'error': e.message}, e.status)
        except (BrokenPipeError, ConnectionResetError): pass

    # ----------------------------------------------------------------- POST
    def do_POST(self):
        path = urlsplit(self.path).path
        try:
            self.check_host()
            origin = self.headers.get('Origin')
            if origin and origin not in self.expected_origins(): raise GameError('Verzoek vanaf een andere website geweigerd.', 403)
            if path == '/api/kamer/nieuw':
                code, g = self.server.rooms.create(self.client_ip())
                cookies = [self.cookie_header('gs_kamer', code, IDLE_SECONDS), self.cookie_header('gs_beheer', g.s['host_key'], IDLE_SECONDS, http_only=True)]
                return self.json_with_cookies({'room': code, 'join': self.join_base(code), 'beheer': self.join_base(code) + '?beheer=' + g.s['host_key']}, cookies)
            if path == '/api/kamer/verlaten':
                return self.json_with_cookies({'left': True}, [self.cookie_header('gs_kamer', '', 0), self.cookie_header('gs_beheer', '', 0, http_only=True)])
            if path == '/api/desktop-stop': raise GameError('Niet beschikbaar op de online spelserver.', 403)
            if path.endswith('/upload') or path == '/api/show/upload':
                code = self.room_code()
                if self.server.rooms.get(code) and self.server.rooms.storage(code) > ROOM_STORAGE:
                    raise GameError('De opslag van deze spelkamer is vol (400 MB). Verwijder oude spellen of start een nieuwe kamer.', 413)
            return super().do_POST()
        except GameError as e: self.json_response({'error': e.message}, e.status)
        except (BrokenPipeError, ConnectionResetError): pass


def serve(args):
    public = (args.public_url or f'http://localhost:{args.port}').rstrip('/')
    if not re.fullmatch(r'https?://[A-Za-z0-9.\-]+(:\d+)?', public): raise SystemExit('Gebruik --public-url zoals https://spel.voorbeeld.nl')
    packs = json.loads((ROOT / 'questions.json').read_text('utf-8')); tasks = json.loads((ROOT / 'tasks.json').read_text('utf-8'))
    httpd = ThreadingHTTPServer((args.bind, args.port), OnlineHandler); httpd.daemon_threads = True
    httpd.rooms = Rooms(Path(args.data) / 'kamers', packs, tasks, args.max_rooms)
    httpd.public_url = public; httpd.trust_proxy = args.trust_proxy; httpd.lan_urls = []
    httpd.allowed_hosts = {urlsplit(public).hostname.lower(), 'localhost', '127.0.0.1'}
    def janitor():
        while True:
            time.sleep(600)
            try: httpd.rooms.cleanup()
            except Exception: pass
    threading.Thread(target=janitor, daemon=True).start()
    print(f'\nGROEPSSPEL ONLINE {VERSION}\nAdres: {public}\nKamers: {len(httpd.rooms.used)} bewaard · maximaal {args.max_rooms}\n', flush=True)
    try: httpd.serve_forever()
    except KeyboardInterrupt: pass
    finally: httpd.server_close()
