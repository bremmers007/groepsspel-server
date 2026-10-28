/* Groepsspel 0.14 — één centrale vragenbank (question-pool.js, gebouwd door tools/build_questions.py)
 * voedt alle meerkeuze- en mondelinge vragenrondes (Pubquiz, kennisquiz, De Achtervolging ...).
 * De volledige Wikidata-set (question-bank.js) blijft alleen in gebruik voor de herkenningsvakken van
 * Vakkenstrijd; in de algemene quizzen zorgde die voor honderden vragen over provincies, hoofdsteden en
 * filmregisseurs. Vragen over 'actualiteit' die inmiddels verouderd zijn, worden niet meer gesteld.
 */
(function(){
const OUTDATED=/^Actualiteit/;
for(const k of ['quiz','pubquiz'])if(Array.isArray(QUESTIONS[k]))QUESTIONS[k]=QUESTIONS[k].filter(q=>!OUTDATED.test(q.topic||''));
const key=q=>String(q.q).trim().toLowerCase();
const append=(target,items)=>{const used=new Set(target.map(key));for(const q of items)if(!used.has(key(q))){target.push({q:q.q,options:q.options,correct:q.correct,explanation:q.explanation,category:q.category,topic:q.topic,difficulty:q.difficulty,id:q.id,cat:q.cat});used.add(key(q));}};
const pool=window.QUESTION_POOL||[];
/* Handgeschreven variatievragen uit 0.10 (quiz-variety.js), per onderwerp ingedeeld in de 0.14-categorieën. */
const TOPIC_CAT={'Muziek':'muziek','Televisie & series':'film','Filmklassiekers':'film','Eten & drinken':'eten','Nederland vroeger':'nederland','Natuur & dieren':'wetenschap','Techniek & internet':'wetenschap','Sport & spel':'sport','Geschiedenis':'geschiedenis','Feest & tradities':'nederland','Wereld & reizen':'aardrijkskunde','Wetenschap & ruimte':'wetenschap','Taal & uitdrukkingen':'algemeen'};
const variety=(typeof QUIZ_VARIETY!=='undefined'?QUIZ_VARIETY:[]).filter(q=>!OUTDATED.test(q.topic||'')).map(q=>({...q,cat:TOPIC_CAT[q.topic]||'algemeen'}));
append(QUESTIONS.pubquiz,pool);append(QUESTIONS.quiz,pool);append(QUESTIONS.pubquiz,variety);append(QUESTIONS.quiz,variety);
/* 0.15: in andere talen dan Nederlands geen vragen over Nederlandse uitdrukkingen en woorden (niet te vertalen). */
if(window.GSI18N&&GSI18N.lang!=='nl'){const DUTCH=/uitdrukking|spreekwoord|dialectwoord|Nederlands woord/i;
 for(const k of Object.keys(QUESTIONS))if(Array.isArray(QUESTIONS[k]))QUESTIONS[k]=QUESTIONS[k].filter(q=>!(q&&(DUTCH.test(String(q.q||''))||q.topic==='Taal & uitdrukkingen')));
 if(Array.isArray(window.QUESTION_BANK))window.QUESTION_BANK=QUESTION_BANK.filter(q=>q.topic!=='Taal & uitdrukkingen');}
})();
