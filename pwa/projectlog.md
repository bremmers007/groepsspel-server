# Groepsspel — projectlog en ideeën

Bijgewerkt: 26 oktober 2026 · app-editie 0.13.0

Dit log beschrijft de besproken richting en de werkelijk gebouwde status. Een prototype is een eerste lokale speluitwerking; het betekent niet dat alle spelinhoud of productfuncties af zijn.

## 0.13.0 — eigen spelnamen, alle testversies af, online spelserver en Windows-installatie

- Eigen spelnamen in plaats van namen van tv-programma's en bordspellen. In de app staat klein "(geïnspireerd op …)" met een disclaimer dat Groepsspel niet aan de makers is verbonden. Interne spel-ID's en routes zijn gelijk gebleven, dus bewaarde spellen werken door.
- Verborgen: Nachtwolven, De Saboteur, Ontsnap uit de stad, Tegelrijk, Nieuw Land (tafel en buiten), Kennisbord, Eilandexpeditie en Sprong in het duister. Ze staan nergens meer in de app; de code is bewaard.
- Afgerond op één apparaat: Terug in de tijd (zes rondes, 58 jaartalgebeurtenissen), De Achtervolging (snelle ronde, bod, achtervolgingsbord, eindachtervolging met terugduwen), Duizendpoot (afvalrace/puntenrace, 24 proeven) en De Klusbaas (prijsopdracht, 24 opdrachtkaarten, 5-tot-1-punten, live-finale).
- Nieuw op eigen telefoons via de spelserver: Geheime missies (48 missies, bevestiging door het slachtoffer, ontmaskeren), Opgejaagd (posten, vangcodes en pings, ook offline; vrijwillig locatie delen via https) en Muziekbingo (eigen kaart per team, servercontrole van rij en volle kaart).
- Online spelserver zonder pc: spelkamers met eigen speltoestand, beheercookie voor de spelleider, QR-codes met kamercode, limieten en automatisch opruimen na 48 uur. Dockerfile en Render-blauwdruk; zie ONLINE-SPELSERVER.txt.
- Windows-app 'Groepsspel via mobiel internet': een Cloudflare-tunnel geeft de pc een tijdelijk https-adres, zodat spelers via 4G/5G meedoen (online stand met spelkamers op poort 8766).
- Nieuwe Windows-installatie (NSIS) met de officiële, ondertekende Python 3.13.2 embeddable runtime, snelkoppelingen, firewallhulp en verwijderprogramma. Gebouwd op Linux; niet op een echte Windows-pc getest en niet digitaal ondertekend.
- Tests: 64+ servertests (waaronder 17 voor de nieuwe telefoonspellen en 5 voor de online server), clienttests, 400 Rijk van Limburg-simulaties en browsertests van alle nieuwe spellen en de online kamers.

## 0.7.0 — drie spelshows, centrale vragenbank en Windows-installatie

- Thema-keuze Donker/Licht staat weer zichtbaar bovenin en blijft lokaal bewaard. Donkere panelen, invoervelden, dialogen en klokken gecontroleerd op contrast.
- Spelshowpagina voor The Floor, De Slimste Mens en Hitster; eigen quizmasterconsole en apart fullscreen publieksvenster op dezelfde pc. HDMI-hulp voor Uitbreiden; het publieksbeeld bevat geen geheime actuele antwoorden.
- Hitster: kaarten tellen tot standaard tien, Original/Pro/Expert, tokens met maximum vijf, skip, kopen en stelen met volgorde en bezette-plekcontrole. Gelijke jaartallen respecteren de juiste actieve plaatsing. Lokale audio via IndexedDB, metadata uit MP3-tags en import/export van eigen muzieklijsten. Startlijst van 46 titels bevat geen opnamen.
- Slimste: vaste startersvolgorde per ronde, één galerijbeeld tegelijk, resterende beelden doorgeven, collectief-geheugenbeloning per speler. Grotere eigen pakketten met symbolen en tekstscènes; eigen foto/video kan via een vragenpakket worden gekoppeld.
- Floor: 320+ eigen pictogrammen aangevuld tot 50 per basiscategorie; daarnaast categorieën uit de centrale bank. In totaal 17 standaardcategorieën, ieder minimaal 50 items. Klokinstelling 45/60 seconden; bij fout doorraden of optionele 2 seconden blokkade; passen 3 seconden. Compacte vloer van twaalf vakken.
- Centrale bank: 1161 unieke Nederlandse vragen met onderwerp, juiste antwoorden, vier geldige opties en bron. Gedeeld door quiz- en buzzerpools, 3-6-9 en passende Floor-tekstcategorieën. Brongegevens, scripts en aantallen bewaard. Schema en dubbele formuleringen gecontroleerd; bronfeiten niet allemaal handmatig nagegaan.
- Eigen soundboard: intro, goed, fout, pas, tikken, eindmuziek en doorlopende achtergrondbedding. Apart instelbaar volume. Eigen/toegestane tv-audio kan per spel en cue worden geïmporteerd; officiële tv-tunes zijn niet meegeleverd.
- Windows: NSIS-installatie .exe met portable Python, app-launcher zonder .cmd/console, snelkoppelingen, appvenster waar Edge/Chrome beschikbaar is, uninstall en behoud van servergegevens. Bestaande server wordt hergebruikt; afsluiten via de app. Geen digitale ondertekening of fysieke Windows-test.
- Compleet downloadpakket als zip met installer, PWA-bestanden, vragenbank, eigen geluiden, bronvermelding en startinstructie. Geen gebruikerssessies of eigen uploads meegebundeld.

## 0.6.0 — spelcontrole, echte rondes, tabletbord en downloadbare PWA

- Alle 27 geselecteerde prioriteiten nagelopen op spelverloop, rondes, beoordeling, klokken en schermrollen. Per spel staan de bestaande werking en ontbrekende onderdelen op Spelstatus. Oude brede claims dat alle spellen compleet speelbaar zijn, zijn hiermee vervallen.
- Spelkiezer heet weer Spelkiezer: gezelschap, aantal en binnen/buiten; de overige voorkeuren zitten onder Meer opties. Weekendplanning en programmeerknoppen verwijderd uit deze route. Eerdere plangegevens blijven bewaard.
- Eerste bordspel: Ticket to Ride als eigen compacte Limburgvariant voor 2–5 spelers op een gedeelde tablet. Geheime hand en bestemmingen, kaartbetaling, routes, laatste ronde, connectiviteit, langste route, automatische eindscore, herstel en lokaal bewaren.
- De Slimste Mens opnieuw uitgewerkt met drie teams/kandidaten: 3-6-9, Open Deur, Puzzel, Galerij, Collectief Geheugen en afvalfinale. De koploper is De Slimste; de twee andere teams spelen om door te gaan. Mondelinge antwoorden en beoordeling door de quizmaster; geen antwoordbriefjes. Eigen symbolen en tekstscènes vervangen tv-media.
- The Floor vernieuwd naar klokkenduels met 45 seconden, beurtwissel bij goed, fout/pas-blokkade, eigen doorlopende klok, aangrenzende vakkeuze en overdracht van vakken. Eigen herkenningspakketten kunnen worden aangevuld. De gekozen foutblokkade is 2 seconden, pasblokkade 3 seconden; compacte groepsvariant.
- Aparte publieksweergave voor de beamer op dezelfde pc. Antwoordteksten worden niet naar dit venster doorgestuurd.
- Pubquiz gaat standaard naar de lokale serverroute. Persoonlijke vragen kunnen worden geëxporteerd en als open vragen op teamtelefoons gespeeld, met vooraf ingestelde juiste schrijfwijzen en handmatige scorecorrectie.
- 30 Seconds: eigen Nederlandse woorden, vijf geheime woorden per beurt, 30 seconden, goed/pas en serverpunten; twee beurten per team. Team- en beamerprivacy gecontroleerd in de servertests.
- Moordscenario voorlopig naar zes spelers begrensd, omdat er zes unieke rollen zijn. Andere bordspellen en ontbrekende mysteries blijven zichtbaar als nog te bouwen.
- PWA-installatieknop staat direct in de app. Windows-download bevat nu de volledige app, lokale server en portable runtime. Start-Groepsspel-app.cmd opent de PWA op localhost; installatie op telefoon/tablet loopt via de HTTPS-Site.
- Nieuwe bronnen zijn opgenomen in de offlinecache. Voortgang, teams, eerdere resultaten en selecties blijven bewaard; geen gebruikersgegevens in het downloadpakket.
- Controles: oorspronkelijke engine- en selectietests, 20 complete bordspelsimulaties, volledige zes-ronden-Slimste-test, Floor-klok- en blokkadetests, elf lokale servertests en offlinecachetests. Browsercontrole van Spelkiezer, bord/privacy/bouwen/herladen, Slimste-rondes en publieksvenster, lokale server en teamtoestellen. Windows-start, PWA-installatie op fysieke apparaten en praktijkspel met een groep zijn nog niet geverifieerd.

De historische notities hieronder beschrijven eerdere versies; de actuele status staat hierboven en in Spelstatus.

## Doel en naam

- Een app voor gezelschapsspellen tijdens vriendenweekenden, familie-uitjes, avonden en activiteiten overdag.
- Begonnen als Groepsspel. Groepspret is door de gebruiker afgewezen. Spelavond klinkt beter, maar dekt buitenactiviteiten overdag onvoldoende.
- Definitieve naam staat nog open. De huidige naam blijft daarom Groepsspel.
- De genoemde tv- en bordspelnamen blijven herkenbaar in het conceptoverzicht. Merknamen, rechten en eventuele officiële licenties zijn nog niet onderzocht of geregeld. De app presenteert zich niet als een officiële uitgave.

## Uitgevoerd in de app

- Zes categorieën: quiz & kennis, behendigheid, moord & mysteries, buiten, muziek & feest en bordspellen op tafel.
- Weet Ik Veel uit het aanbod verwijderd; eerdere historische gegevens blijven bewaard.
- Overzicht met 28 spellen en concepten. Via ‘Welke spellen eerst?’ kan de gebruiker prioriteiten kiezen. De overige spellen worden Under construction. Deze selectie wordt alleen op het eigen apparaat opgeslagen.
- Buitenspellen staan voorlopig Under construction: daarvoor moet de nieuwe opzet met eigen teamschermen nog worden gebouwd.
- Spelkiezer met groepssoort, aantal spelers, leeftijd volwassenen, jongste kind, locatie, energie, tijd, thema en gewenst scherm.
- Snelkeuzes: kerels rond de 30, meiden rond de 20, gezinnen rond de 40 met kinderen van 10–14. Interesses en omstandigheden bepalen de aanbevelingen; geslacht sluit geen spellen uit.
- Thema’s: muziek & feest, Holland, mysterie & misdaad, avontuur & expeditie, retro & nostalgie, casino & glamour.
- Schermvoorkeuren: beamer/groot scherm, grote tablet op tafel of eigen telefoon per team. De aanbevelingen kunnen ook concepten tonen en vermelden hun status.
- Nieuwe showsfeer, geïnspireerd op de referentie https://pattypampam.com/: fuchsia, geel, zwart, grote koppen en afficheachtige spelkaarten. Geen foto’s of branding van de referentie overgenomen.
- Eigen vectorlogo met speelkaarten, dobbelsteen en ster; rastericonen voor installatie.
- Lokale teams, scores, actief spel, pauzeren/hervatten en JSON-reservekopie.
- Presentatiestand voor een gedeeld groot scherm. De beamer toont de browserweergave; er is nog geen afzonderlijk gekoppeld regiescherm.
- Weekendklassement op eindposities; uitslagen corrigeren en laatste spelstap terugnemen.
- Muziekbingo: teamkaarten, printmogelijkheid, lijn/volle kaart en controle op geregistreerde nummers. De muziek zelf komt uit de eigen muziek-app.
- PWA-manifest met startscherm, iconen, standalone weergave en snelkoppelingen. Installatieknop indien de browser die aanbiedt; instructies voor iOS, Android en desktop.
- Offline app-pakket met cachecontrole en verbindingsstatus. Bij een volledig opgeslagen pakket blijft een lokaal spel bij internetuitval werken, ook na opnieuw openen. De eerste download vereist verbinding; browseropslag kan door gebruiker/browser worden gewist.
- Updates worden aangeboden en niet midden in een spel automatisch geactiveerd.
- Taalkeuze: Nederlands, Duits, Frans, Engels, Spaans en Italiaans. De navigatie en spelkiezer hebben vertalingen. In de vijf extra talen is een startpakket van 12 pubquizvragen beschikbaar. Overige spelinhoud en een deel van de beheerschermen moeten nog vertaald worden. Deze beperking staat in de app; volledige vertaling is nog niet gereed.

## Spellenlijst bij versie 0.3.3 (historisch)

### Quiz & kennis — prototypes in het Nederlands

1. De Grote Pubquiz — ook startpakket in DE/FR/EN/ES/IT.
2. De 1% Quiz.
3. Hoe goed ken je ons? — eigen vragen vooraf invullen.
4. Ik hou van Holland.
5. Oh, wat een jaar!
6. De Slimste Mens.
7. Met het Mes op Tafel — fictieve fiches.
8. The Floor.
9. De Jongens tegen de Meisjes — teams zelf indelen.
10. The Chase.

### Behendigheid — prototypes in het Nederlands

11. De Alleskunner.
12. Taskmaster.

### Moord & mysteries — prototypes in het Nederlands

13. Geheime missies.
14. Moordspel / Levend Cluedo.
15. De Verraders.
16. Code van Coppens.

### Buiten — Under construction voor eigen teamschermen

17. Crazy 88.
18. Smokkeltocht.
19. Levend strategiespel.
20. Hunted.
21. Expeditie Robinson.
22. Het Onbekende.
23. Catan buiten — nieuw concept, nog geen spelengine.

### Muziek & feest — prototypes in het Nederlands

24. Hitster — eigen muziek, tijdlijn en jaartallen.
25. Casino Night — uitsluitend fictieve fiches, geen echt geld.
26. Muziekbingo.

### Bordspellen op tafel — Under construction, nieuwe concepten

27. Triviant — kennisbord op grote tablet, kleuren verzamelen en beurtbeheer.
28. Catan — gedeelde kaart, grondstoffen, handelen, dorpen en routes.

## Nog te ontwerpen en bouwen

### Eigen scherm voor elk team

- Spelleider maakt een sessie; teams doen mee met code of QR-link.
- Ieder team krijgt alleen eigen opdrachten, lading, grondstoffen en voortgang te zien.
- Spelleider houdt de gezamenlijke spelstand bij en beoordeelt gebeurtenissen.
- Voor Smokkeltocht zijn rollen voorzien voor spelleider, smokkelteams en controleurs.
- Vereist een server, sessiebeheer, machtigingen, herverbinding en synchronisatie. Momenteel bestaan er geen live kamers of gekoppelde apparaten.

### Offline bij spellen met meerdere apparaten

- Voor vertrek per apparaat het benodigde spelpakket downloaden.
- Laatst ontvangen spelstand en opdrachten lokaal bewaren.
- Acties bij uitval in een wachtrij zetten met unieke actie-ID’s.
- Na herverbinding acties gecontroleerd samenvoegen en dubbele punten voorkomen.
- Conflicten, vangsten en handel vragen expliciete regels; de spelleider moet kunnen beslissen.
- Een volledig internetloze verbinding tussen losse apparaten is niet geregeld door alleen een PWA. Lokale wifi of een andere verbindingsoplossing moet apart worden onderzocht.
- Dit ontwerp is een wens/backlog; geen bestaande functionaliteit.

### Catan buiten — spelidee

- Afgesproken terrein met grondstofposten voor hout, graan, steen en wol.
- Teams verdienen grondstoffen door een post te bereiken of een korte proef te halen.
- Handel tussen teams, met registratie en bevestiging door beide partijen.
- Grondstoffen inzetten voor routes en dorpen op een centrale kaart.
- Bonusopdrachten en een vaste eindtijd; meeste bouwpunten wint.
- Eigen scherm per team, centraal overzicht voor spelleider en eventueel beamer.
- Een eigen herkenbaar thema, spelbalans, routes en inhoud moeten worden ontworpen. Geen kopie van officiële spelillustraties of teksten.

### Meertaligheid

- Alle geselecteerde spellen krijgen vertaalde regels, vragen, opdrachten, rolkaarten en uitslagen.
- Cultuurafhankelijke vragen en muziek per taal/regio aanpassen; niet alleen woordelijk vertalen.
- Content en taalversies bundelen voor offline gebruik.
- Stem af of gemengde taalgroepen per team een eigen taal mogen kiezen.
- Handmatige taalcontrole en bredere tests nodig voordat volledige taalondersteuning wordt geclaimd.

## Verdienmodel — besproken, nog niet aangesloten

- Gratis kennismaking met een beperkt aanbod.
- Reclame op natuurlijke pauzemomenten; geen onderbreking midden in een vraag of tijdproef.
- Optioneel reclamevrij kopen; €4,99 was een te testen prijs, geen vastgestelde verkoopprijs.
- Extra spel- of weekendpakketten; €7,99–€14,99 was een prijsrichting om te onderzoeken.
- Mogelijke latere doelgroep: groepsaccommodaties, vakantieparken en organisatoren.
- Geen advertentienetwerk, betalingen, abonnementen of echte paywall aangesloten.
- Google Play-verkoop/publicatie is besproken als doel, maar nog niet uitgevoerd. Een PWA alleen is nog geen Play Store-vermelding.

## Open keuzes

- Welke 4–6 spellen eerst volledig uitwerken?
- Definitieve naam die zowel overdag als ’s avonds past.
- Eerste buitenspel voor echte teamsessies: Smokkeltocht, Crazy 88 of Catan buiten?
- Eerste tafelbordspel en gewenste spelduur.
- Reikwijdte van gratis aanbod en betaalde pakketten.
- Taal per sessie of per team bij gemengde groepen.

## Validatie en grenzen

- Bestaande spelengine-tests, scoreverwerking, opslagvalidatie en aanbevelingsfilters gecontroleerd.
- Extra controles voor lokale taalpakketten en offline app-cache.
- Browsercontrole van homepage, spelkiezer, prioriteiten en installatiepagina.
- Installatie op een fysieke iPhone/Android-tablet en daadwerkelijke beamer zijn nog niet getest.
- Geen echte live multiplayer, live GPS, chat, automatische foto-upload of externe muziekcache.
- Alle opgeslagen gegevens zijn apparaat- en browsergebonden; er is nog geen cloudbackup.


## Versie 0.4 — rustige Vegas-stijl en volledige keuzelijst

- De gebruiker heeft de roze achtergrond afgewezen als te onrustig. Nieuwe standaard: donkerblauw/zwart, champagnegoud en enkele donkere groen- en bordeauxaccenten.
- Rustig licht biedt de crème/groene richting van de eerste versies. Thema wordt op het apparaat bewaard.
- Alle 39 spellen en besproken kandidaten staan bij Spellen kiezen. De 11 nieuwe kandidaten zijn standaard niet opgenomen; de eerdere 28 blijven behouden totdat de gebruiker kiest.
- Twee keuzes per spel: In de app en Nu uitwerken. Nu uitwerken vinkt ook In de app aan; uitvinken van In de app verwijdert ook de ontwikkelprioriteit.
- Opgenomen spellen zonder prioriteit staan na bewaren Under construction. Bestaande testversies en historische gegevens blijven bewaard. Een prioriteit maakt een concept niet direct speelbaar.
- Niet opgenomen spellen verdwijnen uit het aanbod, aanbevelingen en nieuwe weekendplannen. De volledige beheerlijst blijft beschikbaar.
- Keuzes lokaal bewaren, als tekst kopiëren of downloaden. De gebruiker kan de bewaarde lijst hier plakken; nog geen automatische cloudkoppeling van voorkeuren.
- Nieuw gebruikersidee: Buzz! / Buzzerquiz. Vragen op het centrale scherm; een grote drukknop op elke teamtelefoon. Eerste geldige druk centraal vastleggen, andere buzzers vergrendelen; spelleider beoordeelt/reset. Online sessies, latency, herverbinding en eerlijke afhandeling moeten nog worden gebouwd.

### Actuele volledige keuzelijst (39)

**Quiz & kennisspellen**

1. De Grote Pubquiz — Nederlandse testversie
2. De 1% Quiz — Nederlandse testversie
3. Hoe goed ken je ons? — Nederlandse testversie
4. Ik hou van Holland — Nederlandse testversie
5. Oh, wat een jaar! — Nederlandse testversie
6. De Slimste Mens — Nederlandse testversie
7. Met het Mes op Tafel — Nederlandse testversie
8. The Floor — Nederlandse testversie
9. De Jongens tegen de Meisjes — Nederlandse testversie
10. The Chase — Nederlandse testversie
11. Bezzerwizzer — concept
12. Buzz! / Buzzerquiz — concept

**Behendigheidsspellen**

13. De Alleskunner — Nederlandse testversie
14. Taskmaster — Nederlandse testversie

**Moord & mysteriespellen**

15. Geheime missies — Nederlandse testversie
16. Moordspel / Levend Cluedo — Nederlandse testversie
17. De Verraders — Nederlandse testversie
18. Code van Coppens — Nederlandse testversie
19. Weerwolven van Wakkerdam — concept
20. Wie is de Mol? — concept

**Buitenspellen**

21. Crazy 88 — testopzet; teamschermen nog te bouwen
22. Smokkeltocht — testopzet; teamschermen nog te bouwen
23. Levend strategiespel — testopzet; teamschermen nog te bouwen
24. Hunted — testopzet; teamschermen nog te bouwen
25. Expeditie Robinson — testopzet; teamschermen nog te bouwen
26. Het Onbekende — testopzet; teamschermen nog te bouwen
27. Catan buiten · concept — concept
28. Escape the City / puzzeltocht — concept

**Muziek & feestspellen**

29. Hitster — Nederlandse testversie
30. Casino Night — Nederlandse testversie
31. Muziekbingo — Nederlandse testversie
32. 30 Seconds — concept
33. Muziekquiz / Top 2000 — concept

**Bordspellen op tafel**

34. Triviant · tafelconcept — concept
35. Catan · tafelconcept — concept
36. Carcassonne — concept
37. Ticket to Ride — concept
38. Wingspan — concept
39. Monopoly — concept

### Validatie 0.4

Spelengine-tests, taalstartpakketten, onafhankelijke opname/prioriteit, opslagvalidatie, uitsluiting in aanbevelingen, lege selectie, tekstexport en offline-cachecontrole slagen. Browsercontrole van keuzelijst, automatisch opnemen bij prioriteit, uitsluiten, bewaren en zoeken. Fysieke PWA-installatie en echte teamsynchronisatie blijven ongetest/nog te bouwen.


## Versie 0.4.1 — kleurrijk neon-Vegas

- Gebruiker geeft aan de spellenlijst te hebben ingevuld. De echte gebruikersselectie staat alleen op het eigen apparaat; deze is niet ontvangen in het gesprek. Geen nieuwe keuzes aangenomen of overschreven. Voor verdere spelontwikkeling is de gekopieerde keuzelijst nodig.
- Nieuw beeldvoorbeeld: Las Vegas bij nacht met blauwe, magenta, paarse en gouden neonverlichting. Vertaling naar nachtblauwe basis, kleurrijke categorieën, knoppen en spelkaarten. Geen roze paginavlak.
- Eigen SVG met neonlichtsporen, gebouwen en reuzenrad op de homepage. Het aangeleverde productbeeld zelf is niet als afbeelding in de app verwerkt.
- Logo en PWA-iconen kleuren mee. Rustig licht blijft beschikbaar en de lokaal bewaarde thema- en spelkeuzes blijven behouden.
- Nieuwe SVG en stijlen zitten in het offlinepakket.


## Versie 0.5 — spelkiezer & weekend, pc-server en stadskwis

### Uitgevoerd

- Gebruiker verduidelijkt dat Spelkiezer en Ons weekend samengevoegd moeten worden; de overige voorstellen zijn geautoriseerd. Eén hoofdmenu Spelkiezer & weekend, met behoud van de bestaande planning en scores. Oude #weekend-links komen op de gecombineerde pagina uit.
- 13 groepsprofielen: vrienden 18–25, 25–40, 40–60, mannenweekend, vrouwenweekend, gezinnen met kinderen 6–9 of 10–14, meerdere generaties, sportteam/vereniging, collega’s, vrijgezellenfeest, rustig gezelschap en actief gezelschap.
- Voorkeuren voor hoe goed men elkaar kent, afvallen, fysieke inspanning en materialen. Voorkeuren worden bewaard en aanbevelingen gefilterd. Leeftijd en overige voorwaarden kunnen betekenen dat er geen passend spel is.
- Vanuit spelkaarten plannen, tijdstip wijzigen, volgorde verplaatsen en een spel starten. Beheer van ontwikkelprioriteiten staat in de voettekst.
- Nieuw menu Samen spelen met een downloadbaar Windows x64-pakket. Het bevat een eigen Python-runtime van python.org; een aparte installatie van Python is niet nodig. Open na volledig uitpakken Start-Groepsspel.cmd.
- Lokale pc-server met afzonderlijke spelleider, beamer en teamschermen. Teams sluiten aan met een sessiecode en QR-link; teamcode herstelt toegang of laat een tweede subgroepje aansluiten.
- Server beheert vragen, juiste antwoorden, scores en ontvangen buzzerdrukken. Juiste antwoorden en hosttoegang worden niet naar teams verstuurd. Webinterface communiceert lokaal met HTTP-verzoeken; er is geen cloudserver nodig tijdens het LAN-spel.
- Buzz: vijf seconden aftellen, server registreert de eerste druk en houdt vrijwel gelijktijdige drukken binnen 80 ms zichtbaar. Spelleider beoordeelt of herhaalt. Fout geantwoord team kan dezelfde vraag niet opnieuw beantwoorden.
- Pubquiz: gedeelde antwoordtijd, A/B/C/D op teamtelefoons, automatische beoordeling en geen snelheidspunten. 76 Nederlandse vragen en vijf taalstartpakketten van elk 12 vragen; eigen vragen via JSON mogelijk.
- Bij meer dan vijf seconden verbindingsverlies van een deelnemend team pauzeert de quiz. Handmatig hervatten, ronde herhalen, team tijdelijk op toeschouwer en scores corrigeren. Acties worden op de pc opgeslagen; een actieve quiz herstelt na herstart gepauzeerd. Afgeronde vragen blijven afgerond.
- Nieuw spel Stadskwis / dorpskwis: acht eigen voorbeeldopdrachten met locaties, tekst/foto, subgroepjes die opdrachten oppakken, centrale beoordeling en aanpasbare punten. De volledige beheerlijst telt nu 40 spellen en ideeën. Dit is geen officieel Remunjs kwisboek.
- Lokale teams bewaren inzendingen in IndexedDB en sturen ze bij terugkeer naar dezelfde server. Dubbele verzendpogingen worden herkend; opnieuw beoordelen telt niet dubbel.
- Voor opnieuw openen buiten wifi: team-opdrachtenbestand vooraf in de geinstalleerde PWA importeren. In de PWA lokaal tekst en verkleinde foto’s bewaren, antwoordenbestand exporteren en later op de lokale teampagina inleveren. Geen automatische verbinding van de HTTPS-PWA naar een HTTP-LAN-server of cloudsynchronisatie.
- Serverdownload is bewust geen onderdeel van de automatische offlinecache. Een download mag niet door de serviceworker worden vervangen door index.html; dit is apart getest.

### Getest en grenzen

- Bestaande 24 spelengine-starts en scorecycli blijven slagen; 40 catalogusvermeldingen.
- 7 serverchecks: afscherming antwoorden/hostacties, buzzer en bijna gelijk, geen dubbel scoren, fout team niet opnieuw, pauze/herstart, afgeronde rondes behouden, stadskwis-inzendingen en beoordeling, gelijktijdige HTTP-clients en blokkeren van ongewenste origins/hostnamen.
- Browser: gecombineerde pagina, gezinsprofiel, spel plannen, lokale host, twee afzonderlijke teamvensters, buzzervergrendeling en +1 punt.
- Windows-zip gecontroleerd op compleetheid, geldige executable-header, juiste broncode en ontbreken van sessiegegevens. Het Windows-startprogramma zelf en echte iPhone/Android-apparaten zijn hier niet fysiek getest.
- De overige spellen zijn nog geen volledige LAN-spellen. Lokale server ondersteunt nu Buzz, Pubquiz en Stadskwis. Geen telefoon als volwaardige server, video-upload, automatische cloudverbinding voor buiten, of officiéle gelicentieerde Remunjse Kwis-inhoud.
- De eerder door gebruiker ingevulde selectie staat op zijn eigen apparaat en is nog niet in het gesprek ontvangen. Deze is niet verzonnen of overschreven.

- Laatste gebruikersupdate: nog meer spellen aangevinkt om uit te werken. De bijgewerkte keuzetekst is nog niet ontvangen; geen spelnamen of prioriteiten geraden.


## Versie 0.5.1 — expliciete gebruikersselectie ontvangen en toegepast

- De gebruiker heeft de volledige keuzetekst gedeeld: 26 spellen nu uitwerken, 6 later en 7 niet opnemen. Dit vervangt de eerdere melding dat de selectie nog niet was ontvangen.
- Nu: Pubquiz, Hoe goed ken je ons, Ik hou van Holland, Oh wat een jaar, Slimste Mens, The Floor, The Chase, Buzz, Alleskunner, Taskmaster, Geheime missies, Moordspel, Verraders, Weerwolven, Wie is de Mol, Crazy 88, Smokkeltocht, Hunted, Escape the City, Hitster, Casino Night, Muziekbingo, 30 Seconds, Carcassonne, Ticket to Ride, Monopoly.
- Later: Levend strategiespel, Expeditie Robinson, Het Onbekende, Catan buiten, Triviant, Catan op tafel.
- Niet opnemen: 1% Quiz, Met het Mes op Tafel, Jongens tegen de Meisjes, Bezzerwizzer, Code van Coppens, Muziekquiz/Top 2000, Wingspan.
- Stadskwis komt erbij als afzonderlijk eerder geautoriseerd spel: totaal 33 opgenomen, waarvan 27 ontwikkelprioriteiten en 6 later.
- Deze projectselectie wordt eenmalig naar de lokale voorkeuren gemigreerd; teams, geschiedenis en planning blijven behouden. Latere eigen wijzigingen blijven mogelijk en worden niet bij iedere herlaadbeurt teruggezet.
- Een ontwikkelprioriteit is geen claim dat het spel al af is. Bestaande Nederlandse testversies blijven herkenbaar; concepten blijven expliciet in ontwikkeling. De nieuwe lokale server ondersteunt nu Buzz, Pubquiz en Stadskwis.


## 0.7.1 — Windows-opstart herstellen (25 oktober 2026)

- Oorzaak gereproduceerd met geïsoleerde Python: server.py werd niet gevonden, vóór de foutafhandeling.
- De launcher voegt uitsluitend de eigen installatiemap aan het Python-zoekpad toe en vangt ook importfouten af.
- Een verborgen supervisor controleert of de server bereikbaar is voordat het appvenster opent; fouten worden zichtbaar gemeld.
- Opstartlog in %LOCALAPPDATA%\Groepsspel\startup.log, plus Startdiagnose.cmd; localhost omzeilt systeemproxies.
- Vernieuwde installer en compleet zip-pakket; bestaande gebruikersdata blijven bewaard.
- Geïsoleerde opstart, heropenen, shutdown en foutpaden worden op Linux automatisch gecontroleerd. Een fysieke Windows-installatie blijft ongeverifieerd.


## 0.8.0 — Iedereen speelt mee en auditcorrecties (25 oktober 2026)

### Telefoonmodus
- The Floor, De Slimste Mens en Hitster kunnen zonder quizmaster via de lokale Windows-server worden gespeeld. QR-lobby, teamcodes voor herstel, afzonderlijke beheer-, telefoon- en beamerschermen.
- Alleen de server beoordeelt antwoorden en beheert de klokken. Projecties bevatten geen correcte antwoorden vóór onthulling; beheer heeft geen handmatige scoreknoppen.
- Antwoorden typen, kiezen of dicteren via het eigen toetsenbord. Optionele browser-spreekknop op ondersteunde veilige verbindingen; definitieve transcriptie kan na expliciete keuze direct worden verstuurd. Geen universele offline spraakherkenning beloofd.
- Hoofdletters, accenten, vastgelegde alternatieven en één ondubbelzinnige tikfout in lange antwoorden worden verwerkt. Gesloten trefwoordlijsten zijn geen algemene semantische AI-beoordeling. Groepsbezwaar bij Floor, 3-6-9 en Galerij; alle andere teams moeten instemmen.
- Tijdduels pauzeren bij verbroken teamverbindingen en na serverherstart. Spelstatus en audiobestanden worden op de pc bewaard; geen cloud nodig voor het spel.
- Automatisch Hitster met gekoppelde lokale audio, verborgen titel/jaar, plaatsing, uitdagingen, tokens, Original/Pro/Expert en doel 5/10/15. Koppel eigen muziek of zet de bestaande lokale muzieklijst over vanuit Muziek.

### Audit
- 3-6-9 wisselt na iedere nieuwe vraag van speler. X draagt bij een fout dezelfde vraag over. De twee hoogste teams spelen de finale; gelijke finaleplaatsen krijgen een beslissingsvraag.
- Floor-teamvariant: één betwist vak wisselt. Bij verlies van de aanvaller wordt een aangrenzend eigen vak veroverd. Gemengde beginverdeling geeft teams meer tegenstanders. Sneltoetsen staan bij knoppen.
- Centrale vragenbank opgeschoond: ongeldige URL-labels en ongewenste onderwerpen verwijderd, sportopties gescheiden in landen en steden, bekende vertaalresten gecorrigeerd, meervoudige makers explicieter bevraagd en moeilijkheid verfijnd. Nu 1156 vragen; volledige redactionele controle blijft nodig.
- Geen rekenen/chemische-symbolen in de standaard 3-6-9; telefoonmodus verdeelt quizvragen over onderwerpen.
- Licht logo en themaknoppen leesbaar, lichte basis paars in plaats van groen. Mobiele bovenbalk krijgt vaste volgorde en een schuifbare navigatie met richtingaanwijzer. Compacte Floor-beamerindeling en klok met schreefloos lettertype; dubbele titel verwijderd.
- Fonts inclusief licenties lokaal opgeslagen en gecachet. Ontbrekende illustraties blokkeren de installatie van de kern niet; de app meldt onvolledige offlineopslag en probeert ontbrekende media opnieuw.
- Bibliotheek toont standaard alleen speelbare bèta's. Ontwikkelinstelling toont overige concepten. Herkenbare spelnamen behouden conform eerdere voorkeur.
- Eén centrale versie voor de web-app. Eerste muzieklijst heeft standaard 46 metadatarecords. Blijvende browseropslag wordt aangevraagd bij audio-import, zonder opslaggarantie van de browser te suggereren.

### Controle en open punten
- Automatische tests voor drie spelroutes, zes Slimste-rondes, beurtrotatie, twee finalisten, één-vakverovering, geheimhouding, foutpaden, dubbele inzendingen, groepsbezwaar, reconnect/herstart, HTTP-autorisatie, muziekbereik en gedeeltelijke offline-installatie. Browsertest met beheer en aparte controllers.
- Nog open: 150+ zorgvuldig gecontroleerde muziektitels; volledige vraagredactie/bredere onderwerpen; volledige omzetting van oudere modules/CSS naar een gebundelde architectuur; audiocompressie.
- Originele tv-tunes en commerciële geluidsopnamen blijven niet meegeleverd. Geen fysieke Windows-installatie, echte telefoondictatie of HDMI/audio-uitvoer getest. Installer niet digitaal ondertekend.


## 0.8.1 — compact The Floor, brede vragenbank en metadata (26 oktober 2026)

GROEPSSPEL 0.8.1 – WEB/PWA-UPDATE (26 OKTOBER 2026)

WAT IS ER GEWIJZIGD?
- The Floor: compact, privé quizmasterscherm. Antwoord altijd zichtbaar;
  kleine afbeelding op de console, grote afbeelding blijft op de beamer.
  Goed, Fout, Pas en pauze in de zichtbare bediening bij 1366×850.
- The Floor: 12 startvakken kiezen gevarieerde categorieën in plaats van
  altijd dezelfde eerste categorieën.
- 193 extra redactionele quizvragen, waaronder 11 met gedateerde
  actualiteit 2024–2025, muziek, televisie, eten, Nederland vroeger,
  natuur, techniek, sport, geschiedenis en film.
- De bestaande 1.156 vragen zijn behouden. Nieuwe totaalgrootte: 1.349.
- Vragen over verschillende onderwerpen worden gelijkmatiger gekozen;
  in 3-6-9 en Pubquiz wordt op onderwerpmix gestuurd.
- Hitster-startlijst: 196 titels/artieste(n)/jaartallen METADATA.
  Er zitten GEEN audiobestanden of muzieklicenties in het pakket.
- Anonieme voorbeeldnamen in enkele geheugenscènes; geen gezinsnamen.
- PWA-cache op versie 0.8.1, alle nieuwe scripts zijn toegevoegd.

WAT KUN JE MET DE ZIP DOEN?
1. Hosting: upload de inhoud van deze ZIP (index.html op hoofdniveau)
   naar een HTTPS-host zoals Netlify. Houd alle bestanden en mappen samen.
2. Open de site en installeer desgewenst als PWA in de browser.
3. Deze ZIP is de WEBAPP. Een Windows .exe installer is er NIET nieuw voor
   versie 0.8.1. De oude Groepsspel-Setup-0.8.0.exe is niet aangepast.

NOG NIET VOLTOOID
- De lokale Windows-Python-server zit alleen verpakt in de oude NSIS
  installer. De originele server-bronbestanden zaten niet los in de
  ontvangen ZIP; daarom zijn telefoonmodus/server en Windows-installer
  niet naar 0.8.1 overgezet.
- Echte Windows-installatie, meerdere fysieke telefoons, spraakdictatie,
  microfoonrechten, wifi, HDMI/audio zijn NIET fysiek getest.
- Browsermatige technische controle is gedaan in een simulatie van de
  app, onder meer een 1366×850 quizmasterconsole en spelknoppen.
- De aanvullende inhoud is automatisch gecontroleerd op structuur,
  dubbele vragen, ontbrekende antwoorden en ontbrekende codebestanden,
  maar nog niet volledig handmatig geredigeerd. Muziek-jaartallen hebben
  ook een aparte redactionele nacontrole nodig voor commerciële verkoop.
- Actualiteitsvragen 2024–2025 zijn GEDATEERD; geen automatische updates.
- De merknamen van bestaande tv- en bordspellen zijn mogelijk beschermd.
  Commerciële distributie vereist eigen merk-/licentiecheck.

REGRESSIECHECK UITGEVOERD
- JavaScript-syntaxis van alle .js-bestanden, 1.349 vragen, 196 unieke
  liedmetadatarecords, geen dubbele basisvragen, 4 geldige antwoordopties.
- Headless Chromium: homepage start zonder JavaScript-fout. Publiekspakket
  bevat het quizmasterantwoord niet. Goed/Fout/Pas werken in een
  gesimuleerde The Floor-sessie, besturing past in 1366×850.
- Offline-serviceworker: nieuwe bestanden en versiecache worden genoemd.

EXTERNE BRONNEN VOOR DE GEDATEERDE ACTUALITEIT
- https://www.ebu.ch/news/2025/05/eurovision-song-contest-winner
- https://www.uefa.com/womenseuro/news/029b-1e4ecc17145a-6a6317e5408d-1000--uefa-women-s-euro-2025-meet-the-winners-england/
- https://www.uefa.com/uefaeuro/history/news/028f-1b5e5c2b7b67-d5faab9be20b-1000--spain-2-1-england-late-oyarzabal-winner-earns-la-roja-reco/
- https://www.olympedia.org/editions/63

Bestanden met bestaande gegevens of spellen zijn niet gewist. Behoud
wel zelf altijd je lokale reservekopieën en originele muziekbestanden.


## 0.9.0 — De Verraders (26 oktober 2026)

- Nieuw telefoonspel De Verraders op de lokale server: geheime rollen, 15 opdrachten met pot, schilden, ronde tafel met stem-voor-stem-onthulling, herstemming en loting, nachtoverleg, rekruteren (optioneel ultimatum), eindspel en verdeling van de pot.
- Pc-console toont nooit rollen; telefoon /verraders/speler; beamer /verraders/scherm.
- Telefoonmodus The Floor: willekeurige categorieën en roulerende beurt bij doorgeven.
- 20 automatische tests en een browsertest met 8 telefoons.

## 0.10.0 — vijf telefoonspellen en uitleg per spel (26 oktober 2026)

- Gedeelde basis voor telefoonspellen (games_base.py, web/games.*): QR-aansluiten, persoonlijke codes, teams, drie schermen, offlinewachtrij met unieke actie-ID's en foto-/video-upload.
- Het Moordspel: twee scenario's (De laatste theekop, Diner op Kasteel Ter Borcht), elk met drie mogelijke daders en 6–12 personages; aanwijzingen per ronde, overdracht van ontbrekende rollen, bewijs delen, beschuldiging en ontknoping met punten.
- Levend Stratego: geheime rangen, duelcodes die zonder wifi werken, basiscodes, verkenner, nieuwe rang na drie nederlagen, vlag en klok.
- Ik hou van Holland: zes rondes (buzzer, dialect, gezegden, uitbeelden, schatten, finale) met eigen vragenbank en beslissingsvraag.
- Crazy 88: 88 opdrachten, tekst-, foto- en videobewijs dat zonder wifi bewaard blijft, beoordeling, ranglijst en fotomuur.
- Smokkeltocht: posten met codes, lading en routes, douane met pincodes, inbeslagname en vals alarm; volledig offline speelbaar.
- Elk telefoonspel en De Verraders hebben een knop Uitleg met regels, verloop, spelleiderscript en tips (uitleg.json).
- Spelshows heeft een blok "Iedereen speelt mee" met de zes telefoonspellen. Oude één-apparaatversies blijven beschikbaar.
- 41 automatische tests en browsertests per spel. Niet fysiek getest op telefoons, buiten of op Windows.

## 0.12.0 — Monopoly · Limburg op één tablet (26 oktober 2026)

- Concept Monopoly volledig uitgewerkt als tabletbordspel zonder server: Limburgs bord met 22 straten (Herten tot Stokstraat), 4 stations, 2 nutsbedrijven, belastingen, 16 Kans- en 16 Dorpskaskaarten.
- Regels in de spelmotor (monopoly-core.js): dobbelen met dubbel gooien, gevangenis (dubbel, €50 of vrijkaart, drie pogingen), kopen of veilen, huur inclusief dubbele huur en stations/nutsbedrijven, gelijkmatig bouwen met beperkte voorraad huizen en hotels, verkopen, hypotheek en aflossen (+10%), schulden, faillissement naar schuldeiser of bank, ruilen, rondelimiet en eindstand op vermogen.
- Tablet-UI (monopoly-ui.js): bord met eigenaren, huizen en pionnen, eigendomsbewijzen, veilingbediening, beheerpaneel, ruildialoog, spelregels, vorige stap herstellen, hervatten vanaf de startpagina.
- Tests: tests/test_monopoly.js (regels + 400 volledig gesimuleerde spellen met 2–6 spelers) en een distributietest die controleert dat elk script offline gecachet wordt.
- 0.11-verbeteringen: lege meldingsballon niet meer zichtbaar, Ik hou van Holland niet dubbel in de bibliotheek, actuele beschrijving Moordspel, zonder server een knop naar de eenvoudige versie op één apparaat, route #vastgoed toegestaan, versie overal 0.12.0.
