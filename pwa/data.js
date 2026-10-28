window.GAMES = [
{id:'pubquiz',name:'De Grote Pubquiz',category:'Quiz & kennisspellen',desc:'Vier themarondes, één winnend team. Van wereldkennis tot film, muziek en sport.',color:'#edbdc6',icon:'cup',time:'25–60 min',people:'2–24 spelers',tag:'Nieuw · Vier themarondes',kind:'quiz',material:'Eén scherm, pen en papier per team. Vier rondes: algemene kennis, de wereld, sport & spel en film & muziek. Kies 3, 5 of 10 vragen per ronde. Muziekvragen zijn tekstvragen, zonder geluidsfragmenten.'},
{id:'quiz',name:'Weet Ik Veel',category:'Quiz & kennisspellen',desc:'Van dieren tot wereldweetjes. Overleg, kies en ontdek wie verrassend veel weet.',color:'#f6d970',icon:'bulb',time:'15–25 min',people:'2–24 spelers',tag:'Kennisquiz · Groepsvariant',kind:'quiz',material:'Eén scherm, pen en papier per team. Geen andere spullen nodig.'},
{id:'challenge',name:'Duizendpoot',category:'Behendigheidsspellen',desc:'Kleine opdrachten, grote hilariteit. Wie heeft de handigste handen van de groep?',color:'#cbe5d8',icon:'cup',time:'20–40 min',people:'2–24 spelers',tag:'Behendigheid · Groepsvariant',kind:'challenge',material:'Plastic bekers, papier, pen, lepel, sokken en een munt. Lees opdrachten vooraf; vervang ze als spullen ontbreken.'},
{id:'logic',name:'De 1% Quiz',category:'Quiz & kennisspellen',desc:'Geen wandelende encyclopedie nodig. Wel een frisse blik en een beetje logisch denken.',color:'#dacff0',icon:'puzzle',time:'15–25 min',people:'2–24 spelers',tag:'Logica · Groepsvariant',kind:'quiz',material:'Eén scherm en pen en papier per team. Iedereen kan meedenken.'},
{id:'creative',name:'De Klusbaas',category:'Behendigheidsspellen',desc:'Bouw, verzin en beeld uit. Niet het perfecte antwoord, maar het leukste idee wint.',color:'#f4b18e',icon:'star',time:'25–45 min',people:'2–24 spelers',tag:'Creatief · Groepsvariant',kind:'challenge',material:'Papier, pennen en spullen die je al in huis hebt. Spreek vooraf af welke spullen gebruikt mogen worden.'},
{id:'friends',name:'Hoe goed ken je ons?',category:'Quiz & kennisspellen',desc:'Jullie verhalen zijn de vragen. Maak vooraf je eigen quiz over familie of vrienden.',color:'#c9dfed',icon:'people',time:'15–30 min',people:'2–24 spelers',tag:'Jullie in de hoofdrol',kind:'personal',material:'Voeg eerst minimaal drie eigen vragen met antwoorden toe. De maker kent de antwoorden en kan het best presenteren.'},
{id:'missions',name:'Geheime missies',category:'Moord & mysteriespellen',desc:'Geheime opdrachten tussen de bedrijven door. Niemand weet wat jij van plan bent.',color:'#e9d5bd',icon:'eye',time:'Het hele weekend',people:'3–18 spelers',tag:'Kleine geheimen',kind:'missions',material:'Deel de telefoon om de beurt door. Alleen de speler aan de beurt kijkt naar het scherm. Geen punten nodig.'}
];
const Q=(q,options,correct,explanation)=>({q,options,correct,explanation});
window.QUESTIONS={quiz:[
Q('Welk dier is een zoogdier?',['Haai','Dolfijn','Krokodil','Pinguïn'],1,'Een dolfijn ademt met longen en voedt zijn jongen met melk.'),
Q('Wat is de hoofdstad van Portugal?',['Porto','Madrid','Lissabon','Faro'],2,'Lissabon is de hoofdstad. Porto en Faro zijn ook Portugese steden.'),
Q('Hoeveel zijden heeft een zeshoek?',['Vijf','Zes','Zeven','Acht'],1,'Een zeshoek heeft zes zijden en zes hoeken.'),
Q('Welke planeet staat het dichtst bij de zon?',['Venus','Aarde','Mercurius','Mars'],2,'Vanaf de zon is de volgorde: Mercurius, Venus, Aarde, Mars.'),
Q('Waarmee ademt een vis onder water?',['Longen','Kieuwen','Vinnen','Schubben'],1,'Kieuwen halen zuurstof uit het water.'),
Q('In welk land ligt de stad Florence?',['Frankrijk','Spanje','Italië','Griekenland'],2,'Florence ligt in de Italiaanse regio Toscane.'),
Q('Hoeveel minuten zitten er in anderhalf uur?',['75','80','90','100'],2,'Een uur is 60 minuten; een half uur is 30 minuten.'),
Q('Welk instrument heeft meestal 88 toetsen?',['Viool','Trompet','Piano','Gitaar'],2,'Een moderne standaardpiano heeft 52 witte en 36 zwarte toetsen.'),
Q('Welke kleur krijg je door blauwe en gele verf te mengen?',['Paars','Groen','Oranje','Rood'],1,'Bij het mengen van gewone blauwe en gele verf ontstaat groen.'),
Q('Welk werelddeel is het grootst qua oppervlakte?',['Afrika','Europa','Azië','Zuid-Amerika'],2,'Azië is het grootste werelddeel qua oppervlakte.'),
Q('Welke sport speel je met een shuttle?',['Tennis','Squash','Badminton','Hockey'],2,'Bij badminton sla je een shuttle met een racket over het net.'),
Q('Hoe heet bevroren water?',['Stoom','IJs','Mist','Dauw'],1,'Water wordt ijs als het bevriest.'),
Q('Welke van deze dieren heeft zes poten?',['Spin','Mier','Duizendpoot','Krab'],1,'Een mier is een insect. Insecten hebben zes poten.'),
Q('Wat is het hoofdingrediënt van guacamole?',['Courgette','Avocado','Erwt','Komkommer'],1,'Guacamole is een gerecht op basis van avocado.'),
Q('Welke oceaan ligt tussen Europa en Noord-Amerika?',['Indische Oceaan','Stille Oceaan','Atlantische Oceaan','Zuidelijke Oceaan'],2,'De Atlantische Oceaan ligt tussen deze werelddelen.'),
Q('Hoeveel spelers van één volleybalteam staan tijdens een gewone zaalwedstrijd op het veld?',['Vijf','Zes','Zeven','Elf'],1,'Bij regulier zaalvolleybal staan zes spelers per team in het veld.'),
Q('Welke taal spreekt men hoofdzakelijk in Brazilië?',['Spaans','Portugees','Frans','Italiaans'],1,'Portugees is de officiële taal van Brazilië.'),
Q('Welk schaakstuk beweegt in een L-vorm?',['Loper','Toren','Paard','Koning'],2,'Het paard gaat twee velden in één richting en één veld haaks daarop.'),
Q('Hoeveel dagen heeft een schrikkeljaar?',['364','365','366','367'],2,'Een schrikkeljaar heeft een extra dag: 29 februari.'),
Q('Waar komt de zon ongeveer op?',['Noorden','Oosten','Zuiden','Westen'],1,'De zon komt ongeveer in het oosten op en gaat in het westen onder.'),
Q('Welke van deze getallen is een priemgetal?',['9','15','17','21'],2,'17 is alleen deelbaar door 1 en zichzelf.'),
Q('Welke vogel kan achteruit vliegen?',['Struisvogel','Kolibrie','Pinguïn','Kip'],1,'Kolibries kunnen stilhangen en achteruit vliegen.'),
Q('Hoe heet het proces waarbij een rups een vlinder wordt?',['Verdamping','Metamorfose','Fotosynthese','Migratie'],1,'De verandering van lichaamsvorm heet metamorfose.'),
Q('Hoeveel graden is een rechte hoek?',['45','90','180','360'],1,'Een rechte hoek is een kwart van een volledige draai: 90 graden.')
],logic:[
Q('Wat volgt er in deze reeks: 2, 4, 8, 16, …?',['20','24','30','32'],3,'Elk getal is het vorige getal maal twee.'),
Q('Je haalt tijdens een hardloopwedstrijd de nummer twee in. Op welke plaats loop je nu?',['Eerste','Tweede','Derde','Dat kun je niet weten'],1,'Je neemt de plaats van de nummer twee over.'),
Q('Vijf machines maken vijf knopen in vijf minuten. Hoe lang doen honderd van dezelfde machines over honderd knopen?',['5 minuten','20 minuten','100 minuten','500 minuten'],0,'Elke machine maakt één knoop in vijf minuten. Ze werken tegelijk.'),
Q('Een kilo veren en een kilo stenen. Wat is zwaarder?',['De veren','De stenen','Ze wegen evenveel','Dat hangt van de kleur af'],2,'Beide wegen precies één kilogram.'),
Q('Welke maand heeft minstens 28 dagen?',['Alleen februari','Februari en maart','Alle maanden','Alleen de wintermaanden'],2,'Alle maanden hebben minstens 28 dagen.'),
Q('Een vader en zoon zijn samen 50 jaar. De vader is 30 jaar ouder. Hoe oud is de zoon?',['10','15','20','25'],0,'De zoon is 10 en de vader 40: samen 50, verschil 30.'),
Q('Wat volgt: 1, 1, 2, 3, 5, 8, …?',['10','11','12','13'],3,'Elk nieuw getal is de som van de twee voorgaande getallen.'),
Q('Drie kinderen krijgen elk twee appels uit een mand met acht appels. Hoeveel blijven in de mand?',['Twee','Drie','Vier','Zes'],0,'Acht min drie keer twee is twee.'),
Q('Je hebt drie rode en twee blauwe sokken in een donkere lade. Hoeveel moet je er minstens pakken om zeker een paar van dezelfde kleur te hebben?',['Twee','Drie','Vier','Vijf'],1,'Bij drie sokken moeten er minstens twee dezelfde kleur hebben.'),
Q('Gisteren was het maandag. Welke dag is het overmorgen?',['Woensdag','Donderdag','Vrijdag','Zaterdag'],1,'Vandaag is het dinsdag; overmorgen is het donderdag.'),
Q('Een elektrische trein rijdt naar het noorden. De wind komt uit het westen. Waarheen waait de rook van de locomotief?',['Oosten','Zuiden','Noorden','Er is geen rook'],3,'Een elektrische locomotief produceert geen rook door verbranding.'),
Q('Wat volgt: 3, 6, 9, 12, …?',['13','14','15','18'],2,'Je telt er steeds drie bij op.'),
Q('Er zijn vier hoeken in een kamer. In elke hoek zit één kat. Hoeveel katten zijn er?',['Vier','Acht','Twaalf','Zestien'],0,'Eén kat in elk van de vier hoeken maakt vier katten.'),
Q('Hoeveel keer kun je 10 van 100 aftrekken voordat je onder nul komt?',['Negen','Tien','Elf','Honderd'],1,'Na tien keer is de uitkomst nul. De elfde keer kom je onder nul.'),
Q('Een boek kost €10 plus de helft van zijn eigen prijs. Wat kost het boek?',['€10','€15','€20','€25'],2,'De helft van de prijs is €10; de hele prijs is dus €20.'),
Q('Je gooit een gewone dobbelsteen. Hoeveel verschillende even uitkomsten zijn mogelijk?',['Twee','Drie','Vier','Zes'],1,'De even uitkomsten zijn 2, 4 en 6.')
]};
window.TASKS={challenge:[
{q:'Bouw de hoogste bekertoren',detail:'Gebruik per team zes plastic bekers. Bouw een vrijstaande toren op tafel. Hij moet na afloop vijf seconden blijven staan.',seconds:60,judge:'De hoogste stabiele toren wint. Gelijke hoogte? Beide teams krijgen een punt.'},
{q:'Papieren precisie',detail:'Maak drie propjes papier. Gooi ze vanaf één meter in een beker. Elk team krijgt drie pogingen.',seconds:60,judge:'De meeste rake worpen winnen. Zet de beker voor ieder team op dezelfde plek.'},
{q:'Het muntmoment',detail:'Laat een munt draaien op tafel. Ieder team krijgt drie pogingen. Meet de langste draaitijd met een aparte stopwatch.',seconds:60,judge:'De langste gemeten draaitijd wint. De app-timer is alleen de voorbereidingstijd.'},
{q:'Teken met je andere hand',detail:'Teken een fiets met de hand waarmee je normaal niet schrijft. Je krijgt één minuut.',seconds:60,judge:'Laat iedereen stemmen op de duidelijkste fiets. Niet op je eigen team stemmen; gelijkspel mag.'},
{q:'De sokkenworp',detail:'Maak één zachte sokkenbal per team. Gooi vanaf twee meter in een mand of bak. Ieder team krijgt vijf worpen.',seconds:60,judge:'De meeste rake worpen winnen. Gebruik voor iedereen dezelfde afstand.'},
{q:'Van groot naar klein',detail:'Zoek vijf voorwerpen van jullie team en leg ze in volgorde van geschat gewicht. Geen breekbare of zware spullen.',seconds:60,judge:'Controleer met een keukenweegschaal. Geen weegschaal? Sla deze opdracht over. Meeste correcte posities wint.'},
{q:'De stille rij',detail:'Ga met je team op volgorde van geboortemaand staan, van januari tot december. Praten en schrijven mag niet.',seconds:45,judge:'Controleer de volgorde. Elk team dat volledig goed staat krijgt één punt.'},
{q:'Lepelbalans',detail:'Iedere speler loopt met een opgerolde sok op een lepel vijf meter heen en terug. De lepel houd je in je hand. Niet rennen.',seconds:90,judge:'Het team met de meeste voltooide rondjes wint. Gevallen sok? Terug naar de start van dat rondje.'},
{q:'Tien dieren in tien tellen?',detail:'Schrijf als team zo veel mogelijk verschillende dieren op die beginnen met een K. Jullie hebben dertig seconden.',seconds:30,judge:'Het team met de meeste geldige, verschillende diernamen wint.'},
{q:'Een toren van papier',detail:'Gebruik drie vellen papier. Bouw zonder tape een vrijstaande toren op tafel.',seconds:120,judge:'De hoogste toren die vijf seconden blijft staan wint.'},
{q:'Geheugen op tafel',detail:'Eén team legt acht kleine voorwerpen neer. De anderen kijken twintig seconden en draaien zich om. Dek de spullen af en schrijf ze op. Wissel daarna.',seconds:20,judge:'Tel de goed herinnerde voorwerpen. Het team met het hoogste aantal wint.'},
{q:'Zoek de kleur',detail:'Zoek als team vier verschillende, onbreekbare voorwerpen met iets groens. Blijf in de afgesproken ruimte.',seconds:45,judge:'Elk team met vier verschillende passende voorwerpen krijgt een punt.'}
],creative:[
{q:'Verkoop deze pollepel',detail:'Bedenk een reclame voor een gewone pollepel alsof het de uitvinding van het jaar is. Bereid voor en presenteer daarna maximaal dertig seconden.',seconds:120,judge:'Stem op de overtuigendste of grappigste reclame. Niet op je eigen team stemmen; gelijkspel mag.'},
{q:'Het portret zonder te kijken',detail:'Teken een teamgenoot terwijl je alleen naar die persoon kijkt. Kijk niet naar het papier en haal de pen niet van het papier.',seconds:60,judge:'Iedereen stemt op het meest herkenbare portret van een ander team.'},
{q:'Vakantiehuis van de toekomst',detail:'Ontwerp op papier het gekste vakantiehuis. Het moet één oplossing hebben voor een probleem dat jullie dit weekend echt hebben.',seconds:180,judge:'Laat ieder team presenteren. Stem op de leukste combinatie van idee en oplossing.'},
{q:'De levende ansichtkaart',detail:'Beeld als team een vakantiebestemming uit zonder te praten. De andere teams moeten raden welke bestemming jullie bedoelen.',seconds:90,judge:'Elk team waarvan de bestemming binnen dertig seconden wordt geraden krijgt één punt.'},
{q:'Een ode aan de sok',detail:'Schrijf een gedicht van vier regels over een verdwaalde sok. Laat regel twee en vier rijmen.',seconds:120,judge:'Lees om de beurt voor. Stem op het leukste gedicht van een ander team.'},
{q:'Verzin een nieuwe sport',detail:'Bedenk een sport die je op één vierkante meter kunt spelen. Geef hem een naam en drie duidelijke regels.',seconds:120,judge:'Presenteer de sport. Stem op het idee dat de groep het liefst echt wil proberen.'},
{q:'Jullie in drie woorden',detail:'Kies drie woorden die jullie groep beschrijven. Maak er daarna een teamslogan van maximaal tien woorden van.',seconds:90,judge:'Ieder team stemt op de treffendste slogan van een ander team.'},
{q:'Maak iets onmisbaars',detail:'Ontwerp met papier een nieuw hulpmiddel voor een vriendenweekend. Geef het een naam en demonstreer hoe het werkt.',seconds:180,judge:'Stem op het origineelste bruikbare idee. Je eigen team telt niet mee.'},
{q:'De stomme film',detail:'Bereid een scène voor waarin iemand zijn sleutel kwijt is, hem vindt en ontdekt dat het de verkeerde is. Geen woorden gebruiken.',seconds:120,judge:'Speel de scène in maximaal dertig seconden. Stem op de duidelijkste of grappigste uitvoering.'},
{q:'Een onverwacht souvenir',detail:'Kies een gewoon voorwerp in de kamer. Verzin in één minuut een bijzonder verhaal over waar het vandaan komt.',seconds:60,judge:'Vertel het verhaal in dertig seconden. Stem op het creatiefste verhaal van een ander team.'},
{q:'Het groepslogo',detail:'Ontwerp een logo voor jullie weekend. Verwerk er één herkenbaar kenmerk van jullie groep in.',seconds:120,judge:'Toon de ontwerpen tegelijk en stem op een ander team.'},
{q:'Nieuws uit het vakantiehuis',detail:'Maak een kort nieuwsbericht over een heel gewone gebeurtenis van vandaag, alsof het wereldnieuws is.',seconds:120,judge:'Presenteer in maximaal dertig seconden. Stem op het leukste nieuwsbericht.'}
]};
window.MISSIONS=[
'Laat iemand uit zichzelf een liedje zingen. Je mag vragen om een liedje, maar je missie niet onthullen.',
'Zorg dat drie mensen tegelijk een duim omhoog doen voor een foto. Vraag altijd of ze op de foto willen.',
'Laat iemand het woord “avontuur” zeggen zonder dat je het zelf uitspreekt.',
'Krijg iemand zover om jou een nieuw woord te leren.',
'Zorg dat iemand een grappig verhaal van een eerdere vakantie vertelt.',
'Laat iemand jou een high five geven zonder om een high five te vragen.',
'Laat iemand de groep een raadsel stellen.',
'Krijg iemand zover om een voorwerp in de kamer een bijnaam te geven.',
'Zorg dat twee anderen samen een dier uitbeelden.',
'Laat iemand jou vragen hoe laat het is.',
'Krijg iemand zover om een compliment aan een ander groepslid te geven.',
'Laat iemand vertellen wat zijn of haar favoriete vakantiegerecht is.',
'Zorg dat iemand een groepsfoto voorstelt, zonder zelf het woord groepsfoto te gebruiken.',
'Laat iemand een nieuwe teamnaam bedenken.',
'Krijg iemand zover om twintig seconden lang een bekend persoon na te doen.',
'Laat iemand een denkbeeldige uitvinding uitleggen.',
'Laat iemand vertellen welke superkracht die zou willen hebben.',
'Zorg dat iemand een dierengeluid maakt zonder het geluid zelf voor te doen.'
];
window.FUTURE=[
['Echt Hollands!','Een Hollandse spelshowavond met taal, muziek, kennis en teamrondes.','Quiz & kennisspellen'],
['Terug in de tijd','Kies een jaar of decennium en raad muziek, nieuws, televisie en gebeurtenissen van toen.','Quiz & kennisspellen'],
['De Bolleboos','Associëren, verbanden leggen, herkennen en een finale op tijd.','Quiz & kennisspellen'],
['Met het Mes op Tafel','Kennis combineren met bluffen en virtuele fiches.','Quiz & kennisspellen'],
['Vakkenstrijd','Herkenningsduels om digitale speelvakken.','Quiz & kennisspellen'],
['De Jongens tegen de Meisjes','Twee zelfgekozen teams met kennis, uitbeelden en uitdagingen.','Quiz & kennisspellen'],
['De Achtervolging','Neem het als groep op tegen een quizkampioen.','Quiz & kennisspellen'],
['Het Moordspel','Iedereen krijgt een personage. Verzamel aanwijzingen, ondervraag elkaar en ontdek de dader.','Moord & mysteriespellen'],
['Het Verraad','Geheime rollen, gezamenlijke opdrachten en stemrondes.','Moord & mysteriespellen'],
['Code van Coppens','Een escapemysterie voor jullie vakantiehuis.','Moord & mysteriespellen'],
['Gekke 88','Foto-uitdagingen, teams en een buitenklassement.','Buitenspellen'],
['Smokkeltocht','Smokkelaars, controleurs en geheime routes.','Buitenspellen'],
['Rangen & Vlaggen','Geheime rangen, teams en vlaggen veroveren.','Buitenspellen'],
['Opgejaagd','Jagers en voortvluchtigen binnen een afgesproken speelgebied.','Buitenspellen'],
['Eilandexpeditie','Samenwerken, puzzelen en behendigheidsproeven in de buitenlucht.','Buitenspellen'],
['Sprong in het duister','Kies tussen zekere punten en een verrassende uitdaging.','Buitenspellen'],
['Hitlijn','Muziek herkennen en nummers op een tijdlijn plaatsen.','Muziek & feestspellen'],
['Casino Night','Tafels, uitleg en een fictief fichesklassement.','Muziek & feestspellen']
];
window.CATEGORIES=[
{name:'Quiz & kennisspellen',short:'Quiz & kennis',desc:'Pubquizzen, spelshows en vragen over jullie eigen groep.',icon:'bulb',color:'#f6d970'},
{name:'Behendigheidsspellen',short:'Behendigheid',desc:'Bouwen, mikken, uitbeelden en creatieve uitdagingen.',icon:'cup',color:'#cbe5d8'},
{name:'Moord & mysteriespellen',short:'Moord & mysterie',desc:'Moordspellen, geheime rollen en puzzels.',icon:'eye',color:'#dacff0'},
{name:'Buitenspellen',short:'Buitenspellen',desc:'Smokkeltocht, Gekke 88 en avonturen in teams.',icon:'star',color:'#f4b18e'},
{name:'Muziek & feestspellen',short:'Muziek & feest',desc:'Van een muziektijdlijn tot een complete casinoavond.',icon:'dice',color:'#c9dfed'}
];

// Original text-based pub quiz. Four themes with ten questions each.
window.PUB_THEMES=['Algemene kennis','De wereld','Sport & spel','Film & muziek'];
window.QUESTIONS.pubquiz=[
...window.QUESTIONS.quiz.slice(0,10).map(q=>({...q,category:'Algemene kennis'})),
...[
Q('Door welke stad stroomt de Seine?',['Londen','Parijs','Rome','Berlijn'],1,'De Seine stroomt door Parijs.'),
Q('Welk land heeft de vorm van een laars?',['Noorwegen','Portugal','Italië','Kroatië'],2,'Italië wordt vaak vergeleken met een laars.'),
Q('Welke stad ligt in twee werelddelen, Europa en Azië?',['Istanbul','Athene','Caïro','Wenen'],0,'Istanbul ligt aan beide zijden van de Bosporus.'),
Q('Welke woestijn ligt in het noorden van Afrika?',['Gobi','Sahara','Atacama','Kalahari'],1,'De Sahara strekt zich uit over het noorden van Afrika.'),
Q('Van welk land is Oslo de hoofdstad?',['Zweden','Denemarken','Noorwegen','Finland'],2,'Oslo is de hoofdstad van Noorwegen.'),
Q('Welke berg is gemeten vanaf zeeniveau de hoogste ter wereld?',['Mont Blanc','Kilimanjaro','Mount Everest','Matterhorn'],2,'De top van Mount Everest ligt het hoogst boven zeeniveau.'),
Q('In welk land ligt de oude stad Machu Picchu?',['Mexico','Peru','Chili','Brazilië'],1,'Machu Picchu ligt in de Andes in Peru.'),
Q('Welk land grenst direct ten zuiden aan Nederland?',['Frankrijk','Luxemburg','België','Zwitserland'],2,'België grenst aan het zuiden van Nederland.'),
Q('Welk land ligt op het Iberisch Schiereiland, naast Spanje?',['Italië','Griekenland','Portugal','Ierland'],2,'Portugal ligt aan de westkant van het Iberisch Schiereiland.'),
Q('Welke rivier stroomt door Londen?',['Rijn','Donau','Theems','Seine'],2,'De Theems stroomt door Londen.')
].map(q=>({...q,category:'De wereld'})),
...[
Q('Welke kleur heeft de leiderstrui van het algemeen klassement in de Tour de France?',['Groen','Geel','Rood','Wit'],1,'De leider van het algemeen klassement draagt de gele trui.'),
Q('Hoeveel vakjes heeft een standaard schaakbord?',['32','48','64','100'],2,'Acht rijen maal acht kolommen is 64 vakjes.'),
Q('Bij welke sport hoort de term “hole-in-one”?',['Darts','Golf','Bowlen','Cricket'],1,'Bij golf gaat de bal bij een hole-in-one met één slag in de hole.'),
Q('Hoeveel ogen hebben tegenoverliggende zijden van een gewone dobbelsteen samen?',['Zes','Zeven','Acht','Negen'],1,'De paren zijn 1 en 6, 2 en 5, en 3 en 4: samen steeds zeven.'),
Q('Hoeveel spelers per team staan bij regulier veldvoetbal aan het begin op het veld?',['Negen','Tien','Elf','Twaalf'],2,'Een regulier voetbalteam start met elf spelers, inclusief de keeper.'),
Q('Hoeveel punten is de buitenste bull bij standaard darts waard?',['20','25','40','50'],1,'De buitenste bull is 25 punten waard; de binnenste bull 50.'),
Q('Hoe lang is een officiële marathon?',['40 km','41,195 km','42,195 km','43 km'],2,'De officiële marathonafstand is 42 kilometer en 195 meter.'),
Q('Met welk schaakstuk kun je over andere stukken heen springen?',['Toren','Paard','Dame','Loper'],1,'Het paard kan bij zijn zet over andere stukken heen springen.'),
Q('Bij welke sport gebruik je een puck?',['Waterpolo','IJshockey','Basketbal','Handbal'],1,'IJshockey speel je met een puck.'),
Q('Hoeveel ringen heeft het olympische symbool?',['Vier','Vijf','Zes','Zeven'],1,'Het olympische symbool bestaat uit vijf ringen.')
].map(q=>({...q,category:'Sport & spel'})),
...[
Q('Welke band maakte het nummer “Bohemian Rhapsody”?',['ABBA','Queen','U2','The Beatles'],1,'Bohemian Rhapsody is een nummer van Queen.'),
Q('Uit welk land komt ABBA?',['Noorwegen','Denemarken','Zweden','Finland'],2,'ABBA is een Zweedse popgroep.'),
Q('Hoe heet de cowboy in Toy Story?',['Woody','Buzz','Andy','Rex'],0,'Woody is de cowboy; Buzz Lightyear is de ruimteheld.'),
Q('Welk instrument bespeel je met een strijkstok?',['Trompet','Viool','Piano','Drumstel'],1,'Een viool bespeel je meestal met een strijkstok.'),
Q('Welke tovenaar heeft een litteken in de vorm van een bliksemschicht?',['Merlijn','Gandalf','Harry Potter','Dumbledore'],2,'Harry Potter heeft een bliksemvormig litteken op zijn voorhoofd.'),
Q('Welke groep zong “Dancing Queen”?',['Queen','ABBA','Boney M.','Bee Gees'],1,'Dancing Queen is een nummer van ABBA.'),
Q('Hoe heet de sneeuwpop uit Frozen?',['Sven','Olaf','Kristoff','Hans'],1,'Olaf is de sneeuwpop. Sven is het rendier.'),
Q('Hoeveel snaren heeft een standaardgitaar meestal?',['Vier','Vijf','Zes','Acht'],2,'Een standaardgitaar heeft zes snaren.'),
Q('Welke filmreeks speelt zich onder meer af op de planeet Tatooine?',['Star Wars','Jurassic Park','Shrek','The Hunger Games'],0,'Tatooine is een planeet uit Star Wars.'),
Q('Welke artiest stond bekend als de “King of Pop”?',['Elvis Presley','Michael Jackson','Prince','David Bowie'],1,'Michael Jackson stond bekend als de King of Pop.')
].map(q=>({...q,category:'Film & muziek'}))
];
