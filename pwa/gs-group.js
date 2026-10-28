/* Groepsspel 0.14 — één groep, hergebruikt in alle spellen op dit apparaat.
 *
 * state.players  [{id,name,guest,team}]  deelnemers (vaste spelers en tijdelijke gasten)
 * state.teams    [{id,name,score}]        teams zoals de spelmotoren ze al kenden (2–6)
 * state.history  uitslagen per gespeeld spel (ook de tabletspellen vanaf 0.14)
 * state.recent   laatst geopende spellen voor Home
 *
 * Klassement: spellen tellen heel verschillend (fiches, seconden, vragen, euro's). Daarom
 * tellen we nooit ruwe punten van verschillende spellen op. Per gespeeld spel krijgt iedere
 * deelnemer rangpunten (1e 10, 2e 8, 3e 6, 4e 4, 5e 2, verder 1; gelijke stand = gelijke punten,
 * zie GC.ranking). Het groepsklassement is de som van die rangpunten.
 */
(function(){
'use strict';
const COLORS=['#d79e36','#6b9f83','#a48ac7','#cb8264','#6fa2c0','#ba7d9b'];
const DEFAULT_TEAM_NAMES=['Team Rood','Team Blauw','Team Groen','Team Geel','Team Paars','Team Oranje'];
const id=()=>typeof uid==='function'?uid():Date.now().toString(36)+Math.random().toString(36).slice(2);
const busy=()=>!!state.active;

function addPlayer(name,guest=false){name=String(name||'').trim().slice(0,40);if(!name)return 'Vul een naam in.';
 if(state.players.length>=80)return 'Maximaal 80 spelers.';
 if(state.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))return 'Die naam staat al in de groep.';
 state.players.push({id:id(),name,guest:!!guest,team:null});save();return null;}
function removePlayer(pid){state.players=state.players.filter(p=>p.id!==pid);save();}
function toggleGuest(pid){const p=state.players.find(p=>p.id===pid);if(p){p.guest=!p.guest;save();}}
function setTeam(pid,team){const p=state.players.find(p=>p.id===pid);if(!p)return;p.team=state.teams.some(t=>t.id===team)?team:null;save();}
function removeGuests(){state.players=state.players.filter(p=>!p.guest);save();}
/** Maak precies n teams (bestaande teams en hun punten blijven, extra teams worden toegevoegd). */
function ensureTeams(n){if(busy())return 'Rond eerst het lopende spel af.';n=Math.max(1,Math.min(6,n));
 const used=new Set(state.teams.map(t=>t.name.toLowerCase()));
 for(const name of DEFAULT_TEAM_NAMES){if(state.teams.length>=n)break;if(!used.has(name.toLowerCase()))state.teams.push({id:id(),name,score:0});}
 save();return null;}
/** Verdeel de spelers willekeurig en eerlijk over n teams. Teams zonder spelers blijven bestaan. */
function distribute(n){if(busy())return 'Rond eerst het lopende spel af voordat je teams wijzigt.';const err=ensureTeams(n);if(err)return err;
 const teams=state.teams.slice(0,n),order=typeof shuffle==='function'?shuffle(state.players):[...state.players];
 order.forEach((p,i)=>{p.team=teams[i%teams.length].id;});save();return null;}
function members(teamId){return state.players.filter(p=>p.team===teamId);}
function size(){return state.players.length||state.teams.length*2||0;}
/** Hoeveel deelnemers (spelers of, zonder spelerslijst, teams) zijn er. */
function participants(){return state.players.length?state.players.map(p=>p.name):state.teams.map(t=>t.name);}

function touch(gameId){if(!GAMES.some(g=>g.id===gameId))return;state.recent=[{gameId,at:Date.now()},...(state.recent||[]).filter(r=>r.gameId!==gameId)].slice(0,12);save();}

/* Tabletspellen hebben hun eigen spelers; leg de einduitslag één keer vast in de geschiedenis. */
function recordTablet(){let changed=false;
 const add=(key,name,gameId,results)=>{if(state.history.some(h=>h.id===key))return;state.history.push({id:key,name,gameId,at:Date.now(),rounds:1,unit:'spel',results,countsForWeekend:true,note:'Tabletspel'});changed=true;};
 const b=state.board;
 if(b?.phase==='finished'&&Array.isArray(b.results))add('ticket-'+GS.hash(JSON.stringify(b.results.map(r=>[r.name,r.score]))+(b.turns||0)),'Sporen door Limburg','ticket',b.results.map(r=>({name:r.name,score:r.score})));
 const m=GS.ls.json('groepsspel-monopoly');
 if(m?.phase==='finished'&&m.result?.ranking)add('monopoly-'+GS.hash(JSON.stringify(m.result.ranking)+(m.round||0)),'Rijk van Limburg','monopoly',m.result.ranking.map(r=>({name:r.name,score:r.worth})));
 if(changed)save();}

/** Rangpunten per spel en het totaal per naam. */
function standings(){const rows=new Map(),games=[];
 for(const h of state.history){if(h.countsForWeekend===false||!Array.isArray(h.results)||h.results.length<2)continue;
  const ranked=GC.ranking(h.results.map(r=>({name:r.name,score:Number(r.score)||0})));games.push({...h,ranked});
  for(const r of ranked){const k=r.name.toLowerCase();const row=rows.get(k)||{name:r.name,points:0,games:0,wins:0};row.points+=r.weekend;row.games++;if(r.rank===1)row.wins++;rows.set(k,row);}}
 const list=[...rows.values()].sort((a,b)=>b.points-a.points||b.wins-a.wins||a.name.localeCompare(b.name,'nl'));
 list.forEach((r,i)=>{r.rank=list.filter(x=>x.points>r.points).length+1;void i;});
 return {list,games};}

GS.define('group',{COLORS,DEFAULT_TEAM_NAMES,addPlayer,removePlayer,toggleGuest,setTeam,removeGuests,ensureTeams,distribute,members,size,participants,touch,recordTablet,standings});
})();
