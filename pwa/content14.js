/* Groepsspel 0.14 — extra inhoud voor bestaande spellen.
 * Terug in de tijd: zeven extra jaren (1969–2014), elk met zes nieuwsvragen. Gecontroleerd oktober 2026.
 * Formaat zoals content.js: {q, options, correct, explanation}.
 */
(function(){
'use strict';
const Q=(q,options,correct,explanation)=>({q,options,correct,explanation});
Object.assign(YEARS,{
'1969':[
Q('Welke Apollo-missie landde in juli 1969 op de maan?',['Apollo 11','Apollo 13','Apollo 8','Apollo 1'],0,'Neil Armstrong en Buzz Aldrin landden met Apollo 11.'),
Q('Wie liep in 1969 als tweede mens op de maan?',['Buzz Aldrin','Neil Armstrong','Michael Collins','Joeri Gagarin'],0,'Michael Collins bleef in de baan om de maan.'),
Q('Welk muziekfestival vond in augustus 1969 plaats in de staat New York?',['Woodstock','Pinkpop','Glastonbury','Monterey Pop'],0,'Pinkpop begon in 1970, Monterey Pop was in 1967.'),
Q('Welk supersonisch passagiersvliegtuig maakte in 1969 zijn eerste vlucht?',['Concorde','Airbus A300','Fokker F28','Boeing 737'],0,'De Concorde vloog voor het eerst op 2 maart 1969.'),
Q('Welke Nederlandse band bracht in 1969 de wereldhit Venus uit?',['Shocking Blue','Golden Earring','Focus','BZN'],0,'Venus werd begin 1970 nummer 1 in Amerika.'),
Q('Welke band speelde in januari 1969 een beroemd laatste concert op een dak in Londen?',['The Beatles','The Rolling Stones','The Who','Pink Floyd'],0,'Het dakconcert van The Beatles op Savile Row.')],
'1974':[
Q('Welk land versloeg Nederland in de WK-finale van 1974?',['West-Duitsland','Argentinië','Brazilië','Italië'],0,'West-Duitsland won met 2-1 in München.'),
Q('Met welk lied won ABBA in 1974 het Eurovisiesongfestival?',['Waterloo','Dancing Queen','Mamma Mia','Fernando'],0,'Het festival werd gehouden in Brighton.'),
Q('Welke Amerikaanse president trad in 1974 af na het Watergate-schandaal?',['Richard Nixon','Gerald Ford','Jimmy Carter','Lyndon B. Johnson'],0,'Gerald Ford volgde hem op.'),
Q('Welke puzzel werd in 1974 bedacht door de Hongaarse architect Ernő Rubik?',['Rubiks kubus','Tangram','Sudoku','Tetris'],0,'De kubus kwam vanaf 1980 wereldwijd in de winkel.'),
Q('In welk land vond in april 1974 de Anjerrevolutie plaats?',['Portugal','Spanje','Griekenland','Italië'],0,'Een vrijwel geweldloze militaire coup maakte een eind aan de dictatuur.'),
Q('Welke Nederlander werd uitgeroepen tot beste speler van het WK van 1974?',['Johan Cruijff','Johan Neeskens','Rob Rensenbrink','Ruud Krol'],0,'Cruijff kreeg de Gouden Bal.')],
'1980':[
Q('Wie werd op 30 april 1980 koningin der Nederlanden?',['Beatrix','Juliana','Wilhelmina','Máxima'],0,'Juliana deed afstand van de troon; Beatrix werd ingehuldigd in Amsterdam.'),
Q('In welke stad werden de Olympische Zomerspelen van 1980 gehouden?',['Moskou','Los Angeles','Montreal','Seoel'],0,'Veel westerse landen boycotten deze Spelen.'),
Q('Welke Beatle werd in december 1980 in New York doodgeschoten?',['John Lennon','Paul McCartney','George Harrison','Ringo Starr'],0,'Lennon werd voor zijn appartement in het Dakota-gebouw neergeschoten.'),
Q('Welke Amerikaanse vulkaan barstte in mei 1980 uit?',['Mount St. Helens','Mount Rainier','Kilauea','Mount Hood'],0,'De uitbarsting blies de top van de berg weg.'),
Q('Welke Star Wars-film verscheen in 1980?',['The Empire Strikes Back','A New Hope','Return of the Jedi','The Phantom Menace'],0,'Het tweede deel van de oorspronkelijke trilogie.'),
Q('Welke Nederlander won in 1980 de Tour de France?',['Joop Zoetemelk','Jan Janssen','Hennie Kuiper','Gerrie Knetemann'],0,'Zoetemelk won na zes keer tweede te zijn geworden.')],
'1988':[
Q('Welk land werd in 1988 Europees kampioen voetbal?',['Nederland','West-Duitsland','Sovjet-Unie','Italië'],0,'De finale werd gespeeld in München.'),
Q('Tegen welk land speelde Nederland de EK-finale van 1988?',['Sovjet-Unie','West-Duitsland','Italië','Engeland'],0,'Nederland won met 2-0 door Gullit en Van Basten.'),
Q('In welke stad werden de Olympische Zomerspelen van 1988 gehouden?',['Seoel','Barcelona','Los Angeles','Atlanta'],0,'Seoel is de hoofdstad van Zuid-Korea.'),
Q('Welke zanger had in 1988 een hit met Man in the Mirror?',['Michael Jackson','Prince','Lionel Richie','Stevie Wonder'],0,'Een single van het album Bad.'),
Q('Welke spelcomputer bracht Sega in 1988 uit in Japan?',['Mega Drive','Master System','Game Gear','Dreamcast'],0,'In Amerika heette hij Genesis.'),
Q('In welke film uit 1988 wordt een jongen van twaalf plotseling volwassen (gespeeld door Tom Hanks)?',['Big','Forrest Gump','Splash','Philadelphia'],0,'Big werd geregisseerd door Penny Marshall.')],
'2000':[
Q('Voor welk computerprobleem rond de jaarwisseling naar 2000 was men bang?',['De millenniumbug','Een wereldwijde stroomstoring','De dotcom-crash','Een zonnestorm'],0,'Oude software rekende met twee cijfers voor het jaartal.'),
Q('Welke twee landen organiseerden samen het EK voetbal van 2000?',['Nederland en België','Spanje en Portugal','Oostenrijk en Zwitserland','Polen en Oekraïne'],0,'Frankrijk won de finale in Rotterdam.'),
Q('Welke stad organiseerde de Olympische Zomerspelen van 2000?',['Sydney','Athene','Atlanta','Peking'],0,'De Spelen vonden plaats in september.'),
Q('Welke Nederlandse zwemmer won in 2000 olympisch goud op de 100 en 200 meter vrije slag?',['Pieter van den Hoogenband','Johan Kenkhuis','Mark Veens','Marcel Wouda'],0,'Op de 100 meter versloeg hij Aleksandr Popov.'),
Q('In welke stad ontplofte in mei 2000 een vuurwerkopslag in een woonwijk?',['Enschede','Volendam','Rotterdam','Eindhoven'],0,'De ramp trof de wijk Roombeek.'),
Q('Welk land won het EK voetbal van 2000?',['Frankrijk','Italië','Nederland','Portugal'],0,'Frankrijk won de finale met een golden goal van Trezeguet.')],
'2006':[
Q('Welke film van Paul Verhoeven over het verzet kwam in 2006 uit?',['Zwartboek','Soldaat van Oranje','Turks Fruit','Spetters'],0,'Met Carice van Houten in de hoofdrol.'),
Q('Welk land won het WK voetbal van 2006?',['Italië','Frankrijk','Duitsland','Brazilië'],0,'Italië won de finale na strafschoppen.'),
Q('Welk hemellichaam verloor in 2006 zijn status als planeet?',['Pluto','Mars','Ceres','Neptunus'],0,'Pluto heet sindsdien een dwergplaneet.'),
Q('Welk medium met korte berichten van maximaal 140 tekens werd in 2006 gelanceerd?',['Twitter','Facebook','Instagram','Snapchat'],0,'Het platform heet tegenwoordig X.'),
Q('In welke film uit 2006 speelt Meryl Streep een strenge hoofdredacteur van een modeblad?',['The Devil Wears Prada','Mamma Mia!','Sex and the City','Legally Blonde'],0,'Anne Hathaway speelt haar assistente.'),
Q('In welke stad werden de Olympische Winterspelen van 2006 gehouden?',['Turijn','Vancouver','Salt Lake City','Sotsji'],0,'Turijn ligt in Noord-Italië.')],
'2014':[
Q('Op welke plaats eindigde Nederland op het WK voetbal van 2014?',['Derde','Tweede','Vierde','Kwartfinale'],0,'Nederland won de troostfinale met 0-3 van Brazilië.'),
Q('In welke stad werden de Olympische Winterspelen van 2014 gehouden?',['Sotsji','Moskou','Sint-Petersburg','Kazan'],0,'Nederland won daar 23 medailles bij het schaatsen.'),
Q('Welk duo werd in 2014 tweede op het Songfestival met Calm After the Storm?',['The Common Linnets','Anouk & Waylon','Duncan & Ilse','Kane'],0,'The Common Linnets: Ilse DeLange en Waylon.'),
Q('Welke Nederlandse schaatser won in 2014 olympisch goud op de 5000 meter?',['Sven Kramer','Jorrit Bergsma','Koen Verweij','Michel Mulder'],0,'Bergsma won de 10.000 meter.'),
Q('Wie vierde in 2014 de allereerste Koningsdag als koning?',['Willem-Alexander','Beatrix','Claus','Juliana'],0,'Koningsdag werd op 26 april 2014 gevierd omdat 27 april op zondag viel.'),
Q('Welke actie met een emmer ijswater ging in 2014 wereldwijd viraal voor de ziekte ALS?',['Ice Bucket Challenge','Harlem Shake','Planking','Mannequin Challenge'],0,'Miljoenen mensen goten ijswater over zich heen.')]
});
})();
