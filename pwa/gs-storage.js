/* Groepsspel 0.14 — één opslag- en reservekopiesysteem.
 *
 * Wat er in een reservekopie (formaat 2) zit:
 *   state      groep, teams, spelers, scores, geschiedenis, planning, eigen vragen, muzieklijst,
 *              lopend quiz-/showspel (active), Sporen door Limburg (board), missies (mission)
 *   monopoly   lopend of afgerond Rijk van Limburg + de laatste ongedaan-maakstap
 *   prefs      taal, thema, geluid, showpakket, tv-podium, stadskwispakket
 * Niet in de reservekopie: eigen foto's/audio (IndexedDB, te groot) en telefoonspellen op de
 * spelserver (die bewaart de server zelf in zijn datamap en hervat na een herstart).
 * Geheimen van de spelserver (beheersleutels, teamcodes) staan nooit in de app-opslag en dus
 * ook nooit in een reservekopie.
 */
(function(){
'use strict';
const {ls}=GS;
const STATE_KEY='groepsspel-v1',MONO_KEY='groepsspel-monopoly',MONO_UNDO='groepsspel-monopoly-undo';
const PREV_KEY='groepsspel-vorige-toestand',NOTICE_KEY='groepsspel-herstelmelding';
const PREFS=['groepsspel-language','groepsspel-theme','groepsspel-sound','groepsspel-show-pack','groepsspel-tv-stage','groepsspel-city-pack','groepsspel-evidence-links','groepsspel-uitleg-gelezen'];
const FORMAT='groepsspel-reservekopie',FORMAT_VERSION=2,MAX_BYTES=8e6;

function monoValid(m){return !!m&&typeof m==='object'&&(m.phase==='finished'||!!window.VASTGOED?.valid?.(m));}

/** Alle gegevens van dit apparaat in één object. */
function collect(){
  try{if(typeof syncTimer==='function')syncTimer();}catch{}
  const prefs={};for(const k of PREFS){const v=ls.get(k);if(v!=null)prefs[k]=v;}
  const data={state:JSON.parse(JSON.stringify(state)),monopoly:ls.json(MONO_KEY),monopolyUndo:ls.json(MONO_UNDO),prefs};
  const body=JSON.stringify(data);
  return {format:FORMAT,formatVersion:FORMAT_VERSION,appVersion:GS.version,createdAt:new Date().toISOString(),checksum:GS.hash(body),data};
}

/** Controleer een reservekopie zonder iets te wijzigen. Geeft een rapport terug. */
function inspect(raw){
  const report={ok:false,error:null,kind:null,restore:{},lost:[],kept:[],createdAt:null,appVersion:null};
  if(!raw||typeof raw!=='object'){report.error='Dit is geen reservekopie van Groepsspel.';return report;}
  let data;
  if(raw.format===FORMAT){
    if(!Number.isInteger(raw.formatVersion)||raw.formatVersion>FORMAT_VERSION){report.error=`Deze reservekopie is gemaakt met een nieuwere versie van Groepsspel (${GS.esc(raw.appVersion||'onbekend')}). Werk de app eerst bij.`;return report;}
    if(!raw.data||typeof raw.data!=='object'){report.error='De reservekopie is onvolledig.';return report;}
    if(raw.checksum&&raw.checksum!==GS.hash(JSON.stringify(raw.data))){report.error='De reservekopie is beschadigd of met de hand aangepast. Gebruik een ander bestand.';return report;}
    data=raw.data;report.kind='v2';report.createdAt=raw.createdAt||null;report.appVersion=raw.appVersion||null;
  }else if(raw.version===1&&Array.isArray(raw.teams)){
    data={state:raw,monopoly:null,monopolyUndo:null,prefs:{}};report.kind='v1';
  }else{report.error='Dit is geen reservekopie van Groepsspel.';return report;}

  const clean=GC.safeState(data.state,GAMES);
  if(!clean){report.error='De groepsgegevens in de reservekopie zijn ongeldig.';return report;}
  const s=data.state;
  const count=(label,a,b)=>{if(Array.isArray(a)&&Array.isArray(b)&&a.length!==b.length)report.lost.push(`${a.length-b.length} van ${a.length} ${label}`);};
  count('teams',s.teams,clean.teams);count('uitslagen',s.history,clean.history);count('eigen vragen',s.custom,clean.custom);count('planningsregels',s.plan,clean.plan);
  if(s.board&&!clean.board)report.lost.push('de speelstand van Sporen door Limburg');
  if(s.active&&!clean.active)report.lost.push('het lopende quiz-/showspel ('+GS.esc(GAMES.find(g=>g.id===s.active?.gameId)?.name||'onbekend spel')+')');
  if(s.mission&&!clean.mission)report.lost.push('de lopende missieronde');
  report.restore.state=clean;
  report.kept.push(`${clean.teams.length} teams`,`${clean.players.length} spelers`,`${clean.history.length} uitslagen`);
  if(clean.board)report.kept.push('Sporen door Limburg (lopend)');
  if(clean.active)report.kept.push(GS.esc(GAMES.find(g=>g.id===clean.active.gameId)?.name||'spel')+' (lopend)');
  if(clean.mission)report.kept.push('missieronde');
  if(data.monopoly!=null){if(monoValid(data.monopoly)){report.restore.monopoly=data.monopoly;report.restore.monopolyUndo=monoValid(data.monopolyUndo)?data.monopolyUndo:null;report.kept.push('Rijk van Limburg'+(data.monopoly.phase==='finished'?' (afgerond)':' (lopend)'));}else report.lost.push('de speelstand van Rijk van Limburg');}
  const prefs={};for(const [k,v] of Object.entries(data.prefs||{}))if(PREFS.includes(k)&&typeof v==='string'&&v.length<2e6)prefs[k]=v;
  report.restore.prefs=prefs;report.ok=true;return report;
}

/** Schrijf een gecontroleerd rapport weg en herlaad de app, zodat alle onderdelen de nieuwe stand lezen. */
function apply(report,{reload=true}={}){
  if(!report?.ok)throw Error(report?.error||'Ongeldige reservekopie');
  const before=JSON.stringify(collect());
  api.busy=true;
  if(!ls.set(PREV_KEY,before))console.warn('Vorige toestand kon niet apart bewaard worden (opslag vol).');
  const r=report.restore;
  if(!ls.set(STATE_KEY,JSON.stringify(r.state)))throw Error('Opslaan op dit apparaat lukt niet (opslag vol of geblokkeerd).');
  if(r.monopoly){ls.set(MONO_KEY,JSON.stringify(r.monopoly));if(r.monopolyUndo)ls.set(MONO_UNDO,JSON.stringify(r.monopolyUndo));else ls.del(MONO_UNDO);}
  else if(report.kind==='v2'){ls.del(MONO_KEY);ls.del(MONO_UNDO);}
  for(const [k,v] of Object.entries(r.prefs||{}))ls.set(k,v);
  ls.set(NOTICE_KEY,JSON.stringify({at:Date.now(),kept:report.kept,lost:report.lost}));
  GS.emit('restored',report);
  if(reload)location.reload();
}

function hasPrevious(){return !!ls.get(PREV_KEY);}
function undoRestore(){const raw=ls.json(PREV_KEY);if(!raw)return false;const rep=inspect(raw);if(!rep.ok)return false;apply(rep,{reload:false});ls.del(PREV_KEY);location.reload();return true;}

function fileName(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `groepsspel-reservekopie-${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;}
function download(){
  const blob=new Blob([JSON.stringify(collect(),null,1)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=fileName();document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
  ls.set('groepsspel-laatste-export',String(Date.now()));
}
async function readFile(file){
  if(!file)return {ok:false,error:'Geen bestand gekozen.'};
  if(file.size>MAX_BYTES)return {ok:false,error:'Dit bestand is te groot voor een reservekopie.'};
  let raw;try{raw=JSON.parse(await file.text());}catch{return {ok:false,error:'Dit bestand is geen leesbare reservekopie (geen geldig JSON-bestand).'};}
  return inspect(raw);
}
/** Wis alles van dit apparaat; de vorige toestand blijft één keer terug te zetten. */
function resetAll(){api.busy=true;ls.set(PREV_KEY,JSON.stringify(collect()));ls.del(STATE_KEY);ls.del(MONO_KEY);ls.del(MONO_UNDO);location.reload();}

/** Na een herlaadactie: laat zien wat er is teruggezet. */
function pendingNotice(){const n=ls.json(NOTICE_KEY);if(!n)return null;ls.del(NOTICE_KEY);return Date.now()-n.at<60000?n:null;}

const api=GS.define('storage',{busy:false,collect,inspect,apply,download,readFile,resetAll,undoRestore,hasPrevious,pendingNotice,FORMAT,FORMAT_VERSION,STATE_KEY,MONO_KEY,PREFS,
  lastExport:()=>Number(ls.get('groepsspel-laatste-export'))||null});
})();
/* Twee tabbladen tegelijk open: zonder dit zou het oude tabblad bij sluiten (pagehide → save)
 * de nieuwere stand van het andere tabblad overschrijven. Lees daarom de nieuwe stand opnieuw in. */
window.addEventListener('storage',e=>{if(e.key!==GS.storage.STATE_KEY&&e.key!==GS.storage.MONO_KEY)return;GS.storage.busy=true;location.reload();});
