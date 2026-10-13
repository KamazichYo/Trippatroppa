// Пожары и стихийные бедствия.
import { DEFS } from '../data/buildings.js';
import { DIRS, T_WATER, T_GRASS } from './world.js';

export function igniteBuilding(g, b, reason = 'Пожар') {
  if (!b || b.fire > 0 || b.built < 1) return;
  b.fire = 1; b.fireHours = 0; b.fireFighters = 0;
  const def = DEFS[b.def];
  g.news.push({ t: g.time, text: `${reason}: горит «${def.name}»!`, type: 'bad', x: b.x, y: b.y });
  if (!g.citizens.dispatchFire(b)) b.noFireDept = true;
  g.fx?.alarm?.();
}

export function fireStep(g) {
  const w = g.world;
  // случайные возгорания
  if (!g.god.noDisasters) for (const b of w.buildings.values()) {
    if (b.fire || b.built < 1) continue;
    const def = DEFS[b.def];
    const i = w.idx(b.x, b.y);
    const cov = w.cov.fire?.[i] || 0;
    let p = 0.00004 * (def.zone === 'I' ? 3 : 1) * (b.abandoned ? 4 : 1) * (1 - cov * 0.9);
    if (Math.random() < p) igniteBuilding(g, b, 'Возгорание');
  }
  for (const b of [...w.buildings.values()]) {
    if (!b.fire) continue;
    b.fireHours++;
    const i = w.idx(b.x, b.y);
    const cov = w.cov.fire?.[i] || 0;
    // тушение
    const fight = (b.fireFighters || 0) * 0.35 + cov * 0.08;
    if (Math.random() < fight) { b.fire = 0; b.fireFighters = 0; g.news.push({ t: g.time, text: `Пожар в «${DEFS[b.def].name}» потушен.`, type: 'good' }); continue; }
    // распространение
    if (Math.random() < 0.12 * (1 - cov * 0.7)) {
      const [dx, dy] = DIRS[(Math.random() * 4) | 0];
      const X = b.x + (dx > 0 ? b.s : dx < 0 ? -1 : (Math.random() * b.s) | 0), Y = b.y + (dy > 0 ? b.s : dy < 0 ? -1 : (Math.random() * b.s) | 0);
      const nb = w.buildingAt(X, Y);
      if (nb && nb !== b) igniteBuilding(g, nb, 'Огонь перекинулся');
      else if (w.inb(X, Y) && w.tree[w.idx(X, Y)]) { w.tree[w.idx(X, Y)] = 0; w.changed.add(w.idx(X, Y)); }
    }
    if (b.fireHours > 10 + b.s * 4) {
      g.news.push({ t: g.time, text: `«${DEFS[b.def].name}» сгорел(а) дотла.`, type: 'bad', x: b.x, y: b.y });
      w.removeBuilding(b.id, false, true);
    }
  }
}

// ---------- торнадо ----------
export function startTornado(g, x, y) {
  const w = g.world;
  if (x == null) { x = Math.random() * w.W; y = Math.random() * w.H; }
  const a = Math.random() * Math.PI * 2;
  g.tornado = { x, y, vx: Math.cos(a) * 0.04, vy: Math.sin(a) * 0.04, life: 60 * 6 };
  g.news.push({ t: g.time, text: 'Внимание! Над городом смерч!', type: 'bad', big: true, x: Math.floor(x), y: Math.floor(y) });
}
export function tornadoStep(g, dtMin) {
  const t = g.tornado; if (!t) return;
  const w = g.world;
  t.vx += (Math.random() - 0.5) * 0.004; t.vy += (Math.random() - 0.5) * 0.004;
  t.x += t.vx * dtMin; t.y += t.vy * dtMin; t.life -= dtMin;
  const X = Math.floor(t.x), Y = Math.floor(t.y);
  if (t.life <= 0 || !w.inb(X, Y)) { g.tornado = null; return; }
  const i = w.idx(X, Y);
  const b = w.buildingAt(X, Y);
  if (b && Math.random() < 0.5) { w.removeBuilding(b.id, false, true); }
  if (w.tree[i]) { w.tree[i] = 0; w.changed.add(i); }
  if (w.power[i] && Math.random() < 0.5) { w.power[i] = 0; w.netDirty = true; w.changed.add(i); }
}

// ---------- землетрясение ----------
export function earthquake(g) {
  const w = g.world;
  g.shake = 3;
  let n = 0;
  for (const b of [...w.buildings.values()]) {
    if (Math.random() < 0.05) { w.removeBuilding(b.id, false, true); n++; }
    else if (Math.random() < 0.04) igniteBuilding(g, b, 'Землетрясение');
  }
  for (let i = 0; i < w.road.length; i++) if (w.road[i] && Math.random() < 0.02) { w.road[i] = 0; w.rubble[i] = 1; w.version++; w.roadsDirty = true; w.changed.add(i); }
  g.news.push({ t: g.time, text: `Землетрясение! Разрушено зданий: ${n}.`, type: 'bad', big: true });
}

// ---------- метеорит ----------
export function meteor(g, x, y) {
  const w = g.world;
  if (x == null) { x = Math.floor(Math.random() * w.W); y = Math.floor(Math.random() * w.H); }
  g.meteorFx = { x, y, t: 0 };
  setTimeout(() => {
    const r = 2.5;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const X = x + dx, Y = y + dy;
      if (!w.inb(X, Y)) continue;
      const d = Math.hypot(dx, dy);
      const i = w.idx(X, Y);
      if (d <= r) {
        const b = w.buildingAt(X, Y);
        if (b) w.removeBuilding(b.id, false, true);
        w.road[i] = 0; w.tree[i] = 0; w.power[i] = 0; w.zone[i] = 0;
        if (d < 1.5) { w.terrain[i] = T_WATER; w.rubble[i] = 0; } else w.rubble[i] = 1;
        w.changed.add(i);
      } else if (d <= 3.5) { const b = w.buildingAt(X, Y); if (b) igniteBuilding(g, b, 'Метеорит'); }
    }
    w.version++; w.roadsDirty = true; w.netDirty = true;
    g.shake = 2.5;
    g.news.push({ t: g.time, text: 'На город упал метеорит! Образовался кратер-озеро.', type: 'bad', big: true, x, y });
  }, 1200);
}
