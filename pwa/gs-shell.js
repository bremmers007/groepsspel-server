/* Groepsspel 0.14 — hoofdnavigatie: Home · Spellen · Mijn groep · Instellingen.
 * Vervangt de 0.11-laag experience.js. De spelmotoren, spelschermen en beheerpagina's
 * (#play, #board, #vastgoed, #music, #offline, #review ...) blijven ongewijzigd bereikbaar.
 * Oude adressen blijven werken: #session/#scores → #group, #tablet/#phones/#presentation → #library.
 */
(function(){
'use strict';
const esc=GS.esc,C=GS.catalog,G=GS.group;
const PAGES=new Set(['home','library','group','settings']);
const ALIAS={session:'group',scores:'group',tablet:'library',phones:'library',presentation:'library'};
const FILTER_KEY='groepsspel-filter';
let filters=(()=>{const f=GS.ls.json(FILTER_KEY,{});return f&&typeof f==='object'?f:{};})();
let pendingReport=null,serverState=null;

/* ------------------------------------------------------------------ algemeen */
const monoState=()=>{const m=GS.ls.json('groepsspel-monopoly');return m&&m.phase!=='finished'?m:null;};
function chip(text,cls=''){return `<span class="gs-chip ${cls}">${esc(text)}</span>`;}
function gameCard(id,{compact=false}={}){const m=C.meta(id),g=m?.game;if(!g)return '';
 const status=GAME_REVIEW?.[id]?.status==='beta'&&m.mode!=='tablet'?'Speelbare bèta':m.mode==='tablet'?'Speelbaar':'';
 return `<article class="gs-card mode-${m.mode}"><div class="gs-card-top">${chip(C.MODES[m.mode].label,'mode')}${status?chip(status,'status'):''}</div>
 <h3>${esc(g.name)}</h3>${g.inspired?`<small class="e11-inspired">(geïnspireerd op ${esc(g.inspired)})</small>`:''}
 ${compact?'':`<p>${esc(g.desc)}</p>`}
 <dl class="gs-meta"><div><dt>Spelers</dt><dd>${C.range(m.players)}</dd></div><div><dt>Duur</dt><dd>${esc(C.minutesLabel(m))}</dd></div><div><dt>Niveau</dt><dd>${esc(m.level)}</dd></div>${compact?'':`<div class="wide"><dt>Nodig</dt><dd>${esc(m.materials)}</dd></div>`}</dl>
 <p class="gs-need ${m.server==='required'?'server':''}">${esc(C.needsLabel(m))}</p>
 <div class="gs-card-actions"><button type="button" class="e11-btn" data-gs-open="${id}">Spel openen →</button></div></article>`;}

/* ------------------------------------------------------------------ Home */
function resumeItems(){const out=[];
 if(state.active){const g=GAMES.find(x=>x.id===state.active.gameId);out.push({title:g?.name||'Spel',sub:'Quiz/spelshow · voortgang bewaard',href:'#play',label:'Verder spelen'});}
 if(state.board&&state.board.phase!=='finished')out.push({title:'Sporen door Limburg',sub:`${state.board.players?.length||''} spelers · bord bewaard`,href:'#board',label:'Bordspel hervatten'});
 const m=monoState();if(m)out.push({title:'Rijk van Limburg',sub:`Ronde ${m.round||1} · ${m.players.filter(p=>!p.bankrupt).length} spelers over`,href:'#vastgoed',label:'Bordspel hervatten'});
 if(state.mission)out.push({title:'Geheime missies (doorgeefversie)',sub:`${state.mission.players.length} spelers`,href:'#missions',label:'Missies openen'});
 if(serverState?.games?.length)for(const s of serverState.games)out.push({title:s.name,sub:`Telefoonspel op de spelserver · ${s.players} deelnemers · ${s.phase}`,href:s.path,label:'Spelleiding openen',external:true});
 return out;}
function home(){const items=resumeItems(),size=G.size(),rec=C.recommend(size,state.recent,3),recent=(state.recent||[]).filter(r=>GAMES.some(g=>g.id===r.gameId)).slice(0,6);
 return `<section class="e11-hero gs-hero"><span class="eyebrow">Samen spelen · Versie ${esc(GS.version)}</span><h1>${items.length?'Welkom terug.':'Waar hebben jullie zin in?'}</h1></section>
 ${items.length?`<section class="gs-resume" aria-label="Spel hervatten"><h2>Spel hervatten</h2>${items.map(i=>`<div class="e11-resume"><strong>${esc(i.title)}</strong><span>${esc(i.sub)}</span><a class="e11-btn" href="${esc(i.href)}">${esc(i.label)} →</a></div>`).join('')}</section>`:''}
 <section aria-label="Snel een spel starten"><div class="e11-section-title"><h2>Snel starten</h2><a href="#library">Alle spellen →</a></div>
 <div class="e11-mode-grid gs-modes">${Object.entries(C.MODES).map(([k,v])=>`<a class="e11-mode" href="#library" data-gs-mode="${k}"><div class="e11-mode-icon" aria-hidden="true">${v.icon}</div><h2>${esc(v.long)}</h2><p>${k==='tablet'?'Bordspel rond één scherm. Geen server, geen internet.':k==='phones'?'Rollen en opdrachten op je eigen telefoon. Spelserver nodig.':'Quizmaster bedient, iedereen kijkt mee op tv of beamer.'}</p><span>${C.visible().filter(id=>C.META[id].mode===k).length} spellen →</span></a>`).join('')}</div></section>
 <section aria-label="Aanbevolen"><div class="e11-section-title"><h2>${size?`Aanbevolen voor ${size} spelers`:'Aanbevolen'}</h2></div><div class="e11-game-grid">${rec.map(id=>gameCard(id,{compact:true})).join('')}</div></section>
 ${recent.length?`<section aria-label="Laatst gespeeld"><div class="e11-section-title"><h2>Laatst gespeeld</h2></div><div class="gs-recent">${recent.map(r=>{const g=GAMES.find(x=>x.id===r.gameId);return `<button class="gs-pill" data-gs-open="${r.gameId}">${esc(g.name)} <small>${new Date(r.at).toLocaleDateString('nl-NL',{day:'numeric',month:'short'})}</small></button>`;}).join('')}</div></section>`:''}
 <section class="e11-resume gs-group-teaser"><strong>${esc(state.name||'Jullie groep')}</strong><span>${state.players.length} spelers · ${state.teams.length} teams · ${state.history.length} uitslagen</span><a class="e11-btn ghost" href="#group">Mijn groep →</a></section>`;}

/* ------------------------------------------------------------------ Spellen */
function sel(name,label,opts){return `<label class="gs-filter"><span>${label}</span><select class="input" data-gs-filter="${name}"><option value="">Alle</option>${opts.map(([v,t])=>`<option value="${v}" ${String(filters[name]||'')===String(v)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;}
function library(){const ids=C.visible().filter(id=>C.matches(id,filters)),active=Object.values(filters).some(Boolean);
 const order=['tablet','phones','show'],groups=order.map(k=>[k,ids.filter(id=>C.META[id].mode===k)]).filter(([,l])=>l.length);
 return `<div class="e11-heading"><div class="eyebrow">Spellen</div><h1>Alle spellen</h1><p>Elke kaart laat zien voor hoeveel spelers het is, hoe lang het duurt en wat je nodig hebt. Telefoonspellen hebben een spelserver nodig; tabletspellen en spelshows niet.</p></div>
 <form class="gs-filters" aria-label="Filters" onsubmit="return false">${sel('players','Aantal spelers',[[2,'2'],[4,'4'],[6,'6'],[8,'8'],[12,'12'],[20,'20+']])}${sel('minutes','Maximaal',[[30,'30 minuten'],[45,'45 minuten'],[60,'1 uur'],[120,'2 uur']])}${sel('mode','Speelwijze',Object.entries(C.MODES).map(([k,v])=>[k,v.long]))}${sel('type','Soort spel',Object.entries(C.TYPES))}${active?'<button type="button" class="btn small secondary" data-gs-clear>Filters wissen</button>':''}</form>
 <p class="e11-small" role="status">${ids.length} ${ids.length===1?'spel':'spellen'}${active?' met deze filters':''}.</p>
 ${groups.length?groups.map(([k,l])=>`<section class="e11-library-section"><div class="e11-section-title"><h2>${esc(C.MODES[k].long)}</h2></div><div class="e11-game-grid">${l.map(id=>gameCard(id)).join('')}</div></section>`).join(''):`<div class="e11-important"><strong>Geen spel past bij deze filters.</strong><p>Probeer een ander aantal spelers of een langere speelduur.</p><button class="e11-btn" data-gs-clear>Filters wissen</button></div>`}`;}

/* ------------------------------------------------------------------ Mijn groep */
function groupPage(){const st=G.standings(),locked=!!state.active;
 const teamOpts=pid=>{const p=state.players.find(x=>x.id===pid);return `<option value="">geen team</option>${state.teams.map(t=>`<option value="${t.id}" ${p.team===t.id?'selected':''}>${esc(t.name)}</option>`).join('')}`;};
 return `<div class="e11-heading"><div class="eyebrow">Mijn groep</div><h1>${esc(state.name||'Jullie groep')}</h1><p>Eén groep voor alle spellen op dit apparaat. Spelers, gasten en teams gebruik je opnieuw in elk spel. Tabletspellen nemen de spelersnamen over; telefoonspellen laten iedereen op de eigen telefoon aansluiten.</p></div>
 ${locked?`<div class="e11-important"><strong>${esc(GAMES.find(g=>g.id===state.active.gameId)?.name||'Een spel')} loopt nog.</strong><p>Teams kun je pas wijzigen als dat spel is afgerond. Spelers toevoegen kan wel.</p><a href="#play">Naar het spel →</a></div>`:''}
 <div class="gs-two">
 <section class="panel"><h2>Groepsnaam</h2><form id="groupForm" class="row"><label class="sr-only" for="groupName">Groepsnaam</label><input class="input" id="groupName" name="name" maxlength="60" value="${esc(state.name)}" required><button class="btn small">Bewaren</button></form>
  <h2 style="margin-top:22px">Spelers <small>${state.players.length}</small></h2>
  <form id="gsPlayerForm" class="row"><label class="sr-only" for="gsPlayerName">Naam</label><input class="input" id="gsPlayerName" name="name" maxlength="40" placeholder="Naam van een speler" required autocomplete="off"><label class="gs-check"><input type="checkbox" name="guest"> gast</label><button class="btn small">Toevoegen</button></form>
  ${state.players.length?`<ul class="gs-players">${state.players.map(p=>`<li><strong>${esc(p.name)}</strong>${p.guest?chip('gast'):''}<select class="input small" data-gs-pteam="${p.id}" aria-label="Team van ${esc(p.name)}" ${locked?'disabled':''}>${teamOpts(p.id)}</select><button class="icon-btn" data-gs-guest="${p.id}" aria-label="${p.guest?'Maak vaste speler':'Maak gast'}" title="${p.guest?'Vaste speler':'Gast'}">${p.guest?'★':'☆'}</button><button class="icon-btn" data-gs-premove="${p.id}" aria-label="${esc(p.name)} verwijderen">×</button></li>`).join('')}</ul>
  <div class="e11-actions">${[2,3,4].map(n=>`<button class="btn small secondary" data-gs-split="${n}" ${locked?'disabled':''}>Verdeel over ${n} teams</button>`).join('')}${state.players.some(p=>p.guest)?'<button class="btn small secondary" data-gs-noguests>Gasten verwijderen</button>':''}</div>`:'<p class="e11-small">Nog geen spelers. Je kunt ook alleen met teams spelen.</p>'}
 </section>
 <section class="panel"><h2>Teams <small>${state.teams.length}/6</small></h2>
  ${state.teams.map((t,i)=>`<div class="team-row"><span class="team-color" style="background:${G.COLORS[i]}"></span><strong class="break-word">${esc(t.name)}</strong><span class="micro">${G.members(t.id).map(p=>esc(p.name)).join(', ')}</span><button class="icon-btn" data-action="renameTeam" data-id="${t.id}" aria-label="Naam van ${esc(t.name)} aanpassen">✎</button><button class="icon-btn" data-action="removeTeam" data-id="${t.id}" aria-label="${esc(t.name)} verwijderen">×</button></div>`).join('')||'<p class="e11-small">Nog geen teams. Spelshows maken ze zo nodig voor je aan.</p>'}
  ${state.teams.length<6&&!locked?`<form id="teamForm" class="row" style="margin-top:12px"><label class="sr-only" for="teamName">Nieuw team</label><input class="input" id="teamName" name="name" placeholder="Nieuw team" maxlength="35" required><button class="btn small">Team toevoegen</button></form>`:''}
 </section></div>
 <section class="panel gs-standings" id="klassement"><div class="e11-section-title" style="margin-top:0"><h2>Klassement</h2>${state.history.length?'<button class="btn small secondary" data-action="resetScores">Uitslagen wissen</button>':''}</div>
  <p class="e11-small">Elk spel telt anders (seconden, fiches, vragen, euro's). Daarom tellen we geen ruwe punten bij elkaar op: per spel krijgt de winnaar 10 rangpunten, dan 8, 6, 4, 2 en 1. Gelijke stand = gelijke rangpunten.</p>
  ${st.list.length?`<table class="gs-table"><thead><tr><th>#</th><th>Naam</th><th>Rangpunten</th><th>Gespeeld</th><th>Gewonnen</th></tr></thead><tbody>${st.list.map(r=>`<tr><td>${r.rank}</td><td>${esc(r.name)}</td><td><strong>${r.points}</strong></td><td>${r.games}</td><td>${r.wins}</td></tr>`).join('')}</tbody></table>`:'<p>Nog geen afgeronde spellen met twee of meer deelnemers.</p>'}
  ${st.games.length?`<h3>Gespeelde spellen</h3><ul class="gs-history">${[...st.games].reverse().slice(0,30).map(h=>`<li><strong>${esc(h.name)}</strong> <small>${new Date(h.at).toLocaleString('nl-NL',{weekday:'short',hour:'2-digit',minute:'2-digit'})}</small><span>${h.ranked.map(r=>`${r.rank}. ${esc(r.name)} (${Math.round(r.score*10)/10})`).join(' · ')}</span></li>`).join('')}</ul>`:''}
 </section>`;}

/* ------------------------------------------------------------------ Instellingen */
function settings(){const dev=GS.ls.get('groepsspel-development')==='yes',last=GS.storage.lastExport();
 return `<div class="e11-heading"><div class="eyebrow">Instellingen</div><h1>Instellingen</h1><p>Reservekopieën, taal, offline gebruik, telefoonspellen en eigen inhoud.</p></div>
 <div class="e11-session-grid gs-settings">
 <section class="panel" id="backup"><h2>Reservekopie</h2><p>Alles van dit apparaat in één bestand: groep, spelers, uitslagen, eigen vragen en muziek, lopende quiz- en showspellen en beide tabletbordspellen. Terugzetten kan op dit of een ander apparaat.</p><p class="e11-small">${last?'Laatste reservekopie: '+new Date(last).toLocaleString('nl-NL'):'Nog geen reservekopie gemaakt op dit apparaat.'}</p>
  <div class="e11-actions"><button class="e11-btn" data-gs-export>Reservekopie downloaden</button><label class="e11-btn ghost" for="gsImport">Reservekopie terugzetten</label><input type="file" id="gsImport" accept="application/json,.json" class="sr-only"></div>
  ${GS.storage.hasPrevious()?'<p class="e11-small" style="margin-top:12px"><button class="btn small secondary" data-gs-undo>Vorige toestand terugzetten</button> (van vóór het laatste terugzetten of wissen)</p>':''}
  <p class="e11-small" style="margin-top:12px">Niet in de reservekopie: eigen foto's en audiobestanden, en telefoonspellen op de spelserver (die bewaart de server zelf).</p></section>
 <section class="panel"><h2>Taal</h2><p>Kies de taal van de app. Alles wordt vertaald: menu’s, spelregels, vragen, opdrachten en de schermen op de telefoons.</p><label class="gs-field" data-notranslate><span>🌐</span> <select id="gsLangSettings" aria-label="Taal · Language">${Object.entries(LOCALES).map(([v,t])=>`<option value="${v}" ${v===appLanguage?'selected':''}>${t}</option>`).join('')}</select></label><p class="e11-small">Telefoons van spelers nemen deze taal over, tenzij een speler zelf een andere taal kiest. Nederlandse uitdrukkingen en woordspelletjes slaat de app in andere talen over.</p></section>
 <section class="panel"><h2>Vragenbank</h2><p>${GS.questions.total()} vragen in ${Object.keys(GS.questions.info.categories).length} categorieën, van makkelijk tot moeilijk. Gestelde vragen komen pas terug als de nieuwe op zijn.</p><p class="e11-small">${Object.entries(GS.questions.counts()).map(([k,n])=>`${esc(GS.questions.info.categories[k]?.name||k)} ${n}`).join(' · ')}</p><p class="e11-small">Al gesteld op dit apparaat: ${GS.questions.seenCount()}.</p>${GS.questions.seenCount()?'<button class="btn small secondary" data-gs-resetseen>Vragengeschiedenis wissen</button>':''}</section>
 <section class="panel"><h2>Offline & installeren</h2><p>Tabletspellen en spelshows werken zonder internet zodra de app één keer volledig geladen is.</p><a class="e11-btn ghost" href="#offline">Offline controleren →</a></section>
 <section class="panel"><h2>Eigen inhoud</h2><p>Eigen quizvragen (voor Hoe goed ken je ons?) en de muzieklijst voor Hitlijn, Muziekbingo en Terug in de tijd.</p><div class="e11-actions"><a href="#friends">Eigen vragen →</a><a href="#music">Muzieklijst →</a><a href="#studio">Geluid & media →</a></div></section>
 <section class="panel"><h2>Alles wissen</h2><p>Begin opnieuw op dit apparaat. Direct daarna kun je dit nog één keer ongedaan maken.</p><button class="btn small secondary" data-action="reset">Alles wissen…</button></section>
 </div>
 <section class="panel e11-development"><h2>Beheer <span class="e11-status test">gevorderd</span></h2><label class="e11-checkbox"><input type="checkbox" data-development-mode ${dev?'checked':''}> Toon beheer- en ontwikkelfuncties</label>${dev?`<div class="e11-actions"><a href="#review">Spelstatus</a><a href="#priorities">Spellen selecteren</a><a href="#chooser">Spelkiezer / programma</a><a href="#cityquest">Stadskwisbeheer</a><a href="#local">Wifi-spelleider</a><a href="#shows">Spelshows</a></div>`:''}</section>`;}

/* ------------------------------------------------------------------ navigatie en render */
header=function(){const items=[['home','Home'],['library','Spellen'],['group','Mijn groep'],['settings','Instellingen']];const cur=ALIAS[route]||route;
 return `<header class="header"><div class="wrap header-inner"><a class="brand" href="#home" aria-label="Groepsspel home"><img src="icon.svg" alt="">groepsspel<span style="color:#b8783e">.</span></a><nav class="nav" aria-label="Hoofdnavigatie">${items.map(([id,t])=>`<a href="#${id}" ${cur===id?'class="active" aria-current="page"':''}>${t}</a>`).join('')}</nav></div></header>`;};
footer=function(){return `<footer class="footer"><span>groepsspel. &nbsp; Samen spelen op jouw manier.</span><span>Versie ${esc(GS.version)} · <a href="#settings">Instellingen</a> · <a href="#offline">Offline hulp</a></span></footer>`;};
const TITLES={home:'Home',library:'Spellen',group:'Mijn groep',settings:'Instellingen'};
const prior=render;
render=function(){
 if(ALIAS[route]){const to=ALIAS[route];if(['tablet','phones','presentation'].includes(route)){filters={mode:route==='presentation'?'show':route};}route=to;history.replaceState(null,'','#'+to+(to==='group'&&location.hash==='#scores'?'':''));}
 G.recordTablet();
 if(PAGES.has(route)){document.body.classList.remove('presentation');document.title='Groepsspel — '+TITLES[route];
  const html=route==='home'?home():route==='library'?library():route==='group'?groupPage():settings();
  $('#app').innerHTML=header()+`<main class="wrap e11-main gs-main">${html}${footer()}</main>`;
  if(typeof showConnectionStatus==='function')showConnectionStatus();}
 else prior();
 const nav=document.querySelector('.nav');nav?.querySelector('a[href="#shows"]')?.remove();
 const f=document.querySelector('.footer');if(f){for(const el of f.querySelectorAll('a[href="#review"],a[href="#priorities"],a[href="#studio"]'))el.remove();const offs=[...f.querySelectorAll('a[href="#offline"]')];offs.slice(1).forEach(el=>el.remove());}
 GS.emit('rendered',route);
};

/* ------------------------------------------------------------------ gebeurtenissen */
document.addEventListener('change',async e=>{
 const t=e.target;
 if(t.matches?.('[data-gs-filter]')){filters[t.dataset.gsFilter]=t.value||undefined;filters=Object.fromEntries(Object.entries(filters).filter(([,v])=>v));GS.ls.set(FILTER_KEY,JSON.stringify(filters));render();document.querySelector(`[data-gs-filter="${t.dataset.gsFilter}"]`)?.focus();return;}
 if(t.matches?.('[data-gs-pteam]')){G.setTeam(t.dataset.gsPteam,t.value);render();return;}
 if(t.id==='gsImport'){const rep=await GS.storage.readFile(t.files[0]);t.value='';
  if(!rep.ok){dialog('Terugzetten lukt niet',`<p>${esc(rep.error)}</p><p class="e11-small">Je huidige gegevens zijn niet aangepast.</p>`,`<button class="btn" data-action="close">Sluiten</button>`);return;}
  pendingReport=rep;
  dialog('Reservekopie terugzetten?',`<p>Dit vervangt alle Groepsspel-gegevens op dit apparaat${rep.createdAt?` door de reservekopie van <strong>${esc(new Date(rep.createdAt).toLocaleString('nl-NL'))}</strong>`:''}${rep.kind==='v1'?' (oud formaat, van vóór 0.14)':''}.</p><p><strong>Wordt teruggezet:</strong> ${rep.kept.join(', ')}.</p>${rep.lost.length?`<p class="gs-warn"><strong>Kan niet worden teruggezet:</strong> ${rep.lost.join('; ')}. Die onderdelen zijn beschadigd of horen bij een spelversie die niet meer bestaat.</p>`:''}<p class="e11-small">De huidige toestand bewaren we apart; je kunt het terugzetten daarna nog één keer ongedaan maken.</p>`,`<button class="btn secondary" data-action="close">Annuleren</button><button class="btn" data-gs-restore>Terugzetten</button>`);}
});
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-gs-mode],[data-gs-clear],[data-gs-export],[data-gs-restore],[data-gs-undo],[data-gs-guest],[data-gs-premove],[data-gs-split],[data-gs-noguests]');if(!t)return;const d=t.dataset;
 if(d.gsMode){e.preventDefault();filters={mode:d.gsMode};GS.ls.set(FILTER_KEY,JSON.stringify(filters));nav('library');}
 else if(t.hasAttribute('data-gs-clear')){filters={};GS.ls.del(FILTER_KEY);render();}
 else if(t.hasAttribute('data-gs-export')){GS.storage.download();toast('Reservekopie gedownload.');setTimeout(render,300);}
 else if(t.hasAttribute('data-gs-restore')){if(!pendingReport)return;try{GS.storage.apply(pendingReport);}catch(err){toast(err.message);}}
 else if(t.hasAttribute('data-gs-undo')){if(!GS.storage.undoRestore())toast('Er is geen vorige toestand meer om terug te zetten.');}
 else if(d.gsGuest){G.toggleGuest(d.gsGuest);render();}
 else if(d.gsPremove){G.removePlayer(d.gsPremove);render();}
 else if(d.gsSplit){const err=G.distribute(Number(d.gsSplit));if(err)toast(err);else{toast('Spelers verdeeld.');render();}}
 else if(t.hasAttribute('data-gs-noguests')){G.removeGuests();render();}
});
document.addEventListener('submit',e=>{if(e.target.id!=='gsPlayerForm')return;e.preventDefault();const f=new FormData(e.target),err=G.addPlayer(f.get('name'),!!f.get('guest'));if(err){toast(err);return;}render();document.querySelector('#gsPlayerName')?.focus();});

/* Telefoonspellen die op de spelserver lopen, verschijnen ook bij 'Spel hervatten' (alleen op de server-pc). */
async function pollServer(){try{const r=await fetch('/api/lopend',{cache:'no-store'});if(!r.ok)return;const d=await r.json();if(d&&Array.isArray(d.games)){const before=JSON.stringify(serverState);serverState=d;if(route==='home'&&before!==JSON.stringify(d))render();}}catch{}}
if(location.protocol!=='file:')pollServer();

/* Melding na terugzetten (de app herlaadt dan). */
const notice=GS.storage.pendingNotice();
if(notice)setTimeout(()=>dialog('Reservekopie teruggezet',`<p><strong>Teruggezet:</strong> ${notice.kept.map(esc).join(', ')}.</p>${notice.lost.length?`<p class="gs-warn"><strong>Niet teruggezet:</strong> ${notice.lost.map(esc).join('; ')}.</p>`:''}`,`<button class="btn" data-action="close">Prima</button>`),300);

window.E11={mode:id=>C.META[id]?.mode==='show'?'presentation':C.META[id]?.mode||'presentation',stage:()=>({label:'',kind:'beta'})};
GS.define('shell',{filters:()=>({...filters}),setFilters(f){filters={...f};},home,library,groupPage,settings});
})();
