/* 0.8.1: presenter's private Floor controls above the fold at 1366×850. */
const baseFloor081=floorScreen;
floorScreen=function(s){
  if(!s?.tvVersion||s.mode!=='floor'||s.phase!=='duel')return baseFloor081(s);
  const d=s.duel,q=d.cards[d.index],locked=Date.now()<d.lockUntil;
  const banks=`<div class="bank-grid floor-host-banks">${[d.a,d.b].map(id=>`<div class="${d.active===id?'active':''}"><span>${esc(teamName(id))}</span><strong data-tv-bank="${id}">${Math.ceil(d.clocks[id])} sec</strong></div>`).join('')}</div>`;
  const buttons=`<div class="floor-host-actions"><button class="btn secondary" data-x="tvClock">${s.running?'⏸ Pauzeer [spatie]':'▶ Start / hervat [spatie]'}</button>${[['yes','✓ Goed [V]'],['wrong','✕ Fout [X]'],['pass','↷ Pas [P]']].map(([value,label])=>`<button class="btn ${value==='yes'?'':'secondary'}" data-x="tvFloorAnswer" data-good="${value}" ${!s.running||locked?'disabled':''}>${label}</button>`).join('')}</div>`;
  const panel=`<div class="floor-host-console"><div class="floor-host-heading"><div><div class="floor-host-topic">Categorie: ${esc(d.topic)}</div><h2>${esc(teamName(d.active))} antwoordt</h2></div>${banks}</div><div class="floor-host-content"><div class="floor-host-picture"><div class="tv-visual">${esc(q?.visual||'Pakket uitgeput')}</div></div><div class="floor-host-controls"><div class="floor-host-answer-label">JUISTE ANTWOORD · alleen quizmaster</div><div class="floor-host-answer">${esc(q?.answer||'Voeg nieuwe herkenningen toe')}</div><p class="floor-host-lock" id="tvLock" role="status">${locked?'Blokkade · eigen klok loopt door':''}</p>${buttons}<div class="floor-host-help">Sneltoetsen: spatie start/pauzeert · V goed · X fout · P pas.<br>Bij een fout antwoord blijft de beurt bij hetzelfde team.</div></div></div>${!q?`<form id="floorPackForm"><input type="hidden" name="category" value="${esc(d.topic)}"><label class="field">Nieuwe herkenningen, één per regel<textarea class="input" name="cards" rows="3" placeholder="Herkenning | juiste antwoord" required></textarea></label><button class="btn">Pakket aanvullen</button></form>`:''}</div>`;
  return `<div class="floor-host-root">${roundHeader(s,'Vakkenstrijd · '+esc(d.topic),panel)}</div>`;
};

/* A fresh board uses varied picture banks and trivia without repeating the same first 12. */
const createExtended081=createExtended;
createExtended=function(g,data){createExtended081(g,data);const s=state.active;if(!s?.tvVersion||s.mode!=='floor'||s.phase!=='board')return;
 const imageTopics=['Landen','Dieren','Sport','Voorwerpen','Eten & drinken','Vervoer','Plaatsen & gebouwen','Natuur & weer'].filter(t=>FLOOR_BANK[t]?.length>=12);
 const textTopics=Object.keys(FLOOR_BANK).filter(t=>!imageTopics.includes(t)&&FLOOR_BANK[t]?.length>=12);
 const order=[...shuffle(imageTopics).slice(0,8),...shuffle(textTopics).slice(0,4)];
 if(order.length>=12){s.topics=shuffle(order);save();render();}
};
