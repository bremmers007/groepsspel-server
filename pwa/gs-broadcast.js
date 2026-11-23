/* Groepsspel 0.17.0 · Tv-graphics voor de automatische show op het beamer-/TV-scherm.
   - ronde-intro over het hele scherm (rondes, tussenstand, eindstand) en een korte "vraag x"-intro
   - het vraagpaneel en de antwoordtegels vliegen eenmalig per vraag binnen; bij de uitslag licht het goede antwoord op
   - scorebord met teamkleuren, buzz-, antwoord- en uitslagstatus en oplopende punten
   - applaus van het publiek (gemaakt met Web Audio, alleen als het geluid aan staat)
   web/app.js roept GSBroadcast.sync(next, prev) aan bij elke nieuwe toestand van de show. */
(() => {
  'use strict';
  const TEAM_COLORS = ['#2f7cff', '#ff8a1f', '#22c46e', '#ffcc1f', '#e5487a', '#9b5cff', '#1fc7d4', '#ff5a3c', '#8fd14f', '#ff7ad9', '#4f6bff', '#c9a14a'];
  const ICON = {snel: '⚡', buzzer: '🔴', taart: '🥧', bom: '💣', roof: '🦝', finale: '⏱️', inzet: '🎰'};
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const tr = t => (window.GSI18N?.t ? GSI18N.t(t) : t);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  let board = null, shown = new Map(), qKey = '', revealKey = '', current = null;
  let scoreAt = 0, scoreTimer = 0;

  // ------------------------------------------------------------ ronde-intro
  function stinger(top, title, icon, small) {
    document.querySelector('.bc-stinger')?.remove();
    const el = document.createElement('div');
    el.className = 'bc-stinger' + (small ? ' small' : '');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `${small ? '' : '<div class="bands"><i></i><i></i><i></i><i></i></div>'}<div class="title">${top ? `<small>${esc(tr(top))}</small>` : ''}<b translate="no">${esc(title)}</b>${icon ? `<em>${icon}</em>` : ''}</div>`;
    document.body.append(el);
    setTimeout(() => el.remove(), small ? 1700 : 2900);
  }
  function flash(color) {
    if (motion.matches) return;
    const el = document.createElement('div'); el.className = 'bc-flash'; el.style.setProperty('--c', color);
    document.body.append(el); setTimeout(() => el.remove(), 600);
  }

  let calloutTimer = 0;
  function clearCallout() {
    clearTimeout(calloutTimer);
    document.querySelector('.bc-callout')?.remove();
  }
  function callout(label, title, detail = '', tone = 'gold') {
    clearCallout();
    const el = document.createElement('aside');
    el.className = 'bc-callout ' + tone;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<small>${esc(tr(label))}</small><strong translate="no">${esc(title)}</strong>${detail ? `<span translate="no">${esc(detail)}</span>` : ''}`;
    document.body.append(el);
    calloutTimer = setTimeout(() => el.remove(), 1800);
  }

  // ------------------------------------------------------------ scorebord
  function teamsOf(state) { return (state.teams || []).filter(t => !t.spectator); }
  function renderBoard(state) {
    if (!board) { board = document.createElement('div'); board.className = 'bc-board off'; board.setAttribute('aria-hidden', 'true'); document.body.append(board); }
    const a = state.auto, ph = state.phase;
    const visible = document.body.classList.contains('studio3d') && !a.finale && ['countdown', 'open', 'buzzed', 'pick', 'reveal', 'paused'].includes(ph);
    board.classList.toggle('off', !visible);
    if (!visible) return;
    const teams = teamsOf(state);
    const waiting = performance.now() < scoreAt;
    const score = t => waiting ? (shown.get(t.id) ?? t.score) : t.score;
    const top = Math.max(...teams.map(score));
    const res = Object.fromEntries((ph === 'reveal' ? a.results || [] : []).map(r => [r.team_id, r]));
    const buzzed = ph === 'buzzed' && state.buzzes?.[0]?.team_id;
    const sorted = teams.map((t, i) => ({...t, color: TEAM_COLORS[i % TEAM_COLORS.length]}));
    board.innerHTML = sorted.map(t => {
      const r = res[t.id], cls = [r ? (r.correct ? 'ok' : 'bad') : '', (a.answered || []).includes(t.id) && ph === 'open' ? 'answered' : '',
        buzzed === t.id ? 'buzzed' : '', score(t) === top && top > 0 ? 'lead' : ''].join(' ');
      return `<div class="bc-chip ${cls}" data-team="${esc(t.id)}" style="--team:${t.color}"><i></i><span translate="no">${esc(t.name)}</span><b>${shown.has(t.id) ? shown.get(t.id) : t.score}</b></div>`;
    }).join('');
    if (waiting) return;
    // punten laten oplopen naar de nieuwe stand
    for (const t of teams) {
      const from = shown.has(t.id) ? shown.get(t.id) : t.score;
      if (from === t.score) { shown.set(t.id, t.score); continue; }
      countTo(t.id, from, t.score);
    }
  }
  const counting = new Map();
  function countTo(id, from, to) {
    if (counting.get(id) === to) return;
    counting.set(id, to);
    const start = performance.now(), dur = motion.matches ? 1 : 900;
    const chip = () => board?.querySelector(`.bc-chip[data-team="${CSS.escape(id)}"]`);
    chip()?.classList.add('bump');
    const step = now => {
      if (counting.get(id) !== to) return;
      const k = Math.min(1, (now - start) / dur), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      shown.set(id, v); const b = chip()?.querySelector('b'); if (b) b.textContent = v;
      if (k < 1) requestAnimationFrame(step); else counting.delete(id);
    };
    requestAnimationFrame(step);
  }

  // ------------------------------------------------------------ binnenkomst van vraag en uitslag (na elke render)
  function decorate() {
    const q = document.querySelector('.auto-q');
    if (!q || !current) return;
    const text = q.querySelector('.question')?.textContent || '';
    const key = current.auto?.question_no + '|' + text;
    if (q.querySelector('.auto-opt') && key !== qKey) { qKey = key; if (!motion.matches) q.classList.add('bc-enter'); }
    if (q.querySelector('.auto-opt.correct') && key !== revealKey) { revealKey = key; q.classList.add('bc-reveal'); }
  }
  new MutationObserver(() => decorate()).observe(document.documentElement, {childList: true, subtree: true});

  // ------------------------------------------------------------ applaus (Web Audio)
  let ctx = null;
  function applause(seconds = 2.6, strength = 1) {
    if (!window.GSound?.enabled?.()) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      ctx = ctx || new C(); if (ctx.state === 'suspended') ctx.resume();
      const rate = ctx.sampleRate, len = Math.floor(rate * seconds), buf = ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch), claps = Math.floor(seconds * 70 * strength);
        for (let n = 0; n < claps; n++) {
          const at = Math.floor(Math.random() * (len - rate * 0.05)), size = Math.floor(rate * (0.012 + Math.random() * 0.02)), amp = 0.25 + Math.random() * 0.5;
          for (let i = 0; i < size; i++) d[at + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / (size * 0.25));
        }
        for (let i = 0; i < len; i++) { const k = i / len, env = Math.min(1, k * 8) * Math.min(1, (1 - k) * 2.2); d[i] = d[i] * env + (Math.random() * 2 - 1) * 0.05 * env; }
      }
      const src = ctx.createBufferSource(), band = ctx.createBiquadFilter(), gain = ctx.createGain();
      band.type = 'bandpass'; band.frequency.value = 1800; band.Q.value = 0.6; gain.gain.value = 0.32 * strength;
      src.buffer = buf; src.connect(band); band.connect(gain); gain.connect(ctx.destination); src.start();
    } catch {}
  }

  // ------------------------------------------------------------ toestandswissels
  function sync(next, prev) {
    current = next;
    if (!next?.auto) { clearCallout(); clearTimeout(scoreTimer); board?.classList.add('off'); return; }
    const a = next.auto, n = next.phase, p = prev?.phase, fresh = prev && prev.code === next.code;
    if (!fresh || n !== p || a.question_no !== prev?.auto?.question_no) clearCallout();
    if (!fresh) {
      shown.clear();
      counting.clear();
      scoreAt = 0;
      clearTimeout(scoreTimer);
    } else if (n === 'reveal' && p !== 'reveal') {
      scoreAt = performance.now() + (motion.matches ? 0 : a.effect?.kind === 'pie' ? 1750 : 1400);
      clearTimeout(scoreTimer);
      scoreTimer = setTimeout(() => renderBoard(current), Math.max(0, scoreAt - performance.now()));
    } else if (n !== 'reveal' && p === 'reveal') {
      scoreAt = 0;
      clearTimeout(scoreTimer);
    }
    renderBoard(next);
    decorate();
    if (n === 'intro' && a.until && (!prev?.auto?.until || prev?.auto?.intro_id !== a.intro_id)) { applause(2.2, 0.8); return; }
    if (!fresh) return;
    if (n === 'round' && p !== 'round') stinger(`Ronde ${a.round} van ${a.rounds}`, a.name, (typeof ROUND_ICON !== 'undefined' && ROUND_ICON[a.type]) || ICON[a.type] || '🎲');
    else if (n === 'standings' && p !== 'standings') { stinger('', tr('Tussenstand'), '🏆'); applause(2.2, 0.7); }
    else if (n === 'finished' && p !== 'finished') { stinger('', tr('Eindstand'), '🏆'); setTimeout(() => applause(5, 1.4), 900); }
    else if (n === 'pick' && p !== 'pick' && a.pick?.kind === 'vault') {
      const chooser = teamsOf(next).find(t => t.id === a.pick.team_id);
      if (chooser) callout('Kluis of Kraak', chooser.name, '', 'gold');
    }
    else if (n === 'stake' && p !== 'stake') stinger(tr('Inzetronde'), a.stake?.category || '', '🎰');

    if (n === 'buzzed' && p !== 'buzzed') {
      const id = next.buzzes?.[0]?.team_id, i = teamsOf(next).findIndex(t => t.id === id);
      flash(i >= 0 ? TEAM_COLORS[i % TEAM_COLORS.length] : '#ff2a3a');
      if (i >= 0) callout('Eerste aan de buzzer', teamsOf(next)[i].name, '', 'cyan');
    }
    if (n === 'reveal' && p !== 'reveal') {
      const e = a.effect, teams = teamsOf(next);
      const name = id => teams.find(t => t.id === id)?.name || '';
      if (e?.kind === 'vault') callout('Kluis dicht', name(e.from), '+' + e.points + ' pt', 'gold');
      else if (e?.kind === 'steal' && a.type === 'wissel') callout('Kraak gelukt', name(e.from), '+' + e.points + ' pt', 'cyan');
      else if (e?.kind === 'pie_miss') callout('Taartworp', tr('Mis!'));
      else if (e?.kind === 'steal') callout('Puntenroof', name(e.from), e.points ? '+' + e.points + ' pt' : '');
      else if (e?.kind === 'boom') callout('Bom ontploft', name(e.to), e.points ? '−' + e.points + ' pt' : '', 'red');
      else if (a.finale) {
        const eliminated = a.finale.out.filter(id => !prev?.auto?.finale?.out.includes(id));
        if (eliminated.length) callout('Tijd om', eliminated.map(name).filter(Boolean).join(' · '), '', 'red');
      } else if (a.type === 'buzz') {
        const winner = (a.results || []).find(r => r.correct);
        if (winner) callout('Goed antwoord', name(winner.team_id), '+' + winner.points + ' pt', 'cyan');
      }
      const good = (a.results || []).filter(r => r.correct).length;
      if (good) applause(2.4, Math.min(1.3, 0.6 + good * 0.2));
    }
  }

  // bediening alleen tonen na muisbeweging of toetsaanslag (3 seconden)
  let uiTimer = 0;
  const wake = () => { document.body.classList.add('bc-ui'); clearTimeout(uiTimer); uiTimer = setTimeout(() => document.body.classList.remove('bc-ui'), 3000); };
  for (const e of ['mousemove', 'pointerdown', 'keydown', 'focusin']) addEventListener(e, wake, {passive: true});

  window.GSBroadcast = {sync, stinger, applause,
    pieImpact: (name, points) => callout('PATS!', name, points ? '−' + points + ' pt' : '', 'gold')};

})();
