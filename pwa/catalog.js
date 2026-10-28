// Shared-screen group variants. Each entry has its own rules and preparation.
const CAT={quiz:'Quiz & kennisspellen',skill:'Behendigheidsspellen',mystery:'Moord & mysteriespellen',outdoor:'Buitenspellen',party:'Muziek & feestspellen'};
const extend=(id,engine,extra={})=>Object.assign(GAMES.find(g=>g.id===id),{engine,...extra});
extend('pubquiz','pub',{tag:'Vier themarondes',prep:'Direct starten',place:'Binnen',age:10});
extend('quiz','exam',{tag:'Kennis & rapportcijfer',prep:'Direct starten',place:'Binnen',age:8});
extend('logic','logic',{tag:'Logica & drie levens',prep:'Direct starten',place:'Binnen',age:10});
extend('challenge','skill',{tag:'Meten is weten',prep:'Spullen klaarleggen',place:'Allebei',age:8});
extend('creative','creative',{tag:'Creativiteit & jury',prep:'Spullen klaarleggen',place:'Allebei',age:8});
extend('friends','personal',{tag:'Jullie eigen verhalen',prep:'Vooraf invullen',place:'Binnen',age:8});
Object.assign(GAMES.find(g=>g.id==='missions'),{tag:'Doorlopend weekendspel',prep:'Direct starten',place:'Allebei',age:8});
const add=(id,name,engine,category,desc,material,extra={})=>GAMES.push({id,name,engine,category,desc,material,color:({[CAT.quiz]:'#f6d970',[CAT.skill]:'#cbe5d8',[CAT.mystery]:'#dacff0',[CAT.outdoor]:'#f4b18e',[CAT.party]:'#c9dfed'})[category],icon:({[CAT.quiz]:'bulb',[CAT.skill]:'cup',[CAT.mystery]:'eye',[CAT.outdoor]:'star',[CAT.party]:'dice'})[category],time:'30–60 min',people:'2–24 spelers',tag:'Speelbare groepsvariant',kind:'extended',prep:'Direct starten',place:category===CAT.outdoor?'Buiten':'Binnen',age:10,...extra});
add('holland','Echt Hollands!','holland',CAT.quiz,'Een complete teamavond met kennis, taal, uitbeelden, schatten en een dubbele finale.','Pen en papier, ruimte om uit te beelden. Eén spelleider beoordeelt open antwoorden en opdrachten.',{time:'30–60 min',age:8});
add('year','Terug in de tijd','year',CAT.quiz,'Reis terug naar een gekozen jaar. Speel nieuws-, cultuur- en herinneringsvragen.','Kies een van de vijf uitgewerkte jaren. Eigen herinneringsvragen kun je vooraf toevoegen via de vriendenquiz.',{time:'20–35 min'});
add('smart','De Bolleboos','smart',CAT.quiz,'Verzamel seconden met trefwoorden en puzzels. Speel daarna een afvalfinale op de klok.','Eén spelleider leest vragen, beoordeelt antwoorden en bedient de teamklokken.',{time:'30–50 min'});
add('bluff','Met het Mes op Tafel','bluff',CAT.quiz,'Weet je het antwoord of durf je te bluffen? Zet fictieve fiches in en kies spelen of passen.','Pen en papier. Elk team begint met 20 fictieve fiches; geen geld of prijzen met geldwaarde.',{time:'25–40 min'});
add('floor','Vakkenstrijd','floor',CAT.quiz,'Verover een speelbord met herkenningsduels tegen aangrenzende teams.','Twee tot zes teams. De spelleider beoordeelt de mondelinge antwoorden tijdens korte duels.',{time:'30–50 min'});
add('boys','De Jongens tegen de Meisjes','mixed',CAT.quiz,'Twee teams voorspellen, weten, beelden uit en dagen elkaar uit. Kies zelf wie tegen wie speelt.','Precies twee teams, pen en papier en een paar plastic bekers. Teams hoeven niet op geslacht te worden ingedeeld.',{time:'30–50 min',teamLimit:2,age:8});
add('chase','De Achtervolging','chase',CAT.quiz,'Een quizkampioen jaagt op de rest. Goede antwoorden verplaatsen jullie op het achtervolgingsbord.','Twee tot zes teams. Team 1 is de jager, de overige teams proberen te ontsnappen.',{time:'20–40 min'});
add('murder','Het Moordspel','murder',CAT.mystery,'Drie moordscenario\'s (waaronder een Limburgse carnavalsavond) met elk drie mogelijke daders en drie moeilijkheden: personages, geheimen, drie onderzoeksrondes en een ontknoping.','Zes tot twaalf spelers, ieder met een eigen telefoon via de pc-server. Zonder server is er een eenvoudige versie waarbij je één apparaat doorgeeft.',{time:'60–90 min',people:'6–12 spelers',minPlayers:6,maxPlayers:12,age:12});
add('traitors','Het Verraad','traitors',CAT.mystery,'Ontdek geheime verraders via opdrachten, nachtkeuzes en anonieme stemrondes.','Zes tot achttien spelers. Tijdens privéfasen kijkt alleen de aangegeven speler of groep naar het apparaat.',{time:'45–90 min',people:'6–18 spelers',minPlayers:6,maxPlayers:18,age:12});
add('escape','Code van Coppens','escape',CAT.mystery,'Kraak de vakantiesafe met zes samenhangende puzzels, hints en een lopende klok.','Pen en papier. Alles staat op het scherm; er hoeft niets in huis te worden verstopt.',{time:'30–45 min',people:'2–12 spelers',age:10});
add('crazy','Gekke 88','crazy',CAT.outdoor,'Kies uit 88 foto-, observatie- en creatieve opdrachten. De spelleider controleert het bewijs.','Eén telefoon of opdrachtenlijst per team; één centrale spelleider houdt de score bij. Spreek speelgebied, eindtijd en verzamelplek af.',{time:'45–120 min',prep:'Spelgebied afspreken',age:8});
add('smuggle','Smokkeltocht','smuggle',CAT.outdoor,'Smokkelaars vervoeren lading tussen posten, terwijl controleurs proberen te onderscheppen.','Voor de telefoonversie: vier posten met codebordjes, één telefoon per speler en een spelserver. Ladingen zijn digitaal, niet op papieren kaartjes. Spreek terrein en tikregels af.',{time:'45–75 min',prep:'Posten klaarzetten'});
add('strategy','Rangen & Vlaggen','strategy',CAT.outdoor,'Geheime rangen, tactische tikduels en een vlag om te veroveren.','Precies twee teams. Print de rangkaarten, spreek een begrensd speelveld en twee basissen af. Eén spelleider registreert de duels.',{teamLimit:2,time:'45–75 min',prep:'Kaarten printen',age:8});
add('hunted','Opgejaagd','hunted',CAT.outdoor,'Vlucht langs controleposten en bereik de extractie voordat de jagers je vinden.','Team 1 is de jager. Spreek minimaal drie posten, een eindpunt en contactwijze af. De spelleider registreert posten en vangsten handmatig; geen live GPS.',{time:'45–90 min',prep:'Posten afspreken'});
add('expedition','Eilandexpeditie','course',CAT.outdoor,'Zes samenwerkings- en behendigheidsproeven, een teamklassement en een finale.','Plastic bekers, papier, zachte sokkenballen, lepel, mand en meetlint. Leg de zes eenvoudige proeven vooraf klaar.',{time:'45–90 min',prep:'Parcours klaarzetten',age:8});
add('unknown','Sprong in het duister','unknown',CAT.outdoor,'Kies in elke etappe voor een zekere opdracht of een onbekend risico.','Papier, pennen, plastic bekers en een afgebakend terrein. De keuzes en opdrachten worden op het scherm begeleid.',{time:'30–60 min',prep:'Spullen klaarleggen',age:8});
add('hitster','Hitlijn','timeline',CAT.party,'Luister via jullie eigen muziek-app en plaats nummers op de tijdlijn van je team.','Een DJ/spelleider met een eigen muzieklijst: titel, artiest, jaar en optionele afspeellink. De DJ speelt buiten deze app; de overige teams raden. De app bevat geen muziekfragmenten.',{time:'30–60 min',prep:'Muzieklijst invullen',age:8});
add('casino','Casino Night','casino',CAT.party,'Speel roulette, blackjack en hoger/lager met fictieve fiches en een avondklassement.','Elk team begint met 100 fictieve fiches. Geen inzet, aankoop of uitbetaling van echt geld.',{time:'30–90 min',age:12});
window.FUTURE=[];


GAMES.forEach(g=>{const values=(g.time.match(/\d+/g)||[]).map(Number);g.maxMinutes=values.length?Math.max(...values):9999;});
add('musicbingo','Muziekbingo','bingo',CAT.party,'Luister, herken en streep af. Ieder team krijgt een eigen bingokaart; de app controleert de bingo.','Een DJ met jullie eigen muziek-app en minimaal twaalf verschillende nummers in de muzieklijst. Ieder team krijgt een kaart met negen nummers. Print de kaarten of laat de spelleider digitaal afstrepen. De app speelt zelf geen muziek af.',{time:'30–60 min',maxMinutes:60,prep:'Muzieklijst invullen',age:8,tag:'Nieuw · Luister & streep af'});

const vividPalette={'Quiz & kennisspellen':'#ffd33d','Behendigheidsspellen':'#36d6a0','Moord & mysteriespellen':'#b28aff','Buitenspellen':'#ff8555','Muziek & feestspellen':'#ff80b9'};
CATEGORIES.forEach(c=>c.color=vividPalette[c.name]);GAMES.forEach(g=>g.color=vividPalette[g.category]||'#ffd33d');
// Product selection: archived quiz entry is no longer offered to new games.
window.GAMES=GAMES.filter(g=>g.id!=='quiz');
GAMES.forEach(g=>{g.needsTeamScreens=g.category===CAT.outdoor;g.stage=g.needsTeamScreens?'team-screens':'prototype';});

CAT.board='Bordspellen op tafel';
CATEGORIES.push({name:CAT.board,short:'Bordspellen',icon:'dice',color:'#ffe344',desc:'Een groot gedeeld speelbord op de tablet.'});
add('trivia-board','Kennisbord · tafelconcept',null,CAT.board,'Een kennisbord op een grote tablet: kies een categorie, beantwoord vragen en verzamel alle kleuren.','Concept: gedeeld bord met grote aanraakvlakken, beurtbeheer en een beamerweergave.',{time:'45–90 min',age:10,concept:true,display:'table',maxMinutes:90});
add('catan-table','Nieuw Land · tafelconcept',null,CAT.board,'Een digitaal handels- en bouwspel op een grote tablet voor de hele tafel.','Concept: grondstoffen, handelen, dorpen en routes op een gezamenlijk speelbord. Spelregels en vormgeving nog uit te werken.',{time:'60–120 min',people:'3–6 spelers',age:10,concept:true,display:'table',maxMinutes:120});
add('catan-outdoor','Nieuw Land buiten · concept',null,CAT.outdoor,'Verzamel grondstoffen bij buitenposten, handel met teams en bouw dorpen op een gezamenlijke kaart.','Concept: een spelleider beheert de centrale kaart; teams hebben een eigen telefoonscherm. Posten leveren hout, graan, steen en wol. Teams besteden deze aan routes en dorpen. Korte proeven leveren bonusgrondstoffen. Een vaste eindtijd bepaalt het einde.',{time:'90–180 min',people:'6–40 spelers',age:10,concept:true,needsTeamScreens:true,display:'teams',maxMinutes:180});
GAMES.forEach(g=>{if(g.concept){g.stage='concept';g.prep='Concept · nog niet speelbaar';}});
// Ideas discussed during the popularity review. Keep these opt-in until selected.
const reviewedIdeas=[
['wordrace','Halve Minuut',CAT.party,'Omschrijf begrippen onder tijdsdruk en laat je team zo veel mogelijk woorden raden.',30,12,'4–24 spelers'],
['werewolves','Nachtwolven',CAT.mystery,'Geheime rollen, overleg en stemrondes: ontdek wie de weerwolven zijn.',45,10,'8–18 spelers'],
['mole','De Saboteur',CAT.mystery,'Verdien samen punten met opdrachten terwijl een geheime saboteur tegenwerkt.',120,12,'6–24 spelers'],
['cityescape','Ontsnap uit de stad',CAT.outdoor,'Los aanwijzingen op bij posten en ontrafel onderweg een gezamenlijk mysterie.',120,10,'4–40 spelers'],
['musicquiz','Muziekquiz / Top 2000',CAT.party,'Herken artiesten, titels en fragmenten in een quiz met jullie eigen muziek.',60,10,'2–40 spelers'],
['bezzerwizzer','Bezzerwizzer',CAT.quiz,'Combineer kennisvragen met tactische keuzes tussen onderwerpen.',60,15,'2–24 spelers'],
['carcassonne','Tegelrijk',CAT.board,'Leg samen een landschap aan en scoor met wegen, steden en gebieden.',45,8,'2–5 spelers'],
['ticket','Sporen door Limburg',CAT.board,'Verzamel kaarten en verbind bestemmingen met routes op een gedeeld speelbord.',60,8,'2–5 spelers'],
['wingspan','Wingspan',CAT.board,'Bouw een natuurgebied en combineer de eigenschappen van vogels.',70,10,'1–5 spelers'],
['monopoly','Rijk van Limburg',CAT.board,'Koop straten, handel en ontwikkel een bezit op een gedeeld bord.',120,8,'2–6 spelers']
];
reviewedIdeas.forEach(([id,name,category,desc,minutes,age,people])=>add(id,name,null,category,desc,'Besproken spelidee. Regels, inhoud en digitale uitwerking moeten nog worden ontworpen.',{concept:true,candidate:true,needsTeamScreens:category===CAT.outdoor,stage:'concept',time:`30–${minutes} min`,maxMinutes:minutes,age,people,prep:'Concept · nog niet speelbaar',display:category===CAT.board?'table':category===CAT.outdoor?'teams':undefined}));

add('buzz','Buzzerquiz',null,CAT.quiz,'Quiz op het grote scherm, een grote drukknop op iedere teamtelefoon. Het snelste team krijgt het woord.','Concept: één spelleider en een centraal beamer- of tabletscherm. Teams doen mee via een code. De eerste geldige druk wordt centraal vastgelegd, andere buzzers vergrendelen. De spelleider beoordeelt het antwoord en opent de volgende vraag. Serververbinding, vertraging, herverbinding en eerlijke afhandeling moeten nog worden gebouwd.',{concept:true,candidate:true,needsTeamScreens:true,stage:'concept',time:'20–60 min',maxMinutes:60,age:8,people:'4–40 spelers',prep:'Concept · nog niet speelbaar',display:'teams'});
// Implemented local-session games use the separate PC host instead of a fake shared screen.
GAMES.find(g=>g.id==='buzz').concept=false;
GAMES.find(g=>g.id==='buzz').localMode='buzzer';
GAMES.find(g=>g.id==='buzz').stage='local';
GAMES.find(g=>g.id==='buzz').prep='PC-server en gezamenlijke wifi';
GAMES.find(g=>g.id==='pubquiz').localMode='quiz';
add('stadskwis','Stadskwis / dorpskwis',null,CAT.outdoor,'Vragen in het kwishonk, opdrachten op verschillende plekken en subgroepjes die tekst en foto’s insturen.','Acht eigen voorbeeldopdrachten, aanpasbare locaties en handmatige beoordeling. Teams kunnen buiten bereik inzendingen lokaal bewaren. Gebruik de pc-server voor gezamenlijke scores en het beoordelen van foto’s; een offline PWA-pakket voor opnieuw openen buiten wifi.',{candidate:true,localMode:'city',concept:false,needsTeamScreens:true,stage:'local',time:'60–180 min',maxMinutes:180,age:8,people:'4–100 spelers',prep:'Locaties afspreken en opdrachten aanpassen',display:'teams'});
