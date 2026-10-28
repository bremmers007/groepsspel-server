/* Rijk van Limburg op één tablet (route #vastgoed).
 * Alles draait lokaal in de browser; de spelstand staat in localStorage van dit apparaat.
 */
(function () {
'use strict';
const V = window.VASTGOED; if (!V) return;
const KEY = 'groepsspel-monopoly', UNDO = 'groepsspel-monopoly-undo';
const PCOL = ['#ff6b6b', '#4dabf7', '#51cf66', '#fcc419', '#cc5de8', '#ff922b'];
let mono = load(), manage = false, focusSquare = null;
function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && V.valid(s) || s?.phase === 'finished' ? s : null; } catch { return null; } }
function store() { try { if (mono) localStorage.setItem(KEY, JSON.stringify(mono)); else localStorage.removeItem(KEY); } catch {} }
function act(a, forced) {
  try {
    const prev = JSON.stringify(mono); mono = V.move(mono, a, forced);
    try { localStorage.setItem(UNDO, prev); } catch {}
    store(); render();
  } catch (e) { if (e.game) toast(e.message); else throw e; }
}
const money = n => '€' + Number(n).toLocaleString('nl-NL');
const B = V.BOARD;

/* catalogus en status: Monopoly is nu speelbaar op één tablet */
const g = GAMES.find(x => x.id === 'monopoly');
if (g) { g.concept = false; g.name = 'Rijk van Limburg'; g.time = '60–120 min'; g.people = '2–6 spelers'; g.stage = 'tablet';
  g.desc = 'Koop straten van Herten tot het Vrijthof, bouw huizen en hotels en laat de anderen huur betalen. Alles op één tablet.'; }
if (typeof GAME_REVIEW === 'object') GAME_REVIEW.monopoly = {status: 'beta', mode: 'Eén tablet · geen server', done: 'Volledig bord met 28 eigendommen, kaarten, gevangenis, veiling, gelijkmatig bouwen, hypotheek, schulden, faillissement, ruilen en eindstand.', todo: 'Praktijktest met een groep op een echte tablet.'};
const prevStatus = developmentStatus; developmentStatus = x => x.id === 'monopoly' ? 'Speelbaar · tabletbord' : prevStatus(x);
const prevCons = isUnderConstruction; isUnderConstruction = x => x.id === 'monopoly' ? false : prevCons(x);
const prevStart = start; start = function (id) { if (id === 'monopoly') { close(); nav('vastgoed'); return; } prevStart(id); };
const prevDetail = detail; detail = function (id) { if (id !== 'monopoly') return prevDetail(id); dialog('Rijk van Limburg', `<p>Speel met 2–6 spelers op één tablet die je rond laat gaan. Het bord loopt van Herten en Swalmen tot het Vrijthof en de Stokstraat.</p><p>Dobbelen, huur, kaarten, de gevangenis, veilingen, huizen en hotels, hypotheken, schulden en faillissement regelt de app. De spelstand blijft op dit apparaat bewaard.</p><div class="hint">Eigen Limburgse groepsvariant, geen officiële uitgave.</div>`, `<button class="btn" data-action="start" data-id="monopoly">Open het bord →</button>`); };

/* ------------------------------------------------------------- weergave */
function cellPos(i) {
  if (i <= 10) return [11, 11 - i];
  if (i <= 20) return [11 - (i - 10), 1];
  if (i <= 30) return [1, 1 + (i - 20)];
  return [1 + (i - 30), 11];
}
function side(i) { return i < 10 ? 'b' : i < 20 ? 'l' : i < 30 ? 't' : 'r'; }
function icon(sq) { return {go: '➜', chance: '?', chest: '🏛', tax: '€', station: '🚆', utility: sq.name.startsWith('Water') ? '💧' : '⚡', jail: '▦', parking: 'P', gotojail: '⛓'}[sq.type] || ''; }
function boardHTML(s) {
  const cells = B.map((sq, i) => {
    const [r, c] = cellPos(i), pr = s.props[i], grp = sq.group ? V.GROUPS[sq.group] : null;
    const tokens = s.players.map((p, k) => !p.bankrupt && p.pos === i ? `<span class="mono-token ${s.turn === k ? 'now' : ''}" style="background:${PCOL[k]}" title="${esc(p.name)}">${esc(p.name[0])}</span>` : '').join('');
    const houses = pr?.houses ? (pr.houses === 5 ? '<span class="mono-hotel"></span>' : '<span class="mono-house"></span>'.repeat(pr.houses)) : '';
    return `<button type="button" class="mono-cell mono-${side(i)} ${['go', 'jail', 'parking', 'gotojail'].includes(sq.type) ? 'corner' : ''} ${pr?.mortgaged ? 'mortgaged' : ''} ${s.landed === i ? 'landed' : ''}" style="grid-row:${r};grid-column:${c};${pr ? `--owner:${PCOL[pr.owner]}` : ''}" data-mono-square="${i}" aria-label="${esc(sq.name)}${pr ? ', van ' + esc(s.players[pr.owner].name) : ''}">
      ${grp ? `<span class="mono-band" style="background:${grp.color}">${houses}</span>` : `<span class="mono-icon">${icon(sq)}</span>`}
      <span class="mono-name">${esc(sq.name)}</span>${sq.price ? `<span class="mono-price">${pr ? `<span class="mono-ownchip" style="background:${PCOL[pr.owner]}">${esc(s.players[pr.owner].name[0])}</span>${pr.mortgaged ? ' hyp.' : ''}` : money(sq.price)}</span>` : sq.amount ? `<span class="mono-price">${money(sq.amount)}</span>` : ''}
      ${tokens ? `<span class="mono-tokens">${tokens}</span>` : ''}</button>`;
  }).join('');
  const center = `<div class="mono-center"><div class="mono-logo">RIJK VAN<small>LIMBURG</small></div>${s.dice ? `<div class="mono-dice"><span>${s.dice[0]}</span><span>${s.dice[1]}</span></div>` : ''}${s.card ? `<div class="mono-card"><b>${s.card.deck === 'chance' ? 'Kans' : 'Dorpskas'}</b>${esc(s.card.text)}</div>` : ''}<ol class="mono-log">${s.log.slice(-5).reverse().map(l => `<li>${esc(l)}</li>`).join('')}</ol></div>`;
  return `<div class="mono-board">${cells}${center}</div>`;
}
function rentTable(i) {
  const sq = B[i];
  if (sq.type === 'street') { const h = V.GROUPS[sq.group].house; return `<table class="mono-rent"><tr><td>Huur</td><td>${money(sq.rent[0])}</td></tr><tr><td>Hele kleur, zonder huizen</td><td>${money(sq.rent[0] * 2)}</td></tr>${[1, 2, 3, 4].map(n => `<tr><td>${n} ${n === 1 ? 'huis' : 'huizen'}</td><td>${money(sq.rent[n])}</td></tr>`).join('')}<tr><td>Hotel</td><td>${money(sq.rent[5])}</td></tr><tr><td>Huis of hotel bouwen</td><td>${money(h)}</td></tr><tr><td>Hypotheek</td><td>${money(sq.price / 2)}</td></tr></table>`; }
  if (sq.type === 'station') return `<table class="mono-rent"><tr><td>1 station</td><td>€25</td></tr><tr><td>2 stations</td><td>€50</td></tr><tr><td>3 stations</td><td>€100</td></tr><tr><td>4 stations</td><td>€200</td></tr><tr><td>Hypotheek</td><td>€100</td></tr></table>`;
  if (sq.type === 'utility') return `<p>Eén nutsbedrijf: 4× de worp. Beide nutsbedrijven: 10× de worp.</p><p>Hypotheek: €75</p>`;
  return '';
}
function playersHTML(s) {
  return `<div class="mono-players">${s.players.map((p, k) => { const own = Object.entries(s.props).filter(([, pr]) => pr.owner === k);
    return `<div class="mono-player ${s.turn === k && s.phase !== 'finished' ? 'now' : ''} ${p.bankrupt ? 'out' : ''}" style="--pc:${PCOL[k]}"><b>${esc(p.name)}</b><span class="mono-cash">${p.bankrupt ? 'failliet' : money(p.cash)}</span><small>${own.length} ${own.length === 1 ? 'eigendom' : 'eigendommen'}${p.inJail ? ' · in de gevangenis' : ''}${p.jailCards.length ? ' · ' + p.jailCards.length + ' vrijkaart' : ''}</small><span class="mono-swatches">${own.map(([i]) => `<i style="background:${B[i].group ? V.GROUPS[B[i].group].color : '#cfd6e6'}" title="${esc(B[i].name)}"></i>`).join('')}</span></div>`; }).join('')}</div>`;
}
function manageHTML(s, pid) {
  const own = Object.entries(s.props).filter(([, pr]) => pr.owner === pid).map(([i]) => +i).sort((a, b) => a - b);
  if (!own.length) return '<p class="micro">Nog geen eigendommen.</p>';
  return `<div class="mono-manage">${own.map(i => { const sq = B[i], pr = s.props[i], full = sq.group && V.ownsGroup(s, pid, sq.group);
    const gh = sq.group ? V.groupSquares(sq.group).map(j => s.props[j]?.houses || 0) : [0], canBuild = pr.houses <= Math.min(...gh) && !V.groupSquares(sq.group || '').some(j => s.props[j]?.mortgaged), canSell = pr.houses >= Math.max(...gh);
    return `<div class="mono-own"><span class="mono-dot" style="background:${sq.group ? V.GROUPS[sq.group].color : '#cfd6e6'}"></span><b>${esc(sq.name)}</b><small>${pr.mortgaged ? 'hypotheek' : pr.houses === 5 ? 'hotel' : pr.houses ? pr.houses + ' huis' + (pr.houses > 1 ? 'zen' : '') : full ? 'hele kleur' : ''}</small><span class="mono-own-actions">
      ${sq.type === 'street' && full && canBuild && pr.houses < 5 && s.phase !== 'debt' ? `<button class="mini" data-mono="build" data-sq="${i}">+ ${pr.houses === 4 ? 'hotel' : 'huis'} ${money(V.GROUPS[sq.group].house)}</button>` : ''}
      ${pr.houses && canSell ? `<button class="mini ghost" data-mono="sell" data-sq="${i}">− verkoop ${money(V.GROUPS[sq.group].house / 2)}</button>` : ''}
      ${!pr.mortgaged && !pr.houses ? `<button class="mini ghost" data-mono="mortgage" data-sq="${i}">hypotheek +${money(sq.price / 2)}</button>` : ''}
      ${pr.mortgaged && s.phase !== 'debt' ? `<button class="mini ghost" data-mono="unmortgage" data-sq="${i}">aflossen ${money(Math.ceil(sq.price / 2 * 1.1))}</button>` : ''}</span></div>`; }).join('')}</div>`;
}
function actionsHTML(s) {
  const p = s.players[s.turn];
  if (s.phase === 'finished') return `<h2>Einde van het spel</h2><p>${esc(s.result.reason)}</p><ol class="mono-rank">${s.result.ranking.map(r => `<li><b>${esc(r.name)}</b> ${r.bankrupt ? 'failliet' : money(r.worth)}</li>`).join('')}</ol><p class="micro">Vermogen = contant geld + aankoopprijs van eigendommen (de helft bij hypotheek) + huizen en hotels.</p><div class="actions"><button class="btn" data-mono="new">Nieuw spel</button></div>`;
  let h = `<div class="mono-turn" style="--pc:${PCOL[s.turn]}"><span>Aan de beurt</span><b>${esc(p.name)}</b><span>${money(p.cash)}</span></div>`;
  if (s.phase === 'roll') {
    h += p.inJail ? `<p>${esc(p.name)} zit in de gevangenis (poging ${p.jailTries + 1}/3). Gooi dubbel, betaal €50 of gebruik een vrijkaart.</p><div class="actions"><button class="btn" data-mono="roll">Gooi voor dubbel</button><button class="btn secondary" data-mono="jail_pay">Betaal €50</button>${p.jailCards.length ? '<button class="btn secondary" data-mono="jail_card">Gebruik vrijkaart</button>' : ''}</div>`
      : `<div class="actions"><button class="btn mono-big" data-mono="roll">${s.doubles ? 'Dubbel! Gooi nog een keer' : 'Gooi de dobbelstenen'} 🎲</button></div>`;
  } else if (s.phase === 'buy') {
    const sq = B[s.offer];
    h += `<div class="mono-deed" style="--g:${sq.group ? V.GROUPS[sq.group].color : '#cfd6e6'}"><span>${sq.type === 'station' ? 'Station' : sq.type === 'utility' ? 'Nutsbedrijf' : V.GROUPS[sq.group].name}</span><h3>${esc(sq.name)}</h3>${rentTable(s.offer)}</div><div class="actions"><button class="btn" data-mono="buy" ${p.cash < sq.price ? 'disabled' : ''}>Koop voor ${money(sq.price)}</button><button class="btn secondary" data-mono="decline">Niet kopen · veilen</button></div>${p.cash < sq.price ? '<p class="micro">Te weinig contant geld. Neem eerst een hypotheek of laat het veilen.</p>' : ''}`;
  } else if (s.phase === 'auction') {
    const a = s.auction, who = a.active[a.at], sq = B[a.square];
    h += `<h3>Veiling: ${esc(sq.name)}</h3><p>Hoogste bod: <b>${money(a.bid)}</b>${a.bidder !== null ? ' van ' + esc(s.players[a.bidder].name) : ''}</p><div class="mono-turn" style="--pc:${PCOL[who]}"><span>Bieden</span><b>${esc(s.players[who].name)}</b><span>${money(s.players[who].cash)}</span></div><div class="actions">${[10, 50, 100].map(r => `<button class="btn" data-mono="bid" data-raise="${r}" ${a.bid + r > s.players[who].cash ? 'disabled' : ''}>+${money(r)}</button>`).join('')}<button class="btn secondary" data-mono="pass">Pas</button></div><p class="micro">Nog mee: ${a.active.map(i => esc(s.players[i].name)).join(', ')}</p>`;
  } else if (s.phase === 'debt') {
    const d = s.debts[0], dp = s.players[d.player], total = s.debts.filter(x => x.player === d.player).reduce((t, x) => t + x.amount, 0);
    h += `<div class="mono-alert"><b>${esc(dp.name)}</b> moet ${money(d.amount)} betalen${d.creditor !== null ? ' aan ' + esc(s.players[d.creditor].name) : ' aan de bank'}${total > d.amount ? ` (in totaal ${money(total)})` : ''}. Contant: ${money(dp.cash)}.</div><p class="micro">Verkoop huizen of neem een hypotheek. Lukt het niet, dan ga je failliet.</p>${manageHTML(s, d.player)}<div class="actions"><button class="btn" data-mono="pay_debt" ${dp.cash < d.amount ? 'disabled' : ''}>Betalen</button><button class="btn danger" data-mono="bankrupt">Failliet gaan</button></div>`;
  } else if (s.phase === 'done') {
    h += `<div class="actions"><button class="btn mono-big" data-mono="end">Beurt beëindigen → ${esc(nextName(s))}</button></div>`;
  }
  if (['roll', 'done'].includes(s.phase)) h += `<details class="mono-details" ${manage ? 'open' : ''} data-mono-manage><summary>Bezit van ${esc(p.name)} beheren · bouwen · hypotheek</summary>${manageHTML(s, s.turn)}</details><div class="actions"><button class="btn secondary" data-mono="trade">Ruilen</button></div>`;
  return h;
}
function nextName(s) { let t = s.turn; do { t = (t + 1) % s.players.length; } while (s.players[t].bankrupt); return s.players[t].name; }
function setupHTML() {
  const names = (state.teams || []).map(t => t.name).slice(0, 6);
  return `<div class="page-heading"><div class="eyebrow">Tablet op tafel · 2–6 spelers</div><h1>Rijk van Limburg</h1><p>Koop straten van Herten tot het Vrijthof, bouw huizen en hotels en laat de anderen huur betalen. De app regelt dobbelstenen, kaarten, huur, veilingen en de bank.</p></div>
  <section class="panel"><h2>Wie spelen er mee?</h2><label class="field" for="monoNames">Eén speler per regel (2–6)</label><textarea class="input" id="monoNames" rows="6" placeholder="Anna&#10;Bram&#10;Cas">${esc(names.join('\n'))}</textarea>
  <label class="field" for="monoRounds">Speelduur</label><select class="input" id="monoRounds"><option value="0">Tot er één speler over is (klassiek, 2–3 uur)</option><option value="15">Kort: 15 rondes (± 60 min), daarna wint het hoogste vermogen</option><option value="25" selected>Normaal: 25 rondes (± 90 min)</option><option value="40">Lang: 40 rondes (± 2 uur)</option></select>
  <div class="actions"><button class="btn" data-mono="create">Spel starten →</button><button class="btn secondary" data-mono="rules">Spelregels</button></div><p class="micro">Startgeld €1.500. Langs Start: €200. Alles wordt alleen op deze tablet bewaard.</p></section>`;
}
function rulesHTML() {
  return `<h3>Doel</h3><p>Word de rijkste speler: koop eigendommen, bouw huizen en hotels en laat anderen huur betalen. Wie zijn schulden niet meer kan betalen, gaat failliet. Bij een afgesproken aantal rondes wint het hoogste vermogen.</p>
  <h3>Een beurt</h3><ul><li>Gooi met twee dobbelstenen en loop vooruit. Langs Start: €200.</li><li>Onbezet eigendom: koop het voor de prijs, of het wordt geveild onder alle spelers (ook jij).</li><li>Van een ander: betaal huur. Hele kleur zonder huizen: dubbele huur. Geen huur bij een hypotheek.</li><li>Dubbel gegooid? Nog een keer. Drie keer dubbel: naar de gevangenis.</li><li>Kans en Dorpskas: de app trekt een kaart en voert hem uit.</li></ul>
  <h3>Bouwen</h3><ul><li>Bouwen kan als je alle straten van een kleur hebt en er geen hypotheek op zit.</li><li>Gelijkmatig: een straat mag maximaal één huis meer hebben dan de andere in die kleur. Na vier huizen volgt een hotel.</li><li>De bank heeft 32 huizen en 12 hotels.</li><li>Verkopen levert de helft van de bouwprijs op.</li></ul>
  <h3>Gevangenis</h3><ul><li>Je komt erin via het vak 'Naar de gevangenis', een kaart of drie keer dubbel.</li><li>Eruit: gooi dubbel (maximaal drie pogingen), betaal €50 of gebruik een vrijkaart. Na drie mislukte pogingen betaal je €50 en loop je verder.</li><li>Ook in de gevangenis ontvang je huur.</li></ul>
  <h3>Geld tekort</h3><ul><li>Kun je niet betalen, verkoop dan huizen of neem een hypotheek (de helft van de prijs). Aflossen kost de hypotheek plus 10%.</li><li>Lukt het niet, dan ga je failliet. Je bezit gaat naar wie je geld schuldig was, of terug naar de bank.</li></ul>
  <h3>Ruilen</h3><p>Aan het begin of eind van je beurt kun je eigendommen en geld ruilen met een andere speler. Straten in een kleur waarop huizen staan, ruil je niet. Beide spelers bevestigen op de tablet.</p>
  <p class="micro">Eigen Limburgse groepsvariant met de vertrouwde regels. Vrij parkeren levert niets op.</p>`;
}
function page() {
  if (!mono) return setupHTML();
  return `<div class="mono-wrap"><div class="mono-head"><div><div class="eyebrow">Rijk van Limburg${mono.rules.maxRounds ? ` · ronde ${Math.min(mono.round, mono.rules.maxRounds)} van ${mono.rules.maxRounds}` : ` · ronde ${mono.round}`}</div></div><div class="actions"><button class="btn secondary small" data-mono="rules">Spelregels</button><button class="btn secondary small" data-mono="undo">Vorige stap herstellen</button>${mono.phase !== 'finished' ? '<button class="btn secondary small" data-mono="finish">Spel beëindigen</button>' : ''}</div></div>
  <div class="mono-layout">${boardHTML(mono)}<aside class="mono-side">${actionsHTML(mono)}${playersHTML(mono)}</aside></div></div>`;
}

/* --------------------------------------------------------------- routes */
const prevRender = render;
render = function () {
  if (route === 'vastgoed') { document.title = 'Groepsspel — Rijk van Limburg'; $('#app').innerHTML = header() + `<main class="wrap mono-main">${page()}${footer()}</main>`; if (typeof applyLocale === 'function') applyLocale(); if (typeof showConnectionStatus === 'function') showConnectionStatus(); return; }
  prevRender();
};

/* -------------------------------------------------------------- klikken */
document.addEventListener('toggle', e => { if (e.target.matches?.('[data-mono-manage]')) manage = e.target.open; }, true);
document.addEventListener('click', e => {
  const sqEl = e.target.closest('[data-mono-square]');
  if (sqEl && route === 'vastgoed' && mono) { const i = +sqEl.dataset.monoSquare, sq = B[i], pr = mono.props[i];
    dialog(sq.name, `${sq.group ? `<p><span class="mono-dot" style="background:${V.GROUPS[sq.group].color}"></span> ${V.GROUPS[sq.group].name}</p>` : ''}${sq.price ? `<p>Prijs ${money(sq.price)} · ${pr ? 'eigendom van <b>' + esc(mono.players[pr.owner].name) + '</b>' + (pr.mortgaged ? ' (hypotheek)' : '') + (pr.houses ? ` · ${pr.houses === 5 ? 'hotel' : pr.houses + ' huis/huizen'}` : '') : 'nog te koop'}</p>${rentTable(i)}` : sq.type === 'tax' ? `<p>Betaal ${money(sq.amount)} aan de bank.</p>` : `<p>${{go: 'Kom je langs of op Start, dan ontvang je €200.', jail: 'Op bezoek: er gebeurt niets. Zit je erin, dan probeer je dubbel te gooien.', parking: 'Vrij parkeren: er gebeurt niets.', gotojail: 'Ga direct naar de gevangenis.', chance: 'Trek een Kans-kaart.', chest: 'Trek een Dorpskas-kaart.'}[sq.type] || ''}</p>`}`, `<button class="btn" data-action="close">Sluiten</button>`); return; }
  const el = e.target.closest('[data-mono]'); if (!el || el.disabled) return;
  const a = el.dataset.mono;
  if (a === 'rules') { dialog('Spelregels · Rijk van Limburg', rulesHTML(), `<button class="btn" data-action="close">Sluiten</button>`); return; }
  if (a === 'create') {
    const names = $('#monoNames').value.split('\n').map(x => x.trim()).filter(Boolean);
    try { mono = V.create(names, {maxRounds: parseInt($('#monoRounds').value, 10) || 0}); store(); try { localStorage.removeItem(UNDO); } catch {} render(); } catch (err) { if (err.game) toast(err.message); else throw err; }
    return;
  }
  if (a === 'new') { if (!confirm('Een nieuw spel beginnen? De huidige stand verdwijnt.')) return; mono = null; store(); render(); return; }
  if (a === 'undo') { try { const prev = JSON.parse(localStorage.getItem(UNDO) || 'null'); if (!prev) return toast('Er is geen stap om te herstellen.'); mono = prev; localStorage.removeItem(UNDO); store(); render(); toast('Vorige stap hersteld.'); } catch { toast('Herstellen lukt niet.'); } return; }
  if (a === 'finish') { if (!confirm('Het spel nu beëindigen? Het hoogste vermogen wint.')) return; act({type: 'finish'}); return; }
  if (a === 'bankrupt') { if (!confirm('Failliet gaan? Al je bezit gaat naar de schuldeiser of de bank.')) return; act({type: 'bankrupt'}); return; }
  if (a === 'trade') return tradeDialog();
  if (a === 'trade_go') return tradeConfirm();
  if (['build', 'sell', 'mortgage', 'unmortgage'].includes(a)) { act({type: a, square: +el.dataset.sq}); return; }
  if (a === 'bid') { act({type: 'bid', raise: +el.dataset.raise}); return; }
  act({type: a});
});

function tradeDialog() {
  const s = mono, me = s.turn, others = s.players.map((p, k) => k).filter(k => k !== me && !s.players[k].bankrupt);
  const list = pid => Object.entries(s.props).filter(([, pr]) => pr.owner === pid).map(([i]) => +i).filter(i => !(B[i].type === 'street' && V.groupSquares(B[i].group).some(j => s.props[j]?.houses)));
  const boxes = (pid, name) => list(pid).map(i => `<label class="mono-check"><input type="checkbox" name="${name}" value="${i}"> <span class="mono-dot" style="background:${B[i].group ? V.GROUPS[B[i].group].color : '#cfd6e6'}"></span>${esc(B[i].name)}${s.props[i].mortgaged ? ' (hypotheek)' : ''}</label>`).join('') || '<p class="micro">Geen ruilbaar bezit.</p>';
  dialog('Ruilen', `<label class="field" for="tradeWith">Ruilen met</label><select class="input" id="tradeWith">${others.map(k => `<option value="${k}">${esc(s.players[k].name)}</option>`).join('')}</select>
    <div class="mono-trade"><div><h3>${esc(s.players[me].name)} geeft</h3>${boxes(me, 'give')}<label class="field">Geld</label><input class="input" id="cashGive" type="number" min="0" step="10" value="0"></div>
    <div><h3>en krijgt</h3>${others.map(k => `<div class="trade-for" data-for="${k}" ${k === others[0] ? '' : 'hidden'}>${boxes(k, 'get' + k)}</div>`).join('')}<label class="field">Geld</label><input class="input" id="cashGet" type="number" min="0" step="10" value="0"></div></div>
    <p class="micro">Geef de tablet aan de andere speler om het voorstel te bevestigen.</p>`, `<button class="btn" data-mono="trade_go">Beide spelers akkoord · ruilen</button><button class="btn secondary" data-action="close">Annuleren</button>`);
  $('#tradeWith').addEventListener('change', ev => document.querySelectorAll('.trade-for').forEach(d => d.hidden = d.dataset.for !== ev.target.value));
}
function tradeConfirm() {
  const other = +$('#tradeWith').value;
  const give = [...document.querySelectorAll('input[name=give]:checked')].map(x => +x.value);
  const get = [...document.querySelectorAll(`input[name=get${other}]:checked`)].map(x => +x.value);
  const cashGive = Math.max(0, parseInt($('#cashGive').value || '0', 10)), cashGet = Math.max(0, parseInt($('#cashGet').value || '0', 10));
  if (!confirm(`${mono.players[other].name}: ga je akkoord met deze ruil?`)) return;
  close(); act({type: 'trade', with: other, give, get, cashGive, cashGet});
}
})();
