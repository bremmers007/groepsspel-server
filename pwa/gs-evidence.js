/* 0.14.2 · Optionele WhatsApp-groepslink bij live beoordeelde spellen.
 * Geen WhatsApp API: het spel deelt alleen een door de spelleider ingestelde link.
 * Voor telefoonspellen wordt de groepslink op de echte spelserver ingesteld.
 */
(function(){
'use strict';
const K='groepsspel-evidence-links';
const eligible=new Set(['creative','challenge']);
const esc=GS.esc;
function all(){const data=GS.ls.json(K,{});return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}
function valid(link){
  if(!link)return true;
  try{const u=new URL(link);return u.protocol==='https:'&&['chat.whatsapp.com','www.chat.whatsapp.com'].includes(u.hostname)&&/^\/[A-Za-z0-9_-]{10,100}\/?$/.test(u.pathname)&&!u.search&&!u.hash&&!u.port;}catch{return false;}
}
function html(id){
  if(!eligible.has(id))return '';
  const stored=all()[id]||'';
  const value=valid(stored)?stored:'';
  return `<section class="gs-evidence-settings" aria-label="Optionele bewijscommunicatie"><h3>Optioneel: foto's en filmpjes delen via WhatsApp</h3>
  <p>Laat teams foto's en video's delen in een eigen WhatsApp-groep. De spelleider/jury beoordeelt ze vervolgens zelf en kent de punten in Groepsspel toe.</p>
  <label for="gs-evidence-link">WhatsApp-uitnodigingslink (maak de groep zelf aan)</label>
  <input class="input" id="gs-evidence-link" data-gs-evidence-link="${id}" type="url" maxlength="220" placeholder="https://chat.whatsapp.com/..." value="${esc(value)}">
  <div class="gs-evidence-actions"><button class="btn small secondary" type="button" data-gs-evidence-save="${id}">Link bewaren</button> <a data-gs-evidence-open="${id}" class="btn small secondary" href="${esc(value||'#')}" target="_blank" rel="noopener noreferrer" ${value?'':'hidden'}>WhatsApp-groep openen ↗</a></div>
  <p class="e11-small" data-gs-evidence-status="${id}" role="status">Alleen op dit apparaat opgeslagen, niet automatisch gedeeld met deelnemers of gekoppeld aan de spelserver. WhatsApp toont groepsleden elkaars telefoonnummer.</p>
  </section>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-gs-evidence-save]');if(!b)return;
  e.preventDefault();const id=b.dataset.gsEvidenceSave;
  if(!eligible.has(id))return;
  const field=document.querySelector(`[data-gs-evidence-link="${id}"]`),url=(field?.value||'').trim();
  const status=document.querySelector(`[data-gs-evidence-status="${id}"]`);
  if(!valid(url)){if(status)status.textContent='Gebruik uitsluitend een volledige https://chat.whatsapp.com/ groepsuitnodiging.';return;}
  const entries=all();if(url)entries[id]=url;else delete entries[id];
  if(!GS.ls.set(K,JSON.stringify(entries))){if(status)status.textContent='Kon de groepslink niet opslaan. Controleer de browseropslag.';return;}
  if(status)status.textContent=url?'Groepslink opgeslagen op dit apparaat. De spelleider keurt bewijs nog steeds handmatig goed.':'De opgeslagen groepslink is gewist.';
  const a=document.querySelector(`[data-gs-evidence-open="${id}"]`);if(a){a.href=url||'#';a.hidden=!url;}
});
/* 0.14.3: maak de link ook echt bruikbaar: op het introscherm van De Klusbaas en Duizendpoot staat een QR-code
 * waarmee teams de WhatsApp-groep openen. Zonder bewaarde link verschijnt er niets. */
GS.on('rendered',r=>{if(r!=='play'||!state.active||!eligible.has(state.active.gameId))return;const x=state.active.x;if(!x||x.phase!=='intro')return;
 const link=all()[state.active.gameId];if(!valid(link)||!link)return;const main=document.querySelector('main .play-card');if(!main||main.querySelector('.gs-wa-qr'))return;
 let img='';try{const q=qrcode(0,'M');q.addData(link);q.make();img=q.createImgTag(4,4,'QR-code van de WhatsApp-groep');}catch{}
 const at=main.querySelector('.gs-checklist')||main.querySelector(':scope>h1');at?.insertAdjacentHTML('afterend',`<div class="gs-wa-qr">${img}<div><strong>Foto's en filmpjes delen?</strong><p class="e11-small">Scan om de WhatsApp-groep te openen. Optioneel: de klusbaas of jury beoordeelt ook gewoon live. Groepsleden zien elkaars telefoonnummer.</p><a href="${esc(link)}" target="_blank" rel="noopener noreferrer">WhatsApp-groep openen ↗</a></div></div>`);});
GS.define('evidence',{html,eligible,valid,all});
})();
