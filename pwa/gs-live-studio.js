/* Gedeelde beeldregie voor de tv-weergave van telefoonspellen. */
(() => {
  'use strict';

  const shows = {
    floor: {name:'Vakkenstrijd', look:'arcade', phases:{board:'Speelveld',duel:'Beeldduel'}},
    smart: {name:'De Bolleboos', look:'citadel', phases:{reveal:'Juiste antwoorden'}},
    hitster: {name:'Hitlijn', look:'neon', phases:{prepare:'Volgend nummer',listen:'Luister goed',challenge:'Daag uit',reveal:'De juiste plek'}},
    bingo: {name:'Muziekbingo', look:'video', phases:{play:'Luister en streep af'}}
  };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let studio, started=false, frame=null, previous=null, signature='', lastScene='';
  const scene = key => Object.hasOwn(shows,key)?shows[key]:null;

  function status(label) {
    let badge=document.querySelector('.studio-status');
    if(!badge){
      badge=document.createElement('span');badge.className='studio-status';
      badge.setAttribute('role','status');document.querySelector('header')?.append(badge);
    }
    badge.textContent=label;
  }

  function load() {
    if (started) return;
    if(new URLSearchParams(location.search).get('studio')==='0'){
      started=true;status('2D-tv-weergave');return;
    }
    started=true;
    const script=document.createElement('script');
    script.src='/app/gs-studio3d.js?v=200';
    status('3D-studio laden…');
    script.onerror=()=>status('2D-tv-weergave · 3D kon niet worden geladen');
    script.onload=()=>{
      studio=window.GStudio?.create(document.body,{
        base:'/app/',
        onSlow() {
          if(!studio)return;
          studio.renderer.setPixelRatio(.75);
          studio.composer.setPixelRatio(.75);
          studio.renderer.shadowMap.enabled=false;
          studio.bloom.enabled=false;
          status('3D-studio · lichte stand');
        }
      });
      if (studio) {
        status('3D-studio actief');
        document.body.classList.add('live-3d');
        studio.renderer.domElement.addEventListener('webglcontextlost',()=>{
          studio.dispose();studio=null;
          document.body.classList.remove('live-3d');
          status('2D-tv-weergave · 3D-verbinding weggevallen');
        },{once:true});
        if (frame) apply(frame.kind,frame.state);
      }else status('2D-tv-weergave · WebGL niet beschikbaar');
    };
    document.head.append(script);
  }

  function score(kind,state,id) {
    if (kind==='floor') return state.board?.filter(owner=>owner===id).length||0;
    if (kind==='smart') return Math.ceil(state.banks?.[id]||0);
    if (kind==='hitster') return state.timelines?.[id]?.length||0;
    return state.scores?.[id]||0;
  }

  function apply(kind,state) {
    const setup=scene(kind);
    const teams=state.teams.map((team,i)=>({...team,score:score(kind,state,team.id),
      avatar:['lion','fox','panda','robot','owl','tiger'][i%6]}));
    const phase=state.phase;
    const ended=phase==='end';
    const podium=kind==='bingo'&&ended
      ? teams.filter(team=>team.score===Math.max(...teams.map(t=>t.score))).map(t=>t.id)
      : state.winners||[state.winner].filter(Boolean);
    const winner=podium.length===1?podium[0]:null;
    const label=ended?'Eindstand':state.paused?'Pauze':
      (kind==='smart'?state.round_name:setup.phases[phase])||'Sluit aan en speel mee';
    const showType={city:'jacht',citadel:'finale',neon:'neon',video:'video'}[setup.look];
    window.GSCinema?.sync({phase,auto:{type:showType,look:setup.look}},previous,studio);
    document.body.dataset.liveShow=kind;
    if (!studio) return;
    if (lastScene!==kind) {studio.clearRound();lastScene=kind;}
    studio.setTeams(teams);
    studio.phase?.(ended?'end':phase);
    studio.wall(setup.name,label);
    studio.setDefaultShot(state.active&&['duel','play','challenge'].includes(phase)
      ? 'team:'+state.active : 'wide');
    const key=JSON.stringify([kind,phase,state.active,state.result?.message,state.pattern,podium]);
    if (key!==signature) {
      if (ended&&previous?.phase!=='end') studio.celebrate(winner);
      else if (!motion.matches&&kind==='floor'&&phase==='board'&&previous?.phase==='duel'&&state.winner) {
        studio.focus('team:'+state.winner,2.2);
        studio.results([{team_id:state.winner,correct:true}]);
      } else if (!motion.matches&&phase==='duel'&&previous?.phase!=='duel'&&!studio.spatialSet) studio.focus('high',1.2);
      signature=key;
    }
    previous={phase};
  }

  function update(kind,state) {
    if (!scene(kind)||!state?.teams) {
      frame=null;previous=null;signature='';
      document.body.classList.remove('live-3d');
      if(studio)studio.renderer.domElement.hidden=true;
      delete document.body.dataset.liveShow;
      window.GSCinema?.sync(null);
      return;
    }
    if(studio){
      studio.renderer.domElement.hidden=false;
      document.body.classList.add('live-3d');
    }
    frame={kind,state};
    load();
    apply(kind,state);
  }

  window.GSLiveStudio={update};
})();
