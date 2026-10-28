'use strict';
/* Het Verraad: één script voor pc-console (/verraders), telefoon (/verraders/speler) en beamer (/verraders/scherm).
   Alle geheimen komen per rol van de server; dit script toont alleen wat het ontvangt. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const path = location.pathname.replace(/\/$/, '');
const role = path.endsWith('/speler') ? 'player' : path.endsWith('/scherm') ? 'public' : 'host';
document.body.classList.add(role === 'player' ? 'phone' : role === 'public' ? 'screen' : 'console');
const STORE = 'groepsspel-verraders-speler';
let view = null, hostKey = '', urls = [], playerKey = '', signature = '', busy = false, roleOpen = false, roleTimer = null, chosen = null, nightMode = null;
const drafts = {};
try { playerKey = new URLSearchParams(location.search).has('nieuw') ? '' : localStorage.getItem(STORE) || ''; } catch { playerKey = ''; }

function notice(text) { const n = $('#notice'); n.textContent = text; n.style.display = 'block'; clearTimeout(notice.t); notice.t = setTimeout(() => n.style.display = 'none', 6000); }
async function api(url, body, key) {
  const r = await fetch(url, {method: body ? 'POST' : 'GET', cache: 'no-store', headers: {...(body ? {'Content-Type': 'application/json'} : {}), ...(key ? {Authorization: 'Bearer ' + key} : {})}, body: body ? JSON.stringify(body) : undefined});
  const data = await r.json().catch(() => ({error: 'Geen geldig antwoord van de spelserver.'}));
  if (!r.ok) { const e = new Error(data.error || 'Verzoek mislukt.'); e.status = r.status; throw e; }
  return data;
}
const person = id => view?.players.find(p => p.id === id) || {};
const nameOf = id => person(id).name || '?';
const alive = () => view.players.filter(p => p.status === 'alive');
const money = n => '€' + Number(n || 0).toLocaleString('nl-NL');
const roleLabel = r => r === 'traitor' ? 'Verrader' : 'Getrouwe';
const statusLabel = {alive: 'Doet mee', banished: 'Verbannen', murdered: 'Vermoord', left: 'Vertrokken'};
const btn = (label, action, extra = '', cls = '') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;

function roster(withRoles = true) {
  return `<div class="roster">${view.players.map(p => `<div class="person ${p.status !== 'alive' ? 'out' : ''}"><b>${esc(p.name)}</b><small>${role === 'host' ? `<span class="dot ${p.connected ? '' : 'off'}"></span>` : ''}${statusLabel[p.status] || ''}${view.shields?.includes(p.id) ? ' · 🛡 schild' : ''}</small>${withRoles && p.role ? `<span class="badge ${p.role}">${roleLabel(p.role)}</span>` : ''}</div>`).join('')}</div>`;
}
function logList() { return `<ul class="log">${[...view.log].reverse().map(l => `<li><b>Dag ${l.day}</b>${esc(l.text)}</li>`).join('') || '<li>Nog niets gebeurd.</li>'}</ul>`; }
function joinURL() { const base = (drafts.lan || urls[0] || location.origin); return base + '/verraders/speler?code=' + view.code; }
function qr(url, size = 5) { try { const c = qrcode(0, 'M'); c.addData(url); c.make(); return `<div class="qr">${c.createImgTag(size, 8, 'Scan om mee te spelen')}</div>`; } catch { return ''; } }
const phaseTitle = {lobby: 'Wachten op spelers', roles: 'De rollen worden verdeeld', day: 'Dag', mission: 'Opdracht', table: 'De ronde tafel', vote: 'Stemmen', reveal: 'De stemmen', banish: 'Verbannen', night: 'De nacht', morning: 'Het ontbijt', endgame: 'Het eindspel', end: 'Einde'};

/* ------------------------------------------------------------------ CONSOLE */
/* Draaiboek vóór het spel, ook bij direct openen vanuit de Windows-app. */
let uitlegData = null, uitlegLoading = false, guideAccepted = false;
function lobbyInstructions(){
  const u=uitlegData?.verraders;
  if(!u)return `<section class="panel"><h2>Uitleg & voorbereiding</h2><p>${uitlegLoading?'Speluitleg wordt geladen…':'Speluitleg is niet beschikbaar. Controleer de spelserver.'}</p></section>`;
  const list=a=>`<ul>${a.map(x=>`<li style="margin-bottom:8px">${esc(x)}</li>`).join('')}</ul>`;
  return `<section class="panel" style="border-color:#d9aa79">
  <h2>Lees dit vóór het starten</h2><p>${esc(u.kort)}</p><p class="small">${esc(u.spelers)} · ${esc(u.duur)}</p>
  <h3>Wat moet je vooraf regelen?</h3>${list(u.voorbereiding)}
  <h3>Hoe wordt het gespeeld?</h3>${list(u.regels)}
  <label style="display:flex;gap:10px;align-items:flex-start;padding:13px;border:1px solid #d9aa79;border-radius:10px;font-weight:700"><input type="checkbox" data-guide-accepted ${guideAccepted?'checked':''}> Ik heb de voorbereiding en spelregels gelezen.</label></section>`;
}
function hostScreen() {
  const v = view, ph = v.phase;
  let main = '';
  if (ph === 'lobby') {
    const s = v.settings;
    main = `<div class="eyebrow">Stap 1 · spelers verzamelen</div><h1>Het Verraad</h1><p class="lead">Iedereen speelt op een eigen telefoon. Deze pc toont nooit wie de verraders zijn, dus de spelleider mag gewoon meespelen.</p>
    ${lobbyInstructions()}<div class="cols"><section class="panel"><h2>Laat iedereen scannen</h2><p class="code">${v.code}</p>${urls.length > 1 ? `<label class="field"><span>Wifi-adres</span><select data-draft="lan">${urls.map(u => `<option ${u === drafts.lan ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></label>` : ''}${qr(joinURL())}<p class="linkline small">${esc(joinURL())}</p>
    <div class="actions"><a class="btn secondary" href="/verraders/scherm" target="_blank" rel="noopener">Open beamer ↗</a><a class="btn secondary" href="/verraders/speler?code=${v.code}&nieuw=1" target="_blank" rel="noopener">Zelf meespelen ↗</a></div></section>
    <section class="panel"><h2>Instellingen</h2><label class="field"><span>Aantal verraders</span><select data-setting="traitors"><option value="0">Automatisch (${v.suggested} bij ${v.players.length} spelers)</option>${[1, 2, 3, 4].map(n => `<option value="${n}" ${s.traitors === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="field"><span>Eindspel vanaf</span><select data-setting="endgame_at">${[3, 4, 5, 6].map(n => `<option value="${n}" ${s.endgame_at === n ? 'selected' : ''}>${n} spelers over</option>`).join('')}</select></label>
    <label class="field" style="display:flex;gap:10px;align-items:center"><input type="checkbox" data-setting="ultimatum" ${s.ultimatum ? 'checked' : ''} style="width:auto"> <span style="margin:0">Ultimatum: wie een rekruteringsaanbod weigert, wordt vermoord</span></label>
    <p class="small">Minimaal 5 spelers. Advies: 8–16 spelers, een hele dag of weekend.</p>
    <div class="actions"><button class="secondary" data-action="simple">Eenvoudige variant</button></div><p class="small">Eenvoudig: één verrader, eindspel bij drie spelers en geen ultimatum. Opdrachten zijn optioneel; je kunt elke dag direct naar de ronde tafel. Ideaal voor 5 tot 8 spelers of een eerste keer.</p></section></div>
    <section class="panel"><h2>${v.players.length} ${v.players.length === 1 ? 'speler' : 'spelers'}</h2><div class="roster">${v.players.map(p => `<div class="person"><b>${esc(p.name)}</b><small><span class="dot ${p.connected ? '' : 'off'}"></span>${p.connected ? 'Verbonden' : 'Telefoon slaapt'}</small><button class="secondary" style="padding:6px 10px;font-size:12px;margin-top:8px" data-action="remove" data-id="${p.id}">Verwijderen</button></div>`).join('')}</div>
    <div class="actions">${btn('Rollen verdelen en beginnen →', 'start', v.players.length < 5 || !guideAccepted ? 'disabled' : '')}</div></section>`;
  } else if (ph === 'roles') {
    main = `<div class="eyebrow">Stap 2</div><h1>Iedereen bekijkt zijn rol</h1><p class="lead">Elke speler opent zijn rol op de eigen telefoon en tikt op <b>Ik heb mijn rol gezien</b>. De verraders zien op hun telefoon wie de andere verraders zijn.</p>
    <div class="progress"><i style="width:${Math.round(100 * v.acks / v.players.length)}%"></i></div><p>${v.acks} van ${v.players.length} spelers zijn klaar.</p><div class="actions">${btn('Dag 1 beginnen →', 'roles_done')}</div>`;
  } else if (ph === 'day') {
    main = `<div class="eyebrow">Dag ${v.day}</div><h1>Wat gaan jullie vandaag doen?</h1><p class="lead">Speel een of meer opdrachten om de pot te vullen. Daarna volgt de ronde tafel.</p>
    <div class="actions">${btn('Naar de ronde tafel →', 'table')}</div><h2>Opdrachten</h2><div class="missions">${v.missions.map(m => `<article class="mission ${v.missions_done.includes(m.id) ? 'done' : ''}"><span class="meta">${esc(m.where)} · ${m.minutes} min${m.shield ? ' · 🛡 schild' : ''}${m.kind === 'quiz' ? ' · quiz op beamer' : ''}</span><h3>${esc(m.title)}</h3><p>${esc(m.text)}</p>${btn(v.missions_done.includes(m.id) ? 'Nog een keer' : 'Start opdracht', 'mission', `data-id="${m.id}"`, 'secondary')}</article>`).join('')}</div>`;
  } else if (ph === 'mission') {
    const m = v.mission;
    if (m.kind === 'quiz' && m.index < m.total) {
      const q = m.question;
      main = `<div class="eyebrow">Opdracht · vraag ${m.index + 1} van ${m.total}</div><h1>${esc(q.q)}</h1><div class="options">${q.options.map((o, i) => `<div class="option ${m.revealed && q.correct === i ? 'right' : ''}">${'ABCD'[i]}. ${esc(o)}</div>`).join('')}</div>
      <p>Laat de groep overleggen en één antwoord kiezen. Al verdiend: <b>${money(m.earned)}</b>.</p><div class="actions">${m.revealed ? btn('Goed · +' + money(100), 'quiz_mark', 'data-correct="1"') + btn('Fout', 'quiz_mark', 'data-correct="0"', 'secondary') : btn('Toon het juiste antwoord', 'quiz_reveal')}${btn('Opdracht stoppen', 'mission_cancel', '', 'secondary')}</div>`;
    } else {
      const amount = drafts.amount ?? (m.kind === 'quiz' ? m.earned : m.suggested);
      main = `<div class="eyebrow">Opdracht</div><h1>${esc(m.title)}</h1><p class="lead">${esc(m.text)}</p>
      <section class="panel"><h2>Resultaat</h2><label class="field"><span>Bedrag voor de pot (negatief = eruit)</span><input type="number" step="10" data-draft="amount" value="${esc(amount)}"></label>
      <p class="small">Schild toekennen (alleen de speler zelf en deze pc zien het; het schild beschermt één nacht):</p><div class="checks">${alive().map(p => `<label><input type="checkbox" data-shield="${p.id}" ${drafts['shield_' + p.id] ? 'checked' : ''}> ${esc(p.name)}</label>`).join('')}</div>
      <div class="actions">${btn('Opdracht afronden', 'mission_done')}${btn('Annuleren', 'mission_cancel', '', 'secondary')}</div></section>`;
    }
  } else if (ph === 'table') {
    main = `<div class="eyebrow">Dag ${v.day}</div><h1>De ronde tafel</h1><p class="lead">Iedereen gaat zitten. Bespreek wie volgens jullie een verrader is. Neem de tijd: verdenken, verdedigen, twijfelen. Open de stemming als het gesprek klaar is.</p><div class="actions">${btn('Open de stemming →', 'open_vote')}</div>`;
  } else if (ph === 'vote') {
    const x = v.vote;
    main = `<div class="eyebrow">${x.second ? 'Herstemming' : x.endgame ? 'Eindspel' : 'Ronde tafel'}</div><h1>Iedereen stemt op zijn telefoon</h1>${x.second ? `<p class="lead">Gelijke stand. Er wordt opnieuw gestemd tussen ${x.candidates.map(nameOf).map(esc).join(' en ')}. Bij opnieuw gelijk beslist het lot.</p>` : ''}
    <div class="progress"><i style="width:${Math.round(100 * x.voted / x.voters)}%"></i></div><p>${x.voted} van ${x.voters} stemmen binnen.</p><p class="small">Nog niet gestemd: ${esc(alive().filter(p => !x.has_voted.includes(p.id)).map(p => p.name).join(', ') || '–')}</p>
    <div class="actions">${btn('Stemming sluiten', 'close_vote', x.voted ? '' : 'disabled', 'secondary')}</div>`;
  } else if (ph === 'reveal') {
    const r = v.reveal, done = r.shown.length >= r.total;
    main = `<div class="eyebrow">De stemmen</div><h1>${done ? outcomeText(r.outcome) : 'Stem voor stem'}</h1><p class="small">Lees elke stem hardop voor of laat de stemmer zelf zijn keuze uitleggen.</p><ul class="votes">${r.shown.map(x => `<li><b>${esc(nameOf(x.voter))}</b><span>stemt op</span><strong>${esc(nameOf(x.target))}</strong></li>`).join('')}</ul>
    <div class="actions">${done ? btn('Verder →', 'reveal_next') : btn('Volgende stem', 'reveal_next') + btn('Alle stemmen tonen', 'reveal_all', '', 'secondary')}</div>`;
  } else if (ph === 'banish') {
    const b = v.banished;
    main = `<div class="verdict"><div class="eyebrow">Verbannen</div><div class="name">${esc(nameOf(b.id))}</div>${b.shown ? `<div class="was">was een</div><div class="role ${b.role}">${roleLabel(b.role)}</div>` : `<p class="lead">Geef ${esc(nameOf(b.id))} even het woord. Onthul daarna de rol.</p>`}</div>
    <div class="actions" style="justify-content:center">${b.shown ? btn('Verder →', 'banish_done') : btn('Onthul de rol', 'banish_reveal', '', 'danger')}</div>`;
  } else if (ph === 'night') {
    const n = v.night;
    main = `<div class="eyebrow">Dag ${v.day} · nacht</div><h1>De nacht valt</h1><p class="lead">Iedereen pakt zijn telefoon, tikt op <b>Welterusten</b> en legt hem weg. De verraders kiezen in stilte. Iedereen gebruikt zijn telefoon even lang, dus niemand valt op.</p>
    <p>${n.asleep} spelers slapen. Nachtkeuze: <b>${n.ready ? 'gemaakt ✓' : 'nog niet gemaakt'}</b></p><div class="actions">${btn(n.ready ? 'De ochtend breekt aan →' : 'Nacht toch afsluiten', 'close_night', '', n.ready ? '' : 'secondary')}</div>${n.ready ? '' : '<p class="small">Afsluiten zonder overeenstemming: de meest gekozen naam telt, bij gelijkspel beslist het lot. Een open aanbod geldt als geweigerd.</p>'}`;
  } else if (ph === 'morning') {
    const m = v.morning;
    main = m.shown ? `<div class="verdict">${m.murdered ? `<div class="eyebrow">Vermoord</div><div class="name">${esc(nameOf(m.murdered))}</div><div class="was">komt niet meer aan het ontbijt.</div>` : `<div class="eyebrow">Een wonder</div><div class="name">Iedereen is er nog</div><div class="was">${m.shielded ? 'Een schild heeft vannacht een leven gered.' : 'De verraders hebben vannacht niemand vermoord.'}</div>`}</div><div class="actions" style="justify-content:center">${btn('Volgende dag →', 'morning_done')}</div>`
      : `<div class="eyebrow">Dag ${v.day + 1}</div><h1>Het ontbijt</h1><p class="lead">Iedereen komt één voor één binnen. Wie ontbreekt er?</p><div class="actions">${btn('Onthul wie er ontbreekt', 'morning_reveal', '', 'danger')}</div>`;
  } else if (ph === 'endgame') {
    const e = v.endgame;
    main = `<div class="eyebrow">Eindspel · ronde ${e.round}</div><h1>Stoppen of nog iemand verbannen?</h1><p class="lead">Kiest iedereen op zijn telefoon <b>Stoppen</b>, dan eindigt het spel. Zit er dan nog een verrader tussen, dan gaat de hele pot naar de verraders.</p>
    ${e.decided ? `<ul class="votes">${Object.entries(e.votes).map(([id, c]) => `<li><b>${esc(nameOf(id))}</b><strong>${c === 'end' ? 'Stoppen' : 'Doorgaan'}</strong></li>`).join('')}</ul><div class="actions">${btn('Open de verbanningsstemming →', 'open_vote')}</div>` : `<div class="progress"><i style="width:${Math.round(100 * e.voted / e.total)}%"></i></div><p>${e.voted} van ${e.total} keuzes binnen.</p><div class="actions">${btn('Keuze sluiten', 'endgame_close', '', 'secondary')}</div>`}`;
  } else if (ph === 'end') {
    main = endScreen() + `<div class="actions">${btn('Nieuw spel met dezelfde spelers', 'reset', '', 'secondary')}</div>`;
  }
  const side = ph === 'lobby' ? '' : `<aside><section class="panel"><div class="pot"><small>Prijzenpot (fictief)</small>${money(view.pot)}</div><p class="small">${view.alive} spelers doen nog mee · ${view.traitors_start} ${view.traitors_start === 1 ? 'verrader' : 'verraders'} bij de start</p></section>
    <section class="panel"><h2>Spelers</h2>${roster()}${['day', 'table'].includes(ph) ? `<details style="margin-top:14px"><summary class="small">Speler vertrekt of is zijn code kwijt</summary><div class="actions">${alive().map(p => `<button class="secondary" style="padding:6px 10px;font-size:12px" data-action="show_code" data-id="${p.id}">Code ${esc(p.name)}</button>`).join('')}</div><div class="actions">${alive().map(p => `<button class="secondary" style="padding:6px 10px;font-size:12px" data-action="leave" data-id="${p.id}" data-confirm="${esc(p.name)} verlaat het spel en de rol wordt onthuld. Doorgaan?">${esc(p.name)} vertrekt</button>`).join('')}</div></details>` : ''}</section>
    <section class="panel"><h2>Verloop</h2>${logList()}</section><p class="actions"><a class="btn secondary" href="/verraders/scherm" target="_blank" rel="noopener">Open beamer ↗</a></p></aside>`;
  return ph === 'lobby' ? main : `<div class="cols"><div>${main}</div>${side}</div>`;
}
function outcomeText(o) {
  if (!o) return '';
  if (o.kind === 'revote') return 'Gelijke stand: herstemming';
  if (o.kind === 'draw') return 'Opnieuw gelijk: het lot kiest ' + esc(nameOf(o.id));
  return esc(nameOf(o.id)) + ' wordt verbannen';
}
function endScreen() {
  const r = view.result, traitors = r.side === 'traitors';
  return `<div class="verdict"><div class="eyebrow">Einde van het spel</div><div class="role ${traitors ? 'traitor' : 'faithful'}">${traitors ? 'De verraders winnen' : 'De getrouwen winnen'}</div><p class="lead">${r.winners.map(nameOf).map(esc).join(', ')} ${r.winners.length === 1 ? 'krijgt' : 'krijgen elk'} ${money(r.share)} uit een pot van ${money(view.pot)}.</p></div><h2>Alle rollen</h2>${roster()}`;
}

/* ------------------------------------------------------------------- BEAMER */
function screenView() {
  const v = view, ph = v.phase;
  document.body.classList.toggle('night-mode', ph === 'night');
  const stage = (inner) => `<div class="stage">${inner}</div>`;
  if (ph === 'lobby') return stage(`<div class="eyebrow">Groepsspel presenteert</div><h1>Het Verraad</h1><div class="lobbybox">${qr(roomBase() + '/verraders/speler?code=' + v.code, 7)}<div><p class="lead" style="margin:0">Scan en vul je naam in.<br>Spelcode</p><p class="code">${v.code}</p><p class="lead">${v.players.length} spelers aan tafel</p></div></div><div style="margin-top:4vh">${roster(false)}</div>`);
  if (ph === 'roles') return stage(`<div class="eyebrow">De selectie</div><h1>Bekijk je rol in stilte</h1><p class="lead">Laat niemand meekijken. Onder jullie zijn ${v.traitors_start} ${v.traitors_start === 1 ? 'verrader' : 'verraders'}.</p><div class="progress" style="max-width:700px;margin:0 auto"><i style="width:${Math.round(100 * v.acks / v.players.length)}%"></i></div>`);
  if (ph === 'day') return stage(`<div class="eyebrow">Dag ${v.day}</div><h1>Wie kun je nog vertrouwen?</h1><div class="pot"><small>In de pot</small>${money(v.pot)}</div><div style="margin-top:4vh">${roster()}</div>`);
  if (ph === 'mission') {
    const m = v.mission;
    if (m.kind === 'quiz' && m.index < m.total) { const q = m.question; return stage(`<div class="eyebrow">${esc(m.title)} · vraag ${m.index + 1} van ${m.total} · ${money(m.earned)} verdiend</div><h1>${esc(q.q)}</h1><div class="options">${q.options.map((o, i) => `<div class="option ${m.revealed && q.correct === i ? 'right' : ''}">${'ABCD'[i]}. ${esc(o)}</div>`).join('')}</div>`); }
    return stage(`<div class="eyebrow">Opdracht${m.shield ? ' · er is een schild te verdienen' : ''}</div><h1>${esc(m.title)}</h1><p class="lead">${esc(m.text)}</p><div class="pot"><small>In de pot</small>${money(v.pot)}</div>`);
  }
  if (ph === 'table') return stage(`<div class="eyebrow">Dag ${v.day}</div><h1>De ronde tafel</h1><p class="lead">Wie is volgens jullie een verrader?</p>${roster()}`);
  if (ph === 'vote') { const x = v.vote; return stage(`<div class="eyebrow">${x.second ? 'Herstemming' : 'Stemming'}</div><h1>Stem op je telefoon</h1>${x.second ? `<p class="lead">Kies tussen ${x.candidates.map(nameOf).map(esc).join(' en ')}</p>` : ''}<div class="progress" style="max-width:800px;margin:0 auto"><i style="width:${Math.round(100 * x.voted / x.voters)}%"></i></div><p class="lead">${x.voted} van ${x.voters} stemmen</p>`); }
  if (ph === 'reveal') {
    const r = v.reveal, done = r.shown.length >= r.total;
    const counts = {}; r.shown.forEach(x => counts[x.target] = (counts[x.target] || 0) + 1); const max = Math.max(1, ...Object.values(counts));
    return `<div class="stage" style="justify-content:flex-start;padding-top:4vh"><div class="eyebrow">De stemmen</div><h1>${done ? outcomeText(r.outcome) : 'Stem voor stem'}</h1><div class="cols"><ul class="votes">${r.shown.map(x => `<li><b>${esc(nameOf(x.voter))}</b><span>stemt op</span><strong>${esc(nameOf(x.target))}</strong></li>`).join('')}</ul><div class="tally panel">${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id, n]) => `<div><span style="min-width:140px;text-align:left">${esc(nameOf(id))}</span><i style="width:${Math.round(220 * n / max)}px"></i><b>${n}</b></div>`).join('') || '<p>…</p>'}</div></div></div>`;
  }
  if (ph === 'banish') { const b = v.banished; return stage(`<div class="verdict"><div class="eyebrow">Verbannen</div><div class="name">${esc(nameOf(b.id))}</div>${b.shown ? `<div class="was">was een</div><div class="role ${b.role}">${roleLabel(b.role)}</div>` : '<div class="was">Laatste woorden…</div>'}</div>`); }
  if (ph === 'night') return stage(`<div class="moon">🌙</div><h1>De nacht valt</h1><p class="lead">Tik op je telefoon op Welterusten en leg hem met het scherm naar beneden. Ogen dicht. De verraders kiezen…</p>`);
  if (ph === 'morning') { const m = v.morning; return stage(m.shown ? (m.murdered ? `<div class="verdict"><div class="eyebrow">Vermoord</div><div class="name">${esc(nameOf(m.murdered))}</div><div class="was">komt niet meer aan het ontbijt</div></div>` : `<div class="verdict"><div class="eyebrow">Het ontbijt</div><div class="name">Iedereen is er nog</div><div class="was">${m.shielded ? 'Een schild heeft een leven gered.' : 'Vannacht is niemand vermoord.'}</div></div>`) : `<div class="eyebrow">Een nieuwe dag</div><h1>Het ontbijt</h1><p class="lead">Wie komt er niet binnen?</p>`); }
  if (ph === 'endgame') { const e = v.endgame; return stage(`<div class="eyebrow">Het eindspel</div><h1>Stoppen of doorgaan?</h1><div class="pot"><small>In de pot</small>${money(v.pot)}</div>${e.decided ? `<ul class="votes" style="max-width:700px;margin:3vh auto">${Object.entries(e.votes).map(([id, c]) => `<li><b>${esc(nameOf(id))}</b><strong>${c === 'end' ? 'Stoppen' : 'Doorgaan'}</strong></li>`).join('')}</ul><p class="lead">${e.decided === 'end' ? '' : 'Niet iedereen wil stoppen: er volgt nog een verbanning.'}</p>` : `<p class="lead">${e.voted} van ${e.total} keuzes binnen</p>`}`); }
  if (ph === 'end') return stage(endScreen());
  return stage('<h1>Het Verraad</h1>');
}

/* ----------------------------------------------------------------- TELEFOON */
function roleCard(me) {
  const open = roleOpen;
  const team = me.role === 'traitor' && me.team?.length ? `<p class="small" style="color:var(--parch)">Medeverraders: ${me.team.map(t => esc(t.name) + (t.status !== 'alive' ? ' (' + statusLabel[t.status].toLowerCase() + ')' : '')).join(', ')}</p>` : '';
  return `<div class="rolecard ${open ? 'open ' + me.role : ''}" data-action="toggle_role" role="button" tabindex="0" aria-pressed="${open}">${open ? `<div class="small">Jouw rol</div><div class="display ${me.role}">${roleLabel(me.role)}</div>${me.recruited ? '<p class="small">Je bent gerekruteerd.</p>' : ''}${team}${me.shield ? '<p class="small">🛡 Je hebt een schild voor de komende nacht.</p>' : ''}<div class="small">Tik om te verbergen</div>` : `<div class="display">🂠</div><div class="small">Tik om je rol te zien. Houd je scherm afgeschermd.</div>`}</div>`;
}
function phoneScreen() {
  const v = view, me = v.me, ph = v.phase;
  const top = `<div class="topline"><span>${esc(me.name)} · code <b>${esc(me.access)}</b></span><span>${ph === 'lobby' ? 'Lobby' : v.day ? 'Dag ' + v.day + ' · ' + money(v.pot) : 'De selectie'}</span></div>`;
  if (ph === 'lobby') return top + `<h1>Welkom, ${esc(me.name)}</h1><p class="lead">Je zit aan tafel. Wacht tot de rollen verdeeld worden.</p><div class="hint">Bewaar je persoonlijke code <b>${esc(me.access)}</b>. Daarmee kom je terug als je telefoon de verbinding verliest.</div>`;
  if (ph === 'end') return top + endScreen() + `<h2>Jij was</h2>${roleCard({...me})}`;
  let body = roleCard(me);
  if (me.status !== 'alive') {
    return top + `<h1>${me.status === 'murdered' ? 'Je bent vermoord' : me.status === 'banished' ? 'Je bent verbannen' : 'Je bent vertrokken'}</h1><p class="lead">Kijk gerust mee op het grote scherm, maar verraad niets.</p>` + body;
  }
  if (ph === 'roles') body += me.acked ? `<p class="done">Klaar. Wacht op de anderen.</p>` : `<div class="actions"><button class="big" data-action="ack">Ik heb mijn rol gezien</button></div>`;
  else if (ph === 'vote') {
    if (!me.can_vote) body += `<p class="lead">Je stemt deze ronde niet mee.</p>`;
    else if (me.ballot) body += `<p class="done">Je stem op <b>${esc(nameOf(me.ballot))}</b> is binnen.<br><span class="small">Je stem is definitief.</span></p>`;
    else {
      const options = v.vote.candidates.filter(id => id !== me.id);
      body += `<h2>${v.vote.second ? 'Herstemming' : 'Op wie stem je?'}</h2><div class="pick">${options.map(id => `<button data-action="choose" data-id="${id}" class="${chosen === id ? 'chosen' : ''}">${esc(nameOf(id))}</button>`).join('')}</div>${chosen && options.includes(chosen) ? `<button class="big danger" data-action="vote">Stem definitief op ${esc(nameOf(chosen))}</button>` : '<p class="small">Kies een naam en bevestig daarna.</p>'}`;
    }
  } else if (ph === 'night') body = nightPhone(me) + body;
  else if (ph === 'endgame') {
    body += me.endgame_choice ? `<p class="done">Je koos <b>${me.endgame_choice === 'end' ? 'Stoppen' : 'Doorgaan'}</b>.</p>` : v.endgame.decided ? `<p class="lead">Kijk naar het grote scherm.</p>` : `<h2>Is iedereen hier getrouw?</h2><p>Stoppen kan alleen als iedereen stopt. Zit er dan nog een verrader tussen, dan wint die de hele pot.</p><div class="pick"><button data-action="endgame" data-choice="end">Stoppen: we zijn allemaal getrouw</button><button data-action="endgame" data-choice="continue">Doorgaan: er is nog een verrader</button></div>`;
  } else {
    const say = {day: 'Kijk naar het grote scherm. De dag begint.', mission: 'Opdracht! Volg de uitleg op het grote scherm.', table: 'De ronde tafel. Wie verdenk jij?', reveal: 'De stemmen worden voorgelezen.', banish: 'Er wordt iemand verbannen.', morning: 'Het ontbijt. Wie ontbreekt er?'}[ph] || '';
    body = `<p class="lead">${say}</p>` + body;
  }
  return top + body;
}
function nightPhone(me) {
  if (me.offer) return `<div class="nightbox"><div class="moon">✉️</div><h1>Een brief onder je deur</h1><p class="lead">De verraders willen dat jij een van hen wordt. Neem je het aanbod aan?</p>${me.offer.ultimatum ? '<p class="hint">Ultimatum: weiger je, dan word je vannacht vermoord.</p>' : '<p class="small">Weiger je, dan gebeurt er vannacht niets.</p>'}<div class="pick"><button data-action="offer" data-answer="accept">Aannemen: ik word Verrader</button><button data-action="offer" data-answer="decline">Weigeren: ik blijf Getrouw</button></div></div>`;
  let html = `<div class="nightbox"><div class="moon">🌙</div><h1>Welterusten</h1>${me.asleep ? '<p class="small">Leg je telefoon met het scherm naar beneden.</p>' : '<button class="big" data-action="ack">Welterusten</button>'}</div>`;
  const c = me.conclave;
  if (!c || !me.asleep) return html;
  if (c.decided) return html + `<section class="panel"><h2>Jullie keuze staat vast</h2><p>${c.decided.mode === 'recruit' ? 'Aanbod aan' : 'Slachtoffer'}: <b>${esc(nameOf(c.decided.target))}</b>${c.offer_open ? ' · wacht op het antwoord' : ''}</p></section>`;
  const mode = nightMode || c.mine?.mode || 'murder';
  return html + `<section class="panel"><div class="eyebrow">Alleen voor verraders</div><h2>${mode === 'recruit' ? 'Wie rekruteren jullie?' : 'Wie vermoorden jullie?'}</h2>${c.can_recruit ? `<div class="actions"><button class="${mode === 'murder' ? '' : 'secondary'}" data-action="night_mode" data-mode="murder">Vermoorden</button><button class="${mode === 'recruit' ? '' : 'secondary'}" data-action="night_mode" data-mode="recruit">Rekruteren</button></div>` : ''}
  <div class="pick">${c.targets.map(t => `<button data-action="night" data-id="${t.id}" class="${c.mine?.target === t.id && c.mine?.mode === mode ? 'chosen' : ''}">${esc(t.name)}</button>`).join('')}</div>
  <p class="small">Jullie moeten allemaal dezelfde keuze maken. Keuzes: ${Object.entries(c.picks).map(([n, x]) => `${esc(n)} → ${x.mode === 'recruit' ? 'rekruteren ' : ''}${esc(nameOf(x.target))}`).join(' · ') || 'nog geen'}</p></section>`;
}
let troster = null;
document.addEventListener('click', e => { const b = e.target.closest('[data-pickname]'); if (b && $('#join')) $('#join').elements.name.value = b.dataset.pickname; });
function joinForm() {
  const code = new URLSearchParams(location.search).get('code') || '';
  const pick = troster?.players?.length ? `<div class="roster-pick"><span class="small">Wie ben jij?${troster.group ? ' · ' + esc(troster.group) : ''}</span><div class="chips">${troster.players.map(r => `<button type="button" class="secondary small" data-pickname="${esc(r.name)}">${esc(r.name)}</button>`).join('')}</div></div>` : '';
  if (!troster) { troster = {players: []}; fetch('/api/groep/namen').then(r => r.ok ? r.json() : {players: []}).then(d => { troster = d; const f = $('#join'); if (f && d.players?.length) { const v = f.elements.name.value, c = f.elements.code.value; $('#root').innerHTML = joinForm(); $('#join').elements.name.value = v; $('#join').elements.code.value = c; } }).catch(() => {}); }
  return `<h1>Het Verraad</h1><p class="lead">Speel mee op je eigen telefoon. Gebruik dezelfde wifi als de pc.</p><form id="join" class="panel">${pick}<label class="field"><span>Spelcode</span><input name="code" inputmode="numeric" autocomplete="off" value="${esc(code)}"></label><label class="field"><span>Je naam</span><input name="name" maxlength="30" autocomplete="nickname"></label><p class="small">Of kom terug met je persoonlijke code:</p><label class="field"><span>Persoonlijke code</span><input name="access_code" maxlength="6" autocapitalize="characters" autocomplete="off"></label><button class="big">Aan tafel →</button></form>`;
}

/* -------------------------------------------------------------- weergeven */
/* 0.14: iedere fase duidelijk zichtbaar, op telefoon, console en beamer. Bevat geen geheime informatie. */
const PHASE_STEPS = [['roles', 'Rollen'], ['day', 'Dag & opdracht'], ['table', 'Ronde tafel'], ['vote', 'Stemmen'], ['reveal', 'Onthulling'], ['night', 'Nacht'], ['morning', 'Ochtend']];
const PHASE_ALIAS = {mission: 'day', banish: 'reveal'};
function phaseStrip() {
  const ph = view?.phase; if (!ph || ph === 'lobby') return '';
  if (ph === 'endgame' || ph === 'end') return `<nav class="phase-strip" aria-label="Spelfase"><span class="on">${ph === 'end' ? 'Einde van het spel' : 'Eindspel'}</span></nav>`;
  const cur = PHASE_ALIAS[ph] || ph, idx = PHASE_STEPS.findIndex(([k]) => k === cur);
  return `<nav class="phase-strip" aria-label="Spelfase">${view.day ? `<b>Dag ${view.day}</b>` : ''}${PHASE_STEPS.map(([k, t], i) => `<span class="${i === idx ? 'on' : i < idx ? 'done' : ''}" ${i === idx ? 'aria-current="step"' : ''}>${t}</span>`).join('')}</nav>`;
}
function render() {
  const root = $('#root');
  if (role === 'player' && !view) { if (!$('#join')) root.innerHTML = joinForm(); return; }
  if (!view) return;
  const html = phaseStrip() + (role === 'host' ? hostScreen() : role === 'public' ? screenView() : phoneScreen());
  if (html === signature) return;
  const focus = document.activeElement?.dataset?.draft;
  signature = html; root.innerHTML = html;
  if (focus) { const el = root.querySelector(`[data-draft="${focus}"]`); if (el) { el.focus(); const n = el.value.length; try { el.setSelectionRange(n, n); } catch {} } }
}
async function refresh() {
  try {
    if (role === 'host') view = await api('/api/traitors/view?role=host', null, hostKey);
    else if (role === 'public') view = await api('/api/traitors/view?role=public');
    else if (playerKey) view = await api('/api/traitors/view?role=player', null, playerKey);
    $('#connection').textContent = '● Verbonden met spelserver';
    if (view?.phase !== 'vote') chosen = null;
    if (view?.phase !== 'night') nightMode = null;
    render();
    if(role==='host'&&view?.phase==='lobby'&&!uitlegData&&!uitlegLoading){
      uitlegLoading=true;
      api('/api/uitleg').then(x=>{uitlegData=x;signature='';render();}).catch(e=>notice('Speluitleg niet beschikbaar: '+e.message))
        .finally(()=>{uitlegLoading=false;signature='';render();});
    }
  } catch (e) {
    $('#connection').textContent = '○ Geen verbinding · opnieuw proberen…';
    if (e.status === 403 && role === 'player') { playerKey = ''; view = null; try { localStorage.removeItem(STORE); } catch {} render(); }
  }
}
async function hostAction(data) {
  if (busy) return; busy = true;
  try { view = await api('/api/traitors/host', data, hostKey); signature = ''; if (data.action === 'mission_done') { Object.keys(drafts).forEach(k => k !== 'lan' && delete drafts[k]); } render(); if (view.shown_code) notice(`Persoonlijke code van ${view.shown_code.name}: ${view.shown_code.access}`); }
  catch (e) { notice(e.message); } finally { busy = false; }
}
async function playerAction(data) {
  if (busy) return; busy = true;
  try { view = await api('/api/traitors/player', {...data, phase_id: view.phase_id}, playerKey); signature = ''; render(); }
  catch (e) { notice(e.message); refresh(); } finally { busy = false; }
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]'); if (!el || el.disabled) return;
  const a = el.dataset.action;
  if (el.dataset.confirm && !confirm(el.dataset.confirm)) return;
  if (role === 'host') {
    if (a === 'mission_done') {
      const amount = parseInt(drafts.amount ?? $('[data-draft="amount"]')?.value ?? '0', 10);
      const shields = [...document.querySelectorAll('[data-shield]:checked')].map(x => x.dataset.shield);
      return hostAction({action: a, amount: Number.isFinite(amount) ? amount : 0, shields});
    }
    if (a === 'quiz_mark') return hostAction({action: a, correct: el.dataset.correct === '1'});
    if (['remove', 'mission', 'leave', 'show_code'].includes(a)) return hostAction({action: a, id: el.dataset.id});
    return hostAction({action: a});
  }
  if (role === 'player') {
    if (a === 'toggle_role') { roleOpen = !roleOpen; clearTimeout(roleTimer); if (roleOpen) roleTimer = setTimeout(() => { roleOpen = false; render(); }, 8000); return render(); }
    if (a === 'choose') { chosen = el.dataset.id; return render(); }
    if (a === 'vote') return playerAction({action: 'vote', target: chosen});
    if (a === 'night_mode') { nightMode = el.dataset.mode; return render(); }
    if (a === 'night') return playerAction({action: 'night', mode: nightMode || view.me.conclave?.mine?.mode || 'murder', target: el.dataset.id});
    if (a === 'offer') return playerAction({action: 'offer', answer: el.dataset.answer});
    if (a === 'endgame') return playerAction({action: 'endgame', choice: el.dataset.choice});
    if (a === 'ack') return playerAction({action: 'ack'});
  }
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.rolecard')) { e.preventDefault(); e.target.click(); } });
document.addEventListener('input', e => {
  const d = e.target.dataset;
  if (d.draft) { drafts[d.draft] = e.target.value; if (d.draft === 'lan') { signature = ''; render(); } }
  if (d.shield !== undefined) drafts['shield_' + d.shield] = e.target.checked;
});
document.addEventListener('change', e => {
  if(e.target.matches('[data-guide-accepted]')){guideAccepted=e.target.checked;signature='';render();return;}
  const d = e.target.dataset;
  if (d.setting && role === 'host') {
    const s = {...view.settings};
    if (d.setting === 'ultimatum') s.ultimatum = e.target.checked; else s[d.setting] = parseInt(e.target.value, 10);
    hostAction({action: 'settings', traitors: s.traitors, endgame_at: s.endgame_at, ultimatum: s.ultimatum});
  }
});
document.addEventListener('submit', async e => {
  if (e.target.id !== 'join') return; e.preventDefault();
  const f = new FormData(e.target);
  try {
    const r = await api('/api/traitors/join', {code: f.get('code'), name: f.get('name'), access_code: f.get('access_code')});
    playerKey = r.token; try { localStorage.setItem(STORE, playerKey); } catch {}
    await refresh();
  } catch (err) { notice(err.message); }
});

async function boot() {
  if (role === 'host') {
    try { const b = await api('/api/bootstrap'); hostKey = b.host_key; urls = b.urls || []; drafts.lan = urls[0]; }
    catch (e) { $('#root').innerHTML = `<h1>Open de console op de spel-pc</h1><p class="lead">De spelleidersconsole werkt alleen op de pc waarop Groepsspel draait (via localhost). Spelers gebruiken de QR-code of <b>/verraders/speler</b>.</p>`; return; }
  }
  await refresh();
  setInterval(refresh, role === 'public' ? 1000 : 1300);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
}
boot();

/* Uitleg & draaiboek (gedeeld met de andere telefoonspellen). */
document.addEventListener('click', async e => {
  if (e.target.id === 'sheet' || e.target.closest('[data-close-sheet]')) { $('#sheet').hidden = true; return; }
  if (!e.target.closest('#uitlegBtn')) return;
  try { uitlegData = uitlegData || await api('/api/uitleg'); } catch (err) { return notice(err.message); }
  const u = uitlegData.verraders, list = a => `<ul>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  $('#sheet').innerHTML = `<div class="sheet"><button class="secondary" data-close-sheet style="float:right;padding:7px 12px">Sluiten ✕</button><div class="eyebrow">Uitleg & draaiboek</div><h1>${esc(u.title)}</h1><p class="lead">${esc(u.kort)}</p><p class="small">${esc(u.spelers)} · ${esc(u.duur)}</p><h2>Voorbereiding</h2>${list(u.voorbereiding)}<h2>Spelregels</h2>${list(u.regels)}<h2>Verloop</h2>${list(u.verloop.map(x => x.fase + ': ' + x.wat))}${role !== 'player' ? `<h2>Spelleiderscript</h2><ol>${u.script.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}<h2>Tips</h2>${list(u.tips)}</div>`;
  $('#sheet').hidden = false;
});

/* Online spelserver: QR-codes bevatten de spelkamer, zodat telefoons in dezelfde kamer terechtkomen. */
function roomBase() { const m = document.cookie.match(/(?:^|; )gs_kamer=([A-Z0-9]{6})/); return location.origin + (m ? '/k/' + m[1] : ''); }
