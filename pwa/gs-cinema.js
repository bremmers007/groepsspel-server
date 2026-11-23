/* Presentatie voor de automatische Buzzerquiz. De spelserver bepaalt de fase. */
(() => {
  'use strict';

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const palettes = {
    gala: {fog:0x1b1234,rim:[0xffdf91,0x56f6ff,0xbc6cba],accent:'#66eaff',shade:'#101f4a',energy:.47},
    arcade: {fog:0x111856,rim:[0xbefb3c,0xff832f,0x668aff],accent:'#d8ff63',shade:'#202879',energy:.52},
    theatre: {fog:0x291120,rim:[0x77e7ca,0xffc87d,0xd04956],accent:'#8df3dc',shade:'#123744',energy:.34},
    city: {fog: 0x10172c, rim: [0x68cfff, 0xffad75, 0x5aaeff], accent: '#91e6ff', shade: '#060c1a', energy: .38},
    citadel: {fog: 0x151027, rim: [0xb78bff, 0x80ffe5, 0xefcf86], accent: '#c5b5ff', shade: '#10091e', energy: .46},
    winner: {fog: 0x221324, rim: [0xffcb77, 0xfff1bd, 0xb987ff], accent: '#ffe2a1', shade: '#1d0f19', energy: .44},
    holland: {fog: 0x222133, rim: [0xffaa57,0xffecd3,0x83d7ff], accent:'#ffc27d', shade:'#24152b', energy:.37},
    analogue: {fog: 0x2b1e10, rim: [0xffa248,0xd2d79b,0xffe2a4], accent:'#ffc683', shade:'#221707', energy:.24},
    neon: {fog: 0x100e2b, rim: [0xec65ff,0x74e5ff,0xa08bff], accent:'#f1acff', shade:'#170b2a', energy:.48},
    video: {fog: 0x071d34, rim: [0x53eddd,0xf8ff80,0x6687ff], accent:'#9effe2', shade:'#081e30', energy:.37},
    digital: {fog: 0x0e1630, rim: [0xebf5ff,0x90adff,0xc597ff], accent:'#c9d6ff', shade:'#10182e', energy:.36}
  };
  const assets = new Map();
  const eras = ['analogue','neon','video','digital'];

  function artwork(theme) {
    const era = eras.indexOf(theme);
    if (era >= 0) return ['tijdstudios', 2, 2, era];
    if (theme === 'holland') return ['themawerelden', 2, 1, 1];
    return ['nachtwerelden', 2, 1, theme === 'city' ? 0 : 1];
  }

  function loadAssets(theme) {
    const [name] = artwork(theme);
    if (!assets.has(name)) {
      const image = new Image();
      image.src = '/app/assets/cinema/' + name + '.webp';
      assets.set(name,image);
    }
    return assets.get(name);
  }

  function themeFor(state) {
    if (Object.hasOwn(palettes,state.auto.look)) return state.auto.look;
    if (state.auto.theme === 'holland') return 'holland';
    if (state.auto.theme === 'year') {
      return 'theatre';
    }
    return 'gala';
  }

  function paintWall(studio) {
    const canvas = studio.wallCanvas;
    const ctx = canvas.getContext('2d');
    const {width, height} = canvas;
    const {title, sub} = studio.wallText;
    const theme = studio.cinemaTheme;
    const colors = palettes[theme];
    const img = loadAssets(theme);

    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.shade;
    ctx.fillRect(0, 0, width, height);
    if (img.naturalWidth && !studio.spatialSet) {
      const [,columns,rows,index] = artwork(theme);
      const panelWidth = img.naturalWidth / columns;
      const panelHeight = img.naturalHeight / rows;
      const cropHeight = Math.min(panelHeight, panelWidth * height / width);
      const x = (index % columns) * panelWidth;
      const y = Math.floor(index / columns) * panelHeight + (panelHeight - cropHeight) * .49;
      ctx.drawImage(img,x,y,panelWidth,cropHeight,0,0,width,height);
    }
    const shade = ctx.createLinearGradient(0,0,0,height);
    shade.addColorStop(0,'#02050d55');
    shade.addColorStop(.56,'#05091c29');
    shade.addColorStop(1,'#04060cf5');
    ctx.fillStyle = shade;
    ctx.fillRect(0,0,width,height);
    const vignette = ctx.createRadialGradient(width/2,height*.52,width*.08,width/2,height*.52,width*.49);
    vignette.addColorStop(0,'#01030b91');
    vignette.addColorStop(1,'#01030b00');
    ctx.fillStyle = vignette;
    ctx.fillRect(0,0,width,height);

    const translate = text => window.GSI18N?.t?.(text) || text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f3f7ff';
    ctx.font = '800 146px system-ui, sans-serif';
    ctx.shadowColor = '#01020a';
    ctx.shadowBlur = 38;
    ctx.fillText(translate(title).toUpperCase(),width/2,height*.50,width*.79);
    ctx.fillStyle = colors.accent;
    ctx.font = '600 63px system-ui, sans-serif';
    if (sub) ctx.fillText(translate(sub),width/2,height*.70,width*.75);
    ctx.shadowBlur = 0;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(width*.45,height*.82,width*.10,4);
    studio.wallTex.needsUpdate = true;
  }

  function configureStudio(studio,theme) {
    const originalWall = studio.drawWall;
    if (!studio.cinemaTheme) {
      studio.drawWall = function () {
        if (!this.cinemaTheme) return originalWall.call(this);
        const img = loadAssets(this.cinemaTheme);
        const key = JSON.stringify([this.cinemaTheme,this.wallText,img.naturalWidth,!!this.spatialSet]);
        if (key !== this.cinemaWallKey) {
          paintWall(this);
          this.cinemaWallKey = key;
        }
      };
    }
    studio.cinemaTheme = theme;
    studio.wallDirty = true;
    const colors = palettes[theme];
    studio.scene.background.setHex(colors.fog);
    studio.scene.fog.color.setHex(colors.fog);
    studio.bloom.strength = colors.energy;
    studio.spots.forEach(({beam},i)=>{
      const color = colors.rim[i % colors.rim.length];
      beam.material.color.setHex(color);
    });
  }

  function sync(next, previous, studio) {
    if (!next?.auto) {
      delete document.body.dataset.arena;
      delete document.body.dataset.arenaPhase;
      return;
    }
    const theme = themeFor(next);
    document.body.dataset.arena = theme;
    document.body.dataset.arenaPhase = next.phase;
    loadAssets(theme);
    if (!studio) return;
    window.GSStudioSets?.decorate(studio,theme);
    if (studio.cinemaTheme !== theme) configureStudio(studio,theme);
    if (next.phase === 'lobby' && next.auto.theme === 'year') studio.wall(String(next.auto.year),'Terug in de tijd');
    if (next.phase === 'lobby' && next.auto.theme === 'holland') studio.wall('Oerhollands','Sluit aan en speel mee');
    window.GSStudioSets?.cue(studio,next.phase,previous?.phase);
    if (motion.matches || next.phase === previous?.phase || studio.spatialSet) return;
    if (next.phase === 'lobby' || next.phase === 'round') studio.focus('high',1.4);
    if (next.phase === 'stake') studio.focus('host',2.2);
    if (next.phase === 'countdown' && next.auto.finale) studio.focus('lineup',1.4);
  }

  window.GSCinema = {sync};
})();
