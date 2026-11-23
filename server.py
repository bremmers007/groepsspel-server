"""Groepsspel local host. Python standard library only; no internet needed for play."""
from html import escape
import argparse, base64, copy, ipaddress, json, mimetypes, os, secrets, socket, threading, time, uuid, webbrowser, unicodedata, random, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from show_engine import PhoneShow, ShowError
from traitors_engine import Traitors, TraitorsError
from games_base import PlayError
import i18n
from evidence import validate as validate_evidence, view_for as evidence_view
from murder_engine import MurderGame
from stratego_engine import StrategoGame
from holland_engine import HollandGame
from crazy_engine import CrazyGame, MAX_MEDIA
from smuggle_engine import SmuggleGame
from missions_engine import MissionsGame
from hunted_engine import HuntedGame
from bingo_engine import BingoGame
import re
PHASE_NL={'play':'bezig','setup':'voorbereiding','intro':'uitleg','show':'onthulling','day':'dagfase','night':'nachtfase','table':'ronde tafel','vote':'stemmen','reveal':'onthulling','banish':'verbanning','mission':'opdracht','morning':'ochtend','endgame':'eindspel'}
GAME_CLASSES=(MurderGame,StrategoGame,HollandGame,CrazyGame,SmuggleGame,MissionsGame,HuntedGame,BingoGame)
ROOT = Path(__file__).resolve().parent
VERSION='0.21.0'
SHOW_THEMES = {'year': 'Terug in de tijd', 'holland': 'Oerhollands', 'pubquiz': 'Pubquiz', 'friends': 'Vriendenquiz'}
_SHARED={}
def shared_json(name):
    """Grote inhoudsbestanden één keer inlezen; de spellen kopiëren wat ze trekken."""
    if name not in _SHARED: _SHARED[name]=json.loads((ROOT/name).read_text('utf-8'))
    return _SHARED[name]

class GameError(Exception):
    def __init__(self, message, status=400): self.message, self.status = message, status

def clean_text(value, limit=500):
    if not isinstance(value, str): raise GameError('Ongeldige tekst.')
    return value.strip()[:limit]

def normalized(value):
    return ' '.join(''.join(c for c in unicodedata.normalize('NFKD',str(value)).casefold() if not unicodedata.combining(c) and (c.isalnum() or c.isspace())).split())

def time_show_years():
    return sorted(int(year) for year, questions in shared_json('time-show-questions.json').items()
                  if len(questions) >= 4)


def themed_show_questions(theme, year):
    if theme == 'holland':
        return shared_json('holland-show-questions.json')
    if type(year) is not int or year not in time_show_years():
        raise GameError('Kies een geldig jaar voor Terug in de tijd.')
    bank = shared_json('time-show-questions.json')
    decade = year // 10
    return [q for key, questions in bank.items() if int(key) // 10 == decade for q in questions]


def validate_questions(items):
    if not isinstance(items,list) or not 1<=len(items)<=5000: raise GameError('Gebruik 1 tot 5000 vragen in een vragenbank.')
    result=[]
    for q in items:
        if not isinstance(q,dict): raise GameError('Ongeldige vraag.')
        text=clean_text(q.get('q'),500)
        if not text: raise GameError('Vul de vraag in.')
        out={'q':text,'category':clean_text(q.get('category','Quiz'),100)}
        if q.get('options') is not None:
            options=q.get('options'); correct=q.get('correct')
            if not isinstance(options,list) or len(options)!=4 or type(correct) is not int or not 0<=correct<=3: raise GameError('Gebruik vier opties en correct 0 t/m 3.')
            options=[clean_text(x,200) for x in options]
            if not all(options): raise GameError('Vul alle opties in.')
            out.update(options=options,correct=correct)
            image = q.get('image')
            if image:
                if not isinstance(image, str) or len(image) > 180000:
                    raise GameError('Gebruik een vraagfoto kleiner dan 135 kB.')
                match = re.fullmatch(r'data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)', image)
                if not match:
                    raise GameError('Voeg de vraagfoto toe als JPEG, PNG of WebP.')
                try: binary = base64.b64decode(match[2], validate=True)
                except ValueError: raise GameError('De vraagfoto is ongeldig.')
                kind = match[1]
                valid = (binary.startswith(b'\xff\xd8\xff') if kind == 'jpeg' else
                         binary.startswith(b'\x89PNG\r\n\x1a\n') if kind == 'png' else
                         binary.startswith(b'RIFF') and binary[8:12] == b'WEBP')
                if not valid: raise GameError('De inhoud van de vraagfoto klopt niet met het type.')
                out['image'] = image
        else:
            answers=q.get('answers',[q.get('answer','')])
            if not isinstance(answers,list) or not 1<=len(answers)<=20: raise GameError('Gebruik één antwoord of maximaal twintig schrijfwijzen.')
            answers=[clean_text(x,200) for x in answers]
            if not all(normalized(x) for x in answers): raise GameError('Vul een juist antwoord in.')
            out.update(answers=answers,kind='text')
        result.append(out)
    return result

def word_deck():
    words=['Eiffeltoren','Bitterbal','Harry Potter','Afstandsbediening','Camping','Albert Einstein','Sinterklaas','Voetbal','Venetië','Tandenborstel','Beyoncé','Las Vegas','Pannenkoek','Olympische Spelen','Dinosaurus','Karaoke','Rembrandt','Parachute','Netflix','Tulp','Sherlock Holmes','Amsterdam','Pizza','Brandweerman','Gitaar','Mona Lisa','Safari','Koning','Sneeuwpop','Bowling','Titanic','Fietsbel','Spaghetti','Formule 1','Bibliotheek','Tennis','Superman','Strand','Robot','Monopoly','Chocolade','Sydney','Vliegveld','DJ','Schaatsen','Jungle','Kerstboom','Zonnebril','Dracula','Drumstel','Olifant','Parijs','Piraat','Museum','Popcorn','Mickey Mouse','Regenboog','Waterfiets','Heksenketel','Discobal','Astronaut','Amsterdam Arena','Hawaii','Kasteel','Supermarkt','Dolfijn','Rugzak','Treinconducteur','Cappuccino','Zandkasteel','Spiderman','Berlijn','Piano','Campingstoel','Sushi','Ridder','Circus','Televisie','Flessenpost','IJsbeer','Hogwarts','Parasol','Schaakmat','Reuzenrad','Leeuw','Boemerang','Taco','Londen','Microfoon','Politieagent','Vulkaan','Zwembad','Wasmachine','Toren van Pisa','Krokodil','Koptelefoon','Wandelstok','Sprookjesbos','Hamburger','Noorderlicht']
    random.shuffle(words)
    return [{'q':'Omschrijf vijf woorden zonder het woord zelf te noemen.','category':'Halve Minuut · eigen woorden','words':words[i:i+5]} for i in range(0,len(words),5)]

def pick_tasks(tasks, count):
    """0.15.1: een gemengde selectie uit de opdrachtenbank (puzzels, foto- en tekstopdrachten om en om)."""
    if not count or count>=len(tasks): return tasks
    groups=[[t for t in tasks if t.get('solution')],[t for t in tasks if not t.get('solution') and t['kind']=='photo'],[t for t in tasks if not t.get('solution') and t['kind']!='photo']]
    for g in groups: random.shuffle(g)
    chosen=[]
    while len(chosen)<count:
        for g in groups:
            if g and len(chosen)<count: chosen.append(g.pop())
    order={t['id']:i for i,t in enumerate(tasks)}
    return sorted(chosen,key=lambda t:order[t['id']])

def validate_tasks(items):
    if not isinstance(items,list) or not 1<=len(items)<=50: raise GameError('Gebruik 1 tot 50 opdrachten.')
    out=[]
    for i,t in enumerate(items):
        if not isinstance(t,dict): raise GameError('Ongeldige opdracht.')
        points=t.get('points',5)
        if type(points) is not int or not 1<=points<=100: raise GameError('Punten moeten tussen 1 en 100 liggen.')
        title=clean_text(t.get('title',''),100); prompt=clean_text(t.get('prompt',''),1500)
        if not title or not prompt: raise GameError('Vul titel en opdracht in.')
        task_id=clean_text(t.get('id',str(i+1)),50)
        if not task_id or any(x['id']==task_id for x in out): raise GameError('Opdrachten hebben unieke nummers nodig.')
        task={'id':task_id,'title':title,'prompt':prompt,'location':clean_text(t.get('location','Zelf kiezen'),150),'points':points,'kind':'photo' if t.get('kind')=='photo' else 'text'}
        solution=clean_text(t.get('solution',''),500)  # 0.15.1: antwoordsleutel, alleen zichtbaar voor de spelleider
        if solution: task['solution']=solution
        if t.get('dutch_only') is True: task['dutch_only']=True  # 0.15.1: Nederlandse woordpuzzel, niet in andere talen
        out.append(task)
    return out

# 0.15.4: personages voor de teams (eigen keuze bij het aansluiten); plaatjes staan in pwa/assets/avatars.
AVATARS=['lion','fox','panda','frog','monkey','unicorn','octopus','robot','alien','dino','penguin','owl','koala','pig','tiger','cow']

TEAM_SYMBOLS = ('sun', 'bolt', 'crown', 'comet', 'diamond', 'flame', 'wave', 'clover')
SHOW_CHARACTERS = tuple(f'p{i}' for i in range(1, 9))


class Game:
    def __init__(self, directory, packs=None, tasks=None, clock=None):
        self.directory=Path(directory); self.directory.mkdir(parents=True,exist_ok=True)
        self.file=self.directory/'session.json'; self.lock=threading.RLock(); self.clock=clock or time.time
        self.packs=packs or {'nl':[]}; self.default_tasks=tasks or []
        if self.file.exists():
            self.s=json.loads(self.file.read_text('utf-8'))
            self.s['phase']='paused' if self.s.get('question') and self.s.get('phase') in ('ready','countdown','open','buzzed','paused') else self.s.get('phase','lobby')
            self.s['message']='Server opnieuw gestart. Controleer teams en hervat de ronde.'
            for t in self.s['teams']: t['last_seen']=0
        else:
            self.s={'host_key':secrets.token_urlsafe(32),'room_id':str(uuid.uuid4()),'code':str(secrets.randbelow(900000)+100000),'name':'Ons spel','mode':'buzzer','phase':'lobby','teams':[],'deck':[],'index':-1,'question':None,'question_id':'','answers':{},'buzzes':[],'attempted':[],'opens_at':0,'ends_at':0,'seconds':30,'remaining':30,'message':'Maak teams en kies een spel.','submissions':{},'claims':{},'tasks':copy.deepcopy(self.default_tasks),'revision':0,'audit':[],'evidence':{'mode':'app','link':''}}
        self._save()
        self.phone = PhoneShow(self, shared_json('show-content.json'))
        self.traitors = Traitors(self, shared_json('traitors-missions.json'))
        self.games = {cls.gid: cls(self) for cls in GAME_CLASSES}
        self.tv = {'path': '', 'at': 0, 'stage': None, 'stage_sig': '', 'stage_at': 0}   # 0.15.4: wat het TV-scherm toont
    # ------------------------------------------------------------- 0.15: koppeling met 'Mijn groep' in de app
    def set_roster(self, data):
        """De spelleider deelt de groep uit de app: namen en teams. Spelers kiezen hun naam op de telefoon."""
        players = data.get('players')
        if not isinstance(players, list) or len(players) > 80: raise GameError('Ongeldige spelerslijst (maximaal 80).')
        out, seen = [], set()
        for r in players:
            if not isinstance(r, dict): raise GameError('Ongeldige spelerslijst.')
            name = clean_text(r.get('name', ''), 30); team = clean_text(r.get('team') or '', 30)
            if not name or name.casefold() in seen: continue
            seen.add(name.casefold()); out.append({'name': name, 'team': team or None})
        with self.lock:
            teams = [clean_text(t, 30) for t in (data.get('teams') or []) if isinstance(t, str) and clean_text(t, 30)][:12]
            self.s['roster'] = {'group': clean_text(data.get('group', ''), 60), 'players': out, 'teams': teams, 'at': self.clock()}
            if data.get('lang') in i18n.LANGS: self.s['lang'] = data['lang']
            self._save()
        return {'ok': True, 'players': len(out)}

    def set_lang(self, lang):
        with self.lock:
            self.s['lang'] = i18n.valid(lang); self._save()
        return self.s['lang']

    def roster_public(self):
        r = self.s.get('roster') or {}
        return {'group': r.get('group', ''), 'players': [{'name': p['name'], 'team': p.get('team')} for p in r.get('players', [])], 'teams': list(r.get('teams', []))}

    def finished_results(self):
        """Einduitslagen van afgeronde telefoon- en wifispellen, voor het klassement van de app."""
        out = []
        with self.lock:
            for gid, eng in self.games.items():
                res = eng.final_results()
                if res and len(res) >= 2: out.append({'id': f"{gid}-{eng.s['id']}", 'gid': gid, 'title': eng.title, 'at': eng.s.get('ended_at') or self.clock(), 'results': res})
            res = self.traitors.final_results()
            if res and len(res) >= 2: out.append({'id': f"verraders-{self.traitors.s['id']}", 'gid': 'verraders', 'title': 'Het Verraad', 'at': self.traitors.s.get('ended_at') or self.clock(), 'results': res})
            s = self.s
            if s.get('phase') == 'finished':
                teams = [self._public_team(t) for t in s['teams'] if not t.get('spectator')]
                rank = ((s.get('auto') or {}).get('finale') or {}).get('rank', [])
                if rank:
                    by_id = {t['id']: t for t in teams}
                    teams = [dict(by_id[tid], score=len(rank) - i)
                             for i, tid in enumerate(rank) if tid in by_id]
                if len(teams) >= 2:
                    title = {'quiz': 'Pubquiz (telefoons)', 'buzzer': 'Buzzerquiz', 'wordrace': 'Halve Minuut', 'city': 'Stadskwis'}.get(s['mode'], 'Wifi-quiz')
                    theme = (s.get('auto') or {}).get('theme')
                    if theme in SHOW_THEMES: title = SHOW_THEMES[theme] + ' · tv-show'
                    out.append({'id': f"lan-{s['room_id']}-{s.get('game_no', 0)}", 'gid': 'lan-' + (theme or s['mode']), 'title': title, 'at': self.clock(), 'results': [{'name': t['name'], 'score': t['score']} for t in teams]})
        return out

    def player_routes(self, code):
        """Resolve a player's game code within the selected server or room."""
        with self.lock:
            routes = [
                (self.s, 'Wifi-quiz en tv-show', '/team'),
                (self.phone.s, 'Telefoonspelshow', '/controller'),
                (self.traitors.s, 'Het Verraad', '/verraders/speler'),
                *((engine.s, engine.title, f'/spel/{gid}/speler') for gid, engine in self.games.items()),
            ]
            return [(title, path) for state, title, path in routes if state.get('code') == code]

    def find_player_games(self):
        """Prefer the game shown on TV, followed by other games with players."""
        with self.lock:
            entries = [
                (self.s, self.s.get('name') or 'Wifi-quiz en tv-show', '/team', '/display', 'teams'),
                (self.phone.s, 'Telefoonspelshow', '/controller', '/screen', 'teams'),
                (self.traitors.s, 'Het Verraad', '/verraders/speler', '/verraders/scherm', 'players'),
                *((engine.s, engine.title, f'/spel/{gid}/speler', f'/spel/{gid}/scherm', 'players')
                  for gid, engine in self.games.items())
            ]
            focused = urlsplit(self.tv.get('path', '')).path
            visible = [(tv != focused, title, path, state['code'])
                       for state, title, path, tv, roster in entries
                       if state.get('phase') not in ('finished', 'end') and (tv == focused or state.get(roster))]
            return [(title, path, code) for _, title, path, code in sorted(visible)]

    def running_games(self):
        """Telefoonspellen met spelers die nog niet zijn afgerond (voor 'Spel hervatten')."""
        out=[]
        with self.lock:
            for gid,eng in self.games.items():
                st=eng.s
                if st.get('players') and st.get('phase') not in ('lobby','end'):
                    out.append({'gid':gid,'name':eng.title,'phase':PHASE_NL.get(st.get('phase'),str(st.get('phase'))),'players':len(st['players']),'path':'/spel/'+gid})
            t=self.traitors.s
            if t.get('players') and t.get('phase') not in ('lobby','end'):
                out.append({'gid':'verraders','name':'Het Verraad','phase':PHASE_NL.get(t.get('phase'),str(t.get('phase'))),'players':len(t['players']),'path':'/verraders'})
        return out

    def tv_focus(self, path):
        """Het TV-scherm volgt het spel waarin de spelleider het laatst iets deed."""
        with self.lock: self.tv.update(path=path, at=self.clock())
    def tv_stage(self, packet):
        if not isinstance(packet, dict): raise GameError('Ongeldige invoer.')
        raw = json.dumps(packet, ensure_ascii=False)
        if len(raw) > 200000: raise GameError('Te groot.', 413)
        sig = json.dumps({k: packet.get(k) for k in ('game', 'phase', 'title', 'prompt', 'active', 'running', 'board')}, ensure_ascii=False, sort_keys=True)
        with self.lock:
            self.tv['stage'] = packet; self.tv['stage_at'] = self.clock()
            if sig != self.tv['stage_sig']: self.tv.update(stage_sig=sig, path='/app/?tv=1#stage', at=self.clock())
        return {'ok': True}
    def tv_view(self):
        with self.lock: return {'path': self.tv['path'], 'at': self.tv['at'], 'server_time': self.clock()}
    def _save(self):
        temp=self.file.with_suffix('.tmp'); temp.write_text(json.dumps(self.s,ensure_ascii=False),'utf-8'); os.replace(temp,self.file)
    def host(self, key):
        if not isinstance(key,str) or not secrets.compare_digest(key,self.s['host_key']): raise GameError('Geen toegang tot de spelleider.',403)
    def team(self, key):
        if not isinstance(key,str): raise GameError('Opnieuw aanmelden nodig.',403)
        for t in self.s['teams']:
            if secrets.compare_digest(key,t['token']): return t
        raise GameError('Opnieuw aanmelden nodig.',403)
    def _connected(self,t): return self.clock()-t['last_seen']<5
    def _check(self):
        now=self.clock()
        if self.s['phase'] in ('countdown','open','buzzed') and self.s['mode']!='city' and any(not self._connected(t) for t in (self._auto_players() if (self.s.get('auto') or {}).get('finale') else self._active())):
            self.s['remaining']=max(0,self.s['ends_at']-max(now,self.s['opens_at']))
            self.s['phase']='paused'; self.s['message']='Verbinding met een team weggevallen. Ronde gepauzeerd.'; self._save()
        if self.s['phase']=='countdown' and now>=self.s['opens_at']: self.s['phase']='open'
        if self.s['phase']=='open' and self.s['mode'] in ('quiz','wordrace') and now>=self.s['ends_at']: self._reveal()
        if self.s.get('auto') and self.s['mode']=='buzzer': self._auto_tick(now)
    # ------------------------------------------------------------- 0.15.4: automatische spelshow (Buzzerquiz)
    AUTO_TYPES = {
        'jacht': {'name': 'Puntenjacht', 'seconds': 20, 'mode': 'all'},
        'snel': {'name': 'Snelste vinger', 'seconds': 15, 'mode': 'all'},
        'buzz': {'name': 'Buzzerrace', 'seconds': 20, 'mode': 'buzz'},
        'taart': {'name': 'Taartgooien', 'seconds': 20, 'mode': 'all', 'pick': 'pie'},
        'wissel': {'name': 'Kluis of Kraak', 'seconds': 16, 'mode': 'all', 'pick': 'vault'},
        'roof': {'name': 'Puntenroof', 'seconds': 20, 'mode': 'all', 'pick': 'steal'},
        'bom': {'name': 'De bom', 'seconds': 15, 'mode': 'bomb'},
        'inzet': {'name': 'Alles op het spel', 'seconds': 15, 'mode': 'all'},
        'finale': {'name': 'Finale', 'seconds': 15, 'mode': 'all'},
    }
    AUTO_SHOWS = {'kort': ['jacht', 'buzz', 'taart', 'finale'], 'normaal': ['jacht', 'snel', 'buzz', 'taart', 'roof', 'finale'],
                  'lang': ['jacht', 'snel', 'buzz', 'taart', 'roof', 'bom', 'finale']}
    AUTO_STEP = {'intro': 14, 'round': 7, 'reveal': 6, 'standings': 8, 'pick': 12, 'bomb': 3}
    STAKE_SECONDS = 10
    STAKE_OPTIONS = (0, 1, 3, 5)

    QUIZ_SHOWS = {
        'kort': ['jacht', 'snel', 'finale'],
        'normaal': ['jacht', 'snel', 'inzet', 'finale'],
        'lang': ['jacht', 'snel', 'jacht', 'inzet', 'finale'],
    }

    def _auto_plan(self, count, show, theme=''):
        plain = theme in ('pubquiz','friends')
        kinds = (self.QUIZ_SHOWS if plain else self.AUTO_SHOWS)[show]
        if not plain and show != 'kort' and count >= 2 * (len(kinds) + 1):
            kinds = [*kinds[:-1], 'inzet', kinds[-1]]
        if not plain and show != 'kort':
            if count >= 2 * (len(kinds) + 1):
                kinds = [*kinds[:-1], 'wissel', kinds[-1]]
            else:
                kinds = ['wissel' if kind == 'roof' else kind for kind in kinds]
        n = len(kinds); out, start = [], 0
        for i, kind in enumerate(kinds):
            size = count // n + (i < count % n); info = self.AUTO_TYPES[kind]
            out.append({'type': kind, 'name': info['name'], 'mode': info['mode'], 'seconds': info['seconds'], 'from': start, 'to': start + size}); start += size
        return out
    def _auto_round(self):
        a = self.s['auto']; i = a.get('round', 0)
        return a['rounds'][min(i, len(a['rounds']) - 1)]
    def _active(self): return [t for t in self.s['teams'] if not t.get('spectator')]
    def _team(self, tid): return next((t for t in self.s['teams'] if t['id'] == tid), None)
    def _auto_question(self, now):
        s = self.s; a = s['auto']; r = self._auto_round()
        s['index'] += 1
        s.setdefault('seen_questions', []).append(s['deck'][s['index']]['q']); s['seen_questions'] = s['seen_questions'][-10000:]
        s.update(question=copy.deepcopy(s['deck'][s['index']]), question_id=str(uuid.uuid4()), phase='countdown', answers={}, buzzes=[], attempted=[],
                 opens_at=now + 3, ends_at=now + 3 + r['seconds'], seconds=r['seconds'], remaining=r['seconds'],
                 message=f"Vraag {s['index'] - r['from'] + 1} van {r['to'] - r['from']} · {r['name']}")
        a.update(until=0, answer_until=0, answer_ms={}, results=[], effect=None, pick=None, tick_at=now)
        a.pop('stake', None)
        if r['type'] == 'inzet':
            category = s['question'].get('category') or 'Algemene kennis'
            a['stake'] = {'until': now + self.STAKE_SECONDS, 'bets': {}, 'category': category}
            s.update(phase='stake', message='Kies je inzet voor deze vraag.')
    def _queue_show_intro(self):
        self.s.update(phase='intro', question=None, message='Wachten op het tv-scherm…')
        self.s['auto'].update(until=0, intro_id=uuid.uuid4().hex, intro_remaining=0, hold=False, intro_at=self.clock())

    TV_STATUSES = ('loading', 'ready', 'light', 'flat', 'unsupported', 'failed')
    def tv_report(self, status):
        """0.19.5: het tv-scherm meldt zijn 3D-status, zodat de spelleider dat ook op een ander apparaat ziet."""
        if status not in self.TV_STATUSES: raise GameError('Onbekende status.')
        with self.lock: self.tv['status'] = {'status': status, 'at': self.clock()}
        return {'ok': True}
    def tv_intro_ready(self, intro_id):
        with self.lock:
            state = self.s
            auto = state.get('auto') or {}
            if state['phase'] != 'intro' or not auto.get('intro_id') or auto['intro_id'] != intro_id:
                return {'accepted': False}
            if not auto.get('until') and not auto.get('hold'):
                auto['until'] = self.clock() + self.AUTO_STEP['intro']
                state['message'] = 'De show begint!'
                self._save()
            return {'accepted': bool(auto.get('until'))}

    def _auto_start_round(self, now):
        s = self.s; a = s['auto']; r = self._auto_round()
        s.update(phase='round', question=None, message=f"Ronde {a['round'] + 1}: {r['name']}")
        a.update(until=now + self.AUTO_STEP['round'], results=[], effect=None, pick=None, bomb=None)
        a.pop('finale', None)
        a.pop('stake', None)
        if r['type'] == 'finale' and a.get('arena_rules'):
            act = self._active()
            peak = max(1, max((t['score'] for t in act), default=0))
            a['finale'] = {'bank': {t['id']: round(6 + 8 * max(0, t['score']) / peak, 2) for t in act},
                           'out': [], 'rank': []}
        if r['mode'] == 'bomb':
            act = sorted(self._active(), key=lambda t: (t['score'], t['name']))
            a['bomb'] = {'holder': act[0]['id'] if act else None, 'fuse': random.uniform(35, 60), 'boom': False}
    def _auto_advance(self, now):
        s = self.s; a = s['auto']; r = self._auto_round()
        if r['mode'] == 'bomb' and a.get('bomb') and not a['bomb']['boom'] and s['index'] + 1 >= r['to']:
            self._auto_explode(now); return
        finale = a.get('finale')
        last_final_question = finale and s['index'] + 1 >= r['to']
        if finale and (len(self._auto_players()) <= 1 or last_final_question):
            self._auto_finish_finale()
            return
        if s['index'] + 1 < r['to'] and not (r['mode'] == 'bomb' and (a.get('bomb') or {}).get('boom')): self._auto_question(now); return
        if a['round'] + 1 >= len(a['rounds']):
            s.update(phase='finished', question=None, message='Einde van de show! Bekijk de eindstand.'); a['until'] = 0; return
        s['index'] = r['to'] - 1
        s.update(phase='standings', question=None, message='Tussenstand'); a['until'] = now + self.AUTO_STEP['standings']
    def _auto_explode(self, now):
        s = self.s; a = s['auto']; b = a['bomb']; t = self._team(b['holder'])
        b['boom'] = True
        if t: t['score'] = max(0, t['score'] - 3)
        a['effect'] = {'kind': 'boom', 'to': b['holder'], 'points': 3}
        s.update(phase='reveal', message=(f"BOEM! {t['name']} verliest 3 punten." if t else 'BOEM!')); a['until'] = now + self.AUTO_STEP['reveal']
    def _auto_tick(self, now):
        s = self.s; a = s['auto']; ph = s['phase']; changed = False
        if a.get('hold') or ph in ('lobby', 'finished'): return
        r = self._auto_round(); last = a.get('tick_at') or now; a['tick_at'] = now
        if ph == 'paused':
            if all(self._connected(t) for t in self._auto_players()):
                if s['buzzes']: s['phase'] = 'buzzed'; a['answer_until'] = now + 10; s['message'] = s['buzzes'][0]['name'] + ' kiest een antwoord.'
                else: s.update(phase='countdown', opens_at=now + 3, ends_at=now + 3 + (s['remaining'] if a.get('finale') else max(3, s['remaining'])), message='Iedereen is er weer. We gaan verder!')
                changed = True
        elif ph == 'ready':
            s.update(phase='countdown', opens_at=now + 3, ends_at=now + 3 + s['seconds']); changed = True
        elif ph == 'stake':
            stake = a['stake']
            if now >= stake['until'] or all(t['id'] in stake['bets'] for t in self._active()):
                s.update(phase='countdown', opens_at=now + 3, ends_at=now + 3 + r['seconds'],
                         message='Inzet gesloten. De vraag komt eraan.')
                changed = True
        elif ph == 'open' and a.get('settle_until'):
            if not s['buzzes']: a['settle_until'] = 0
            elif now >= a['settle_until']:
                s['buzzes'].sort(key=lambda b: b['ms']); first = s['buzzes'][0]
                s['phase'] = 'buzzed'; s['remaining'] = max(0, s['ends_at'] - now); a['answer_until'] = now + 10; a['settle_until'] = 0
                s['message'] = first['name'] + ' drukte als eerste en kiest nu een antwoord.'; changed = True
        elif ph == 'open':
            if r['mode'] == 'bomb' and a.get('bomb'):
                a['bomb']['fuse'] -= max(0, now - last)
                if a['bomb']['fuse'] <= 0: self._auto_explode(now); changed = True
                elif now >= s['ends_at']: self._auto_bomb_answer(None, now); changed = True
            elif a.get('finale') and all(
                    t['id'] in s['answers'] or a['finale']['bank'][t['id']] <= self._finale_elapsed(now)
                    for t in self._auto_players()):
                self._auto_score_all(now); changed = True
            elif now >= s['ends_at']:
                if r['mode'] == 'all': self._auto_score_all(now)
                else: self._reveal(); s['message'] = 'De tijd is om!'
                changed = True
        elif ph == 'buzzed' and a.get('answer_until') and now >= a['answer_until']:
            self._auto_judge(s['buzzes'][0]['team_id'], None, now); changed = True
        elif ph == 'pick' and a.get('pick') and now >= a['pick']['until']:
            others = sorted([t for t in self._active() if t['id'] != a['pick']['team_id']], key=lambda t: -t['score'])
            timed = 'targets' in a['pick'] or a['pick']['kind'] == 'vault'
            self._auto_pick(others[0]['id'] if others and not timed else None, now); changed = True
        elif ph == 'reveal':
            if not a.get('until'): a['until'] = now + self.AUTO_STEP['reveal']; changed = True
            elif now >= a['until']: self._auto_advance(now); changed = True
        elif (ph == 'intro' and self.online and not a.get('until') and not a.get('hold') and now - a.get('intro_at', now) >= self.INTRO_WAIT
              and not (self.tv.get('status') and now - self.tv['status']['at'] < 20)):
            # 0.19.5: online zonder open tv-scherm (bijvoorbeeld iedereen thuis op de telefoon): na even wachten toch verder.
            # Lokaal, of zodra er een tv-scherm laadt, wacht de show zoals voorheen op de tv.
            a['until'] = now + 1; changed = True
        elif ph == 'intro' and a.get('until') and now >= a['until']:
            self._auto_start_round(now); changed = True
        elif ph == 'round' and now >= a.get('until', 0):
            self._auto_question(now); changed = True
        elif ph == 'standings' and now >= a.get('until', 0):
            a['round'] += 1; self._auto_start_round(now); changed = True
        if changed: s['revision'] += 1; self._save()
    def _auto_players(self):
        finale = self.s['auto'].get('finale')
        return [t for t in self._active() if not finale or
                (t['id'] in finale['bank'] and t['id'] not in finale['out'])]

    def _finale_elapsed(self, now):
        s = self.s
        if s['phase'] == 'paused':
            return max(0, s['seconds'] - s['remaining'])
        return max(0, s['seconds'] - max(0, s['ends_at'] - max(now, s['opens_at'])))

    def _auto_score_finale(self, now):
        s = self.s; a = s['auto']; f = a['finale']; bank = f['bank']
        elapsed = self._finale_elapsed(now)
        correct = sorted((tid for tid, choice in s['answers'].items()
                          if choice == s['question']['correct']), key=a['answer_ms'].__getitem__)
        results = []
        eliminated = []
        for t in self._auto_players():
            tid = t['id']; initial = bank[tid]
            choice = s['answers'].get(tid)
            used = a['answer_ms'][tid] / 1000 if choice is not None else min(initial, elapsed)
            ok = tid in correct
            bonus = (4 if tid == correct[0] else 2) if ok else (-2 if choice is not None else 0)
            bank[tid] = min(15, round(initial - used + bonus, 2))
            if bank[tid] <= 0:
                eliminated.append((used, bank[tid], initial, t['score'], tid))
            results.append({'team_id': tid, 'choice': choice, 'correct': ok, 'points': 0,
                            'seconds': round(bank[tid] - initial, 2)})
        f['out'].extend(row[-1] for row in sorted(eliminated))
        for tid in f['out']:
            bank[tid] = 0
        a['results'] = results
        s.update(phase='reveal', message='De tijd is bijgewerkt.')
        a['until'] = now + self.AUTO_STEP['reveal']

    def _auto_finish_finale(self):
        s = self.s; a = s['auto']; f = a['finale']
        survivors = sorted(self._auto_players(), key=lambda t: (-f['bank'][t['id']], -t['score']))
        active_ids = {t['id'] for t in self._active()}
        f['rank'] = [t['id'] for t in survivors] + [tid for tid in reversed(f['out']) if tid in active_ids]
        s.update(phase='finished', question=None, message='De finale is gespeeld!')
        a['until'] = 0

    def _auto_score_all(self, now):
        """Iedereen heeft geantwoord of de tijd is om: punten volgens het soort ronde."""
        s = self.s; a = s['auto']; r = self._auto_round(); q = s['question'] or {}; kind = r['type']
        if a.get('finale'):
            self._auto_score_finale(now)
            return
        ms = a.get('answer_ms', {}); results = []
        correct = sorted([tid for tid, c in s['answers'].items() if c == q.get('correct')], key=lambda tid: ms.get(tid, 10**9))
        for t in self._active():
            c = s['answers'].get(t['id']); ok = t['id'] in correct; rank = correct.index(t['id']) + 1 if ok else 0; pts = 0
            if kind == 'jacht': pts = 2 if ok else 0
            elif kind == 'snel': pts = max(1, 6 - rank) if ok else 0
            elif kind in ('taart', 'roof', 'wissel'): pts = 1 if ok else 0
            elif kind == 'inzet':
                bet = a['stake']['bets'].get(t['id'], 0)
                pts = bet if ok else -bet
            elif kind == 'finale': pts = (3 if rank == 1 else 2) if ok else (-2 if c is not None else -1)
            before = t['score']; t['score'] = max(0, t['score'] + pts)
            results.append({'team_id': t['id'], 'choice': c, 'correct': ok, 'rank': rank, 'points': t['score'] - before, 'ms': ms.get(t['id'])})
        a['results'] = results
        winner = correct[0] if correct else None
        if self.AUTO_TYPES[kind].get('pick') and winner and len(self._active()) >= 2:
            w = self._team(winner)
            a['pick'] = {'team_id': winner, 'until': now + self.AUTO_STEP['pick'], 'kind': self.AUTO_TYPES[kind]['pick']}
            if kind == 'taart' and a.get('arena_rules'):
                a['pick'].update(start=now + 0.8, slot=0.9, hit=0.58,
                                 targets=[t['id'] for t in self._active() if t['id'] != winner])
            prompt = {'taart': 'mag een taart gooien', 'roof': 'mag punten stelen', 'wissel': 'kiest Kluis of Kraak'}
            s.update(phase='pick', message=f"{w['name']} {prompt[kind]}!")
            return
        s['phase'] = 'reveal'; a['until'] = now + self.AUTO_STEP['reveal']
        s['message'] = (f"Goed: {', '.join(self._team(t)['name'] for t in correct)}" if correct else 'Niemand had het goed.')
    def _auto_pick(self, target, now):
        s = self.s; a = s['auto']; p = a['pick']; w = self._team(p['team_id']); t = self._team(target)
        if not t and 'targets' in p:
            a['effect'] = {'kind': 'pie_miss', 'from': p['team_id']}
            s['message'] = 'Mis! De taart raakt niemand.'
        if p['kind'] == 'vault' and not t and w:
            w['score'] += 2
            a['effect'] = {'kind': 'vault', 'from': w['id'], 'points': 2}
            s['message'] = f"{w['name']} zet 2 bonuspunten in de kluis."
        if t and w and t['id'] != w['id']:
            if p['kind'] == 'pie':
                lost = min(2, t['score']); t['score'] -= lost
                a['effect'] = {'kind': 'pie', 'from': w['id'], 'to': t['id'], 'points': lost}
                s['message'] = f"Pats! {w['name']} gooit een taart naar {t['name']}."
            else:
                stolen = min(3 if p['kind'] == 'vault' else 2, t['score']); t['score'] -= stolen; w['score'] += stolen
                a['effect'] = {'kind': 'steal', 'from': w['id'], 'to': t['id'], 'points': stolen}
                s['message'] = f"{w['name']} steelt punten van {t['name']}!"
        a['pick'] = None; s['phase'] = 'reveal'; a['until'] = now + self.AUTO_STEP['reveal']
    def _auto_bomb_answer(self, choice, now):
        s = self.s; a = s['auto']; b = a['bomb']; q = s['question'] or {}; t = self._team(b['holder'])
        ok = choice is not None and choice == q.get('correct')
        if choice is not None: s['answers'][b['holder']] = choice
        a['results'] = [{'team_id': b['holder'], 'choice': choice, 'correct': ok, 'rank': 1 if ok else 0, 'points': 1 if ok else 0}]
        if ok and t:
            t['score'] += 1; act = self._active(); ids = [x['id'] for x in act]
            nxt = ids[(ids.index(b['holder']) + 1) % len(ids)] if b['holder'] in ids else ids[0]
            b['holder'] = nxt; s['message'] = f"Goed! De bom gaat naar {self._team(nxt)['name']}."
        else:
            s['message'] = ('Te laat! ' if choice is None else 'Fout! ') + (f"{t['name']} houdt de bom." if t else '')
        s['phase'] = 'reveal'; a['until'] = now + self.AUTO_STEP['bomb']
    def _auto_judge(self, team_id, choice, now):
        """Buzzerrace: het eerste team dat drukte, kiest een antwoord."""
        s = self.s; a = s['auto']; q = s['question'] or {}
        t = self._team(team_id)
        if t is None: return
        if choice is not None: s['answers'][team_id] = choice
        correct = choice is not None and choice == q.get('correct')
        if correct:
            t['score'] += 2; s['phase'] = 'reveal'; a['until'] = now + self.AUTO_STEP['reveal']
            a['results'] = [{'team_id': team_id, 'choice': choice, 'correct': True, 'rank': 1, 'points': 2}]
            s['message'] = f"Goed! {t['name']} krijgt 2 punten."
            return
        before = t['score']; t['score'] = max(0, t['score'] - 1)
        a['results'] = (a.get('results') or []) + [{'team_id': team_id, 'choice': choice, 'correct': False, 'rank': 0, 'points': t['score'] - before}]
        s['attempted'].append(team_id); s['buzzes'] = []; a['answer_until'] = 0
        others = [x for x in self._active() if x['id'] not in s['attempted']]
        if not others:
            self._reveal(); a['until'] = now + self.AUTO_STEP['reveal']; s['message'] = ('Te laat! ' if choice is None else 'Fout! ') + 'Niemand heeft het goed.'
        else:
            s.update(phase='open', ends_at=now + max(3, s['remaining']), message=('Te laat! ' if choice is None else 'Fout! ') + 'De andere teams mogen nog buzzen.')
    # 0.19.5: eerlijk drukken via internet. De telefoon stuurt zijn eigen druktijd mee (omgerekend naar de serverklok);
    # die telt binnen een marge, zodat een trager netwerk (4G) niet meer bepaalt wie het snelst was.
    online = False       # 0.19.5: True in een online spelkamer (online.py)
    INTRO_WAIT = 15      # seconden wachten op een tv-scherm voordat de show zonder tv begint
    PRESS_GRACE = 0.35   # maximaal zoveel seconden vóór aankomst mag een druk meetellen
    BUZZ_SETTLE = 0.35   # zo lang wachten na de eerste buzz op buzzes die eerder gedrukt maar later aangekomen zijn
    def _press_time(self, data, now):
        p = data.get('pressed_at') if isinstance(data, dict) else None
        if isinstance(p, bool) or not isinstance(p, (int, float)) or p != p: return now
        return min(now, max(now - self.PRESS_GRACE, float(p)))
    def auto_answer(self, t, data):
        """Antwoord van een telefoon in de automatische show (keuze of taart-/roofdoelwit)."""
        s = self.s; a = s['auto']; r = self._auto_round(); now = self.clock()
        if a.get('hold'): raise GameError('De show is gepauzeerd.', 409)
        if 'stake' in data:
            if s['phase'] != 'stake' or r['type'] != 'inzet':
                raise GameError('De inzet is gesloten.', 409)
            bets = a['stake']['bets']
            bet = data['stake']
            if type(bet) is not int or bet not in self.STAKE_OPTIONS or bet > max(0, t['score']):
                raise GameError('Kies een inzet die binnen jullie score past.')
            if t['id'] in bets:
                raise GameError('Jullie inzet staat al vast.', 409)
            bets[t['id']] = bet
            return
        if s['phase'] == 'pick':
            if not a.get('pick') or a['pick']['team_id'] != t['id']: raise GameError('Een ander team mag kiezen.', 403)
            p = a['pick']
            if p['kind'] == 'vault' and data.get('bank') is True:
                self._auto_pick(None, now)
                return
            if 'targets' in p:
                if data.get('throw') is not True or now < p['start']:
                    raise GameError('Wacht op het startsein en druk op Gooi.', 409)
                elapsed = max(0, self._press_time(data, now) - p['start'])
                slot = int(elapsed / p['slot'])
                target = p['targets'][slot % len(p['targets'])] if elapsed - slot * p['slot'] < p['hit'] else None
                if target not in {x['id'] for x in self._active()}: target = None
                self._auto_pick(target, now)
                return
            target = data.get('target')
            if not any(x['id'] == target for x in self._active()) or target == t['id']: raise GameError('Kies een ander team.')
            if p['kind'] == 'vault' and self._team(target)['score'] <= 0:
                raise GameError('Dit team heeft geen punten om te kraken.')
            self._auto_pick(target, now); return
        choice = data.get('choice')
        if type(choice) is not int or not 0 <= choice <= 3: raise GameError('Kies A, B, C of D.')
        if r['mode'] == 'buzz':
            if a.get('settle_until'): raise GameError('Even geduld: we kijken wie echt als eerste drukte.', 409)
            if s['phase'] != 'buzzed' or not s['buzzes'] or s['buzzes'][0]['team_id'] != t['id']: raise GameError('Een ander team is aan de beurt.', 403)
            self._auto_judge(t['id'], choice, now); return
        if s['phase'] != 'open': raise GameError('Antwoorden zijn nu gesloten.', 409)
        if r['mode'] == 'bomb':
            if not a.get('bomb') or a['bomb']['holder'] != t['id']: raise GameError('Alleen het team met de bom antwoordt.', 403)
            self._auto_bomb_answer(choice, now); return
        if t['id'] in s['answers']: raise GameError('Jullie antwoord is al opgeslagen.', 409)
        elapsed = max(0, self._press_time(data, now) - s['opens_at'])
        f = a.get('finale')
        if f:
            elapsed = self._finale_elapsed(now)
            if t not in self._auto_players() or elapsed >= f['bank'][t['id']]:
                raise GameError('Jullie tijd in de finale is op.', 409)
        s['answers'][t['id']] = choice
        a.setdefault('answer_ms', {})[t['id']] = round(elapsed * 1000)
        if all(x['id'] in s['answers'] for x in self._auto_players()): self._auto_score_all(now)
    def auto_view(self, me=None):
        s = self.s; a = s['auto']; r = self._auto_round()
        out = {'round': a['round'] + 1, 'rounds': len(a['rounds']), 'type': r['type'], 'mode': r['mode'], 'name': r['name'],
               'theme': a.get('theme',''), 'year': a.get('year'), 'arena_rules': bool(a.get('arena_rules')), 'until': a.get('until', 0), 'answer_until': a.get('answer_until', 0), 'hold': bool(a.get('hold')),
               'intro_id': a.get('intro_id') if s['phase'] == 'intro' else None,
               'question_no': max(0, s['index'] - r['from'] + 1), 'questions': r['to'] - r['from'],
               'names': [x['name'] for x in a['rounds']], 'types': [x['type'] for x in a['rounds']],
               'answered': [tid for tid in s['answers']] if r['mode'] == 'all' else [],
               'effect': copy.deepcopy(a.get('effect')), 'pick': copy.deepcopy(a.get('pick'))}
        if s['phase'] in ('reveal', 'pick') or (r['mode'] == 'buzz' and a.get('results')): out['results'] = copy.deepcopy(a.get('results') or [])
        f = a.get('finale')
        if f:
            out['finale'] = {'bank': f['bank'].copy(), 'out': f['out'][:], 'rank': f['rank'][:],
                             'frozen': {tid: ms / 1000 for tid, ms in a['answer_ms'].items()},
                             'elapsed': self._finale_elapsed(self.clock()) if s['phase'] == 'paused' else 0}
        stake = a.get('stake')
        if stake:
            out['stake'] = {'category': stake['category'], 'until': stake['until'],
                            'locked': list(stake['bets']), 'paused_at': stake.get('paused_at')}
        b = a.get('bomb')
        if b: out['bomb'] = {'holder': b['holder'], 'boom': b['boom'], 'hurry': (not b['boom']) and b['fuse'] < 12}
        if me:
            mine = {'choice': s['answers'].get(me['id'])}
            if stake:
                mine['bet'] = stake['bets'].get(me['id'])
                if s['phase'] == 'stake' and not me.get('spectator') and mine['bet'] is None:
                    mine['stake_options'] = [bet for bet in self.STAKE_OPTIONS if bet <= max(0, me['score'])]
            if s['phase'] == 'open' and r['mode'] == 'all' and me['id'] not in s['answers'] and me in self._auto_players():
                mine['can_answer'] = not f or self._finale_elapsed(self.clock()) < f['bank'][me['id']]
            if s['phase'] == 'open' and r['mode'] == 'bomb' and b and b['holder'] == me['id']: mine['can_answer'] = True
            if s['phase'] == 'buzzed' and s['buzzes'] and s['buzzes'][0]['team_id'] == me['id']: mine['can_answer'] = True
            if s['phase'] == 'pick' and a.get('pick') and a['pick']['team_id'] == me['id']: mine['must_pick'] = a['pick']['kind']
            out['me'] = mine
        return out
    def _public_team(self,t):
        city=sum(x.get('points',0) for x in self.s['submissions'].values() if x['team_id']==t['id'] and x['status']=='approved')
        return {'id':t['id'],'name':t['name'],'score':t['score']+city,'connected':self._connected(t),'spectator':bool(t.get('spectator')),'avatar':t.get('avatar') or AVATARS[0],
                'symbol':t.get('symbol'), 'character':t.get('character')}
    def _reveal(self):
        if self.s['phase']=='reveal': return
        if self.s['mode']=='quiz' and self.s['question']:
            for t in self.s['teams']:
                q=self.s['question']; answer=self.s['answers'].get(t['id'])
                correct=answer==q['correct'] if 'options' in q else answer is not None and normalized(answer) in [normalized(v) for a in q['answers'] for v in i18n.variants(a)]
                if correct: t['score']+=1
        if self.s['mode']=='wordrace' and self.s.get('active_team'):
            t=next((t for t in self.s['teams'] if t['id']==self.s['active_team']),None)
            if t: t['score']+=sum(1 for value in self.s.get('word_marks',{}).values() if value=='correct')
        self.s['phase']='reveal'; self.s['message']='Antwoorden en punten zijn bekend.'; self._save()
    def view(self, key=None, role='public'):
        with self.lock:
            me=None
            if role=='host': self.host(key)
            if role=='team': me=self.team(key); me['last_seen']=self.clock()
            self._check(); s=self.s
            q=copy.deepcopy(s['question'])
            if q:
                if s['phase'] == 'stake' or (s['phase'] in ('ready','countdown') and role!='host'): q=None
                elif role!='host' and s['phase']!='reveal':
                    q.pop('correct',None); q.pop('answers',None)
                if q and s['mode']=='wordrace' and s['phase']!='reveal': q.pop('words',None)
            if q and q.pop('image', None) and s['phase'] not in ('countdown','ready','stake'):
                q['image'] = '/api/question-image?id=' + s['question_id']
            result={k:copy.deepcopy(s[k]) for k in ['room_id','code','name','mode','phase','index','question_id','opens_at','ends_at','message','seconds','remaining']}
            result.update(server_time=self.clock(),question=q,total=min(len(s['deck']),len([t for t in s['teams'] if not t.get('spectator')])*2) if s['mode']=='wordrace' else len(s['deck']),teams=[self._public_team(t) for t in s['teams']],buzzes=copy.deepcopy(s['buzzes']),answer_count=len(s['answers']))
            if s['mode']=='wordrace':
                result['active_team']=s.get('active_team'); result['word_marks']=copy.deepcopy(s.get('word_marks',{}))
                if me and me['id']==s.get('active_team') and s['phase']=='open': result['private_words']=copy.deepcopy(s['question']['words'])
            if s.get('auto') and s['mode']=='buzzer': result['auto']=self.auto_view(me)
            if me:
                result['me']={**self._public_team(me),'access_code':me['access_code'],'answer':s['answers'].get(me['id']),'attempted':me['id'] in s['attempted']}
            if s['mode']=='city':
                result['evidence']=evidence_view(s.get('evidence'),role)
                result['tasks']=copy.deepcopy(s['tasks']) if role=='host' else [{k:v for k,v in t.items() if k!='solution'} for t in s['tasks']]
                if role=='host': result['submissions']=list(copy.deepcopy(s['submissions']).values()); result['claims']=copy.deepcopy(s['claims'])
                elif me:
                    result['submissions']=[copy.deepcopy(x) for x in s['submissions'].values() if x['team_id']==me['id']]
                    result['claims']={k.split(':',1)[1]:v for k,v in s['claims'].items() if k.startswith(me['id']+':')}
            if role=='host':
                tv = self.tv.get('status')
                result['tv_status'] = tv['status'] if tv and self.clock() - tv['at'] < 20 else None   # 0.19.5: tv-scherm meldt zich via de server
                result['time_show_years'] = time_show_years()
                result['tasks']=copy.deepcopy(s['tasks']); result['task_bank']=copy.deepcopy(s.get('task_bank') or self.default_tasks); result['answers']=copy.deepcopy(s['answers']); result['packs']={k:len(v) for k,v in self.packs.items()}; result['audit']=s['audit'][-20:]; result['topics']=sorted(set(q.get('topic',q.get('category','Quiz')) for q in self.packs.get('nl',[])))
            return result
    def join(self, data):
        with self.lock:
            if str(data.get('code',''))!=self.s['code']: raise GameError('Onjuiste sessiecode.',403)
            access=str(data.get('access_code','')).strip().upper()
            if access:
                t=next((t for t in self.s['teams'] if t['access_code']==access),None)
                if not t: raise GameError('Onjuiste teamcode.',403)
                t['last_seen']=self.clock(); return {'token':t['token'],'team_id':t['id']}
            if self.s['phase'] not in ('lobby','finished') or self.s['question']: raise GameError('De spelleider moet eerst terug naar de lobby om teams toe te voegen.')
            name=clean_text(data.get('name',''),35)
            if not name: raise GameError('Vul een teamnaam in.')
            if self.s['mode']=='wordrace' and len(self.s['teams'])>=10: raise GameError('Halve Minuut speelt met maximaal tien teams.')
            if len(self.s['teams'])>=24: raise GameError('Maximaal 24 teams.')
            if any(t['name'].casefold()==name.casefold() for t in self.s['teams']): raise GameError('Die teamnaam bestaat al. Gebruik jullie teamcode om terug te komen.')
            avatar=data.get('avatar') if data.get('avatar') in AVATARS else next((x for x in AVATARS if all(t.get('avatar')!=x for t in self.s['teams'])),AVATARS[0])
            t={'id':str(uuid.uuid4()),'name':name,'token':secrets.token_urlsafe(24),'access_code':secrets.token_hex(3).upper(),'score':0,'last_seen':self.clock(),'spectator':False,'avatar':avatar,
               'symbol':data.get('symbol') if data.get('symbol') in TEAM_SYMBOLS else None,
               'character':data.get('character') if data.get('character') in SHOW_CHARACTERS else None}
            self.s['teams'].append(t); self._save(); return {'token':t['token'],'team_id':t['id']}
    def action(self,key,data):
        with self.lock:
            self.host(key); self._check(); s=self.s; act=data.get('action'); now=self.clock()
            if act=='setup':
                mode=data.get('mode')
                if mode not in ('quiz','buzzer','city','wordrace'): raise GameError('Onbekende spelvorm.')
                if s['phase'] not in ('lobby','finished'): raise GameError('Rond eerst het spel af.')
                theme = data.get('theme') or ''
                if theme and (not isinstance(theme, str) or theme not in SHOW_THEMES
                              or mode != 'buzzer' or not data.get('auto')):
                    raise GameError('Kies een geldige automatische tv-show.')
                year = data.get('year')
                if theme in ('year','holland'):
                    deck = validate_questions(themed_show_questions(theme, year))
                elif theme == 'friends':
                    if not data.get('questions'):
                        raise GameError('Voeg eigen vragen met vier antwoorden toe.')
                    deck = validate_questions(data['questions'])
                    if any('options' not in q for q in deck):
                        raise GameError('Gebruik vier antwoordopties voor elke vraag van de Vriendenquiz.')
                else:
                    deck=validate_questions(data['questions']) if data.get('questions') is not None else i18n.for_lang(copy.deepcopy(self.packs.get(data.get('language','nl'),[])),s.get('lang','nl'))
                if mode in ('quiz','buzzer'):
                    count=data.get('count',20)
                    if type(count) is not int or not 1<=count<=200: raise GameError('Kies 1 tot 200 vragen per spel.')
                    topic='all' if theme in ('year','holland','friends') else clean_text(data.get('topic','all'),100)
                    if topic!='all': deck=[q for q in deck if q.get('topic')==topic or q.get('category')==topic]
                    used=set(s.get('seen_questions',[])); fresh=[q for q in deck if q['q'] not in used]; old=[q for q in deck if q['q'] in used]
                    random.shuffle(fresh); random.shuffle(old); deck=(fresh+old)[:count]
                    if theme == 'year':
                        exact = {q['q'] for q in shared_json('time-show-questions.json')[str(year)]}
                        preferred = [q for q in fresh + old if q['q'] in exact]
                        others = [q for q in fresh + old if q['q'] not in exact]
                        deck = (preferred + others)[:count]
                        random.shuffle(deck)
                    if topic=='all' and data.get('questions') is None and theme in ('','pubquiz'):
                        pools={}
                        for q in fresh+old: pools.setdefault(q.get('category','Quiz'),[]).append(q)
                        categories=list(pools)
                        if len(categories)==4:
                            deck=[]
                            for i,category in enumerate(categories): deck.extend(pools[category][:count//4+(i<count%4)])
                if mode=='wordrace':
                    if len(s['teams'])>10: raise GameError('Halve Minuut speelt met maximaal tien teams.')
                    deck=word_deck()
                if mode!='city' and not deck: raise GameError('Geen vragen beschikbaar.')
                tasks=validate_tasks(data.get('tasks',self.default_tasks))
                task_count=data.get('task_count',0)
                if type(task_count) is not int or not 0<=task_count<=50: raise GameError('Kies een geldig aantal opdrachten.')
                s['task_bank']=tasks
                if mode=='city' and i18n.valid(s.get('lang','nl'))!='nl': tasks=[t for t in tasks if not t.get('dutch_only')] or tasks
                tasks=pick_tasks(tasks,task_count)
                seconds=data.get('seconds',30)
                if type(seconds) is not int or not 5<=seconds<=180: raise GameError('Kies 5 tot 180 seconden.')
                if mode=='buzzer' and data.get('auto'):
                    show=data.get('show','normaal')
                    if show not in self.AUTO_SHOWS: raise GameError('Kies een korte, normale of lange show.')
                    choice_deck=[q for q in deck if q.get('options') and len(q['options'])==4 and isinstance(q.get('correct'),int)]
                    plans = self.QUIZ_SHOWS if theme in ('pubquiz','friends') else self.AUTO_SHOWS
                    if len(choice_deck)<len(plans[show])*2: raise GameError('De automatische show heeft meerkeuzevragen nodig (minimaal twee per ronde).')
                s['game_no']=s.get('game_no',0)+1
                s.update(name=clean_text(data.get('name','Ons spel'),80) or 'Ons spel',mode=mode,evidence={'mode':'app','link':''},deck=deck,index=-1,question=None,question_id='',phase='lobby',answers={},buzzes=[],attempted=[],tasks=tasks,submissions={},claims={},seconds=seconds,message='Spel klaar. Laat teams aansluiten.')
                s['active_team']=None; s['word_marks']={}
                s['auto']=None
                if mode=='buzzer' and data.get('auto'):
                    s['deck']=choice_deck
                    s['auto']={'arena_rules':True,'theme':theme,'year':year if theme=='year' else None,'show':show,'rounds':self._auto_plan(len(choice_deck),show,theme),'round':0,'until':0,'answer_until':0,'hold':False,'results':[],'effect':None,'pick':None,'bomb':None,'answer_ms':{}}
                    s['message']='Automatische show klaar. Laat teams aansluiten en een personage kiezen.'
                if mode=='wordrace': s['seconds']=30
                for t in s['teams']: t['score']=0
            elif act=='evidence':
                if s['mode']!='city': raise GameError('Bewijskanaal is alleen bij Stadskwis beschikbaar.')
                try: s['evidence']=validate_evidence(data.get('mode','app'),data.get('link',''))
                except PlayError as ex: raise GameError(ex.message)
            elif act=='next' and s.get('auto') and s['mode']=='buzzer' and s['phase']=='lobby':
                if len([t for t in s['teams'] if not t.get('spectator')])<2: raise GameError('Minimaal twee deelnemende teams nodig.')
                if any(not self._connected(t) for t in s['teams'] if not t.get('spectator')): raise GameError('Wacht tot alle deelnemende teams verbonden zijn, of zet een afwezig team op toeschouwer.')
                s['auto'].update(round=0,hold=False); s['index']=-1
                if data.get('intro') is True:
                    self._queue_show_intro()
                else:
                    self._auto_start_round(now)
            elif act in ('intro-replay', 'intro-skip') and s.get('auto') and s['index'] == -1 and s['phase'] in ('intro','round'):
                if act == 'intro-replay':
                    self._queue_show_intro()
                else:
                    s['auto']['hold'] = False
                    self._auto_start_round(now)
            elif act=='next' and s.get('auto') and s['mode']=='buzzer' and s['phase']=='reveal':
                self._auto_advance(now)
            elif act=='next':
                if s['phase'] not in ('lobby','reveal','finished'): raise GameError('Rond eerst de huidige vraag af.')
                if s['mode']=='city': s.update(phase='city',message='De stadskwis is gestart.'); self._save(); return self.view(key,'host')
                if len([t for t in s['teams'] if not t.get('spectator')])<2: raise GameError('Minimaal twee deelnemende teams nodig.')
                if s['index']+1>=min(len(s['deck']),len([t for t in s['teams'] if not t.get('spectator')])*2 if s['mode']=='wordrace' else len(s['deck'])): s.update(phase='finished',message='Alle vragen zijn gespeeld.')
                else:
                    if s['mode']=='wordrace':
                        active=[t for t in s['teams'] if not t.get('spectator')]; s['active_team']=active[(s['index']+1)%len(active)]['id']; s['word_marks']={}
                    s.setdefault('seen_questions',[]).append(s['deck'][s['index']+1]['q']); s['seen_questions']=s['seen_questions'][-10000:]
                    s['index']+=1; s.update(question=copy.deepcopy(s['deck'][s['index']]),question_id=str(uuid.uuid4()),phase='ready',answers={},buzzes=[],attempted=[],message='Vraag klaar. Controleer verbindingen en open de ronde.')
            elif act=='resume' and s.get('auto') and s['auto'].get('hold') and s['phase']!='paused':
                s['auto']['hold']=False; s['message']='We gaan verder!'
                pick = s['auto'].get('pick')
                if pick and 'paused_at' in pick:
                    delta = max(0, now - pick.pop('paused_at'))
                    if 'start' in pick: pick['start'] += delta
                    pick['until'] += delta
                stake = s['auto'].get('stake')
                if stake and 'paused_at' in stake:
                    stake['until'] += max(0, now - stake.pop('paused_at'))
                if s['auto'].get('until'):
                    remaining = s['auto'].pop('intro_remaining', 0) if s['phase'] == 'intro' else 3
                    s['auto']['until'] = now + remaining
            elif act in ('arm','resume'):
                if s['phase'] not in ('ready','paused'): raise GameError('Deze ronde kan nu niet geopend worden.')
                if any(not self._connected(t) for t in (self._auto_players() if s.get('auto') else self._active())): raise GameError('Wacht tot alle deelnemende teams verbonden zijn, of zet een afwezig team op toeschouwer.')
                if s.get('auto'): s['auto']['hold']=False
                if act=='resume' and s['buzzes']:
                    s['phase']='buzzed'; s['message']='Buzzerstand hersteld. Beoordeel het antwoord.'
                    if s.get('auto'): s['auto']['answer_until']=now+10; s['message']=s['buzzes'][0]['name']+' kiest een antwoord.'
                else:
                    seconds=s['remaining'] if act=='resume' else s['seconds']; s.update(phase='countdown',opens_at=now+5,ends_at=now+5+seconds,message='Klaar voor de start…')
            elif act=='pause':
                if s.get('auto'):
                    if s['phase'] == 'intro' and s['auto'].get('until') and not s['auto'].get('hold'):
                        s['auto']['intro_remaining'] = max(0, s['auto']['until'] - now)
                    s['auto']['hold']=True
                    pick = s['auto'].get('pick')
                    if pick and ('targets' in pick or pick['kind'] == 'vault'): pick.setdefault('paused_at', now)
                    if s['phase'] == 'stake': s['auto']['stake'].setdefault('paused_at', now)
                if s['phase'] in ('countdown','open','buzzed'): s['remaining']=max(0,s['ends_at']-max(now,s['opens_at'])); s['phase']='paused'; s['message']='Gepauzeerd door de spelleider.'
                elif s.get('auto'): s['message']='Gepauzeerd door de spelleider.'
            elif act=='reveal' and (s.get('auto') or {}).get('finale'):
                if s['phase'] != 'open': raise GameError('Geen actieve finalevraag.')
                self._auto_score_finale(now)
            elif act=='reveal':
                if s['phase'] not in ('open','buzzed','paused','ready'): raise GameError('Geen actieve vraag om te onthullen.')
                self._reveal()
            elif act=='judge':
                if s['mode']!='buzzer' or s['phase']!='buzzed' or not s['buzzes']: raise GameError('Er is nog geen buzzerantwoord.')
                team_id=data.get('team_id')
                eligible={b['team_id'] for b in s['buzzes'] if b['ms']-s['buzzes'][0]['ms']<=80}
                if team_id not in eligible: raise GameError('Kies het eerste team of een vrijwel gelijktijdige druk.')
                if data.get('correct') is True:
                    next(t for t in s['teams'] if t['id']==team_id)['score']+=1; s['phase']='reveal'; s['message']='Goed antwoord. Eén punt erbij.'
                else:
                    s['attempted'].append(team_id); s['buzzes']=[]
                    if all(t['id'] in s['attempted'] or t.get('spectator') for t in s['teams']): self._reveal()
                    else: s.update(phase='ready',message='Fout antwoord. Open de buzzers opnieuw voor de overige teams.')
            elif act=='restart_round':
                if not s['question'] or s['phase']=='reveal': raise GameError('Geen onbeoordeelde ronde om opnieuw te doen.')
                if s['phase'] == 'stake': raise GameError('De inzet loopt nog.')
                s['word_marks']={}
                if (s.get('auto') or {}).get('finale'):
                    if s['phase'] not in ('countdown', 'open', 'paused'):
                        raise GameError('Er is geen actieve finalevraag.')
                    s['auto']['answer_ms'] = {}
                s.update(phase='ready',question_id=str(uuid.uuid4()),answers={},buzzes=[],attempted=[],message='Ronde opnieuw klaargezet.')
            elif act=='spectator':
                t=next((t for t in s['teams'] if t['id']==data.get('team_id')),None)
                if not t: raise GameError('Team niet gevonden.')
                t['spectator']=bool(data.get('value'))
            elif act=='remove_team':
                if s['phase'] not in ('lobby','finished'): raise GameError('Verwijderen kan alleen in de lobby of na afloop.')
                team_id=data.get('team_id'); s['teams']=[t for t in s['teams'] if t['id']!=team_id]
                s['answers'].pop(team_id,None)
            elif act=='score':
                t=next((t for t in s['teams'] if t['id']==data.get('team_id')),None); value=data.get('score')
                if not t or type(value) is not int or not -1000<=value<=10000: raise GameError('Ongeldige score.')
                s['audit'].append({'at':now,'team':t['name'],'from':t['score'],'to':value}); t['score']=value
            elif act=='grade':
                sub=s['submissions'].get(data.get('submission_id')); points=data.get('points',0)
                if not sub: raise GameError('Inzending niet gevonden.')
                task=next(t for t in s['tasks'] if t['id']==sub['task_id'])
                if type(points) is not int or not 0<=points<=task['points']: raise GameError('Ongeldig puntenaantal.')
                sub.update(status='approved' if data.get('approved') else 'rejected',points=points if data.get('approved') else 0,note=clean_text(data.get('note',''),500))
            elif act=='finish' and (s.get('auto') or {}).get('finale'):
                if s['phase'] in ('open', 'paused'):
                    self._auto_score_finale(now)
                self._auto_finish_finale()
            elif act=='finish':
                if s['mode']=='wordrace' and s['phase'] in ('open','paused'): self._reveal()
                s['phase']='finished'; s['message']='Spel afgerond. De uitslag blijft bewaard.'
            elif act=='lobby':
                if s['phase']!='finished': raise GameError('Rond het spel eerst af.')
                s.update(phase='lobby',question=None,question_id='',index=-1,message='Terug in de lobby. Kies een nieuw spel.')
            else: raise GameError('Onbekende actie.')
            s['revision']+=1; self._save(); return self.view(key,'host')
    def answer(self,key,data):
        with self.lock:
            t=self.team(key); t['last_seen']=self.clock(); self._check(); s=self.s
            if data.get('question_id')!=s['question_id']: raise GameError('Deze vraag is niet meer actief.',409)
            if t.get('spectator'): raise GameError('Dit team kijkt mee en speelt niet mee.',403)
            if 'symbol' in data or 'character' in data:
                if s['phase'] not in ('lobby', 'finished'):
                    raise GameError('Kies jullie teamuiterlijk in de lobby.', 409)
                for field, options in (('symbol', TEAM_SYMBOLS), ('character', SHOW_CHARACTERS)):
                    if field in data and data[field] not in options:
                        raise GameError('Onbekende keuze voor jullie teamuiterlijk.')
                for field in ('symbol', 'character'):
                    if field in data:
                        t[field] = data[field]
                s['revision'] += 1; self._save(); return self.view(key, 'team')
            if 'avatar' in data and s['phase'] in ('lobby','finished'):
                if data['avatar'] not in AVATARS: raise GameError('Onbekend personage.')
                t['avatar']=data['avatar']; s['revision']+=1; self._save(); return self.view(key,'team')
            if s.get('auto') and s['mode']=='buzzer' and ('choice' in data or 'target' in data or 'throw' in data or 'stake' in data or 'bank' in data):
                self.auto_answer(t,data); s['revision']+=1; self._save(); return self.view(key,'team')
            if s.get('auto') and s['mode']=='buzzer' and self._auto_round()['mode']!='buzz': raise GameError('Kies een antwoord op je telefoon.',409)
            if s['phase']!='open': raise GameError('Antwoorden zijn nu gesloten.',409)
            if s['mode']=='buzzer':
                if t['id'] in s['attempted']: raise GameError('Dit team heeft al geantwoord.',409)
                now=self.clock()
                if s.get('auto'):
                    # automatische show: eerst heel even alle buzzes verzamelen en dan op druktijd sorteren
                    if any(b['team_id']==t['id'] for b in s['buzzes']): raise GameError('Jullie hebben al gedrukt.',409)
                    s['buzzes'].append({'team_id':t['id'],'name':t['name'],'ms':round(self._press_time(data,now)*1000)})
                    if not s['auto'].get('settle_until'): s['auto']['settle_until']=now+self.BUZZ_SETTLE
                    s['revision']+=1
                else:
                    s['buzzes'].append({'team_id':t['id'],'name':t['name'],'ms':round(self.clock()*1000)})
                    s['phase']='buzzed'; s['message']=t['name']+' drukte als eerste.'
            elif s['mode']=='quiz':
                q=s['question']; choice=data.get('choice')
                if 'options' in q:
                    if type(choice) is not int or not 0<=choice<=3: raise GameError('Kies A, B, C of D.')
                else:
                    choice=clean_text(data.get('text',''),200)
                    if not choice: raise GameError('Vul jullie antwoord in.')
                if t['id'] in s['answers']: raise GameError('Jullie antwoord is al opgeslagen.',409)
                s['answers'][t['id']]=choice
                if len(s['answers'])==len([x for x in s['teams'] if not x.get('spectator')]): self._reveal()
            elif s['mode']=='wordrace':
                if t['id']!=s.get('active_team'): raise GameError('Een ander team is aan de beurt.',403)
                word=data.get('word'); mark=data.get('mark')
                if type(word) is not int or not 0<=word<5 or mark not in ('correct','skip'): raise GameError('Ongeldig woord of oordeel.')
                if str(word) in s['word_marks']: raise GameError('Dit woord is al afgehandeld.',409)
                s['word_marks'][str(word)]=mark
                if len(s['word_marks'])==5: self._reveal()
            else: raise GameError('Dit spel gebruikt opdrachten.')
            self._save(); return self.view(key,'team')
    def late_buzz(self,key,data):
        """Keep presses within an 80ms arrival window visible; host resolves near ties."""
        with self.lock:
            t=self.team(key); s=self.s; t['last_seen']=self.clock(); self._check()
            if s['mode']=='buzzer' and s['phase']=='buzzed' and data.get('question_id')==s['question_id'] and t['id'] not in s['attempted'] and not t.get('spectator') and self.clock()*1000-s['buzzes'][0]['ms']<=80 and all(b['team_id']!=t['id'] for b in s['buzzes']):
                s['buzzes'].append({'team_id':t['id'],'name':t['name'],'ms':round(self.clock()*1000)}); self._save(); return self.view(key,'team')
            return self.answer(key,data)
    def claim(self,key,data):
        with self.lock:
            team=self.team(key); task=next((t for t in self.s['tasks'] if t['id']==data.get('task_id')),None)
            if self.s['mode']!='city' or not task: raise GameError('Opdracht niet beschikbaar.')
            owner=clean_text(data.get('owner',''),50)
            if not owner: raise GameError('Vul een naam van je subgroepje in.')
            k=team['id']+':'+task['id']; current=self.s['claims'].get(k)
            if current and current!=owner: raise GameError('Deze opdracht is al opgepakt door '+current,409)
            if data.get('release'): self.s['claims'].pop(k,None)
            else: self.s['claims'][k]=owner
            self._save(); return self.view(key,'team')
    def submit(self,key,data):
        with self.lock:
            team=self.team(key); s=self.s
            if s['mode']!='city' or s['phase']!='city': raise GameError('De stadskwis neemt nu geen inzendingen aan.',409)
            task=next((t for t in s['tasks'] if t['id']==data.get('task_id')),None)
            if not task: raise GameError('Opdracht niet gevonden.')
            submission_id=str(data.get('id',''))
            try: uuid.UUID(submission_id)
            except (ValueError,AttributeError): raise GameError('Ongeldig inzendnummer.')
            if submission_id in s['submissions']:
                if s['submissions'][submission_id]['team_id']!=team['id']: raise GameError('Onbekende inzending.',403)
                return {'saved':True,'duplicate':True}
            old=next((x for x in s['submissions'].values() if x['team_id']==team['id'] and x['task_id']==task['id']),None)
            if old and old['status']!='rejected': raise GameError('Voor deze opdracht staat al een inzending klaar. Laat de spelleider die eerst beoordelen.',409)
            evidence=s.get('evidence') or {'mode':'app','link':''}
            via_whatsapp=data.get('via_whatsapp') is True
            if via_whatsapp and evidence.get('mode') not in ('whatsapp','both'): raise GameError('WhatsApp-bewijs is niet ingeschakeld.')
            answer=clean_text(data.get('answer',''),3000); photo=data.get('photo',''); photo_id=None
            if photo:
                if not isinstance(photo,str) or not photo.startswith('data:image/jpeg;base64,'): raise GameError('Alleen verkleinde JPEG-foto’s zijn toegestaan.')
                try: raw=base64.b64decode(photo.split(',',1)[1],validate=True)
                except ValueError: raise GameError('Ongeldige foto.')
                if len(raw)>600000 or not raw.startswith(b'\xff\xd8\xff'): raise GameError('Foto is te groot of ongeldig.')
                photo_id=str(uuid.uuid4()); folder=self.directory/'media'; folder.mkdir(exist_ok=True); (folder/(photo_id+'.jpg')).write_bytes(raw)
            if task['kind']=='photo' and not photo_id and not via_whatsapp: raise GameError('Voeg een foto toe voor deze opdracht.')
            if not answer and not photo_id and not via_whatsapp: raise GameError('Vul een antwoord in of voeg een foto toe.')
            if old: del s['submissions'][old['id']]
            s['submissions'][submission_id]={'id':submission_id,'team_id':team['id'],'team_name':team['name'],'task_id':task['id'],'answer':answer,'photo_id':photo_id,'via_whatsapp':via_whatsapp,'owner':clean_text(data.get('owner',''),50),'status':'pending','points':0,'at':self.clock(),'note':''}
            self._save(); return {'saved':True}

class Handler(BaseHTTPRequestHandler):
    server_version='Groepsspel/0.5'
    def log_message(self,*args): pass
    @property
    def game(self): return self.server.game
    def token(self): return self.headers.get('Authorization','').removeprefix('Bearer ')
    def json_response(self,data,status=200):
        body=json.dumps(data,ensure_ascii=False).encode(); self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); self.end_headers(); self.wfile.write(body)
    def may_manage(self):
        """Mag deze browser de spelleiding zien? Lokaal: alleen de server-pc zelf."""
        return self.client_address[0] in ('127.0.0.1','::1')

    def expected_origins(self): return ['http://'+self.headers.get('Host','')]
    def check_host(self):
        name=self.headers.get('Host','').rsplit(':',1)[0]
        if name in ('localhost','127.0.0.1',os.environ.get('GROEPSSPEL_DEV_HOST','')): return
        try:
            if ipaddress.ip_address(name).is_private: return
        except ValueError: pass
        raise GameError('Gebruik het lokale adres van de server.',403)
    def spel(self,gid):
        g=self.game.games.get(gid)
        if not g: raise GameError('Onbekend spel.',404)
        return g
    def send_web(self,name):
        file=ROOT/'web'/name; data=file.read_bytes()
        if name.endswith('.html') and getattr(self.server,'rooms',None) is not None: data=data.replace(b'<html lang="nl"',b'<html lang="nl" data-online="1"',1)   # 0.19.5
        self.send_response(200); self.send_header('Content-Type',mimetypes.guess_type(file.name)[0] or 'application/octet-stream'); self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Referrer-Policy','no-referrer'); self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob:; media-src 'self' blob: https://stream.qmusic.nl https://*.qmusic.nl https://*.triple-it.nl; base-uri 'none'; frame-ancestors 'self'"); self.end_headers(); self.wfile.write(data)
    def send_file(self,file,mime):
        if not file.is_file(): raise GameError('Bestand ontbreekt.',404)
        size=file.stat().st_size; start=0; end=size-1; partial=False
        match=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers.get('Range',''))
        if match:
            start=int(match[1]); end=min(size-1,int(match[2]) if match[2] else size-1); partial=True
            if start>end: raise GameError('Ongeldig bereik.',416)
        self.send_response(206 if partial else 200); self.send_header('Content-Type',mime); self.send_header('Content-Length',str(end-start+1)); self.send_header('Accept-Ranges','bytes'); self.send_header('Cache-Control','private, max-age=3600'); self.send_header('X-Content-Type-Options','nosniff')
        if partial: self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.end_headers()
        with file.open('rb') as stream:
            stream.seek(start); remaining=end-start+1
            while remaining:
                chunk=stream.read(min(65536,remaining))
                if not chunk: break
                self.wfile.write(chunk); remaining-=len(chunk)
    def join_player(self):
        code = parse_qs(urlsplit(self.path).query).get('code', [''])[0]
        if urlsplit(self.path).path == '/zoek-spel':
            games = self.game.find_player_games()
            links = ''.join(f'<li><a href="{path}?code={code}">{escape(title)}</a></li>' for title, path, code in games)
            content = ('<h1>Kies jullie spel</h1><ul>' + links + '</ul>' if links else
                       '<h1>De spelserver is gevonden</h1><p>Er staat nog geen spel klaar.</p>')
            return self.player_page(content + '<p><a href="/zoek-spel">Opnieuw zoeken</a></p>', 200)
        routes = self.game.player_routes(code) if re.fullmatch(r'[0-9]{6}', code) else []
        if len(routes) == 1:
            self.send_response(302)
            self.send_header('Location', routes[0][1] + '?code=' + code)
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return
        if routes:
            links = ''.join(f'<li><a href="{path}?code={code}">{escape(title)}</a></li>' for title, path in routes)
            content = '<h1>Kies jullie spel</h1><ul>' + links + '</ul>'
        else:
            content = '<h1>Spelcode niet gevonden</h1><p>Controleer het serveradres en de zes cijfers op het scherm van de spelleider.</p>'
        self.player_page(content, 200 if routes else 404)

    def player_page(self, content, status):
        page = ('<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" '
                'content="width=device-width, initial-scale=1"><title>Groepsspel · Meedoen</title>'
                '<link rel="stylesheet" href="/style.css"><main class="panel">' + content +
                '<p><a href="/app/#meedoen">Terug naar Meedoen met spelcode</a></p></main></html>').encode()
        self.send_response(status)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(page)

    def do_GET(self):
        path=urlsplit(self.path).path
        try:
            self.check_host()
            if path in ('/meedoen', '/zoek-spel'): return self.join_player()
            m=re.fullmatch(r'/spel/([a-z0-9]+)(?:/(speler|scherm))?/?',path)
            if m and m[1] in self.game.games:
                return self.send_web('games.html')
            if path in ('/games.js','/games.css'): return self.send_web(path[1:])
            if path=='/api/uitleg': return self.json_response(json.loads((ROOT/'uitleg.json').read_text('utf-8')))
            m=re.fullmatch(r'/api/spel/([a-z0-9]+)/view',path)
            if m:
                g=self.spel(m[1]); role=parse_qs(urlsplit(self.path).query).get('role',['public'])[0]
                return self.json_response(g.view(self.token(),role))
            m=re.fullmatch(r'/api/spel/([a-z0-9]+)/media/([0-9a-f-]{36}\.[a-z0-9]{3,4})',path)
            if m:
                g=self.spel(m[1]); q=parse_qs(urlsplit(self.path).query)
                with self.game.lock:
                    host_ok=False
                    try: self.game.host(q.get('k',[''])[0]); host_ok=True
                    except GameError: pass
                    sub=g.media_allowed(m[2],q.get('t',[''])[0],host_ok) if hasattr(g,'media_allowed') else None
                    if not sub: raise GameError('Bestand niet gevonden.',404)
                return self.send_file(g.media_dir()/m[2],sub['mime'])
            if path=='/api/traitors/view':
                role=parse_qs(urlsplit(self.path).query).get('role',['public'])[0]
                return self.json_response(self.game.traitors.view(self.token(),role))
            if path=='/api/show/view':
                role=parse_qs(urlsplit(self.path).query).get('role',['public'])[0]
                return self.json_response(self.game.phone.view(self.token(),role))
            if path.startswith('/show-audio/'):
                ident=path.rsplit('/',1)[-1]
                with self.game.lock:
                    show=self.game.phone.s
                    song=next((x for x in show['songs'] if x['id']==ident),None)
                    allowed=show.get('current',{}).get('id')==ident and show.get('phase') in ('listen','challenge')
                    if not song or not allowed: raise ShowError('Dit nummer is nu niet beschikbaar.',404)
                    file=self.game.directory/'show-audio'/ident
                    if not file.is_file(): raise ShowError('Muziekbestand ontbreekt.',404)
                    size=file.stat().st_size; start=0; end=size-1; partial=False
                    if self.headers.get('Range'):
                        match=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers['Range'])
                        if match:
                            start=int(match[1]); end=min(size-1,int(match[2]) if match[2] else size-1); partial=True
                            if start>end: raise ShowError('Ongeldig audiobereik.',416)
                    self.send_response(206 if partial else 200); self.send_header('Content-Type',song['mime']); self.send_header('Content-Length',str(end-start+1)); self.send_header('Accept-Ranges','bytes'); self.send_header('Cache-Control','no-store')
                    if partial: self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
                    self.end_headers()
                with file.open('rb') as stream:
                    stream.seek(start); remaining=end-start+1
                    while remaining:
                        chunk=stream.read(min(65536,remaining))
                        if not chunk: break
                        self.wfile.write(chunk); remaining-=len(chunk)
                return
            if path=='/api/bootstrap':
                if self.client_address[0] not in ('127.0.0.1','::1'): raise GameError('Open de spelleider op de server-pc via localhost.',403)
                return self.json_response({'host_key':self.game.s['host_key'],'urls':self.server.lan_urls})
            if path=='/api/groep/namen': return self.json_response(self.game.roster_public())
            if path=='/api/taal': return self.json_response({'lang':i18n.valid(self.game.s.get('lang','nl'))})
            if path=='/api/uitslagen':
                if not self.may_manage(): raise GameError('Alleen de spelleider kan de uitslagen ophalen.',403)
                return self.json_response({'results':self.game.finished_results()})
            if path=='/api/lopend':
                # 0.14: lopende telefoonspellen voor 'Spel hervatten' in de app. Alleen voor de spelleider.
                if not self.may_manage(): raise GameError('Alleen de spelleider kan lopende spellen zien.',403)
                return self.json_response({'games':self.game.running_games()})
            if path=='/api/public': return self.json_response(self.game.view())
            if path=='/api/team': return self.json_response(self.game.view(self.token(),'team'))
            if path=='/api/host': return self.json_response(self.game.view(self.token(),'host'))
            if path=='/api/question-image':
                key = parse_qs(urlsplit(self.path).query).get('id', [''])[0]
                with self.game.lock:
                    state = self.game.s
                    if key != state['question_id'] or state['phase'] not in ('open','buzzed','pick','reveal','paused'):
                        raise GameError('Deze afbeelding hoort niet bij de actieve vraag.', 404)
                    source = (state.get('question') or {}).get('image')
                    if not source: raise GameError('Geen vraagfoto beschikbaar.', 404)
                    media, encoding = source.split(',', 1)
                    body = base64.b64decode(encoding, validate=True)
                self.send_response(200)
                self.send_header('Content-Type', media[5:].split(';')[0])
                self.send_header('X-Content-Type-Options','nosniff')
                self.send_header('Cache-Control','private, max-age=60')
                self.send_header('Content-Length',str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if path=='/api/ping': return self.json_response({'time':self.game.clock(),'product':'groepsspel','version':VERSION})
            if path in ('/tv','/tv/'): return self.send_web('tv.html')
            if path=='/tv.js': return self.send_web('tv.js')
            if path=='/api/tv': return self.json_response(self.game.tv_view())
            if path=='/api/lan': return self.json_response({'urls':getattr(self.server,'lan_urls',[])})
            if path=='/api/stage': return self.json_response({'stage':self.game.tv['stage'],'at':self.game.tv['stage_at']})
            if path=='/api/export':
                self.game.host(self.token()); result=self.game.view(self.token(),'host'); result['exported_at']=time.time(); return self.json_response(result)
            if path.startswith('/media/'):
                media_id=path.rsplit('/',1)[-1]
                with self.game.lock:
                    try: self.game.host(self.token()); team=None
                    except GameError: team=self.game.team(self.token())
                    item=next((x for x in self.game.s['submissions'].values() if x['photo_id']==media_id and (team is None or x['team_id']==team['id'])),None)
                    if not item: raise GameError('Foto niet gevonden.',404)
                    data=(self.game.directory/'media'/(media_id+'.jpg')).read_bytes()
                self.send_response(200); self.send_header('Content-Type','image/jpeg'); self.send_header('Cache-Control','no-store'); self.end_headers(); self.wfile.write(data); return
            if path=='/app':
                self.send_response(302); self.send_header('Location','/app/'); self.end_headers(); return
            if path.startswith('/app/'):
                root=(ROOT/'pwa').resolve(); relative=path.removeprefix('/app').lstrip('/') or 'index.html'; file=(root/relative).resolve()
                if root not in file.parents or not file.is_file(): raise GameError('Appbestand niet gevonden.',404)
                data=file.read_bytes(); self.send_response(200); self.send_header('Content-Type','application/manifest+json' if file.suffix=='.webmanifest' else mimetypes.guess_type(file.name)[0] or 'application/octet-stream'); self.send_header('Cache-Control','no-cache'); self.send_header('X-Content-Type-Options','nosniff'); self.end_headers(); self.wfile.write(data); return
            files={'/verraders':'traitors.html','/verraders/':'traitors.html','/verraders/speler':'traitors.html','/verraders/scherm':'traitors.html','/traitors.js':'traitors.js','/traitors.css':'traitors.css','/shows':'phone-shows.html','/controller':'phone-shows.html','/screen':'phone-shows.html','/phone-shows.js':'phone-shows.js','/show-style.css':'style.css','/phone-shows.css':'phone-shows.css','/':'index.html','/host':'index.html','/team':'index.html','/display':'index.html','/app.js':'app.js','/style.css':'style.css','/qr.js':'qr.js','/icon.svg':'icon.svg'}
            if path not in files: raise GameError('Pagina niet gevonden.',404)
            file=ROOT/'web'/files[path]; data=file.read_bytes()
            if file.suffix=='.html' and getattr(self.server,'rooms',None) is not None: data=data.replace(b'<html lang="nl"',b'<html lang="nl" data-online="1"',1)   # 0.19.5: online-teksten
            self.send_response(200); self.send_header('Content-Type',mimetypes.guess_type(file.name)[0] or 'application/octet-stream'); self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Referrer-Policy','no-referrer'); self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob:; media-src 'self' blob: https://stream.qmusic.nl https://*.qmusic.nl https://*.triple-it.nl; base-uri 'none'; frame-ancestors 'self'"); self.end_headers(); self.wfile.write(data)
        except (GameError,ShowError,TraitorsError,PlayError) as e: self.json_response({'error':e.message},e.status)
        except (BrokenPipeError,ConnectionResetError): pass
    def do_POST(self):
        try:
            self.check_host()
            origin=self.headers.get('Origin')
            if origin and origin not in self.expected_origins(): raise GameError('Verzoek vanaf een andere website geweigerd.',403)
            path=urlsplit(self.path).path
            m=re.fullmatch(r'/api/spel/([a-z0-9]+)/upload',path)
            if m:
                g=self.spel(m[1])
                if not hasattr(g,'upload'): raise GameError('Dit spel kent geen uploads.',404)
                size=int(self.headers.get('Content-Length','0') or 0)
                if not 0<size<=MAX_MEDIA: raise PlayError('Bestand is leeg of groter dan 40 MB. Neem een kortere video op.',413)
                raw=self.rfile.read(size)
                if len(raw)!=size: raise PlayError('Upload onvolledig. Probeer het opnieuw.')
                return self.json_response(g.upload(self.token(),self.headers,raw))
            if path=='/api/show/upload':
                self.game.host(self.token())
                if not 0<int(self.headers.get('Content-Length','0'))<=40*1024*1024: raise ShowError('Gebruik audio tot 40 MB.',413)
                mime=self.headers.get('Content-Type','').split(';')[0]
                if mime not in ('audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/mp4','audio/aac','audio/flac','audio/webm'): raise ShowError('Gebruik MP3, WAV, OGG, M4A, AAC of FLAC.')
                try: meta=json.loads(base64.b64decode(self.headers.get('X-Show-Meta',''),validate=True))
                except (ValueError,UnicodeError): raise ShowError('Ongeldige muziekgegevens.')
                if not isinstance(meta,dict): raise ShowError('Ongeldige muziekgegevens.')
                title=clean_text(meta.get('title',''),150); artist=clean_text(meta.get('artist',''),150); year=meta.get('year')
                if not title or not artist or type(year) is not int or not 1900<=year<=2100: raise ShowError('Vul titel, artiest en uitgavejaar in.')
                with self.game.lock:
                    show=self.game.phone.s
                    if show['mode']: raise ShowError('Voeg muziek toe in de lobby.')
                    if len(show['songs'])>=200: raise ShowError('Maximaal 200 nummers.')
                    ident=str(uuid.uuid4()); folder=self.game.directory/'show-audio'; folder.mkdir(exist_ok=True)
                    raw=self.rfile.read(int(self.headers['Content-Length']))
                    if len(raw)!=int(self.headers['Content-Length']): raise ShowError('Audio is onvolledig ontvangen.')
                    (folder/ident).write_bytes(raw); show['songs'].append({'id':ident,'title':title,'artist':artist,'year':year,'mime':mime}); self.game.phone.save()
                return self.json_response({'saved':True,'id':ident})
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<1200000: raise GameError('Verzoek is leeg of te groot.',413)
            if not self.headers.get('Content-Type','').startswith('application/json'): raise GameError('JSON vereist.',415)
            data=json.loads(self.rfile.read(length)); path=urlsplit(self.path).path
            if not isinstance(data,dict): raise GameError('Ongeldige invoer.')
            m=re.fullmatch(r'/api/spel/([a-z0-9]+)/(join|host|player|sync)',path)
            if m:
                g=self.spel(m[1]); kind=m[2]
                result=g.join(data) if kind=='join' else g.host_request(self.token(),data) if kind=='host' else g.player_request(self.token(),data) if kind=='player' else g.sync(self.token(),data)
                if kind=='host': self.game.tv_focus(f'/spel/{m[1]}/scherm')
            elif path=='/api/groep':
                self.game.host(self.token()); result=self.game.set_roster(data)
            elif path=='/api/taal':
                # 0.15: de taal van de spelleider is de standaardtaal voor de telefoons van de spelers
                result={'ok':False,'lang':i18n.valid(self.game.s.get('lang','nl'))}
                if self.may_manage(): result={'ok':True,'lang':self.game.set_lang(data.get('lang'))}
            elif path=='/api/traitors/join': result=self.game.traitors.join(data)
            elif path=='/api/traitors/host': result=self.game.traitors.host_request(self.token(),data); self.game.tv_focus('/verraders/scherm')
            elif path=='/api/traitors/player': result=self.game.traitors.player_action(self.token(),data)
            elif path=='/api/show/join': result=self.game.phone.join(data)
            elif path=='/api/show/action': result=self.game.phone.action(self.token(),data); self.game.tv_focus('/screen')
            elif path=='/api/desktop-stop':
                if self.client_address[0] not in ('127.0.0.1','::1'): raise GameError('Afsluiten kan alleen op de server-pc.',403)
                self.game.host(self.token()); result={'stopped':True}; threading.Timer(.2,self.server.shutdown).start()
            elif path=='/api/stage':
                if self.client_address[0] not in ('127.0.0.1','::1'): raise GameError('Alleen vanaf de spelleider-pc.',403)
                result=self.game.tv_stage(data.get('stage'))
            elif path=='/api/open-tv':
                if self.client_address[0] not in ('127.0.0.1','::1'): raise GameError('Alleen vanaf de spelleider-pc.',403)
                result=open_tv_window()
            elif path=='/api/join': result=self.game.join(data)
            elif path=='/api/tv-intro-ready': result=self.game.tv_intro_ready(data.get('intro_id'))
            elif path=='/api/tv-status': result=self.game.tv_report(data.get('status'))
            elif path=='/api/action':
                data.setdefault('intro', True)
                result=self.game.action(self.token(),data)
                self.game.tv_focus('/display')
            elif path=='/api/answer': result=self.game.late_buzz(self.token(),data)
            elif path=='/api/claim': result=self.game.claim(self.token(),data)
            elif path=='/api/submit': result=self.game.submit(self.token(),data)
            else: raise GameError('Onbekende actie.',404)
            self.json_response(result)
        except (GameError,ShowError,TraitorsError,PlayError) as e: self.json_response({'error':e.message},e.status)
        except (ValueError,TypeError,KeyError): self.json_response({'error':'Ongeldige invoer.'},400)
        except (BrokenPipeError,ConnectionResetError): pass

def open_tv_window():
    """0.15.4: het TV-scherm openen als apart venster op de tweede monitor (Windows-app)."""
    desktop=ROOT/'desktop.py'
    if sys.platform!='win32' or not desktop.is_file(): return {'ok':False,'url':'/tv'}
    exe=Path(sys.executable); exe=exe.with_name('pythonw.exe') if exe.with_name('pythonw.exe').is_file() else exe
    import subprocess
    subprocess.Popen([str(exe),'-I','-S','-X','utf8',str(desktop),'--tv'],cwd=str(ROOT),creationflags=0x08000000,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return {'ok':True,'url':'/tv'}

def local_addresses(port):
    """Adressen waarop telefoons de pc kunnen bereiken. 0.15.3: het adres van de standaardroute (de echte
    wifi/kabel) eerst; virtuele adapters (Hyper-V/WSL 172.x, VirtualBox 192.168.56.x) en 169.254.x achteraan of weg.
    Voorheen stond het alfabetisch eerste adres bovenaan, vaak een virtuele adapter die de telefoon niet kan bereiken."""
    found=[]
    try:
        probe=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
        try:
            probe.connect(('10.255.255.255',1)); found.append(probe.getsockname()[0])   # er wordt niets verstuurd
        finally: probe.close()
    except OSError: pass
    try:
        for item in socket.getaddrinfo(socket.gethostname(),None,socket.AF_INET): found.append(item[4][0])
    except OSError: pass
    def usable(ip):
        try: a=ipaddress.ip_address(ip)
        except ValueError: return False
        return not (a.is_loopback or a.is_link_local or a.is_unspecified or a.is_multicast)
    def rank(ip):
        if ip.startswith('192.168.56.'): return 3                       # VirtualBox host-only
        if ip.startswith('192.168.') or ip.startswith('10.'): return 1
        if ipaddress.ip_address(ip).is_private: return 2                # 172.16–31: vaak Hyper-V/WSL/Docker
        return 4
    primary=found[0] if found and usable(found[0]) else None
    rest=sorted({ip for ip in found if usable(ip) and ip!=primary},key=lambda ip:(rank(ip),ip))
    return ['http://'+ip+':'+str(port) for ip in ([primary] if primary else [])+rest]

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--port',type=int,default=8765); parser.add_argument('--bind',default='0.0.0.0'); parser.add_argument('--no-browser',action='store_true'); parser.add_argument('--data',default=str(ROOT/'.data')); parser.add_argument('--app',action='store_true'); parser.add_argument('--online',action='store_true',help='Online spelserver met spelkamers (achter https)'); parser.add_argument('--public-url',default=os.environ.get('GROEPSSPEL_PUBLIC_URL','') or os.environ.get('RENDER_EXTERNAL_URL','')); parser.add_argument('--max-rooms',type=int,default=int(os.environ.get('GROEPSSPEL_MAX_ROOMS','200'))); parser.add_argument('--trust-proxy',action='store_true',help='Gebruik X-Forwarded-For van de https-proxy'); args=parser.parse_args()
    if args.online:
        import online; online.serve(args); return
    packs=json.loads((ROOT/'questions.json').read_text('utf-8')); tasks=json.loads((ROOT/'tasks.json').read_text('utf-8'))
    server=ThreadingHTTPServer((args.bind,args.port),Handler); server.daemon_threads=True; server.game=Game(args.data,packs,tasks); server.lan_urls=local_addresses(server.server_port)
    address='http://127.0.0.1:'+str(server.server_port)+('/app/' if args.app else '/host')
    print('\nGROEPSSPEL LOKALE SERVER\nSpelleider: '+address+'\nTeamadressen: '+', '.join(server.lan_urls)+'\nLaat dit venster open tijdens het spelen. Stoppen: Ctrl+C.\n',flush=True)
    if not args.no_browser: webbrowser.open(address)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
if __name__=='__main__': main()
