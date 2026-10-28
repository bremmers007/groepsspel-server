/* Groepsspel 0.14 — verbeteringen voor de quizmasterconsoles van de spelshows.
 * - Antwoorden staan standaard open op de quizmasterconsole (instelbaar per apparaat: zet het uit
 *   als dit scherm zelf op de tv staat). Het publieksvenster toont nooit antwoorden.
 * - De Bolleboos: per ronde staat uitgelegd hoe je seconden verdient of verliest, en het
 *   secondenverloop per ronde blijft zichtbaar.
 */
(function(){
'use strict';
const esc=GS.esc,KEY='groepsspel-antwoorden-open';
const answersOpen=()=>GS.ls.get(KEY)!=='nee';
const SMART_HELP=[
 '3-6-9: om de beurt één vraag. Goed op vraag 3, 6, 9, 12 of 15 levert 10 seconden op. Fout of pas: de volgende speler.',
 'Open Deur: kies een vraag; ieder goed trefwoord levert 20 seconden op. Alleen de klok van het team aan de beurt loopt.',
 'Puzzel: vind de verbanden tussen de woorden; elk gevonden verband levert 30 seconden op.',
 'Galerij: herken de beelden; elk herkend beeld levert 15 seconden op.',
 'Het collectieve geheugen: noem de trefwoorden bij het filmpje of verhaal; de beloning loopt op: 10, 20, 30, 40, 50 seconden.',
 'Finale: de twee teams met de meeste seconden. Elk goed trefwoord kost de tegenstander 20 seconden; wie op nul staat, verliest.'];
function consoleToggle(main){if(main.querySelector('#gsAnsToggle'))return;const host=[...main.querySelectorAll('p,div')].find(e=>e.children.length===0&&/QUIZMASTERCONSOLE/.test(e.textContent));if(!host)return;
 host.insertAdjacentHTML('afterend',`<label class="gs-anstoggle" id="gsAnsToggle"><input type="checkbox" ${answersOpen()?'checked':''}> Antwoorden direct tonen op dit scherm <small>(uitzetten als dit scherm op de tv staat)</small></label>`);}
function smart(main,s){const tabs=main.querySelector('.tv-rounds');if(!tabs||main.querySelector('.gs-smart-help'))return;
 const r=Math.min(5,Math.max(0,s.round|0));
 /* secondenverloop: leg bij iedere nieuwe ronde de stand vast */
 s.gsLog??=[];if(!s.gsLog.length||s.gsLog.at(-1).round!==r){s.gsLog.push({round:r,banks:{...s.banks}});s.gsLog=s.gsLog.slice(-12);save();}
 const rows=s.gsLog.filter((l,i,a)=>i===a.length-1||l.round!==a[i+1]?.round);
 const table=rows.length>1?`<table class="gs-banklog"><thead><tr><th>Start ronde</th>${state.teams.map(t=>`<th>${esc(t.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(l=>`<tr><td>${l.round+1}. ${esc(SMART_ROUNDS[l.round]||'')}</td>${state.teams.map(t=>`<td>${Math.round(l.banks[t.id]??0)} s</td>`).join('')}</tr>`).join('')}</tbody></table>`:'';
 tabs.insertAdjacentHTML('afterend',`<div class="gs-smart-help"><p>${esc(SMART_HELP[r])}</p>${table?`<details><summary>Secondenverloop</summary>${table}</details>`:''}</div>`);}
/* Hitlijn: de DJ-knop staat direct onder 'aan de beurt' (geen scrollen) en ieder nummer heeft
 * zoeklinks naar de gangbare muziekdiensten. Groepsspel speelt zelf geen beschermde muziek af. */
function musicLinks(song){const q=encodeURIComponent(`${song.title} ${song.artist}`);
 return [['Spotify','https://open.spotify.com/search/'+q],['YouTube Music','https://music.youtube.com/search?q='+q],['Apple Music','https://music.apple.com/nl/search?term='+q]];}
function hitster(main,s){const h=s.hit;if(!h)return;const song=h.current||h.deck?.[0];
 const dj=main.querySelector('.dj-console .actions');
 if(dj&&song?.title&&!dj.querySelector('.gs-search')){dj.insertAdjacentHTML('beforeend',`<span class="gs-search">Zoek in: ${musicLinks(song).map(([n,u])=>`<a href="${esc(u)}" target="groepsspel-music" rel="noopener noreferrer">${esc(n)} ↗</a>`).join(' ')}</span>`);}
 const card=main.querySelector('.play-card'),title=card?.querySelector(':scope>h1');const btns=card?[...card.querySelectorAll(':scope>button[data-hit],:scope>.actions>button[data-hit]')]:[];
 if(title&&btns.length&&!card.querySelector('.gs-dj-actions')){const box=document.createElement('div');box.className='gs-dj-actions';btns.forEach(b=>box.append(b));title.after(box);}}
/* Duizendpoot en De Klusbaas: voorbereidingschecklist op het introscherm (afvinken per apparaat, in het geheugen). */
const ticked=new Set();
function checklist(main,s){const x=s.x;if(!x||x.phase!=='intro'||main.querySelector('.gs-checklist'))return;let items=[];
 if(s.mode==='duizend'&&typeof SKILL_TRIALS!=='undefined'){const n=x.mode==='punten'?(x.rounds||6):Math.max(1,(x.alive?.length||2)-1)+1;items=x.order.slice(0,n).map(i=>SKILL_TRIALS[i]).filter(Boolean).map(t=>[t.q,t.material]);}
 if(s.mode==='klusbaas')items=[['Algemeen','Papier, pennen, plakband, een schaar en een stopwatch'],...(x.tasks||[]).map(t=>[t.q,t.material||t.judge||''])];
 if(!items.length)return;const card=main.querySelector('.play-card');const at=card?.querySelector(':scope>h1')||card?.firstElementChild;if(!at)return;
 at.insertAdjacentHTML('afterend',`<details class="gs-checklist" open><summary>Voorbereiding: leg dit klaar (${items.length})</summary><ul>${items.map(([q,m],i)=>`<li><label><input type="checkbox" data-gs-tick="${s.id}-${i}" ${ticked.has(s.id+'-'+i)?'checked':''}> <strong>${esc(q)}</strong>${m?` · ${esc(m)}`:''}</label></li>`).join('')}</ul></details>`);}
document.addEventListener('change',e=>{const k=e.target.dataset?.gsTick;if(!k)return;e.target.checked?ticked.add(k):ticked.delete(k);});
GS.on('rendered',r=>{if(r!=='play'||!state.active)return;const main=document.querySelector('main');if(!main)return;
 if(state.active.tvVersion||['smart','floor'].includes(state.active.mode))consoleToggle(main);
 if(answersOpen())for(const d of main.querySelectorAll('details.answer-envelope'))d.open=true;
if(state.active.hitVersion)hitster(main,state.active);
 if(['duizend','klusbaas'].includes(state.active.mode))checklist(main,state.active);
 if(state.active.mode==='smart'&&state.active.tvVersion&&typeof SMART_ROUNDS!=='undefined')smart(main,state.active);});
document.addEventListener('change',e=>{if(!e.target.closest('#gsAnsToggle'))return;GS.ls.set(KEY,e.target.checked?'ja':'nee');render();});
GS.define('shows',{answersOpen,SMART_HELP});
})();
