'use strict';
const $=s=>document.querySelector(s),escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const role=location.pathname==='/host'?'host':location.pathname==='/display'?'display':'team';document.body.classList.toggle('display',role==='display');
document.body.classList.toggle('team-controller',role==='team');
/* 0.19.5: de online spelserver zet data-online op de pagina; dan horen er geen wifi-teksten bij. */
const ONLINE=document.documentElement.dataset.online==='1';
const joinLink=base=>base?base.replace(/\/$/,'')+'/team?code='+encodeURIComponent(state?.code||''):'';
/* 0.14: /host?spel=quiz|buzzer|wordrace|city kiest vooraf de juiste spelvorm (knop 'Spel openen' in de app). */
if(role==='host')document.body.classList.add('lan-host');
const studioPreference=new URLSearchParams(location.search).get('studio');
let studioStatus='loading';
const STUDIO_LABELS={loading:'3D-studio laden…',ready:'3D-studio actief',light:'3D-studio · lichte stand',
  flat:'2D-tv-weergave',unsupported:'2D-tv-weergave · WebGL niet beschikbaar',
  failed:'2D-tv-weergave · 3D kon niet worden gestart'};
const studioChannel=typeof BroadcastChannel==='function'&&role!=='team'?new BroadcastChannel('groepsspel-studio'):null;
let remoteStudio=null;
if(studioChannel)studioChannel.onmessage=({data})=>{
  if(role==='host'&&data?.code===state?.code&&Object.hasOwn(STUDIO_LABELS,data.status)){
    remoteStudio=data;
    const el=document.querySelector('[data-studio-check]');
    if(el)el.textContent=STUDIO_LABELS[data.status];
  }
};
const presetTheme=new URLSearchParams(location.search).get('thema');
const showThemes={year:'Terug in de tijd',holland:'Oerhollands',pubquiz:'Pubquiz',friends:'Vriendenquiz'};
const theme=Object.hasOwn(showThemes,presetTheme)?presetTheme:'';
const presetMode=(()=>{const v=new URLSearchParams(location.search).get('spel');return theme?'buzzer':['quiz','buzzer','wordrace','city'].includes(v)?v:'';})();
let state=null,hostKey='',teamKey=new URLSearchParams(location.search).has('new')?'':localStorage.getItem('groepsspel-lan-team')||'',urls=[],signature='',connected=false,polling=false,offset=0,latency=null,busy=false,flushing=false,dbPromise,photos={},drafts=theme?{setupMode:'buzzer',setupName:showThemes[theme]}:presetMode?{setupMode:presetMode}:{},photoURLs={},friendPhotos=[];
const sessionKey=()=>state?state.room_id+':'+state.me?.id:'';
function note(text){$('#notice').textContent=text;$('#notice').style.display='block';clearTimeout(note.timer);note.timer=setTimeout(()=>$('#notice').style.display='none',6000);}
function auth(){return role==='host'?hostKey:teamKey;}
async function api(path,body,token=auth()){const response=await fetch(path,{method:body?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});const data=await response.json();if(!response.ok){const err=new Error(data.error||'Verzoek mislukt.');err.status=response.status;throw err;}return data;}
function db(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('groepsspel-lan-outbox',1);req.onupgradeneeded=()=>req.result.createObjectStore('items',{keyPath:'key'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});return dbPromise;}
async function outbox(action,item){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('items',action==='all'?'readonly':'readwrite'),store=tx.objectStore('items');let req=action==='all'?store.getAll():action==='put'?store.put(item):store.delete(item);tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Opslaan afgebroken.'));});}
function preserveRender(){const picker=$('#friendPhotos');document.querySelectorAll('[data-draft]').forEach(e=>drafts[e.id]=e.value);const active=document.activeElement?.id,selection=document.activeElement?.selectionStart;render();
  if(picker&&$('#friendPhotos'))$('#friendPhotos').replaceWith(picker);
  if($('#friendPhotoStatus')&&friendPhotos.length)$('#friendPhotoStatus').textContent=friendPhotos.length+' foto’s geselecteerd';document.querySelectorAll('[data-draft]').forEach(e=>{if(Object.hasOwn(drafts,e.id))e.value=drafts[e.id];});if(active){const input=document.getElementById(active);input?.focus();if(typeof selection==='number'&&input?.setSelectionRange)try{input.setSelectionRange(selection,selection);}catch{}}clock();}
function scores(){return `<div class="scores">${(state?.teams||[]).map(t=>`<div class="score">${escapeHtml(t.name)}<b>${t.score}</b>${t.spectator?'<small>Toeschouwer</small>':''}</div>`).join('')}</div>`;}
const evidenceMode = () => state?.evidence?.mode || 'app';
const evidenceLink = () => state?.evidence?.link || '';
function evidenceCityHost() {
  const e=state.evidence||{mode:'app',link:''};
  const mode=drafts.evidenceMode ?? e.mode;
  const link=drafts.evidenceLink ?? e.link;
  return `<section class="panel evidence-panel"><h2>Bewijs & communicatie · Stadskwis</h2>
    <p>Optioneel bewijs delen via WhatsApp. De groep maak je zelf aan; beoordeling en punten blijven in Groepsspel.</p>
    <label class="field"><span>Bewijs inleveren via</span><select id="evidenceMode" data-draft><option value="app" ${mode==='app'?'selected':''}>Groepsspel</option><option value="whatsapp" ${mode==='whatsapp'?'selected':''}>WhatsApp</option><option value="both" ${mode==='both'?'selected':''}>Beide</option></select></label>
    ${mode !== 'app' ? `<label class="field"><span>WhatsApp-groepsuitnodiging</span><input id="evidenceLink" data-draft type="url" placeholder="https://chat.whatsapp.com/..." maxlength="220" value="${escapeHtml(link)}"></label>` : ''}
    <p class="tiny">Deelnemers zien elkaars telefoonnummers in WhatsApp. De foto's staan niet automatisch in Groepsspel of op het scorebord.</p>
    ${button('Bewijskanaal opslaan','evidence_save','','secondary')}
    ${e.mode!=='app'&&e.link?`<a href="${escapeHtml(e.link)}" target="_blank" rel="noopener noreferrer">Open WhatsApp-groep ↗</a> ${qr(e.link)}`:''}</section>`;
}
function evidenceCityTeam(){const e=state?.evidence||{};return e.mode==='whatsapp'||e.mode==='both'?`<section class="panel evidence-panel"><h3>Bewijs via WhatsApp</h3><p>Stuur je foto in de groepschat met <b>teamnaam en opdracht</b>. Meld het bewijs daarna hieronder aan zodat de spelleider punten kan geven.</p><a class="btn secondary" href="${escapeHtml(e.link)}" target="_blank" rel="noopener noreferrer">Open WhatsApp-groep ↗</a><p class="tiny">De spelleider beoordeelt handmatig; telefoonnummers zijn in de groep zichtbaar. WhatsApp heeft internet nodig.</p></section>`:'';}
const button=(label,action,extra='',secondary=false)=>`<button type="button" data-action="${action}" class="${secondary?'secondary':''}" ${extra}>${label}</button>`;
function qr(url){try{const code=qrcode(0,'M');code.addData(url);code.make();return `<div class="qr">${code.createImgTag(4,12,'QR-code om mee te doen')}</div>`;}catch{return'';}}
function answerText(q){return q.options?'ABCD'[q.correct]+'. '+q.options[q.correct]:(q.answers||[]).join(' / ');}
function question(){if(state.mode==='wordrace')return wordRace();if(state.auto)return autoScreen();const q=state.question;if(!q)return `<h2>${state.phase==='finished'?'Spel afgerond':state.phase==='countdown'?'De volgende vraag komt eraan':'Wacht op de spelleider'}</h2>`;return `<p class="counter">Vraag ${state.index+1} / ${state.total} · ${escapeHtml(q.category||'Quiz')}</p><h1 class="question">${escapeHtml(q.q)}</h1><div class="options">${(q.options||[]).map((a,i)=>`<div class="option ${state.phase==='reveal'&&q.correct===i?'correct':''}"><b>${'ABCD'[i]}</b>${escapeHtml(a)}</div>`).join('')}</div>${state.phase==='reveal'&&q.kind==='text'?`<div class="banner">Juiste antwoord: ${escapeHtml(answerText(q))}</div>`:''}`;}
/* 0.15.3: het gekozen wifi-adres blijft staan (voorheen sprong het bij iedere verversing terug naar het eerste). */
let lanPick=(()=>{try{return localStorage.getItem('groepsspel-lan-address')||'';}catch{return '';}})();
const lanURL=()=>urls.includes(lanPick)?lanPick:(urls[0]||'');
function friendQuestionList(value){
  return value.split(/\r?\n/).filter(line=>line.trim()).map((line,i)=>{
    const row=line.split('|').map(part=>part.trim());
    if(row.length!==5||row.some(part=>!part))throw Error('Regel '+(i+1)+': gebruik vraag | juist | fout | fout | fout.');
    const [q,right,...wrong]=row;
    const correct=crypto.getRandomValues(new Uint8Array(1))[0]%4;
    wrong.splice(correct,0,right);
    return {q,options:wrong,correct,category:'Vriendenquiz'};
  });
}
async function addFriendPhotos(questions){
  const used=new Set();
  for(const file of friendPhotos){
    const index=Number(file.name.match(/^\d+/)?.[0])-1;
    if(!Number.isInteger(index)||!questions[index]||used.has(index))throw Error('Koppel iedere foto aan één geldig vraagnummer: '+file.name);
    questions[index].image=await resizePhoto(file,180000,720);
    used.add(index);
  }
}
function themeFields(){
  if(!theme)return '';
  const years=state.time_show_years||[];
  return `<h2>${showThemes[theme]} · tv-show</h2>${theme==='year'?`<label class="field"><span>Jaar van de show</span>
    <select id="setupYear" name="year" data-draft>${years.map(year=>`<option value="${year}" ${year===1995?'selected':''}>${year}</option>`).join('')}</select>
    <small>Vragen over dit jaar, aangevuld met vragen uit hetzelfde decennium.</small></label>`:''}`;
}
function host(){const playing=!['lobby','finished'].includes(state.phase),activeTeams=state.teams.filter(t=>!t.spectator),first=state.buzzes[0];return `<div class="grid"><section class="panel"><h1>${escapeHtml(state.name)}</h1><p>${ONLINE?'Spelleider · online spelkamer':'Spelleider · lokale server op deze pc'}</p>${ONLINE&&lanURL()?`<div class="host-join">${qr(joinLink(lanURL()))}<div><p><strong>Teams scannen deze QR-code</strong> of openen de link hieronder. De spelcode wordt dan vanzelf ingevuld.</p><p class="tiny">Spelcode voor wie typt: <b>${state.code}</b></p></div></div>`:`<p class="code">${state.code}</p>`}<label class="field"${ONLINE?' hidden':''}><span>Adres voor teamtelefoons (dezelfde wifi)</span><select id="lanAddress">${urls.map(u=>`<option value="${escapeHtml(u)}" ${u===lanURL()?'selected':''}>${escapeHtml(u)}</option>`).join('')}</select></label>${urls.length>1?'<p class="tiny">Meerdere adressen gevonden. Kan een telefoon niet verbinden? Kies hier een ander adres en geef dat adres door.</p>':''}${ONLINE?'':'<p>Open Groepsspel en kies <strong>Meedoen met spelcode</strong>.</p>'}<p id="joinURL" class="linkline">${lanURL()?escapeHtml(ONLINE?joinLink(lanURL()):lanURL()):'Geen netwerkadres gevonden'}</p>${ONLINE&&lanURL()?`<p class="tiny">Spelen jullie in verschillende huizen? Open dan in elk huis het tv-beeld op een laptop of smart-tv: <span class="linkline">${escapeHtml(lanURL().replace(/\/$/,'')+'/display?tv=1')}</span></p>`:''}<div class="actions"><a class="btn secondary" href="/display?tv=1&amp;studio=1" target="_blank" rel="noopener">Open publieksstudio ↗</a><button type="button" class="secondary" data-open-tv>📺 TV-scherm</button>${button('Download uitslag','export','',true)}</div><p class="tiny">${ONLINE?'Iedereen speelt via internet: mobiel of wifi, waar je ook bent. De show loopt op de online spelserver; houd dit venster open om te kunnen ingrijpen.':'Gebruik een privé-wifinetwerk waarop apparaten elkaar kunnen bereiken. Houd deze pc en dit venster actief. Internet is voor het spel niet nodig.'}</p></section><section class="panel"><h2>Teams & verbinding</h2>${state.teams.length?state.teams.map(t=>`<div class="teamline"><span class="status ${t.connected?'':'bad'}">${t.connected?'●':'○'}</span><strong>${escapeHtml(t.name)}</strong><small>${t.connected?'Verbonden':'Niet verbonden'}</small>${button(t.spectator?'Meespelen':'Toeschouwer','spectator',`data-id="${t.id}" data-value="${!t.spectator}"`,true)}${button('Score','score',`data-id="${t.id}" data-name="${escapeHtml(t.name)}"`,true)}${!playing?button('Verwijder','remove_team',`data-id="${t.id}"`,true):''}</div>`).join(''):'<p>Laat teams meedoen met de spelcode. Minimaal twee teams voor een quiz; één of meer teams voor de stadskwis.</p>'}<p class="tiny">De ronde pauzeert bij verbindingsverlies. Een afwezig team kun je tijdelijk op toeschouwer zetten.</p></section></div>${state.mode==='city' ? evidenceCityHost() : ''}${!playing?`<section class="panel"><h2>Spel klaarzetten</h2><form id="setupForm" class="${theme?'themed-setup themed-'+theme:''}">${themeFields()}${theme==='friends'?`<label class="field"><span>Eigen meerkeuzevragen</span><textarea name="friends" id="friendQuestions" data-draft rows="6" placeholder="Vraag | juist antwoord | fout antwoord | fout antwoord | fout antwoord"></textarea><small>Eén vraag per regel. Gebruik minimaal 6 vragen voor Kort, 8 voor Normaal of 10 voor Lang. </small></label>
<label class="field"><span>Vraagfoto’s (optioneel)</span><input id="friendPhotos" type="file" accept="image/*" multiple>
<small>Begin de bestandsnaam met het vraagnummer, bijvoorbeeld 2-foto.jpg.</small><output id="friendPhotoStatus"></output></label>`:''}<div class="grid"><label class="field"><span>Spelnaam</span><input id="setupName" data-draft name="name" value="${escapeHtml(state.name)}" maxlength="80" required></label><label class="field"><span>Spelvorm</span><select id="setupMode" data-draft name="mode"><option value="buzzer">Buzzerquiz</option><option value="quiz">Pubquiz / persoonlijke quiz · telefoonantwoorden</option><option value="wordrace">Halve Minuut · geheime woorden</option><option value="city">Stadskwis / dorpskwis</option></select></label><label class="field"><span>Taal van het vragenpakket</span><select id="setupLanguage" data-draft name="language">${Object.entries({nl:'Nederlands',en:'English',de:'Deutsch',fr:'Français',es:'Español',it:'Italiano'}).map(([v,n])=>`<option value="${v}">${n} · ${state.packs[v]||0} vragen</option>`).join('')}</select></label><label class="field"><span>Aantal vragen</span><input id="setupCount" data-draft name="count" type="number" min="1" max="200" value="20" required></label><label class="field"><span>Onderwerp (Nederlands)</span><select id="setupTopic" data-draft name="topic"><option value="all">Alle onderwerpen</option>${(state.topics||[]).map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}</select></label><label class="field"><span>Presentator (Buzzerquiz)</span><select id="setupAuto" data-draft name="auto"><option value="1">Automatisch · het spel presenteert zelf</option><option value="0">Ik presenteer zelf</option></select></label><label class="field"><span>Show (automatisch)</span><select id="setupShow" data-draft name="show"><option value="normaal">Normaal · 6–7 rondes</option><option value="kort">Kort · 4 rondes</option><option value="lang">Lang · 7–8 rondes met de bom</option></select></label><label class="field"><span>Antwoordtijd pubquiz (seconden)</span><input id="setupSeconds" data-draft name="seconds" type="number" min="5" max="180" value="30" required></label></div><details><summary>Eigen vragen invoeren (optioneel)</summary><p class="tiny">Importeer jullie persoonlijke vragenbestand, of voer een JSON-lijst in. Open vraag: q en answer (of answers voor meerdere schrijfwijzen). Meerkeuze: q, vier options en correct (0–3). Leeg laten voor het taalpakket. Hoofdletters en accenten tellen niet mee; andere schrijfwijzen geef je vooraf op.</p><label class="field">Vragenbestand importeren<input type="file" id="questionsImport" accept=".json,application/json"></label><textarea id="questionJSON" class="edit-json" data-draft placeholder='[{"q":"Jullie vraag?","options":["A","B","C","D"],"correct":0}]'></textarea></details><details><summary>Stadskwis: locaties en opdrachten aanpassen</summary><p class="tiny">Vervang locaties door eigen plekken. Dit zijn eigen voorbeeldopdrachten, geen officieel Remunjs kwisboek. points is het maximale puntenaantal; solution (optioneel) is de oplossing die alleen de spelleider ziet.</p><textarea id="taskJSON" class="edit-json" data-draft>${escapeHtml(JSON.stringify(state.task_bank||state.tasks||[],null,2))}</textarea></details><label class="field"><span>Stadskwis: aantal opdrachten</span><select id="setupTaskCount" data-draft name="task_count"><option value="12">12 · ongeveer 1 uur</option><option value="20" selected>20 · ongeveer 2 uur</option><option value="30">30 · een middag</option><option value="0">Alle ${(state.task_bank||state.tasks||[]).length} opdrachten</option></select></label><p class="tiny">De server kiest een gemengde selectie met puzzels, foto- en tekstopdrachten. Bij puzzels ziet alleen de spelleider de oplossing.</p><div class="actions"><button type="submit">Spel klaarzetten</button></div><p class="tiny">Klaarzetten begint een nieuw spel met nul punten. Download zo nodig eerst de bestaande uitslag.</p></form></section>`:''}<section class="panel"><div class="banner">${escapeHtml(state.message)}</div>${state.mode==='city'?`<h2>Stadskwis · ${state.tasks.length} opdrachten</h2><p>Teams verdelen opdrachten over hun subgroepjes en sturen tekst en foto’s in. Punten worden pas na jouw beoordeling toegekend.</p>`:question()}${state.question&&state.phase!=='reveal'&&state.mode!=='wordrace'?`<details><summary>Juiste antwoord · alleen voor de spelleider</summary><p>${escapeHtml(answerText(state.question))}</p></details>`:''}<div class="timer" id="roundTimer"></div>${state.auto?autoHostControls():''}<div class="actions"${state.auto?' hidden':''}>${['lobby','reveal'].includes(state.phase)?button(state.mode==='city'?'Start stadskwis':state.mode==='wordrace'?'Volgende teambeurt':'Volgende vraag','next'):''}${state.phase==='ready'?button('Start over 5 seconden','arm'):''}${state.phase==='paused'?button('Hervatten','resume')+button('Ronde opnieuw','restart_round','',true):''}${['countdown','open','buzzed'].includes(state.phase)?button('Pauzeren','pause','',true):''}${['ready','open','paused','buzzed'].includes(state.phase)&&state.mode!=='city'?button('Antwoord onthullen','reveal','',true):''}${state.phase!=='finished'?button('Spel afronden','finish','',true):button('Terug naar lobby','lobby','',true)}</div>${state.phase==='buzzed'&&!state.auto?`<h2>Als eerste: ${escapeHtml(first?.name)}</h2>${state.buzzes.length>1?'<p class="pending">Vrijwel gelijktijdige drukken (binnen 80 ms). Jij beslist welk team het woord krijgt of herhaal de ronde.</p>':''}${state.buzzes.map(b=>`<div class="actions"><strong>${escapeHtml(b.name)}</strong>${button('Goed +1','judge',`data-id="${b.team_id}" data-correct="true"`)}${button('Fout','judge',`data-id="${b.team_id}" data-correct="false"`,true)}</div>`).join('')}`:''}${state.mode==='quiz'?`<p>${state.answer_count} / ${activeTeams.length} antwoorden ontvangen. Geen bonus voor het snelste antwoord.</p>`:''}</section>${state.mode==='city'?reviewSubmissions():''}${scores()}`;}
function reviewSubmissions(){return `<section class="panel"><h2>Inzendingen beoordelen</h2><p>${state.submissions.length} inzendingen</p>${state.submissions.map(sub=>{const task=state.tasks.find(t=>t.id===sub.task_id);return `<article class="submission"><span class="tag">${escapeHtml(sub.status)}</span><h3>${escapeHtml(sub.team_name)} · ${escapeHtml(task?.title)}</h3>${sub.via_whatsapp?'<p class="pending">WhatsApp-bewijs: controleer de groepschat vóór goedkeuren.</p>':''}<p>${escapeHtml(sub.owner)}</p><p>${escapeHtml(sub.answer)}</p>${task?.solution?`<p class="tiny"><strong>Oplossing:</strong> ${escapeHtml(task.solution)}</p>`:''}${sub.photo_id?button('Bekijk foto','photo',`data-id="${sub.photo_id}"`,true)+`<div id="photo-${sub.photo_id}"></div>`:''}<form class="gradeForm" data-id="${sub.id}"><label class="field"><span>Punten (maximaal ${task?.points})</span><input name="points" type="number" min="0" max="${task?.points}" value="${sub.points}" required></label><label class="field"><span>Feedback</span><input name="note" maxlength="500" value="${escapeHtml(sub.note)}"></label><div class="actions"><button name="approved" value="yes">Goedkeuren / score bewaren</button><button class="secondary" name="approved" value="no">Afwijzen · opnieuw proberen</button></div></form></article>`;}).join('')||'<p>Nog geen inzendingen.</p>'}</section>`;}
function tvControls(){
  const status=STUDIO_LABELS[studioStatus];
  return `<nav class="tv-controls" aria-label="Tv-weergave">
    <span role="status">${status}</span>
    <span data-tv-cast>${escapeHtml(window.gsStudio?.castStatus?.()||'')}</span>
    ${['light','ready','loading'].includes(studioStatus)?'<a href="/display?tv=1&amp;studio=0">2D kiezen</a>':'<a href="/display?tv=1&amp;studio=1">3D proberen</a>'}
    ${studioPreference==='lite'?'<a href="/display?tv=1&amp;studio=1">Volle 3D</a>':'<a href="/display?tv=1&amp;studio=lite" title="Voor tragere laptops: lagere resolutie, geen schaduwen en eenvoudiger publiek">Lichte 3D</a>'}
    <button type="button" data-tv-sound>Test geluid en stem</button>
    <button type="button" data-tv-playlist>Muziek</button>
    <span data-tv-music-source>${escapeHtml(GSound.musicSourceLabel())}</span>
    <button type="button" data-tv-fullscreen>Volledig scherm</button>
  </nav>`;
}
function openMusicPanel(){
  let panel=document.getElementById('tvMusicPanel');
  if(!panel){
    panel=document.createElement('dialog');panel.id='tvMusicPanel';
    panel.innerHTML=`<h2>Achtergrondmuziek</h2>

      <label>Kies eigen nummers <input type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav,.flac" multiple></label>
      <p data-track role="status">Standaardmuziek</p>
      <button type="button" data-track-next>Volgend nummer</button>
      <button type="button" data-track-clear>Standaardmuziek</button>
      <form method="dialog"><button>Sluiten</button></form>`;
    const input=panel.querySelector('input'), report=text=>panel.querySelector('[data-track]').textContent=text;
    input.addEventListener('change',()=>{
      if(!input.files.length)return;
      GSound.setPlaylist(input.files,report);
      updateMusicSource();
      GSound.set(true);
    });

    panel.querySelector('[data-track-next]').addEventListener('click',()=>GSound.advanceMusic());
    panel.querySelector('[data-track-clear]').addEventListener('click',()=>{input.value=''; GSound.setPlaylist([],report);updateMusicSource();});
    document.body.appendChild(panel);
  }
  updateMusicSource();
  panel.showModal();
}
function updateMusicSource(){
  document.querySelectorAll('[data-tv-music-source]').forEach(el=>{el.textContent=GSound.musicSourceLabel();});
}
document.addEventListener('groepsspel-radio',updateMusicSource);
document.addEventListener('click',async event=>{
  if(event.target.closest('[data-tv-playlist]')){openMusicPanel();return;}
  if(event.target.closest('[data-tv-sound]')){
    await GSound.set(true);
    GPresenter.say('Welkom in de studio. Dit is de stemtest.');
    return;
  }
  if(!event.target.closest('[data-tv-fullscreen]'))return;
  if(document.fullscreenElement)document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(()=>{});
});
function setStudioStatus(status){
  if(studioStatus===status)return;
  studioStatus=status;
  studioChannel?.postMessage({code:state?.code,status});
  reportTv(true);
  signature='';
}
let tvReportedAt=0;
function reportTv(now){if(role!=='display'||!state?.auto)return;if(!now&&Date.now()-tvReportedAt<8000)return;tvReportedAt=Date.now();fetch('/api/tv-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:studioStatus})}).catch(()=>{});}
function display(){
  const a=state.auto, badge=a?.theme==='year'?`<div class="show-year" aria-label="Jaar van de show">${a.year}</div>`:'';
  if(state.auto&&state.phase!=='lobby')return `${tvControls()}<section class="panel stage auto-stage">${badge}${autoScreen()}<div class="timer" id="roundTimer"></div><div class="banner">${escapeHtml(state.message)}</div></section>`;return `${state.auto?tvControls():''}<section class="panel stage"><p>${escapeHtml(state.name)}</p>${state.phase==='lobby'?`<h1>${a?.theme==='year'?'Terug in de tijd · '+escapeHtml(a.year):a?.theme==='holland'?'Oerhollands':'Sluit aan en speel mee'}</h1>${displayJoin?`<div class="display-join">${qr(joinLink(displayJoin))}<div><p>Scan de QR-code met je telefoon${ONLINE?'':' (zelfde wifi)'}</p><p class="linkline">${escapeHtml(ONLINE?joinLink(displayJoin):displayJoin)}</p><p class="tiny">Spelcode</p><p class="code">${state.code}</p></div></div>`:`<p>Vraag het serveradres aan de spelleider</p><p class="code">${state.code}</p>`}`:state.mode==='city'?'<h1>Stadskwis</h1><p>Op pad, puzzelen en opdrachten uitvoeren.</p>':question()}<div class="timer" id="roundTimer"></div><div class="banner">${escapeHtml(state.message)}</div>${state.buzzes.length?`<h2>${escapeHtml(state.buzzes.map(b=>b.name).join(' / '))}</h2>`:''}</section>${scores()}`;}
/* 0.15: teams uit 'Mijn groep' van de app (gedeeld door de spelleider) als snelle keuze */
let lanRoster=null;function lanTeams(){if(!lanRoster){lanRoster={players:[]};fetch('/api/groep/namen').then(r=>r.ok?r.json():{players:[]}).then(d=>{lanRoster=d;if(document.querySelector('#joinForm')&&lanTeams().length)render();}).catch(()=>{});}return [...new Set([...(lanRoster.teams||[]),...(lanRoster.players||[]).map(p=>p.team)].filter(Boolean))];}
document.addEventListener('click',e=>{const b=e.target.closest('[data-pickteam]');if(b){const f=document.querySelector('#joinForm');if(f)f.elements.name.value=b.dataset.pickteam;}});
function joinPage(){return `<section class="panel team-help"><h1>Speel mee</h1>${(()=>{const known=new URLSearchParams(location.search).get('code')||state?.code||'';return `<p>${ONLINE?'Kies een teamnaam en een personage. Je speelt mee via internet.':'Zorg dat je telefoon op hetzelfde wifi-netwerk zit als de spelleider.'}</p><form id="joinForm">${known?`<input type="hidden" name="code" value="${escapeHtml(known)}"><p class="tiny">Spel gevonden · spelcode ${escapeHtml(known)}</p>`:`<label class="field"><span>Spelcode</span><input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required></label>`}`;})()}${lanTeams().length?`<div class="roster-pick"><span class="tiny">Teams uit jullie groep:</span> ${lanTeams().map(t=>`<button type="button" class="secondary" data-pickteam="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join(' ')}</div>`:''}<label class="field"><span>Nieuwe teamnaam</span><input name="name" maxlength="35" placeholder="Bijvoorbeeld: De Weekendwinnaars"></label>${appearanceFields()}<button type="submit">Meedoen →</button><details class="tiny"><summary>Al een team? Terugkomen met teamcode</summary><label class="field"><span>Teamcode</span><input name="access_code" maxlength="6" placeholder="Voor terugkomen of een tweede subgroepje"></label></details></form></section>`;}
function team(){if(!state?.me)return joinPage();const me=state.me;return `<div class="team-help"><p class="status">${escapeHtml(me.name)} · teamcode ${escapeHtml(me.access_code)}</p><p class="tiny">Met deze teamcode kan een ander subgroepje bij hetzelfde team aansluiten.${latency!==null&&latency>400?` <b>Trage verbinding (${latency} ms).</b> Ga dichter bij de wifi staan of gebruik mobiel internet.`:''}</p>${ONLINE&&state.auto&&['lobby','finished'].includes(state.phase)?`<p class="tiny"><a href="/display?tv=1" target="_blank" rel="noopener">📺 Bekijk de show op een laptop of tv in jullie huis ↗</a></p>`:''}<div class="banner">${escapeHtml(state.message)}</div>${me.spectator?'<div class="pending">Jullie team kijkt momenteel mee. De spelleider kan jullie weer laten meespelen.</div>':state.mode==='city'?cityTasks():state.mode==='wordrace'?`<section class="panel stage">${wordRace()}<div class="timer" id="roundTimer"></div></section>`:`<section class="panel stage"><div class="timer" id="roundTimer"></div>${state.auto?autoTeam():state.mode==='buzzer'?(me.must_answer?`<h2>Jullie mogen antwoorden!</h2><div class="options answer-buttons auto-answer">${(state.question?.options||[]).map((o,i)=>`<button data-action="answer" data-choice="${i}"><b>${'ABCD'[i]}</b> ${escapeHtml(o)}</button>`).join('')}</div><p class="tiny">Kies binnen 10 seconden.</p>`:state.auto&&['round','standings','finished'].includes(state.phase)?`<section class="auto-stage">${autoStage()}</section>`:`<button class="buzzer" id="buzzButton" data-action="buzz" disabled>BUZZ!</button><p>${state.auto&&me.attempted?'Jullie hebben deze vraag al geprobeerd.':'Kijk naar het grote scherm. Druk pas wanneer de ronde open is.'}</p>`):`<h2>Kijk naar de vraag op het grote scherm</h2>${me.answer!==null&&me.answer!==undefined?`<div class="choice-held">Antwoord ${typeof me.answer==='number'?'ABCD'[me.answer]:escapeHtml(me.answer)} is opgeslagen.</div>`:state.question?.kind==='text'?`<form id="textAnswerForm"><label class="field">Jullie antwoord<input id="textAnswer" data-draft name="text" maxlength="200" autocomplete="off" required></label><button id="sendText" disabled>Antwoord versturen</button></form>`:`<div class="options answer-buttons">${[0,1,2,3].map(i=>`<button data-action="answer" data-choice="${i}" disabled>${'ABCD'[i]}</button>`).join('')}</div><p>Alle teams krijgen dezelfde antwoordtijd.</p>`}`}</section>`}${scores()}</div>`;}
function cityTasks(){return `<section class="panel"><h1>Jullie stadskwis</h1><p>Verdeel de opdrachten. Inzendingen worden eerst op dit apparaat bewaard en bij verbinding naar de spelleider verstuurd.</p>${evidenceCityTeam()}<div class="pending" id="outboxInfo">Wachtrij controleren…</div><div class="actions">${button('Verstuur wachtrij','flush')}${button('Download reservekopie','outbox_export','',true)}${button('Download team-opdrachten','task_export','',true)}</div><p class="tiny">Buiten wifi: houd deze lokale teampagina open. Voor opnieuw openen buiten bereik gebruik je vooraf het team-opdrachtenbestand in de geïnstalleerde PWA via Stadskwis. Je kunt daar antwoorden bewaren en later als bestand inleveren.</p><label class="field"><span>Subgroepje / namen</span><input id="ownerName" data-draft maxlength="50" value="${escapeHtml(localStorage.getItem('groepsspel-subgroup')||'')}" placeholder="Bijvoorbeeld: Joep en Eric"></label><label class="field"><span>Offline antwoordenbestand inleveren</span><input type="file" id="offlineImport" accept="application/json,.json"></label>${state.tasks.map(t=>{const sub=state.submissions.find(s=>s.task_id===t.id),claim=state.claims[t.id];return `<article class="task"><h3>${escapeHtml(t.title)}</h3><span class="tag">${t.points} punten · ${escapeHtml(t.location)}</span><p>${escapeHtml(t.prompt)}</p>${claim?`<p>Opgepakt door: <strong>${escapeHtml(claim)}</strong></p>`:''}<div class="actions">${button('Wij pakken dit op','claim',`data-id="${t.id}"`,true)}${claim?button('Vrijgeven','release',`data-id="${t.id}"`,true):''}</div>${sub?`<div class="banner">${escapeHtml(sub.status)} · ${sub.points} punten ${sub.note?'· '+escapeHtml(sub.note):''}</div>`:''}${!sub||sub.status==='rejected'?`<form class="taskForm" data-id="${t.id}"><label class="field"><span>Jullie antwoord / toelichting</span><textarea id="taskAnswer-${t.id}" data-draft name="answer" maxlength="3000"></textarea></label>${evidenceMode()!=='whatsapp'?`<label class="field"><span>Foto ${t.kind==='photo'?'(verplicht)':'(optioneel)'}</span><input type="file" class="photoInput" data-id="${t.id}" accept="image/*"></label>`:''}${evidenceMode()!=='app'?`<label class="field"><span><input type="checkbox" name="via_whatsapp" value="yes"> Bewijs staat in de WhatsApp-groep</span></label>`:''}<div class="tiny" id="photoInfo-${t.id}"></div><button type="submit">Bewaar inzending</button></form>`:''}</article>`;}).join('')}</section>`;}
let introReadyPending=null;
function acknowledgeIntro(){
  const id=state?.auto?.intro_id;
  if(role!=='display'||!id||state.auto.until||state.auto.hold||introReadyPending===id||document.hidden||studioStatus==='loading'||window.gsStudio?.isCastLoading())return;
  introReadyPending=id;
  requestAnimationFrame(()=>requestAnimationFrame(async()=>{
    try{
      if(!document.hidden&&state?.auto?.intro_id===id&&!window.gsStudio?.isCastLoading())await api('/api/tv-intro-ready',{intro_id:id},'');
    }catch{/* The next status poll retries if the server did not accept it. */}
    finally{if(introReadyPending===id)introReadyPending=null;}
  }));
}
function tidySetup(){const form=$('#setupForm');if(!form)return;const mode=$('#setupMode')?.value,auto=mode==='buzzer'&&$('#setupAuto')?.value==='1';
  const show=(el,on)=>{const box=el?.closest('label,details');if(box)box.hidden=!on;};
  show($('#setupTaskCount'),mode==='city');show($('#taskJSON'),mode==='city');
  show($('#setupShow'),mode==='buzzer'&&auto);show($('#setupSeconds'),!(mode==='buzzer'&&auto)&&mode!=='city');show($('#setupAuto'),mode==='buzzer');}
document.addEventListener('change',e=>{if(e.target?.id==='setupMode'||e.target?.id==='setupAuto')tidySetup();});
function render(){if(role==='host')$('#root').innerHTML=state?host():'<p>Spelleider laden…</p>';else if(role==='display')$('#root').innerHTML=state?display():'<p>Spel laden…</p>';else $('#root').innerHTML=team();tidySetup();if(state?.mode==='city'&&role==='team'&&state.me)refreshOutbox();}
function clock(){if(!state)return;soundTick();const now=Date.now()/1000+offset,opening=state.opens_at-now,active=['countdown','open'].includes(state.phase),live=connected&&active&&opening<=0&&!state.me?.spectator;const text=state.phase==='countdown'&&opening>0?String(Math.ceil(opening)):state.phase==='paused'?'PAUZE':['quiz','wordrace'].includes(state.mode)&&active?Math.max(0,Math.ceil(state.ends_at-now))+' s':live?'GO!':'';const el=$('#roundTimer');if(el)el.textContent=text;const buzz=$('#buzzButton');if(buzz){buzz.disabled=!live||!!state.me?.attempted; buzz.classList.toggle('live',!buzz.disabled);}const textButton=$('#sendText');if(textButton)textButton.disabled=!live;document.querySelectorAll('[data-action="word"]').forEach(b=>b.disabled=!live);if(state.auto){document.querySelectorAll('[data-action="answer"]').forEach(b=>b.disabled=!state.auto.me?.can_answer);updateArena(now);const t=autoTimer(now);if(el)el.textContent=t;const fill=$('#autoFill');if(fill){const total=state.phase==='buzzed'?10:state.seconds||20,left=state.phase==='buzzed'?state.auto.answer_until-now:state.ends_at-now;fill.style.width=Math.max(0,Math.min(100,left/total*100))+'%';}}else document.querySelectorAll('[data-action="answer"]').forEach(b=>b.disabled=!live||(state.me?.answer!==null&&state.me?.answer!==undefined));}
function wordRace(){const active=state.teams.find(t=>t.id===state.active_team),words=state.private_words||(state.phase==='reveal'?state.question?.words:null);return `<p class="counter">Halve Minuut · beurt ${state.index+1} · twee beurten per team</p><h2>${escapeHtml(active?.name||'Wacht op de spelleider')}</h2><p>Geef jullie teamtelefoon aan de omschrijver. De rest kijkt naar het grote scherm. Omschrijf zonder het woord zelf te noemen; de omschrijver tikt op goed of pas.</p>${words?words.map((word,i)=>`<div class="wordline"><strong>${escapeHtml(word)}</strong>${state.word_marks[String(i)]?`<span>${state.word_marks[String(i)]==='correct'?'✓ Goed':'↪ Gepast'}</span>`:state.private_words?button('Goed','word',`data-word="${i}" data-mark="correct"`)+button('Pas','word',`data-word="${i}" data-mark="skip"`,true):''}</div>`).join(''):'<div class="pending">Woorden verschijnen alleen op de telefoon van het actieve team zodra de klok start.</div>'}`;}
async function ping(){let samples=[];for(let i=0;i<5;i++){const start=Date.now();const r=await api('/api/ping',null,'');const end=Date.now();samples.push({delay:end-start,offset:r.time-(start+end)/2000});}samples.sort((a,b)=>a.delay-b.delay);latency=samples[2].delay;offset=samples[0].offset;}
/* 0.24: laadscherm op de tv zolang de 3D-studio en de personages laden, met voortgangsbalk */
let studioLoadingTimer=0;
function studioLoadingView(){if(role!=='display')return;if(!studioLoadingTimer)studioLoadingTimer=setInterval(studioLoadingView,400);const st=window.gsStudio,loading=!!st?.isCastLoading?.();let el=document.getElementById('studioLoading');
  if(!loading){if(el)el.remove();if(window.gsStudio&&studioLoadingTimer){clearInterval(studioLoadingTimer);studioLoadingTimer=0;}return;}
  if(!el){el=document.createElement('div');el.id='studioLoading';el.className='studio-loading';el.innerHTML='<div><b>Studio wordt opgebouwd…</b><div class="studio-loading-bar"><i></i></div><span data-pct></span></div>';document.body.appendChild(el);}
  const pct=Math.round(100*(st?.loadProgress?.()||0));el.querySelector('i').style.width=pct+'%';el.querySelector('[data-pct]').textContent=pct+'%';}
async function poll(){if(polling)return;polling=true;try{const next=await api(role==='host'?'/api/host':role==='team'&&teamKey?'/api/team':'/api/public');connected=true;$('#connection').textContent=ONLINE?'● Online verbonden':'● Lokale server verbonden';$('#connection').classList.remove('bad');const compare={...next,server_time:0};const before=state;state=next;soundUpdate(before,next);if(signature!==JSON.stringify(compare)){signature=JSON.stringify(compare);preserveRender();}acknowledgeIntro();reportTv(false);studioLoadingView();const cast=$('[data-tv-cast]');if(cast){const label=window.gsStudio?.castStatus?.()||'';if(cast.textContent!==label)cast.textContent=label;}if(role==='team'&&state.me&&state.mode==='city')flush();}catch(err){connected=false;$('#connection').textContent='○ Verbinding weg · gegevens blijven bewaard';$('#connection').classList.add('bad');if(err.status===403&&role==='team'){teamKey='';localStorage.removeItem('groepsspel-lan-team');state=null;render();}}finally{polling=false;}clock();}
async function refreshOutbox(){try{const items=(await outbox('all')).filter(x=>x.session===sessionKey());const el=$('#outboxInfo');if(el)el.textContent=items.length?`${items.length} inzending(en) lokaal bewaard. ${connected?'Wordt verstuurd zodra de stadskwis open is.':'Versturen kan bij terugkeer op wifi.'}`:'Alle lokaal bewaarde inzendingen zijn verstuurd.';}catch{const el=$('#outboxInfo');if(el)el.textContent='Lokale opslag niet beschikbaar. Houd de pagina open en download een reservekopie.';}}
async function flush(){if(flushing||!connected||state?.phase!=='city'||!state.me)return;flushing=true;try{for(const item of (await outbox('all')).filter(x=>x.session===sessionKey())){if(item.blocked)continue;try{await api('/api/submit',item.payload);await outbox('delete',item.key);}catch(err){if(err.status){item.blocked=err.message;await outbox('put',item);note('Inzending vraagt aandacht: '+err.message);}break;}}await refreshOutbox();}finally{flushing=false;}}
function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function resizePhoto(file,limit=750000,size=1000){if(file.size>20000000)throw new Error('Kies een foto kleiner dan 20 MB.');const img=new Image(),url=URL.createObjectURL(file);try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Foto kon niet worden geopend.'));img.src=url;});const canvas=document.createElement('canvas'),ratio=Math.min(1,size/Math.max(img.width,img.height));canvas.width=Math.round(img.width*ratio);canvas.height=Math.round(img.height*ratio);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.65);if(data.length>limit)throw Error('Foto blijft te groot. Kies een kleinere foto.');return data;}finally{URL.revokeObjectURL(url);}}
document.addEventListener('change',async e=>{try{if(e.target.id==='friendPhotos'){
  friendPhotos=Array.from(e.target.files);
  const report=$('#friendPhotoStatus');if(report)report.textContent=friendPhotos.length+' foto’s geselecteerd';
 }
 if(e.target.id==='questionsImport'){const file=e.target.files[0];if(!file)return;if(file.size>200000)throw Error('Vragenbestand te groot.');const pack=JSON.parse(await file.text()),questions=Array.isArray(pack)?pack:pack.questions;if(!Array.isArray(questions)||!questions.length)throw Error('Geen vragen gevonden.');$('#questionJSON').value=JSON.stringify(questions,null,2);drafts.questionJSON=$('#questionJSON').value;note(questions.length+' vragen ingelezen. Kies de quizvorm en zet het spel klaar.');}if(e.target.id==='lanAddress'){lanPick=e.target.value;try{localStorage.setItem('groepsspel-lan-address',lanPick);}catch{}$('#joinURL').textContent=e.target.value;}if(e.target.classList.contains('photoInput')){const file=e.target.files[0];if(file){photos[e.target.dataset.id]=await resizePhoto(file);$('#photoInfo-'+e.target.dataset.id).textContent='Foto klaar om te bewaren.';}}if(e.target.id==='ownerName')localStorage.setItem('groepsspel-subgroup',e.target.value);if(e.target.id==='offlineImport'){const file=e.target.files[0];if(!file)return;if(file.size>20000000)throw Error('Bestand te groot.');const pack=JSON.parse(await file.text());if(pack.room_id!==state.room_id||pack.team_id!==state.me.id||!Array.isArray(pack.submissions))throw Error('Dit bestand hoort niet bij deze sessie en dit team.');for(const payload of pack.submissions){await outbox('put',{key:sessionKey()+':'+payload.id,session:sessionKey(),payload});}await refreshOutbox();await flush();note('Offline inzendingen ingelezen.');}}catch(err){note(err.message);}});
document.addEventListener('submit',async e=>{e.preventDefault();try{const form=e.target,data=new FormData(form);if(form.hasAttribute('data-estimate')){const v=Number(data.get('estimate'));if(!Number.isFinite(v)||v<0)throw Error('Vul een getal in.');state=await api('/api/answer',{question_id:state.question_id,pressed_at:Date.now()/1000+offset,choice:Math.round(v)});delete drafts.estimateInput;signature='';preserveRender();return;}if(form.id==='joinForm'){const r=await api('/api/join',Object.fromEntries(data),'');teamKey=r.token;localStorage.setItem('groepsspel-lan-team',teamKey);await ping();signature='';await poll();}else if(form.id==='textAnswerForm'){state=await api('/api/answer',{question_id:state.question_id,text:String(data.get('text'))});delete drafts.textAnswer;signature='';preserveRender();}else if(form.id==='setupForm'){const payload={action:'setup',...Object.fromEntries(data),seconds:Number(data.get('seconds')),count:Number(data.get('count')),task_count:Number(data.get('task_count')||0),auto:data.get('mode')==='buzzer'&&data.get('auto')==='1',show:String(data.get('show')||'normaal')};if(theme)Object.assign(payload,{mode:'buzzer',auto:true,theme,year:Number(data.get('year'))});
      if((!theme||theme==='pubquiz'||theme==='friends')&&$('#questionJSON').value.trim())payload.questions=JSON.parse($('#questionJSON').value);
      if(theme==='friends'&&!payload.questions)payload.questions=friendQuestionList(String(data.get('friends')||''));
      if(theme==='friends'&&friendPhotos.length)await addFriendPhotos(payload.questions);
      if(payload.questions&&new Blob([JSON.stringify(payload.questions)]).size>1050000)throw Error('De vragen met foto’s zijn samen te groot. Gebruik minder foto’s.');
      payload.tasks=JSON.parse($('#taskJSON').value);await api('/api/action',payload);friendPhotos=[];drafts={};signature='';await poll();}else if(form.classList.contains('gradeForm')){await api('/api/action',{action:'grade',submission_id:form.dataset.id,points:Number(data.get('points')),note:String(data.get('note')),approved:e.submitter?.value==='yes'});signature='';await poll();}else if(form.classList.contains('taskForm')){const taskId=form.dataset.id,owner=$('#ownerName').value.trim();if(!owner)throw Error('Vul eerst de namen van je subgroepje in.');const payload={id:crypto.randomUUID?crypto.randomUUID():randomUUID(),task_id:taskId,answer:String(data.get('answer')),photo:photos[taskId]||'',owner,via_whatsapp:data.get('via_whatsapp')==='yes'};const task=state.tasks.find(t=>t.id===taskId);if(task.kind==='photo'&&!payload.photo&&!payload.via_whatsapp)throw Error('Voeg eerst de foto toe.');if(!payload.answer.trim()&&!payload.photo&&!payload.via_whatsapp)throw Error('Vul een antwoord in.');await outbox('put',{key:sessionKey()+':'+payload.id,session:sessionKey(),payload});photos[taskId]='';form.reset();delete drafts['taskAnswer-'+taskId];note('Inzending veilig op dit apparaat bewaard.');await refreshOutbox();await flush();}}catch(err){note(err.message);}});
function randomUUID(){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const s=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+s.slice(16,20)+'-'+s.slice(20);}
document.addEventListener('change',e=>{if(e.target.id==='evidenceMode'){drafts.evidenceMode=e.target.value;preserveRender();}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b||busy)return;const action=b.dataset.action;try{if(['target','avatar','bank','symbol','character'].includes(action)){busy=true;state=await api('/api/answer',{question_id:state.question_id,...(action==='target'?{target:b.dataset.id}:action==='bank'?{bank:true}:{[action]:b.dataset.id})});signature='';preserveRender();}else if(['buzz','answer','word','throw','stake'].includes(action)){b.disabled=true;busy=true;
      const feedback=state.auto&&role==='team'&&['buzz','answer','throw'].includes(action);
      if(feedback)navigator.vibrate?.(18);
      state=await api('/api/answer',{question_id:state.question_id,pressed_at:Date.now()/1000+offset,...(action==='answer'?{choice:Number(b.dataset.choice)}:action==='word'?{word:Number(b.dataset.word),mark:b.dataset.mark}:action==='throw'?{throw:true}:action==='stake'?{stake:Number(b.dataset.bet)}:{})});signature='';preserveRender();}else if(action==='flush'){await flush();}else if(action==='outbox_export'){const items=(await outbox('all')).filter(x=>x.session===sessionKey());download('Groepsspel-inzendingen.json',{room_id:state.room_id,team_id:state.me.id,submissions:items.map(x=>x.payload)});}else if(action==='task_export'){download('Groepsspel-team-opdrachten.json',{type:'groepsspel-city-pack',version:1,room_id:state.room_id,team_id:state.me.id,team_name:state.me.name,tasks:state.tasks});}else if(action==='claim'||action==='release'){const owner=$('#ownerName').value.trim();state=await api('/api/claim',{task_id:b.dataset.id,owner,release:action==='release'});signature='';preserveRender();}else if(action==='export'){download('Groepsspel-uitslag.json',await api('/api/export'));}else if(action==='photo'){const response=await fetch('/media/'+b.dataset.id,{headers:{Authorization:'Bearer '+hostKey}});if(!response.ok)throw Error('Foto kon niet worden geopend.');if(photoURLs[b.dataset.id])URL.revokeObjectURL(photoURLs[b.dataset.id]);photoURLs[b.dataset.id]=URL.createObjectURL(await response.blob());const image=document.createElement('img');image.src=photoURLs[b.dataset.id];image.alt='Ingezonden opdrachtfoto';$('#photo-'+b.dataset.id).replaceChildren(image);}else{let payload={action};if(action==='next'&&state.auto&&state.phase==='lobby')payload.intro=true;if(action==='judge')Object.assign(payload,{team_id:b.dataset.id,correct:b.dataset.correct==='true'});if(action==='spectator')Object.assign(payload,{team_id:b.dataset.id,value:b.dataset.value==='true'});if(action==='remove_team')payload.team_id=b.dataset.id;if(action==='score'){const score=prompt('Nieuwe basisscore voor '+b.dataset.name);if(score===null)return;Object.assign(payload,{team_id:b.dataset.id,score:Number(score)});}if(action==='evidence_save'){payload.mode=drafts.evidenceMode ?? evidenceMode();payload.link=drafts.evidenceLink ?? evidenceLink();}
      if(action==='finish'&&!confirm('Spel afronden? De uitslag blijft bewaard.'))return;if(action==='setup')return;await api('/api/action',payload);if(action==='evidence_save'){delete drafts.evidenceMode;delete drafts.evidenceLink;}signature='';await poll();}}catch(err){note(err.message);}finally{busy=false;clock();}});
/* 0.15.4: automatische spelshow (zoals een quizshow op de spelcomputer) met rondesoorten en personages. */
const TEAM_SYMBOLS={
  sun:['☀','Zon'], bolt:['ϟ','Bliksem'], crown:['♛','Kroon'], comet:['✦','Komeet'],
  diamond:['◆','Diamant'], flame:['♨','Vlam'], wave:['≋','Golf'], clover:['♣','Klavertje']
};
const CAST=[
  ['p1','Vonk','Koraal'], ['p2','Bo','Oranje'], ['p3','Beat','Magenta'], ['p4','Blits','Turkoois'],
  ['p5','Nova','Violet'], ['p6','Raket','Limoen'], ['p7','Dandy','Koningsblauw'], ['p8','Pixel','Mint']
];
function teamSymbol(team, cls='av'){
  const [mark,name]=TEAM_SYMBOLS[team.symbol]||TEAM_SYMBOLS.comet;
  return `<span class="${cls} team-emblem" role="img" aria-label="${name}">${mark}</span>`;
}
function appearanceFields(team){
  const choices=(field,items)=>items.map(([id,body])=>team?
    `<button type="button" class="look-choice look-${id}" aria-pressed="${team[field]===id}" data-action="${field}" data-id="${id}">${body}</button>`:
    `<label class="look-choice look-${id}"><input type="radio" name="${field}" value="${id}" ${field==='symbol'&&items[0][0]===id?'checked':''}><span>${body}</span></label>`).join('');
  const symbols=Object.entries(TEAM_SYMBOLS).map(([id,[mark,name]])=>[id,`<b class="look-mark">${mark}</b> ${name}`]);
  const cast=CAST.map(([id,name,color])=>[id,`<img class="look-face" src="/app/assets/cast/${id}.webp" alt="" loading="lazy" width="160" height="160"><b>${name}</b><small>${color}</small>`]);   // 0.20: portret van het 3D-personage
  return `<fieldset class="show-look"><legend>1. Teamsymbool</legend><div class="look-grid">${choices('symbol',symbols)}</div></fieldset>
    <fieldset class="show-look"><legend>2. Personage op de tv</legend><div class="look-grid">${choices('character',cast)}</div></fieldset>`;
}
const ROUND_RULES={jacht:'Iedereen antwoordt tegelijk op de eigen telefoon. Elk goed antwoord levert 2 punten op.',snel:'Hoe sneller jullie het goede antwoord geven, hoe meer punten: 5, 4, 3, 2 of 1.',buzz:'Druk als eerste op de buzzer en kies dan het antwoord. Goed: 2 punten. Fout: 1 punt eraf en de anderen mogen nog.',taart:'Iedereen antwoordt. Het snelste goede antwoord mag een taart gooien: het geraakte team verliest 2 punten.',roof:'Iedereen antwoordt. Het snelste goede antwoord steelt 2 punten van een team naar keuze.',bom:'Alleen het team met de bom antwoordt. Goed: de bom gaat door naar het volgende team. Wie hem heeft als hij ontploft, verliest 3 punten.',finale:'Snelste goede antwoord: 3 punten, goed: 2 punten, fout: 2 punten eraf, niet geantwoord: 1 punt eraf.'};
const ROUND_ICON={mix:'🔎',wissel:'🔐',inzet:'🎰',jacht:'🎯',snel:'⚡',buzz:'🔴',taart:'🥧',roof:'🦝',bom:'💣',finale:'🏁'};
const teamById=id=>(state.teams||[]).find(t=>t.id===id);
function autoTimer(now){const a=state.auto;if(a.hold)return 'PAUZE';if(state.phase==='stake')return Math.max(0,Math.ceil(a.stake.until-now))+' s';if(state.phase==='buzzed'&&a.answer_until)return Math.max(0,Math.ceil(a.answer_until-now))+' s';if(state.phase==='open'&&a.mode!=='bomb')return Math.max(0,Math.ceil(state.ends_at-now))+' s';if(state.phase==='countdown')return Math.max(0,Math.ceil(state.opens_at-now))+'';if(state.phase==='pick'&&a.pick)return Math.max(0,Math.ceil(a.pick.until-now))+' s';return '';}
function roundRules(a){
  if(a.type==='mix')return 'Plaatjes, schatvragen en volgordevragen. Goed is 2 punten. Bij schatten wint wie het dichtst bij zit; precies goed is 3 punten.';
  if(a.type==='wissel')return 'Goed antwoord is 1 punt. Het snelste juiste team kiest: 2 bonuspunten in de kluis, of maximaal 3 punten van een tegenstander kraken.';
  if(a.type==='inzet')return 'Je ziet eerst het onderwerp. Zet punten in: goed levert je inzet op, fout of geen antwoord kost je inzet.';
  if(a.finale)return 'Jullie score bepaalt de starttijd. Antwoorden stopt jullie klok. Goed levert extra tijd op, fout kost tijd. Bij nul liggen jullie eruit.';
  if(a.type==='taart'&&a.arena_rules)return 'Geef als snelste het goede antwoord. Gooi zodra het vizier op een tegenstander staat. Een treffer kost dat team twee punten.';
  return ROUND_RULES[a.type]||'';
}
function showRanking(data){
  const order=data.auto?.finale?.rank||[];
  const teams=data.teams.filter(t=>!t.spectator);
  return order.length?order.map(id=>teams.find(t=>t.id===id)).filter(Boolean):teams.sort((x,y)=>y.score-x.score);
}
function finaleLanes(teamId){
  const f=state.auto.finale;
  return `<div class="finale-lanes">${state.teams.filter(t=>Object.hasOwn(f.bank,t.id)&&(!teamId||teamId===t.id)).map(t=>`
    <div class="finale-lane" data-finalist="${escapeHtml(t.id)}">${teamSymbol(t)}
    <b>${escapeHtml(t.name)}</b><span class="finale-clock"></span>
    <div class="finale-track"><span></span></div></div>`).join('')}</div>`;
}
function pieAim(){
  const p=state.auto.pick;
  return `<div class="pie-rail">${p.targets.map(id=>`<span data-pie-target="${escapeHtml(id)}">${escapeHtml(teamById(id)?.name||'')}</span>`).join('')}</div>`;
}
function stakeScreen(team=false){
  const a=state.auto, mine=a.me||{}, locked=a.stake.locked.length;
  const active=state.teams.filter(t=>!t.spectator).length;
  const status=team&&mine.bet!=null
    ? `<p>Jullie inzet staat vast: <strong>${mine.bet}</strong></p>`
    : `<p>${locked} van ${active} teams klaar</p>`;
  const buttons=team&&mine.stake_options
    ? `<div class="stake-options">${mine.stake_options.map(bet=>`<button type="button" data-action="stake" data-bet="${bet}" disabled>${bet} <span>${bet===1?'punt':'punten'}</span></button>`).join('')}</div>`
    : '';
  return `<section class="stake-stage"><p class="counter">${team?'Kies jullie inzet':'Alles op het spel'}</p>
    <h2>${escapeHtml(a.stake.category)}</h2>${status}${buttons}
    <div class="stake-track" aria-hidden="true"><span></span></div></section>`;
}
function scoreEffects(a){
  const e=a.effect;
  if(e?.kind==='vault')return `<p class="arena-callout">Kluis · ${escapeHtml(teamById(e.from)?.name||'')} +${e.points}</p>`;
  if(e?.kind==='pie_miss')return '<p class="arena-callout">Mis! De taart vliegt voorbij.</p>';
  if(e&&['steal','pie','boom'].includes(e.kind)){
    const label={steal:'Puntenroof',pie:'Raak!',boom:'Boem!'}[e.kind];
    return `<p class="arena-callout">${label} · ${escapeHtml(teamById(e.to)?.name||'')} −${e.points}</p>`;
  }
  if(a.type!=='inzet'&&a.type!=='snel')return '';
  const results=(a.results||[]).filter(r=>r.points).sort((x,y)=>y.points-x.points);
  return results.length?`<div class="score-effects">${results.slice(0,8).map(r=>`
    <span class="${r.points>0?'gain':'loss'}">${escapeHtml(teamById(r.team_id)?.name||'')}
      <strong>${r.points>0?'+':''}${r.points}</strong></span>`).join('')}</div>`:'';
}
function updateArena(now){
  const a=state.auto,p=a.pick,f=a.finale;
  const cue=$('[data-question-count]');
  if(cue){
    const seconds=Math.max(1,Math.ceil(state.opens_at-now));
    if(cue.textContent!==String(seconds))cue.textContent=seconds;
  }
  const clockNode=$('[data-controller-clock]');
  if(clockNode){
    const end=state.phase==='buzzed'?a.answer_until:state.ends_at;
    const seconds=Math.max(0,Math.ceil(end-now));
    clockNode.textContent=seconds+' s';
    clockNode.classList.toggle('urgent',seconds<=4);
  }
  if(state.phase==='stake'){
    const remaining=a.stake.until-(a.stake.paused_at??now);
    const track=$('.stake-track span');
    if(track)track.style.width=Math.max(0,Math.min(100,remaining*10))+'%';
    document.querySelectorAll('[data-action="stake"]').forEach(button=>{
      button.disabled=busy||!connected||a.hold||remaining<=0;
    });
  }
  if(f){
    const running=state.phase==='open';
    const elapsed=running?Math.max(0,state.seconds-Math.max(0,state.ends_at-now)):f.elapsed;
    document.querySelectorAll('[data-finalist]').forEach(node=>{
      const id=node.dataset.finalist, used=running||state.phase==='paused'?(f.frozen[id]??elapsed):0;
      const left=Math.max(0,f.bank[id]-used);
      node.querySelector('.finale-clock').textContent=left>0?Math.ceil(left)+' s':'UIT';
      node.querySelector('.finale-track span').style.width=left/15*100+'%';
      node.classList.toggle('out',left<=0);
      node.classList.toggle('urgent',left>0&&left<=4);
      node.classList.toggle('locked',running&&Object.hasOwn(f.frozen,id));
    });
  }
  if(state.phase==='pick'&&p?.kind==='vault'){
    const remaining=Math.max(0, p.until-(p.paused_at??now));
    document.querySelectorAll('[data-vault-time]').forEach(e=>{
      const label=Math.ceil(remaining)+' s';
      if(e.textContent!==label)e.textContent=label;
    });
    document.querySelectorAll('.vault-decision button[data-action]').forEach(button=>{
      button.disabled=busy||!connected||a.hold||remaining<=0||button.hasAttribute('data-no-points');
    });
  }
  if(state.phase==='pick'&&p?.targets){
    const elapsed=(p.paused_at??now)-p.start, index=Math.floor(elapsed/p.slot);
    const id=elapsed>=0&&elapsed-index*p.slot<p.hit?p.targets[index%p.targets.length]:null;
    document.querySelectorAll('[data-pie-target]').forEach(node=>node.classList.toggle('aimed',node.dataset.pieTarget===id));
    const throwButton=$('[data-action="throw"]');
    if(throwButton)throwButton.disabled=busy||!connected||a.hold||elapsed<0||now>=p.until;
  }
}
function autoStrip(){const a=state.auto,res=Object.fromEntries((a.results||[]).map(r=>[r.team_id,r])),eff=a.effect||{};
  return `<div class="auto-strip">${(state.teams||[]).filter(t=>!t.spectator).map(t=>{const r=res[t.id],hit=eff.to===t.id&&['pie','steal','boom'].includes(eff.kind)&&['reveal'].includes(state.phase),bomb=a.bomb&&a.bomb.holder===t.id&&!a.bomb.boom;
    return `<div class="auto-team ${r?(r.correct?'ok':'bad'):''} ${a.answered.includes(t.id)?'answered':''} ${hit?'hit-'+eff.kind:''} ${bomb?(a.bomb.hurry?'bomb hurry':'bomb'):''} ${!t.connected?'gone':''}"><div class="auto-av">${teamSymbol(t)}${hit&&eff.kind==='pie'?'<span class="splat">🥧</span>':''}${hit&&eff.kind==='boom'?'<span class="splat">💥</span>':''}${bomb?'<span class="bomb-icon">💣</span>':''}${a.answered.includes(t.id)&&state.phase==='open'?'<span class="tick-mark">✓</span>':''}</div><b translate="no">${escapeHtml(t.name)}</b><span class="auto-score">${t.score}</span>${r&&r.points?`<span class="delta ${r.points>0?'up':'down'}">${r.points>0?'+':''}${r.points}</span>`:''}${hit&&eff.points?`<span class="delta down">−${eff.points}</span>`:''}${eff.from===t.id&&eff.kind==='steal'&&state.phase==='reveal'&&eff.points?`<span class="delta up">+${eff.points}</span>`:''}</div>`;}).join('')}</div>`;}
function vaultDecision(a, controller=false){
  const chooser=teamById(a.pick.team_id), active=state.teams.filter(t=>!t.spectator&&t.id!==a.pick.team_id);
  return `<div class="vault-decision">
    <p class="vault-label">Kluis of Kraak <b data-vault-time></b></p>
    <h2>${escapeHtml(chooser?.name||'')} kiest</h2>
    ${controller?'<button type="button" class="vault-bank" data-action="bank">🔒 Kluis <b>+2 punten</b></button>':'<p>+2 punten in de kluis of maximaal 3 punten kraken</p>'}
    <div class="vault-rivals">${active.map(t=>{
      const points=Math.min(3,t.score);
      const tag=controller?'button':'div';
      return `<${tag}${controller?` type="button" data-action="target" data-id="${escapeHtml(t.id)}" ${points ? '' : 'disabled data-no-points'}`:''}>${teamSymbol(t)} <span translate="no">${escapeHtml(t.name)}</span> <b>${points} pt</b></${tag}>`;
    }).join('')}</div></div>`;
}
function autoScreen(){const a=state.auto,q=state.question,ph=state.phase,ranked=showRanking(state);
  if(ph==='lobby')return `<div class="auto-card"><h1>De show begint zo!</h1><p>${escapeHtml(a.names.join(' → '))}</p>${autoStrip()}</div>`;
  if(ph==='intro'){
    const teams=state.teams.filter(t=>!t.spectator);
    return `<div class="show-opening ${a.until?'opening-playing':'opening-ready'}">
      <p class="opening-host">${a.until?'Met Joep':'Opening laden…'}</p><h1>${escapeHtml(state.name||'Groepsspel')}</h1>
      <ul class="opening-teams">${teams.map(t=>`<li>${teamSymbol(t)} <span translate="no">${escapeHtml(t.name)}</span></li>`).join('')}</ul>
    </div>`;
  }
  if(ph==='stake')return stakeScreen();
  if(ph==='pick'&&a.pick?.kind==='vault')return vaultDecision(a);
  if(ph==='round')return `<div class="auto-card round-card"><p class="counter">Ronde ${a.round} van ${a.rounds}</p><div class="round-icon">${ROUND_ICON[a.type]||'🎲'}</div><h1>${escapeHtml(a.name)}</h1><p class="round-rules">${escapeHtml(roundRules(a))}</p><p class="tiny">${a.questions} vragen</p></div>`;
  if(ph==='standings'||ph==='finished')return `<div class="auto-card"><p class="counter">${ph==='finished'?'Prijsuitreiking':'Tussenstand na ronde '+a.round}</p>${ph==='finished'&&ranked[0]?`<div class="winner">${teamSymbol(ranked[0],'av big')}<h1>🏆 <span translate="no">${escapeHtml(ranked[0].name)}</span></h1></div>`:'<h1>Tussenstand</h1>'}<ol class="auto-rank">${ranked.map((t,i)=>`<li>${teamSymbol(t)}<span translate="no">${escapeHtml(t.name)}</span><b>${a.finale?.rank.length?(i+1)+'e':t.score}</b></li>`).join('')}</ol></div>`;
  const reveal=['reveal','pick'].includes(ph),holder=a.bomb&&teamById(a.bomb.holder);
  return `<div class="auto-q"><p class="counter">${ROUND_ICON[a.type]||''} ${escapeHtml(a.name)} · vraag ${a.question_no} van ${a.questions}</p>${ph==='countdown'||!q?`<div class="question-ready"><span>${a.question_no===a.questions?(a.finale?'Laatste finalevraag':'Laatste vraag van de ronde'):'Vraag '+a.question_no}</span><b data-question-count></b></div>`:`<h1 class="question">${escapeHtml(q.q)}</h1>${q.image?`<img class="show-question-image" src="${escapeHtml(q.image)}" alt="Vraagfoto">`:''}${q.kind==='estimate'?estimateBoard(q,a,reveal):''}${q.picture?'<div class="pic-row">'+`<img class="show-question-picture" src="${escapeHtml(q.picture)}" alt="">`:''}<div class="auto-options ${q.seq?'seq-options':''}">${(q.options||[]).map((o,i)=>`<div class="auto-opt opt-${i} ${reveal&&q.correct===i?'correct':''} ${reveal&&q.correct!==i?'dim':''}"><b>${'ABCD'[i]}</b>${optText(q,i)}</div>`).join('')}</div>${q.picture?'</div>':''}`}${a.mode!=='bomb'&&['open','buzzed'].includes(ph)?'<div class="auto-bar"><span id="autoFill"></span></div>':''}${a.mode==='bomb'&&holder&&!a.bomb.boom?`<p class="bomb-line ${a.bomb.hurry?'hurry':''}">💣 <span translate="no">${escapeHtml(holder.name)}</span> heeft de bom!</p>`:''}${ph==='buzzed'&&state.buzzes[0]?`<p class="buzz-line">🔴 <span translate="no">${escapeHtml(state.buzzes[0].name)}</span> drukte als eerste!</p>`:''}${ph==='pick'&&a.pick?`<p class="buzz-line">${a.pick.kind==='pie'?'🥧':'🦝'} <span translate="no">${escapeHtml(teamById(a.pick.team_id)?.name||'')}</span> ${a.pick.kind==='pie'?(a.pick.targets?'staat klaar om te gooien…':'kiest wie de taart krijgt…'):'kiest van wie ze punten stelen…'}</p>`:''}${ph==='pick'&&a.pick?.targets?pieAim():''}${ph==='reveal'?scoreEffects(a):''}${sprintRanking(a)}${questionReaction(a,ph)}</div>${a.finale?finaleLanes():autoStrip()}`;}
/* 0.24: volgordevragen tonen elk onderdeel apart (vertaalbaar), schatvragen een getal */
function optText(q,i){return q.seq?q.seq[i].map(x=>`<span>${escapeHtml(x)}</span>`).join('<i class="seq-arrow">→</i>'):escapeHtml(q.options[i]);}
function fmtNum(n){return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');}
function estimateBoard(q,a,reveal){
  if(!reveal)return `<div class="estimate-hint">🔢 <span>Schat het antwoord</span> <b>(${escapeHtml(q.unit||'')})</b></div>`;
  const rows=(a.results||[]).filter(r=>Number.isFinite(r.choice)).sort((x,y)=>Math.abs(x.choice-q.value)-Math.abs(y.choice-q.value));
  return `<div class="estimate-answer"><span>Antwoord</span><b>${fmtNum(q.value)}</b><em>${escapeHtml(q.unit||'')}</em></div><ol class="estimate-guesses">${rows.map(r=>`<li class="${r.correct?'win':''}"><span translate="no">${escapeHtml(teamById(r.team_id)?.name||'')}</span><b>${fmtNum(r.choice)}</b></li>`).join('')}</ol>`;
}
function questionReaction(a,phase){
  if(a.mode!=='all'||a.finale||a.effect)return '';
  const total=state.teams.filter(t=>!t.spectator).length;
  if(phase==='open')return `<p class="question-reaction">${a.answered.length} / ${total} teams hebben gekozen</p>`;
  if(phase==='reveal'&&a.results?.length){
    const good=a.results.filter(r=>r.correct).length;
    return `<p class="question-reaction result">${good===0?'Iedereen mis!':good===total?'Iedereen raak!':`${good} van de ${total} teams goed`}</p>`;
  }
  return '';
}
function sprintRanking(a){
  if(a.type!=='snel'||state.phase!=='reveal')return '';
  const fastest=(a.results||[]).filter(r=>r.correct&&Number.isFinite(r.ms))
    .sort((x,y)=>x.rank-y.rank).slice(0,3);
  if(!fastest.length)return '';
  return `<ol class="sprint-ranking" aria-label="Snelste goede antwoorden">${fastest.map(r=>
    `<li><strong>${r.rank}</strong><span translate="no">${escapeHtml(teamById(r.team_id)?.name||'')}</span><b>${(r.ms/1000).toFixed(2).replace('.',',')} s</b><em>+${r.points}</em></li>`).join('')}</ol>`;
}
function autoTeam(){const a=state.auto,me=state.me,mine=a.me||{},ph=state.phase,q=state.question,res=(a.results||[]).find(r=>r.team_id===me.id);
  const opts=()=>q?.kind==='estimate'?`<form class="estimate-form" data-estimate><label><span>Jullie schatting</span><input type="number" inputmode="numeric" min="0" step="1" name="estimate" id="estimateInput" data-draft required autocomplete="off"><em>${escapeHtml(q.unit||'')}</em></label><button class="primary" type="submit">Vastzetten</button></form>`:`<div class="auto-answers controller-keys ${q?.seq?'seq-options':''}">${(q?.options||[]).map((o,i)=>`<button class="auto-opt opt-${i}" data-action="answer" data-choice="${i}"><b>${'ABCD'[i]}</b><span>${optText(q,i)}</span></button>`).join('')}</div>`;
  const buzzTeam=state.buzzes?.[0];
  const locked=Number.isInteger(mine.choice),lockText=q?.kind==='estimate'&&locked?fmtNum(mine.choice):'ABCD'[mine.choice];
  const status=mine.can_answer?'Jullie zijn aan zet':locked?'Antwoord vastgezet':ph==='countdown'?'Maak je klaar':a.name;
  const isTimed=!a.finale&&a.mode!=='bomb'&&['open','buzzed'].includes(ph);
  let body='';
  if(['lobby','finished'].includes(ph))body=`${ph==='finished'?autoScreen():''}${appearanceFields(me)}`;
  else if(['intro','round','standings'].includes(ph))body=autoScreen();
  else if(ph==='stake')body=stakeScreen(true);
  else if(ph==='countdown')body=`<h2>Let op, de vraag komt eraan…</h2>${a.teaser?`<p class="teaser">${escapeHtml(a.teaser.text)}</p>`:''}<p class="tiny">${escapeHtml(roundRules(a))}</p>`;
  else if(ph==='paused')body='<h2>De show is gepauzeerd</h2>';
  else if(ph==='pick'&&a.pick?.kind==='vault')body=vaultDecision(a,mine.must_pick==='vault');
  else if(ph==='pick'&&a.pick?.targets)body=mine.must_pick?
    `<h2>Raak een tegenstander</h2>${pieAim()}<button type="button" class="throw-button" data-action="throw" disabled>Gooi!</button>`:
    `<h2>Kijk naar het grote scherm</h2>`;
  else if(ph==='pick')body=mine.must_pick?`<h2>${mine.must_pick==='pie'?'🥧 Naar wie gooien jullie de taart?':'🦝 Van wie stelen jullie 2 punten?'}</h2><div class="avatar-pick targets">${(state.teams||[]).filter(t=>!t.spectator&&t.id!==me.id).map(t=>`<button type="button" data-action="target" data-id="${t.id}">${teamSymbol(t)}<span translate="no">${escapeHtml(t.name)}</span><small>${t.score}</small></button>`).join('')}</div>`:`<h2>${a.pick?.kind==='pie'?'🥧 Er vliegt zo een taart…':'🦝 Er worden punten gestolen…'}</h2>`;
  else if(a.finale&&a.finale.out.includes(me.id))body='<h2>Jullie liggen uit de finale</h2><p>Volg de wedstrijd op het grote scherm.</p>';
  else if(ph==='reveal')body=res?`<div class="auto-result ${res.correct?'ok':'bad'}">${res.correct?'✓ Goed!':'✗ Helaas'}${res.seconds!=null?` <b>${res.seconds>0?'+':''}${res.seconds} s</b>`:res.points?` <b>${res.points>0?'+':''}${res.points}</b>`:''}</div>`:`<h2>${a.effect?.kind==='boom'&&a.effect.to===me.id?'💥 BOEM! De bom ontplofte bij jullie.':a.effect?.kind==='pie'&&a.effect.to===me.id?'🥧 Pats! Jullie kregen de taart.':'Kijk naar het grote scherm'}</h2>`;
  else if(a.mode==='buzz')body=mine.can_answer?`<h2>Jullie wonnen de buzz!</h2>${opts()}`:ph==='buzzed'?
    `<h2><span translate="no">${escapeHtml(buzzTeam?.name||'')}</span> is aan zet</h2><p>Houd je klaar voor de volgende buzz.</p>`:locked?
    `<div class="controller-lock"><strong>${'ABCD'[mine.choice]}</strong><span>Jullie hebben deze vraag al geprobeerd.</span></div>`:`<button class="buzzer" id="buzzButton" data-action="buzz" disabled>BUZZ!</button><p>${me.attempted?'Jullie hebben deze vraag al geprobeerd.':'Druk zodra de vraag open is.'}</p>`;
  else if(a.mode==='bomb')body=mine.can_answer?`<h2 class="bomb-line">💣 Jullie hebben de bom! Snel antwoorden!</h2>${opts()}`:`<h2>💣 <span translate="no">${escapeHtml(teamById(a.bomb?.holder)?.name||'')}</span> heeft de bom.</h2>`;
  else body=mine.can_answer?`${opts()}<p class="tiny">${escapeHtml(roundRules(a))}</p>`:`<div class="controller-lock" role="status"><strong>${locked?lockText:'✓'}</strong><span>${locked?'Antwoord vastgezet':'Wacht op de uitslag'}</span></div>`;
  return `<div class="auto-me">${teamSymbol(me)}<span translate="no">${escapeHtml(me.name)}</span><b>${me.score} <small>pt</small></b></div>
    <div class="controller-status"><span>${escapeHtml(status)}</span>${isTimed?'<b data-controller-clock></b>':''}</div>
    ${q&&['open','buzzed','reveal','pick'].includes(ph)?`<p class="phone-question">${escapeHtml(q.q)}</p>${q.picture?`<img class="phone-picture" src="${escapeHtml(q.picture)}" alt="">`:''}`:''}${a.finale&&!['finished','round'].includes(ph)?finaleLanes(me.id):''}${body}${state.message&&!['lobby','open'].includes(ph)?`<p class="phone-host">🎤 ${escapeHtml(state.message)}</p>`:''}`; }
function autoHostControls(){const p=state.phase,a=state.auto;return `<div class="pending"><strong>Spelshow voorbereiden</strong> <small>Groepsspel 0.24.0</small><p>${escapeHtml(a.names.join(' → '))}</p><ol><li>Open de publieksstudio en zet het venster op de tv. <b data-studio-check>${state.tv_status?STUDIO_LABELS[state.tv_status]:remoteStudio?.code===state.code ? STUDIO_LABELS[remoteStudio.status] : ONLINE?'Nog geen tv-scherm open · de show kan ook zonder':'Studio nog niet gemeld'}</b></li><li>Kies op de tv ‘Test geluid en stem’ en daarna ‘Volledig scherm’.</li><li>Laat teams meedoen met de spelcode en start de show.</li></ol></div><div class="actions">${p==='lobby'?button('▶ Start de tv-show','next'):''}${['intro','round'].includes(p)&&state.index===-1?button('Intro opnieuw afspelen','intro-replay','',true):''}${p==='intro'?button('Naar ronde 1','intro-skip','',true):''}${!['lobby','finished'].includes(p)?(a.hold||p==='paused'?button('Hervatten','resume'):button('Pauzeren','pause','',true)):''}${['open','buzzed'].includes(p)?button('Vraag overslaan','reveal','',true):''}${p!=='finished'?button('Spel afronden','finish','',true):button('Terug naar lobby','lobby','',true)}</div>`;}
/* 0.15.4: geluid en muziek op het spelleider- en beamerscherm (niet op teamtelefoons). Knop rechtsonder, per scherm onthouden. */
const soundScreen=(role==='host'||role==='display')&&typeof GSound!=='undefined';let lastTick=-1;
function soundUpdate(prev,next){if(!next)return;if(role==='display'&&!next.auto){
  window.GSCinema?.sync(next);
  window.GSBroadcast?.sync(null);
  if(window.gsStudio){
    window.gsStudio.dispose();
    window.gsStudio=null;
    document.body.classList.remove('studio3d','cinema');
    document.querySelector('.gp-wrap')?.classList.remove('gp-studio');
    gsStudioTried=false;
  }
}if(!soundScreen)return;if(next.auto){autoShowEvents(prev,next);return;}if(typeof GPresenter!=='undefined')GPresenter.hide();const p=prev?.phase,n=next.phase,city=next.mode==='city';
  GSound.bed(city?null:n==='lobby'||(n==='ready'&&!next.question)?'lobby':['ready','countdown','open'].includes(n)?'quiz':n==='reveal'?'lobby':n==='finished'?'finale':null);
  if(!prev||prev.code!==next.code)return;
  if(n==='countdown'&&p!=='countdown')GSound.play('intro');
  if(n==='buzzed'&&p!=='buzzed')GSound.play('buzz');
  else if((next.buzzes||[]).length>(prev.buzzes||[]).length&&n==='buzzed')GSound.play('buzz');
  if(n==='reveal'&&p!=='reveal'){const gain=(next.teams||[]).some(t=>{const o=(prev.teams||[]).find(x=>x.id===t.id);return o&&t.score>o.score;});GSound.play(gain?'correct':'wrong');}
  if(p==='buzzed'&&n==='ready')GSound.play('wrong');
  if(n==='finished'&&p!=='finished')GSound.play('end');}
let bombTick=0;function soundTick(){if(!soundScreen||!GSound.enabled())return;const now=Date.now()/1000+offset;if(state.auto?.mode==='bomb'&&state.phase==='open'&&!state.auto.bomb?.boom){const gap=state.auto.bomb?.hurry?.4:1;if(now-bombTick>=gap){bombTick=now;GSound.play('tick');}return;}let left=-1;if(state.phase==='open'&&['quiz','wordrace'].includes(state.mode)&&state.ends_at>now&&state.ends_at-now<=5)left=Math.ceil(state.ends_at-now);if(left>0&&left!==lastTick){lastTick=left;GSound.play('tick');}if(left<=0)lastTick=-1;}
/* 0.15.4: gebeurtenissen van de automatische show: muziek, effecten en presentator Joep. */
const pick=list=>list[Math.floor(Math.random()*list.length)];
function autoShowEvents(prev,next){const a=next.auto,n=next.phase,p=prev?.phase,pa=prev?.auto,P=typeof GPresenter!=='undefined'?GPresenter:null,name=id=>(next.teams||[]).find(t=>t.id===id)?.name||'';
  const S=role==='display'?studioFor(next):null;
  if(P){GPresenter.mount({small:role==='host',studio:true});if(n!=='lobby')GPresenter.show(true);}
  if(S)studioSync(S,prev,next);
  if(role==='display'&&prev?.code!==next.code)studioChannel?.postMessage({code:next.code,status:studioStatus});
  if(role==='display')window.GSCinema?.sync(next,prev,S);
  if(role==='display')window.GSBroadcast?.sync(next,prev);
  GSound.bed(n==='intro'?null:n==='lobby'||n==='round'||n==='standings'?'lobby':n==='finished'?'victory':a.finale?'finale':a.mode==='bomb'||n==='stake'?'mystery':['countdown','open','buzzed','pick','reveal','paused'].includes(n)?(a.round%2?'quiz':'sprint'):null);
  if(n==='intro'&&a.until&&(!pa?.until||pa.intro_id!==a.intro_id)&&role==='display'){
    GSound.play('intro');
    const count=next.teams.filter(t=>!t.spectator).length;
    setTimeout(()=>{
      if(state?.phase==='intro'&&state.auto.intro_id===a.intro_id&&!state.auto.hold)
        P?.say(`Welkom, ik ben Joep! ${count} teams, één trofee. Handen aan de buzzers!`,{mood:'wave'});
    },1300);
  }
  if(!prev||prev.code!==next.code||(p===n&&pa?.question_no===a.question_no&&JSON.stringify(pa?.effect)===JSON.stringify(a.effect)&&(prev.buzzes||[]).length===(next.buzzes||[]).length))return;
  const say=(t,o)=>role==='display'&&P&&GPresenter.say(t,o);
  if(n==='round'&&p!=='round'){GSound.play('whoosh');GSound.play('intro');say(`Ronde ${a.round}: ${a.name}!`,{mood:'point'});say(roundRules(a),{queue:true});}
  if(n==='stake'&&p!=='stake'){
    GSound.play('whoosh');
    say(`Zet je punten in. Het onderwerp is ${a.stake.category}.`,{mood:'point'});
  }
  if(n==='countdown'&&p!=='countdown'&&role==='display'){
    /* 0.23: tussenstukje tussen de vragen: tromgeroffel en een wisselende aankondiging van Joep */
    GSound.play(a.teaser&&a.question_no>1?'drumroll':'whoosh');
    if(a.finale&&a.question_no===a.questions&&pa?.question_no!==a.question_no)say('Dit is de laatste finalevraag!',{mood:'point'});
    else if(a.teaser&&!a.finale)say(a.teaser.text,{mood:a.teaser.kind==='chase'||a.teaser.kind==='leader'?'point':'happy'});
    else if(a.question_no===a.questions&&pa?.question_no!==a.question_no)say(a.finale?'Dit is de laatste finalevraag!':'De laatste vraag van deze ronde!',{mood:'point'});
  }
  if(n==='open'&&p==='countdown'&&next.question){say(next.question.q,{bubble:`Vraag ${a.question_no}`,mood:'point',question:true});}
  if(n==='buzzed'&&p!=='buzzed'&&next.buzzes[0]){GSound.play('buzz');say(pick([`${next.buzzes[0].name} drukt als eerste!`,`Daar is ${next.buzzes[0].name}! Wat wordt het?`,`${next.buzzes[0].name} was het snelst!`]),{mood:'point'});}
  if(n==='pick'&&p!=='pick'&&a.pick){GSound.play('correct');say(a.pick.kind==='vault'?`${name(a.pick.team_id)}, zetten jullie twee punten in de kluis of kraken jullie een tegenstander?`:a.pick.kind==='pie'?`${name(a.pick.team_id)} mag een taart gooien! Naar wie gaat hij?`:`${name(a.pick.team_id)} mag twee punten stelen! Van wie?`,{mood:'happy'});}
  if(n==='reveal'&&(p!=='reveal'||JSON.stringify(pa?.effect)!==JSON.stringify(a.effect))){const e=a.effect,res=a.results||[],good=res.filter(r=>r.correct),ans=next.question&&next.question.options?next.question.options[next.question.correct]:'';
    if(e?.kind==='vault'){GSound.play('correct');say(`Twee punten in de kluis voor ${name(e.from)}!`,{mood:'happy'});}
    else if(e?.kind==='boom'){GSound.play('boom');say(`BOEM! De bom ontploft bij ${name(e.to)}. Dat kost drie punten!`,{mood:'sad'});}
    else if(e?.kind==='pie'){if(!S&&role==='display')pieImpact(name(e.to),e.points);}
    else if(e?.kind==='pie_miss'){GSound.play('wrong');say('Mis! Die taart vliegt voorbij.',{mood:'sad'});}
    else if(e?.kind==='steal'){GSound.play('pass');say(`${name(e.from)} steelt punten van ${name(e.to)}!`,{mood:'happy'});}
    else if(a.finale&&(a.finale.out.length>(pa?.finale?.out.length||0))){
      GSound.play('wrong');
      const eliminated=a.finale.out.slice(pa?.finale?.out.length||0).map(name).join(' en ');
      say(`De tijd is op voor ${eliminated}!`,{mood:'sad'});
    }
    else if(a.mode==='bomb'){GSound.play(good.length?'correct':'wrong');}
    else if(next.question?.kind==='estimate'){GSound.play(good.length?'correct':'wrong');say(good.length>1?`Het antwoord is ${fmtNum(next.question.value)}. ${good.map(r=>name(r.team_id)).join(' en ')} zaten het dichtst bij!`:good.length?`Het antwoord is ${fmtNum(next.question.value)}. ${name(good[0].team_id)} zat het dichtst bij!`:`Het antwoord is ${fmtNum(next.question.value)}.`,{mood:good.length?'happy':'point'});}
    else if(good.length){GSound.play('correct');say(good.length===1?pick([`Helemaal goed, ${name(good[0].team_id)}!`,`Kijk ze glimmen daar! Goed gevonden, ${name(good[0].team_id)}!`]):pick([`Goed gedaan! Het antwoord was ${ans}.`,`Ja! ${ans} is het juiste antwoord.`]),{mood:'happy'});}
    else{GSound.play('wrong');say(ans?`Helaas, niemand had het goed. Het juiste antwoord was ${ans}.`:`Helaas, niemand had het goed.`,{mood:'sad'});}}
  /* 0.24: bijzondere momenten (comeback, nieuwe koploper, reeks goed) krijgen een eigen zin en geluid */
  if(['reveal','pick'].includes(n)&&a.moment&&JSON.stringify(a.moment)!==JSON.stringify(pa?.moment)&&role==='display'){const m=a.moment,who=name(m.team);
    setTimeout(()=>{GSound.play('drumroll');say(m.kind==='comeback'?`Wat een comeback! ${who} kwam van de laatste plaats en staat nu bovenaan!`:m.kind==='leader'?pick([`We hebben een nieuwe koploper: ${who}!`,`${who} neemt de leiding over!`]):pick([`${who} is on fire: ${m.n} keer op rij goed!`,`Niet te stoppen! ${m.n} goede antwoorden op rij voor ${who}!`]),{mood:'happy'});},2600);}
  if(a.mode==='buzz'&&p==='buzzed'&&n==='open'){GSound.play('wrong');say(pick([`Auw, bijna op het goede knopje. Andere teams, jullie mogen weer!`,`Helaas! Wie durft er nog?`]),{mood:'sad'});}
  if(n==='standings'&&p!=='standings'){const top=[...next.teams].filter(t=>!t.spectator).sort((x,y)=>y.score-x.score);GSound.play('whoosh');if(top[0])say(top[1]&&top[1].score===top[0].score?`Even de tussenstand. ${top[0].name} en ${top[1].name} staan gelijk bovenaan!`:`Even de tussenstand. ${top[0].name} staat bovenaan!`,{mood:'point'});}
  if(n==='finished'&&p!=='finished'){const top=showRanking(next);GSound.play('victory');if(top[0])say(!a.finale?.rank.length&&top[1]&&top[1].score===top[0].score?`We moeten de trofee doormidden zagen! Gelijkspel tussen ${top[0].name} en ${top[1].name}!`:`En de winnaar is ${top[0].name}! Gefeliciteerd!`,{mood:'happy'});}}
/* 0.15.5: de automatische show als 3D-spelshowstudio op het beamer-/TV-scherm (pwa/gs-studio3d.js, Three.js). */
let gsStudioTried=false;
function studioFor(next){
  if(window.gsStudio)return window.gsStudio;
  if(!next.auto)return null;
  if(studioPreference==='0'){setStudioStatus('flat');return null;}
  if(gsStudioTried)return null;
  if(typeof GStudio==='undefined'){
    if(!document.getElementById('gsStudioJs')){
      const script=document.createElement('script');
      script.id='gsStudioJs';
      script.src='/app/gs-studio3d.js?v=240';
      script.addEventListener('error',()=>{gsStudioTried=true;setStudioStatus('failed');});
      document.head.appendChild(script);
    }
    return null;
  }
  gsStudioTried=true;
  if(!GStudio.supported()){setStudioStatus('unsupported');return null;}
  const lite=studioPreference==='lite';
  const st=GStudio.create(document.body,{base:'/app/',lite,onSlow:lite?null:()=>{
    st.renderer.setPixelRatio(.75);
    st.composer.setPixelRatio(.75);
    st.renderer.shadowMap.enabled=false;
    st.bloom.enabled=false;
    setStudioStatus('light');
  }});
  if(!st){setStudioStatus('failed');return null;}
  window.gsStudio=st;
  document.body.classList.add('studio3d');
  document.querySelector('.gp-wrap')?.classList.add('gp-studio');
  st.renderer.domElement.addEventListener('webglcontextlost',()=>{
    st.dispose();window.gsStudio=null;
    document.body.classList.remove('studio3d','cinema');
    setStudioStatus('failed');
  },{once:true});
  setStudioStatus(lite?'light':'ready');
  return st;
}
function pieImpact(target, points){
  GSound.play('splat');
  window.GSBroadcast?.pieImpact(target,points);
  GPresenter.say(pick([`PATS! Servetje voor ${target}?`, `Eén taart voor ${target}. Bestek zat er niet bij!`, `Kijk eens aan, ${target}. Dat kapsel houdt het prima met slagroom!`]),{mood:'happy'});
}
function studioSync(S,prev,next){const a=next.auto,n=next.phase,p=prev?.phase,pa=prev?.auto,teamName=id=>(next.teams||[]).find(t=>t.id===id)?.name||'';
  S.setTeams(next.teams||[]);
  S.phase?.(n);
  /* 0.20: het vraagpaneel bedekt de bovenste helft; de 3D-regie kadreert dan in het vrije deel eronder */
  S.setPanel?.(['countdown','open','buzzed','reveal','pick','stake'].includes(n)&&!(n==='reveal'&&a.effect?.kind==='pie')?.5:0);
  document.body.classList.toggle('cinema',['intro','round','standings','finished'].includes(n));
  const icon=ROUND_ICON[a.type]||'🎲';
  if(n==='intro'){
    S.wall(next.name||'Groepsspel','Met Joep');
    S.setDefaultShot('lineup');
    if(a.until&&S.openingId!==a.intro_id){
      S.openingId=a.intro_id;
      S.focus('high',3.4);
      S.openingCutAt=S.time+3.4;
    } else if(S.openingCutAt&&S.time>=S.openingCutAt){
      S.openingCutAt=0;
      S.focus('host',4.4);
      S.mood('wave');
    }
  }
  else if(n==='lobby'){S.wall('Groepsspel','Sluit aan en speel mee','🎬');S.setDefaultShot('wide');}
  else if(n==='round'){S.wall(a.name,`Ronde ${a.round} van ${a.rounds}`,icon);S.setDefaultShot('host');if(p!=='round')S.clearRound();}
  else if(n==='stake'){S.wall(a.stake.category,'Kies jullie inzet','🎰');S.setDefaultShot('host');}
  else if(n==='standings'){S.wall('Tussenstand','',  '🏆');S.setDefaultShot('lineup');}
  else if(n==='finished'){S.wall('Eindstand','','🏆');S.setDefaultShot('lineup');}
  else{S.wall(`Vraag ${a.question_no} / ${a.questions}`,a.name,icon);S.setDefaultShot(n==='buzzed'&&next.buzzes[0]?'team:'+next.buzzes[0].team_id:n==='pick'&&a.pick?'team:'+a.pick.team_id:a.finale?'lineup':'wide');}
  if(!prev||pa?.question_no!==a.question_no||(p!=='countdown'&&n==='countdown'))S.clearBuzz();
  if(n==='buzzed'&&p!=='buzzed'&&next.buzzes[0])S.buzz(next.buzzes[0].team_id);
  if(p==='buzzed'&&n!=='buzzed')S.clearBuzz();
  S.answered(n==='open'?a.answered||[]:[]);
  S.setBomb(a.bomb&&!a.bomb.boom&&['countdown','open','reveal'].includes(n)?a.bomb.holder:null,a.bomb?.hurry);
  document.body.classList.toggle('pie-sequence',n==='reveal'&&a.effect?.kind==='pie');
  if(n==='pick'&&p!=='pick'&&a.pick?.kind==='vault')S.vaultCue?.(a.pick.team_id);
  const effChanged=JSON.stringify(pa?.effect)!==JSON.stringify(a.effect);
  if(n==='reveal'&&(p!=='reveal'||effChanged)){const e=a.effect;
    if(a.type==='wissel'&&effChanged&&e?.from)S.vaultCue?.(e.from,e.to);
    if(e?.kind==='vault'&&effChanged){S.anim(e.from,'cheer',1.8);S.focus('team:'+e.from,2.3);}
    else if(e?.kind==='pie'&&effChanged)S.pie(e.from,e.to,()=>pieImpact(teamName(e.to),e.points));else if(e?.kind==='pie_miss'&&effChanged)S.focus('wide');else if(e?.kind==='steal'&&effChanged)S.steal(e.from,e.to);else if(e?.kind==='boom'&&effChanged)S.boom(e.to);
    if(p!=='reveal'){
      S.results(a.results||[]);
      if(!e&&!a.finale){
        const correct=(a.results||[]).filter(result=>result.correct);
        if(correct.length===1)S.focus('team:'+correct[0].team_id,2);
        else if(correct.length===0)S.focus('host',1.5);
      }
      const out=a.finale?.out.slice(pa?.finale?.out.length||0)||[];
      if(out.length)S.focus(out.length===1?'team:'+out[0]:'lineup');
    }
  }
  if(['reveal','pick'].includes(n)&&a.moment&&JSON.stringify(a.moment)!==JSON.stringify(pa?.moment)){const m=a.moment;setTimeout(()=>S.moment?.(m.kind,m.team),2400);}
  if(n==='finished'&&!S.trophy.visible){const top=showRanking(next)[0];if(top)S.celebrate(top.id);}
  else if(n!=='finished'&&S.trophy.visible)S.hideTrophy();
  if(n==='open'&&p==='countdown'){
    if(a.mode==='bomb'&&a.bomb?.holder)S.focus('team:'+a.bomb.holder,1.6);
    else if(a.finale)S.focus('lineup');
    else if(a.type==='snel')S.focus('high',1.25);
    else S.focus('host',1.15);
  }
  /* 0.20: nieuwe ronde = kraanvlucht over het publiek naar Joep; tussenstand = publiek in beeld */
  /* 0.23: tussen de vragen een kort intermezzo in de studio (camera langs de teams, spot op een team, publiek) */
  if(n==='countdown'&&p!=='countdown'&&a.teaser&&!a.finale&&a.question_no>1)S.intermezzo?.(a.teaser.kind,a.teaser.team,3.6);
  if(n!==p&&n==='round'){if(S.crane)S.crane(4.8);else S.focus('host');}
  if(n!==p&&n==='standings')S.focus('audience',2.9);}
if(soundScreen)GSound.mount();
let displayJoin='';if(role==='display')fetch('/api/lan').then(r=>r.json()).then(v=>{let pick='';try{pick=localStorage.getItem('groepsspel-lan-address')||'';}catch{}displayJoin=(v.urls||[]).includes(pick)?pick:(v.urls||[])[0]||'';signature='';}).catch(()=>{});
(async()=>{try{if(role==='host'){const r=await api('/api/bootstrap',null,'');hostKey=r.host_key;urls=r.urls;}await ping();if(role==='team')setInterval(()=>{if(teamKey&&!document.hidden)ping().catch(()=>{});},60000);await poll();setInterval(poll,500);setInterval(clock,80);}catch(err){$('#root').innerHTML=`<section class="panel"><h1>Verbinding niet beschikbaar</h1><p>${escapeHtml(err.message)}</p><p>Open de spelleider op de server-pc via http://127.0.0.1:8765/host. Laat de server actief en verbind teamtelefoons met dezelfde wifi.</p></section>`;}})();
