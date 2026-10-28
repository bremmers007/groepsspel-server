"""Supervised Windows startup, also valid with Python's isolated embed runtime."""
import argparse
import ctypes
import json
import os
from pathlib import Path
import queue
import re
import shutil
import signal
import subprocess
import threading
import sys
import time
import traceback
import urllib.request
import webbrowser

APP_VERSION = '0.15.0'
APP_DIR = Path(__file__).resolve().parent
# Embedded Python ignores script directories, PYTHONPATH and the working directory.
# Trust only the installed app directory; never rely on the shortcut's working folder.
sys.path.insert(0, str(APP_DIR))
PORT = 8765
URL = f'http://127.0.0.1:{PORT}'
# Loopback must bypass corporate/system HTTP proxies, including when offline.
HTTP = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def data_dir():
    return Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / 'Groepsspel'


def log(message):
    folder = data_dir()
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / 'startup.log'
    if path.exists() and path.stat().st_size > 500_000:
        path.replace(folder / 'startup.previous.log')
    with path.open('a', encoding='utf-8') as stream:
        stream.write(time.strftime('%Y-%m-%d %H:%M:%S ') + message + '\n')


def request(path, payload=None, key=None):
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {'Content-Type': 'application/json'} if data else {}
    if key:
        headers['Authorization'] = 'Bearer ' + key
    req = urllib.request.Request(URL + path, data, headers=headers)
    with HTTP.open(req, timeout=.5) as response:
        return json.load(response)


def alive():
    try:
        return request('/api/ping').get('product') == 'groepsspel'
    except Exception:
        return False


def stop():
    stop_mobile()
    if not alive():
        return
    key = request('/api/bootstrap')['host_key']
    request('/api/desktop-stop', {}, key)
    for _ in range(30):
        if not alive():
            return
        time.sleep(.1)
    raise RuntimeError('De vorige spelserver sluit niet af. Start Windows opnieuw en probeer nogmaals.')


def open_app(url=None):
    url = url or URL + '/app/#shows'
    if sys.platform == 'win32':
        roots = [os.environ.get(name) for name in ('PROGRAMFILES(X86)', 'PROGRAMFILES', 'LOCALAPPDATA')]
        for suffix in ('Microsoft/Edge/Application/msedge.exe', 'Google/Chrome/Application/chrome.exe'):
            for root in filter(None, roots):
                browser = Path(root) / suffix
                if browser.is_file():
                    try:
                        subprocess.Popen([str(browser), '--app=' + url, '--new-window'], creationflags=0x08000000)
                        return
                    except OSError:
                        continue
    if not webbrowser.open(url):
        raise RuntimeError('Geen browser geopend. Open Edge of Chrome en ga naar ' + url)


def load_host():
    # Keep local imports inside error handling: missing/corrupt files must be reported.
    import server
    return server


def validate_app():
    host = load_host()
    for name in ('questions.json', 'tasks.json', 'show-content.json', 'show_engine.py', 'missions.json', 'bingo-songs.json', 'online.py', 'pwa/index.html', 'pwa/app.js', 'pwa/gs-shell.js', 'pwa/question-pool.js', 'murder-scenarios.json', 'web/games.js'):
        if not (APP_DIR / name).is_file():
            raise RuntimeError('Installatie is onvolledig: ' + name + '. Installeer Groepsspel opnieuw.')
    packs = json.loads((APP_DIR / 'questions.json').read_text('utf-8'))
    tasks = json.loads((APP_DIR / 'tasks.json').read_text('utf-8'))
    return host, packs, tasks


def serve():
    host, packs, tasks = validate_app()
    server = host.ThreadingHTTPServer(('0.0.0.0', PORT), host.Handler)
    try:
        server.daemon_threads = True
        server.game = host.Game(data_dir() / 'data', packs, tasks)
        server.lan_urls = host.local_addresses(PORT)
        log('Spelserver gereed op ' + URL)
        server.serve_forever()
    finally:
        server.server_close()


def launch():
    if alive():
        log('Bestaande spelserver openen')
        open_app()
        return
    validate_app()
    executable = Path(sys.executable)
    if sys.platform == 'win32':
        executable = executable.with_name('pythonw.exe')
    flags = 0x08000000 if sys.platform == 'win32' else 0
    log('Groepsspel ' + APP_VERSION + ' starten')
    child = subprocess.Popen([str(executable), '-I', '-S', '-X', 'utf8', str(APP_DIR / 'desktop.py'), '--serve', '--port', str(PORT)], cwd=APP_DIR, creationflags=flags, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    deadline = time.monotonic() + 12
    while time.monotonic() < deadline:
        if alive():
            log('Server bereikbaar; appvenster openen')
            open_app()
            return
        if child.poll() is not None:
            # Another simultaneous launcher may already own the server port.
            if alive():
                open_app()
                return
            raise RuntimeError('De spelserver stopte tijdens het starten. Zie startup.log voor de oorzaak.')
        time.sleep(.15)
    child.terminate()
    raise RuntimeError('De spelserver is niet binnen 12 seconden bereikbaar. Controleer of poort ' + str(PORT) + ' vrij is. Zie startup.log.')


# ---------------------------------------------------------------- mobiel internet
# Een Cloudflare-tunnel geeft deze pc een tijdelijk https-adres. De spelserver draait dan in de online
# stand (spelkamers) op een eigen poort, zodat telefoons via hun eigen 4G/5G kunnen meedoen.
MOBILE_PORT = 8766


def mobile_state():
    return data_dir() / 'mobiel.json'


def cloudflared_path():
    env = os.environ.get('GROEPSSPEL_CLOUDFLARED')
    if env:
        return Path(env)
    exe = APP_DIR / 'tools' / ('cloudflared.exe' if sys.platform == 'win32' else 'cloudflared')
    if exe.is_file():
        return exe
    found = shutil.which('cloudflared')
    if found:
        return Path(found)
    raise RuntimeError('Het tunnelprogramma (cloudflared) ontbreekt. Installeer Groepsspel opnieuw.')


def kill(pid):
    if not pid or pid == os.getpid():
        return
    if sys.platform == 'win32':
        subprocess.run(['taskkill', '/PID', str(pid), '/T', '/F'], creationflags=0x08000000, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        try:
            os.kill(pid, signal.SIGTERM)
        except OSError:
            pass


def stop_mobile():
    state = mobile_state()
    if not state.is_file():
        return
    try:
        info = json.loads(state.read_text('utf-8'))
    except (OSError, ValueError):
        info = {}
    try:
        state.unlink()
    except OSError:
        pass
    for key in ('server', 'tunnel', 'supervisor'):
        kill(info.get(key))
    log('Spelen via mobiel internet gestopt')


def serve_online(url):
    import online
    validate_app()
    folder = data_dir() / 'mobiel'
    args = argparse.Namespace(public_url=url, port=MOBILE_PORT, bind='127.0.0.1', data=str(folder), max_rooms=20, trust_proxy=True)
    online.serve(args)


def reachable(url, timeout=2.0):
    try:
        with HTTP.open(url + '/api/ping', timeout=timeout) as response:
            return json.load(response).get('online') is True
    except Exception:
        return False


def mobile():
    validate_app()
    stop_mobile()
    flags = 0x08000000 if sys.platform == 'win32' else 0
    folder = data_dir(); folder.mkdir(parents=True, exist_ok=True)
    tunnel_log = (folder / 'tunnel.log').open('w', encoding='utf-8')
    log('Tunnel starten voor spelen via mobiel internet')
    tunnel = subprocess.Popen([str(cloudflared_path()), 'tunnel', '--no-autoupdate', '--url', f'http://127.0.0.1:{MOBILE_PORT}'],
                              stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, creationflags=flags,
                              text=True, encoding='utf-8', errors='replace')
    lines = queue.Queue()

    def pump():
        for line in tunnel.stdout:
            tunnel_log.write(line); tunnel_log.flush(); lines.put(line)
    threading.Thread(target=pump, daemon=True).start()
    url = None; deadline = time.monotonic() + 45
    while url is None and time.monotonic() < deadline:
        try:
            line = lines.get(timeout=.5)
        except queue.Empty:
            if tunnel.poll() is not None:
                break
            continue
        match = re.search(r'https://[a-z0-9-]+\.trycloudflare\.com', line)
        if match:
            url = match.group(0)
    if not url:
        kill(tunnel.pid)
        raise RuntimeError('Er kon geen tunnel worden gemaakt. Heeft deze pc internet? Details staan in tunnel.log.')
    executable = Path(sys.executable)
    if sys.platform == 'win32':
        executable = executable.with_name('pythonw.exe')
    server = subprocess.Popen([str(executable), '-I', '-S', '-X', 'utf8', str(APP_DIR / 'desktop.py'), '--serve-online', url],
                              cwd=APP_DIR, creationflags=flags, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    mobile_state().write_text(json.dumps({'supervisor': os.getpid(), 'tunnel': tunnel.pid, 'server': server.pid, 'url': url}), 'utf-8')
    (folder / 'mobiel-adres.txt').write_text(url + '\n', 'utf-8')
    local = f'http://127.0.0.1:{MOBILE_PORT}'
    for _ in range(80):
        if reachable(local, .5) or server.poll() is not None:
            break
        time.sleep(.15)
    if server.poll() is not None:
        kill(tunnel.pid)
        raise RuntimeError(f'De online spelserver startte niet. Is poort {MOBILE_PORT} vrij? Zie startup.log.')
    # Een nieuw tunneladres is soms pas na enkele seconden overal bekend.
    wait = float(os.environ.get('GROEPSSPEL_TUNNEL_WAIT', '60'))
    end = time.monotonic() + wait
    while time.monotonic() < end and not reachable(url):
        time.sleep(2)
    log('Mobiel internet actief op ' + url)
    open_app(url + '/')
    while tunnel.poll() is None and server.poll() is None:
        if not mobile_state().is_file():
            break
        time.sleep(2)
    stopped_by_user = not mobile_state().is_file()
    kill(server.pid); kill(tunnel.pid)
    if not stopped_by_user:
        try:
            mobile_state().unlink()
        except OSError:
            pass
        raise RuntimeError('Spelen via mobiel internet is gestopt: ' + ('de tunnel viel weg.' if tunnel.poll() is not None else 'de spelserver stopte.') + ' Start opnieuw via het Startmenu.')


def main():
    global PORT, URL
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--stop', action='store_true')
    mode.add_argument('--serve', action='store_true')
    mode.add_argument('--diagnose', action='store_true')
    mode.add_argument('--mobiel', action='store_true', help='Spelen via mobiel internet (tunnel + spelkamers)')
    mode.add_argument('--serve-online', metavar='URL')
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    PORT = args.port
    URL = f'http://127.0.0.1:{PORT}'
    if args.stop:
        stop()
    elif args.serve:
        serve()
    elif args.mobiel:
        mobile()
    elif args.serve_online:
        serve_online(args.serve_online)
    elif args.diagnose:
        validate_app()
        print('Groepsspel ' + APP_VERSION + ': appbestanden en server-import in orde. Log: ' + str(data_dir() / 'startup.log'))
    else:
        launch()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        detail = traceback.format_exc()
        try:
            log(detail)
            (data_dir() / 'start-error.txt').write_text(detail, encoding='utf-8')
        except OSError:
            pass
        message = str(error) + '\n\nLogbestand: ' + str(data_dir() / 'startup.log')
        if sys.stderr is not None:
            print(message, file=sys.stderr)
        # The installer launcher displays console-process errors itself. A windowless
        # server has no stderr and must display a message of its own.
        elif sys.platform == 'win32':
            ctypes.windll.user32.MessageBoxW(None, message, 'Groepsspel kon niet starten', 0x10)
        sys.exit(1)
