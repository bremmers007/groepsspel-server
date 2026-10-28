/* Groepsspel 0.14 — tabletbordspellen (Rijk van Limburg #vastgoed, Sporen door Limburg #board).
 * - Bordmodus: compacte kop zodat het bord zo groot mogelijk is.
 * - Zoomen (+/−) en verschuiven van het bord, onthouden per apparaat.
 * - Sporen door Limburg: overzicht van recente acties (zonder geheime bestemmingen).
 * De spelmotoren zelf blijven ongewijzigd.
 */
(function(){
'use strict';
const esc=GS.esc,ZKEY='groepsspel-bordzoom';
const BOARD_ROUTES=new Set(['board','vastgoed']);
let zoom=Number(GS.ls.get(ZKEY))||1;
const NL={red:'rode',blue:'blauwe',green:'groene',yellow:'gele',purple:'paarse',black:'zwarte',white:'witte',orange:'oranje',pink:'roze',gray:'grijze',grey:'grijze'};
const city=id=>(TICKET.CITIES.find(c=>c[0]===id)||[id,id])[1];

/* ---------------------------------------------------- recente acties (Sporen door Limburg) */
function describe(before,a,after){const p=before.players[before.turn]?.name||'Speler';
 if(a.type==='claim'){const r=TICKET.ROUTES[a.route];return r?`${p} legt de route ${city(r[0])}–${city(r[1])} (${r[2]} ${r[2]===1?'wagon':'wagons'}).`:`${p} legt een route.`;}
 if(a.type==='draw')return a.market<0?`${p} pakt een blinde kaart.`:(before.market[a.market]==='wild'?`${p} pakt een open joker.`:`${p} pakt een open ${NL[before.market[a.market]]||''} kaart.`.replace('  ',' '));
 if(a.type==='keep')return `${p} houdt ${a.ids?.length||0} geheime ${a.ids?.length===1?'bestemming':'bestemmingen'}.`;
 if(a.type==='finish')return 'Het spel is afgerond; alle bestemmingen zijn verrekend.';
 if(a.type==='tickets'||a.type==='goals')return `${p} pakt nieuwe bestemmingen.`;
 if(a.type==='pass')return `${p} past.`;
 return after.message||`${p} is aan de beurt geweest.`;}
if(window.TICKET&&!TICKET.gsWrapped){const move=TICKET.move;TICKET.move=function(s,a){const r=move(s,a);try{r.gsLog=[...(s.gsLog||[]),describe(s,a,r)].slice(-15);}catch{}return r;};TICKET.gsWrapped=true;}
function railLog(main){const log=state.board?.gsLog;if(!log?.length||main.querySelector('.gs-raillog'))return;const map=main.querySelector('.rail-map');const host=map?.closest('section,.panel')||map;if(!host)return;
 host.insertAdjacentHTML('afterend',`<section class="panel gs-raillog"><h2>Recente acties</h2><ol reversed>${[...log].reverse().slice(0,8).map(t=>`<li>${esc(t)}</li>`).join('')}</ol></section>`);}

/* ---------------------------------------------------- zoomen en verschuiven */
function zoomable(main){const board=main.querySelector('.mono-board,.rail-map');if(!board||board.closest('.gs-zoomhost'))return;
 /* één element op de plek van het bord: knoppen + scrollvenster, zodat de lay-out van het spel gelijk blijft */
 const host=document.createElement('div');host.className='gs-zoomhost';board.before(host);
 host.innerHTML=`<div class="gs-zoombar" role="group" aria-label="Bord zoomen"><button type="button" class="btn small secondary" data-gs-zoom="-1" aria-label="Uitzoomen" ${zoom<=1?'disabled':''}>−</button><span>${Math.round(zoom*100)}%</span><button type="button" class="btn small secondary" data-gs-zoom="1" aria-label="Inzoomen" ${zoom>=2.5?'disabled':''}>+</button>${zoom!==1?'<button type="button" class="btn small secondary" data-gs-zoom="0">Passend</button><small>Schuif het bord met je vinger.</small>':''}</div><div class="gs-zoom"></div>`;
 const wrap=host.querySelector('.gs-zoom');wrap.style.setProperty('--z',zoom);wrap.append(board);}
document.addEventListener('click',e=>{const b=e.target.closest('[data-gs-zoom]');if(!b)return;const d=Number(b.dataset.gsZoom);zoom=d===0?1:Math.min(2.5,Math.max(1,Math.round((zoom+d*0.25)*100)/100));GS.ls.set(ZKEY,String(zoom));render();});

GS.on('rendered',r=>{document.body.classList.toggle('gs-boardmode',BOARD_ROUTES.has(r));if(!BOARD_ROUTES.has(r))return;const main=document.querySelector('main');if(!main)return;zoomable(main);if(r==='board')railLog(main);});
/* Rijk van Limburg: extra korte variant voor een avond met weinig tijd. */
GS.on('rendered',r=>{if(r!=='vastgoed')return;const sel=document.querySelector('#monoRounds');if(sel&&!sel.querySelector('option[value="8"]'))sel.querySelector('option[value="15"]')?.insertAdjacentHTML('beforebegin','<option value="8">Heel kort: 8 rondes (± 30 min), daarna wint het hoogste vermogen</option>');});
GS.define('tablet',{zoom:()=>zoom,describe});
})();
