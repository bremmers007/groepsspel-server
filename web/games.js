'use strict';
/* Groepsspel · telefoonspellen: Moordspel, Rangen & Vlaggen, Echt Hollands!, Gekke 88, Smokkeltocht,
   Geheime missies, Opgejaagd en Muziekbingo.
   Eén script voor drie schermen: pc-console (/spel/<spel>), telefoon (/spel/<spel>/speler) en beamer (/spel/<spel>/scherm).
   De server bepaalt per scherm wat zichtbaar is; dit script toont alleen wat het ontvangt. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const parts = location.pathname.split('/').filter(Boolean);
const gid = parts[1], role = parts[2] === 'speler' ? 'player' : parts[2] === 'scherm' ? 'public' : 'host';
document.body.dataset.game = gid;
document.body.classList.add(role === 'player' ? 'phone' : role === 'public' ? 'screen' : 'console');
const STORE = 'groepsspel-spel-' + gid;
const OFFLINE = ['stratego', 'smokkel', 'crazy88', 'opgejaagd', 'bingo'].includes(gid);
let view = null, hostKey = '', urls = [], key = '', signature = '', busy = false, offset = 0, online = false, uitleg = null, pub = null, roster = null;
let uitlegLoading = false, guideAcknowledged = false;
const ui = {}, drafts = {};
const ls = {get(k, d) { try { const v = localStorage.getItem(STORE + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(STORE + k, JSON.stringify(v)); } catch {} }};
key = new URLSearchParams(location.search).has('nieuw') ? '' : ls.get('-key', '');

/* ------------------------------------------------------------------ hulpjes */
function notice(t) { const n = $('#notice'); n.textContent = t; n.style.display = 'block'; clearTimeout(notice.t); notice.t = setTimeout(() => n.style.display = 'none', 6500); }
async function api(url, body, k) {
  const r = await fetch(url, {method: body ? 'POST' : 'GET', cache: 'no-store', headers: {...(body ? {'Content-Type': 'application/json'} : {}), ...(k ? {Authorization: 'Bearer ' + k} : {})}, body: body ? JSON.stringify(body) : undefined});
  const data = await r.json().catch(() => ({error: 'Geen geldig antwoord van de spelserver.'}));
  if (!r.ok) { const e = new Error(data.error || 'Verzoek mislukt.'); e.status = r.status; throw e; }
  return data;
}
const A = p => `/api/spel/${gid}/${p}`;
const btn = (label, action, attrs = '', cls = '') => `<button type="button" class="${cls}" data-a="${action}" ${attrs}>${label}</button>`;
const now = () => Date.now() / 1000 + offset;
const timer = ends => ends ? `<span class="timer" data-ends="${ends}">${fmt(ends - now())}</span>` : '';
function fmt(sec) { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60), s = sec % 60; return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`; }
const teamName = id => view?.teams.find(t => t.id === id)?.name || '';
const playerName = id => view?.players.find(p => p.id === id)?.name || '';
function qr(url, size = 5) { try { const c = qrcode(0, 'M'); c.addData(url); c.make(); return `<div class="qr">${c.createImgTag(size, 8, 'Scan om mee te spelen')}</div>`; } catch { return ''; } }
const evidenceMode = () => view?.evidence?.mode || 'app';
const evidenceLink = () => view?.evidence?.link || '';
function evidenceSettings() {
  const e = view.evidence || {mode:'app',link:''};
  const mode = drafts.evidence_mode ?? e.mode;
  const link = drafts.evidence_link ?? e.link;
  return `<section class="panel evidence-panel"><h2>Bewijs & communicatie</h2>
    <p class="small">WhatsApp is optioneel. Foto's en filmpjes worden niet automatisch uit WhatsApp gelezen: de spelleider beoordeelt meldingen handmatig.</p>
    <label class="field"><span>Waar leveren teams bewijs in?</span>${sel('evidence_mode', [['app','In Groepsspel'],['whatsapp','Via WhatsApp'],['both','Via Groepsspel én WhatsApp']], mode)}</label>
    ${mode !== 'app' ? `<label class="field"><span>Uitnodigingslink van je WhatsApp-groep</span><input data-draft="evidence_link" type="url" placeholder="https://chat.whatsapp.com/..." maxlength="220" value="${esc(link)}"></label>` : ''}
    <p class="small">Maak eerst zelf de groep in WhatsApp. Deel nooit een beheercode. Deelnemers zien elkaars telefoonnummers in de groep.</p>
    ${btn('Bewijskanaal opslaan','evidence_save','','secondary small')}
    ${e.mode !== 'app' && e.link ? `<p><a href="${esc(e.link)}" target="_blank" rel="noopener noreferrer">Open WhatsApp-groep ↗</a></p>${qr(e.link,3)}` : ''}
  </section>`;
}
function evidencePlayer() {
  const e=view.evidence || {};
  if (e.mode !== 'whatsapp' && e.mode !== 'both') return '';
  return `<section class="panel evidence-panel"><h3>Bewijs via WhatsApp</h3><p>Stuur je foto of video naar de groepschat. Zet de <strong>meldcode</strong> van de opdracht bij je foto (bijvoorbeeld <b>ROOD-23</b>). Meld de opdracht daarna hier aan om punten te kunnen krijgen.</p>
    <p><a class="btn secondary" href="${esc(e.link)}" target="_blank" rel="noopener noreferrer">Open de WhatsApp-groep ↗</a></p>
    <p class="small">De spelleider controleert zelf het bewijs. WhatsApp synchroniseert geen beelden met Groepsspel. Je telefoonnummer is zichtbaar in de WhatsApp-groep. WhatsApp heeft internet nodig.</p></section>`;
}
const joinURL = () => (drafts.lan || urls[0] || location.origin) + `/spel/${gid}/speler?code=` + view.code;
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
function sel(name, options, value, attrs = '') { return `<select data-draft="${name}" ${attrs}>${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`; }
function scoreCards(entries) { const max = Math.max(...entries.map(e => e[1]), 0); return `<div class="score-row">${entries.map(([n, s, sub]) => `<div class="score-card ${s === max && max > 0 ? 'lead-team' : ''}">${esc(n)}<b>${s}</b>${sub ? `<small class="small">${sub}</small>` : ''}</div>`).join('')}</div>`; }
function logList(items = view.log) { return `<ul class="list log">${[...items].reverse().map(l => `<li>${esc(l.text)}</li>`).join('') || '<li>Nog niets gebeurd.</li>'}</ul>`; }

/* --------------------------------------------------------------- uitleg */
async function showUitleg() {
  try { uitleg = uitleg || await api('/api/uitleg'); } catch (e) { return notice(e.message); }
  const u = uitleg[gid]; if (!u) return;
  const sheet = $('#sheet');
  sheet.innerHTML = `<div class="sheet" role="dialog" aria-label="Uitleg ${esc(u.title)}"><button class="ghost close" data-ui="close">Sluiten ✕</button><div class="eyebrow">Uitleg & draaiboek</div><h1>${esc(u.title)}</h1><p class="lead">${esc(u.kort)}</p><p class="small">${esc(u.spelers)} · ${esc(u.duur)}</p>
  <h2>Voorbereiding</h2><ul>${u.voorbereiding.map(x => `<li>${esc(x)}</li>`).join('')}</ul><h2>Spelregels</h2><ul>${u.regels.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  <h2>Verloop</h2><table class="phases"><tr><th>Fase</th><th>Wat gebeurt er</th></tr>${u.verloop.map(x => `<tr><td><b>${esc(x.fase)}</b></td><td>${esc(x.wat)}</td></tr>`).join('')}</table>
  ${role !== 'player' ? `<h2>Spelleiderscript</h2><ol class="steps">${u.script.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}<h2>Tips</h2><ul>${u.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  sheet.hidden = false;
}

/* ------------------------------------------------------------ wachtrij */
let queue = ls.get('-queue', []);
function enqueue(action) { const a = {...action, id: uuid(), ts: Date.now()}; queue.push(a); ls.set('-queue', queue); return a; }
async function flush() {
  if (!queue.length || !key) return;
  const batch = queue.slice(0, 50);
  try {
    const r = await api(A('sync'), {actions: batch}, key);
    const done = new Set(r.synced.map(x => x.id));
    r.synced.filter(x => !x.ok).forEach(x => notice('Niet verwerkt: ' + x.error));
    queue = queue.filter(a => !done.has(a.id)); ls.set('-queue', queue);
    view = r; online = true; afterView();
  } catch (e) { if (e.status === 403) resetKey(); }
}
async function playerSend(action) {
  if (OFFLINE) { enqueue(action); localApply(action); render(true); await flush(); return; }
  if (busy) return; busy = true;
  try { view = await api(A('player'), {...action, phase_id: view.phase_id}, key); afterView(); render(true); }
  catch (e) { notice(e.message); refresh(); } finally { busy = false; }
}
async function hostSend(action) {
  if (busy) return; busy = true;
  try { view = await api(A('host'), action, hostKey); afterView(); render(true); if (view.flash?.kind === 'code') notice(`Persoonlijke code van ${view.flash.name}: ${view.flash.access}`); return true; }
  catch (e) { notice(e.message); return false; } finally { busy = false; }
}

/* -------------------------------------------------- media-wachtrij (Gekke 88) */
const DB = {open() { return new Promise((res, rej) => { if (!window.indexedDB) return rej(new Error('Geen opslag')); const r = indexedDB.open('groepsspel-uploads', 1); r.onupgradeneeded = () => r.result.createObjectStore('up', {keyPath: 'sid'}); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  async all() { const db = await this.open(); return new Promise(res => { const t = db.transaction('up').objectStore('up').getAll(); t.onsuccess = () => res(t.result.filter(x => x.gid === gid)); t.onerror = () => res([]); }); },
  async put(x) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('up', 'readwrite'); t.objectStore('up').put(x); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
  async del(sid) { const db = await this.open(); return new Promise(res => { const t = db.transaction('up', 'readwrite'); t.objectStore('up').delete(sid); t.oncomplete = res; t.onerror = res; }); }};
let uploads = [];
async function flushMedia() {
  if (gid !== 'crazy88' || !key) return;
  try { uploads = await DB.all(); } catch { return; }
  for (const u of uploads) {
    try {
      const r = await fetch(A('upload'), {method: 'POST', headers: {Authorization: 'Bearer ' + key, 'Content-Type': u.type, 'X-Submission': u.sid, 'X-Task': u.task, 'X-Text': encodeURIComponent(u.text || ''), 'X-Ts': String(u.ts)}, body: u.blob});
      const d = await r.json().catch(() => ({}));
      if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 403)) { await DB.del(u.sid); if (!r.ok) notice('Bewijs niet geaccepteerd: ' + (d.error || r.status)); }
    } catch { break; }
  }
  try { uploads = await DB.all(); } catch {}
}
async function resizeImage(file) {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bmp = await createImageBitmap(file); const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(res => c.toBlob(b => res(b || file), 'image/jpeg', .82));
  } catch { return file; }
}

/* ------------------------------------------------------------- weergave */
function afterView() { if (view?.server_time) offset = view.server_time - Date.now() / 1000; $('#brand').textContent = view?.title || ''; document.title = (view?.title || 'Groepsspel') + ' · Groepsspel'; }
function render(force) {
  const root = $('#root');
  if (role === 'player' && !view) { if (!$('#join')) root.innerHTML = joinForm(); return; }
  if (!view) return;
  const R = GAMES[gid];
  let html = role === 'host' ? (view.phase === 'lobby' ? lobbyHost(R) : R.host()) : role === 'public' ? (view.phase === 'lobby' ? lobbyScreen() : R.screen()) : phoneWrap(R);
  if (!force && html === signature) return;
  const focus = document.activeElement?.dataset?.draft;
  signature = html; root.innerHTML = html;
  if (focus) { const el = root.querySelector(`[data-draft="${focus}"]`); if (el) { el.focus(); try { const n = el.value.length; el.setSelectionRange(n, n); } catch {} } }
  root.querySelectorAll('[data-draft]').forEach(el => { if (drafts[el.dataset.draft] != null && el.type !== 'file' && el.tagName !== 'SELECT' && el !== document.activeElement) el.value = drafts[el.dataset.draft]; });
}
/* 0.14: speelgebied (buitenspellen) en duidelijke verbindingsstatus. */
const OUTDOOR = ['smokkel', 'opgejaagd', 'crazy88', 'stratego'];
let lastOnline = Date.now();
function distance(a, b) { const R = 6371000, r = x => x * Math.PI / 180, dLat = r(b[0] - a[0]), dLng = r(b[1] - a[1]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
function areaCheck(pos) { const a = view?.area; if (!a?.radius || !a.center) return null; const d = distance(a.center, [pos.coords.latitude, pos.coords.longitude]); ui.areaWarn = d > a.radius ? `Let op: je bent ongeveer ${Math.round(d)} meter van het midden, buiten het speelgebied (${a.radius} m). Ga terug.` : ''; ui.areaOk = d <= a.radius ? `Je bent binnen het speelgebied (${Math.round(d)} m van het midden).` : ''; return d; }
function areaBox() {
  const a = view.area; if (!a || (!a.text && !a.radius)) return '';
  return `<details class="area" ${ui.areaWarn || view.phase === 'lobby' ? 'open' : ''}><summary>📍 Speelgebied${a.radius ? ` · straal ${a.radius} m` : ''}</summary>${a.text ? `<p>${esc(a.text)}</p>` : ''}${a.radius ? `<p>${btn('Controleer mijn plek', 'area_check', '', 'secondary small')}</p>` : ''}${ui.areaOk ? `<p class="small">${esc(ui.areaOk)}</p>` : ''}</details>${ui.areaWarn ? `<div class="warn">${esc(ui.areaWarn)}</div>` : ''}`;
}
function connectionBox() {
  if (online) return '';
  const mins = Math.floor((Date.now() - lastOnline) / 60000);
  return `<div class="queue offline-note">Geen verbinding met de spelserver${mins ? ` sinds ${mins} ${mins === 1 ? 'minuut' : 'minuten'}` : ''}. ${OFFLINE ? 'Speel gewoon door: je acties worden op deze telefoon bewaard en later één keer verstuurd.' : 'Wacht even of loop terug naar het bereik van de wifi; je voortgang staat veilig op de server.'}</div>`;
}
function areaHost() {
  if (!OUTDOOR.includes(gid)) return '';
  const a = view.area || {};
  return `<section class="panel"><h2>Speelgebied & veiligheid</h2><p class="small">Spreek grenzen af die iedereen kent: geen drukke wegen, water of privéterrein. Spelers zien dit op hun telefoon.</p>
  <label class="field"><span>Omschrijving</span><textarea data-draft="area_text" rows="2" maxlength="400" placeholder="Bijv. tussen de kerk, het park en de Maas. Niet over de doorgaande weg.">${esc(drafts.area_text ?? a.text ?? '')}</textarea></label>
  <label class="field"><span>Afstandscontrole op de telefoon</span>${sel('area_radius', [[0, 'Uit'], [300, '300 m rond het middelpunt'], [500, '500 m'], [1000, '1 km'], [2000, '2 km'], [5000, '5 km']], drafts.area_radius ?? a.radius ?? 0)}</label>
  <p class="small">${a.center ? `Middelpunt vastgelegd (${a.center[0].toFixed(4)}, ${a.center[1].toFixed(4)}).` : 'Nog geen middelpunt.'} Locatie werkt alleen via https (mobiel internet of online spelserver).</p>
  <div class="actions">${btn('Mijn locatie als middelpunt', 'area_here', '', 'secondary small')}${btn('Speelgebied opslaan', 'area_save', '', 'small')}</div></section>`;
}
function phoneWrap(R) {
  const me = view.me, team = me.team ? teamName(me.team) : '';
  const q = queue.length + uploads.length;
  return connectionBox() + areaBox() + `<div class="topline"><span>${esc(me.name)}${team ? ' · ' + esc(team) : ''}</span><span>code <b>${esc(me.access)}</b></span></div>${q ? `<div class="queue">${q} ${q === 1 ? 'actie wacht' : 'acties wachten'} op wifi. Ze worden automatisch verstuurd.</div>` : ''}${view.phase === 'lobby' ? `<h1>Welkom, ${esc(me.name)}</h1><p class="lead">Je bent aangemeld${team ? ' bij ' + esc(team) : ''}. Wacht tot de spelleider begint.</p><div class="hint">Bewaar je persoonlijke code <b>${esc(me.access)}</b>. Daarmee kom je terug als je telefoon de verbinding verliest.</div><p><button class="secondary" data-ui="uitleg">Hoe werkt ${esc(view.title)}?</button></p>${gid === 'crazy88' ? evidencePlayer() : ''}` : R.phone()}`;
}
function lobbyGuide(){
  const u=uitleg?.[gid];
  if(!u)return `<section class="panel preflight"><h2>Speluitleg & voorbereiding</h2><p>${uitlegLoading?'Spelregels worden geladen…':'Spelregels nog niet geladen. Controleer de verbinding met de spelserver.'}</p><p class="small">Begin niet voordat de voorbereiding is doorgenomen.</p></section>`;
  const list=a=>`<ul>${a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  return `<section class="panel preflight" aria-label="Speluitleg voordat het spel begint">
    <h2>Lees dit vóór jullie beginnen</h2><p>${esc(u.kort)}</p>
    <p class="small"><b>${esc(u.spelers)} · ${esc(u.duur)}</b></p>
    <h3>Dit moet je regelen</h3>${list(u.voorbereiding)}
    <h3>Zo speel je</h3>${list(u.regels)}
    <label class="preflight-check"><input type="checkbox" data-guide-ack ${guideAcknowledged?'checked':''}> <span>Ik heb de uitleg gelezen en weet welke spullen en voorbereidingen nodig zijn.</span></label>
  </section>`;
}
function lobbyHost(R) {
  const v = view;
  const teams = v.teams.length ? `<div class="grid2">${v.teams.map(t => `<div class="card"><h3>${esc(t.name)}</h3>${v.players.filter(p => p.team === t.id).map(p => playerLine(p)).join('') || '<p class="small">Nog niemand.</p>'}</div>`).join('')}${v.players.some(p => !p.team) ? `<div class="card"><h3>Zonder team</h3>${v.players.filter(p => !p.team).map(p => playerLine(p)).join('')}</div>` : ''}</div>`
    : `<div class="roster">${v.players.map(p => `<div class="person"><b>${esc(p.name)}</b><small><span class="dot ${p.connected ? '' : 'off'}"></span>${p.connected ? 'Verbonden' : 'Telefoon slaapt'}</small>${btn('Verwijderen', 'remove', `data-id="${p.id}"`, 'secondary small')}</div>`).join('')}</div>`;
  return `<div class="eyebrow">Lobby</div><h1>${esc(v.title)}</h1><p class="lead">${esc(R.lobbyText)}</p><p><button class="secondary" data-ui="uitleg">Volledig draaiboek en tips</button></p>${lobbyGuide()}
  <div class="cols"><section class="panel"><h2>Laat iedereen scannen</h2><p class="code">${v.code}</p>${urls.length > 1 ? `<label class="field"><span>Wifi-adres</span>${sel('lan', urls.map(u => [u, u]), drafts.lan)}</label>` : ''}${qr(joinURL())}<p class="linkline small">${esc(joinURL())}</p>
  <div class="actions"><a class="btn secondary" href="/spel/${gid}/scherm" target="_blank" rel="noopener">Open beamer ↗</a><a class="btn secondary" href="/spel/${gid}/speler?code=${v.code}&nieuw=1" target="_blank" rel="noopener">Zelf meespelen ↗</a></div></section>
  <section class="panel"><h2>Instellingen</h2>${R.settings()}</section></div>${gid === 'crazy88' ? evidenceSettings() : ''}${areaHost()}
  <section class="panel"><h2>${v.players.length} ${v.players.length === 1 ? 'speler' : 'spelers'}</h2>${teams}<div class="actions">${guideAcknowledged ? R.startButtons() : R.startButtons().replace(/(<button(?=[^>]*data-a="start")[^>]*)(>)/g,'$1 disabled$2')}</div><p class="small">${guideAcknowledged ? 'De uitleg is bevestigd. Controleer of alle spullen klaarstaan.' : 'Lees de uitleg hierboven en bevestig deze om het spel te starten.'}</p></section>`;
}
function playerLine(p) {
  const others = view.teams.filter(t => t.id !== p.team);
  return `<div class="person" style="margin:6px 0"><b>${esc(p.name)}</b><small><span class="dot ${p.connected ? '' : 'off'}"></span>${p.connected ? 'Verbonden' : 'Telefoon slaapt'}</small><div class="chips" style="margin-top:6px">${others.map(t => btn('→ ' + esc(t.name), 'move_team', `data-id="${p.id}" data-team="${t.id}"`, 'secondary small')).join('')}${btn('Verwijderen', 'remove', `data-id="${p.id}"`, 'secondary small')}</div></div>`;
}
function lobbyScreen() {
  return `<div class="stage"><div class="eyebrow">Groepsspel presenteert</div><h1>${esc(view.title)}</h1><div style="display:flex;gap:5vw;align-items:center;justify-content:center;flex-wrap:wrap;text-align:left">${qr(roomBase() + `/spel/${gid}/speler?code=` + view.code, 7)}<div><p class="lead" style="margin:0">Scan en meld je aan.<br>Spelcode</p><p class="code">${view.code}</p><p class="lead">${view.players.length} spelers</p></div></div>
  ${view.teams.length ? `<div class="score-row">${view.teams.map(t => `<div class="score-card">${esc(t.name)}<b>${view.players.filter(p => p.team === t.id).length}</b><small class="small">${view.players.filter(p => p.team === t.id).map(p => esc(p.name)).join(', ')}</small></div>`).join('')}</div>` : `<div class="roster">${view.players.map(p => `<div class="person"><b>${esc(p.name)}</b></div>`).join('')}</div>`}</div>`;
}
function joinForm() {
  const code = new URLSearchParams(location.search).get('code') || '';
  const teams = pub?.teams || [];
  let teamField = '';
  if (['crazy88', 'bingo'].includes(gid)) teamField = `<label class="field"><span>Teamnaam (kies een bestaand team of verzin er een)</span><input name="team" list="teamlist" maxlength="30" autocomplete="off"><datalist id="teamlist">${teams.map(t => `<option value="${esc(t.name)}">`).join('')}</datalist></label>`;
  else if (teams.length) teamField = `<label class="field"><span>Team</span><select name="team"><option value="">Laat de spelleider kiezen</option>${teams.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label>`;
  /* 0.15: de spelleider heeft 'Mijn groep' gedeeld: tik op je naam (team wordt dan ook ingevuld) */
  const taken = new Set((pub?.players || []).map(p => p.name.toLowerCase()));
  const pick = roster?.players?.length ? `<div class="roster-pick"><span class="small">Wie ben jij?${roster.group ? ' · ' + esc(roster.group) : ''}</span><div class="chips">${roster.players.map(r => `<button type="button" class="secondary small" data-ui="pickname" data-name="${esc(r.name)}" data-team="${esc(r.team || '')}" ${taken.has(r.name.toLowerCase()) ? 'disabled' : ''}>${esc(r.name)}${r.team ? ` <small>${esc(r.team)}</small>` : ''}</button>`).join('')}</div></div>` : '';
  return `<h1>${esc(pub?.title || 'Meespelen')}</h1><p class="lead">Speel mee op je eigen telefoon. Gebruik dezelfde wifi als de pc.</p><form id="join" class="panel">${pick}<label class="field"><span>Spelcode</span><input name="code" inputmode="numeric" autocomplete="off" value="${esc(code)}"></label><label class="field"><span>Je naam</span><input name="name" maxlength="30" autocomplete="nickname"></label>${teamField}<p class="small">Of kom terug met je persoonlijke code:</p><label class="field"><span>Persoonlijke code</span><input name="access_code" maxlength="6" autocapitalize="characters" autocomplete="off"></label><button class="big">Meedoen →</button></form><p><button class="secondary" type="button" data-ui="uitleg">Hoe werkt dit spel?</button></p>`;
}
function resetKey() { key = ''; view = null; ls.set('-key', ''); render(true); }
async function refresh() {
  try {
    if (role === 'player' && key) { if (queue.length) await flush(); await flushMedia(); }
    const r = role === 'host' ? 'host' : role === 'public' ? 'public' : 'player';
    if (role === 'player' && !key && !roster) { try { roster = await api('/api/groep/namen'); } catch { roster = {players: []}; } }
    if (role === 'player' && !key) { pub = await api(A('view?role=public')); $('#brand').textContent = pub.title; online = true; $('#connection').textContent = '● Verbonden'; if (!$('#join')) render(true); return; }
    const v = await api(A('view?role=' + r), null, r === 'host' ? hostKey : r === 'player' ? key : '');
    view = v; online = true; lastOnline = Date.now(); afterView();
    if(role==='host'&&view.phase==='lobby'&&!uitleg&&!uitlegLoading){
      uitlegLoading=true;
      api('/api/uitleg').then(d=>{uitleg=d;signature='';render(true);}).catch(err=>notice('Speluitleg niet beschikbaar: '+err.message))
        .finally(()=>{uitlegLoading=false;signature='';render(true);});
    }
    $('#connection').textContent = role === 'player' ? '● Online' : '● Verbonden met spelserver';
    GAMES[gid].onView?.();
    render();
  } catch (e) {
    online = false; $('#connection').textContent = role === 'player' ? (OFFLINE ? '○ Offline · speel door' : '○ Offline') : '○ Geen verbinding · opnieuw proberen…';
    if (e.status === 403 && role === 'player') resetKey();
    else if (view && role === 'player') render();
  }
}

/* ------------------------------------------------------------- klikken */
document.addEventListener('change', e => {
  if(!e.target.matches('[data-guide-ack]'))return;
  guideAcknowledged=e.target.checked;signature='';render(true);
});

document.addEventListener('click', e => {
  const u = e.target.closest('[data-ui]');
  if (u?.dataset.ui === 'pickname') { const f = $('#join'); if (f) { f.elements.name.value = u.dataset.name; if (f.elements.team && u.dataset.team) { const t = f.elements.team; if (t.tagName === 'SELECT') { const o = [...t.options].find(o => o.textContent.trim().toLowerCase() === u.dataset.team.toLowerCase()); if (o) t.value = o.value; } else t.value = u.dataset.team; } } return; }
  if (u) { if (u.dataset.ui === 'uitleg') return showUitleg(); if (u.dataset.ui === 'close' || u.id === 'sheet') { $('#sheet').hidden = true; return; } }
  if (e.target.id === 'sheet') { $('#sheet').hidden = true; return; }
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const a = el.dataset.a, d = el.dataset;
  if (d.confirm && !confirm(d.confirm)) return;
  if (a === 'area_check') {
    if (!navigator.geolocation || !isSecureContext) return notice('Locatie controleren kan alleen via https (mobiel internet of online spelserver).');
    return navigator.geolocation.getCurrentPosition(p => { areaCheck(p); render(true); }, () => notice('Je locatie is niet beschikbaar of niet toegestaan.'), {enableHighAccuracy: true, timeout: 15000, maximumAge: 30000});
  }
  if (role === 'host') {
    if (a === 'area_save' || a === 'area_here') {
      const send = center => hostSend({action: 'area', text: String(drafts.area_text ?? view.area?.text ?? ''), radius: parseInt(drafts.area_radius ?? view.area?.radius ?? 0, 10), center: center || view.area?.center || null}).then(() => notice('Speelgebied opgeslagen.'));
      if (a === 'area_save') return send();
      if (!navigator.geolocation || !isSecureContext) return notice('Locatie bepalen kan alleen via https (mobiel internet of online spelserver).');
      return navigator.geolocation.getCurrentPosition(p => send([p.coords.latitude, p.coords.longitude]), () => notice('Je locatie is niet beschikbaar of niet toegestaan.'), {enableHighAccuracy: true, timeout: 15000});
    }
    if (a === 'remove' || a === 'show_code') return hostSend({action: a, id: d.id});
    if (a === 'move_team') return hostSend({action: a, id: d.id, team: d.team});
    if (a === 'print') return window.print();
  }
  GAMES[gid].click?.(a, el, d);
});
document.addEventListener('input', e => { const d = e.target.dataset; if (d.draft && e.target.type !== 'file') { drafts[d.draft] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; if (d.draft === 'lan') render(true); } });
document.addEventListener('change', e => { const d = e.target.dataset; if (d.draft && e.target.tagName === 'SELECT') { drafts[d.draft] = e.target.value; GAMES[gid].changed?.(d.draft, e.target.value); render(true); } });
document.addEventListener('submit', async e => {
  if (e.target.id !== 'join') return; e.preventDefault();
  const f = new FormData(e.target);
  try {
    const r = await api(A('join'), {code: f.get('code'), name: f.get('name'), access_code: f.get('access_code'), team: f.get('team') || undefined});
    key = r.token; ls.set('-key', key); await refresh();
  } catch (err) { notice(err.message); }
});

/* ======================================================== HET MOORDSPEL */
const MURDER_NEXT = {intro: 'Ronde 1 starten →', round1: 'Ronde 2: nieuw bewijs →', round2: 'Ronde 3: de wending →', round3: 'Naar de beschuldiging →', accuse: 'Ontknoping →'};
const MURDER_PHASE = {intro: 'Personages lezen', round1: 'Ronde 1 · eerste verhoren', round2: 'Ronde 2 · het bewijs', round3: 'Ronde 3 · de wending', accuse: 'Beschuldiging', reveal: 'De ontknoping', end: 'Einde'};
function murderCast(withBio = true) { return `<div class="roster">${view.cast.map(c => `<div class="person"><b>${esc(c.role)}</b><small>${esc(c.name)}</small>${withBio ? `<small>${esc(c.bio)}</small>` : ''}</div>`).join('')}</div>`; }
function murderEvidence() { return view.evidence.length ? view.evidence.map(e => `<div class="card"><span class="eyebrow">Bewijs · ronde ${e.round}</span><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p></div>`).join('') : '<p class="small">Nog geen bewijsstukken.</p>'; }
function murderReveal(big) {
  const r = view.reveal; if (!r) return '';
  const charName = id => view.cast.find(c => c.character === id)?.role || '';
  let html = `<ol class="steps">${r.steps.map(s => `<li style="font-size:${big ? 'clamp(18px,2.6vh,28px)' : '16px'}">${esc(s)}</li>`).join('')}</ol>`;
  if (r.culprit) {
    const res = r.result, pts = Object.entries(res.points).sort((a, b) => b[1] - a[1]);
    html += `<div class="verdict"><div class="eyebrow">De dader</div><div class="name">${esc(charName(r.culprit))}</div><p class="lead">gespeeld door ${esc(playerName(r.culprit_player))} · ${esc(view.scenario.means[r.means])} · ${esc(view.scenario.motives[r.motive])}</p><p class="lead">${res.escaped ? 'De dader ontsnapt: minder dan de helft wees de juiste persoon aan.' : `${res.named} van de ${res.voters} detectives wezen de dader aan.`}</p></div>
    <h2>Ranglijst detectives</h2><ul class="list">${pts.map(([pid, p]) => `<li><b>${esc(playerName(pid))}</b> · ${p} ${p === 1 ? 'punt' : 'punten'}</li>`).join('')}</ul>`;
  }
  return html;
}
const GAMES = {};
GAMES.moord = {
  lobbyText: 'Iedereen krijgt een personage met een geheim en een alibi. Kies een scenario en start als iedereen er is.',
  settings() {
    const v = view, sc = v.scenarios, cur = drafts.scenario || v.settings.scenario || sc[0].id;
    return `<label class="field"><span>Scenario</span>${sel('scenario', sc.map(s => [s.id, `${s.title} (${s.min}–${s.max} spelers)`]), cur)}</label><p class="small">${esc(sc.find(s => s.id === cur)?.tagline)} · ${esc(sc.find(s => s.id === cur)?.audience)}</p>
    <label class="field"><span>Minuten per ronde</span>${sel('minutes', [15, 20, 25, 30, 40].map(m => [m, m + ' minuten']), drafts.minutes || v.settings.minutes)}</label>
    <label class="field"><span>Moeilijkheid</span>${sel('level', [['makkelijk', 'Makkelijk · daderaanwijzingen een ronde eerder, 3 keer delen per ronde'], ['normaal', 'Normaal'], ['moeilijk', 'Moeilijk · daderaanwijzingen een ronde later, 1 keer delen per ronde']], drafts.level || v.settings.level || 'normaal')}</label>`;
  },
  startButtons() { const sc = view.scenarios.find(s => s.id === (drafts.scenario || view.settings.scenario || view.scenarios[0].id)); const n = view.players.length; return btn('Personages uitdelen en beginnen →', 'start', n < sc.min || n > sc.max ? 'disabled' : '') + `<span class="small">Nodig: ${sc.min}–${sc.max} spelers.</span>`; },
  host() {
    const v = view, ph = v.phase, sc = v.scenario;
    let main = `<div class="eyebrow">${esc(sc.title)} · ${MURDER_PHASE[ph]}</div><h1>${MURDER_PHASE[ph]}</h1>`;
    if (ph === 'intro') main += `<p class="lead">Lees de opening voor (staat ook op de beamer):</p><div class="hint">${esc(sc.opening)}</div><p>${v.acks} van ${v.cast.length} spelers hebben hun personage gelezen.</p>`;
    if (ph.startsWith('round')) main += `<p class="lead">Resterende tijd: ${timer(v.ends_at)}</p><p>${ph === 'round1' ? 'Iedereen praat met iedereen. Liegen mag over je geheim, niet over feiten op je telefoon.' : ph === 'round2' ? 'Nieuw bewijs op de beamer. Spelers mogen twee aanwijzingen per ronde delen.' : 'De wending staat op de beamer. De dader heeft een afleidingsopdracht gekregen.'}</p>`;
    if (ph === 'accuse') main += `<p class="lead">Iedereen kiest op de telefoon: wie, welk middel en welk motief.</p><p>${v.accused} van ${v.cast.length} beschuldigingen binnen.</p>`;
    if (ph === 'reveal' || ph === 'end') main += murderReveal(false);
    const actions = ph === 'reveal' ? btn(v.reveal.culprit ? 'Afronden' : 'Volgende stap →', 'reveal_next') : ph !== 'end' ? btn(MURDER_NEXT[ph], 'next') + (v.ends_at ? btn('Ronde +5 min', 'extend', '', 'secondary') : '') : btn('Nieuw spel met dezelfde spelers', 'reset', 'data-confirm="Alles wissen en opnieuw beginnen?"', 'secondary');
    return `<div class="cols"><div>${main}<div class="actions">${actions}</div><h2>Bewijs</h2>${murderEvidence()}</div><aside><section class="panel"><h2>Personages</h2>${murderCast(false)}</section><section class="panel"><h2>Verloop</h2>${logList()}</section><p class="actions"><a class="btn secondary" href="/spel/${gid}/scherm" target="_blank" rel="noopener">Open beamer ↗</a></p></aside></div>`;
  },
  screen() {
    const v = view, ph = v.phase, sc = v.scenario;
    if (ph === 'intro') return `<div class="stage"><div class="eyebrow">${esc(sc.title)}</div><h1>Er is een moord gepleegd</h1><p class="lead">${esc(sc.opening)}</p><p class="small">Lees in stilte je personage op je telefoon.</p></div>`;
    if (ph.startsWith('round') || ph === 'accuse') return `<div class="stage" style="justify-content:flex-start"><div class="eyebrow">${esc(sc.title)}</div><h1>${MURDER_PHASE[ph]}</h1>${ph === 'accuse' ? `<p class="lead">Lever je beschuldiging in op je telefoon: ${v.accused} van ${v.cast.length}</p>` : `<p>${timer(v.ends_at)}</p>`}
      <div class="cols" style="text-align:left"><div>${murderEvidence()}<div class="card"><h3>Bekende feiten</h3><ul>${sc.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div><div class="card"><h3>Het huis</h3><div class="chips">${sc.setting.map(r => `<span class="chip">${esc(r)}</span>`).join('')}</div></div></div><div>${murderCast(true)}</div></div></div>`;
    return `<div class="stage" style="justify-content:flex-start;text-align:left"><div class="eyebrow center">${esc(sc.title)}</div><h1 class="center">De ontknoping</h1>${murderReveal(true)}</div>`;
  },
  phone() {
    const v = view, me = v.me, ph = v.phase, c = me.character;
    if (!c) return '<p class="lead">Je speelt dit spel niet mee.</p>';
    const clues = me.clues || [];
    let html = `<div class="eyebrow">${esc(v.scenario.title)} · ${MURDER_PHASE[ph]}</div>${v.ends_at ? `<p>Ronde eindigt over ${timer(v.ends_at)}</p>` : ''}`;
    html += `<div class="card"><span class="eyebrow">Jouw personage</span><h2 style="margin:4px 0">${esc(c.name)}</h2><p>${esc(c.bio)}</p></div>`;
    if (ui.hide) html += `<div class="card secret cover" data-a="toggle_secret"><p class="center">Geheim en alibi verborgen. Tik om te tonen.</p></div>`;
    else html += `<div class="card secret cover" data-a="toggle_secret"><h3>Je geheim</h3><p>${esc(c.secret)}</p><h3>Je alibi</h3><p>${esc(c.alibi)}</p><p class="small">Tik om te verbergen.</p></div>`;
    const confession = clues.find(x => x.confession);
    if (confession && !ui.hide) html += `<div class="card" style="border-color:var(--accent2)"><span class="eyebrow" style="color:#ff8ca0">Alleen voor jou</span><p style="color:var(--ink)">${esc(confession.text)}</p>${me.task ? `<h3>Afleidingsopdracht</h3><p style="color:var(--ink)">${esc(me.task)}</p>` : ''}</div>`;
    if (ph === 'intro') html += me.acked ? '<p class="done">Klaar. Wacht op de start van ronde 1.</p>' : btn('Ik heb mijn personage gelezen', 'ack', '', 'big');
    const own = clues.map((x, i) => ({...x, i})).filter(x => !x.confession);
    if (own.length) html += `<h2>Jouw aanwijzingen</h2>${own.map(x => `<div class="card"><span class="eyebrow">Ronde ${x.round}${x.via ? ' · overgenomen van ' + esc(x.via) : ''}</span><p style="color:var(--ink)">${esc(x.text)}</p></div>`).join('')}`;
    if (me.received?.length) html += `<h2>Gekregen van anderen</h2>${me.received.map(x => `<div class="card"><span class="eyebrow">Van ${esc(x.from)} · ronde ${x.round}</span><p style="color:var(--ink)">${esc(x.text)}</p></div>`).join('')}`;
    if (ph.startsWith('round') && own.length) {
      const others = v.cast.filter(x => x.player !== me.id);
      html += `<section class="panel"><h2>Aanwijzing delen (${me.shared_count}/${view.settings.share || 2} deze ronde)</h2><label class="field"><span>Welke aanwijzing?</span>${sel('m_clue', own.map(x => [x.i, x.text.slice(0, 70) + (x.text.length > 70 ? '…' : '')]), drafts.m_clue ?? own[0].i)}</label><label class="field"><span>Aan wie?</span>${sel('m_to', others.map(x => [x.player, `${x.name} (${x.role})`]), drafts.m_to ?? others[0].player)}</label>${btn('Deel deze aanwijzing', 'share', me.shared_count >= 2 ? 'disabled' : '', 'secondary')}</section>`;
    }
    if (ph === 'accuse') {
      if (me.accusation) html += `<p class="done">Je beschuldiging is ingeleverd.</p>`;
      else {
        const opts = v.cast.filter(x => x.character !== c.id);
        html += `<section class="panel"><h2>Wie heeft het gedaan?</h2><label class="field"><span>Dader</span>${sel('m_who', [['', 'Kies…'], ...opts.map(x => [x.character, `${x.role} (${x.name})`])], drafts.m_who || '')}</label><label class="field"><span>Middel</span>${sel('m_means', [['', 'Kies…'], ...v.scenario.means.map((m, i) => [i, m])], drafts.m_means ?? '')}</label><label class="field"><span>Motief</span>${sel('m_motive', [['', 'Kies…'], ...v.scenario.motives.map((m, i) => [i, m])], drafts.m_motive ?? '')}</label>${btn('Beschuldiging definitief inleveren', 'accuse', '', 'danger big')}</section>`;
      }
    }
    if (ph === 'reveal' || ph === 'end') html += `<h2>De ontknoping</h2>${murderReveal(false)}`;
    html += `<p><button class="secondary" data-ui="uitleg">Spelregels</button></p>`;
    return html;
  },
  click(a, el, d) {
    if (role === 'host') {
      if (a === 'start') return hostSend({action: 'settings', scenario: drafts.scenario || view.settings.scenario || view.scenarios[0].id, minutes: parseInt(drafts.minutes || view.settings.minutes, 10), level: drafts.level || view.settings.level || 'normaal'}).then(() => hostSend({action: 'start'}));
      return hostSend({action: a});
    }
    if (a === 'toggle_secret') { ui.hide = !ui.hide; return render(true); }
    if (a === 'ack') return playerSend({action: 'ack'});
    if (a === 'share') { const own = view.me.clues.map((x, i) => ({...x, i})).filter(x => !x.confession); return playerSend({action: 'share', clue: parseInt(drafts.m_clue ?? own[0].i, 10), to: drafts.m_to || view.cast.find(x => x.player !== view.me.id).player}); }
    if (a === 'accuse') {
      if (!drafts.m_who || drafts.m_means === undefined || drafts.m_means === '' || drafts.m_motive === undefined || drafts.m_motive === '') return notice('Kies een dader, een middel en een motief.');
      if (!confirm('Weet je het zeker? Je beschuldiging is definitief.')) return;
      return playerSend({action: 'accuse', who: drafts.m_who, means: parseInt(drafts.m_means, 10), motive: parseInt(drafts.m_motive, 10)});
    }
  },
};

/* ======================================================= LEVEND STRATEGO */
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', RANKS = ['B', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
function sDecode(code, k) {
  code = String(code || '').trim().toUpperCase().replace(/0/g, 'O').replace(/1/g, 'I');
  if (code.length !== 3 || [...code].some(c => !ALPHA.includes(c))) return null;
  const full = (ALPHA.indexOf(code[0]) << 10) | (ALPHA.indexOf(code[1]) << 5) | ALPHA.indexOf(code[2]);
  const value = (full >> 5) ^ k, check = full & 31, number = value >> 4, idx = value & 15;
  if (idx >= RANKS.length || (number * 7 + idx * 3 + k) % 32 !== check) return null;
  return [number, RANKS[idx]];
}
function sOutcome(mine, theirs, tagged) {
  if (mine === 'B') return theirs === '3' ? 'lose' : 'win';
  if (theirs === 'B') return mine === '3' ? 'win' : 'lose';
  if (mine === '1' && theirs === '10') return tagged ? 'win' : 'lose';
  if (mine === '10' && theirs === '1') return tagged ? 'win' : 'lose';
  const a = +mine, b = +theirs; return a > b ? 'win' : a < b ? 'lose' : 'both';
}
function sLocal() { if (!ui.s || !queue.length) ui.s = {status: view.me.status, rank: view.me.rank, losses: view.me.losses, scouted_at: view.me.scouted_at}; return ui.s; }
GAMES.stratego = {
  lobbyText: 'Twee teams met geheime rangen op de telefoon. Iedereen kiest een team bij het aanmelden; je kunt ze hier eerlijk verdelen of verplaatsen.',
  settings() {
    const v = view;
    return `<div class="grid2">${v.teams.map((t, i) => `<label class="field"><span>Naam team ${i + 1}</span><input data-draft="tn${i}" value="${esc(drafts['tn' + i] ?? t.name)}" maxlength="20"></label>`).join('')}</div><label class="field"><span>Speelduur</span>${sel('minutes', [30, 45, 60, 75, 90, 120].map(m => [m, m + ' minuten']), drafts.minutes || v.settings.minutes)}</label>`;
  },
  startButtons() { return btn('Teams eerlijk verdelen', 'balance', '', 'secondary') + btn('Rangen uitdelen →', 'start', view.players.length < 4 ? 'disabled' : ''); },
  host() {
    const v = view, ph = v.phase;
    const scores = scoreCards(v.teams.map(t => [t.name, v.scores[t.id], `${v.counts[t.id].field} in het veld · ${v.counts[t.id].out} naar de basis`]));
    if (ph === 'setup') return `<div class="eyebrow">Opstelling</div><h1>Hang de basiscodes op</h1><p class="lead">Wie een duel verliest, loopt terug naar de eigen basis en tikt daar deze code in. Zet de code op een bordje bij elke basis.</p><div class="grid2">${v.teams.map(t => `<div class="card center"><h3>${esc(t.name)}</h3><div class="huge">${v.base_codes[t.id]}</div></div>`).join('')}</div><div class="actions">${btn('Basiscodes printen', 'print', '', 'secondary')}${btn('Start het spel →', 'go')}</div>`;
    const feed = `<ul class="list">${v.duels.map(d => `<li>${d.void ? '<s>' : ''}${esc(d.a)} tegen ${esc(d.b)}: <b>${d.winner ? esc(d.winner) + ' wint' : 'gelijk'}</b>${d.void ? '</s>' : ` ${btn('Schrappen', 'void_duel', `data-id="${d.id}" data-confirm="Dit duel schrappen?"`, 'secondary small')}`}</li>`).join('') || '<li>Nog geen duels.</li>'}</ul>`;
    if (ph === 'end') return `<div class="verdict"><div class="eyebrow">Einde</div><div class="name">${v.winner ? esc(teamName(v.winner)) + ' wint!' : 'Gelijkspel'}</div></div>${scores}<h2>Alle rangen</h2><div class="roster">${v.players.map(p => `<div class="person"><b>${esc(p.name)}</b><small>${esc(teamName(p.team))} · rang ${esc(v.ranks?.[p.id] || '?')}</small></div>`).join('')}</div><div class="actions">${btn('Nieuw spel', 'reset', 'data-confirm="Alles wissen en opnieuw beginnen?"', 'secondary')}</div>`;
    return `<div class="cols"><div><div class="eyebrow">Het spel loopt</div><h1>Nog ${timer(v.ends_at)}</h1>${scores}<div class="actions">${v.teams.map(t => btn('Vlag veroverd door ' + esc(t.name), 'flag', `data-team="${t.id}" data-confirm="Heeft ${esc(t.name)} de vlag in de eigen basis gebracht?"`, 'danger')).join('')}${btn('+10 min', 'extend', '', 'secondary')}${btn('Einde · uitslag op duels', 'finish', 'data-confirm="Het spel nu beëindigen?"', 'secondary')}</div><h2>Laatste duels</h2>${feed}</div>
    <aside><section class="panel"><h2>Basiscodes</h2>${v.teams.map(t => `<p>${esc(t.name)}: <b class="code" style="font-size:24px">${v.base_codes[t.id]}</b></p>`).join('')}</section><section class="panel"><h2>Spelers</h2><div class="roster">${v.players.map(p => `<div class="person ${v.status[p.id] === 'out' ? 'out' : ''}"><b>${esc(p.name)}</b><small>${esc(teamName(p.team))} · ${v.status[p.id] === 'out' ? 'naar de basis' : 'in het veld'}</small></div>`).join('')}</div></section></aside></div>`;
  },
  printCards() { return ''; },
  screen() {
    const v = view, ph = v.phase;
    const scores = scoreCards(v.teams.map(t => [t.name, v.scores[t.id], `${v.counts[t.id].field} in het veld`]));
    if (ph === 'setup') return `<div class="stage"><div class="eyebrow">Rangen & Vlaggen</div><h1>Verstop jullie vlag</h1><p class="lead">Bekijk je rang in het geheim. De vlag binnen 20 meter van de basis, de Bom binnen 5 meter van de vlag.</p></div>`;
    if (ph === 'end') return `<div class="stage"><div class="eyebrow">Einde</div><h1>${v.winner ? esc(teamName(v.winner)) + ' wint!' : 'Gelijkspel'}</h1>${scores}</div>`;
    return `<div class="stage"><div class="eyebrow">Rangen & Vlaggen</div><h1>${timer(v.ends_at)}</h1>${scores}<ul class="list" style="max-width:900px;margin:0 auto">${v.duels.filter(d => !d.void).slice(0, 6).map(d => `<li>${esc(d.a)} tegen ${esc(d.b)}: <b>${d.winner ? esc(d.winner) + ' wint' : 'gelijk'}</b></li>`).join('')}</ul></div>`;
  },
  phone() {
    const v = view, me = v.me, ph = v.phase;
    if (!me.rank) return '<p class="lead">Wacht tot de rangen uitgedeeld zijn.</p>';
    const L = sLocal();
    let html = ph === 'play' ? `<p>Nog ${timer(v.ends_at)} · ${esc(teamName(me.team))}</p>` : ph === 'end' ? `<div class="verdict"><div class="name">${v.winner ? esc(teamName(v.winner)) + ' wint!' : 'Gelijkspel'}</div></div>` : '<p class="lead">Verstop de vlag. Bekijk je rang in het geheim.</p>';
    html += `<div class="card secret cover center" data-a="toggle_rank">${ui.showRank ? `<span class="eyebrow">Jouw rang</span><div class="rank">${esc(L.rank)}</div><h2 style="margin:4px 0">${esc(me.names[L.rank])}</h2><p class="small">Tik om te verbergen</p>` : '<div class="rank">?</div><p class="small">Tik om je rang te zien. Scherm afschermen!</p>'}</div>`;
    if (ph === 'end') return html;
    html += `<div class="card center"><span class="eyebrow">Jouw duelcode</span><div class="huge" style="letter-spacing:8px">${esc(me.code)}</div><p class="small">Laat deze code zien aan wie je tikt of wie jou tikt.</p></div>`;
    if (L.status === 'out') {
      html += `<section class="panel"><h2 style="color:var(--bad)">Terug naar je basis</h2><p>Loop terug en tik daar de basiscode in.${L.losses >= 3 ? ' Je krijgt een nieuwe rang.' : ''}</p><label class="field"><span>Basiscode</span><input data-draft="base" inputmode="numeric" maxlength="4" autocomplete="off"></label>${btn('Ingecheckt bij de basis', 'checkin', '', 'big')}</section>`;
    } else if (ph === 'play') {
      html += `<section class="panel"><h2>Duel</h2><label class="field"><span>Code van je tegenstander</span><input data-draft="opp" maxlength="3" autocapitalize="characters" autocomplete="off" style="font-size:26px;letter-spacing:6px;text-transform:uppercase"></label><div class="chips">${btn('Ik tikte', 'tagged', `data-v="1"`, 'secondary small ' + (ui.tagged !== false ? 'chosen' : ''))}${btn('Ik werd getikt', 'tagged', `data-v="0"`, 'secondary small ' + (ui.tagged === false ? 'chosen' : ''))}</div><p class="small">Gekozen: <b>${ui.tagged === false ? 'ik werd getikt' : 'ik tikte'}</b> (telt alleen bij Spion tegen Maarschalk)</p>${btn('Duel uitvoeren', 'duel', '', 'big danger')}</section>`;
      if (L.rank === '2') {
        const wait = L.scouted_at + me.scout_minutes * 60 - now();
        html += `<section class="panel"><h2>Verkennen</h2>${wait > 0 ? `<p>Je scan laadt op: nog ${fmt(wait)}.</p>` : `<label class="field"><span>Code van een tegenstander</span><input data-draft="scout" maxlength="3" autocapitalize="characters"></label>${btn('Scan', 'scout', '', 'secondary')}`}</section>`;
      }
    }
    if (ui.result) html += `<div class="card center"><h2>${esc(ui.result)}</h2></div>`;
    html += `<details><summary class="small">Rangen en regels</summary><ul>${RANKS.slice().reverse().map(r => `<li>${r} · ${esc(me.names[r])}</li>`).join('')}</ul><p class="small">Hoger wint. Gelijk: allebei terug. De Spion wint alleen van de Maarschalk als de Spion tikt. De Bom verslaat iedereen behalve de Mineur.</p></details><p><button class="secondary" data-ui="uitleg">Uitleg</button></p>`;
    return html;
  },
  click(a, el, d) {
    if (role === 'host') {
      if (a === 'start') return hostSend({action: 'settings', minutes: parseInt(drafts.minutes || view.settings.minutes, 10), names: view.teams.map((t, i) => drafts['tn' + i] ?? t.name)}).then(() => hostSend({action: 'start'}));
      if (a === 'flag') return hostSend({action: a, team: d.team});
      if (a === 'void_duel') return hostSend({action: a, id: d.id});
      return hostSend({action: a});
    }
    const me = view.me, L = sLocal();
    if (a === 'toggle_rank') { ui.showRank = !ui.showRank; clearTimeout(ui.rt); if (ui.showRank) ui.rt = setTimeout(() => { ui.showRank = false; render(true); }, 6000); return render(true); }
    if (a === 'tagged') { ui.tagged = d.v === '1'; return render(true); }
    if (a === 'duel') {
      const info = sDecode(drafts.opp, me.key);
      if (!info) return notice('Onbekende code. Controleer de drie tekens.');
      const other = me.numbers[String(info[0])];
      if (!other) return notice('Onbekende code.');
      if (other.team === me.team) return notice('Dat is iemand van je eigen team.');
      const res = sOutcome(L.rank, info[1], ui.tagged !== false);
      ui.result = res === 'win' ? `Gewonnen van ${other.name} (${me.names[info[1]]})!` : res === 'lose' ? `Verloren van ${other.name} (${me.names[info[1]]}). Terug naar de basis.` : `Gelijk tegen ${other.name}: allebei terug naar de basis.`;
      const code = drafts.opp; drafts.opp = '';
      return playerSend({action: 'duel', code, tagged: ui.tagged !== false, _res: res});
    }
    if (a === 'checkin') {
      const base = drafts.base || ''; if (!/^\d{4}$/.test(base)) return notice('Vul de vier cijfers van de basiscode in.');
      const nr = L.losses >= 3 ? me.redraw[Math.floor(Math.random() * me.redraw.length)] : undefined; drafts.base = ''; ui.result = '';
      return playerSend({action: 'checkin', base, new_rank: nr});
    }
    if (a === 'scout') {
      const info = sDecode(drafts.scout, me.key); const other = info && me.numbers[String(info[0])];
      if (!info || !other || other.team === me.team) return notice('Onbekende code van een tegenstander.');
      ui.result = `${other.name} is ${me.names[info[1]]} (${info[1]}).`; const code = drafts.scout; drafts.scout = '';
      return playerSend({action: 'scout', code});
    }
  },
};
function localApply(a) {
  if (gid === 'stratego' && view?.me?.rank) {
    const L = sLocal();
    if (a.action === 'duel' && a._res) { if (a._res !== 'win') { L.status = 'out'; L.losses += 1; } }
    if (a.action === 'checkin') { L.status = 'field'; if (a.new_rank) { L.rank = a.new_rank; L.losses = 0; } }
    if (a.action === 'scout') L.scouted_at = Date.now() / 1000;
  }
  if (gid === 'smokkel' && view?.me?.runner) smokkelApply(a);
  if (gid === 'opgejaagd' && view?.me) huntApply(a);
  if (gid === 'bingo' && view?.me?.card && a.action === 'mark') { const c = view.me.card[a.cell]; if (c) c.marked = !c.marked; }
}

/* ===================================================== IK HOU VAN HOLLAND */
/* 0.15: het dialectwoord zelf nooit vertalen; alleen de vraagzin eromheen. */
function hollandWord(word) {
  const mark = 'QQWORDQQ', t = window.GSI18N?.t || (x => x);
  return `<h1 data-notranslate>${esc(t('Wat betekent ‘' + mark + '’?')).replace(mark, esc(word))}</h1>`;
}
GAMES.holland = {
  lobbyText: 'Twee teams, zes rondes en een presentator. De presentator bedient deze pc en speelt zelf niet mee. Spelers kiezen hun team bij het aanmelden.',
  settings() { return `<div class="grid2">${view.teams.map((t, i) => `<label class="field"><span>Naam team ${i + 1}</span><input data-draft="tn${i}" value="${esc(drafts['tn' + i] ?? t.name)}" maxlength="24"></label>`).join('')}</div><p class="small">Elke show kiest nieuwe vragen uit de vragenbank van Echt Hollands!.</p>`; },
  startButtons() { return btn('Start de show →', 'start', view.players.length < 2 ? 'disabled' : ''); },
  scores() { return scoreCards(view.teams.map(t => [t.name, view.scores[t.id] || 0])); },
  qBlock(forHost) {
    const v = view, r = v.round, q = v.question, st = v.stage;
    if (st === 'intro') return `<div class="eyebrow">Ronde ${r.index + 1} van ${r.total}</div><h1>${esc(r.title)}</h1><p class="lead">${esc(r.intro)}</p>`;
    let html = `<div class="eyebrow">${esc(r.title)} · ${r.kind === 'act' ? 'beurt' : 'vraag'} ${v.qi + 1} van ${v.count}</div>`;
    if (r.kind === 'act') {
      if (st === 'acting') html += `<h1>${esc(v.turn.actor_name)} beeldt uit</h1><p class="huge">${timer(v.turn.ends_at)}</p><p class="lead">Geraden: ${v.turn.got} · gepast: ${v.turn.passed}</p>`;
      else if (st === 'reveal') html += `<h1>${esc(teamName(q.team))}: ${q.result?.got.length || 0} geraden</h1><p class="lead">${(q.result?.got || []).map(esc).join(' · ')}</p>`;
      else html += `<h1>${esc(teamName(q.team))} is aan de beurt</h1><p class="lead">Wie beeldt er uit? De woorden verschijnen op diens telefoon.</p>`;
      return html;
    }
    html += `${q.word ? hollandWord(q.word) : `<h1>${esc(q.q)}</h1>`}${q.region ? `<p class="small">${esc(q.region)}</p>` : ''}${q.unit ? `<p class="small">Antwoord in ${esc(q.unit)}</p>` : ''}`;
    if (q.options) html += `<div class="options">${q.options.map((o, i) => `<div class="option ${st === 'reveal' && q.correct === i ? 'right' : ''}">${'ABC'[i]}. ${esc(o)}</div>`).join('')}</div>`;
    if (r.kind === 'buzz' && st === 'question') html += v.buzz ? `<p class="huge" style="font-size:clamp(30px,6vw,70px)">🔔 ${esc(teamName(v.buzz))}</p>` : `<p class="lead">Druk op je telefoon!${v.attempted.length ? ' (' + v.attempted.map(teamName).map(esc).join(', ') + ' mag niet meer)' : ''}</p>`;
    if (['choice', 'text', 'estimate'].includes(r.kind) && st === 'question') html += `<p class="lead">${v.answered.length ? v.answered.map(teamName).map(esc).join(' en ') + ' heeft geantwoord.' : 'Overleg en antwoord op de telefoon.'}</p>`;
    if (forHost && q.answer !== undefined && st === 'question') html += `<div class="hint">Antwoord (alleen presentator): <b>${esc(q.answer)}</b></div>`;
    if (st === 'reveal') {
      const num = x => typeof x === 'number' && q.unit !== 'jaartal' ? x.toLocaleString('nl-NL') : x;
      if (q.answer !== undefined) html += `<p class="huge" style="font-size:clamp(28px,5vw,64px)">${esc(num(q.answer))}${q.unit && q.unit !== 'jaartal' ? ` <span style="font-size:.4em">${esc(q.unit)}</span>` : ''}</p>`;
      if (q.given) html += `<div class="score-row">${v.teams.map(t => `<div class="score-card">${esc(t.name)}<small class="small">${r.kind === 'estimate' ? 'schatting' : 'antwoord'}</small><b style="font-size:28px">${q.given[t.id] === undefined ? '–' : esc(q.options ? 'ABC'[q.given[t.id]] : num(q.given[t.id]))}</b>${forHost && r.kind === 'text' && q.given[t.id] !== undefined && !q.overridden.includes(t.id) && !(q.right || []).includes(t.id) ? btn('Alsnog goed', 'override', `data-team="${t.id}"`, 'secondary small') : ''}</div>`).join('')}</div>`;
    }
    return html;
  },
  host() {
    const v = view, ph = v.phase;
    if (ph === 'end') return `<div class="verdict"><div class="eyebrow">Einde van de show</div><div class="name">${v.winners.map(teamName).map(esc).join(' en ')} ${v.winners.length > 1 ? 'winnen' : 'wint'}!</div></div>${this.scores()}<div class="actions">${btn('Nieuwe show', 'reset', 'data-confirm="Nieuwe show beginnen?"', 'secondary')}</div>`;
    const r = v.round, st = v.stage;
    let act = '';
    if (st === 'intro') act = btn('Start de ronde →', 'next');
    else if (st === 'reveal') act = btn('Volgende →', 'next');
    else if (r.kind === 'buzz') act = v.buzz ? btn('Goed ✓', 'judge', 'data-correct="1"', 'good') + btn('Fout ✗', 'judge', 'data-correct="0"', 'danger') : btn('Niemand weet het · onthul', 'reveal', '', 'secondary');
    else if (r.kind === 'act') act = st === 'acting' ? btn('Beurt stoppen', 'stop_turn', '', 'secondary') : btn('Start de beurt (60 sec) →', 'start_turn');
    else act = btn('Onthul het antwoord', 'reveal');
    return `<div class="cols"><div>${this.qBlock(true)}<div class="actions">${act}</div></div><aside>${this.scores()}<section class="panel"><h2>Verloop</h2>${logList()}</section><p class="actions"><a class="btn secondary" href="/spel/${gid}/scherm" target="_blank" rel="noopener">Open beamer ↗</a>${btn('Show beëindigen', 'finish', 'data-confirm="De show nu beëindigen?"', 'secondary')}</p></aside></div>`;
  },
  screen() {
    const v = view;
    if (v.phase === 'end') return `<div class="stage"><div class="eyebrow">Echt Hollands!</div><h1>${v.winners.map(teamName).map(esc).join(' en ')} ${v.winners.length > 1 ? 'winnen' : 'wint'}!</h1>${this.scores()}</div>`;
    return `<div class="stage">${this.qBlock(false)}${this.scores()}</div>`;
  },
  phone() {
    const v = view, me = v.me;
    if (v.phase === 'end') return `<div class="verdict"><div class="name">${v.winners.map(teamName).map(esc).join(' en ')} ${v.winners.length > 1 ? 'winnen' : 'wint'}!</div></div>${this.scores()}`;
    const r = v.round, st = v.stage, q = v.question; let html = this.scores();
    if (st === 'intro') return html + `<h1>${esc(r.title)}</h1><p class="lead">${esc(r.intro)}</p>`;
    if (r.kind === 'act') {
      if (st === 'acting' && me.word) return html + `<p>Nog ${timer(v.turn.ends_at)}</p><div class="huge" style="font-size:clamp(34px,10vw,64px)">${esc(me.word)}</div><div class="grid2">${btn('Geraden ✓', 'act', 'data-r="got"', 'good big')}${btn('Pas', 'act', 'data-r="pass"', 'secondary big')}</div>`;
      if (st === 'acting') return html + `<h1>${esc(v.turn.actor_name)} beeldt uit</h1><p class="lead">${v.turn.team === me.team ? 'Raden maar!' : 'Kijk mee en zwijg.'}</p>`;
      return html + `<p class="lead">${st === 'reveal' ? 'Beurt voorbij.' : esc(teamName(q.team)) + ' is zo aan de beurt.'}</p>`;
    }
    if (st === 'reveal') return html + `<h2>${esc(q.q)}</h2>${q.answer !== undefined ? `<p class="done">Antwoord: ${esc(q.answer)}</p>` : ''}${q.options ? `<p class="done">Antwoord: ${esc(q.options[q.correct])}</p>` : ''}`;
    html += `<h2>${esc(q.q)}</h2>`;
    if (r.kind === 'buzz') {
      if (v.buzz) return html + `<p class="done">${v.buzz === me.team ? 'Jullie drukten het eerst! Antwoord hardop.' : esc(teamName(v.buzz)) + ' drukte het eerst.'}</p>`;
      if (v.attempted.includes(me.team)) return html + '<p class="lead">Jullie hebben het al geprobeerd.</p>';
      return html + `<button class="big danger" data-a="buzz" style="min-height:42vh;font-size:44px;border-radius:50%;aspect-ratio:1;max-width:80vw;display:block;margin:20px auto">DRUK</button>`;
    }
    if (me.answered) return html + `<p class="done">Jullie antwoord is binnen${me.answer !== undefined && me.answer !== null ? ': ' + esc(q.options ? q.options[me.answer] : me.answer) : ''}.</p>`;
    if (r.kind === 'choice') return html + `<div class="pick">${q.options.map((o, i) => btn(esc(o), 'answer', `data-v="${i}"`)).join('')}</div><p class="small">Eén antwoord per team: de eerste telt.</p>`;
    if (r.kind === 'text') return html + `<label class="field"><span>Jullie antwoord</span><input data-draft="ans" autocomplete="off" maxlength="80"></label>${btn('Versturen', 'answer_text', '', 'big')}`;
    return html + `<label class="field"><span>Jullie schatting${q.unit ? ' (' + esc(q.unit) + ')' : ''}</span><input data-draft="est" inputmode="decimal" autocomplete="off"></label>${btn('Versturen', 'answer_est', '', 'big')}`;
  },
  click(a, el, d) {
    if (role === 'host') {
      if (a === 'start') return hostSend({action: 'settings', names: view.teams.map((t, i) => drafts['tn' + i] ?? t.name)}).then(() => hostSend({action: 'start'}));
      if (a === 'judge') return hostSend({action: a, correct: d.correct === '1'});
      if (a === 'override') return hostSend({action: a, team: d.team});
      return hostSend({action: a});
    }
    if (a === 'buzz') return playerSend({action: 'buzz'});
    if (a === 'answer') return playerSend({action: 'answer', value: parseInt(d.v, 10)});
    if (a === 'answer_text') { const v = (drafts.ans || '').trim(); if (!v) return notice('Typ jullie antwoord.'); drafts.ans = ''; return playerSend({action: 'answer', value: v}); }
    if (a === 'answer_est') { const v = (drafts.est || '').trim(); if (!v) return notice('Vul een getal in.'); drafts.est = ''; return playerSend({action: 'answer', value: v}); }
    if (a === 'act') return playerSend({action: 'act', result: d.r});
  },
};

/* ============================================================== CRAZY 88 */
/* 0.14.3: meldcode = eerste vijf letters/cijfers van de teamnaam + opdrachtnummer; dezelfde regel als crazy_engine.whatsapp_code */
function waCode(teamId, n) { const name = (teamName(teamId) || teamId || '').toUpperCase().normalize('NFKD').replace(/[^A-Z0-9]/g, '').slice(0, 5) || String(teamId).toUpperCase(); return name + '-' + n; }
const CRAZY_STATUS = {pending: ['wait', 'Wacht op beoordeling'], approved: ['ok', 'Goedgekeurd'], rejected: ['no', 'Afgekeurd']};
GAMES.crazy88 = {
  lobbyText: 'Teams kiezen zelf welke van de 88 opdrachten ze doen en sturen tekst, foto of video als bewijs. Spelers maken of kiezen hun team bij het aanmelden.',
  settings() { const f = view.filters || {}; return `<label class="field"><span>Speelduur</span>${sel('minutes', [60, 90, 120, 180, 240].map(m => [m, (m / 60) + ' uur']), drafts.minutes || view.settings.minutes)}</label>
    <details class="filters"><summary>Opdrachten filteren (${view.tasks.length} van 88 actief)</summary>
    <label class="field"><span>Waar</span>${sel('f_where', [['overal', 'Binnen en buiten'], ['binnen', 'Alleen binnen'], ['buiten', 'Vooral buiten']], drafts.f_where || f.where || 'overal')}</label>
    <label class="field"><span>Benodigdheden</span>${sel('f_needs', [['alles', 'Alles mag (ook sokken, bekers, lepel)'], ['papier', 'Alleen telefoon, pen en papier'], ['niets', 'Alleen een telefoon']], drafts.f_needs || f.needs || 'alles')}</label>
    <label class="field"><span>Maximale duur per opdracht</span>${sel('f_max', [[10, 'Tot 10 minuten'], [5, 'Tot 5 minuten'], [3, 'Alleen snelle opdrachten (3 min)']], drafts.f_max || f.max_minutes || 10)}</label>
    <label class="field"><span>Jongste speler</span>${sel('f_age', [[12, '12 jaar of ouder'], [10, '10–11 jaar'], [8, '8–9 jaar'], [6, '6–7 jaar']], drafts.f_age || f.age || 12)}</label>
    ${btn('Filters toepassen', 'filters', '', 'secondary small')}</details>
    <label class="field"><span>Team toevoegen</span><input data-draft="newteam" maxlength="30"></label>${btn('Team toevoegen', 'add_team', '', 'secondary small')}`; },
  startButtons() { return btn('Start Gekke 88 →', 'start', view.players.length < 1 ? 'disabled' : ''); },
  board() { return `<ol class="list">${view.board.map(b => `<li><b>${esc(b.name)}</b> · ${b.score} ${b.score === 1 ? 'punt' : 'punten'} · ${b.done} ${b.done === 1 ? 'opdracht' : 'opdrachten'}${b.pending ? ` · ${b.pending} wachten` : ''}</li>`).join('')}</ol>`; },
  media(sub, k) { if (!sub.media) return ''; const url = A('media/' + sub.media) + (k ? '?k=' + encodeURIComponent(hostKey) : ''); return sub.mime.startsWith('video/') ? `<video src="${url}" controls preload="metadata" playsinline></video>` : `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="Bewijs" loading="lazy"></a>`; },
  host() {
    const v = view, ph = v.phase;
    const pending = v.subs.filter(s => s.status === 'pending'), done = v.subs.filter(s => s.status !== 'pending').slice(-12).reverse();
    const subCard = s => `<div class="card"><span class="eyebrow">${esc(s.team_name)} · opdracht ${s.task_n} · ${esc(s.by_name)}</span><p style="color:var(--ink)">${esc(s.task_text)}</p>${s.via_whatsapp ? `<p class="wa-badge">📱 Bewijs in de WhatsApp-groep · zoek op <b>${esc(s.code || '')}</b></p>` : ''}${s.text ? `<p class="hint">${esc(s.text)}</p>` : ''}${this.media(s, true)}
      ${s.status === 'pending' ? `<div class="actions">${btn(`Goed (${s.max})`, 'grade', `data-id="${s.id}" data-p="${s.max}" data-ok="1"`, 'good')}${btn(`Top (${s.max + 1})`, 'grade', `data-id="${s.id}" data-p="${s.max + 1}" data-ok="1"`, 'secondary')}${btn('Half (1)', 'grade', `data-id="${s.id}" data-p="1" data-ok="1"`, 'secondary')}${btn('Afkeuren', 'grade', `data-id="${s.id}" data-ok="0"`, 'danger')}</div>` : `<p class="small">${CRAZY_STATUS[s.status][1]} · ${s.points} punten</p>`}</div>`;
    if (ph === 'end') return `${evidenceSettings()}<div class="eyebrow">Uitslag</div><h1>${esc(v.board[0]?.name || '')} wint!</h1>${this.board()}<div class="wall">${v.wall.map(w => `<figure><img src="${A('media/' + w.media)}" alt=""><figcaption>${esc(w.team)} · ${esc(w.task)}</figcaption></figure>`).join('')}</div>${pending.length ? `<h2>Nog te beoordelen</h2><div class="subs">${pending.map(subCard).join('')}</div>` : ''}<div class="actions">${btn('Nieuw spel', 'reset', 'data-confirm="Alles wissen en opnieuw beginnen?"', 'secondary')}</div>`;
    return `${evidenceSettings()}<div class="cols"><div><div class="eyebrow">Gekke 88 loopt</div><h1>Nog ${timer(v.ends_at)}</h1><h2>Te beoordelen (${pending.length})</h2><div class="subs">${pending.map(subCard).join('') || '<p class="small">Niets te beoordelen. Nieuwe inzendingen verschijnen vanzelf.</p>'}</div><details><summary>Laatst beoordeeld</summary><div class="subs">${done.map(subCard).join('')}</div></details></div>
    <aside><section class="panel"><h2>Ranglijst</h2>${this.board()}<div class="actions">${btn('+15 min', 'extend', '', 'secondary small')}${btn('Uitslag', 'finish', 'data-confirm="Het spel afsluiten en de uitslag tonen?"', 'small')}</div></section><section class="panel"><h2>Bonus</h2>${v.teams.map(t => `<p>${esc(t.name)} ${btn('+1', 'bonus', `data-team="${t.id}" data-p="1"`, 'secondary small')} ${btn('−1', 'bonus', `data-team="${t.id}" data-p="-1"`, 'secondary small')}</p>`).join('')}</section><section class="panel"><h2>Verloop</h2>${logList()}</section></aside></div>`;
  },
  screen() {
    const v = view;
    return `<div class="stage" style="justify-content:flex-start"><div class="eyebrow">Gekke 88</div><h1>${v.phase === 'end' ? esc(v.board[0]?.name || '') + ' wint!' : timer(v.ends_at)}</h1><div class="cols" style="text-align:left"><div class="wall">${v.wall.map(w => `<figure><img src="${A('media/' + w.media)}" alt=""><figcaption>${esc(w.team)} · ${esc(w.task)}</figcaption></figure>`).join('') || '<p class="lead">De fotomuur vult zich met goedgekeurde foto\'s.</p>'}</div><div class="panel"><h2>Ranglijst</h2>${this.board()}</div></div></div>`;
  },
  phone() {
    const v = view, me = v.me;
    if (!me.team) return '<p class="lead">Je zit nog niet in een team. Vraag de spelleider om je in te delen.</p>';
    const subs = me.subs || {}; const mine = v.board.find(b => b.team === me.team);
    const pendingLocal = new Set([...queue.filter(a => a.action === 'submit').map(a => a.task), ...uploads.map(u => u.task)]);
    if (v.phase === 'end') return `<h1>Afgelopen</h1><p class="lead">${esc(me.team_name)}: ${mine?.score || 0} punten.</p>${this.board()}`;
    if (ui.task) {
      const t = v.tasks.find(x => x.id === ui.task), st = subs[t.id];
      const accept = t.kind === 'video' ? 'video/*' : t.kind === 'photo' ? 'image/*' : 'image/*,video/*';
      return `${btn('← Alle opdrachten', 'back', '', 'secondary small')}${evidencePlayer()}<div class="card"><span class="eyebrow">Opdracht ${t.n} · ${t.points} punten · ${esc(t.category)}</span><h2>${esc(t.text)}</h2>${st ? `<p class="small">${CRAZY_STATUS[st.status][1]}${st.note ? ': ' + esc(st.note) : ''}</p>` : ''}</div>
      ${st && st.status !== 'rejected' ? '<p class="done">Jullie bewijs is binnen.</p>' : pendingLocal.has(t.id) ? '<p class="done">Bewijs staat klaar en wordt verstuurd zodra er wifi is.</p>' : `${evidenceMode() !== 'app' ? `<section class="panel"><h3>Via WhatsApp ingeleverd?</h3><p>Zet bij je foto of video in de groepschat de meldcode <b class="wa-code">${esc(waCode(view.me.team, t.n))}</b> en meld je inzending daarna hier aan.</p><label class="field"><span>Extra toelichting (optioneel)</span><textarea data-draft="ctext" maxlength="1500"></textarea></label>${btn('Bewijs via WhatsApp aanmelden', 'cwhatsapp', '', 'big')}</section>` : ''}${evidenceMode() !== 'whatsapp' ? `<section class="panel"><h2>Bewijs</h2><label class="field"><span>${t.kind === 'text' ? 'Jullie antwoord' : 'Toelichting (optioneel)'}</span><textarea data-draft="ctext" maxlength="1500"></textarea></label>${`<label class="field"><span>${t.kind === 'video' ? 'Video (kort, onder 30 seconden)' : 'Foto'}${t.kind === 'text' ? ' (optioneel)' : ''}</span><input type="file" id="cfile" accept="${accept}" ${t.kind !== 'text' ? 'capture="environment"' : ''}></label>`}${btn('Bewijs versturen', 'csubmit', '', 'big')}</section>` : ''}`}`;
    }
    const filter = ui.filter || 'open';
    const list = v.tasks.filter(t => filter === 'all' ? true : filter === 'open' ? !subs[t.id] || subs[t.id].status === 'rejected' : subs[t.id] && subs[t.id].status !== 'rejected' || pendingLocal.has(t.id));
    return `${evidencePlayer()}<p>Nog ${timer(v.ends_at)} · <b>${mine?.score || 0} punten</b> · ${mine?.done || 0} goedgekeurd</p><div class="chips">${[['open', 'Nog te doen'], ['sent', 'Ingestuurd'], ['all', 'Alle 88']].map(([k, l]) => btn(l, 'filter', `data-f="${k}"`, 'secondary small ' + (filter === k ? 'chosen' : ''))).join('')}</div>
    <div class="tasklist">${list.map(t => { const st = subs[t.id]; const cls = st ? CRAZY_STATUS[st.status][0] : pendingLocal.has(t.id) ? 'wait' : ''; return `<button data-a="open" data-id="${t.id}" class="${cls}"><b>${t.n}</b><span>${esc(t.text)}</span><span class="tag">${t.kind === 'video' ? '🎬' : t.kind === 'photo' ? '📷' : '✎'} ${t.points}</span></button>`; }).join('')}</div>`;
  },
  click(a, el, d) {
    if (role === 'host') {
      const crazyFilters = () => ({where: drafts.f_where || view.filters?.where || 'overal', needs: drafts.f_needs || view.filters?.needs || 'alles', max_minutes: +(drafts.f_max || view.filters?.max_minutes || 10), age: +(drafts.f_age || view.filters?.age || 12)});
      const ev = () => ({evidence_mode: drafts.evidence_mode ?? evidenceMode(), evidence_link: drafts.evidence_link ?? evidenceLink()});
      if (a === 'evidence_save') return hostSend({action:'evidence',mode:ev().evidence_mode,link:ev().evidence_link}).then(ok=>{if(ok){delete drafts.evidence_mode;delete drafts.evidence_link;render(true);}});
      if (a === 'filters') return hostSend({action: 'settings', minutes: parseInt(drafts.minutes || view.settings.minutes, 10), filters: crazyFilters(), ...ev()});
      if (a === 'start') return hostSend({action: 'settings', minutes: parseInt(drafts.minutes || view.settings.minutes, 10), filters: crazyFilters(), ...ev()}).then(ok => ok && hostSend({action: 'start'}));
      if (a === 'add_team') { const n = drafts.newteam; drafts.newteam = ''; return hostSend({action: a, name: n || ''}); }
      if (a === 'grade') return hostSend({action: a, id: d.id, approve: d.ok === '1', points: parseInt(d.p || '0', 10), wall: true});
      if (a === 'bonus') return hostSend({action: a, team: d.team, points: parseInt(d.p, 10)});
      return hostSend({action: a});
    }
    if (a === 'filter') { ui.filter = d.f; return render(true); }
    if (a === 'open') { ui.task = d.id; drafts.ctext = ''; window.scrollTo(0, 0); return render(true); }
    if (a === 'back') { ui.task = null; return render(true); }
    if (a === 'csubmit') return crazySubmit();
    if (a === 'cwhatsapp') { if (queue.some(q=>q.action==='submit'&&q.task===ui.task)) return notice('Deze opdracht wacht al op verwerking.'); if (!['whatsapp','both'].includes(evidenceMode())) return notice('WhatsApp is niet ingeschakeld.'); return playerSend({action:'submit',sid:uuid(),task:ui.task,text:(drafts.ctext||'').trim(),via_whatsapp:true}).then(()=>{ui.task=null;drafts.ctext='';render(true);}); }
  },
};
async function crazySubmit() {
  const t = view.tasks.find(x => x.id === ui.task); const text = (drafts.ctext || '').trim(); const file = $('#cfile')?.files?.[0];
  if (!file && !text) return notice('Schrijf jullie antwoord of voeg een foto of video toe.');
  if (file && file.size > 40 * 1024 * 1024) return notice('Deze video is te groot (max 40 MB). Neem een kortere op.');
  const sid = uuid();
  if (file) {
    const blob = await resizeImage(file);
    try { await DB.put({sid, gid, task: t.id, text, blob, type: blob.type || file.type, ts: Date.now()}); }
    catch { return notice('Kon het bestand niet bewaren op deze telefoon.'); }
    notice('Bewijs opgeslagen. Het wordt verstuurd zodra er wifi is.'); ui.task = null; await flushMedia(); render(true); refresh();
  } else {
    ui.task = null; drafts.ctext = '';
    await playerSend({action: 'submit', sid, task: t.id, text});
  }
}

/* ========================================================== SMOKKELTOCHT */
function fnv(text) { let h = 2166136261; for (const b of new TextEncoder().encode(text)) { h ^= b; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, '0'); }
function smLocal() { if (!ui.sm || !queue.length) { ui.sm = JSON.parse(JSON.stringify(view.me.runner)); ui.smStock = {...(view.me.stock || {})}; } return ui.sm; }
function smPost(code) { return view.me.post_hashes[fnv(view.me.salt + String(code || '').trim())] || null; }
function smokkelApply(a) {
  const r = smLocal(), G = view.goods;
  if (a.action === 'load') { r.status = 'free'; a.goods.forEach(g => { r.cargo.push({good: g, visited: []}); if (ui.smStock[g] > 0) ui.smStock[g] -= 1; }); }
  if (a.action === 'visit') r.cargo.forEach(c => { const via = G[c.good].via; if (c.visited.length < via.length && via[c.visited.length] === a._post) c.visited.push(a._post); });
  if (a.action === 'deliver') r.cargo = r.cargo.filter(c => JSON.stringify(c.visited) !== JSON.stringify(G[c.good].via));
  if (a.action === 'inspect' && a._caught) { r.cargo = r.cargo.filter(c => G[c.good].legal); r.status = 'caught'; }
}
GAMES.smokkel = {
  lobbyText: 'Smokkelteams brengen lading langs posten naar de markt; de douane probeert ze te betrappen. Ongeveer één op de vijf spelers is douanier.',
  settings() { return `<label class="field"><span>Speelduur</span>${sel('minutes', [45, 60, 75, 90, 120].map(m => [m, m + ' minuten']), drafts.minutes || view.settings.minutes)}</label>${btn('Extra smokkelteam', 'add_team', '', 'secondary small')}`; },
  startButtons() { return btn('Posten klaarmaken →', 'start', view.players.length < 3 ? 'disabled' : ''); },
  scores() { return scoreCards(view.teams.map(t => [t.name, view.scores?.[t.id] || 0])); },
  postSigns() { const v = view; return `<div class="grid2">${Object.entries(v.posts).map(([k, code]) => `<div class="card center printcard"><span class="eyebrow">Smokkeltocht · post</span><h2>${esc(v.posts_names[k])}</h2><div class="huge">${code}</div><p class="small">Tik deze code in op je telefoon.</p></div>`).join('')}</div>`; },
  host() {
    const v = view, ph = v.phase;
    if (ph === 'setup') return `<div class="eyebrow">Voorbereiding</div><h1>Hang de postbordjes op</h1><p class="lead">Print de bordjes en hang ze bij de vier posten. Douaniers zien hun pincode op hun eigen telefoon.</p><div class="actions">${btn('Postbordjes printen', 'print', '', 'secondary')}${btn('Start de smokkeltocht →', 'go')}</div>${this.postSigns()}`;
    const goods = `<ul class="list">${Object.values(v.goods).map(g => `<li><b>${esc(g.name)}</b> · gewicht ${g.weight} · ${g.value} punten · ${g.legal ? 'legaal' : 'verboden'}${g.via.length ? ' · via ' + g.via.map(p => esc(v.posts_names[p])).join(' en ') : ' · rechtstreeks'}</li>`).join('')}</ul>`;
    if (ph === 'end') return `<div class="eyebrow">Uitslag</div><h1>Einde smokkeltocht</h1>${this.scores()}<h2>Verloop</h2>${logList()}<div class="actions">${btn('Nieuw spel', 'reset', 'data-confirm="Alles wissen en opnieuw beginnen?"', 'secondary')}</div>`;
    return `<div class="cols"><div><div class="eyebrow">De smokkeltocht loopt</div><h1>Nog ${timer(v.ends_at)}</h1>${this.scores()}<div class="actions">${btn('+10 min', 'extend', '', 'secondary')}${btn('Einde · uitslag', 'finish', 'data-confirm="Het spel nu beëindigen?"')}</div><h2>Gebeurtenissen</h2>${logList()}</div>
    <aside><section class="panel"><h2>Voorraad per team</h2>${Object.entries(v.stock || {}).map(([t, st]) => `<p><b>${esc(teamName(t))}</b>: ${Object.entries(st).map(([g, n]) => `${esc(v.goods[g].name)} ${n}`).join(' · ')}</p>`).join('')}</section><section class="panel"><h2>Waren</h2>${goods}</section><section class="panel"><h2>Postcodes</h2>${Object.entries(v.posts || {}).map(([k, c]) => `<p>${esc(v.posts_names[k])}: <b>${c}</b></p>`).join('')}${btn('Bordjes printen', 'print', '', 'secondary small')}</section>
    <section class="panel"><h2>Correctie</h2>${v.teams.map(t => `<p>${esc(t.name)} ${btn('+1', 'adjust', `data-team="${t.id}" data-p="1"`, 'secondary small')} ${btn('−1', 'adjust', `data-team="${t.id}" data-p="-1"`, 'secondary small')}</p>`).join('')}</section></aside></div>`;
  },
  screen() {
    const v = view;
    if (v.phase === 'setup') return `<div class="stage"><div class="eyebrow">Smokkeltocht</div><h1>Zo meteen begint de tocht</h1><p class="lead">Smokkelaars: laden in de haven, langs de molen en de toren, afleveren op de markt. Douane: tik ze en typ je pincode op hun telefoon.</p></div>`;
    return `<div class="stage" style="justify-content:flex-start"><div class="eyebrow">Smokkeltocht</div><h1>${v.phase === 'end' ? 'Einde!' : timer(v.ends_at)}</h1>${this.scores()}<ul class="list" style="max-width:1000px;margin:0 auto;text-align:left">${[...v.log].reverse().slice(0, 8).map(l => `<li>${esc(l.text)}</li>`).join('')}</ul></div>`;
  },
  phone() {
    const v = view, me = v.me;
    if (v.phase === 'setup' && !me.douane && !me.runner) return '<p class="lead">Wacht op de start.</p>';
    if (me.douane) return `<div class="eyebrow">Douane</div><h1>Jouw pincode</h1><div class="huge" style="letter-spacing:10px">${esc(me.pin)}</div><p class="lead">Tik een smokkelaar, vraag zijn telefoon en typ deze pincode bij 'Controle'. Laat je pincode verder aan niemand zien.</p><p>Betrappingen: <b>${me.catches}</b></p>${this.scores()}<p><button class="secondary" data-ui="uitleg">Spelregels</button></p>`;
    if (!me.runner) return '<p class="lead">Wacht op de start.</p>';
    const r = smLocal(), G = v.goods;
    const weight = r.cargo.reduce((s, c) => s + G[c.good].weight, 0);
    let html = v.phase === 'play' ? `<p>Nog ${timer(v.ends_at)}</p>` : v.phase === 'end' ? `<h1>Einde</h1>${this.scores()}` : '<p class="lead">Ga naar de haven. Zo meteen begint de tocht.</p>';
    html += r.status === 'caught' ? `<div class="card" style="border-color:var(--bad)"><h2 style="color:var(--bad)">Gepakt!</h2><p>Ga terug naar de haven en tik daar de postcode in.</p></div>` : '';
    html += `<div class="card"><span class="eyebrow">Jouw lading · gewicht ${weight}/${v.capacity}</span><div class="cargo">${r.cargo.map(c => { const via = G[c.good].via; const next = via[c.visited.length]; return `<span>${esc(G[c.good].name)} · ${next ? 'nog langs ' + esc(v.posts_names[next]) : 'klaar voor de markt'}</span>`; }).join('') || '<span>Leeg</span>'}</div><p class="small">Voorraad team: ${Object.entries(ui.smStock || me.stock || {}).map(([g, n]) => `${esc(G[g].name)} ${n}`).join(' · ')}</p></div>`;
    if (v.phase !== 'play') return html;
    const post = smPost(drafts.post);
    html += `<section class="panel"><h2>Bij een post</h2><label class="field"><span>Code van het bordje</span><input data-draft="post" inputmode="numeric" maxlength="4" autocomplete="off" style="font-size:26px;letter-spacing:6px"></label>`;
    if (post === 'haven') html += `<p>Je bent in <b>de haven</b>. Kies wat je meeneemt (max. gewicht ${v.capacity}):</p><div class="chips">${Object.entries(G).map(([g, x]) => btn(`${esc(x.name)} (${x.weight})`, 'pickgood', `data-g="${g}"`, 'secondary small')).join('')}</div><p>Gekozen: ${(ui.load || []).map(g => esc(G[g].name)).join(', ') || 'niets'} ${ui.load?.length ? btn('Wissen', 'clearload', '', 'secondary small') : ''}</p>${btn(ui.load?.length ? 'Laden' : 'Melden in de haven', 'load', '', 'big')}`;
    else if (post === 'midden' || post === 'toren') html += `<p>Je bent bij <b>${esc(v.posts_names[post])}</b>.</p>${btn('Post bezocht', 'visit', '', 'big')}`;
    else if (post === 'markt') html += `<p>Je bent op <b>de markt</b>.</p>${btn('Afleveren', 'deliver', '', 'big good')}`;
    else if ((drafts.post || '').length === 4) html += '<p style="color:var(--bad)">Onbekende code. Kijk goed op het bordje.</p>';
    html += `</section><section class="panel"><h2>Controle door de douane</h2><p class="small">Geef je telefoon aan de douanier. Die typt zijn pincode.</p><label class="field"><span>Douanepincode</span><input data-draft="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label>${btn('Controle uitvoeren', 'inspect', '', 'danger')}</section>`;
    if (ui.result) html += `<div class="card center"><h2>${esc(ui.result)}</h2></div>`;
    html += `<details><summary class="small">Waren en routes</summary><ul>${Object.values(G).map(g => `<li>${esc(g.name)}: gewicht ${g.weight}, ${g.value} punten, ${g.legal ? 'legaal' : 'verboden'}${g.via.length ? ', via ' + g.via.map(p => esc(v.posts_names[p])).join(' en ') : ''}</li>`).join('')}</ul></details><p><button class="secondary" data-ui="uitleg">Spelregels</button></p>`;
    return html;
  },
  changed() {},
  click(a, el, d) {
    if (role === 'host') {
      if (a === 'start') return hostSend({action: 'settings', minutes: parseInt(drafts.minutes || view.settings.minutes, 10)}).then(() => hostSend({action: 'start'}));
      if (a === 'adjust') return hostSend({action: a, team: d.team, points: parseInt(d.p, 10)});
      return hostSend({action: a});
    }
    const v = view, G = v.goods, r = smLocal(), post = smPost(drafts.post);
    const code = (drafts.post || '').trim();
    if (a === 'pickgood') { const cur = ui.load || []; const w = r.cargo.reduce((s, c) => s + G[c.good].weight, 0) + cur.reduce((s, g) => s + G[g].weight, 0) + G[d.g].weight; if (w > v.capacity) return notice('Te zwaar: je kunt maximaal gewicht ' + v.capacity + ' dragen.'); if ((ui.smStock?.[d.g] ?? 0) - cur.filter(g => g === d.g).length <= 0) return notice('Jullie voorraad ' + G[d.g].name.toLowerCase() + ' is op.'); ui.load = [...cur, d.g]; return render(true); }
    if (a === 'clearload') { ui.load = []; return render(true); }
    if (a === 'load') { if (post !== 'haven') return; const goods = ui.load || []; ui.load = []; ui.result = goods.length ? 'Geladen: ' + goods.map(g => G[g].name).join(', ') : 'Gemeld in de haven.'; drafts.post = ''; return playerSend({action: 'load', post: code, goods}); }
    if (a === 'visit') { drafts.post = ''; ui.result = 'Post bezocht.'; return playerSend({action: 'visit', post: code, _post: post}); }
    if (a === 'deliver') {
      const done = r.cargo.filter(c => JSON.stringify(c.visited) === JSON.stringify(G[c.good].via));
      if (!done.length) return notice('Geen lading die al klaar is om af te leveren. Heb je alle tussenposten bezocht?');
      ui.result = `Afgeleverd: +${done.reduce((s, c) => s + G[c.good].value, 0)} punten`; drafts.post = '';
      return playerSend({action: 'deliver', post: code});
    }
    if (a === 'inspect') {
      const pin = (drafts.pin || '').trim(); drafts.pin = '';
      if (!v.me.pin_hashes.includes(fnv(v.me.salt + pin))) return notice('Onbekende douanepincode.');
      if (r.status === 'caught') return notice('Je bent al gepakt. Ga eerst terug naar de haven.');
      const bad = r.cargo.filter(c => !G[c.good].legal);
      ui.result = bad.length ? `Betrapt! In beslag: ${bad.map(c => G[c.good].name).join(', ')}. Terug naar de haven.` : 'Vals alarm! Niets verbodens gevonden: jouw team +1.';
      return playerSend({action: 'inspect', pin, _caught: bad.length > 0});
    }
  },
};

/* ======================================================== GEHEIME MISSIES */
const MIN_LABEL = m => m >= 1440 ? (m / 1440) + (m === 1440 ? ' dag' : ' dagen') : m >= 60 ? (m / 60) + ' uur' : m + ' min';
GAMES.missies = {
  lobbyText: 'Iedereen krijgt een geheime opdracht op de eigen telefoon. Is hij gelukt, dan bevestigt het "slachtoffer" dat op zijn telefoon. Denk je dat iemand met een missie bezig is? Ontmasker hem!',
  settings() {
    const s = view.settings;
    return `<label class="field"><span>Speelduur</span>${sel('minutes', [60, 120, 180, 240, 480, 720, 1440, 2880].map(m => [m, MIN_LABEL(m)]), drafts.minutes || s.minutes)}</label>
    <label class="field"><span>Wie controleert een gelukte missie?</span>${sel('confirm', [['slachtoffer', 'Het slachtoffer op zijn eigen telefoon'], ['spelleider', 'Alleen de spelleider op deze pc']], drafts.confirm || s.confirm)}</label>
    <label class="field"><span>Moeilijkheid</span>${sel('levels', [['1,2,3', 'Alle missies'], ['1,2', 'Makkelijk en gemiddeld'], ['2,3', 'Gemiddeld en moeilijk'], ['1', 'Alleen makkelijk'], ['3', 'Alleen moeilijk']], drafts.levels || s.levels.join(','))}</label>
    <label class="field"><span>Waar speelt het zich af?</span>${sel('where', [['overal', 'Binnen én buiten'], ['binnen', 'Vooral binnen'], ['buiten', 'Vooral buiten (wandeling, uitje)']], drafts.where || s.where || 'overal')}</label>`;
  },
  startButtons() { return btn('Deel de missies uit →', 'start', view.players.length < 3 ? 'disabled' : '') + (view.players.length < 3 ? '<p class="small">Minimaal drie spelers.</p>' : ''); },
  board(limit = 99) { return `<ol class="list">${view.ranking.slice(0, limit).map(r => `<li><b>${esc(r.name)}</b> · ${r.score} ${r.score === 1 ? 'punt' : 'punten'} · ${r.done} gelukt</li>`).join('')}</ol>`; },
  doneList(n = 12) { return `<ul class="list">${[...view.done].reverse().slice(0, n).map(d => `<li>${d.busted ? `🔎 <b>${esc(d.by)}</b> ontmaskerde <b>${esc(d.name)}</b>` : `✅ <b>${esc(d.name)}</b>`}<br><span class="small">${esc(d.text)}</span></li>`).join('') || '<li class="small">Nog geen missies afgerond.</li>'}</ul>`; },
  host() {
    const v = view;
    if (v.phase === 'end') return `<div class="eyebrow">Uitslag</div><h1>${esc(v.ranking[0]?.name || '')} wint!</h1>${this.board()}<h2>Onthulde missies</h2>${this.doneList(40)}${v.unfinished?.length ? `<h2>Niet gelukt</h2><ul class="list">${v.unfinished.map(u => `<li><b>${esc(u.name)}</b><br><span class="small">${esc(u.text)}</span></li>`).join('')}</ul>` : ''}<div class="actions">${btn('Nieuw spel', 'reset', 'data-confirm="Alles wissen en opnieuw beginnen?"', 'secondary')}</div>`;
    const claims = v.claims.map(c => `<div class="card"><span class="eyebrow">${esc(c.name)} · ${c.status === 'betwist' ? 'betwist door ' + esc(c.victim_name) : c.victim_name ? 'wacht op ' + esc(c.victim_name) : 'geen slachtoffer gekozen'}</span><p>${esc(c.text)}</p>${c.note ? `<p class="hint">${esc(c.note)}</p>` : ''}<div class="actions">${btn('Goedkeuren (+' + v.points[c.level] + ')', 'approve', `data-id="${c.id}"`, 'good')}${btn('Afkeuren', 'reject', `data-id="${c.id}"`, 'danger')}</div></div>`).join('');
    return `<div class="cols"><div><div class="eyebrow">Geheime missies lopen</div><h1>Nog ${timer(v.ends_at)}</h1><h2>Te beoordelen (${v.claims.length})</h2>${claims || '<p class="small">Niets te beoordelen. Meldingen verschijnen hier vanzelf.</p>'}<h2>Afgerond</h2>${this.doneList()}</div>
    <aside><section class="panel"><h2>Stand</h2><ul class="list">${v.ranking.map(r => `<li><b>${esc(r.name)}</b> · ${r.score} <span class="small">${{missie: 'met missie', wacht: 'wacht op nieuwe', gemeld: 'melding loopt'}[v.busy[r.id]] || ''}</span><br>${btn('+1', 'adjust', `data-id="${r.id}" data-p="1"`, 'secondary small')} ${btn('−1', 'adjust', `data-id="${r.id}" data-p="-1"`, 'secondary small')} ${btn('Nieuwe missie', 'swap', `data-id="${r.id}" data-confirm="Deze speler een andere missie geven?"`, 'secondary small')}</li>`).join('')}</ul>
    <div class="actions">${btn('+30 min', 'extend', '', 'secondary small')}${btn('Einde · onthulling', 'finish', 'data-confirm="Het spel beëindigen en alle missies onthullen?"', 'small')}</div></section><section class="panel"><h2>Verloop</h2>${logList()}</section></aside></div>`;
  },
  screen() {
    const v = view;
    return `<div class="stage" style="justify-content:flex-start"><div class="eyebrow">Geheime missies</div><h1>${v.phase === 'end' ? esc(v.ranking[0]?.name || '') + ' wint!' : timer(v.ends_at)}</h1><div class="cols" style="text-align:left"><div class="panel"><h2>Laatste onthullingen</h2>${this.doneList(8)}${v.phase === 'end' && v.unfinished?.length ? `<h2>Niet gelukt</h2><ul class="list">${v.unfinished.map(u => `<li><b>${esc(u.name)}</b><br><span class="small">${esc(u.text)}</span></li>`).join('')}</ul>` : ''}</div><div class="panel"><h2>Stand</h2>${this.board(10)}</div></div></div>`;
  },
  phone() {
    const v = view, me = v.me;
    if (v.phase === 'end') return `<h1>Afgelopen!</h1><p class="lead">Jij hebt ${me.score ?? 0} punten.</p>${this.board()}<h2>Onthulde missies</h2>${this.doneList(30)}`;
    if (v.phase !== 'play') return '<p class="lead">Wacht tot de spelleider de missies uitdeelt.</p>';
    const t = now();
    let html = `<p>Nog ${timer(v.ends_at)} · <b>${me.score} punten</b></p>`;
    html += me.confirm.map(c => `<div class="card" style="border-color:var(--accent)"><span class="eyebrow">Klopt dit?</span><p><b>${esc(c.from)}</b> zegt dat de missie bij jou is gelukt:</p><p class="lead">${esc(c.text)}</p>${c.note ? `<p class="small">${esc(c.note)}</p>` : ''}<div class="actions">${btn('Ja, klopt', 'confirm', `data-id="${c.id}" data-yes="1"`, 'good')}${btn('Nee', 'confirm', `data-id="${c.id}" data-yes="0"`, 'danger')}</div></div>`).join('');
    html += me.pending.map(p => `<div class="card"><span class="eyebrow">${p.status === 'betwist' ? 'De spelleider beslist' : 'Wacht op bevestiging'}</span><p>${esc(p.text)}</p></div>`).join('');
    if (me.mission) {
      html += `<div class="card secret cover" data-a="toggle_secret">${ui.show ? `<span class="eyebrow">Jouw geheime missie · ${me.mission.points} punten</span><h2>${esc(me.mission.text)}</h2><p class="small">Tik om te verbergen.</p>` : '<p class="center">Jouw missie is verborgen. Tik om hem te lezen; zorg dat niemand meekijkt.</p>'}</div>`;
      if (ui.claim) html += `<section class="panel"><h2>Missie gelukt!</h2><label class="field"><span>Bij wie is het gelukt?</span>${sel('victim', [['', 'Niemand in het bijzonder / meerdere mensen'], ...v.players.filter(p => p.id !== me.id).map(p => [p.id, p.name])], drafts.victim || '')}</label><label class="field"><span>Korte toelichting (optioneel)</span><input data-draft="note" maxlength="200"></label><div class="actions">${btn('Melden', 'claim', '', 'good')}${btn('Annuleren', 'claim_cancel', '', 'secondary')}</div><p class="small">${v.settings.confirm === 'slachtoffer' ? 'De gekozen persoon krijgt de vraag of het klopt. Kies je niemand, dan beslist de spelleider.' : 'De spelleider beoordeelt je melding.'}</p></section>`;
      else html += `<div class="actions">${btn('Missie gelukt!', 'claim_open', '', 'big good')}</div>${me.skips_left ? `<p>${btn(`Andere missie (nog ${me.skips_left}×)`, 'skip', 'data-confirm="Deze missie inruilen voor een andere?"', 'secondary small')}</p>` : ''}`;
    } else if (me.blocked_until) html += `<div class="card"><h2>Je bent ontmaskerd!</h2><p>Over ${timer(me.blocked_until)} krijg je een nieuwe missie.</p></div>`;
    else if (!me.pending.length) html += '<p class="lead">Even geduld, je krijgt zo een nieuwe missie.</p>';
    html += `<section class="panel"><h2>Iemand ontmaskeren</h2>`;
    if (me.cooldown_until > t) html += `<p>Na een valse beschuldiging moet je even wachten: nog ${timer(me.cooldown_until)}.</p>`;
    else if (!me.targets.length) html += '<p class="small">Niemand heeft op dit moment een missie.</p>';
    else {
      const target = me.targets.find(x => x.id === drafts.target);
      html += `<label class="field"><span>Wie is er stiekem bezig?</span>${sel('target', [['', 'Kies een speler'], ...me.targets.map(x => [x.id, x.name])], drafts.target || '')}</label>`;
      if (target) html += `<p class="small">Welke missie heeft ${esc(target.name)}? Goed: +2 en de missie mislukt. Fout: −1 en tien minuten wachten.</p><div class="pick">${target.options.map(o => `<button type="button" data-a="unmask" data-target="${target.id}" data-guess="${o.id}" data-confirm="Weet je het zeker?">${esc(o.text)}</button>`).join('')}</div>`;
    }
    html += `</section><details><summary class="small">Stand</summary>${this.board()}</details>`;
    return html;
  },
  click(a, el, d) {
    if (role === 'host') {
      if (a === 'start') return hostSend({action: 'settings', minutes: parseInt(drafts.minutes || view.settings.minutes, 10), confirm: drafts.confirm || view.settings.confirm, levels: String(drafts.levels || view.settings.levels.join(',')).split(',').map(Number), where: drafts.where || view.settings.where || 'overal'}).then(() => hostSend({action: 'start'}));
      if (a === 'approve' || a === 'reject' || a === 'swap') return hostSend({action: a, id: d.id});
      if (a === 'adjust') return hostSend({action: a, id: d.id, points: parseInt(d.p, 10)});
      return hostSend({action: a});
    }
    if (a === 'toggle_secret') { ui.show = !ui.show; return render(true); }
    if (a === 'claim_open') { ui.claim = true; ui.show = false; return render(true); }
    if (a === 'claim_cancel') { ui.claim = false; return render(true); }
    if (a === 'claim') { ui.claim = false; const victim = drafts.victim || null, note = drafts.note || ''; drafts.victim = ''; drafts.note = ''; return playerSend({action: 'claim', victim, note}); }
    if (a === 'confirm') return playerSend({action: 'confirm', claim: d.id, yes: d.yes === '1'});
    if (a === 'unmask') { drafts.target = ''; return playerSend({action: 'unmask', target: d.target, guess: d.guess}); }
    if (a === 'skip') { ui.show = false; return playerSend({action: 'skip'}); }
  },
};

/* ============================================================== OPGEJAAGD */
const HUNT_STATUS = {vrij: 'vrij', gevangen: 'gevangen', ontsnapt: 'ontsnapt'};
function huntPingText(p) {
  const when = new Date(p.at * 1000).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'});
  if (p.kind === 'gps') return `${when} · <a href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}" target="_blank" rel="noopener">locatie op de kaart ↗</a> <span class="small">(±${p.acc} m)</span>`;
  return `${when} · ${p.checkin ? 'meldde zich bij' : 'laatst gezien bij'} <b>${esc(p.post)}</b>`;
}
function huntTeams() {
  const v = view;
  return `<div class="score-row">${v.teams.map(t => { const members = v.players.filter(p => p.team === t.id); const hunter = t.id === v.hunters;
    return `<div class="score-card">${esc(t.name)}<b>${v.scores?.[t.id] ?? 0}</b><small class="small">${hunter ? members.length + (members.length === 1 ? ' jager' : ' jagers') : members.map(p => `${esc(p.name)} · ${HUNT_STATUS[v.status[p.id]] || '–'}`).join('<br>')}${hunter ? '' : `<br>posten ${v.progress[t.id] || 0}/3`}</small></div>`; }).join('')}</div>`;
}
let huntWatch = null, huntSent = 0;
function huntGps() {
  const me = view?.me;
  const want = role === 'player' && me?.fugitive && me.share && view.phase === 'play' && window.isSecureContext && navigator.geolocation && view.status?.[me.id] === 'vrij';
  if (!want) { if (huntWatch != null) { navigator.geolocation.clearWatch(huntWatch); huntWatch = null; } return; }
  if (huntWatch != null) return;
  huntWatch = navigator.geolocation.watchPosition(pos => {
    const was = ui.areaWarn; areaCheck(pos); if (was !== ui.areaWarn) render(true);
    if (Date.now() - huntSent < 45000 || !online) return; huntSent = Date.now();
    api(A('player'), {action: 'locate', lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.min(99999, pos.coords.accuracy || 0)}, key).catch(() => {});
  }, () => notice('Locatie niet beschikbaar. Controleer de toestemming in je browser.'), {enableHighAccuracy: true, maximumAge: 30000, timeout: 30000});
}
GAMES.opgejaagd = {
  lobbyText: 'De jagers proberen de vluchtteams te tikken. Vluchters lopen langs drie posten en ontsnappen op het eind via het extractiepunt. Op vaste momenten krijgen de jagers een ping met de laatst bekende plek.',
  settings() {
    const s = view.settings, names = drafts.posts ? drafts.posts.split('|') : s.post_names;
    return `<div class="grid2"><label class="field"><span>Speelduur</span>${sel('minutes', [45, 60, 90, 120, 150, 180].map(m => [m, MIN_LABEL(m)]), drafts.minutes || s.minutes)}</label><label class="field"><span>Ping voor de jagers</span>${sel('ping', [5, 10, 15, 20].map(m => [m, 'elke ' + m + ' min']), drafts.ping || s.ping_minutes)}</label></div>
    <label class="field"><span>Extractie gaat open</span>${sel('extract', [10, 15, 20, 30].map(m => [m, m + ' min voor het einde']), drafts.extract || s.extract_minutes)}</label>
    ${[0, 1, 2].map(i => `<label class="field"><span>Post ${i + 1}</span><input data-draft="post${i}" maxlength="60" value="${esc(drafts['post' + i] ?? names[i])}"></label>`).join('')}
    <label class="field"><span>Extractiepunt (zien vluchters pas aan het eind)</span><input data-draft="exname" maxlength="80" value="${esc(drafts.exname ?? s.extract_name)}"></label>${btn('Vluchtteam toevoegen', 'add_team', '', 'secondary small')}`;
  },
  startButtons() { return btn('Codes en bordjes maken →', 'start', view.players.length < 2 ? 'disabled' : ''); },
  host() {
    const v = view, ph = v.phase, names = v.settings.post_names;
    const codes = v.codes ? `<section class="panel"><h2>Bordjes</h2>${names.map((n, i) => `<p>${esc(n)}: <b>${v.codes['p' + (i + 1)]}</b></p>`).join('')}<p>${esc(v.settings.extract_name)} (extractie): <b>${v.codes.ex}</b></p>${btn('Bordjes printen', 'print', '', 'secondary small')}</section>` : '';
    const prints = v.codes ? `<div class="grid2">${[...names.map((n, i) => [n, v.codes['p' + (i + 1)]]), [v.settings.extract_name + ' · extractie', v.codes.ex]].map(([n, c]) => `<div class="card center printcard"><span class="eyebrow">Opgejaagd · post</span><h2>${esc(n)}</h2><div class="huge">${c}</div><p class="small">Tik deze code in op je telefoon.</p></div>`).join('')}</div>` : '';
    if (ph === 'setup') return `<div class="eyebrow">Voorbereiding</div><h1>Hang de bordjes op</h1><p class="lead noprint">Print de bordjes en hang ze bij de posten. Het extractiebordje hang je op het extractiepunt; de vluchters horen pas aan het eind waar dat is. Iedere vluchter ziet zijn eigen vangcode op de telefoon.</p><div class="actions noprint">${btn('Bordjes printen', 'print', '', 'secondary')}${btn('Start de jacht →', 'go', '', 'big')}</div>${prints}`;
    if (ph === 'end') return `<div class="eyebrow">Uitslag</div><h1>Einde van de jacht</h1>${huntTeams()}<h2>Verloop</h2>${logList()}<div class="actions">${btn('Nieuw spel', 'reset', 'data-confirm="Alles wissen en opnieuw beginnen?"', 'secondary')}</div>`;
    const pings = [...(v.pings || [])].reverse().slice(0, 15).map(p => `<li><b>${esc(teamName(p.team))}</b> · ${huntPingText(p)}</li>`).join('');
    const caught = v.players.filter(p => v.status[p.id] === 'gevangen');
    return `<div class="cols"><div><div class="eyebrow">De jacht loopt</div><h1>Nog ${timer(v.ends_at)}</h1><p>Volgende ping over ${timer(v.next_ping)} · extractie ${v.extract_open ? '<b>is open</b>' : 'over ' + timer(v.extract_at)}</p>${huntTeams()}
      <div class="actions">${btn('Nu pingen', 'ping_now', '', 'secondary small')}${btn('+10 min', 'extend', '', 'secondary small')}${btn('Einde', 'finish', 'data-confirm="De jacht nu beëindigen?"', 'small')}</div>
      <h2>Pings</h2><ul class="list">${pings || '<li class="small">Nog geen pings.</li>'}</ul><h2>Verloop</h2>${logList()}</div>
      <aside><section class="panel"><h2>Melding sturen</h2><label class="field"><span>Aan</span>${sel('to', [['jagers', 'Jagers'], ['vluchters', 'Vluchters'], ['iedereen', 'Iedereen']], drafts.to || 'jagers')}</label><label class="field"><span>Tekst</span><input data-draft="msg" maxlength="200"></label>${btn('Versturen', 'message', '', 'secondary small')}</section>
      ${codes}${caught.length ? `<section class="panel"><h2>Gevangen</h2>${caught.map(p => `<p>${esc(p.name)} ${btn('Vrijlaten', 'release', `data-id="${p.id}" data-confirm="Deze vangst terugdraaien?"`, 'secondary small')}</p>`).join('')}</section>` : ''}
      <section class="panel"><h2>Vangcodes</h2><p class="small">Alleen voor noodgevallen, bijvoorbeeld een lege telefoon.</p>${Object.entries(v.capture || {}).map(([pid, c]) => `<p>${esc(playerName(pid))}: <b>${c}</b></p>`).join('')}</section></aside></div>`;
  },
  screen() {
    const v = view;
    if (v.phase === 'setup') return `<div class="stage"><div class="eyebrow">Opgejaagd</div><h1>Zo meteen begint de jacht</h1><p class="lead">Vluchters: langs ${v.settings.post_names.map(esc).join(', ')} en daarna naar het extractiepunt. Jagers: tik ze en typ hun vangcode in.</p></div>`;
    return `<div class="stage" style="justify-content:flex-start"><div class="eyebrow">Opgejaagd</div><h1>${v.phase === 'end' ? 'Einde!' : timer(v.ends_at)}</h1>${v.phase === 'play' ? `<p class="lead">Volgende ping: ${timer(v.next_ping)}${v.extract_open ? ' · de extractie is open!' : ''}</p>` : ''}${huntTeams()}<ul class="list" style="max-width:1000px;margin:0 auto;text-align:left">${[...v.log].reverse().slice(0, 7).map(l => `<li>${esc(l.text)}</li>`).join('')}</ul></div>`;
  },
  phone() {
    const v = view, me = v.me;
    if (v.phase === 'lobby') return '<p class="lead">Wacht op de start.</p>';
    const notices = (me.notices || []).slice().reverse().map(n => `<div class="hint">📣 ${esc(n.text)}</div>`).join('');
    if (me.hunter) {
      if (v.phase === 'end') return `<h1>Einde</h1>${huntTeams()}`;
      const latest = {}; (me.pings || []).forEach(p => latest[p.team] = p);
      const typed = (drafts.vang || '').trim().toUpperCase(), who = typed.length === 4 ? me.capture_hashes[fnv(me.salt + typed)] : null;
      return `<div class="eyebrow">Jager</div>${v.phase === 'play' ? `<p>Nog ${timer(v.ends_at)} · volgende ping over ${timer(v.next_ping)}</p>` : '<p class="lead">Zo meteen begint de jacht.</p>'}${notices}
      <section class="panel"><h2>Iemand getikt?</h2><p class="small">Vraag de vluchter om zijn vangcode en typ hem hier in. Dit werkt ook zonder wifi.</p><label class="field"><span>Vangcode</span><input data-draft="vang" maxlength="4" autocapitalize="characters" autocomplete="off" style="font-size:26px;letter-spacing:6px;text-transform:uppercase"></label>${typed.length === 4 ? (who ? `<p>Dat is <b>${esc(playerName(who))}</b>${v.status[who] !== 'vrij' ? ' (al ' + HUNT_STATUS[v.status[who]] + ')' : ''}.</p>` : '<p style="color:var(--bad)">Onbekende code.</p>') : ''}${btn('Gevangen!', 'capture', who && v.status[who] === 'vrij' && v.phase === 'play' ? '' : 'disabled', 'big danger')}</section>
      <section class="panel"><h2>Laatste pings</h2><ul class="list">${v.teams.filter(t => t.id !== v.hunters).map(t => `<li><b>${esc(t.name)}</b> · ${latest[t.id] ? huntPingText(latest[t.id]) : '<span class="small">nog geen ping</span>'}</li>`).join('')}</ul></section>${huntTeams()}<p><button class="secondary" data-ui="uitleg">Spelregels</button></p>`;
    }
    if (!me.fugitive) return '<p class="lead">Wacht op de start.</p>';
    const st = v.status[me.id];
    let html = v.phase === 'play' ? `<p>Nog ${timer(v.ends_at)} · volgende ping over ${timer(v.next_ping)}</p>` : v.phase === 'end' ? `<h1>Einde</h1>${huntTeams()}` : '<p class="lead">Zo meteen begint de jacht. Lees je vangcode en zet je locatie aan als je dat wilt.</p>';
    html += notices;
    if (st === 'gevangen') return html + '<div class="card" style="border-color:var(--bad)"><h2 style="color:var(--bad)">Je bent gevangen</h2><p>Ga terug naar de spelleider. Je team kan nog doorspelen.</p></div>';
    if (st === 'ontsnapt') return html + '<div class="card" style="border-color:var(--good)"><h2 style="color:var(--good)">Ontsnapt!</h2><p>Je bent veilig. Goed gedaan.</p></div>';
    html += `<div class="card center"><span class="eyebrow">Jouw vangcode · laat zien als je getikt wordt</span><div class="huge" style="letter-spacing:10px">${esc(me.capture)}</div></div>`;
    const prog = me.team_progress.length;
    html += `<div class="card"><span class="eyebrow">Jullie route · ${prog}/3 posten</span><p class="lead">${me.next_post ? 'Volgende post: <b>' + esc(me.next_post) + '</b>' : me.extract_name ? 'Snel naar de extractie: <b>' + esc(me.extract_name) + '</b>' : 'Alle posten gehaald. Wacht tot de extractie opengaat (over ' + timer(v.extract_at) + ').'}</p>${me.own_pings.length ? `<p class="small">Dit weten de jagers van jullie: ${huntPingText(me.own_pings.at(-1))}</p>` : ''}</div>`;
    if (v.phase === 'play') {
      const typed = (drafts.post || '').trim(), key2 = typed.length === 4 ? me.post_hashes[fnv(me.salt + typed)] : null;
      html += `<section class="panel"><h2>Bij een post of de extractie</h2><label class="field"><span>Code van het bordje</span><input data-draft="post" inputmode="numeric" maxlength="4" autocomplete="off" style="font-size:26px;letter-spacing:6px"></label>${typed.length === 4 && !key2 ? '<p style="color:var(--bad)">Onbekende code.</p>' : ''}${btn(key2 === 'ex' ? 'Extractie!' : 'Melden', 'checkin', key2 ? '' : 'disabled', 'big good')}<p class="small">Let op: bij melden weten de jagers meteen dat jullie hier waren.</p></section>`;
    }
    const secure = window.isSecureContext && 'geolocation' in navigator;
    html += `<section class="panel"><h2>Locatie delen</h2><p class="small">Alleen jagers en spelleider zien je laatst bekende plek, en alleen op de pingmomenten. Uitzetten kan altijd. ${secure ? '' : 'Deze verbinding is niet beveiligd (geen https), dus je telefoon staat locatie delen hier niet toe. Dan ziet de jager alleen jullie laatste post.'}</p>${secure ? btn(me.share ? 'Locatie delen uitzetten' : 'Locatie delen aanzetten', 'share', `data-on="${me.share ? 0 : 1}"`, 'secondary') : ''}</section><p><button class="secondary" data-ui="uitleg">Spelregels</button></p>`;
    return html;
  },
  onView() { huntGps(); },
  click(a, el, d) {
    if (role === 'host') {
      if (a === 'start') { const names = [0, 1, 2].map(i => (drafts['post' + i] ?? view.settings.post_names[i]).trim()); return hostSend({action: 'settings', minutes: +(drafts.minutes || view.settings.minutes), ping_minutes: +(drafts.ping || view.settings.ping_minutes), extract_minutes: +(drafts.extract || view.settings.extract_minutes), post_names: names, extract_name: (drafts.exname ?? view.settings.extract_name).trim()}).then(() => hostSend({action: 'start'})); }
      if (a === 'message') { const text = drafts.msg || ''; drafts.msg = ''; return hostSend({action: a, to: drafts.to || 'jagers', text}); }
      if (a === 'release') return hostSend({action: a, id: d.id});
      return hostSend({action: a});
    }
    if (a === 'capture') { const code = (drafts.vang || '').trim().toUpperCase(); drafts.vang = ''; return playerSend({action: 'capture', code}); }
    if (a === 'checkin') { const code = (drafts.post || '').trim(); drafts.post = ''; return playerSend({action: 'checkin', code}); }
    if (a === 'share') {
      const on = d.on === '1';
      if (on && navigator.geolocation) navigator.geolocation.getCurrentPosition(() => {}, () => notice('Geef de browser toestemming voor je locatie.'));
      return api(A('player'), {action: 'share', on}, key).then(v => { view = v; afterView(); huntGps(); render(true); }).catch(e => notice(e.message));
    }
  },
};
function huntApply(a) {
  const me = view.me;
  if (a.action === 'capture' && me.hunter) { const pid = me.capture_hashes[fnv(me.salt + a.code)]; if (pid && view.status[pid] === 'vrij') { view.status[pid] = 'gevangen'; notice('Gevangen: ' + playerName(pid)); } }
  if (a.action === 'checkin' && me.fugitive) {
    const k = me.post_hashes[fnv(me.salt + a.code)];
    if (k === 'ex') { if (now() >= view.extract_at && me.team_progress.length >= 3) view.status[me.id] = 'ontsnapt'; }
    else if (k && +k[1] - 1 === me.team_progress.length) { me.team_progress.push(+k[1] - 1); me.next_post = view.settings.post_names[me.team_progress.length] || null; notice('Gemeld bij ' + view.settings.post_names[+k[1] - 1]); }
  }
}

/* ============================================================ MUZIEKBINGO */
GAMES.bingo = {
  lobbyText: 'Ieder team krijgt een eigen bingokaart op de telefoon. De DJ draait nummers via de eigen muziek-app; teams strepen zelf af. Eerst om een rij, daarna om een volle kaart.',
  settings() {
    const s = view.settings;
    return `<label class="field"><span>Kaart</span>${sel('size', [[3, '3 × 3 (kort)'], [4, '4 × 4'], [5, '5 × 5 (lang)']], drafts.size || s.size)}</label>
    <p>Muzieklijst: <b>${s.songs} nummers</b> · ${s.custom ? 'eigen lijst' : 'startlijst van Groepsspel'}</p>
    <label class="field"><span>Eigen lijst plakken: één nummer per regel, "titel - artiest"</span><textarea data-draft="songs" rows="5" placeholder="Bohemian Rhapsody - Queen"></textarea></label>
    <div class="actions">${btn('Eigen lijst gebruiken', 'songs', '', 'secondary small')}${s.custom ? btn('Terug naar startlijst', 'songs_default', '', 'secondary small') : ''}</div>
    <label class="field"><span>Team toevoegen</span><input data-draft="newteam" maxlength="30"></label>${btn('Team toevoegen', 'add_team', '', 'secondary small')}`;
  },
  startButtons() { return btn('Kaarten uitdelen →', 'start', view.players.length < 1 ? 'disabled' : ''); },
  pattern() { return view.pattern === 'line' ? 'een rij (recht of schuin)' : view.pattern === 'full' ? 'een volle kaart' : 'niets meer'; },
  scores() { return scoreCards(view.teams.map(t => [esc(t.name), view.scores?.[t.id] ?? 0, view.winners.line.includes(t.id) ? 'rij ✓' : ''])); },
  host() {
    const v = view;
    if (v.phase === 'end') return `<div class="eyebrow">Uitslag</div><h1>Einde van ronde ${v.round || 1}</h1>${this.scores()}<h2>Verloop</h2>${logList()}<div class="actions">${btn('Nieuwe ronde: nieuwe kaarten, scores lopen door', 'new_round', '', 'big')}${btn('Nieuw spel', 'reset', 'data-confirm="Alles wissen en opnieuw beginnen?"', 'secondary')}</div>`;
    const c = v.current, q = c ? encodeURIComponent(c.title + ' ' + c.artist) : '';
    return `<div class="cols"><div><div class="eyebrow">DJ-console · ronde ${v.round || 1} · nummer ${v.played_count} · nog ${v.left} in de stapel</div>
      ${c ? `<div class="card"><span class="eyebrow">Draai nu</span><h1 style="margin:6px 0" translate="no">${esc(c.title)}</h1><p class="lead" translate="no">${esc(c.artist)}</p><p class="small">Zoeken in: <a href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">YouTube ↗</a> · <a href="https://open.spotify.com/search/${q}" target="_blank" rel="noopener">Spotify ↗</a> · <a href="https://music.apple.com/nl/search?term=${q}" target="_blank" rel="noopener">Apple Music ↗</a></p></div>` : '<p class="lead">Klik op "Volgend nummer" en draai het via je eigen muziek-app.</p>'}
      <div class="actions">${btn(c ? 'Volgend nummer' : 'Eerste nummer', 'next', v.left ? '' : 'disabled', 'big')}${c && !v.revealed ? btn('Titel op de beamer', 'reveal', '', 'secondary') : ''}</div>
      <p class="lead">We spelen om: <b>${this.pattern()}</b></p>${this.scores()}<h2>Verloop</h2>${logList()}</div>
      <aside><section class="panel"><h2>Kaarten</h2>${v.teams.map(t => `<p><b>${esc(t.name)}</b> · ${v.progress?.[t.id]?.valid ?? 0} geldige vakjes${v.false?.[t.id] ? ` · ${v.false[t.id]}× vals` : ''} ${btn('+1', 'adjust', `data-team="${t.id}" data-p="1"`, 'secondary small')} ${btn('−1', 'adjust', `data-team="${t.id}" data-p="-1"`, 'secondary small')}</p>`).join('')}<div class="actions">${btn('Nieuwe ronde', 'new_round', 'data-confirm="Nieuwe kaarten uitdelen? De scores blijven staan."', 'secondary small')}${btn('Einde', 'finish', 'data-confirm="De bingo beëindigen?"', 'small')}</div></section></aside></div>`;
  },
  screen() {
    const v = view;
    return `<div class="stage" style="justify-content:flex-start"><div class="eyebrow">Muziekbingo · nummer ${v.played_count}</div><h1>${v.phase === 'end' ? 'Einde!' : v.current ? `<span translate="no">${esc(v.current.title)}</span>` : '♪ Luister goed…'}</h1>${v.current && v.phase !== 'end' ? `<p class="lead" translate="no">${esc(v.current.artist)}</p>` : ''}<p class="lead">We spelen om: <b>${this.pattern()}</b></p>${this.scores()}${v.revealed_list.length ? `<ul class="list" style="max-width:1000px;margin:0 auto;text-align:left">${[...v.revealed_list].reverse().slice(0, 6).map(sg => `<li translate="no">${esc(sg.title)} · <span class="small">${esc(sg.artist)}</span></li>`).join('')}</ul>` : ''}</div>`;
  },
  phone() {
    const v = view, me = v.me;
    if (v.phase === 'lobby' || !me.card) return '<p class="lead">Wacht tot de spelleider de kaarten uitdeelt.</p>';
    const size = v.settings.size;
    let html = `<p>Nummer ${v.played_count} · we spelen om <b>${this.pattern()}</b>${me.won.length ? ' · jullie hadden al ' + me.won.map(w => w === 'line' ? 'een rij' : 'een volle kaart').join(' en ') : ''}</p>`;
    html += `<div class="bingo-card" style="grid-template-columns:repeat(${size},1fr)">${me.card.map(c => `<button type="button" data-a="mark" data-i="${c.i}" class="${c.marked ? 'on' : ''}" translate="no"><b>${esc(c.title)}</b><span>${esc(c.artist)}</span></button>`).join('')}</div>`;
    if (v.phase === 'play') html += btn('BINGO!', 'claim', v.pattern && !me.won.includes(v.pattern) ? 'data-confirm="Weet je het zeker? Een valse bingo kost 2 punten."' : 'disabled', 'big good');
    else html += this.scores();
    if (v.revealed_list.length) html += `<details><summary class="small">Al bekendgemaakt</summary><ul class="list">${[...v.revealed_list].reverse().map(sg => `<li translate="no">${esc(sg.title)} · <span class="small">${esc(sg.artist)}</span></li>`).join('')}</ul></details>`;
    return html;
  },
  click(a, el, d) {
    if (role === 'host') {
      if (a === 'start') return hostSend({action: 'settings', size: +(drafts.size || view.settings.size)}).then(() => hostSend({action: 'start'}));
      if (a === 'add_team') { const n = drafts.newteam; drafts.newteam = ''; return hostSend({action: a, name: n || ''}); }
      if (a === 'songs') {
        const rows = String(drafts.songs || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = l.split(/\s+[-–|]\s+/); return {title: (m[0] || '').trim(), artist: (m.slice(1).join(' - ') || '').trim()}; });
        if (rows.some(r => !r.artist)) return notice('Zet op elke regel "titel - artiest".');
        drafts.songs = ''; return hostSend({action: 'songs', songs: rows});
      }
      if (a === 'songs_default') return hostSend({action: 'songs', default: true});
      if (a === 'adjust') return hostSend({action: a, team: d.team, points: parseInt(d.p, 10)});
      return hostSend({action: a});
    }
    if (a === 'mark') return playerSend({action: 'mark', cell: +d.i});
    if (a === 'claim') return playerSend({action: 'claim'});
  },
};

/* ------------------------------------------------------------------ start */
setInterval(() => document.querySelectorAll('[data-ends]').forEach(el => { el.textContent = fmt(+el.dataset.ends - now()); }), 1000);
async function boot() {
  if (!GAMES[gid]) { $('#root').innerHTML = '<h1>Onbekend spel</h1>'; return; }
  if (role === 'host') {
    try { const b = await api('/api/bootstrap'); hostKey = b.host_key; urls = b.urls || []; drafts.lan = urls[0]; }
    catch { $('#root').innerHTML = `<h1>Open de console op de spel-pc</h1><p class="lead">De spelleidersconsole werkt alleen op de pc waarop Groepsspel draait. Spelers gebruiken de QR-code of <b>/spel/${esc(gid)}/speler</b>.</p>`; return; }
  }
  try { uploads = gid === 'crazy88' ? await DB.all() : []; } catch {}
  await refresh();
  setInterval(refresh, role === 'public' ? 1000 : 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('online', refresh);
}
boot();

/* Online spelserver: QR-codes bevatten de spelkamer, zodat telefoons in dezelfde kamer terechtkomen. */
function roomBase() { const m = document.cookie.match(/(?:^|; )gs_kamer=([A-Z0-9]{6})/); return location.origin + (m ? '/k/' + m[1] : ''); }
