'use strict';
/* Groepsspel 0.15.4 · TV-scherm: toont vanzelf het spel waarin de spelleider het laatst iets deed
   (Buzzerquiz, telefoonspellen, Het Verraad, spelshows of de tabletshows uit de app). */
const frame = document.getElementById('screen'), idle = document.getElementById('idle'), hint = document.getElementById('hint');
let current = '', failures = 0;
function withTv(path) {
  if (!path) return '';
  if (path.includes('tv=1')) return path;
  const [base, hash] = path.split('#');
  return base + (base.includes('?') ? '&' : '?') + 'tv=1' + (hash ? '#' + hash : '');
}
async function follow() {
  try {
    const r = await fetch('/api/tv', {cache: 'no-store'}); const v = await r.json(); failures = 0;
    const next = withTv(v.path);
    if (next && next !== current) {
      current = next; frame.src = next; frame.style.display = 'block'; idle.style.display = 'none';
    }
    document.getElementById('idleState').textContent = '● Verbonden met de spelserver';
  } catch {
    failures++;
    document.getElementById('idleState').textContent = '○ Spelserver niet bereikbaar. Draait Groepsspel nog op deze pc?';
    if (failures > 5 && current) { frame.style.display = 'none'; idle.style.display = 'grid'; current = ''; }
  }
}
setInterval(follow, 1500); follow();
setTimeout(() => hint.classList.add('gone'), 8000);
document.addEventListener('keydown', e => {
  if (e.key === 'f' || e.key === 'F') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); }
});
