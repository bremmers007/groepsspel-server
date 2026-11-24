/* Groepsspel 0.15.4 · gedeelde geluidsmodule voor de spelserverschermen (spelleider, beamer, telefoonspellen)
   en de app. Eigen composities uit audio/ (zie tools/make_music.py); geen bestaande muziek.
   - Eén knop "♫ Geluid aan/uit", per scherm onthouden.
   - Browsers starten geluid pas na een tik of klik: staat geluid aan, dan start het bij de eerste tik op de pagina.
   - Achtergrondloops via Web Audio (naadloos herhalen, zacht overvloeien), korte effecten erbovenop.
   GSound.bed('lobby'|'quiz'|'finale'|'mystery'|null), GSound.play('buzz'|'correct'|'wrong'|'tick'|'intro'|'end'|'pass') */
const GSound=(()=>{
  const script=document.currentScript,base=new URL('audio/',script?.src||location.href).href;
  const LOOPS={lobby:'loop-lobby.mp3',quiz:'loop-quiz.mp3',finale:'loop-finale.mp3',mystery:'loop-mystery.mp3',sprint:'loop-sprint.mp3',victory:'loop-victory.mp3'};
  const CUES={victory:'victory.wav',boom:'boom.wav',splat:'splat.wav',whoosh:'whoosh.wav',buzz:'buzz.wav',correct:'correct.wav',wrong:'wrong.wav',tick:'tick.wav',intro:'intro.wav',end:'end.wav',pass:'pass.wav',drumroll:'drumroll.wav'};
  const scope=location.pathname.replace(/\/+$/,'')||'/',key='groepsspel-sound-on:'+scope;
  let on=false,ctx=null,master=null,bedGain=null,current=null,mood=null,wanted=null,buffers=new Map(),volume=.45,background=.22,failed=false,unlocked=false;
  const tvMode=new URLSearchParams(location.search).get('tv')==='1';if(tvMode)document.documentElement.classList.add('tv-mode'),document.addEventListener('DOMContentLoaded',()=>document.body.classList.add('tv-mode'));
  try{const st=localStorage.getItem(key);on=st==='1'||(tvMode&&st!=='0');const p=JSON.parse(localStorage.getItem('groepsspel-sound')||'{}');if(Number.isFinite(p.volume))volume=Math.max(0,Math.min(1,p.volume));if(Number.isFinite(p.background))background=Math.max(0,Math.min(1,Math.max(p.background,.12)));}catch{}
  let playlist=[], trackIndex=0, music=null, musicConnected=false, musicStatus=()=>{};
  // 0.23: geen Qmusic-livestream meer (reclame en dj-praat botsten met de presentator); alleen eigen spelmuziek of eigen bestanden
  let ducked=false;
  function stopRadio(){}
  function useTop40(){}
  function musicSourceLabel(){ return playlist.length?'Eigen muziek':'Muziek van Groepsspel'; }
  function reportMusic(){
    musicStatus(playlist.length ? `${trackIndex+1}/${playlist.length} · ${playlist[trackIndex].name}` : 'Standaardmuziek');
  }
  function advanceMusic(){
    if(!playlist.length)return;
    trackIndex=(trackIndex+1)%playlist.length;
    music.src=playlist[trackIndex].url;
    reportMusic();
    applyBed();
  }
  function setPlaylist(files,status){
    if(music){music.pause();music.removeAttribute('src');music.load();}
    for(const item of playlist)URL.revokeObjectURL(item.url);
    playlist=Array.from(files,file=>({name:file.name,url:URL.createObjectURL(file)}));
    trackIndex=0;
    musicStatus=status;
    if(playlist.length){
      if(!music){
        music=new Audio();
        music.preload='metadata';
        music.addEventListener('ended',advanceMusic);
        music.addEventListener('error',()=>{
          if(playlist.length)musicStatus('Kan dit nummer niet afspelen. Kies Volgend nummer of andere bestanden.');
        });
      }
      music.src=playlist[0].url;
    }
    reportMusic();
    applyBed();
  }
  function playPlaylist(){
    stopBed();
    mood=null;
    if(!musicConnected){
      ctx.createMediaElementSource(music).connect(bedGain);
      musicConnected=true;
    }
    if(!wanted){music.pause();return;}
    if(music.paused)music.play().catch(()=>{});
  }
  function save(){try{localStorage.setItem(key,on?'1':'0');}catch{}}
  function notice(text){if(typeof window.toast==='function'){window.toast(text);return;}const n=document.getElementById('notice');if(n){n.textContent=text;n.style.display='block';clearTimeout(notice.t);notice.t=setTimeout(()=>{n.style.display='none';},5000);}}
  function context(){if(ctx)return ctx;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ctx=new C();master=ctx.createGain();master.gain.value=1;master.connect(ctx.destination);bedGain=ctx.createGain();bedGain.gain.value=background;bedGain.connect(master);return ctx;}
  async function load(file){if(buffers.has(file))return buffers.get(file);const p=fetch(base+file).then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer();}).then(b=>new Promise((ok,no)=>context().decodeAudioData(b,ok,no)));buffers.set(file,p);p.catch(()=>buffers.delete(file));return p;}
  async function unlock(){const c=context();if(!c){if(!failed){failed=true;notice('Deze browser kan hier geen geluid afspelen.');}return false;}try{if(c.state!=='running')await c.resume();unlocked=c.state==='running';}catch{unlocked=false;}if(unlocked)applyBed();return unlocked;}
  let epoch=0,loading=null;
  async function applyBed(){const target=wanted;if(!on||!unlocked){music?.pause();stopRadio();stopBed();mood=null;return;}if(playlist.length){stopRadio();playPlaylist();return;}stopRadio();if(target===mood&&(current||loading===target))return;mood=target;stopBed();const my=++epoch;if(!target)return;loading=target;try{const buf=await load(LOOPS[target]);if(my!==epoch||!on)return;const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=buf;src.loop=true;g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(1,ctx.currentTime+1.2);src.connect(g);g.connect(bedGain);src.start();current={src,g};}catch{if(!failed){failed=true;notice('Achtergrondmuziek kon niet laden. Controleer of de spelserver nog draait.');}}finally{if(my===epoch)loading=null;}}
  function stopBed(){epoch++;loading=null;if(!current)return;const {src,g}=current;current=null;try{g.gain.cancelScheduledValues(ctx.currentTime);g.gain.setValueAtTime(g.gain.value,ctx.currentTime);g.gain.linearRampToValueAtTime(0,ctx.currentTime+.8);src.stop(ctx.currentTime+.85);}catch{}}
  function bed(next){next=next&&LOOPS[next]?next:null;wanted=next;applyBed();}
  async function play(name){if(!on||!unlocked||!CUES[name])return;try{const buf=await load(CUES[name]);const src=ctx.createBufferSource(),g=ctx.createGain();g.gain.value=volume*(name==='tick'?.7:1);src.buffer=buf;src.connect(g);g.connect(master);if((current||playlist.length)&&name!=='tick'){bedGain.gain.cancelScheduledValues(ctx.currentTime);bedGain.gain.setValueAtTime(background*.35,ctx.currentTime);bedGain.gain.linearRampToValueAtTime(background,ctx.currentTime+buf.duration+.6);}src.start();}catch{}}
  function label(){return on?(unlocked?'♫ Geluid uit':'♫ Tik om geluid te starten'):'♫ Geluid aan';}
  function refresh(){document.querySelectorAll('[data-gs-sound]').forEach(b=>{b.textContent=label();b.setAttribute('aria-pressed',on?'true':'false');b.classList.toggle('on',on);});}
  async function toggle(){on=!on;save();if(on){const ok=await unlock();if(ok){applyBed();play('correct');}else notice('Geluid kon niet starten. Controleer je luidspreker en klik nog eens op ♫ Geluid aan.');}else{music?.pause();stopRadio();stopBed();mood=null;}refresh();}
  function button(){return `<button type="button" class="gs-sound-btn${on?' on':''}" data-gs-sound aria-pressed="${on}">${label()}</button>`;}
  function mount(target){if(document.querySelector('.gs-sound-float'))return;const wrap=document.createElement('div');wrap.className='gs-sound-float';wrap.innerHTML=button();(target||document.body).appendChild(wrap);if(!document.getElementById('gs-sound-style')){const st=document.createElement('style');st.id='gs-sound-style';st.textContent='.gs-sound-float{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:50}.gs-sound-btn{font:inherit;font-weight:700;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:.55em 1em;background:rgba(10,14,40,.82);color:#fff;cursor:pointer;backdrop-filter:blur(6px)}.gs-sound-btn.on{background:#ffd447;color:#111;border-color:#ffd447}@media print{.gs-sound-float{display:none}}';document.head.appendChild(st);}}
  document.addEventListener('click',e=>{if(e.target.closest('[data-gs-sound]')){e.preventDefault();toggle();}},true);
  const first=e=>{if(e.target?.closest?.('[data-gs-sound]'))return;if(on&&!unlocked)unlock().then(refresh);};
  ['pointerdown','keydown','touchend'].forEach(t=>document.addEventListener(t,first,{passive:true}));
  if(on){const C=window.AudioContext||window.webkitAudioContext;if(C){try{context();ctx.resume().then(()=>{if(ctx.state==='running'){unlocked=true;applyBed();refresh();}}).catch(()=>{});}catch{}}}
  async function set(v){v=!!v;if(v===on){if(on&&!unlocked)await unlock();refresh();return;}await toggle();}
  function duck(v){ducked=!!v;if(!bedGain||!ctx)return;bedGain.gain.cancelScheduledValues(ctx.currentTime);bedGain.gain.setValueAtTime(bedGain.gain.value,ctx.currentTime);bedGain.gain.linearRampToValueAtTime(v?background*.3:background,ctx.currentTime+.3);}
  return{bed,play,toggle,set,duck,button,mount,refresh,unlock,setPlaylist,advanceMusic,useTop40,musicSourceLabel,enabled:()=>on&&unlocked,isOn:()=>on,mood:()=>wanted,setVolume(v,b){volume=Math.max(0,Math.min(1,v));background=Math.max(0,Math.min(1,b));if(bedGain)bedGain.gain.value=background*(ducked?.3:1);}};
})();
