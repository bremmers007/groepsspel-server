/* Offline speluitleg uit uitleg.json en game-guides-manual.json.
 * Automatisch gegenereerd door tools/build_guides.py — wijzig de bronbestanden.
 */
(function(){
'use strict';
const GUIDES={
  "ticket": {
    "goal": "Bouw treinroutes op de kaart van Limburg en verbind je geheime bestemmingen.",
    "prepare": [
      "Eén tablet op tafel voor 2 tot 5 spelers.",
      "Iedere speler kiest aan het begin minstens twee geheime bestemmingen. Geef de tablet daarvoor om de beurt door; de anderen kijken weg.",
      "Kaarten, routes en punten zitten in de app."
    ],
    "rules": [
      "In je beurt pak je treinkaarten (open of blind) of leg je een route met kaarten in de kleur van die route; jokers passen overal.",
      "Langere routes leveren meer punten op.",
      "Heeft iemand nog twee of minder treinen, dan speelt iedereen nog één beurt.",
      "Aan het eind telt een gehaalde bestemming positief en een niet-gehaalde negatief; de langste aaneengesloten route krijgt 10 bonuspunten.",
      "Je eigen kaarten zie je pas na 'Toon mijn kaarten'; daarna verbergt de app ze weer voor de volgende speler."
    ]
  },
  "monopoly": {
    "goal": "Koop straten van Herten tot het Vrijthof, bouw huizen en hotels en word de rijkste speler.",
    "prepare": [
      "Eén tablet midden op tafel; 2 tot 6 spelers spelen om de beurt op hetzelfde scherm.",
      "Kies de lengte: heel kort (8 rondes, ± 30 min), kort (15), normaal (25) of klassiek (tot één speler over is).",
      "Bord, dobbelstenen, geld, kaarten en huur zitten in de app; je hebt niets anders nodig."
    ],
    "rules": [
      "Gooi in je beurt de dobbelstenen. Kom je op een vrij eigendom, dan koop je het of gaat het naar een veiling.",
      "Op het eigendom van een ander betaal je huur. Met een hele kleurgroep mag je gelijkmatig huizen en hotels bouwen.",
      "Geldtekort? Verkoop huizen, neem een hypotheek of ruil met anderen. Lukt dat niet, dan ga je failliet.",
      "Bij een afgesproken aantal rondes wint het hoogste vermogen (geld + bezit); klassiek wint wie als laatste overblijft.",
      "Een vergissing? Gebruik 'Vorige stap herstellen'. Met + en − zoom je in op het bord."
    ]
  },
  "pubquiz": {
    "goal": "Scoor als team de meeste punten in vier themarondes.",
    "prepare": [
      "Maak 2–6 teams en kies een quizmaster die het scherm bedient.",
      "Leg pen en papier voor elk team klaar; optioneel tv of beamer om vragen gezamenlijk te tonen.",
      "Kies hoeveel vragen de rondes bevatten en geef ieder team een herkenbare naam."
    ],
    "rules": [
      "De quizmaster stelt de vragen per ronde; teams schrijven samen hun antwoorden op.",
      "De quizmaster vult de antwoorden in en toont daarna de goede antwoorden.",
      "Na elke ronde is er een tussenstand; het team met de meeste punten wint."
    ]
  },
  "friends": {
    "goal": "Ontdek welk team de vrienden of familie het beste kent.",
    "prepare": [
      "Voeg in Instellingen of de quizmaker ten minste drie persoonlijke vragen mét antwoorden toe.",
      "Laat bij voorkeur degene die de antwoorden kent presenteren; maak teams.",
      "Pen en papier voor de teams, eventueel een groter scherm."
    ],
    "rules": [
      "De presentator leest een persoonlijke vraag voor; teams overleggen.",
      "Teams noteren hun antwoord; de presentator onthult het juiste antwoord en kent punten toe.",
      "Het team met de meeste goede antwoorden kent de groep het best."
    ]
  },
  "floor": {
    "goal": "Verover het speelbord met herkenningsduels tegen aangrenzende vakken.",
    "prepare": [
      "2 tot 6 teams en één quizmaster met een laptop; een beamer voor het publieksscherm is handig.",
      "Elk team krijgt vakken met een categorie op het bord van 12 vakken.",
      "Spreek af wie per team antwoordt; antwoorden zijn mondeling."
    ],
    "rules": [
      "Het team aan de beurt kiest een buurvak van een ander team en speelt een duel in die categorie.",
      "Beide teams hebben een eigen klok (standaard 45 seconden). Alleen de klok van het team dat moet antwoorden loopt.",
      "Goed: de beurt gaat naar de tegenstander. Pas: nieuw beeld, maar je klok loopt door. Fout: de beurt blijft bij hetzelfde team.",
      "Wie op nul seconden staat, verliest het duel; de winnaar neemt de vakken over. Het team met de meeste vakken wint."
    ]
  },
  "smart": {
    "goal": "Verzamel seconden in vijf rondes en win de finale op de klok.",
    "prepare": [
      "Precies drie teams of kandidaten. Eén quizmaster bedient de console; een tv of beamer voor het publieksscherm is handig.",
      "Antwoorden worden mondeling gegeven; de quizmaster ziet het juiste antwoord.",
      "Zet 'Antwoorden direct tonen' uit als het quizmasterscherm zelf op de tv staat."
    ],
    "rules": [
      "Ieder team start met 60 seconden. Tijdens een beurt loopt alleen de klok van het team aan de beurt.",
      "3-6-9: goed op vraag 3, 6, 9 … levert 10 seconden op. Open Deur: 20 seconden per trefwoord. Puzzel: 30 per verband. Galerij: 15 per beeld. Collectieve geheugen: oplopend 10, 20, 30, 40, 50.",
      "Fout of pas: de beurt gaat naar het volgende team.",
      "Finale: de twee teams met de meeste seconden. Elk goed trefwoord kost de tegenstander 20 seconden; wie op nul staat, verliest."
    ]
  },
  "year": {
    "goal": "Reis terug naar één gekozen jaar en verdien punten met nieuws, jaartallen en herinneringen.",
    "prepare": [
      "Kies het jaar (1969 tot 2020). Maak teams en kies een quizmaster.",
      "Pen en papier per team. Voor de muziekronde: jullie muzieklijst met jaartallen en een muziek-app.",
      "Eigen herinneringsvragen voeg je vooraf toe bij Instellingen → Eigen vragen."
    ],
    "rules": [
      "Het nieuws van dat jaar: meerkeuzevragen, 1 punt per goed antwoord.",
      "Raad het jaar: precies goed 3 punten, hooguit 2 jaar ernaast 2, hooguit 5 jaar ernaast 1.",
      "Voor of na: welke gebeurtenis was eerst? 1 punt.",
      "Hit van toen en jullie eigen herinneringen (als ingeschakeld).",
      "Finale De tijdmachine: zet vier gebeurtenissen op volgorde voor 3 punten."
    ]
  },
  "chase": {
    "goal": "Ontsnap als kandidaat aan de jager en speel samen de eindachtervolging.",
    "prepare": [
      "Kies wie de jager is (een team of één slimme speler); de andere teams zijn kandidaten.",
      "Kies de lengte: normaal (snelle ronde 60 s, eindachtervolging 2 min) of kort (40 s en 90 s).",
      "Eén quizmaster bedient het apparaat en ziet de antwoorden."
    ],
    "rules": [
      "Snelle ronde: de kandidaat beantwoordt zoveel mogelijk vragen; elk goed antwoord is 10 punten voor de pot.",
      "Het bod: kies laag (4 stappen voorsprong), midden (3 stappen, eigen pot) of hoog (2 stappen). De jager mag de biedingen aanpassen.",
      "Achtervolging: kandidaat en jager kiezen elk A, B of C. Goed is één stap vooruit. Haalt de jager je in, dan ben je af; kom je thuis, dan brengt je de pot binnen.",
      "Eindachtervolging: wie thuis is, speelt samen. De jager moet het aantal stappen inhalen; bij een fout van de jager kunnen de kandidaten hem terugduwen."
    ]
  },
  "hitster": {
    "goal": "Leg als eerste team een tijdlijn van het afgesproken aantal nummers (5, 10 of 15).",
    "prepare": [
      "Een DJ met een muziek-app en speaker; Groepsspel speelt zelf geen muziek. Gebruik de startlijst of jullie eigen lijst met jaartallen.",
      "De DJ houdt de console voor zich; titel en artiest mogen niet op de tv verschijnen.",
      "Ieder team start met één kaart en een aantal tokens (afhankelijk van het niveau)."
    ],
    "rules": [
      "De DJ draait een nummer; het team aan de beurt legt het op de juiste plek in de eigen tijdlijn.",
      "Andere teams kunnen met een token de plaatsing uitdagen.",
      "Met een token kun je een nummer overslaan; met drie tokens koop je een kaart.",
      "Goed geplaatst = kaart erbij. Het eerste team met het afgesproken aantal kaarten wint."
    ]
  },
  "challenge": {
    "goal": "Wie is de Duizendpoot? Iedereen doet steeds dezelfde proef met spullen uit huis.",
    "prepare": [
      "Minstens drie kandidaten of teams en één spelleider die meet en de tijd bijhoudt.",
      "Kies de spullen: alles uit huis, zonder water en eieren, of weinig nodig (pen, papier, munten).",
      "Het introscherm toont een checklist van wat je voor de gekozen proeven klaarlegt.",
      "Optioneel: bewaar een WhatsApp-groepslink in het startvenster. Het introscherm toont dan een QR-code waarmee teams de groep openen."
    ],
    "rules": [
      "Afvalrace: na elke proef valt de zwakste af, tot er één Duizendpoot over is. Gelijke stand: een korte beslisproef.",
      "Puntenrace: 4, 6 of 8 proeven en niemand valt af; per proef punten op volgorde van het resultaat.",
      "De spelleider meet (hoogte, aantal, tijd) en voert de resultaten in; de app rekent de stand uit.",
      "Bij WhatsApp-bewijs beoordeelt de jury de ingestuurde beelden zelf; Groepsspel haalt geen berichten uit WhatsApp en kent niet automatisch punten toe."
    ]
  },
  "creative": {
    "goal": "Maak de beste, gekste of slimste oplossing en win de gunst van de klusbaas.",
    "prepare": [
      "Kies één klusbaas die niet meespeelt en altijd gelijk heeft.",
      "Papier, pennen, plakband, een schaar en spullen uit huis. Het introscherm toont een checklist.",
      "Kies 3, 4 of 6 opdrachten (± 30 tot 60 minuten) en eventueel een prijsopdracht.",
      "Optioneel: bewaar een WhatsApp-groepslink in het startvenster. Het introscherm toont dan een QR-code waarmee teams de groep openen."
    ],
    "rules": [
      "Alle teams krijgen dezelfde opdracht met een tijdslimiet.",
      "Daarna presenteren de teams; de klusbaas geeft per opdracht 5 tot 1 punten.",
      "De klusbaas mag punten uitleggen, maar hoeft dat niet. Het team met de meeste punten wint.",
      "Bij WhatsApp-bewijs beoordeelt de jury de ingestuurde beelden zelf; Groepsspel haalt geen berichten uit WhatsApp en kent niet automatisch punten toe."
    ]
  },
  "casino": {
    "goal": "Eindig met de meeste fictieve fiches in de casinospellen.",
    "prepare": [
      "Maak spelers of teams en leg één apparaat klaar.",
      "Alle fiches en spellen zitten in de app; er is geen echt geld of fysieke inzet nodig.",
      "Spreek af na hoeveel rondes je de eindstand opmaakt."
    ],
    "rules": [
      "Speel roulette of blackjack met uitsluitend digitale, fictieve fiches.",
      "Bij roulette bepaalt de gekozen inzet de uitbetaling; bij blackjack probeer je dichter bij 21 te komen dan de bank.",
      "Het hoogste fictieve fichesaldo wint; er wordt nooit met echt geld gespeeld."
    ]
  },
  "wordrace": {
    "goal": "Laat je team in korte tijd zoveel mogelijk geheime woorden raden.",
    "prepare": [
      "Start de spelserver op een pc en zorg voor een telefoon per team.",
      "Laat teams via de QR-code inloggen en wijs per ronde iemand aan die omschrijft.",
      "Spreek af dat het woord zelf of delen ervan niet genoemd mogen worden."
    ],
    "rules": [
      "De uitlegger ziet geheime woorden op het teamtoestel.",
      "Omschrijf de woorden hardop zonder ze letterlijk te zeggen.",
      "Markeer geraden of overgeslagen woorden vóór de tijd om is; daarna krijgt het volgende team een beurt."
    ]
  },
  "buzz": {
    "goal": "Wees het snelste team dat een quizvraag goed kan beantwoorden.",
    "prepare": [
      "Start de spelserver op een pc en verbind een tv of beamer voor de vragen.",
      "Elk team gebruikt een telefoon met de digitale buzzer en meldt zich aan via de QR-code.",
      "Kies een quizmaster die beoordeelt of een mondeling antwoord goed is."
    ],
    "rules": [
      "De quizmaster toont een vraag op het gezamenlijke scherm.",
      "Teams drukken zodra de buzzer opengaat; het eerste geldige team krijgt het woord.",
      "De quizmaster kent punten toe en opent de volgende vraag."
    ]
  },
  "stadskwis": {
    "goal": "Los samen zoveel mogelijk vragen en opdrachten op in de stad of het dorp.",
    "prepare": [
      "Start een pc-spelserver, laat teams met hun telefoon aanmelden en wijs een quizmaster aan.",
      "Controleer vóór vertrek de acht voorbeeldopdrachten en vervang voorbeeldlocaties door echte lokale plekken.",
      "Spreek terrein, route, eindtijd en verzamelplaats af; stem af hoe teams buiten wifi verdergaan.",
      "Optioneel: maak zelf een WhatsApp-groep en stel de uitnodigingslink in op de spelserver bij Bewijs & communicatie. Alleen aangemelde teams zien de link, niet het beamerscherm."
    ],
    "rules": [
      "Teams verdelen vragen en foto-opdrachten over kleinere groepjes.",
      "Antwoorden en foto’s worden via de telefoon ingestuurd en waar mogelijk offline bewaard.",
      "De quizmaster beoordeelt inzendingen en kent punten toe; het beste team wint.",
      "Bij WhatsApp-bewijs: stuur de foto met teamnaam en opdracht naar de groep en vink bij de inzending in Groepsspel aan dat het bewijs daar staat. De spelleider beoordeelt het handmatig."
    ]
  },
  "holland": {
    "goal": "Speel een Nederlandse quiz met kennis, dialect, gezegden, uitbeelden en schatten.",
    "prepare": [
      "Maak twee of meer teams en kies een presentator die de rondes leidt.",
      "Voor de versie op één apparaat: leg pen en papier klaar en zorg voor ruimte om uit te beelden. Een tv of beamer is handig, maar niet verplicht.",
      "Voor de telefoonversie: start de pc- of online spelserver en laat de teams aansluiten met de QR-code."
    ],
    "rules": [
      "De presentator begeleidt kennis-, taal-, uitbeeld- en schattingsrondes.",
      "Teams beantwoorden de vragen; de presentator beoordeelt de open opdrachten en houdt de score bij.",
      "De laatste schattingsronde telt dubbel. Het team met de meeste punten wint."
    ]
  },
  "traitors": {
    "goal": "Tussen jullie zitten verraders. Overdag vullen jullie samen de pot met opdrachten; aan de ronde tafel verbannen jullie wie je verdenkt; 's nachts slaan de verraders toe.",
    "prepare": [
      "Start Groepsspel op de pc en sluit de beamer aan (Win + P → Uitbreiden).",
      "Open Het Verraad op de pc en het beamerscherm via 'Open beamer'.",
      "Iedereen gebruikt dezelfde wifi en scant de QR-code.",
      "Eerste keer of kleine groep? Kies \"Eenvoudige variant\": één verrader, eindspel bij drie spelers, geen ultimatum."
    ],
    "rules": [
      "Bij 5–7 spelers is er 1 verrader, bij 8–12 zijn er 2, bij 13–17 zijn er 3, vanaf 18 zijn er 4. De spelleider kan dit aanpassen.",
      "Verraders kennen elkaar. Getrouwen weten van niemand iets.",
      "Opdrachten vullen de prijzenpot. Sommige opdrachten leveren een schild op: dat beschermt één nacht tegen moord.",
      "Aan de ronde tafel stemt iedereen op zijn telefoon. Een stem is definitief. Bij gelijke stand volgt een herstemming; is het dan weer gelijk, dan beslist het lot.",
      "'s Nachts kiezen de verraders samen een slachtoffer. Iedereen tikt op Welterusten, zodat niemand opvalt.",
      "Is er een verrader verbannen, dan mogen de verraders 's nachts ook iemand rekruteren in plaats van vermoorden.",
      "Bij het eindspel (standaard 4 spelers over) kiest iedereen: stoppen of nog iemand verbannen. Alleen als iedereen stopt, eindigt het spel. Zit er dan nog een verrader tussen, dan krijgen de verraders de hele pot.",
      "De Getrouwen winnen meteen als alle verraders weg zijn. De verraders winnen meteen als ze net zo groot zijn als de rest."
    ],
    "phases": [
      "Lobby: Iedereen meldt zich aan met zijn naam en bewaart zijn persoonlijke code.",
      "De selectie: Iedereen bekijkt zijn rol in stilte en tikt op 'Ik heb mijn rol gezien'.",
      "Dag: Kies een of meer opdrachten op de pc. Voer het bedrag in en geef eventueel een schild.",
      "Ronde tafel: Gesprek, daarna stemmen op de telefoon. De pc onthult stem voor stem.",
      "Verbannen: De verbannene mag iets zeggen, daarna onthult de pc de rol.",
      "Nacht: Telefoons: Welterusten. De verraders kiezen. Daarna 'De ochtend breekt aan'.",
      "Ontbijt: De pc onthult wie er ontbreekt."
    ],
    "tips": [
      "De pc toont nooit wie de verraders zijn: de spelleider kan gewoon meespelen.",
      "Speel 's avonds een ronde tafel en een nacht, en overdag de opdrachten.",
      "Kwijtgeraakte code? Op de pc onder 'Speler vertrekt of is zijn code kwijt'."
    ]
  },
  "murder": {
    "goal": "Een moordmysterie waarin iedereen een personage speelt. Iedereen heeft een geheim en een alibi, en één van jullie is de dader. In drie rondes komt het bewijs boven tafel; daarna beschuldigt iedereen in het geheim.",
    "prepare": [
      "Kies op de pc een scenario en de lengte van een ronde (standaard 25 minuten).",
      "Leg eventueel verkleedspullen klaar die bij de personages passen.",
      "Zet het beamerscherm aan: daar komen de opening, de plattegrond, het bewijs en de ontknoping.",
      "Kies de moeilijkheid: makkelijk (daderaanwijzingen een ronde eerder, drie keer delen per ronde), normaal of moeilijk (een ronde later, één keer delen)."
    ],
    "rules": [
      "Elk scenario heeft drie mogelijke daders. De app kiest er willekeurig één, dus je kunt een scenario vaker spelen.",
      "Je mag liegen over je eigen geheim, maar nooit over feiten die op je telefoon staan. De dader mag liegen over zijn eigen route.",
      "Per ronde mag je twee van je aanwijzingen delen met een andere speler. Die ziet ze dan op zijn eigen telefoon.",
      "Aanwijzingen van personages die niet meespelen, komen bij een ander personage terecht. Er gaat dus geen bewijs verloren.",
      "In de beschuldigingsronde kies je: wie, met welk middel en om welk motief.",
      "Punten: juiste dader 3, juist middel 1, juist motief 1. Wijst minder dan de helft de dader aan, dan ontsnapt de dader en krijgt die 5 punten."
    ],
    "phases": [
      "Personages: Iedereen leest personage, geheim en alibi en tikt op Klaar. De dader leest wat er echt gebeurd is.",
      "Ronde 1 · eerste verhoren: Eerste aanwijzingen. Praat met iedereen.",
      "Ronde 2 · het bewijs: Nieuwe aanwijzingen en een bewijsstuk op de beamer.",
      "Ronde 3 · de wending: De laatste aanwijzingen en een wending. De dader krijgt een afleidingsopdracht.",
      "Beschuldiging: Iedereen levert in het geheim een beschuldiging in.",
      "Ontknoping: De pc reconstrueert stap voor stap wat er gebeurde. Daarna volgen de dader en de punten."
    ],
    "tips": [
      "De pc-console toont nooit wie de dader is: de spelleider kan meespelen.",
      "Gebruik 'Ronde +5 min' als de gesprekken goed lopen.",
      "Kies personages zo dat de belangrijkste zes (de kernrollen) altijd meedoen."
    ]
  },
  "strategy": {
    "goal": "Twee teams, twee basissen, twee vlaggen. Iedereen heeft een geheime rang op zijn telefoon. Tik je een tegenstander, dan beslist een duel wie terug naar de basis moet. Breng de vlag van de ander naar je eigen basis.",
    "prepare": [
      "Zoek een terrein (bos, park, camping) en spreek duidelijke grenzen af.",
      "Kies twee basissen op minstens 150 meter van elkaar, elk met een vlag of lint.",
      "Print de basiscodes van de pc of schrijf ze op een bordje bij elke basis.",
      "De telefoons hebben geen wifi nodig in het veld; ze versturen alles zodra ze terug zijn bij wifi.",
      "Leg bij \"Speelgebied & veiligheid\" de grenzen van het speelveld vast. Spelers zien dit op hun telefoon."
    ],
    "rules": [
      "Rangen: 10 Maarschalk, 9 Generaal, 8–4 officieren, 3 Mineur, 2 Verkenner, 1 Spion en B Bom.",
      "Hogere rang wint. Gelijke rang: allebei terug naar de basis.",
      "De Spion verslaat de Maarschalk, maar alleen als de Spion tikt.",
      "De Bom blijft binnen 5 meter van de eigen vlag. Wie de Bom tikt, verliest, behalve de Mineur.",
      "Een Verkenner kan elke 10 minuten de code van een tegenstander scannen en zo diens rang zien zonder duel.",
      "Wie verliest, loopt terug naar de eigen basis en tikt daar de basiscode in. Na drie keer verliezen krijg je een nieuwe rang.",
      "Wie de vlag van de ander in de eigen basis brengt, wint. Is de tijd op, dan wint het team met de meeste gewonnen duels."
    ],
    "phases": [
      "Teams: Iedereen meldt zich aan en kiest een team; de pc kan eerlijk verdelen.",
      "Opstelling: De rangen staan op de telefoons. De teams verstoppen de vlag. Hang de basiscodes op.",
      "Spel: Tikken, duelleren met de duelcode, terug naar de basis en opnieuw.",
      "Einde: Vlag veroverd (de spelleider bevestigt op de pc) of tijd op."
    ],
    "tips": [
      "Laat iedereen 'Ik tikte' of 'Ik werd getikt' kiezen: dat telt alleen bij Spion tegen Maarschalk.",
      "Twijfel over een duel? De spelleider kan het op de pc schrappen.",
      "Gebruik een fluitje of de toeter op de pc voor het eindsignaal."
    ]
  },
  "crazy": {
    "goal": "88 gekke opdrachten. Teams kiezen zelf welke ze doen en sturen tekst, een foto of een video als bewijs. De spelleider keurt goed op de pc; de beamer toont de ranglijst en een fotomuur.",
    "prepare": [
      "Spreek een speelgebied en een eindtijd af.",
      "Zorg voor wat materiaal: papier, pennen, bekers, sokken, lepel en mand.",
      "Teams mogen de stad of het dorp in: bewijs blijft op de telefoon bewaard tot er weer wifi is.",
      "Filter de opdrachten op plek, benodigdheden, duur en de leeftijd van de jongste speler. Leg bij \"Speelgebied & veiligheid\" de grenzen vast; spelers zien die op hun telefoon.",
      "Kinderen zonder WhatsApp, of geen telefoonnummers willen delen? Kies dan bewijs via Groepsspel; dat is de standaard.",
      "Optioneel: maak zelf een WhatsApp-groep. Kies in de spelserver bij Bewijs & communicatie voor Groepsspel, WhatsApp of allebei en plak de groepsuitnodiging."
    ],
    "rules": [
      "Elke opdracht levert 2 punten op, de opdrachten 67–77 3 punten.",
      "Per opdracht stuurt een team één keer bewijs in. Is het afgekeurd, dan mag het opnieuw.",
      "De spelleider keurt goed, af, of geeft minder of meer punten (tot 3 extra voor een topuitvoering).",
      "Bewijs dat na de eindtijd is gemaakt, telt niet.",
      "Goedgekeurde foto's komen op de fotomuur op de beamer (tenzij de spelleider dat uitzet).",
      "Bij WhatsApp-bewijs: zet de meldcode die bij de opdracht staat (bijv. ROOD-23) bij je foto of video in de groep, meld de opdracht in Groepsspel en laat de spelleider de melding beoordelen."
    ],
    "phases": [
      "Lobby: Iedereen kiest of maakt een team.",
      "Spel: Teams kiezen opdrachten en sturen bewijs; de spelleider beoordeelt doorlopend.",
      "Uitslag: Na de eindtijd drukt de spelleider op 'Uitslag'."
    ],
    "tips": [
      "Beoordeel tussendoor, dan blijft de ranglijst spannend.",
      "Video's kunnen groot zijn: houd ze kort (onder 30 seconden).",
      "Gebruik 'Bonus' voor de meest creatieve uitvoering."
    ]
  },
  "smuggle": {
    "goal": "Smokkelteams brengen lading van de haven via tussenposten naar de markt. De douane probeert ze onderweg te betrappen. Alles gaat via de telefoon van de smokkelaar, ook zonder wifi.",
    "prepare": [
      "Vier fysieke postbordjes nodig, maar géén papieren ladingkaartjes: koffie, chocolade en goud bestaan digitaal op de spelers-telefoons.",
      "Kies vier plekken in het terrein: de haven, de molen (middenpost), de toren en de markt.",
      "Druk na 'Posten klaarmaken' op de pc op 'Postbordjes' en hang bij elke post het bordje met de code op.",
      "Ongeveer één op de vijf spelers is douanier. Hun telefoon toont een eigen pincode.",
      "Leg bij \"Speelgebied & veiligheid\" de grenzen vast (geen drukke wegen of water). Spelers zien dit op hun telefoon.",
      "Spreek de tikregel (alleen aantikken, geen duwen) en herkenning van de douane af; zorg dat iedere speler de uitleg kent."
    ],
    "rules": [
      "Laden kan alleen in de haven. Je draagt maximaal gewicht 3.",
      "Koffie (gewicht 1, 2 punten) is legaal en mag rechtstreeks naar de markt.",
      "Chocolade (gewicht 2, 5 punten) moet eerst langs de molen.",
      "Goud (gewicht 3, 10 punten) moet eerst langs de molen en dan langs de toren.",
      "Bij een post tik je de code van het bordje in. Op de markt lever je af wat zijn route heeft afgemaakt.",
      "Een douanier die je tikt, typt zijn pincode op jouw telefoon. Heb je verboden waar bij je, dan is die in beslag genomen (punten voor de douane) en moet je terug naar de haven. Alleen koffie of niets? Dan is het vals alarm: douane −2, jouw team +1.",
      "Dezelfde douanier mag dezelfde smokkelaar pas na vijf minuten opnieuw controleren.",
      "Er zijn vier posten: haven → (afhankelijk van de lading) molen → toren → markt. Bij afsluiting synchroniseren spelers hun offline acties met de server."
    ],
    "phases": [
      "Lobby: Teams kiezen, inclusief de douane.",
      "Posten klaarmaken: De pc maakt postcodes en pincodes. Print en hang de bordjes op.",
      "Spel: Laden, posten langs, afleveren, controleren.",
      "Einde: Iedereen terug op de wifi; de pc toont de uitslag."
    ],
    "tips": [
      "Koffie is de bluf: wie veel koffie draagt, lokt valse controles uit.",
      "Houd de posten op loopafstand (2–5 minuten).",
      "Correcties kunnen op de pc via 'Correctie'."
    ]
  },
  "missions": {
    "goal": "Iedereen krijgt op de eigen telefoon een geheime opdracht, zoals iemand laten zingen of een high five laten geven. Lukt het zonder dat je betrapt wordt, dan scoor je punten. Denk je dat een ander bezig is? Ontmasker hem!",
    "prepare": [
      "Start Groepsspel op de pc of gebruik de online spelserver.",
      "Kies de speelduur: een avond of een heel weekend.",
      "Kies wie een gelukte missie controleert: het 'slachtoffer' op zijn eigen telefoon of alleen de spelleider.",
      "Kies of jullie vooral binnen of buiten zijn; dan krijgt niemand een missie die op die plek niet uitvoerbaar is."
    ],
    "rules": [
      "Je missie is geheim. Lees hem als niemand meekijkt.",
      "Je mag mensen nooit dwingen, en alles moet vriendelijk en veilig blijven. Een missie die iemand ongemakkelijk maakt, telt niet.",
      "Gelukt? Tik op 'Missie gelukt' en kies bij wie het lukte. Die persoon krijgt de vraag of het klopt. Ja: je krijgt de punten. Nee: de spelleider beslist.",
      "Makkelijke missies leveren 2 punten op, gemiddelde 3 en moeilijke 5.",
      "Ontmaskeren: kies een speler en raad welke van de drie opdrachten hij heeft. Goed: +2 en zijn missie mislukt. Fout: −1 en je moet tien minuten wachten.",
      "Een ontmaskerde speler krijgt na twee minuten een nieuwe missie.",
      "Je mag je missie twee keer inruilen voor een andere."
    ],
    "phases": [
      "Lobby: Iedereen meldt zich aan met de QR-code.",
      "Spel: Missies uitvoeren, bevestigen en ontmaskeren. De beamer toont de onthulde missies.",
      "Einde: Alle lopende missies worden onthuld; de ranglijst bepaalt de winnaar."
    ],
    "tips": [
      "Speel het als achtergrondspel tijdens een etentje of weekend.",
      "Laat de beamer de onthulde missies tonen; dat zorgt voor veel gelach.",
      "Een missie inruilen is slim als je opdracht niet bij de groep past."
    ]
  },
  "hunted": {
    "goal": "Vluchtteams lopen langs drie posten naar een geheim extractiepunt. De jagers proberen ze te tikken. Op vaste momenten krijgen de jagers een 'ping' met de laatst bekende plek van elk vluchtteam.",
    "prepare": [
      "Kies een begrensd, veilig speelgebied zonder drukke wegen. Spreek grenzen en een verzamelpunt af.",
      "Kies drie posten en een extractiepunt. Vul de namen in op de pc.",
      "Druk op 'Codes en bordjes maken', print de bordjes en hang ze op. Vertel de vluchters nog niet waar de extractie is.",
      "Jagers herkennen elkaar aan een hesje of petje.",
      "Leg bij \"Speelgebied & veiligheid\" de grenzen en eventueel een straal vast. Wie locatie deelt, krijgt een waarschuwing buiten het speelgebied."
    ],
    "rules": [
      "Vluchtteams halen de drie posten in volgorde. Bij een post tik je de code van het bordje in: +3 punten, maar de jagers zien meteen dat jullie daar waren.",
      "Elke vluchter heeft een eigen vangcode. Word je getikt, dan laat je die zien en de jager typt hem in: de jagers krijgen +3 en jij bent gevangen.",
      "Op elk pingmoment zien de jagers de laatst bekende plek van elk vluchtteam: de gedeelde locatie als een vluchter dat zelf heeft aangezet, anders de laatste post.",
      "In de laatste minuten gaat de extractie open. Vluchters van een team dat alle drie de posten heeft gehaald, tikken daar de code in: +5 per ontsnapte speler.",
      "Het spel eindigt als de tijd om is of als er geen vrije vluchters meer zijn.",
      "Rennen mag, maar veiligheid gaat altijd voor: geen wegen oversteken zonder te kijken en geen privéterrein."
    ],
    "phases": [
      "Lobby: Teams kiezen: jagers en vluchtteams.",
      "Voorbereiding: Bordjes printen en ophangen. Vluchters lezen hun vangcode.",
      "Jacht: Posten, pings, vangen. De spelleider kan meldingen sturen.",
      "Extractie: Het extractiepunt wordt bekend bij de vluchters.",
      "Einde: Iedereen terug naar het verzamelpunt; de pc toont de uitslag."
    ],
    "tips": [
      "Speel je buiten de wifi? Start op de pc 'Groepsspel via mobiel internet' (Startmenu) of gebruik de online spelserver. Dan doen spelers mee via 4G/5G en werkt ook locatie delen (https). Via de gewone pc-server in de wifi zien de jagers alleen de laatste post.",
      "Stuur als spelleider af en toe een melding, bijvoorbeeld een hint voor de jagers.",
      "Houd de posten 3–8 minuten lopen uit elkaar."
    ]
  },
  "musicbingo": {
    "goal": "Ieder team heeft een eigen bingokaart met nummers op de telefoon. De DJ draait muziek via de eigen muziek-app; teams herkennen het nummer en strepen af. Eerst om een rij, daarna om een volle kaart.",
    "prepare": [
      "Zorg voor een muziek-app en speakers. Groepsspel speelt zelf geen muziek af.",
      "Gebruik de startlijst van 150 nummers of plak een eigen lijst (titel - artiest).",
      "Kies de kaartgrootte: 3×3 is kort, 5×5 duurt lang.",
      "Na een bingo kun je met \"Nieuwe ronde\" nieuwe kaarten uitdelen; de scores lopen door en gedraaide nummers komen niet meteen terug."
    ],
    "rules": [
      "De DJ klikt op 'Volgend nummer' en draait het nummer dat op de pc staat.",
      "Start de DJ het volgende nummer, dan verschijnt de titel van het vorige nummer vanzelf in de lijst 'Al bekendgemaakt'.",
      "Herken je een nummer op jullie kaart? Tik het vakje aan.",
      "Eerst spelen we om een rij: horizontaal, verticaal of schuin. Daarna om een volle kaart.",
      "Druk op BINGO als jullie een rij of volle kaart hebben. De server telt alleen vakjes die echt al gespeeld zijn.",
      "Een rij levert 5 punten op, een volle kaart 10. Wie binnen vijf seconden na de eerste geldige bingo ook bingo heeft, deelt mee.",
      "Een valse bingo kost 2 punten; vakjes die nog niet gespeeld zijn, worden dan weer vrijgemaakt."
    ],
    "phases": [
      "Lobby: Teams melden zich aan; kaartgrootte en muzieklijst kiezen.",
      "Rij: Nummers draaien tot iemand een rij heeft.",
      "Volle kaart: Doorspelen tot iemand een volle kaart heeft.",
      "Einde: De pc toont de uitslag."
    ],
    "tips": [
      "Laat elk nummer zo'n 30 seconden spelen en zet daarna de titel op de beamer.",
      "Een eigen lijst met jullie favoriete nummers maakt het persoonlijker.",
      "Speel 4×4 voor een avond met 6–10 teams."
    ]
  }
};
GS.define('guides',{get:id=>GUIDES[id]||null,all:GUIDES});
})();
