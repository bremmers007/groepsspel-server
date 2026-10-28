/* Groepsspel 0.14 — toegang tot de centrale vragenbank (question-pool.js + bank-loader.js).
 * Alle meerkeuzespellen putten uit QUESTIONS.quiz/pubquiz; via state.seen (engines.js, availablePool)
 * krijgt een groep pas weer een gestelde vraag als de verse vragen op zijn. */
(function(){
'use strict';
const info=window.QUESTION_POOL_INFO||{categories:{}};
function counts(){const c={};for(const q of (QUESTIONS.pubquiz||[]))if(q.cat)c[q.cat]=(c[q.cat]||0)+1;return c;}
function seenCount(){return Object.keys(state.seen||{}).length;}
function resetSeen(){state.seen={};save();}
GS.define('questions',{info,counts,seenCount,resetSeen,total:()=>(QUESTIONS.pubquiz||[]).length});
document.addEventListener('click',e=>{if(!e.target.closest('[data-gs-resetseen]'))return;resetSeen();toast('Vragengeschiedenis gewist: alle vragen kunnen weer voorkomen.');render();});
})();
