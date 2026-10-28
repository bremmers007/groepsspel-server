/* Groepsspel 0.15 — koppeling tussen 'Mijn groep' en de telefoonspellen op de spelserver.
 * - De groep (spelers, teams) gaat naar de spelserver: op de telefoon tikt iedereen op de eigen naam,
 *   en bij teamspellen staat het team dan al goed.
 * - Afgeronde telefoon- en wifispellen komen terug in de spelgeschiedenis en tellen mee in het klassement
 *   (rangpunten per spel, net als alle andere spellen).
 * Werkt alleen als de app via de spelserver geopend is (Windows-app op de pc, of als spelleider van een
 * online spelkamer). Op Netlify of zonder server doet deze module niets.
 */
(function(){
'use strict';
const esc=GS.esc;
const MAP={moord:'murder',verraders:'traitors',stratego:'strategy',holland:'holland',crazy88:'crazy',smokkel:'smuggle',missies:'missions',opgejaagd:'hunted',bingo:'musicbingo','lan-quiz':'pubquiz','lan-buzzer':'buzz','lan-wordrace':'wordrace','lan-city':'stadskwis'};
let hostKey=null,status={server:null,shared:null,pulled:null,error:''},lastSig='',timer=null;
const onServer=()=>location.protocol!=='file:'&&!/netlify|github\.io/.test(location.hostname);

async function key(){if(hostKey)return hostKey;if(!onServer())return null;
 try{const r=await fetch('/api/bootstrap',{cache:'no-store'});if(!r.ok){status.server=false;return null;}const d=await r.json();hostKey=d.host_key||null;status.server=!!hostKey;return hostKey;}catch{status.server=false;return null;}}
function roster(){const team=id=>state.teams.find(t=>t.id===id)?.name||null;
 return {group:state.name||'',lang:window.GSI18N?.lang||'nl',players:state.players.map(p=>({name:p.name,team:team(p.team)})),teams:state.teams.map(t=>t.name)};}
/** Deel de groep met de spelserver. Geeft true als dat gelukt is. */
async function shareGroup(force=false){const r=roster(),sig=JSON.stringify(r);if(!force&&sig===lastSig)return true;const k=await key();if(!k)return false;
 try{const res=await fetch('/api/groep',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+k},body:sig});if(!res.ok)throw Error((await res.json()).error||res.status);lastSig=sig;status.shared=Date.now();status.error='';return true;}
 catch(e){status.error=String(e.message||e);return false;}}
/** Haal einduitslagen op en zet ze in de geschiedenis (bestaande uitslag met dezelfde id wordt bijgewerkt). */
async function pullResults(){const k=await key();if(!k)return 0;
 try{const res=await fetch('/api/uitslagen',{headers:{Authorization:'Bearer '+k},cache:'no-store'});if(!res.ok)return 0;const d=await res.json();let changed=0;
  for(const r of d.results||[]){const id='srv-'+String(r.id).slice(0,90),entry={id,name:String(r.title||'Telefoonspel').slice(0,100),gameId:MAP[r.gid]||null,at:Math.round((Number(r.at)||Date.now()/1000)*1000),rounds:1,unit:'spel',
    results:(r.results||[]).filter(x=>x&&x.name).map(x=>({name:String(x.name).slice(0,40),score:Number(x.score)||0})).slice(0,80),countsForWeekend:true,note:'Telefoonspel op de spelserver'};
   if(entry.results.length<2)continue;const i=state.history.findIndex(h=>h.id===id);
   if(i<0){state.history.push(entry);changed++;}else if(JSON.stringify(state.history[i].results)!==JSON.stringify(entry.results)){state.history[i]=entry;changed++;}}
  status.pulled=Date.now();if(changed){save();if(['home','group'].includes(route))render();}return changed;}catch{return 0;}}
async function sync(){await shareGroup();await pullResults();updatePanel();}
function updatePanel(){const el=document.querySelector('.gs-srvpanel');if(el)el.outerHTML=panel();}

/* Paneel op Mijn groep */
function panel(){const s=status;
 if(s.server===false||!onServer())return `<section class="panel gs-srvpanel"><h2>Telefoonspellen</h2><p class="e11-small">Open Groepsspel op de server-pc (Windows-app) of als spelleider van een online spelkamer. Dan kunnen spelers op hun telefoon hun naam uit deze groep kiezen en tellen uitslagen van telefoonspellen mee in het klassement.</p></section>`;
 return `<section class="panel gs-srvpanel"><h2>Telefoonspellen</h2><p>${s.shared?`✓ Groep gedeeld met de spelserver (${state.players.length} spelers, ${state.teams.length} teams). Op de telefoon tikt iedereen op de eigen naam.`:'Groep nog niet gedeeld met de spelserver.'}</p>
  <p class="e11-small">${s.pulled?`Uitslagen van telefoonspellen opgehaald om ${new Date(s.pulled).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}; ze tellen mee in het klassement.`:'Uitslagen van afgeronde telefoonspellen komen hier automatisch binnen.'}${s.error?` <span class="gs-warn">${esc(s.error)}</span>`:''}</p>
  <button class="btn small secondary" data-gs-srvsync>Nu bijwerken</button></section>`;}
GS.on('rendered',r=>{if(r==='group'){const at=document.querySelector('#klassement');if(at&&!document.querySelector('.gs-srvpanel'))at.insertAdjacentHTML('beforebegin',panel());}
 if(['group','home'].includes(r)&&onServer()){clearTimeout(timer);timer=setTimeout(sync,400);}});
document.addEventListener('click',async e=>{if(!e.target.closest('[data-gs-srvsync]'))return;await shareGroup(true);await pullResults();updatePanel();toast('Bijgewerkt.');});
/* Vóór het openen van een telefoonspel deelt gs-flow.js eerst de groep (GS.server.shareGroup). */
setInterval(()=>{if(['group','home'].includes(route)&&document.visibilityState==='visible'&&status.server)pullResults();},30000);
GS.define('server',{shareGroup,pullResults,sync,updatePanel,status:()=>({...status}),MAP});
})();
