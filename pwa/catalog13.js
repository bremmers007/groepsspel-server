/* Groepsspel 0.13 — eigen spelnamen, "geïnspireerd op", verborgen concepten en nieuwe speelwijzen.
 * Laadt direct na de catalogus en vóór app.js, zodat bewaarde spellen met de nieuwe speelwijze geldig blijven.
 */
'use strict';
/* Spellen die nog niet speelbaar zijn, worden helemaal uit de app gehaald. De broncode blijft bewaard. */
window.HIDDEN_GAMES=['werewolves','mole','cityescape','carcassonne','expedition','unknown','catan-outdoor','trivia-board','catan-table'];
/* Eigen naam en de titel van het origineel waarop het spel is geïnspireerd. */
window.INSPIRED_BY={holland:'Ik hou van Holland',year:'Oh, wat een jaar!',smart:'De Slimste Mens',floor:'The Floor',chase:'The Chase',buzz:'Buzz!',challenge:'De Alleskunner',creative:'Taskmaster',murder:'Cluedo',traitors:'De Verraders',hunted:'Hunted',hitster:'Hitster',wordrace:'30 Seconds',strategy:'Stratego',ticket:'Ticket to Ride',monopoly:'Monopoly',crazy:'Crazy 88'};
window.NAME_NOTICE='Groepsspel gebruikt eigen spelnamen. Waar een spel is geïnspireerd op een bekend tv-programma of bordspel, staat dat er tussen haakjes bij. Groepsspel is niet verbonden aan, gesponsord door of goedgekeurd door de makers of merkhouders daarvan. Merknamen zijn eigendom van hun rechthebbenden.';
(function(){
 const hidden=new Set(HIDDEN_GAMES);
 for(let i=GAMES.length-1;i>=0;i--)if(hidden.has(GAMES[i].id))GAMES.splice(i,1);
 if(window.PRODUCT_SELECTION){PRODUCT_SELECTION.now=PRODUCT_SELECTION.now.filter(id=>!hidden.has(id));PRODUCT_SELECTION.later=[];PRODUCT_SELECTION.hidden=[...hidden];}
 const set=(id,o)=>{const g=GAMES.find(x=>x.id===id);if(g)Object.assign(g,o);};
 for(const [id,orig] of Object.entries(INSPIRED_BY))set(id,{inspired:orig});
 /* De vier afgeronde quizmasterspellen krijgen een eigen speelwijze (zie shows13.js). */
 set('year',{engine:'jaar'});set('chase',{engine:'jacht'});set('challenge',{engine:'duizend'});set('creative',{engine:'klusbaas'});
 set('hunted',{name:'Opgejaagd',desc:'Vluchtteams lopen langs drie posten naar een geheim extractiepunt; de jagers zien op vaste pingmomenten waar ze het laatst waren. Iedereen speelt op de eigen telefoon.',material:'Eén telefoon per speler, de spelserver (pc of online) en een begrensd, veilig speelgebied. Print de postbordjes.',time:'45–120 min',tag:'Jagers tegen vluchters'});
 set('missions',{desc:'Iedereen krijgt op de eigen telefoon een geheime opdracht. Het "slachtoffer" bevestigt een gelukte missie; wie een ander betrapt, kan hem ontmaskeren.',material:'Eén telefoon per speler en de spelserver (pc of online). Zonder server kun je één apparaat doorgeven.',tag:'Geheime opdrachten op je telefoon'});
 set('musicbingo',{desc:'Ieder team een eigen bingokaart op de telefoon. De DJ draait muziek via de eigen muziek-app, teams strepen af en de server controleert iedere bingo.',material:'Een muziek-app en speakers, één telefoon per team en de spelserver (pc of online). Startlijst van 150 nummers of jullie eigen lijst.',tag:'Luister, streep af, BINGO!'});
})();
