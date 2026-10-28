/* Groepsspel 0.14 — één spelstart voor alle spellen:
 *   Spel kiezen → (Instellingen) → Spelers → Starten → Spelen → Uitslag
 * Overbodige stappen worden overgeslagen: tabletspellen vragen zelf hun spelers, telefoonspellen
 * laten spelers op hun eigen telefoon aansluiten, spelshows hebben teams nodig.
 * "Snel starten" maakt zo nodig standaardteams en start met de standaardinstellingen.
 * De bestaande spelmotoren en hun instellingenvensters blijven ongewijzigd in gebruik (start(id)).
 */
(function(){
'use strict';
const esc=GS.esc;
/* Spellen van het wifi-spelleiderscherm (/host) en de bijbehorende spelvorm. */
const LAN={pubquiz:'quiz',friends:'quiz',buzz:'buzzer',wordrace:'wordrace',stadskwis:'city'};
let lastServer=null;
async function server(){if(typeof localServerAvailable!=='function')return false;lastServer=await localServerAvailable();return lastServer;}

function steps(m,current){const list=['Spel kiezen','Uitleg & voorbereiding'];if(m.mode==='show')list.push('Spelers & teams','Instellingen');else if(m.mode==='tablet')list.push('Spelers');else list.push('Spelserver','Spelers sluiten aan');list.push('Spelen','Uitslag');
 return `<ol class="gs-steps" aria-label="Stappen">${list.map((s,i)=>`<li class="${i<current?'done':i===current?'now':''}">${esc(s)}</li>`).join('')}</ol>`;}
function facts(m){const C=GS.catalog;return `<ul class="gs-facts">
 <li><span>Spelers</span><strong>${C.range(m.players)}</strong></li>
 <li><span>Duur</span><strong>${esc(C.minutesLabel(m))}</strong></li>
 <li><span>Speelwijze</span><strong>${esc(C.MODES[m.mode].long)}</strong></li>
 <li><span>Moeilijkheid</span><strong>${esc(m.level)}</strong></li>
 <li class="wide"><span>Nodig</span><strong>${esc(m.materials)}</strong></li>
 <li class="wide"><span>Techniek</span><strong>${esc(C.needsLabel(m))}</strong></li></ul>`;}

/** Het startvenster voor elk spel. */
/* 0.14.3: het startvenster blijft kort. Voorbereiding staat altijd open; de volledige uitleg is inklapbaar
 * en staat alleen de eerste keer open. Het vinkje "gelezen" wordt per spel op dit apparaat onthouden. */
const READ_KEY='groepsspel-uitleg-gelezen';
const readSet=()=>new Set(GS.ls.json(READ_KEY,[])||[]);
const isRead=id=>readSet().has(id);
function markRead(id){const r=readSet();r.add(id);GS.ls.set(READ_KEY,JSON.stringify([...r]));}
function guideHtml(id,first){
 const u=GS.guides.get(id);if(!u)return '<p class="gs-warn">De speluitleg is voor dit spel nog niet beschikbaar. Start pas als de spelleider de regels heeft uitgelegd.</p>';
 const bullets=(items,cls='')=>`<ul class="${cls}">${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
 return `<div class="gs-guide" aria-label="Speluitleg en voorbereiding">
  <section class="gs-guide-intro"><h3>Doel</h3><p>${esc(u.goal)}</p></section>
  <section><h3>Leg dit klaar</h3>${bullets(u.prepare.slice(0,4),'gs-prep-list')}</section>
  <details class="gs-guide-more" ${first?'open':''}><summary>Spelregels${u.phases?.length?' en verloop':''}${u.prepare.length>4?' · meer voorbereiding':''}${u.tips?.length?' · tips':''}</summary>
   ${u.prepare.length>4?`<h4>Ook handig om te regelen</h4>${bullets(u.prepare.slice(4))}<h4>Spelregels</h4>`:''}${bullets(u.rules,'gs-rule-list')}
   ${u.phases?.length?`<h4>Verloop</h4>${bullets(u.phases,'gs-phase-list')}`:''}
   ${u.tips?.length?`<h4>Tips voor de spelleider</h4>${bullets(u.tips)}`:''}
  </details></div>`;
}
function open(id){const m=GS.catalog.meta(id),g=m?.game;if(!g){if(typeof detail==='function')detail(id);return;}
 if(m.concept){dialog(g.name,`<p>${esc(g.desc)}</p><p><strong>Nog niet speelbaar.</strong> Dit spel staat in de broncode als concept en is daarom niet in de bibliotheek opgenomen.</p>`,`<button class="btn" data-action="close">Sluiten</button>`);return;}
 const resumeHere=state.active?.gameId===id;
 let actions='';
 if(m.mode==='tablet')actions=`<button class="btn" data-gs-go="${id}">${(id==='ticket'&&state.board&&state.board.phase!=='finished')||(id==='monopoly'&&GS.ls.json('groepsspel-monopoly')?.phase&&GS.ls.json('groepsspel-monopoly').phase!=='finished')?'Verder spelen':'Spelers kiezen en starten'} →</button>`;
 else if(m.mode==='phones')actions=`<button class="btn" data-gs-phone="${id}">Telefoonspel openen →</button>${m.fallback?`<button class="btn secondary" data-gs-fallback="${id}">Zonder server: één apparaat doorgeven</button>`:''}`;
 else actions=resumeHere?`<button class="btn" data-action="resume">Verder spelen →</button>`:`<button class="btn" data-gs-quick="${id}">Snel starten</button><button class="btn secondary" data-gs-go="${id}">Instellingen kiezen →</button>${m.server==='optional'?`<button class="btn secondary" data-gs-phone="${id}">Met telefoons (spelserver)</button>`:''}`;
 
 const serverNote=m.mode==='phones'?`<p class="gs-note">Dit spel heeft een <strong>spelserver</strong> nodig: de Windows-app op een pc (wifi of mobiel internet) of een online spelserver. Op deze tablet of telefoon alleen werkt het niet${m.fallback?', behalve de eenvoudige doorgeefversie':''}.</p>`:'';
 const canResume=resumeHere&&m.mode==='show',read=isRead(id);
 const acknowledged=canResume||read?(read&&!canResume?'<p class="e11-small gs-read-note">✓ Uitleg eerder gelezen op dit apparaat. De spelregels staan hierboven ingeklapt.</p>':''):`<label class="gs-guide-ack"><input type="checkbox" data-gs-ack="${id}"> <span>Ik heb gelezen hoe het spel werkt en weet wat ik moet klaarleggen.</span></label>`;
 // De eerste keer per spel wordt de startknop pas actief na het vinkje; daarna niet meer.
 const blocked=canResume||read?actions:actions.replace(/<button /g,'<button disabled data-gs-locked ');
 const evidence=GS.evidence?.html?.(id)||'';
 dialog(g.name,`${steps(m,1)}<p>${esc(g.desc)}</p>${facts(m)}${serverNote}${guideHtml(id,!read)}${evidence?`<details class="gs-evidence-wrap"><summary>Optioneel: foto's delen via een WhatsApp-groep</summary>${evidence}</details>`:''}${acknowledged}`,blocked);
}

/** Controleer de teams voor een spelshow; geeft true als direct gestart kan worden. */
function teamsReady(m){if(!m.teams||state.active)return true;const n=state.teams.length;return n>=m.teams[0]&&n<=m.teams[1];}
function defaultTeams(m){const [a,b]=m.teams;if(a===b)return a;const p=state.players.length;return Math.max(a,Math.min(b,p?Math.min(4,Math.max(2,Math.ceil(p/4))):2));}
function teamsStep(id,quick){const m=GS.catalog.meta(id),g=m.game,[a,b]=m.teams,n=state.teams.length,k=defaultTeams(m);
 const need=a===b?`precies ${a} teams`:`${a} tot ${b} teams`;
 const list=n?`<ul class="gs-teamlist">${state.teams.map(t=>`<li>${esc(t.name)}${state.players.length?` <small>${GS.group.members(t.id).map(p=>esc(p.name)).join(', ')||'nog geen spelers'}</small>`:''}</li>`).join('')}</ul>`:'<p>Er zijn nog geen teams.</p>';
 const fix=n>b?`<p class="gs-note">Er zijn nu ${n} teams. Verwijder of combineer teams bij Mijn groep.</p>`:`${state.players.length>=k?`<button class="btn" data-gs-teams="${id}" data-n="${k}" data-quick="${quick?1:0}">Verdeel ${state.players.length} spelers over ${k} teams</button>`:''}<button class="btn ${state.players.length>=k?'secondary':''}" data-gs-maketeams="${id}" data-n="${k}" data-quick="${quick?1:0}">${n?`Aanvullen tot ${k} teams`:`Maak ${k} teams`}</button>`;
 dialog(`${g.name}: wie spelen er mee?`,`${steps(m,2)}<p>${esc(g.name)} speelt met ${need}.</p>${list}`,`${fix}<button class="btn secondary" data-gs-group>Naar Mijn groep</button>`);}

/** Ga naar het instellingenvenster van de spelmotor (of direct naar het bord). */
function go(id,quick=false){const m=GS.catalog.meta(id);if(!m)return start(id);
 if(m.mode==='show'&&!teamsReady(m)){teamsStep(id,quick);return;}
 GS.group.touch(id);close();
 /* Spellen met zowel een versie op dit apparaat als een wifi-versie: hier altijd de versie op dit apparaat. */
 if(m.server==='optional'&&m.game.engine&&typeof extendedSetup==='function')extendedSetup(id);else start(id);
 if(quick&&!state.active)autoSubmit(id);}
/** Snel starten: verstuur het instellingenvenster met de standaardwaarden. */
function autoSubmit(id){let tries=0;const t=setInterval(()=>{const f=document.querySelector('#modal form');tries++;
 if(f&&!f.querySelector('[required]:invalid')){clearInterval(t);f.requestSubmit?f.requestSubmit():f.submit();}
 else if(tries>20){clearInterval(t);}},40);}
function quick(id){const m=GS.catalog.meta(id);if(!m||m.mode!=='show'){open(id);return;}
 if(state.active&&state.active.gameId!==id){go(id);return;}
 if(!teamsReady(m)&&state.teams.length<m.teams[0]){const k=defaultTeams(m);const err=state.players.length>=k?GS.group.distribute(k):GS.group.ensureTeams(k);if(err){toast(err);return;}toast(`${k} teams klaargezet. Pas namen aan bij Mijn groep.`);}
 go(id,true);}

/** Telefoonversie: met server direct openen, anders uitleggen hoe. */
async function phone(id){GS.group.touch(id);
 /* 0.15: eerst Mijn groep met de spelserver delen, zodat spelers hun naam kunnen kiezen (max. 1,5 s wachten) */
 if(GS.server)await Promise.race([GS.server.shareGroup(),new Promise(r=>setTimeout(r,1500))]);
 if(LAN[id]){if(await server()){location.href='/host?spel='+LAN[id];return;}openPhoneShows(id);return;}
 openPhoneShows(id);}
function fallback(id){close();GS.group.touch(id);if(typeof detail==='function')detail(id);}

document.addEventListener('change',e=>{
 const cb=e.target.closest('[data-gs-ack]');if(!cb)return;
 const modal=cb.closest('#modal');
 modal?.querySelectorAll('[data-gs-locked]').forEach(btn=>{btn.disabled=!cb.checked;});
 if(cb.checked&&cb.dataset?.gsAck)markRead(cb.dataset.gsAck);
});

document.addEventListener('click',e=>{
 const t=e.target.closest('[data-gs-open],[data-gs-go],[data-gs-quick],[data-gs-phone],[data-gs-fallback],[data-gs-teams],[data-gs-maketeams],[data-gs-group]');if(!t)return;
 e.preventDefault();const d=t.dataset;
 if(d.gsOpen)open(d.gsOpen);
 else if(d.gsGo)go(d.gsGo);
 else if(d.gsQuick)quick(d.gsQuick);
 else if(d.gsPhone){close();phone(d.gsPhone);}
 else if(d.gsFallback)fallback(d.gsFallback);
 else if(d.gsTeams||d.gsMaketeams){const id=d.gsTeams||d.gsMaketeams,n=Number(d.n),err=d.gsTeams?GS.group.distribute(n):GS.group.ensureTeams(n);if(err){toast(err);return;}d.quick==='1'?go(id,true):go(id);}
 else if(t.hasAttribute('data-gs-group')){close();nav('group');}
});
/* Oudere knoppen in Spelshows en bij de quizmaker mogen de uitleg niet overslaan. */
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-phone-show], [data-action="start"][data-id]');
 if(!t||t.closest('#modal')||!GS.catalog.meta(t.dataset.phoneShow||t.dataset.id))return;
 e.preventDefault();e.stopImmediatePropagation();open(t.dataset.phoneShow||t.dataset.id);
},true);
/* De oude kaartknoppen (data-experience-play) en speelwijzekaarten leiden nu ook naar deze start. */
document.addEventListener('click',e=>{const p=e.target.closest('[data-experience-play]');if(!p)return;e.preventDefault();e.stopImmediatePropagation();open(p.dataset.experiencePlay);},true);

GS.define('flow',{isRead,markRead,READ_KEY,open,go,quick,phone,LAN,teamsReady,lastServer:()=>lastServer});
})();
