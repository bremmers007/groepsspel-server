/* Taalkeuze van de app. Sinds 0.15 zijn alle zes talen volledig: menu's, spelregels, vragen en alle
 * spelinhoud. Het vertalen zelf gebeurt in gs-i18n.js met de woordenboeken in i18n/<taal>.js.
 * (De menuvertalingen van 0.13/0.14 staan nu in i18n/tr/000-menus.tsv.)
 */
const LOCALES={nl:'Nederlands',en:'English',de:'Deutsch',fr:'Français',es:'Español',it:'Italiano'};
let appLanguage=window.GSI18N?.lang||'nl';
/** Vertaal een tekst naar de gekozen taal (meestal niet nodig: de pagina wordt vanzelf vertaald). */
function tr(text){return window.GSI18N?GSI18N.t(text):text;}
function applyLocale(){document.documentElement.lang=appLanguage;const head=document.querySelector('.header-inner');
 if(head&&!head.querySelector('#appLanguage')){const box=document.createElement('label');box.className='language-select';box.setAttribute('data-notranslate','');
  box.innerHTML=`<span>🌐</span><select id="appLanguage" aria-label="Taal · Language">${Object.entries(LOCALES).map(([v,t])=>`<option value="${v}" ${v===appLanguage?'selected':''}>${t}</option>`).join('')}</select>`;head.append(box);}}
const localeRender=render;render=function(){localeRender();applyLocale();};
document.addEventListener('change',e=>{if(e.target.id!=='appLanguage'&&e.target.id!=='gsLangSettings')return;const l=LOCALES[e.target.value]?e.target.value:'nl';
 if(window.GSI18N)GSI18N.setLang(l);else{try{localStorage.setItem('groepsspel-language',l);}catch{}location.reload();}});
window.addEventListener('DOMContentLoaded',applyLocale);
