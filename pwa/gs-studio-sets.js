/* Ruimtelijke decors voor de bestaande Three.js-studio. */
(() => {
  'use strict';
  const layouts = {
    gala: ['gala',0x1f2d68,0x45edff,0xffc875],
    arcade: ['arcade',0x262998,0xc4f83e,0xff8b2f],
    theatre: ['theatre',0x6f1736,0x7cddbf,0xf8bd7c],
    city: ['roof',0x202a46,0x73d9ff,0xff9170],
    citadel: ['castle',0x3b344f,0x774eff,0xf2b762],
    winner: ['castle',0x44304c,0xffcb71,0xf0a4ff],
    holland: ['polder',0x795349,0xffa344,0xa9e4ff],
    analogue: ['wood',0x69402b,0xffa054,0xbdc786],
    neon: ['neon',0x252b56,0xd87dff,0x5cefff],
    video: ['video',0x1d587a,0x61f5f1,0xd9f95b],
    digital: ['glass',0x24334c,0x9ac6ff,0xeef6ff]
  };

  function build(studio,theme) {
    const T=window.GStudio?.geometry;
    if(!T)return null;
    const [form,base,accent,secondary]=layouts[theme]||layouts.city;
    const group=new T.Group(), shapes=[], materials=[];
    const standard=(color,metalness=.18)=>new T.MeshStandardMaterial({color,metalness,roughness:.52});
    const glow=color=>new T.MeshBasicMaterial({color});
    const wall=standard(base), dark=standard(0x141b29,.36), trim=standard(secondary,.55);
    const light=glow(accent), spark=glow(secondary);
    materials.push(wall,dark,trim,light,spark);
    const box=new T.BoxGeometry(1,1,1), column=new T.CylinderGeometry(.5,.65,1,12);
    const arch=new T.TorusGeometry(1,.08,8,42,Math.PI);
    shapes.push(box,column,arch);
    function mesh(geometry,material,x,y,z,sx,sy,sz,parent=group){
      const item=new T.Mesh(geometry,material);
      item.position.set(x,y,z);item.scale.set(sx,sy,sz);
      item.receiveShadow=true;parent.add(item);return item;
    }
    const block=(m,x,y,z,w,h,d,parent)=>mesh(box,m,x,y,z,w,h,d,parent);
    const moving=[];
    if(['gala','theatre','arcade'].includes(form)){
      const retro=form==='theatre';
      const velvet=standard(retro?0x711833:0x202455,.03);
      const pleat=standard(retro?0x4e1025:0x141633,.02);
      materials.push(velvet,pleat);
      for(const side of [-1,1]){
        if(form==='arcade'){
          for(let i=0;i<3;i++){
            const x=side*(7.9+i*1.28);
            const beam=block(i%2?light:trim,x,4.0,-8.5-i*.4,.46,8.2,.56);
            beam.rotation.z=side*(.23+i*.045);
            block(spark,x,1.1,-7.85-i*.4,1.8,.18,.16).rotation.z=side*.23;
          }
        }else{
          for(let i=0;i<29;i++){
            const x=side*(3.7+i*.31);
            block(i%3===0?velvet:pleat,x,4.55,-10.8+Math.cos(i*.75)*.16,.36,9.1,.48);
          }
          const x=side*(retro?8.7:9.5);
          block(trim,x,3.3,-7.5,.56,6.6,.52);
          block(light,x,3.42,-7.20,.115,6.25,.09);
          block(trim,x,6.7,-7.51,1.2,.24,.7);
          for(let i=0;i<6;i++) block(spark,side*(5.9+i*.46),.81+i*.028,-6.7,.1,.14,.12);
        }
      }
      if(form==='arcade'){
        for(const side of [-1,1])block(light,side*4.9,7.99,-8.8,8.6,.23,.24).rotation.z=side*-.105;
      }else{
        mesh(arch,trim,0,4.65,-9.25,retro?8.8:10.15,4.18,3.8);
        mesh(arch,light,0,4.58,-9.0,retro?8.51:9.87,3.96,1.7);
        if(retro)mesh(arch,trim,0,4.4,-8.8,7.65,3.34,2.35);
      }
    }else if(form==='roof'){
      for(let side of [-1,1]){
        for(let i=0;i<5;i++){
          const x=side*(8+i*2.3),height=4.6+((i*7+1)%5)*1.35,z=-9.2-i*.5;
          block(i%2?dark:wall,x,height/2,z,1.9,height,2.1);
          for(let j=1;j<height;j+=.85)block(j%2<1?light:spark,x,j,z+1.06,1.36,.11,.028);
          block(light,x,height+.08,z,1.92,.09,2.12);
        }
        for(let i=0;i<4;i++)block(trim,side*(5.7+i*1.22),1.22,-3.1,.11,2.1,.12);
        block(dark,side*7.5,2.3,-3.1,5.3,.1,.16);
        block(light,side*7.5,2.38,-3.1,5.3,.04,.14);
      }
    }else if(form==='castle'){
      for(let side of [-1,1]){
        for(let i=0;i<3;i++){
          const x=side*(5+i*2.45),z=-4.6-i*2.1,h=5.8+i*.55;
          block(wall,x,h/2,z,.95,h,1.48);
          for(let y=.75;y<h;y+=.73)block(dark,x,y,z+.751,.98,.046,.045);
          block(trim,x,h,z,1.35,.25,1.78);
          block(wall,x,h+.42,z,1.24,.61,1.6);
          block(spark,x,3.5,z+.91,.16,.55,.12);
        }
        mesh(arch,trim,side*6.25,4.3,-4.8,1.4,2.08,1.2);
        mesh(arch,light,side*8.8,4.7,-6.8,1.4,2.0,.42);
        mesh(column,wall,side*11.8,3.15,-3.8,2.55,6.3,2.55);
      }
      mesh(arch,wall,0,5.0,-7.6,4.9,3.7,4);
      mesh(arch,light,0,5.05,-7.36,4.7,3.48,1.0);
    }else if(form==='polder'){
      for(const side of [-1,1]){
        const x=side*7.75,z=-5.4;
        block(wall,x,1.7,z,3.28,3.35,2.4);
        const roof=block(dark,x,3.46,z,2.78,2.78,2.64);
        roof.rotation.z=Math.PI/4;
        block(light,x-.78,2,z+1.22,.52,.72,.05);
        block(spark,x+.78,2,z+1.22,.52,.72,.05);
        for(let i=0;i<5;i++)block(trim,side*(4+i*.95),.65,-2.8,.13,1.3,.13);
        block(trim,side*5.85,1.18,-2.8,4.75,.10,.12);
      }
      const x=10.8,z=-10;
      mesh(column,wall,x,2.55,z,2.65,5.1,2.65);
      mesh(column,dark,x,5.1,z,2.12,.95,2.12);
      const rotor=new T.Group();rotor.position.set(x,4.9,z+1.56);group.add(rotor);
      for(let i=0;i<4;i++){
        const blade=new T.Group();blade.rotation.z=i*Math.PI/2;rotor.add(blade);
        block(trim,0,1.46,0,.10,2.92,.13,blade);
        block(spark,.22,2.01,0,.43,1.66,.055,blade);
      }
      moving.push(t=>{rotor.rotation.z=t*.43;});
    }else{
      for(const side of [-1,1]){
        for(let i=0;i<5;i++){
          const x=side*(4.8+i*1.25),z=-4.6-i*.65,h=form==='wood'?4.8+i*.32:5.6+i*.43;
          if(form==='wood'){
            block(wall,x,h/2,z,1.12,h,.48);
            for(let j=0;j<4;j++)block(trim,x-.4+j*.27,h/2,z+.25,.046,h,.035);
            block(i%2?light:spark,x,h-.4,z+.258,.4,.37,.045);
          }else if(form==='neon'){
            block(dark,x,h/2,z,.95,h,.61);
            block(light,x-.42,h/2,z+.33,.06,h,.04);
            block(spark,x,h*.72,z+.33,.72,.5,.06);
            block(spark,x,h*.39,z+.33,.72,.5,.06);
          }else if(form==='video'){
            const slab=block(i%2?wall:trim,x,h/2,z,.74,h,.65);
            slab.rotation.z=side*.14;
            block(i%2?light:spark,x,h-.35,z+.41,.84,.12,.04);
          }else{
            block(wall,x,h/2,z,1.13,h,.25);
            block(light,x-.49,h/2,z+.14,.052,h,.03);
            block(spark,x,h*.35,z+.14,.86,.036,.03);
            block(spark,x,h*.70,z+.14,.86,.036,.03);
          }
        }
      }
      block(wall,0,7.6,-5.0,9.1,.54,.56);
      block(light,0,7.25,-4.65,8.7,.07,.06);
    }
    group.name='set:'+theme;
    studio.scene.add(group);
    return {theme,moving,remove(){
      studio.scene.remove(group);
      shapes.forEach(shape=>shape.dispose());
      materials.forEach(material=>material.dispose());
    }};
  }

  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  function installCamera(studio){
    const Vector=window.GStudio.geometry.Vector3;
    const original=studio.shotTarget;
    studio.shotTarget=function(shot){
      const set=studio.spatialSet;
      const t=studio.time;
      if(!motion.matches)set?.moving.forEach(animate=>animate(t));
      if(motion.matches||!set)return original.call(this,shot);
      const cue=studio.spatialCue,dt=cue?t-cue.at:100;
      if(cue&&dt<cue.duration&&studio.shot===cue.name){
        const p=Math.min(1,dt/cue.duration);
        const smooth=p*p*(3-2*p);
        const side=cue.side;
        if(cue.name==='entry')return [new Vector(side*(8-7*smooth),7.8-3.2*smooth,15.5+.5*smooth),new Vector(0,1.45,0)];
        if(cue.name==='tension')return [new Vector(side*(5-3*smooth),4.7-.7*smooth,14.9-2.4*smooth),new Vector(1.0,1.85,1)];
      }
      if(shot==='wide')return [new Vector(Math.sin(t*.21)*2.0,5.5,17.3),new Vector(0,1.65,0)];
      return original.call(this,shot);
    };
    const dispose=studio.dispose;
    studio.dispose=function(){studio.spatialSet?.remove();studio.spatialSet=null;dispose.call(this);};
  }
  function decorate(studio,theme){
    if(!window.GStudio?.geometry)return;
    if(!studio.spatialCamera){installCamera(studio);studio.spatialCamera=true;}
    if(studio.spatialSet?.theme===theme)return;
    studio.spatialSet?.remove();
    studio.setTheme?.(theme);
    studio.spatialSet=build(studio,theme);
    // Het bestaande ronde podium blijft de speelvloer. De lichtlijnen liggen erboven.
    if(studio.spatialSet)studio.rings.forEach(ring=>{ring.visible=false;});
  }
  function cue(studio,phase,previous){
    studio.spatialPhase=phase;
    if(motion.matches||!studio.spatialSet||phase===previous)return;
    if(phase==='round'&&studio.crane)return;   // 0.20: de ronde begint met de kraanvlucht van de studio
    const name=['lobby','round'].includes(phase)?'entry':['duel','stake','challenge'].includes(phase)?'tension':null;
    if(!name)return;
    const duration=name==='entry'?2.55:1.6;
    const side=studio.spatialCue?.side===1?-1:1;
    studio.spatialCue={name,duration,side,at:studio.time};
    studio.focus(name,duration);
  }
  window.GSStudioSets={decorate,cue};
})();
