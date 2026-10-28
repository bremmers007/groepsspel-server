/* Local phone controllers: the Python host owns answers and clocks. */
/* Keep the mapping between the PWA catalogue and Python game routes in one place. */
const PHONE_GAME_PATHS=Object.freeze({
  murder:'/spel/moord',moord:'/spel/moord',strategy:'/spel/stratego',stratego:'/spel/stratego',
  crazy:'/spel/crazy88',crazy88:'/spel/crazy88',smuggle:'/spel/smokkel',smokkel:'/spel/smokkel',
  holland:'/spel/holland',traitors:'/verraders',missions:'/spel/missies',hunted:'/spel/opgejaagd',musicbingo:'/spel/bingo'
});
async function localServerAvailable(){
 try{const c=new AbortController();const timer=setTimeout(()=>c.abort(),2800);
  try{const r=await fetch('/api/ping',{cache:'no-store',signal:c.signal});if(!r.ok||!r.headers.get('content-type')?.includes('json'))return false;const data=await r.json();return data.product==='groepsspel';}
  finally{clearTimeout(timer);}
 }catch{return false;}
}
async function openPhoneShows(id='floor'){
 const path=PHONE_GAME_PATHS[id]||'/shows?game='+encodeURIComponent(id);
 if(await localServerAvailable()){location.href=path;return;}
 dialog('Voor dit telefoonspel is een spelserver nodig',`<p>De spelers doen mee op hun eigen telefoon. Daarvoor is een centrale spelserver nodig; voor een bordspel op één tablet is die <strong>niet nodig</strong>. Kies een van de manieren:</p><ol><li><strong>Op een pc (wifi):</strong> installeer en start de Windows-app Groepsspel. Open daarna op die pc het spel; spelers scannen de QR-code op hetzelfde wifinetwerk.</li><li><strong>Op een pc, via mobiel internet:</strong> kies in het Startmenu <em>Groepsspel via mobiel internet</em>. Spelers doen mee via hun eigen 4G/5G, ook buiten de wifi.</li><li><strong>Online, zonder pc:</strong> open Groepsspel via jullie online spelserver (het https-adres van de beheerder), tik op <em>Nieuwe spelkamer</em> en kies het spel. Spelers scannen de QR-code en spelen via mobiel internet of wifi.</li></ol><p class="micro">Een online spelserver zet je eenmalig op; zie ONLINE-SPELSERVER.txt in het pakket.</p>`,`${['murder','traitors','strategy','crazy','smuggle','holland','missions','hunted','musicbingo'].includes(id)&&GAMES.some(g=>g.id===id)?`<button class="btn" data-phone-fallback="${id}">Eenvoudige versie op dit apparaat</button>`:''}<a class="btn secondary" href="#phones" data-action="close">Terug naar telefoonspellen</a>`);
}

document.addEventListener('submit',e=>{if(e.target.id!=='showSetupForm'||e.target.elements.playMode?.value!=='phones')return;e.preventDefault();e.stopImmediatePropagation();openPhoneShows(e.target.elements.gameId.value);},true);
document.addEventListener('click',e=>{const fb=e.target.closest('[data-phone-fallback]');if(fb){close();detail(fb.dataset.phoneFallback);}});
document.addEventListener('click',async e=>{
 const open=e.target.closest('[data-phone-show]');if(open){openPhoneShows(open.dataset.phoneShow||'floor');return;}
 if(!e.target.closest('[data-phone-music]'))return;
 if(!location.pathname.startsWith('/app/'))return openPhoneShows('hitster');
 try{
  await navigator.storage?.persist?.();
  const r=await fetch('/api/bootstrap',{cache:'no-store'});if(!r.ok)throw Error('Open de Windows-app op de server-pc.');const {host_key}=await r.json();
  const songs=state.music.filter(m=>m.mediaKey&&HIT.validSong(m));if(!songs.length)throw Error('Koppel eerst lokale audio aan nummers met een geldig jaar.');
  let count=0;
  for(const m of songs){const file=await ShowMedia.get(m.mediaKey);if(!file?.blob)continue;toast(`Muziek naar de lokale spelserver: ${count+1}/${songs.length}`);
   const response=await fetch('/api/show/upload',{method:'POST',headers:{Authorization:'Bearer '+host_key,'Content-Type':file.blob.type||'audio/mpeg','X-Show-Meta':btoa(unescape(encodeURIComponent(JSON.stringify({title:m.title,artist:m.artist,year:m.year}))))},body:file.blob});
   const data=await response.json();if(!response.ok)throw Error(data.error);count++;
  }
  toast(`${count} nummers staan op de lokale spelserver.`);openPhoneShows('hitster');
 }catch(error){toast(error.message);}
});

document.addEventListener('change',e=>{if(!e.target.matches?.('[data-development-mode]'))return;localStorage.setItem('groepsspel-development',e.target.checked?'yes':'no');render();});
