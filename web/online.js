'use strict';
/* Groepsspel online: spelkamer maken, meedoen en de spellen van de kamer openen. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const q = new URLSearchParams(location.search);
const GAMES = [
  ['/verraders', '/verraders/speler', 'Het Verraad', 'Geheime rollen en de ronde tafel'],
  ['/spel/moord', '/spel/moord/speler', 'Het Moordspel', 'Personages, bewijs en een ontknoping'],
  ['/spel/missies', '/spel/missies/speler', 'Geheime missies', 'Stiekeme opdrachten op je telefoon'],
  ['/spel/opgejaagd', '/spel/opgejaagd/speler', 'Opgejaagd', 'Jagers tegen vluchtteams'],
  ['/spel/bingo', '/spel/bingo/speler', 'Muziekbingo', 'Eigen bingokaart per team'],
  ['/spel/holland', '/spel/holland/speler', 'Echt Hollands!', 'Tv-show met twee teams'],
  ['/spel/crazy88', '/spel/crazy88/speler', 'Gekke 88', 'Foto- en video-opdrachten'],
  ['/spel/smokkel', '/spel/smokkel/speler', 'Smokkeltocht', 'Buitenspel met posten en douane'],
  ['/spel/stratego', '/spel/stratego/speler', 'Rangen & Vlaggen', 'Buitenspel met geheime rangen'],
  ['/shows', '/controller', 'Spelshows', 'Vakkenstrijd, De Bolleboos en Hitlijn'],
  ['/host', '/team', 'Quiz & buzzer', 'Pubquiz, Buzzerquiz, Halve Minuut, Stadskwis'],
];
async function api(path, body) {
  const r = await fetch(path, {method: body ? 'POST' : 'GET', cache: 'no-store', headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined});
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Er ging iets mis.'); return d;
}
function qr(url) { try { const c = qrcode(0, 'M'); c.addData(url); c.make(); return `<div class="qr">${c.createImgTag(6, 8, 'QR-code om mee te doen')}</div>`; } catch { return ''; } }
function start() {
  return `<h1>Samen spelen, zonder pc.</h1><p class="lead">Maak een spelkamer voor jullie groep. Iedereen doet mee met de eigen telefoon via mobiel internet of wifi. Een spelkamer blijft 48 uur na het laatste gebruik bewaard.</p>
  ${q.get('fout') === 'kamer' ? '<p class="warn">Die spelkamer bestaat niet (meer). Controleer de code.</p>' : ''}${q.get('terug') ? '<p class="warn">Maak eerst een spelkamer of doe mee met een code.</p>' : ''}
  <div class="box"><h2>Ik ben de spelleider</h2><p>Maak een nieuwe spelkamer. Je krijgt een code om te delen en een beheerlink.</p><button class="btn" id="nieuw">Nieuwe spelkamer →</button></div>
  <div class="box"><h2>Ik doe mee</h2><div class="row"><input id="code" maxlength="6" autocomplete="off" placeholder="CODE"><button class="btn ghost" id="mee">Meedoen →</button></div><p class="small">Of scan de QR-code van de spelleider.</p></div>
  <div class="box"><h2>Alleen op één tablet?</h2><p>Bordspellen en quizavonden op één apparaat werken ook zonder spelkamer.</p><a class="btn ghost" href="/app/">Open de app →</a></div>`;
}
function room(d) {
  const host = d.host, active = Object.values(d.games || {}).some(g => g.players);
  let html = `<p class="small">Spelkamer</p><div class="code">${esc(d.room)}</div>`;
  if (host) {
    html += `<div class="box"><h2>Jij bent de spelleider</h2><p>Open hieronder een spel. In het spel staat een QR-code voor de spelers; die brengt hen automatisch in deze kamer.</p><div class="grid">${GAMES.map(([h, , t, s]) => `<a href="${h}"><b>${esc(t)}</b><small>${esc(s)}</small></a>`).join('')}</div><p class="row" style="margin-top:14px"><a class="btn ghost" href="/app/">Groepsspel-app (tablet en spelshows) →</a></p></div>
    <div class="box"><h2>Spelers uitnodigen</h2><div class="row">${qr(d.join)}<div><p>Link voor spelers:</p><p class="mono">${esc(d.join)}</p><button class="btn ghost" id="deel">Link delen</button></div></div></div>
    <div class="box"><h2>Beheer op een ander apparaat</h2><p class="small">Wil je de kamer ook vanaf een ander apparaat leiden, bijvoorbeeld een laptop aan de beamer? Open daar de beheerlink. <b>Deel deze link niet met spelers.</b></p><button class="btn ghost" id="beheer">Beheerlink tonen</button><p class="mono" id="beheerlink"></p></div>`;
  } else {
    html += `<div class="box"><h2>Kies je spel</h2><p>Meestal scan je de QR-code op het scherm van de spelleider. Weet je welk spel jullie spelen? Kies het hier.</p><div class="grid">${GAMES.map(([, p, t, s]) => `<a href="${p}"><b>${esc(t)}</b><small>${esc(s)}</small></a>`).join('')}</div></div>`;
  }
  html += `<p><button class="btn ghost" id="verlaat">Kamer verlaten</button></p>`;
  return html;
}
async function render() {
  let d = {room: null};
  try { d = await api('/api/kamer'); } catch {}
  $('#root').innerHTML = d.room ? room(d) : start();
  $('#nieuw')?.addEventListener('click', async () => {
    try { const r = await api('/api/kamer/nieuw', {}); const back = q.get('terug'); if (back && /^\/[a-z]/.test(back)) location.href = back; else location.href = '/kamer'; }
    catch (e) { alert(e.message); }
  });
  const go = () => { const c = ($('#code')?.value || '').trim().toUpperCase(); if (/^[A-Z2-9]{6}$/.test(c)) location.href = '/k/' + c; };
  $('#mee')?.addEventListener('click', go); $('#code')?.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  $('#deel')?.addEventListener('click', async () => { try { await navigator.share({title: 'Doe mee met Groepsspel', url: d.join}); } catch { try { await navigator.clipboard.writeText(d.join); alert('Link gekopieerd.'); } catch {} } });
  $('#beheer')?.addEventListener('click', () => { $('#beheerlink').textContent = d.beheer || ''; });
  $('#verlaat')?.addEventListener('click', async () => { if (!confirm('Deze spelkamer verlaten op dit apparaat?')) return; await api('/api/kamer/verlaten', {}); location.href = '/'; });
}
render();
