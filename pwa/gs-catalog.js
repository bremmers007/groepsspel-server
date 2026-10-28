/* Groepsspel 0.14 — één bron voor wat een speler over een spel wil weten vóór het starten.
 * De spelmotoren (GAMES in data.js/catalog.js) blijven ongewijzigd; dit is de presentatielaag:
 * spelers, duur, speelwijze, moeilijkheid, materiaal en wat er technisch nodig is.
 *
 * mode:   tablet  = één gedeeld apparaat, geen server
 *         phones  = iedere speler/team een eigen telefoon, spelserver nodig (pc, mobiel internet of online)
 *         show    = quizmaster + optioneel groot scherm; draait op dit apparaat
 * server: 'required'  het spel werkt alleen met spelserver
 *         'optional'  er is een volwaardige versie op dit apparaat én een telefoonversie
 *         false       nooit een server nodig
 * teams:  [min,max] teams in de lokale (quizmaster)versie; null = spelers worden in het spel zelf opgegeven
 */
(function(){
'use strict';
const T={quiz:'Quiz & kennis',muziek:'Muziek',buiten:'Buiten & actie',mysterie:'Mysterie & rollen',bord:'Bordspel',feest:'Feest & creatief'};
const META={
 ticket:   {mode:'tablet',type:'bord',players:[2,5],minutes:[30,60],level:'gemiddeld',materials:'Eén tablet (liefst 10 inch of groter)',server:false,teams:null},
 monopoly: {mode:'tablet',type:'bord',players:[2,6],minutes:[45,120],level:'gemiddeld',materials:'Eén tablet (liefst 10 inch of groter)',server:false,teams:null},
 murder:   {mode:'phones',type:'mysterie',players:[6,12],minutes:[60,90],level:'gemiddeld',materials:'Eigen telefoon per speler',server:'required',teams:null,fallback:true},
 traitors: {mode:'phones',type:'mysterie',players:[6,18],minutes:[45,90],level:'gemiddeld',materials:'Eigen telefoon per speler',server:'required',teams:null,fallback:true},
 missions: {mode:'phones',type:'mysterie',players:[3,18],minutes:[60,480],level:'makkelijk',materials:'Eigen telefoon per speler',server:'required',teams:null,fallback:true,weekend:true},
 strategy: {mode:'phones',type:'buiten',players:[8,30],minutes:[45,75],level:'gemiddeld',materials:'Eén telefoon per speler, twee vlaggen of linten, twee basisbordjes met codes en veilig terrein',server:'required',teams:null,fallback:true},
 crazy:    {mode:'phones',type:'buiten',players:[4,40],minutes:[45,120],level:'makkelijk',materials:'Telefoon per team, afgesproken speelgebied',server:'required',teams:null,fallback:true},
 smuggle:  {mode:'phones',type:'buiten',players:[6,60],minutes:[45,75],level:'gemiddeld',materials:'Eén telefoon per speler, vier postbordjes met codes (printen of overschrijven), afgebakend terrein; lading is digitaal',server:'required',teams:null,fallback:true},
 hunted:   {mode:'phones',type:'buiten',players:[6,30],minutes:[45,120],level:'uitdagend',materials:'Eén telefoon per speler, drie postbordjes, een extractiebordje, herkenning voor jagers en veilig speelgebied',server:'required',teams:null,fallback:false},
 musicbingo:{mode:'phones',type:'muziek',players:[4,40],minutes:[30,60],level:'makkelijk',materials:'Muziek-app + speakers, telefoon per team',server:'required',teams:null,fallback:true},
 wordrace: {mode:'phones',type:'feest',players:[4,24],minutes:[15,30],level:'makkelijk',materials:'Telefoon per team',server:'required',teams:null},
 buzz:     {mode:'phones',type:'quiz',players:[4,40],minutes:[20,60],level:'gemiddeld',materials:'Telefoon per team als buzzer, pc als spelleider',server:'required',teams:null},
 stadskwis:{mode:'phones',type:'buiten',players:[4,100],minutes:[60,180],level:'gemiddeld',materials:'Telefoon per team, eigen locaties',server:'required',teams:null},
 pubquiz:  {mode:'show',type:'quiz',players:[2,40],minutes:[25,60],level:'gemiddeld',materials:'Pen en papier per team (of telefoons via de spelserver)',server:'optional',teams:[2,6]},
 friends:  {mode:'show',type:'quiz',players:[3,24],minutes:[15,30],level:'makkelijk',materials:'Minstens drie eigen vragen (Instellingen → Eigen vragen)',server:'optional',teams:[2,6]},
 floor:    {mode:'show',type:'quiz',players:[2,24],minutes:[30,50],level:'gemiddeld',materials:'Quizmaster met laptop; tv of beamer aanbevolen',server:false,teams:[2,6]},
 smart:    {mode:'show',type:'quiz',players:[3,24],minutes:[30,50],level:'uitdagend',materials:'Quizmaster met laptop; tv of beamer aanbevolen',server:false,teams:[3,3]},
 holland:  {mode:'show',type:'quiz',players:[4,24],minutes:[30,60],level:'makkelijk',materials:'Pen en papier, ruimte om uit te beelden',server:'optional',teams:[2,6]},
 year:     {mode:'show',type:'quiz',players:[2,24],minutes:[30,45],level:'gemiddeld',materials:'Pen en papier; voor de muziekronde een muziek-app',server:false,teams:[2,6]},
 chase:    {mode:'show',type:'quiz',players:[2,24],minutes:[20,50],level:'uitdagend',materials:'Quizmaster met laptop of tablet',server:false,teams:[2,6]},
 hitster:  {mode:'show',type:'muziek',players:[2,24],minutes:[30,60],level:'makkelijk',materials:'Muziek-app + speaker; startlijst inbegrepen',server:false,teams:[2,6]},
 challenge:{mode:'show',type:'feest',players:[3,24],minutes:[30,60],level:'makkelijk',materials:'Spullen uit huis (bekers, sokken, papier, munten, meetlint)',server:false,teams:[3,6]},
 creative: {mode:'show',type:'feest',players:[3,24],minutes:[30,60],level:'makkelijk',materials:'Papier, pennen, plakband, spullen uit huis',server:false,teams:[2,6]},
 casino:   {mode:'show',type:'feest',players:[2,24],minutes:[30,90],level:'makkelijk',materials:'Alleen dit apparaat (fictieve fiches)',server:false,teams:[2,6]},
 /* Spellen die (nog) niet in de bibliotheek staan blijven bestaan, met eigen naam. */
 logic:    {mode:'show',type:'quiz',players:[2,24],minutes:[15,25],level:'uitdagend',materials:'Pen en papier',server:false,teams:[2,6],hidden:true},
 bluff:    {mode:'show',type:'quiz',players:[2,24],minutes:[25,40],level:'gemiddeld',materials:'Pen en papier',server:false,teams:[2,6],hidden:true},
 boys:     {mode:'show',type:'quiz',players:[4,24],minutes:[30,50],level:'makkelijk',materials:'Pen en papier, bekers',server:false,teams:[2,2],hidden:true},
 escape:   {mode:'show',type:'mysterie',players:[2,12],minutes:[30,45],level:'uitdagend',materials:'Pen en papier',server:false,teams:[1,6],hidden:true},
 musicquiz:{mode:'show',type:'muziek',players:[2,40],minutes:[30,60],level:'makkelijk',materials:'—',server:false,teams:null,hidden:true,concept:true},
 bezzerwizzer:{mode:'show',type:'quiz',players:[2,24],minutes:[30,60],level:'gemiddeld',materials:'—',server:false,teams:null,hidden:true,concept:true},
 wingspan: {mode:'tablet',type:'bord',players:[1,5],minutes:[30,70],level:'uitdagend',materials:'—',server:false,teams:null,hidden:true,concept:true}
};
/* Eigen namen voor de verborgen spellen die nog een merknaam droegen (de rest is in 0.13 hernoemd). */
const RENAME={escape:['De Codekraker','Code van Coppens'],bezzerwizzer:['Weetwedstrijd','Bezzerwizzer'],wingspan:['Vogelvlucht','Wingspan'],musicquiz:['Muziekquiz / Eindejaarslijst','Top 2000']};
for(const [id,[name,orig]] of Object.entries(RENAME)){const g=GAMES.find(x=>x.id===id);if(g){g.name=name;g.inspired=orig;if(window.INSPIRED_BY)INSPIRED_BY[id]=orig;}}
/* Achterhaalde tekst in de catalogus: Rijk van Limburg is sinds 0.12 speelbaar. */
{const g=GAMES.find(x=>x.id==='monopoly');if(g){g.prep='Tablet op tafel';g.material='Eén gedeelde tablet. Bord, dobbelstenen, kaarten, huur, veilingen en eindstand zitten in de app.';}}

const MODES={tablet:{label:'Eén tablet',long:'Eén grote tablet',icon:'▦'},phones:{label:'Eigen telefoons',long:'Ieder een telefoon',icon:'▥'},show:{label:'Spelshow',long:'Spelshow / groot scherm',icon:'▣'}};
const range=([a,b],unit='')=>a===b?`${a}${unit}`:`${a}–${b}${unit}`;
function meta(id){const m=META[id];if(!m)return null;const g=GAMES.find(x=>x.id===id);return {...m,id,game:g};}
function minutesLabel(m){return m.weekend?'Doorlopend (weekend)':range(m.minutes,' min');}
function needsLabel(m){return m.server==='required'?'Spelserver nodig (pc of online)':m.server==='optional'?'Op dit apparaat · telefoons optioneel':'Geen server of internet nodig';}
/** Spellen in de bibliotheek, in vaste volgorde per speelwijze. */
function visible(){const sel=new Set(window.PRODUCT_SELECTION?.now||Object.keys(META));return Object.keys(META).filter(id=>!META[id].hidden&&sel.has(id)&&GAMES.some(g=>g.id===id));}
/** Filter: {players, minutes, mode, type} — lege waarden tellen niet mee. */
function matches(id,f={}){const m=META[id];if(!m)return false;
 if(f.mode&&m.mode!==f.mode)return false;
 if(f.type&&m.type!==f.type)return false;
 if(f.players){const n=Number(f.players);if(n<m.players[0]||n>m.players[1])return false;}
 if(f.minutes){const n=Number(f.minutes);if(m.weekend||m.minutes[0]>n)return false;}
 return true;}
/** Eenvoudige aanbeveling op basis van groepsgrootte en wat er recent gespeeld is. */
function recommend(size,recent=[],n=3){const played=new Set(recent.map(r=>r.gameId));
 const pool=visible().filter(id=>!size||(size>=META[id].players[0]&&size<=META[id].players[1]));
 const score=id=>(played.has(id)?-5:0)+(id==='friends'&&(state.custom||[]).length<3?-4:0)+(META[id].server==='required'?-1:0)+(META[id].level==='makkelijk'?1:0);
 const byMode={};for(const id of pool.sort((a,b)=>score(b)-score(a)))(byMode[META[id].mode]||=[]).push(id);
 const out=[];while(out.length<n&&Object.values(byMode).some(a=>a.length))for(const k of ['show','tablet','phones'])if(byMode[k]?.length&&out.length<n)out.push(byMode[k].shift());
 return out;}
GS.define('catalog',{META,TYPES:T,MODES,meta,visible,matches,recommend,minutesLabel,needsLabel,range});
})();
