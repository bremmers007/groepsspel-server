/* Groepsspel 0.13 — inhoud voor Terug in de tijd, Duizendpoot en De Klusbaas. */
'use strict';
/* Bekende gebeurtenissen met een vast jaartal: [omschrijving, jaar, symbool]. */
window.TIME_EVENTS=[
['De eerste mens zet voet op de maan',1969,'🌕'],['De Berlijnse Muur gaat open',1989,'🧱'],['Eurobiljetten en -munten worden betaalmiddel in Nederland',2002,'💶'],
['De Watersnoodramp treft Zeeland en Zuid-Holland',1953,'🌊'],['De Titanic zinkt op haar eerste reis',1912,'🚢'],['Nederland wordt Europees kampioen voetbal',1988,'⚽'],
['De laatste Elfstedentocht tot nu toe wordt geschaatst',1997,'⛸️'],['De eerste iPhone komt op de markt',2007,'📱'],['Google wordt opgericht',1998,'🔎'],
['Wikipedia gaat online',2001,'📚'],['YouTube gaat van start',2005,'▶️'],['Facebook wordt opgericht',2004,'👍'],['Ajax wint de Champions League in Wenen',1995,'🏆'],
['Willem-Alexander wordt koning',2013,'👑'],['Beatrix wordt koningin',1980,'👸'],['Het eerste Harry Potter-boek verschijnt',1997,'🧙'],
['Het eerste Eurovisiesongfestival wordt gehouden',1956,'🎤'],['De kernramp in Tsjernobyl',1986,'☢️'],['Nelson Mandela wordt vrijgelaten',1990,'✊'],
['De Spoetnik wordt als eerste satelliet gelanceerd',1957,'🛰️'],['De gebroeders Wright maken hun eerste gemotoriseerde vlucht',1903,'✈️'],
['De Olympische Spelen worden in Amsterdam gehouden',1928,'🏅'],['De Afsluitdijk wordt gesloten',1932,'🌉'],['Pretpark de Efteling gaat open',1952,'🎢'],
['De eerste officiële Nederlandse tv-uitzending',1951,'📺'],['De eerste Albert Heijn-winkel opent in Oostzaan',1887,'🛒'],['Het Verdrag van Maastricht wordt ondertekend',1992,'✍️'],
['ABBA wint het Eurovisiesongfestival met Waterloo',1974,'🎶'],['Nederland verliest de WK-finale van Spanje',2010,'🥈'],
['Max Verstappen wordt voor het eerst wereldkampioen Formule 1',2021,'🏎️'],['De eerste Koningsdag wordt gevierd',2014,'🧡'],['Duncan Laurence wint het Eurovisiesongfestival',2019,'🎹'],
['Joop Zoetemelk wint de Tour de France',1980,'🚴'],['Fanny Blankers-Koen wint vier gouden olympische medailles',1948,'🏃‍♀️'],['De Nederlandse Sesamstraat is voor het eerst op tv',1976,'🐦'],
['WhatsApp wordt opgericht',2009,'💬'],['Instagram wordt gelanceerd',2010,'📸'],['Windows 95 verschijnt',1995,'💻'],['Pokémon GO laat de halve wereld buiten rondlopen',2016,'🎮'],
['De Kanaaltunnel tussen Engeland en Frankrijk gaat open',1994,'🚇'],['De eerste cd’s worden in Japan verkocht',1982,'💿'],['Het eerste gesprek met een draagbare mobiele telefoon',1973,'☎️'],
['Nederland wordt bevrijd',1945,'🕊️'],['Vrouwen krijgen in Nederland actief kiesrecht',1919,'🗳️'],['Michael Jackson brengt het album Thriller uit',1982,'🕺'],
['De eerste Star Wars-film draait in de bioscoop',1977,'⭐'],['De film Titanic met Leonardo DiCaprio heeft zijn wereldpremière',1997,'🎬'],['Big Brother is voor het eerst op de Nederlandse tv',1999,'🏠'],
['De Nintendo Switch verschijnt',2017,'🕹️'],['Rembrandt voltooit De Nachtwacht',1642,'🖼️'],['Napoleon verliest de slag bij Waterloo',1815,'⚔️'],
['Columbus bereikt Amerika',1492,'🧭'],['De Maeslantkering bij Hoek van Holland wordt geopend',1997,'🚧'],['De Oosterscheldekering wordt geopend',1986,'🌬️'],
['Het eerste sms-bericht wordt verstuurd',1992,'✉️'],['Scholen in Nederland gaan dicht door corona',2020,'😷'],['Het Eurovisiesongfestival wordt in Rotterdam gehouden',2021,'🎤']
].map(([text,year,icon])=>({text,year,icon}));

/* Duizendpoot: korte proeven met spullen uit huis. higher=true: hoger resultaat is beter. */
window.SKILL_TRIALS=[
{q:'Bekertoren',detail:'Bouw met zes plastic bekers een vrijstaande toren. Hij moet vijf seconden blijven staan. Meet de hoogte.',unit:'centimeter',higher:true,seconds:90,material:'Zes bekers en een meetlint per kandidaat.'},
{q:'Sokkenmik',detail:'Gooi vijf keer een opgerolde sok vanaf twee meter in een mand of emmer.',unit:'rake worpen',higher:true,seconds:60,material:'Mand of emmer en een opgerolde sok.'},
{q:'Geheugenblad',detail:'Bekijk twintig seconden een dienblad met tien voorwerpen. Dek het af en schrijf op wat je zag.',unit:'goede voorwerpen',higher:true,seconds:60,material:'Dienblad, tien kleine voorwerpen en een doek.'},
{q:'Papieren brug',detail:'Overbrug met één vel papier de ruimte tussen twee bekers. Hoeveel muntjes houdt de brug tien seconden?',unit:'muntjes',higher:true,seconds:120,material:'Eén vel papier, twee bekers en muntjes.'},
{q:'Blinde tekening',detail:'Teken met je ogen dicht een fiets. De spelleider geeft 1 punt per herkenbaar onderdeel: twee wielen, stuur, zadel, trappers, ketting, frame.',unit:'onderdelen',higher:true,seconds:45,material:'Pen en papier.'},
{q:'Tien seconden',detail:'Start en stop de stopwatch zonder te kijken als je denkt dat er precies tien seconden voorbij zijn. Noteer het verschil met 10,0 in tienden.',unit:'tienden van een seconde ernaast',higher:false,seconds:30,material:'Een telefoon met stopwatch.'},
{q:'Lepelrace',detail:'Loop met een ei (of een tennisbal) op een lepel een afgezet rondje. Laat je hem vallen, dan begin je opnieuw. Meet de tijd.',unit:'seconden',higher:false,seconds:120,material:'Lepel, ei of tennisbal, afgezet rondje.'},
{q:'Woordenmaker',detail:'Maak in één minuut zo veel mogelijk woorden van minstens drie letters met de letters van ZOMERVAKANTIE.',unit:'geldige woorden',higher:true,seconds:60,material:'Pen en papier.'},
{q:'Muntjesstapel',detail:'Stapel met één hand zo veel mogelijk muntjes op elkaar in dertig seconden. De stapel moet blijven staan.',unit:'muntjes',higher:true,seconds:30,material:'Twintig muntjes per kandidaat.'},
{q:'Papieren vliegtuig',detail:'Vouw in één minuut een vliegtuigje en gooi het vanaf een streep. Meet de afstand tot de plek waar het stilligt.',unit:'centimeter',higher:true,seconds:90,material:'Een vel papier en een meetlint.'},
{q:'Dierenalfabet',detail:'Noem om de beurt een dier dat begint met de volgende letter van het alfabet. Wie het eerst geen dier weet of te lang twijfelt, telt de letters die hij haalde.',unit:'letters',higher:true,seconds:120,material:'Niets.'},
{q:'Ballonhoog',detail:'Houd een ballon zo lang mogelijk in de lucht, alleen met je hoofd. Tel het aantal tikken.',unit:'tikken',higher:true,seconds:60,material:'Een opgeblazen ballon per kandidaat.'},
{q:'Knopen tellen',detail:'Schat hoeveel knopen, rijst- of pastastukjes er in een glas zitten. De spelleider telt na.',unit:'ernaast',higher:false,seconds:30,material:'Een glas met knopen, rijst of pasta; de spelleider weet het aantal.'},
{q:'Krantentoren',detail:'Bouw met twee vellen krant en een stukje plakband een zo hoog mogelijke vrijstaande toren.',unit:'centimeter',higher:true,seconds:120,material:'Twee vellen krant, plakband en een meetlint.'},
{q:'Tafelvoetbal met een rietje',detail:'Blaas een propje papier met een rietje van de ene naar de andere kant van de tafel. Meet de tijd.',unit:'seconden',higher:false,seconds:60,material:'Rietje, propje papier en een tafel.'},
{q:'Vingerkunst',detail:'Raak in twintig seconden zo vaak mogelijk afwisselend je duim met je wijsvinger en je pink aan. De spelleider telt mee.',unit:'aanrakingen',higher:true,seconds:20,material:'Niets.'},
{q:'Glazen vullen',detail:'Vul een glas tot precies de streep die de spelleider heeft gezet, zonder te knoeien. De spelleider meet het verschil in millimeters.',unit:'millimeter ernaast',higher:false,seconds:45,material:'Kan water, glazen met een stiftstreep, liniaal.'},
{q:'Raad de lengte',detail:'Knip een touwtje af van precies dertig centimeter, zonder te meten. De spelleider meet.',unit:'centimeter ernaast',higher:false,seconds:30,material:'Touw, schaar en meetlint.'},
{q:'Sokken sorteren',detail:'Haal tien gemengde sokken uit een tas en leg ze geblinddoekt in paren. Tel de juiste paren.',unit:'goede paren',higher:true,seconds:60,material:'Tas met vijf paar sokken per kandidaat en een blinddoek.'},
{q:'Stoelendans zonder muziek',detail:'Sta op één been met je ogen dicht. Wie het langst blijft staan, wint. Meet de tijd.',unit:'seconden',higher:true,seconds:120,material:'Een stopwatch.'},
{q:'Liedjes uit een woord',detail:'De spelleider noemt het woord "liefde". Noem in één minuut zo veel mogelijk liedjes met dat woord in de titel.',unit:'liedjes',higher:true,seconds:60,material:'Niets.'},
{q:'Hoepeltijd',detail:'Laat een munt zo lang mogelijk op zijn kant rondtollen op tafel. De beste van drie pogingen telt.',unit:'seconden',higher:true,seconds:60,material:'Een munt en een gladde tafel.'},
{q:'Waterdrager',detail:'Breng met een eetlepel zo veel mogelijk water van de ene beker naar een lege beker in dertig seconden. Meet de hoogte.',unit:'millimeter',higher:true,seconds:30,material:'Eetlepel, twee bekers, water en een liniaal.'},
{q:'Ketting rijgen',detail:'Rijg in één minuut zo veel mogelijk pastabuisjes (penne) aan een touwtje.',unit:'pastabuisjes',higher:true,seconds:60,material:'Penne en een touwtje per kandidaat.'}
];
window.SKILL_TIEBREAKS=[
'Raad het getal: de spelleider denkt aan een getal tussen 1 en 100. Wie het dichtst in de buurt zit, blijft.',
'Wie het langst een boek op het hoofd houdt terwijl hij heen en weer loopt, blijft.',
'Noem om de beurt een land in Europa. Wie herhaalt of te lang twijfelt, valt af.',
'Gooi een muntje zo dicht mogelijk bij een muur. Wie het dichtst ligt, blijft.',
'Wie het eerst drie keer achter elkaar een propje in een beker gooit, blijft.',
'Tel zo snel mogelijk hardop terug van twintig naar nul. De snelste zonder fout blijft.'
];

/* De Klusbaas: opdrachten waarbij de klusbaas per opdracht 5 tot 1 punten geeft. */
window.BOSS_TASKS=[
{q:'Verkoop deze pollepel',detail:'Bedenk een reclame voor een gewone pollepel alsof het de uitvinding van het jaar is. Presenteer daarna maximaal dertig seconden.',seconds:120,judge:'Hoe overtuigend en grappig is de reclame?'},
{q:'Het portret zonder te kijken',detail:'Teken een teamgenoot terwijl je alleen naar die persoon kijkt. Kijk niet naar het papier en haal de pen niet van het papier.',seconds:60,judge:'Welk portret is het meest herkenbaar?'},
{q:'Maak iets onmisbaars',detail:'Ontwerp met papier een nieuw hulpmiddel voor een vriendenweekend. Geef het een naam en demonstreer hoe het werkt.',seconds:180,judge:'Origineel én bruikbaar telt.'},
{q:'De stomme film',detail:'Speel een scène waarin iemand zijn sleutel kwijt is, hem vindt en ontdekt dat het de verkeerde is. Geen woorden gebruiken.',seconds:120,judge:'Is het verhaal duidelijk zonder woorden?'},
{q:'Een onverwacht souvenir',detail:'Kies een gewoon voorwerp in de kamer. Vertel een bijzonder verhaal over waar het vandaan komt.',seconds:60,judge:'Het creatiefste verhaal wint.'},
{q:'Het groepslogo',detail:'Ontwerp een logo voor jullie weekend. Verwerk er één herkenbaar kenmerk van jullie groep in.',seconds:120,judge:'Herkenbaar, mooi en slim.'},
{q:'Nieuws uit het vakantiehuis',detail:'Maak een kort nieuwsbericht over een heel gewone gebeurtenis van vandaag, alsof het wereldnieuws is.',seconds:120,judge:'Hoe spannend wordt het gewone nieuws?'},
{q:'Het hoogste ding',detail:'Maak het hoogste vrijstaande bouwwerk met spullen die je in één minuut uit de kamer pakt. Alles moet terug zoals het was.',seconds:180,judge:'Het hoogste bouwwerk wint; vallen is nul.'},
{q:'De perfecte begroeting',detail:'Bedenk een nieuwe begroeting voor de groep met minstens drie bewegingen en een geluid. Leer hem aan de klusbaas.',seconds:120,judge:'Hoe aanstekelijk is de begroeting?'},
{q:'Het kleinste kunstwerk',detail:'Maak het kleinste kunstwerk dat nog herkenbaar iets voorstelt. Geef het een titel.',seconds:120,judge:'Klein, maar knap.'},
{q:'Raak de klusbaas',detail:'Laat de klusbaas zo hard mogelijk lachen in dertig seconden, zonder hem aan te raken.',seconds:60,judge:'Hoe hard lachte de klusbaas?'},
{q:'Het geheime voorwerp',detail:'Verstop een voorwerp ergens op je lichaam. De anderen krijgen tien seconden om het te vinden. Hoe minder ze het zien, hoe beter.',seconds:90,judge:'Het best verstopte voorwerp wint.'},
{q:'Raar maar waar',detail:'Vertel drie feiten over jezelf: twee waar, één verzonnen. De klusbaas raadt welke niet klopt.',seconds:90,judge:'Wie de klusbaas het best foppen, scoren het hoogst.'},
{q:'De langste zin',detail:'Maak een zin waarin elk woord met de volgende letter van het alfabet begint, vanaf A. Hoe verder, hoe beter.',seconds:120,judge:'Langste geldige zin wint.'},
{q:'Schaduwtheater',detail:'Maak met je handen en een lamp een schaduwfiguur die beweegt en een geluid maakt.',seconds:120,judge:'Herkenbaar en verrassend.'},
{q:'Ontwerp een feestdag',detail:'Bedenk een nieuwe feestdag voor de groep: naam, datum, traditie en een feestgerecht.',seconds:150,judge:'Wil de klusbaas dit echt vieren?'},
{q:'Het geluid van de kamer',detail:'Maak met spullen uit de kamer een ritme van tien seconden dat de klusbaas kan nadoen.',seconds:120,judge:'Origineelste ritme.'},
{q:'Blinde bouwer',detail:'Eén teamlid is geblinddoekt en bouwt met bekers een piramide. De anderen geven alleen aanwijzingen.',seconds:120,judge:'Hoe hoger en netter de piramide, hoe meer punten.'},
{q:'De slechtste uitvinding',detail:'Bedenk de meest onhandige uitvinding ooit en verkoop hem toch met volle overtuiging.',seconds:120,judge:'Hoe nuttelozer en overtuigender, hoe beter.'},
{q:'Eén woord per persoon',detail:'Vertel als team een verhaal waarin ieder om de beurt één woord zegt. Het verhaal moet een begin en een einde hebben.',seconds:90,judge:'Het samenhangendste verhaal wint.'},
{q:'Raad de klusbaas',detail:'Schrijf op wat de klusbaas vanavond als lievelingseten, film en droomreis kiest. De klusbaas onthult daarna.',seconds:60,judge:'Één punt per goed antwoord bepaalt de volgorde.'},
{q:'Recht houden',detail:'Breng een volle beker water zo snel mogelijk naar de overkant zonder te morsen. Je mag de beker niet met je handen vasthouden.',seconds:120,judge:'Snelste tijd met de minste morsen.'},
{q:'De tijdmachine',detail:'Speel een scène van dertig seconden in een tijdperk naar keuze. De klusbaas moet raden welk tijdperk het is.',seconds:120,judge:'Herkenbaar én grappig.'},
{q:'Overtuig de klusbaas',detail:'Overtuig de klusbaas dat jullie team de beste is, zonder iets over jullie zelf te zeggen.',seconds:90,judge:'Het slimste argument wint.'}
];
window.BOSS_PRIZES=[
'Neem binnen vijf minuten het meest verrassende voorwerp uit dit huis mee.',
'Neem het voorwerp mee waar je de mooiste herinnering bij hebt.',
'Neem het kleinste voorwerp mee dat je kunt vinden.',
'Neem iets mee dat het lekkerst ruikt.',
'Neem het voorwerp mee dat het meest op de klusbaas lijkt.',
'Neem iets mee dat geluid maakt.',
'Neem het oudste voorwerp mee dat je kunt vinden.',
'Neem iets mee waarvan niemand weet waar het voor dient.'
];
window.BOSS_LIVE=[
{q:'Live: propje in de beker',detail:'Iedereen tegelijk: gooi vanaf drie meter een propje papier in een beker. Wie het eerst raak gooit, wint. Volgorde van raak gooien bepaalt de punten.',seconds:60},
{q:'Live: de stille rij',detail:'Ga zonder te praten op volgorde van schoenmaat staan. Het snelste team zonder fout wint.',seconds:90},
{q:'Live: munt op de lijn',detail:'Schuif om de beurt een munt over tafel. Wie het dichtst bij de rand komt zonder dat hij valt, wint.',seconds:90},
{q:'Live: één minuut stil',detail:'Iedereen is stil en ontspannen. Wie het eerst praat, lacht of beweegt, valt af. De laatste wint.',seconds:120},
{q:'Live: het hoogste woord',detail:'Bouw met kaartjes of bierviltjes een woord van drie letters dat rechtop blijft staan. Het eerste team wint.',seconds:120},
{q:'Live: raad de tijd',detail:'Iedereen staat op, sluit de ogen en gaat zitten als er volgens hem precies één minuut voorbij is. Wie het dichtst bij zit, wint.',seconds:90}
];

/* Spelregels per nieuwe speelwijze. */
Object.assign(window.RULES,{
jaar:['Kies een jaar. Ronde 1: zes vragen over het nieuws van dat jaar, 1 punt per goed antwoord.','Ronde 2, raad het jaar: precies goed 3 punten, maximaal twee jaar ernaast 2 punten, maximaal vijf jaar ernaast 1 punt.','Ronde 3, voor of na: welke gebeurtenis was eerst? 1 punt.','Ronde 4, hit van toen (met jullie muzieklijst): de DJ draait een nummer. Het dichtstbijzijnde uitgavejaar krijgt 2 punten, precies goed 3. Titel en artiest geven elk 1 punt.','Eventueel jullie eigen herinneringsvragen: 1 punt.','Finale, de tijdmachine: zet vier gebeurtenissen op volgorde. Helemaal goed: 3 punten.'],
jacht:['Team 1 is de jager, de andere teams zijn kandidaten.','Snelle ronde: één minuut vragen. Elk goed antwoord is 10 punten voor de pot van de kandidaat.','Bod van de jager: de kandidaat kiest het middenbod (eigen pot, drie stappen voorsprong), het hoge bod (meer punten, twee stappen voorsprong) of het lage bod (minder punten, vier stappen voorsprong).','Achtervolging: meerkeuzevragen met drie opties. Goed antwoord: één stap omlaag. De jager ook goed: hij komt een stap dichterbij. Haalt de jager je in, dan ben je af. Bereik je huis, dan gaat je pot naar de eindpot.','Eindachtervolging: de thuisgekomen kandidaten krijgen samen twee minuten open vragen, plus één stap voorsprong per finalist.','Daarna heeft de jager twee minuten. Bij een fout van de jager mogen de kandidaten terugduwen: goed antwoord duwt de jager één stap terug.','Haalt de jager ze niet in, dan delen de finalisten de eindpot. Anders wint de jager de pot.'],
duizend:['Iedere kandidaat (of ieder team) doet dezelfde proef.','Afvalrace: na elke proef valt de kandidaat met het slechtste resultaat af. Bij een gedeelde laatste plaats volgt een beslisproef.','Bij twee kandidaten volgt de finale; de winnaar is de Duizendpoot.','Puntenrace: niemand valt af. Per proef krijgt de beste 3 punten, de tweede 2 en de rest 1.','Je eindpunten volgen uit je plaats: hoe later je afviel, hoe meer punten.'],
klusbaas:['Eén persoon is de klusbaas: die speelt niet mee en is de enige jury.','Eerst de prijsopdracht: iedereen neemt binnen vijf minuten iets mee dat bij de opdracht past.','Daarna de opdrachten. Lees de opdrachtkaart letterlijk voor. Alles wat er niet staat, mag.','Na elke opdracht geeft de klusbaas 5 punten aan de beste, 4 aan de tweede, enzovoort. Gelijk mag. Diskwalificatie is 0 punten.','De klusbaas mag bonuspunten geven en hoeft zijn keuze niet uit te leggen.','De live-opdracht aan het eind doen alle teams tegelijk.']
});
