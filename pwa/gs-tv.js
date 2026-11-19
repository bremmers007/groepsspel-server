/* Groepsspel 0.15.4 · knop 📺 TV-scherm: opent op de spelleider-pc een apart venster zonder browserbalken,
   volledig scherm op de tweede monitor (tv via HDMI). Het TV-scherm volgt vanzelf het actieve spel.
   Zonder Windows-app (of vanaf een ander apparaat) opent /tv in een nieuw venster; druk daar op F11. */
(function(){
  'use strict';
  function note(text){if(typeof window.toast==='function'){window.toast(text);return;}const n=document.getElementById('notice');if(n){n.textContent=text;n.style.display='block';clearTimeout(note.t);note.t=setTimeout(()=>{n.style.display='none';},6000);}}
  const local=/^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);
  document.addEventListener('click',async e=>{const b=e.target.closest('[data-open-tv]');if(!b)return;e.preventDefault();
    if(local){try{const r=await fetch('/api/open-tv',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const v=await r.json();if(v.ok){note('Het TV-scherm opent op het tweede scherm. Druk daar op F11 om volledig scherm aan of uit te zetten.');return;}}catch{}}
    const w=window.open('/tv','groepsspel-tv','popup,width=1280,height=720');
    note(w?'Sleep het TV-venster naar de tv en druk op F11 voor volledig scherm.':'Open op de tv-computer het adres /tv van deze spelserver.');});
  window.GTV={button:(cls='btn secondary')=>`<button type="button" class="${cls}" data-open-tv>📺 TV-scherm</button>`};
})();
