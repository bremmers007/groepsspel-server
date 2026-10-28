"""Groepsspel local host. Python standard library only; no internet needed for play."""
import argparse, base64, copy, ipaddress, json, mimetypes, os, secrets, socket, threading, time, uuid, webbrowser, unicodedata, random
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
VERSION='0.15.0'
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
        out.append({'id':task_id,'title':title,'prompt':prompt,'location':clean_text(t.get('location','Zelf kiezen'),150),'points':points,'kind':'photo' if t.get('kind')=='photo' else 'text'})
    return out

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
                if len(teams) >= 2:
                    title = {'quiz': 'Pubquiz (telefoons)', 'buzzer': 'Buzzerquiz', 'wordrace': 'Halve Minuut', 'city': 'Stadskwis'}.get(s['mode'], 'Wifi-quiz')
                    out.append({'id': f"lan-{s['room_id']}-{s.get('game_no', 0)}", 'gid': 'lan-' + s['mode'], 'title': title, 'at': self.clock(), 'results': [{'name': t['name'], 'score': t['score']} for t in teams]})
        return out

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
        if self.s['phase'] in ('countdown','open','buzzed') and self.s['mode']!='city' and any(not self._connected(t) for t in self.s['teams'] if not t.get('spectator')):
            self.s['remaining']=max(0,self.s['ends_at']-max(now,self.s['opens_at']))
            self.s['phase']='paused'; self.s['message']='Verbinding met een team weggevallen. Ronde gepauzeerd.'; self._save()
        if self.s['phase']=='countdown' and now>=self.s['opens_at']: self.s['phase']='open'
        if self.s['phase']=='open' and self.s['mode'] in ('quiz','wordrace') and now>=self.s['ends_at']: self._reveal()
    def _public_team(self,t):
        city=sum(x.get('points',0) for x in self.s['submissions'].values() if x['team_id']==t['id'] and x['status']=='approved')
        return {'id':t['id'],'name':t['name'],'score':t['score']+city,'connected':self._connected(t),'spectator':bool(t.get('spectator'))}
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
                if s['phase'] in ('ready','countdown') and role!='host': q=None
                elif role!='host' and s['phase']!='reveal':
                    q.pop('correct',None); q.pop('answers',None)
                if q and s['mode']=='wordrace' and s['phase']!='reveal': q.pop('words',None)
            result={k:copy.deepcopy(s[k]) for k in ['room_id','code','name','mode','phase','index','question_id','opens_at','ends_at','message','seconds','remaining']}
            result.update(server_time=self.clock(),question=q,total=min(len(s['deck']),len([t for t in s['teams'] if not t.get('spectator')])*2) if s['mode']=='wordrace' else len(s['deck']),teams=[self._public_team(t) for t in s['teams']],buzzes=copy.deepcopy(s['buzzes']),answer_count=len(s['answers']))
            if s['mode']=='wordrace':
                result['active_team']=s.get('active_team'); result['word_marks']=copy.deepcopy(s.get('word_marks',{}))
                if me and me['id']==s.get('active_team') and s['phase']=='open': result['private_words']=copy.deepcopy(s['question']['words'])
            if me:
                result['me']={**self._public_team(me),'access_code':me['access_code'],'answer':s['answers'].get(me['id']),'attempted':me['id'] in s['attempted']}
            if s['mode']=='city':
                result['evidence']=evidence_view(s.get('evidence'),role)
                result['tasks']=copy.deepcopy(s['tasks'])
                if role=='host': result['submissions']=list(copy.deepcopy(s['submissions']).values()); result['claims']=copy.deepcopy(s['claims'])
                elif me:
                    result['submissions']=[copy.deepcopy(x) for x in s['submissions'].values() if x['team_id']==me['id']]
                    result['claims']={k.split(':',1)[1]:v for k,v in s['claims'].items() if k.startswith(me['id']+':')}
            if role=='host':
                result['tasks']=copy.deepcopy(s['tasks']); result['answers']=copy.deepcopy(s['answers']); result['packs']={k:len(v) for k,v in self.packs.items()}; result['audit']=s['audit'][-20:]; result['topics']=sorted(set(q.get('topic',q.get('category','Quiz')) for q in self.packs.get('nl',[])))
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
            t={'id':str(uuid.uuid4()),'name':name,'token':secrets.token_urlsafe(24),'access_code':secrets.token_hex(3).upper(),'score':0,'last_seen':self.clock(),'spectator':False}
            self.s['teams'].append(t); self._save(); return {'token':t['token'],'team_id':t['id']}
    def action(self,key,data):
        with self.lock:
            self.host(key); self._check(); s=self.s; act=data.get('action'); now=self.clock()
            if act=='setup':
                mode=data.get('mode')
                if mode not in ('quiz','buzzer','city','wordrace'): raise GameError('Onbekende spelvorm.')
                if s['phase'] not in ('lobby','finished'): raise GameError('Rond eerst het spel af.')
                deck=validate_questions(data['questions']) if data.get('questions') is not None else i18n.for_lang(copy.deepcopy(self.packs.get(data.get('language','nl'),[])),s.get('lang','nl'))
                if mode in ('quiz','buzzer'):
                    count=data.get('count',20)
                    if type(count) is not int or not 1<=count<=200: raise GameError('Kies 1 tot 200 vragen per spel.')
                    topic=clean_text(data.get('topic','all'),100)
                    if topic!='all': deck=[q for q in deck if q.get('topic')==topic or q.get('category')==topic]
                    used=set(s.get('seen_questions',[])); fresh=[q for q in deck if q['q'] not in used]; old=[q for q in deck if q['q'] in used]
                    random.shuffle(fresh); random.shuffle(old); deck=(fresh+old)[:count]
                    if topic=='all' and data.get('questions') is None:
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
                seconds=data.get('seconds',30)
                if type(seconds) is not int or not 5<=seconds<=180: raise GameError('Kies 5 tot 180 seconden.')
                s['game_no']=s.get('game_no',0)+1
                s.update(name=clean_text(data.get('name','Ons spel'),80) or 'Ons spel',mode=mode,evidence={'mode':'app','link':''},deck=deck,index=-1,question=None,question_id='',phase='lobby',answers={},buzzes=[],attempted=[],tasks=tasks,submissions={},claims={},seconds=seconds,message='Spel klaar. Laat teams aansluiten.')
                s['active_team']=None; s['word_marks']={}
                if mode=='wordrace': s['seconds']=30
                for t in s['teams']: t['score']=0
            elif act=='evidence':
                if s['mode']!='city': raise GameError('Bewijskanaal is alleen bij Stadskwis beschikbaar.')
                try: s['evidence']=validate_evidence(data.get('mode','app'),data.get('link',''))
                except PlayError as ex: raise GameError(ex.message)
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
            elif act in ('arm','resume'):
                if s['phase'] not in ('ready','paused'): raise GameError('Deze ronde kan nu niet geopend worden.')
                if any(not self._connected(t) for t in s['teams'] if not t.get('spectator')): raise GameError('Wacht tot alle deelnemende teams verbonden zijn, of zet een afwezig team op toeschouwer.')
                if act=='resume' and s['buzzes']: s['phase']='buzzed'; s['message']='Buzzerstand hersteld. Beoordeel het antwoord.'
                else:
                    seconds=s['remaining'] if act=='resume' else s['seconds']; s.update(phase='countdown',opens_at=now+5,ends_at=now+5+seconds,message='Klaar voor de start…')
            elif act=='pause':
                if s['phase'] in ('countdown','open','buzzed'): s['remaining']=max(0,s['ends_at']-max(now,s['opens_at'])); s['phase']='paused'; s['message']='Gepauzeerd door de spelleider.'
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
                s['word_marks']={}
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
            if s['phase']!='open': raise GameError('Antwoorden zijn nu gesloten.',409)
            if s['mode']=='buzzer':
                if t['id'] in s['attempted']: raise GameError('Dit team heeft al geantwoord.',409)
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
        file=ROOT/'web'/name; data=file.read_bytes(); self.send_response(200); self.send_header('Content-Type',mimetypes.guess_type(file.name)[0] or 'application/octet-stream'); self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Referrer-Policy','no-referrer'); self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"); self.end_headers(); self.wfile.write(data)
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
    def do_GET(self):
        path=urlsplit(self.path).path
        try:
            self.check_host()
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
            if path=='/api/ping': return self.json_response({'time':self.game.clock(),'product':'groepsspel','version':VERSION})
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
            file=ROOT/'web'/files[path]; data=file.read_bytes(); self.send_response(200); self.send_header('Content-Type',mimetypes.guess_type(file.name)[0] or 'application/octet-stream'); self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Referrer-Policy','no-referrer'); self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"); self.end_headers(); self.wfile.write(data)
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
            elif path=='/api/groep':
                self.game.host(self.token()); result=self.game.set_roster(data)
            elif path=='/api/taal':
                # 0.15: de taal van de spelleider is de standaardtaal voor de telefoons van de spelers
                result={'ok':False,'lang':i18n.valid(self.game.s.get('lang','nl'))}
                if self.may_manage(): result={'ok':True,'lang':self.game.set_lang(data.get('lang'))}
            elif path=='/api/traitors/join': result=self.game.traitors.join(data)
            elif path=='/api/traitors/host': result=self.game.traitors.host_request(self.token(),data)
            elif path=='/api/traitors/player': result=self.game.traitors.player_action(self.token(),data)
            elif path=='/api/show/join': result=self.game.phone.join(data)
            elif path=='/api/show/action': result=self.game.phone.action(self.token(),data)
            elif path=='/api/desktop-stop':
                if self.client_address[0] not in ('127.0.0.1','::1'): raise GameError('Afsluiten kan alleen op de server-pc.',403)
                self.game.host(self.token()); result={'stopped':True}; threading.Timer(.2,self.server.shutdown).start()
            elif path=='/api/join': result=self.game.join(data)
            elif path=='/api/action': result=self.game.action(self.token(),data)
            elif path=='/api/answer': result=self.game.late_buzz(self.token(),data)
            elif path=='/api/claim': result=self.game.claim(self.token(),data)
            elif path=='/api/submit': result=self.game.submit(self.token(),data)
            else: raise GameError('Onbekende actie.',404)
            self.json_response(result)
        except (GameError,ShowError,TraitorsError,PlayError) as e: self.json_response({'error':e.message},e.status)
        except (ValueError,TypeError,KeyError): self.json_response({'error':'Ongeldige invoer.'},400)
        except (BrokenPipeError,ConnectionResetError): pass

def local_addresses(port):
    addresses=set()
    try:
        for item in socket.getaddrinfo(socket.gethostname(),None,socket.AF_INET):
            ip=item[4][0]
            if not ip.startswith('127.'): addresses.add(ip)
    except OSError: pass
    return ['http://'+ip+':'+str(port) for ip in sorted(addresses)]

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
