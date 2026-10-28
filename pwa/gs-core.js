/* Groepsspel 0.14 — gedeelde basis voor de nieuwe, losse onderdelen.
 *
 * Doel: nieuwe code hangt niet meer aan een toevallige scriptvolgorde of aan steeds weer een
 * extra render()-wrapper. Elk onderdeel registreert zich hier onder één naam:
 *   GS.define('storage', {...})        een onderdeel (opslag, catalogus, groep, vragen ...)
 *   GS.page('home', {title, html, after}) een scherm in de hoofdnavigatie
 * gs-shell.js koppelt de pagina's één keer aan de bestaande render().
 * Oudere bestanden (app.js, engines.js ...) blijven werken zoals ze waren.
 */
(function(root){
'use strict';
const modules={},pages={},listeners={};
const GS={
  version:'0.15.0',
  /** Registreer een onderdeel. Dubbele namen zijn een programmeerfout. */
  define(name,mod){if(modules[name])throw Error('GS-onderdeel bestaat al: '+name);modules[name]=mod;GS[name]=mod;return mod;},
  has:name=>!!modules[name],
  /** Registreer een scherm voor de hoofdnavigatie. */
  page(id,def){pages[id]=def;return def;},
  pages,
  /** Eenvoudige gebeurtenissen tussen onderdelen, bijvoorbeeld 'saved' of 'restored'. */
  on(ev,fn){(listeners[ev]||=[]).push(fn);},
  emit(ev,data){for(const fn of listeners[ev]||[])try{fn(data);}catch(e){console.error(e);}},
  /** Veilige HTML-escape, ook bruikbaar vóórdat app.js geladen is. */
  esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  /** FNV-1a-hash als korte controlesom (geen beveiliging, wel detectie van beschadigde bestanden). */
  hash(str){let h=2166136261;for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),16777619);return (h>>>0).toString(16).padStart(8,'0');},
  /** localStorage dat nooit een uitzondering gooit (privévenster, volle opslag). */
  ls:{
    get(k){try{return localStorage.getItem(k);}catch{return null;}},
    set(k,v){try{localStorage.setItem(k,v);return true;}catch{return false;}},
    del(k){try{localStorage.removeItem(k);return true;}catch{return false;}},
    json(k,fallback=null){try{const v=localStorage.getItem(k);return v==null?fallback:JSON.parse(v);}catch{return fallback;}}
  }
};
root.GS=GS;
})(window);
