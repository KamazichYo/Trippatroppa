'use strict';
// ───────────── ввод: клавиатура, мышь, сенсорные стики ─────────────
const INPUT = {
  keys: new Set(), mx: 0, my: 0, sx: 0, sy: 0, aimAng: -Math.PI / 2, fire: false, mouseDown: false,
  dashPressed: false, usePressed: false, throwPressed: false, swapPressed: false, pausePressed: false, slot1: false, slot2: false,
  touch: false, sticks: {}, _p: new Set(),
  press(k) { this._p.add(k); },
  endFrame() { this.dashPressed = this.usePressed = this.throwPressed = this.swapPressed = this.pausePressed = this.slot1 = this.slot2 = false; this._p.clear(); },
  update() {
    const k = this.keys;
    let mx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let my = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
    const L = this.sticks.L, R = this.sticks.R;
    if (L) { const dx = L.x - L.ox, dy = L.y - L.oy, d = Math.hypot(dx, dy); if (d > 8) { const m = Math.min(1, d / 60); mx = (dx / d) * m; my = (dy / d) * m; } }
    const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    this.mx = mx; this.my = my;
    if (R) { const dx = R.x - R.ox, dy = R.y - R.oy, d = Math.hypot(dx, dy); if (d > 12) { this.aimAng = Math.atan2(dy, dx); this.fire = d > 26; } else this.fire = false; }
    else if (this.touch) { this.fire = false; if (mx || my) this.aimAng = Math.atan2(my, mx); }
    if (this.touch && G.P && G.state === 'play') {
      const p = G.P; let best = null, bs = 1e9;
      for (const e of G.enemies) {
        if (e.dead || e.hidden || e.disg || (e.def.beh === 'mimic' && e.st === 'hide')) continue;
        const d = dist(p.x, p.y, e.x, e.y); if (d > 650) continue;
        const da = Math.abs(wrapA(angTo(p.x, p.y, e.x, e.y) - this.aimAng));
        const sc = R ? (da < 0.5 ? d * (1 + da * 3) : 1e9) : d; if (sc < bs) { bs = sc; best = e; }
      }
      if (best) {
        const a = angTo(p.x, p.y, best.x, best.y + (best.hy || 0));
        if (R) this.aimAng = a;
        else { const w = WEAP[curW(p).id], range = w.kind === 'melee' ? w.range + best.r + 40 : 460; if (dist(p.x, p.y, best.x, best.y) < range) { this.aimAng = a; this.fire = w.kind === 'bow' ? G.t % 0.95 < 0.75 : true; } }
      }
    }
    else if (G.P && G.cam) { const w = screenToWorld(this.sx, this.sy); this.aimAng = Math.atan2(w.y - G.P.y, w.x - G.P.x); this.aimDist = dist(G.P.x, G.P.y, w.x, w.y); this.fire = this.mouseDown || k.has('KeyJ'); }
  },
};
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  INPUT.keys.add(e.code);
  if (e.code === 'Space' || e.code === 'ShiftLeft') INPUT.dashPressed = true;
  if (e.code === 'KeyE' || e.code === 'KeyF') INPUT.usePressed = true;
  if (e.code === 'KeyQ' || e.code === 'Tab') { INPUT.swapPressed = true; e.preventDefault(); }
  if (e.code === 'KeyG' || e.code === 'KeyR') INPUT.throwPressed = true;
  if (e.code === 'Digit1') INPUT.slot1 = true; if (e.code === 'Digit2') INPUT.slot2 = true;
  if (e.code === 'Escape' || e.code === 'KeyP') INPUT.pausePressed = true;
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', (e) => INPUT.keys.delete(e.code));
addEventListener('blur', () => { INPUT.keys.clear(); INPUT.mouseDown = false; });
function bindCanvasInput(cv) {
  cv.addEventListener('mousemove', (e) => { INPUT.sx = e.clientX; INPUT.sy = e.clientY; INPUT.touch = false; });
  cv.addEventListener('mousedown', (e) => { AU.init(); INPUT.sx = e.clientX; INPUT.sy = e.clientY; if (e.button === 0) INPUT.mouseDown = true; if (e.button === 2) INPUT.throwPressed = true; if (e.button === 1) { INPUT.swapPressed = true; e.preventDefault(); } });
  addEventListener('mouseup', (e) => { if (e.button === 0) INPUT.mouseDown = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > 10) INPUT.swapPressed = true; }, { passive: true });
  // сенсор: левая половина — движение, правая — прицел и огонь
  const tstart = (e) => {
    AU.init(); INPUT.touch = true; document.body.classList.add('touch');
    for (const t of e.changedTouches) {
      const side = t.clientX < innerWidth / 2 ? 'L' : 'R';
      if (!INPUT.sticks[side]) INPUT.sticks[side] = { id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, y: t.clientY };
    }
    e.preventDefault();
  };
  const tmove = (e) => { for (const t of e.changedTouches) for (const s of ['L', 'R']) { const st = INPUT.sticks[s]; if (st && st.id === t.identifier) { st.x = t.clientX; st.y = t.clientY; } } e.preventDefault(); };
  const tend = (e) => { for (const t of e.changedTouches) for (const s of ['L', 'R']) { const st = INPUT.sticks[s]; if (st && st.id === t.identifier) { if (s === 'R' && G.P && WEAP[curW(G.P).id].kind === 'bow') INPUT.fire = false; delete INPUT.sticks[s]; } } };
  cv.addEventListener('touchstart', tstart, { passive: false });
  cv.addEventListener('touchmove', tmove, { passive: false });
  cv.addEventListener('touchend', tend); cv.addEventListener('touchcancel', tend);
}
