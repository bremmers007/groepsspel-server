/* Groepsspel 0.15 — vertalingen voor de app én de spelserverpagina's.
 *
 * De spellen zijn in het Nederlands geschreven. Bij een andere taal vertaalt dit script alles wat in beeld
 * komt: teksten, knoppen, meldingen, vensters, vragen en spelinhoud, ook wat de spelserver stuurt.
 * Het woordenboek staat in i18n/<taal>.js (gemaakt door tools/i18n_build.py) en bevat:
 *   exact     vaste teksten   'Spel starten' → 'Start game'
 *   patterns  sjablonen       'Ronde {0} van {1}' → 'Round {0} of {1}'  (invulling wordt zelf ook vertaald)
 * Spellogica en opgeslagen gegevens blijven Nederlands; alleen de weergave verandert.
 * Elementen met translate="no" of data-notranslate (namen, eigen invoer) worden overgeslagen.
 */
(function(){
'use strict';
const LANGS={nl:'Nederlands',en:'English',de:'Deutsch',fr:'Français',es:'Español',it:'Italiano'};
const KEY='groepsspel-language';
const LOCALE={nl:'nl-NL',en:'en-GB',de:'de-DE',fr:'fr-FR',es:'es-ES',it:'it-IT'};
const qs=new URLSearchParams(location.search);
function stored(){try{return localStorage.getItem(KEY);}catch{return null;}}
const fromUrl=qs.get('taal')||qs.get('lang');
let lang=LANGS[fromUrl]?fromUrl:(LANGS[stored()]?stored():'nl');
if(LANGS[fromUrl]){try{localStorage.setItem(KEY,fromUrl);}catch{}}
const isServerPage=!/\/app\//.test(location.pathname)&&!document.querySelector('script[src*="languages.js"]');
const BASE=(document.currentScript?.src||'').replace(/gs-i18n\.js.*$/,'');

/* ------------------------------------------------------------------ woordenboek */
let produced=new Set(),exact=new Map(),pats=[],first=new Map(),last=new Map(),loose=[],cache=new Map(),ready=lang==='nl';
const norm=s=>s.replace(/\s+/g,' ').trim();
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function compile(src,dst){
  const parts=src.split(/(\{\d+\})/);const idx=[];let re='^';
  for(const p of parts){const m=p.match(/^\{(\d+)\}$/);if(m){idx.push(Number(m[1]));re+='(.*?)';}else re+=esc(p);}
  re+='$';const lit=src.replace(/\{\d+\}/g,'').length;
  const pat={re:new RegExp(re,'s'),idx,dst,lit};
  const fw=src.match(/^([^{\s]+)/),lw=src.match(/([^}\s]+)$/);
  if(fw){const k=fw[1].toLowerCase();if(!first.has(k))first.set(k,[]);first.get(k).push(pat);}
  else if(lw){const k=lw[1].toLowerCase();if(!last.has(k))last.set(k,[]);last.get(k).push(pat);}
  else loose.push(pat);
  pats.push(pat);}
function load(d){exact=new Map(Object.entries(d.exact||{}));pats=[];first=new Map();last=new Map();loose=[];cache=new Map();produced=new Set(Object.values(d.exact||{}));
  for(const [s,t] of d.patterns||[])compile(s,t);
  for(const m of [first,last])for(const l of m.values())l.sort((a,b)=>b.lit-a.lit);loose.sort((a,b)=>b.lit-a.lit);
  ready=true;}

const LETTER=/[A-Za-zÀ-ÿ]/;
function viaPattern(s,depth){
  const fw=(s.match(/^(\S+)/)||[])[1]?.toLowerCase(),lw=(s.match(/(\S+)$/)||[])[1]?.toLowerCase();
  /* 0.15: het sjabloon met de meeste vaste tekst eerst; korte sjablonen ('Nog {0}', '{0} van {1} {2}') niet op lange zinnen */
  const cands=[...(first.get(fw)||[]),...(last.get(lw)||[]),...loose].sort((a,b)=>b.lit-a.lit);
  for(const p of cands){if(s.length>300&&p.lit*3<s.length)continue;if(p.lit<12&&p.lit*6<s.length)continue;const m=p.re.exec(s);if(!m)continue;
    return p.dst.replace(/\{(\d+)\}/g,(_,n)=>{const v=m[1+p.idx.indexOf(Number(n))]??'';return depth<2?(tr(v,depth+1)):v;});}
  return null;}
/** Vertaal één tekst. Geeft de tekst ongewijzigd terug als er geen vertaling is (bijv. een naam). */
function tr(text,depth=0){
  if(lang==='nl'||!ready||text==null)return text;
  const raw=String(text);if(!LETTER.test(raw))return raw;
  const lead=raw.match(/^\s*/)[0],trail=raw.match(/\s*$/)[0],s=norm(raw);
  if(cache.has(s))return lead+cache.get(s)+trail;
  if(produced.has(s))return raw;          // al vertaald (bijv. tekst die het spel uit de pagina terugleest)
  let out=exact.get(s);
  if(out==null)out=viaPattern(s,depth);
  if(out==null){/* voor- en achtervoegsels zonder letters (✓, 3., →, :) los laten */
    const m=s.match(/^([^A-Za-zÀ-ÿ]*)(.*?)([^A-Za-zÀ-ÿ]*)$/s);
    if(m&&(m[1]||m[3])&&m[2]){const core=exact.get(m[2])??viaPattern(m[2],depth);if(core!=null)out=m[1]+core+m[3];}}
  if(out==null&&depth<2){/* samengestelde regels: 'A · B', 'A — B', 'A: B' */
    for(const sep of [' · ',' — ',' – ',' | ',': ',' / ']){if(!s.includes(sep))continue;
      const parts=s.split(sep),t=parts.map(p=>tr(p,depth+1));if(t.some((x,i)=>x!==parts[i])){out=t.join(sep);break;}}}
  if(out==null)out=s;
  if(cache.size>20000){cache.clear();produced.clear();}cache.set(s,out);if(out!==s)produced.add(out);
  return lead+out+trail;}

/* ------------------------------------------------------------------ pagina vertalen */
const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','CODE','PRE','NOSCRIPT','SELECT__SKIP']);
const ATTRS=['title','placeholder','aria-label','alt','data-tip'];
const mine=new WeakMap();      // tekstknoop → laatst door ons geschreven tekst
function skipEl(el){for(let e=el;e&&e.nodeType===1;e=e.parentElement){if(SKIP.has(e.tagName)||e.hasAttribute('data-notranslate')||e.getAttribute('translate')==='no'||e.isContentEditable)return true;}return false;}
function textNode(n){const v=n.nodeValue;if(!v||mine.get(n)===v||!LETTER.test(v))return;if(skipEl(n.parentElement))return;
  const t=tr(v);if(t!==v){n.nodeValue=t;}mine.set(n,n.nodeValue);}
function element(el){if(skipEl(el))return;
  for(const a of ATTRS){const v=el.getAttribute(a);if(v&&LETTER.test(v)){const k='gsTr'+a;if(el[k]===v)continue;const t=tr(v);if(t!==v)el.setAttribute(a,t);el[k]=el.getAttribute(a);}}
  if(el.tagName==='INPUT'&&/^(button|submit|reset)$/.test(el.type)&&el.value&&el.gsTrValue!==el.value){el.value=tr(el.value);el.gsTrValue=el.value;}}
function walk(root){if(lang==='nl'||!ready||!root)return;
  if(root.nodeType===3){textNode(root);return;}
  if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;
  if(root.nodeType===1){if(skipEl(root))return;element(root);}
  const it=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeType===1&&SKIP.has(n.tagName)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  for(let n=it.nextNode();n;n=it.nextNode()){if(n.nodeType===3)textNode(n);else element(n);}}
let pending=new Set(),scheduled=false;
function flush(){scheduled=false;const list=[...pending];pending.clear();for(const n of list)if(n.isConnected)walk(n);}
let burst=0,burstAt=0;
const obs=new MutationObserver(recs=>{const now=Date.now();if(now-burstAt>1000){burst=0;burstAt=now;}
  /* veiligheidsrem: nooit eindeloos blijven vertalen (bijv. als een spel steeds dezelfde tekst terugzet) */
  if(++burst>400){if(burst===401)console.warn('GSI18N: te veel wijzigingen, vertalen even gepauzeerd',recs[0]?.target);return;}
  for(const r of recs){
  if(r.type==='childList')r.addedNodes.forEach(n=>pending.add(n));
  else if(r.type==='characterData')pending.add(r.target);
  else if(r.type==='attributes')pending.add(r.target);}
  /* direct verwerken (vóór het tekenen), zodat er geen Nederlands door het beeld flitst */
  flush();});
function start(){if(lang==='nl')return;walk(document.documentElement);
  obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS.concat('value')});
  document.documentElement.classList.remove('gs-i18n-wait');}

/* ------------------------------------------------------------------ meldvensters, datums en getallen */
for(const f of ['alert','confirm','prompt']){const orig=window[f];if(typeof orig!=='function')continue;
  window[f]=function(msg,...rest){return orig.call(window,typeof msg==='string'?tr(msg):msg,...rest);};}
function swapLocale(l){if(lang==='nl')return l;if(l==null)return LOCALE[lang];const s=String(l);return /^nl(-|$)/i.test(s)?LOCALE[lang]:l;}
for(const [proto,fns] of [[Date.prototype,['toLocaleDateString','toLocaleTimeString','toLocaleString']],[Number.prototype,['toLocaleString']]]){
  for(const fn of fns){const orig=proto[fn];proto[fn]=function(l,...rest){return orig.call(this,swapLocale(l),...rest);};}}

/* ------------------------------------------------------------------ laden */
function setLang(l,reload=true){if(!LANGS[l])return;try{localStorage.setItem(KEY,l);}catch{}
  if(/^https?:$/.test(location.protocol))fetch('/api/taal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lang:l})}).catch(()=>{});
  if(reload){const u=new URL(location.href);u.searchParams.delete('taal');u.searchParams.delete('lang');location.replace(u.href);}}
function loadDict(){return new Promise(res=>{if(lang==='nl'){res();return;}
  if(window.GS_I18N_DATA?.[lang]){load(window.GS_I18N_DATA[lang]);res();return;}
  const s=document.createElement('script');s.src=BASE+'i18n/'+lang+'.js?v='+(window.EDITION||'');
  s.onload=()=>{if(window.GS_I18N_DATA?.[lang])load(window.GS_I18N_DATA[lang]);res();};s.onerror=()=>{lang='nl';res();};
  document.head.append(s);});}
document.documentElement.lang=lang;
if(lang!=='nl'){document.documentElement.classList.add('gs-i18n-wait');setTimeout(()=>document.documentElement.classList.remove('gs-i18n-wait'),2500);}
const loaded=loadDict().then(()=>{if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();});

/* Spelers op de telefoon: zonder eigen keuze de taal van de spelleider overnemen. */
if(isServerPage&&!stored()&&!LANGS[fromUrl]){fetch('/api/taal').then(r=>r.ok?r.json():null).then(d=>{if(d&&LANGS[d.lang]&&d.lang!==lang){try{localStorage.setItem(KEY,d.lang);}catch{}location.reload();}}).catch(()=>{});}

/** Kleine taalkiezer voor de serverpagina's. */
function picker(){const sel=document.createElement('select');sel.className='gs-langpick';sel.setAttribute('aria-label','Taal · Language');sel.setAttribute('data-notranslate','');
  sel.innerHTML=Object.entries(LANGS).map(([k,v])=>`<option value="${k}" ${k===lang?'selected':''}>${v}</option>`).join('');
  sel.addEventListener('change',()=>setLang(sel.value));return sel;}
if(isServerPage)document.addEventListener('DOMContentLoaded',()=>{const h=document.querySelector('header')||document.body;if(!h.querySelector('.gs-langpick'))h.append(picker());});

window.GSI18N={LANGS,get lang(){return lang;},locale:()=>LOCALE[lang],t:tr,walk,setLang,picker,loaded,load,stats:()=>({exact:exact.size,patterns:pats.length,ready})};
})();
