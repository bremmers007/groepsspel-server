/* Rijk van Limburgse groepsvariant voor één tablet.
 * Zuivere spelmotor zonder DOM of netwerk: create(), move(), valid(), ranking().
 * Dobbelstenen en kaarten gebruiken een zaad (seed) in de spelstand, zodat herstel en tests reproduceerbaar zijn.
 * Eigen Limburgse uitwerking; geen officiële uitgave.
 */
(function (root) {
'use strict';
const START_CASH = 1500, PASS_GO = 200, JAIL = 10, JAIL_FINE = 50, HOUSES = 32, HOTELS = 12;
const RENT = {
  60: [2, 10, 30, 90, 160, 250], 61: [4, 20, 60, 180, 320, 450], 100: [6, 30, 90, 270, 400, 550], 120: [8, 40, 100, 300, 450, 600],
  140: [10, 50, 150, 450, 625, 750], 160: [12, 60, 180, 500, 700, 900], 180: [14, 70, 200, 550, 750, 950], 200: [16, 80, 220, 600, 800, 1000],
  220: [18, 90, 250, 700, 875, 1050], 240: [20, 100, 300, 750, 925, 1100], 260: [22, 110, 330, 800, 975, 1150], 280: [24, 120, 360, 850, 1025, 1200],
  300: [26, 130, 390, 900, 1100, 1275], 320: [28, 150, 450, 1000, 1200, 1400], 350: [35, 175, 500, 1100, 1300, 1500], 400: [50, 200, 600, 1400, 1700, 2000]};
const GROUPS = {
  bruin: {name: 'Bruin', color: '#8b5a3c', house: 50}, lichtblauw: {name: 'Lichtblauw', color: '#8fd3ff', house: 50},
  roze: {name: 'Roze', color: '#ff7ac8', house: 100}, oranje: {name: 'Oranje', color: '#ff9f43', house: 100},
  rood: {name: 'Rood', color: '#ff5470', house: 150}, geel: {name: 'Geel', color: '#ffd84d', house: 150},
  groen: {name: 'Groen', color: '#3ccf8e', house: 200}, donkerblauw: {name: 'Donkerblauw', color: '#4a6cff', house: 200}};
const st = (name, group, price, rentKey) => ({type: 'street', name, group, price, rent: RENT[rentKey || price]});
const BOARD = [
  {type: 'go', name: 'Start'}, st('Herten', 'bruin', 60), {type: 'chest', name: 'Dorpskas'}, st('Swalmen', 'bruin', 60, 61), {type: 'tax', name: 'Inkomstenbelasting', amount: 200},
  {type: 'station', name: 'Station Roermond', price: 200}, st('Echt', 'lichtblauw', 100), {type: 'chance', name: 'Kans'}, st('Susteren', 'lichtblauw', 100), st('Stein', 'lichtblauw', 120),
  {type: 'jail', name: 'Gevangenis · op bezoek'}, st('Born', 'roze', 140), {type: 'utility', name: 'Waterleiding Limburg', price: 150}, st('Beek', 'roze', 140), st('Meerssen', 'roze', 160),
  {type: 'station', name: 'Station Sittard', price: 200}, st('Brunssum', 'oranje', 180), {type: 'chest', name: 'Dorpskas'}, st('Kerkrade', 'oranje', 180), st('Landgraaf', 'oranje', 200),
  {type: 'parking', name: 'Vrij parkeren'}, st('Weert', 'rood', 220), {type: 'chance', name: 'Kans'}, st('Venray', 'rood', 220), st('Horst', 'rood', 240),
  {type: 'station', name: 'Station Venlo', price: 200}, st('Valkenburg', 'geel', 260), st('Gulpen', 'geel', 260), {type: 'utility', name: 'Energiebedrijf Limburg', price: 150}, st('Vaals', 'geel', 280),
  {type: 'gotojail', name: 'Naar de gevangenis'}, st('Thorn', 'groen', 300), st('Margraten', 'groen', 300), {type: 'chest', name: 'Dorpskas'}, st('Heerlen', 'groen', 320),
  {type: 'station', name: 'Station Maastricht', price: 200}, {type: 'chance', name: 'Kans'}, st('Vrijthof', 'donkerblauw', 350), {type: 'tax', name: 'Toeristenbelasting', amount: 100}, st('Stokstraat', 'donkerblauw', 400)];
const OWNABLE = BOARD.map((b, i) => ['street', 'station', 'utility'].includes(b.type) ? i : -1).filter(i => i >= 0);
const CHANCE = [
  {text: 'Ga naar Start en ontvang €200.', go: 0}, {text: 'Reis naar het Vrijthof. Kom je langs Start, ontvang dan €200.', go: 37},
  {text: 'Ga naar Valkenburg. Kom je langs Start, ontvang dan €200.', go: 26}, {text: 'Ga naar Born. Kom je langs Start, ontvang dan €200.', go: 11},
  {text: 'Ga naar het dichtstbijzijnde station. Is het van iemand, betaal dan dubbele huur.', nearest: 'station'},
  {text: 'Ga naar het dichtstbijzijnde station. Is het van iemand, betaal dan dubbele huur.', nearest: 'station'},
  {text: 'Ga naar het dichtstbijzijnde nutsbedrijf. Is het van iemand, betaal dan 10× je worp.', nearest: 'utility'},
  {text: 'De bank keert een dividend uit: ontvang €50.', cash: 50}, {text: 'Verlaat de gevangenis zonder te betalen. Bewaar deze kaart.', jailCard: true},
  {text: 'Ga drie plaatsen terug.', back: 3}, {text: 'Ga direct naar de gevangenis. Je komt niet langs Start.', jail: true},
  {text: 'Onderhoud aan al je panden: betaal €25 per huis en €100 per hotel.', repairs: [25, 100]},
  {text: 'Snelheidsboete op de A2: betaal €15.', cash: -15}, {text: 'Neem de trein naar Station Roermond. Kom je langs Start, ontvang dan €200.', go: 5},
  {text: 'Je bent gekozen tot prins carnaval: betaal iedere speler €50.', each: -50}, {text: 'Je bouwlening vervalt: ontvang €150.', cash: 150}];
const CHEST = [
  {text: 'Ga naar Start en ontvang €200.', go: 0}, {text: 'Rekenfout van de bank in jouw voordeel: ontvang €200.', cash: 200},
  {text: 'Rekening van de huisarts: betaal €50.', cash: -50}, {text: 'Verkoop van vlaaien: ontvang €50.', cash: 50},
  {text: 'Verlaat de gevangenis zonder te betalen. Bewaar deze kaart.', jailCard: true}, {text: 'Ga direct naar de gevangenis. Je komt niet langs Start.', jail: true},
  {text: 'Vakantiegeld: ontvang €100.', cash: 100}, {text: 'Teruggave belasting: ontvang €20.', cash: 20},
  {text: 'Je bent jarig: ontvang €10 van iedere speler.', each: 10}, {text: 'Levensverzekering keert uit: ontvang €100.', cash: 100},
  {text: 'Ziekenhuiskosten: betaal €100.', cash: -100}, {text: 'Schoolgeld: betaal €50.', cash: -50},
  {text: 'Je advies wordt betaald: ontvang €25.', cash: 25}, {text: 'Straatwerkzaamheden: betaal €40 per huis en €115 per hotel.', repairs: [40, 115]},
  {text: 'Tweede prijs bij de schoonheidswedstrijd op de kermis: ontvang €10.', cash: 10}, {text: 'Je erft €100.', cash: 100}];

/* --------------------------------------------------------------- hulpjes */
const clone = s => JSON.parse(JSON.stringify(s));
function rand(s) { s.seed = (Math.imul(s.seed ^ (s.seed >>> 15), 2246822507) + 0x9e3779b9) >>> 0; let t = s.seed; t = Math.imul(t ^ (t >>> 13), 3266489909); return ((t ^ (t >>> 16)) >>> 0) / 4294967296; }
function shuffle(s, n) { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand(s) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const err = m => { const e = new Error(m); e.game = true; throw e; };
const groupSquares = g => BOARD.map((b, i) => b.group === g ? i : -1).filter(i => i >= 0);
const owner = (s, i) => s.props[i] ? s.props[i].owner : null;
const alive = s => s.players.filter(p => !p.bankrupt);
function log(s, text) { s.log.push(text); if (s.log.length > 60) s.log.shift(); }
function cur(s) { return s.players[s.turn]; }
function ownsGroup(s, pid, g) { return groupSquares(g).every(i => owner(s, i) === pid); }
function housesUsed(s) { let h = 0, H = 0; for (const p of Object.values(s.props)) { if (p.houses === 5) H++; else h += p.houses; } return [h, H]; }

function rentFor(s, i, diceTotal, cardMultiplier) {
  const sq = BOARD[i], p = s.props[i];
  if (!p || p.mortgaged) return 0;
  if (sq.type === 'street') {
    if (p.houses > 0) return sq.rent[p.houses];
    const groupMortgaged = groupSquares(sq.group).some(j => s.props[j]?.mortgaged);
    return ownsGroup(s, p.owner, sq.group) && !groupMortgaged ? sq.rent[0] * 2 : sq.rent[0];
  }
  if (sq.type === 'station') {
    const n = OWNABLE.filter(j => BOARD[j].type === 'station' && owner(s, j) === p.owner).length;
    return 25 * 2 ** (n - 1) * (cardMultiplier || 1);
  }
  if (sq.type === 'utility') {
    const n = OWNABLE.filter(j => BOARD[j].type === 'utility' && owner(s, j) === p.owner).length;
    return diceTotal * (cardMultiplier ? 10 : n === 2 ? 10 : 4);
  }
  return 0;
}

/* Betaal of maak schuld. creditor: spelerindex of null (bank). */
function charge(s, pid, amount, creditor, reason) {
  const p = s.players[pid];
  if (amount <= 0) return;
  if (p.cash >= amount) {
    p.cash -= amount; if (creditor !== null && creditor !== undefined) s.players[creditor].cash += amount;
    log(s, `${p.name} betaalt €${amount}${creditor !== null && creditor !== undefined ? ' aan ' + s.players[creditor].name : ''}${reason ? ' (' + reason + ')' : ''}.`);
    return;
  }
  s.debts.push({player: pid, amount, creditor: creditor ?? null, reason: reason || ''});
  if (!s.phaseBeforeDebt) s.phaseBeforeDebt = s.phase;
  s.phase = 'debt';
  log(s, `${p.name} moet €${amount} betalen${reason ? ' (' + reason + ')' : ''} maar heeft €${p.cash}. Verkoop huizen of neem een hypotheek.`);
}

function sendToJail(s, pid) {
  const p = s.players[pid]; p.pos = JAIL; p.inJail = true; p.jailTries = 0; s.doubles = 0; s.mayRollAgain = false;
  log(s, `${p.name} gaat naar de gevangenis.`);
}

function moveTo(s, pid, target, collect) {
  const p = s.players[pid];
  if (collect && target < p.pos) { p.cash += PASS_GO; log(s, `${p.name} komt langs Start: +€${PASS_GO}.`); }
  p.pos = target;
}

function land(s, pid, diceTotal, cardMultiplier) {
  const p = s.players[pid], i = p.pos, sq = BOARD[i];
  s.landed = i;
  if (sq.type === 'go' || sq.type === 'jail' || sq.type === 'parking') return;
  if (sq.type === 'gotojail') { sendToJail(s, pid); return; }
  if (sq.type === 'tax') { charge(s, pid, sq.amount, null, sq.name); return; }
  if (sq.type === 'chance' || sq.type === 'chest') { drawCard(s, pid, sq.type, diceTotal); return; }
  const own = owner(s, i);
  if (own === null) { s.phase = 'buy'; s.offer = i; return; }
  if (own === pid) return;
  if (s.players[own].bankrupt) return;
  const rent = rentFor(s, i, diceTotal, cardMultiplier);
  if (s.props[i].mortgaged) { log(s, `${sq.name} heeft een hypotheek: geen huur.`); return; }
  if (s.players[own].inJail && s.rules.noRentInJail) { log(s, `${s.players[own].name} zit in de gevangenis: geen huur.`); return; }
  charge(s, pid, rent, own, 'huur ' + sq.name);
}

function drawCard(s, pid, deck, diceTotal) {
  const key = deck === 'chance' ? 'chanceDeck' : 'chestDeck', cards = deck === 'chance' ? CHANCE : CHEST;
  if (!s[key].length) s[key] = shuffle(s, cards.length).filter(c => !s.players.some(p => p.jailCards.includes(deck + ':' + c)));
  const idx = s[key].shift(), c = cards[idx], p = s.players[pid];
  s.card = {deck, text: c.text};
  log(s, `${p.name} trekt ${deck === 'chance' ? 'Kans' : 'Dorpskas'}: ${c.text}`);
  if (c.jailCard) { p.jailCards.push(deck + ':' + idx); return; }
  s[key].push(idx);
  if (c.cash > 0) p.cash += c.cash;
  else if (c.cash < 0) charge(s, pid, -c.cash, null, 'kaart');
  else if (c.each) {
    const others = alive(s).filter(o => o !== p);
    if (c.each > 0) for (const o of others) charge(s, s.players.indexOf(o), c.each, pid, 'kaart');
    else for (const o of others) charge(s, pid, -c.each, s.players.indexOf(o), 'kaart');
  } else if (c.repairs) {
    let h = 0, H = 0; for (const [, pr] of Object.entries(s.props)) if (pr.owner === pid) { if (pr.houses === 5) H++; else h += pr.houses; }
    charge(s, pid, h * c.repairs[0] + H * c.repairs[1], null, 'onderhoud');
  } else if (c.jail) sendToJail(s, pid);
  else if (c.go !== undefined) { moveTo(s, pid, c.go, true); land(s, pid, diceTotal); }
  else if (c.back) { p.pos = (p.pos + 40 - c.back) % 40; land(s, pid, diceTotal); }
  else if (c.nearest) {
    let j = p.pos; do { j = (j + 1) % 40; } while (BOARD[j].type !== c.nearest);
    moveTo(s, pid, j, true);
    const own = owner(s, j);
    if (own === null || own === pid) land(s, pid, diceTotal);
    else if (!s.props[j].mortgaged) {
      const total = c.nearest === 'utility' ? diceTotal * 10 : rentFor(s, j, diceTotal, 2);
      charge(s, pid, total, own, 'huur ' + BOARD[j].name);
    }
  }
}

function afterMove(s) {
  if (s.phase === 'debt' || s.phase === 'buy' || s.phase === 'auction') return;
  s.phase = s.mayRollAgain && !cur(s).inJail ? 'roll' : 'done';
}

function settleDebts(s) {
  let paid = 0;
  while (s.debts.length) {
    const d = s.debts[0], p = s.players[d.player];
    if (p.cash < d.amount) return paid;
    paid++;
    p.cash -= d.amount; if (d.creditor !== null) s.players[d.creditor].cash += d.amount;
    log(s, `${p.name} betaalt €${d.amount}${d.creditor !== null ? ' aan ' + s.players[d.creditor].name : ''}.`);
    s.debts.shift();
  }
  restorePhase(s);
  if (s.afterDebtMove) { const n = s.afterDebtMove; s.afterDebtMove = null; const pid = s.turn; moveTo(s, pid, (s.players[pid].pos + n) % 40, true); log(s, `${s.players[pid].name} komt op ${BOARD[s.players[pid].pos].name}.`); s.phase = 'moving'; land(s, pid, n); if (s.phase === 'moving') s.phase = 'done'; }
  return -1;
}

function restorePhase(s) {
  const prev = s.phaseBeforeDebt; s.phaseBeforeDebt = null;
  s.phase = ['roll', 'buy', 'done'].includes(prev) ? prev : 'done';
}

function bankrupt(s, pid) {
  const p = s.players[pid], d = s.debts.find(x => x.player === pid), creditor = d ? d.creditor : null;
  for (const [i, pr] of Object.entries(s.props)) if (pr.owner === pid) {
    if (creditor !== null) { pr.owner = creditor; if (pr.houses) s.players[creditor].cash += Math.floor(pr.houses * GROUPS[BOARD[i].group].house / 2); pr.houses = 0; }
    else delete s.props[i];
  }
  if (creditor !== null) { s.players[creditor].cash += p.cash; s.players[creditor].jailCards.push(...p.jailCards); }
  p.cash = 0; p.bankrupt = true; p.jailCards = [];
  s.debts = s.debts.filter(x => x.player !== pid); s.afterDebtMove = null;
  log(s, `${p.name} is failliet${creditor !== null ? '; alles gaat naar ' + s.players[creditor].name : '; de bank neemt alles terug'}.`);
  if (alive(s).length <= 1) { finish(s, 'Er is nog maar één speler over.'); return; }
  if (s.debts.length) return;
  if (s.turn === pid) { s.phaseBeforeDebt = null; nextTurn(s); } else { restorePhase(s); afterMove(s); }
}

function nextTurn(s) {
  s.doubles = 0; s.mayRollAgain = false; s.card = null; s.offer = null; s.dice = null; s.landed = null;
  let t = s.turn; do { t = (t + 1) % s.players.length; } while (s.players[t].bankrupt);
  if (t <= s.turn) s.round += 1;
  s.turn = t; s.phase = 'roll';
  if (s.rules.maxRounds && s.round > s.rules.maxRounds) { finish(s, `De afgesproken ${s.rules.maxRounds} rondes zijn gespeeld.`); return; }
  log(s, `${cur(s).name} is aan de beurt.`);
}

function netWorth(s, pid) {
  let w = s.players[pid].cash;
  for (const [i, pr] of Object.entries(s.props)) if (pr.owner === pid) {
    const sq = BOARD[i]; w += pr.mortgaged ? sq.price / 2 : sq.price;
    if (pr.houses) w += pr.houses * GROUPS[sq.group].house;
  }
  return w;
}
function ranking(s) { return s.players.map((p, i) => ({i, name: p.name, worth: p.bankrupt ? 0 : netWorth(s, i), bankrupt: p.bankrupt})).sort((a, b) => b.worth - a.worth); }
function finish(s, reason) { s.phase = 'finished'; s.result = {reason, ranking: ranking(s)}; log(s, 'Einde: ' + reason + ' ' + s.result.ranking[0].name + ' wint.'); }

function startAuction(s, i) {
  s.auction = {square: i, bid: 0, bidder: null, active: alive(s).map(p => s.players.indexOf(p)), at: 0};
  s.phase = 'auction'; s.offer = null;
  log(s, `${BOARD[i].name} wordt geveild.`);
}
function auctionNext(s) {
  const a = s.auction;
  if (a.active.length === 0 || (a.active.length === 1 && a.bidder === a.active[0])) return closeAuction(s);
  a.at = a.at % a.active.length;
}
function closeAuction(s) {
  const a = s.auction;
  if (a.bidder !== null) {
    s.players[a.bidder].cash -= a.bid; s.props[a.square] = {owner: a.bidder, houses: 0, mortgaged: false};
    log(s, `${s.players[a.bidder].name} koopt ${BOARD[a.square].name} op de veiling voor €${a.bid}.`);
  } else log(s, `Niemand bood op ${BOARD[a.square].name}.`);
  s.auction = null; s.phase = 'auction-done'; afterMove(s);
}

function checkEvenBuild(s, i, delta) {
  const g = BOARD[i].group, sq = groupSquares(g), next = s.props[i].houses + delta;
  for (const j of sq) if (j !== i && Math.abs(next - s.props[j].houses) > 1) return false;
  return true;
}

/* ------------------------------------------------------------------ API */
function create(names, opts) {
  opts = opts || {};
  names = (names || []).map(n => String(n).trim().slice(0, 20)).filter(Boolean);
  if (names.length < 2 || names.length > 6) err('Speel met 2 tot 6 spelers.');
  if (new Set(names.map(n => n.toLowerCase())).size !== names.length) err('Gebruik verschillende namen.');
  const s = {version: 1, seed: (opts.seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0, players: names.map(name => ({name, cash: opts.startCash || START_CASH, pos: 0, inJail: false, jailTries: 0, jailCards: [], bankrupt: false})),
    props: {}, turn: 0, round: 1, phase: 'roll', doubles: 0, mayRollAgain: false, dice: null, offer: null, auction: null, debts: [], phaseBeforeDebt: null,
    card: null, landed: null, log: [], result: null, chanceDeck: [], chestDeck: [], rules: {maxRounds: opts.maxRounds || 0, noRentInJail: false}};
  s.chanceDeck = shuffle(s, CHANCE.length); s.chestDeck = shuffle(s, CHEST.length);
  log(s, `Nieuw spel met ${names.join(', ')}. ${names[0]} begint.`);
  return s;
}

function move(state, a, forced) {
  const s = clone(state); a = a || {};
  if (s.phase === 'finished') err('Het spel is afgelopen.');
  const pid = s.turn, p = cur(s);
  s.card = a.type === 'roll' ? null : s.card;
  switch (a.type) {
    case 'roll': {
      if (s.phase !== 'roll') err('Je kunt nu niet gooien.');
      const d1 = forced?.[0] ?? 1 + Math.floor(rand(s) * 6), d2 = forced?.[1] ?? 1 + Math.floor(rand(s) * 6), dbl = d1 === d2;
      s.dice = [d1, d2]; s.landed = null;
      if (p.inJail) {
        if (dbl) { p.inJail = false; p.jailTries = 0; log(s, `${p.name} gooit dubbel en komt vrij.`); s.mayRollAgain = false; }
        else {
          p.jailTries += 1;
          if (p.jailTries < 3) { log(s, `${p.name} gooit ${d1}+${d2} en blijft zitten (${p.jailTries}/3).`); s.phase = 'done'; return s; }
          log(s, `${p.name} gooit voor de derde keer geen dubbel en betaalt €${JAIL_FINE}.`); p.inJail = false; p.jailTries = 0;
          charge(s, pid, JAIL_FINE, null, 'gevangenis');
          if (s.phase === 'debt') { s.afterDebtMove = d1 + d2; s.phaseBeforeDebt = 'done'; return s; }
        }
      } else if (dbl) {
        s.doubles += 1;
        if (s.doubles === 3) { log(s, `${p.name} gooit drie keer dubbel.`); sendToJail(s, pid); s.phase = 'done'; return s; }
        s.mayRollAgain = true;
      } else s.mayRollAgain = false;
      const total = d1 + d2;
      moveTo(s, pid, (p.pos + total) % 40, true);
      log(s, `${p.name} gooit ${d1}+${d2} en komt op ${BOARD[p.pos].name}.`);
      s.phase = 'moving'; land(s, pid, total); if (s.phase === 'moving') s.phase = 'done';
      afterMove(s); return s;
    }
    case 'buy': {
      if (s.phase !== 'buy') err('Er valt nu niets te kopen.');
      const i = s.offer, price = BOARD[i].price;
      if (p.cash < price) err('Te weinig geld. Neem een hypotheek, verkoop huizen of laat het veilen.');
      p.cash -= price; s.props[i] = {owner: pid, houses: 0, mortgaged: false}; s.offer = null;
      log(s, `${p.name} koopt ${BOARD[i].name} voor €${price}.`); s.phase = 'done'; afterMove(s); return s;
    }
    case 'decline': if (s.phase !== 'buy') err('Er valt nu niets te veilen.'); startAuction(s, s.offer); return s;
    case 'bid': case 'pass': {
      if (s.phase !== 'auction') err('Er loopt geen veiling.');
      const au = s.auction, who = au.active[au.at];
      if (a.player !== undefined && a.player !== who) err('Een andere speler is aan de beurt om te bieden.');
      if (a.type === 'bid') {
        const amount = au.bid + (a.raise || 10);
        if (!(a.raise > 0) || amount > s.players[who].cash) err('Dit bod is hoger dan je contant geld.');
        au.bid = amount; au.bidder = who; au.at += 1;
      } else { au.active.splice(au.at, 1); }
      auctionNext(s); return s;
    }
    case 'end': {
      if (s.phase !== 'done') err(s.phase === 'roll' ? 'Gooi eerst.' : 'Rond eerst deze stap af.');
      nextTurn(s); return s;
    }
    case 'jail_pay': {
      if (!p.inJail || s.phase !== 'roll') err('Je zit niet in de gevangenis of je hebt al gegooid.');
      if (p.cash < JAIL_FINE) err('Te weinig geld.');
      p.cash -= JAIL_FINE; p.inJail = false; p.jailTries = 0; log(s, `${p.name} betaalt €${JAIL_FINE} en is vrij.`); return s;
    }
    case 'jail_card': {
      if (!p.inJail || s.phase !== 'roll' || !p.jailCards.length) err('Geen kaart om te gebruiken.');
      const c = p.jailCards.shift(), [deck, idx] = c.split(':'); s[deck === 'chance' ? 'chanceDeck' : 'chestDeck'].push(+idx);
      p.inJail = false; p.jailTries = 0; log(s, `${p.name} gebruikt de kaart 'Verlaat de gevangenis'.`); return s;
    }
    case 'build': case 'sell': case 'mortgage': case 'unmortgage': {
      const i = a.square, sq = BOARD[i], pr = s.props[i], actor = s.phase === 'debt' ? s.debts[0].player : pid;
      if (!pr || pr.owner !== actor) err('Dit is niet jouw bezit.');
      if (!['roll', 'done', 'debt'].includes(s.phase)) err('Beheer kan aan het begin of eind van je beurt.');
      const P = s.players[actor];
      if (a.type === 'build') {
        if (s.phase === 'debt') err('Eerst je schuld betalen.');
        if (sq.type !== 'street') err('Alleen op straten kun je bouwen.');
        if (!ownsGroup(s, actor, sq.group)) err('Je hebt eerst alle straten van deze kleur nodig.');
        if (groupSquares(sq.group).some(j => s.props[j].mortgaged)) err('Los eerst de hypotheken in deze kleur af.');
        if (pr.houses >= 5) err('Hier staat al een hotel.');
        if (!checkEvenBuild(s, i, +1)) err('Bouw gelijkmatig: eerst de andere straten van deze kleur.');
        const cost = GROUPS[sq.group].house; if (P.cash < cost) err('Te weinig geld.');
        const [h, H] = housesUsed(s);
        if (pr.houses === 4 && H >= HOTELS) err('De bank heeft geen hotels meer.');
        if (pr.houses < 4 && h >= HOUSES) err('De bank heeft geen huizen meer.');
        P.cash -= cost; pr.houses += 1; log(s, `${P.name} bouwt ${pr.houses === 5 ? 'een hotel' : 'een huis'} op ${sq.name}.`);
      } else if (a.type === 'sell') {
        if (!pr.houses) err('Hier staan geen huizen.');
        if (!checkEvenBuild(s, i, -1)) err('Verkoop gelijkmatig: eerst van de andere straten.');
        if (pr.houses === 5 && housesUsed(s)[0] + 4 > HOUSES) err('De bank heeft niet genoeg huizen om het hotel terug te ruilen.');
        pr.houses -= 1; P.cash += GROUPS[sq.group].house / 2; log(s, `${P.name} verkoopt een ${pr.houses === 4 ? 'hotel' : 'huis'} op ${sq.name}.`);
      } else if (a.type === 'mortgage') {
        if (pr.mortgaged) err('Al een hypotheek.');
        if (sq.type === 'street' && groupSquares(sq.group).some(j => s.props[j]?.houses)) err('Verkoop eerst alle huizen in deze kleur.');
        pr.mortgaged = true; P.cash += sq.price / 2; log(s, `${P.name} neemt een hypotheek op ${sq.name}: +€${sq.price / 2}.`);
      } else {
        if (!pr.mortgaged) err('Geen hypotheek.');
        const cost = Math.ceil(sq.price / 2 * 1.1); if (P.cash < cost) err('Te weinig geld.');
        P.cash -= cost; pr.mortgaged = false; log(s, `${P.name} lost de hypotheek op ${sq.name} af: −€${cost}.`);
      }
      return s;
    }
    case 'pay_debt': { if (s.phase !== 'debt') err('Er is geen schuld.'); const r = settleDebts(s); if (r === 0) err('Nog niet genoeg geld.'); if (r === -1) afterMove(s); return s; }
    case 'bankrupt': { if (s.phase !== 'debt') err('Alleen bij een onbetaalbare schuld.'); bankrupt(s, s.debts[0].player); return s; }
    case 'trade': {
      if (!['roll', 'done'].includes(s.phase)) err('Ruilen kan aan het begin of eind van je beurt.');
      const other = a.with; if (other === pid || !s.players[other] || s.players[other].bankrupt) err('Kies een andere speler.');
      const give = a.give || [], get = a.get || [], cg = a.cashGive || 0, cr = a.cashGet || 0;
      if (!give.length && !get.length && !cg && !cr) err('Kies wat je wilt ruilen.');
      if (cg < 0 || cr < 0 || cg > p.cash || cr > s.players[other].cash) err('Ongeldig geldbedrag.');
      for (const i of give) if (owner(s, i) !== pid) err('Je kunt alleen eigen bezit geven.');
      for (const i of get) if (owner(s, i) !== other) err('Je kunt alleen bezit van de ander vragen.');
      for (const i of [...give, ...get]) if (BOARD[i].type === 'street' && groupSquares(BOARD[i].group).some(j => s.props[j]?.houses)) err('Straten met huizen in die kleur kun je niet ruilen.');
      for (const i of give) s.props[i].owner = other; for (const i of get) s.props[i].owner = pid;
      p.cash += cr - cg; s.players[other].cash += cg - cr;
      log(s, `Ruil tussen ${p.name} en ${s.players[other].name}: ${[...give.map(i => BOARD[i].name), cg ? '€' + cg : ''].filter(Boolean).join(', ') || 'niets'} tegen ${[...get.map(i => BOARD[i].name), cr ? '€' + cr : ''].filter(Boolean).join(', ') || 'niets'}.`);
      return s;
    }
    case 'finish': { finish(s, 'Het spel is door de spelers beëindigd.'); return s; }
    default: err('Onbekende actie.');
  }
}

function valid(s) {
  try {
    if (!s || s.version !== 1 || !Array.isArray(s.players) || s.players.length < 2 || s.players.length > 6) return false;
    if (s.players.some(p => typeof p.name !== 'string' || !Number.isFinite(p.cash) || p.pos < 0 || p.pos > 39)) return false;
    if (s.players.some(p => p.cash < 0)) return false;
    for (const [i, pr] of Object.entries(s.props)) {
      if (!OWNABLE.includes(+i) || !s.players[pr.owner] || pr.houses < 0 || pr.houses > 5) return false;
      if (pr.houses && (BOARD[i].type !== 'street' || !ownsGroup(s, pr.owner, BOARD[i].group) || pr.mortgaged)) return false;
    }
    for (const g of Object.keys(GROUPS)) { const hs = groupSquares(g).map(j => s.props[j]?.houses || 0); if (Math.max(...hs) - Math.min(...hs) > 1) return false; }
    const [h, H] = housesUsed(s); if (h > HOUSES || H > HOTELS) return false;
    if (!['roll', 'buy', 'auction', 'done', 'debt', 'finished'].includes(s.phase)) return false;
    if (s.phase !== 'finished' && s.players[s.turn].bankrupt) return false;
    return true;
  } catch { return false; }
}

root.VASTGOED = {BOARD, GROUPS, CHANCE, CHEST, OWNABLE, START_CASH, create, move, valid, ranking, netWorth, rentFor, groupSquares, ownsGroup};
})(typeof window !== 'undefined' ? window : globalThis);
