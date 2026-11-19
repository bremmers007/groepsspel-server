/* Groepsspel 0.15.4 · Joep, de geanimeerde presentator voor het tv-/beamerscherm.
   Eigen ontwerp (SVG + CSS), geen bestaand personage. Praat in tekstballonnen met bewegende mond en leest,
   als de computer een stem in de gekozen taal heeft, zijn teksten hardop voor (Web Speech API).
   GPresenter.mount(), GPresenter.say(tekst,{mood,speech}), GPresenter.mood('idle'|'talk'|'happy'|'sad'|'point'|'wave') */
const GPresenter=(()=>{
  const scope=location.pathname.replace(/\/+$/,'')||'/',KEY='groepsspel-presenter-voice:'+scope;
  let root=null,bubble=null,figure=null,voiceOn=true,timer=null,moodTimer=null,speaking=false,voices=[],queue=[];
  try{voiceOn=localStorage.getItem(KEY)!=='0';}catch{}
  const tr=text=>window.GSI18N?.t?GSI18N.t(text):text;
  const locale=()=>window.GSI18N?.locale?.()||'nl-NL';
  const synth=window.speechSynthesis||null;
  function loadVoices(){try{voices=synth?synth.getVoices():[];}catch{voices=[];}}
  if(synth){loadVoices();try{synth.addEventListener('voiceschanged',loadVoices);}catch{}}
  function voice(){const loc=locale().toLowerCase(),pre=loc.slice(0,2);const list=voices.filter(v=>(v.lang||'').toLowerCase().replace('_','-').startsWith(pre));if(!list.length)return null;const score=v=>((v.lang||'').toLowerCase().replace('_','-')===loc?2:0)+(/natural|online|neural/i.test(v.name)?3:0)+(v.localService?0:1);return list.sort((a,b)=>score(b)-score(a))[0];}
  const SVG=`<svg viewBox="0 0 220 320" class="gp-svg" aria-hidden="true">
    <ellipse cx="110" cy="310" rx="62" ry="8" class="gp-shadow"/>
    <g class="gp-body">
      <path d="M86 250 L80 298 L100 298 L104 252 Z M134 250 L140 298 L120 298 L116 252 Z" fill="#2b2357"/>
      <ellipse cx="88" cy="300" rx="16" ry="7" fill="#151022"/><ellipse cx="132" cy="300" rx="16" ry="7" fill="#151022"/>
      <path d="M60 170 Q110 150 160 170 L168 258 Q110 272 52 258 Z" fill="#7b3fe4"/>
      <path d="M96 160 L110 214 L124 160 Z" fill="#fff"/>
      <path d="M96 160 L84 230 L104 196 Z M124 160 L136 230 L116 196 Z" fill="#5a2bb8"/>
      <circle cx="110" cy="222" r="3" fill="#ffd447"/><circle cx="110" cy="238" r="3" fill="#ffd447"/>
      <path d="M96 166 L110 172 L124 166 L124 180 L110 174 L96 180 Z" fill="#ffd447" stroke="#c99a00" stroke-width="1.5"/>
      <g class="gp-arm-left"><path d="M62 176 Q40 200 44 236" stroke="#7b3fe4" stroke-width="18" fill="none" stroke-linecap="round"/><circle cx="44" cy="240" r="10" fill="#f2c29b"/></g>
      <g class="gp-arm-right"><path d="M158 176 Q182 196 166 214" stroke="#7b3fe4" stroke-width="18" fill="none" stroke-linecap="round"/><circle cx="162" cy="214" r="10" fill="#f2c29b"/><rect x="157" y="188" width="7" height="26" rx="3" fill="#333" transform="rotate(-20 160 200)"/><circle cx="154" cy="186" r="9" fill="#c9ccd6" stroke="#8a8f9c" stroke-width="2"/></g>
    </g>
    <g class="gp-head">
      <ellipse cx="62" cy="104" rx="10" ry="14" fill="#e8b48c"/><ellipse cx="158" cy="104" rx="10" ry="14" fill="#e8b48c"/>
      <circle cx="110" cy="100" r="50" fill="#f2c29b"/>
      <path d="M62 86 Q60 40 104 38 Q150 30 162 78 Q150 58 128 60 Q140 44 116 46 Q122 58 100 56 Q84 58 74 74 Z" fill="#ff7a1a"/>
      <path d="M100 38 Q118 10 146 22 Q124 22 120 40 Z" fill="#ff7a1a"/>
      <g class="gp-brows"><path class="gp-brow-l" d="M80 78 Q90 72 100 77" stroke="#9c4a0e" stroke-width="4" fill="none" stroke-linecap="round"/><path class="gp-brow-r" d="M120 77 Q130 72 140 78" stroke="#9c4a0e" stroke-width="4" fill="none" stroke-linecap="round"/></g>
      <g class="gp-eyes"><ellipse cx="91" cy="96" rx="9" ry="11" fill="#fff"/><ellipse cx="129" cy="96" rx="9" ry="11" fill="#fff"/><circle class="gp-pupil" cx="93" cy="98" r="5" fill="#1d1730"/><circle class="gp-pupil" cx="131" cy="98" r="5" fill="#1d1730"/><circle cx="95" cy="95" r="1.8" fill="#fff"/><circle cx="133" cy="95" r="1.8" fill="#fff"/></g>
      <circle cx="78" cy="118" r="7" fill="#ff9e9e" opacity=".55"/><circle cx="142" cy="118" r="7" fill="#ff9e9e" opacity=".55"/>
      <path d="M106 104 Q110 114 114 104" stroke="#d1956b" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path class="gp-mouth-closed" d="M94 124 Q110 138 126 124" stroke="#7a2b1a" stroke-width="4" fill="none" stroke-linecap="round"/>
      <g class="gp-mouth-open"><path d="M94 122 Q110 148 126 122 Z" fill="#7a2b1a"/><path d="M100 132 Q110 142 120 132 Q110 136 100 132Z" fill="#ff6f7d"/></g>
    </g></svg>`;
  const CSS=`.gp-wrap{position:fixed;left:max(10px,env(safe-area-inset-left));bottom:0;z-index:40;display:flex;align-items:flex-end;gap:8px;pointer-events:none;transition:transform .6s cubic-bezier(.2,1.4,.4,1)}
  .gp-wrap.gp-hidden{transform:translateX(-120%)}.gp-figure{width:min(24vh,190px);pointer-events:auto}.gp-small .gp-figure{width:110px}
  .gp-svg{width:100%;height:auto;display:block;overflow:visible}.gp-shadow{fill:rgba(0,0,0,.28)}
  .gp-figure{animation:gp-bob 2.4s ease-in-out infinite}.gp-head{transform-origin:110px 140px}.gp-eyes{transform-origin:110px 96px;animation:gp-blink 4.6s infinite}
  .gp-arm-left{transform-origin:62px 176px;transition:transform .35s}.gp-arm-right{transform-origin:158px 176px;transition:transform .35s}.gp-brows path{transition:transform .3s}
  .gp-mouth-open{opacity:0}.gp-talk .gp-mouth-open{animation:gp-mouth .22s steps(2) infinite}.gp-talk .gp-mouth-closed{animation:gp-mouth-c .22s steps(2) infinite}
  .gp-point .gp-arm-left{transform:rotate(-115deg)}.gp-wave .gp-arm-left{animation:gp-wave .5s ease-in-out 3 alternate}
  .gp-happy .gp-figure{animation:gp-jump .55s ease-in-out 3}.gp-happy .gp-arm-left{transform:rotate(-150deg)}.gp-happy .gp-arm-right{transform:rotate(-40deg)}.gp-happy .gp-brows path{transform:translateY(-5px)}
  .gp-sad .gp-head{animation:gp-shake .45s ease-in-out 3}.gp-sad .gp-brow-l{transform:rotate(14deg) translate(2px,-2px)}.gp-sad .gp-brow-r{transform:rotate(-14deg) translate(-2px,-2px)}.gp-sad .gp-mouth-closed{transform:scaleY(-1);transform-origin:110px 130px}
  .gp-bubble{max-width:min(46vw,640px);margin-bottom:min(18vh,150px);background:#fff;color:#151022;border-radius:22px;padding:.7em 1em;font-size:clamp(16px,2.6vh,30px);font-weight:700;line-height:1.25;box-shadow:0 10px 30px rgba(0,0,0,.35);position:relative;opacity:0;transform:scale(.6);transform-origin:left bottom;transition:opacity .2s,transform .25s}
  .gp-small .gp-bubble{font-size:15px;max-width:300px;margin-bottom:70px}.gp-bubble:before{content:"";position:absolute;left:-14px;bottom:18px;border:10px solid transparent;border-right:16px solid #fff;border-left:0}
  .gp-bubble.gp-on{opacity:1;transform:scale(1)}.gp-voice{pointer-events:auto;position:absolute;left:4px;bottom:4px;font:inherit;font-size:12px;border:0;border-radius:999px;padding:.25em .6em;background:rgba(10,14,40,.7);color:#fff;cursor:pointer}
  @keyframes gp-bob{50%{transform:translateY(-5px)}}@keyframes gp-blink{0%,94%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
  @keyframes gp-mouth{0%{opacity:1}100%{opacity:0}}@keyframes gp-mouth-c{0%{opacity:0}100%{opacity:1}}
  @keyframes gp-jump{50%{transform:translateY(-28px)}}@keyframes gp-shake{25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}@keyframes gp-wave{from{transform:rotate(-120deg)}to{transform:rotate(-160deg)}}
  @media (prefers-reduced-motion:reduce){.gp-figure,.gp-eyes,.gp-happy .gp-figure,.gp-sad .gp-head{animation:none}}@media print{.gp-wrap{display:none}}`;
  function mount(opts={}){if(root)return root;const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);root=document.createElement('div');root.className='gp-wrap gp-hidden'+(opts.small?' gp-small':'');root.setAttribute('aria-live','polite');root.innerHTML=`<div class="gp-figure" title="Joep, de presentator">${SVG}</div><div class="gp-bubble" role="status"></div><button type="button" class="gp-voice" data-gp-voice></button>`;document.body.appendChild(root);figure=root.querySelector('.gp-figure');bubble=root.querySelector('.gp-bubble');label();root.querySelector('[data-gp-voice]').addEventListener('click',()=>{voiceOn=!voiceOn;try{localStorage.setItem(KEY,voiceOn?'1':'0');}catch{}if(!voiceOn)synth?.cancel();label();});return root;}
  function label(){const b=root?.querySelector('[data-gp-voice]');if(b)b.textContent=voiceOn?'🗣 Stem aan':'🗣 Stem uit';}
  function show(on){if(root)root.classList.toggle('gp-hidden',!on);}
  function mood(m){if(!root)return;clearTimeout(moodTimer);root.classList.remove('gp-happy','gp-sad','gp-point','gp-wave');if(m&&m!=='idle'&&m!=='talk')root.classList.add('gp-'+m);if(['happy','sad','wave'].includes(m))moodTimer=setTimeout(()=>root.classList.remove('gp-'+m),2600);}
  function talk(on){speaking=on;root?.classList.toggle('gp-talk',on);if(window.GSound?.duck)GSound.duck(on);}
  function say(text,opt={}){if(!root)mount();if(opt.queue&&(speaking||bubble.classList.contains('gp-on'))){queue.push([text,{...opt,queue:false}]);return;}if(!opt.fromQueue)queue=[];show(true);clearTimeout(timer);const shown=tr(opt.bubble||text),spoken=tr(text);bubble.textContent=shown;bubble.classList.add('gp-on');mood(opt.mood||'talk');
    const done=()=>{talk(false);clearTimeout(timer);if(queue.length){const [t,o]=queue.shift();timer=setTimeout(()=>say(t,{...o,fromQueue:true}),350);return;}timer=setTimeout(()=>bubble.classList.remove('gp-on'),opt.hold||2500);};
    const fallback=()=>{talk(true);timer=setTimeout(done,Math.min(6000,900+shown.length*55));};
    const allowed=voiceOn&&synth&&opt.speech!==false&&(typeof GSound==='undefined'||GSound.enabled());
    try{synth?.cancel();}catch{}
    if(!allowed){fallback();return;}
    const v=voice();if(!v){fallback();return;}
    try{const u=new SpeechSynthesisUtterance(spoken);u.voice=v;u.lang=v.lang;u.rate=1.05;u.pitch=1.15;u.onstart=()=>talk(true);u.onend=done;u.onerror=done;synth.speak(u);timer=setTimeout(done,Math.max(8000,spoken.length*120));}catch{fallback();}}
  function hide(){try{synth?.cancel();}catch{}talk(false);bubble?.classList.remove('gp-on');show(false);}
  return{mount,say,mood,show,hide,hasVoice:()=>!!voice(),voiceOn:()=>voiceOn};
})();
