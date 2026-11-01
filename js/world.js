'use strict';
// ───────────── мир: карты, живописный фон по кускам, столкновения, поле путей ─────────────
const CH = 512;          // размер куска фона в мировых единицах
const CELL = 32;         // клетка навигации
const MST = {
  ground: { step: 15, len: 36, w: 13, dir: 'flow', alpha: 0.7, lj: 8, hj: 6, rough: 3, aj: 0.4 },
  grass: { step: 10, len: 15, w: 7, dir: 'flow', alpha: 0.85, lj: 16, hj: 16, rough: 3, aj: 1.3 },
  asphalt: { step: 12, len: 38, w: 11, alpha: 0.75, lj: 7, hj: 4, aj: 0.22, rough: 2 },
  paving: { step: 9, len: 14, w: 8, alpha: 0.8, lj: 10, hj: 5, aj: 0.3, rough: 1 },
  roof: { step: 11, len: 26, w: 11, shade: 12, bevel: 26, rim: 8, alpha: 0.92, lj: 8, hj: 5, aj: 0.25, rough: 1 },
  prop: { step: 4, len: 10, w: 5, dir: 'contour', shade: 16, bevel: 8, rim: 10, alpha: 0.92, lj: 9, hj: 5, aj: 0.5, hl: 0.05 },
  propBig: { step: 6, len: 16, w: 7.5, dir: 'contour', shade: 18, bevel: 14, rim: 10, alpha: 0.92, lj: 10, hj: 6, aj: 0.5, hl: 0.05 },
  shadow: { step: 10, len: 22, w: 11, alpha: 0.2, lj: 3, hj: 2, dir: 'flow', rough: 2, aj: 0.6 },
  foliage: { step: 6, len: 13, w: 7.5, dir: 'contour', shade: 24, bevel: 34, alpha: 0.9, lj: 16, hj: 16, aj: 1.1, hl: 0.08 },
  line: { step: 5, len: 12, w: 4.5, alpha: 0.9, lj: 6, hj: 3, aj: 0.15, rough: 0.5 },
  water: { step: 8, len: 22, w: 7, dir: 0, alpha: 0.8, lj: 14, hj: 10, aj: 0.3, hl: 0.12 },
};

function newMap(name, w, h, base, theme) {
  return { name, w, h, base, theme, items: [], solids: [], idc: 1, scale: 0.72, chunks: [], cols: Math.ceil(w / CH), rows: Math.ceil(h / CH),
    zones: [], gates: [], pickups: [], anim: [], path: null, spawn: { x: w / 2, y: h / 2 }, signs: [] };
}
function paint(m, sdf, bb, col, st) { m.items.push({ id: m.idc++, sdf, bb, col, st }); }
function solidR(m, x, y, w, h) { m.solids.push({ t: 'r', x, y, w, h }); }
function solidC(m, x, y, r) { m.solids.push({ t: 'c', x, y, r }); }
// направление мазков вдоль ближайшего отрезка ломаной
function lineDir(pts) {
  return (x, y) => {
    let best = 1e9, ang = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
      const bax = bx - ax, bay = by - ay; const h = clamp(((x - ax) * bax + (y - ay) * bay) / (bax * bax + bay * bay || 1), 0, 1);
      const d = Math.hypot(x - ax - bax * h, y - ay - bay * h); if (d < best) { best = d; ang = Math.atan2(bay, bax); }
    }
    return ang;
  };
}
const varCol = (base, amp = 6, f = 0.004, seed = 1) => (x, y) => [base[0] + noise2(x * f, y * f, seed) * amp, base[1], base[2] + noise2(x * f * 1.7, y * f * 1.7, seed + 1) * amp];

// ── реквизит ──
function propShadow(m, sdf, bb, dx = 12, dy = 16) {
  const s = (x, y) => sdf(x - dx, y - dy);
  paint(m, s, [bb[0] + dx, bb[1] + dy, bb[2] + dx, bb[3] + dy], [240, 30, 10], MST.shadow);
}
function building(m, x, y, w, h, roof = [8, 35, 62], solid = true) {
  const sdf = sdBox(x + w / 2, y + h / 2, w / 2, h / 2, 4);
  propShadow(m, sdf, [x, y, x + w, y + h], 18, 24);
  paint(m, sdf, [x - 4, y - 4, x + w + 4, y + h + 4], varCol(roof, 5, 0.01), { ...MST.roof, dir: w > h ? 0 : Math.PI / 2 });
  // парапет и вентиляция
  paint(m, sdSub(sdBox(x + w / 2, y + h / 2, w / 2, h / 2, 4), sdBox(x + w / 2, y + h / 2, w / 2 - 9, h / 2 - 9, 3)), [x - 2, y - 2, x + w + 2, y + h + 2], [roof[0], roof[1] - 10, roof[2] - 14], { ...MST.prop, step: 5, len: 14 });
  const rng = mulberry32(x * 7 + y * 13);
  const nv = Math.floor((w * h) / 60000) + 1;
  for (let i = 0; i < nv; i++) {
    const vx = x + 30 + rng() * (w - 60), vy = y + 30 + rng() * (h - 60), vr = 9 + rng() * 9;
    if (w < 70 || h < 70) break;
    const s = rng() < 0.5 ? sdBox(vx, vy, vr, vr * 0.7, 2) : sdCircle(vx, vy, vr * 0.7);
    propShadow(m, s, bbB(vx, vy, vr, vr), 5, 7);
    paint(m, s, bbB(vx, vy, vr, vr), [roof[0], 8, 60 + rng() * 15], MST.prop);
  }
  if (solid) solidR(m, x, y, w, h);
}
function tree(m, x, y, r, hue = 105) {
  const rng = mulberry32(x * 3 + y * 5);
  const sdf = sdWobble(sdCircle(x, y, r), r * 0.12, 0.05, x);
  propShadow(m, sdf, bbC(x, y, r * 1.2), r * 0.35, r * 0.5);
  paint(m, sdf, bbC(x, y, r * 1.2), (px, py, rr) => [hue + (rr() - 0.5) * 30, 40 + rr() * 15, 28 + rr() * 12], MST.foliage);
  for (let i = 0; i < 3; i++) { const a = rng() * TAU, d = rng() * r * 0.4, cr = r * (0.35 + rng() * 0.2); paint(m, sdWobble(sdCircle(x + Math.cos(a) * d - r * 0.15, y + Math.sin(a) * d - r * 0.2, cr), 3, 0.08, i), bbC(x, y, r), (px, py, rr) => [hue - 10 + rr() * 30, 50, 42 + rr() * 14], { ...MST.foliage, step: 5, len: 10 }); }
  solidC(m, x, y, Math.max(10, r * 0.22));
  m.anim.push({ t: 'treeEye', x, y, r, ph: hash2(x | 0, y | 0, 8) * TAU });
}
function car(m, x, y, ang, col) {
  const L = 46, Wd = 21;
  const body = sdRot(sdBox(x, y, L, Wd, 9), x, y, ang);
  const bb = bbC(x, y, L + 4);
  propShadow(m, body, bb, 8, 11);
  paint(m, body, bb, col, MST.prop);
  const roof = sdRot(sdBox(x - 4, y, 20, 16, 6), x, y, ang);
  paint(m, roof, bb, [col[0], col[1] - 10, col[2] + 8], { ...MST.prop, step: 3.5 });
  const ws = sdRot(sdBox(x + 20, y, 5, 15, 3), x, y, ang), rs = sdRot(sdBox(x - 28, y, 4, 14, 3), x, y, ang);
  paint(m, ws, bb, [205, 30, 30], { ...MST.prop, hl: 0.3, step: 3 }); paint(m, rs, bb, [205, 30, 28], { ...MST.prop, step: 3 });
  const c = Math.cos(ang), s = Math.sin(ang), hw = L, hh = Wd; // грубый AABB для столкновений
  const ex = Math.abs(c) * hw + Math.abs(s) * hh, ey = Math.abs(s) * hw + Math.abs(c) * hh;
  solidR(m, x - ex + 4, y - ey + 4, ex * 2 - 8, ey * 2 - 8);
}
function bench(m, x, y, ang) {
  const s = sdRot(sdBox(x, y, 30, 8, 2), x, y, ang), bb = bbC(x, y, 34);
  propShadow(m, s, bb, 5, 7); paint(m, s, bb, [28, 45, 38], { ...MST.prop, dir: ang, step: 3 });
  paint(m, sdRot(sdBox(x, y - 10, 30, 2.5, 1), x, y, ang), bb, [28, 40, 30], { ...MST.prop, step: 3 });
  const c = Math.abs(Math.cos(ang)); solidR(m, x - (c > 0.5 ? 30 : 10), y - (c > 0.5 ? 10 : 30), c > 0.5 ? 60 : 20, c > 0.5 ? 20 : 60);
}
function kiosk(m, x, y, w, h, col) {
  const s = sdBox(x, y, w / 2, h / 2, 3), bb = bbB(x, y, w / 2 + 4, h / 2 + 4);
  propShadow(m, s, bb, 10, 14); paint(m, s, bb, col, MST.propBig);
  paint(m, sdBox(x, y + h / 2 - 6, w / 2 - 4, 5, 2), bb, [50, 70, 70], MST.prop);
  solidR(m, x - w / 2, y - h / 2, w, h);
}
function bin(m, x, y, col = [140, 30, 28]) { const s = sdBox(x, y, 22, 16, 3), bb = bbB(x, y, 24, 18); propShadow(m, s, bb, 6, 8); paint(m, s, bb, col, MST.prop); paint(m, sdBox(x, y, 18, 12, 2), bb, [col[0], col[1], col[2] - 10], MST.prop); solidR(m, x - 22, y - 16, 44, 32); }
function lamp(m, x, y) { const s = sdCircle(x, y, 6); propShadow(m, sdCapsule(x, y, x + 60, y + 80, 3), [x, y, x + 64, y + 84], 0, 0); paint(m, s, bbC(x, y, 7), [210, 10, 35], MST.prop); solidC(m, x, y, 7); }
function puddle(m, x, y, rx, ry) { paint(m, sdWobble(sdEllipse(x, y, rx, ry), 4, 0.04, x), bbE(x, y, rx + 6, ry + 6), [210, 20, 38], { ...MST.water, hl: 0.25 }); }
function zebra(m, x, y, w, h, vertical) {
  const n = Math.floor((vertical ? h : w) / 26);
  for (let i = 0; i < n; i++) {
    const s = vertical ? sdBox(x + w / 2, y + 13 + i * 26, w / 2, 7, 1) : sdBox(x + 13 + i * 26, y + h / 2, 7, h / 2, 1);
    paint(m, s, vertical ? bbB(x + w / 2, y + 13 + i * 26, w / 2, 8) : bbB(x + 13 + i * 26, y + h / 2, 8, h / 2), [50, 10, 86], { ...MST.line, dir: vertical ? 0 : Math.PI / 2 });
  }
}
function flowerBed(m, x, y, r) {
  paint(m, sdCircle(x, y, r), bbC(x, y, r), [25, 30, 25], { ...MST.paving, dir: 'flow' });
  const rng = mulberry32(x + y);
  for (let i = 0; i < r / 3; i++) { const a = rng() * TAU, d = rng() * r * 0.85; const fx = x + Math.cos(a) * d, fy = y + Math.sin(a) * d; paint(m, sdCircle(fx, fy, 4), bbC(fx, fy, 5), [pick([0, 45, 320, 280, 55]), 70, 58], { ...MST.prop, step: 3 }); }
}

// ── фон: запекание кусками ──
function paintItemInRect(ctx, it, x0, y0, x1, y1) {
  const st = it.st, s = st.step;
  const gx0 = Math.floor(Math.max(x0, it.bb[0]) / s), gx1 = Math.floor(Math.min(x1, it.bb[2]) / s);
  const gy0 = Math.floor(Math.max(y0, it.bb[1]) / s), gy1 = Math.floor(Math.min(y1, it.bb[3]) / s);
  if (gx1 < gx0 || gy1 < gy0) return;
  const keys = [], cells = [];
  for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) { keys.push(hash2(gx, gy, it.id)); cells.push(gx, gy); }
  const idx = keys.map((_, i) => i).sort((a, b) => keys[a] - keys[b]);
  for (const i of idx) {
    const rng = mulberry32(((keys[i] * 4294967296) >>> 0) ^ (it.id * 2654435761));
    const gx = cells[i * 2], gy = cells[i * 2 + 1];
    strokeAt(ctx, st, it.sdf, it.col, (gx + rng()) * s, (gy + rng()) * s, rng);
  }
}
function paintChunk(m, ci, cj) {
  const S = m.scale, c = makeCanvas(CH * S, CH * S), ctx = c.getContext('2d');
  ctx.scale(S, S); ctx.translate(-ci * CH, -cj * CH);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = hsl(m.base[0], m.base[1], m.base[2]); ctx.fillRect(ci * CH, cj * CH, CH, CH);
  const M = 56, x0 = ci * CH - M, y0 = cj * CH - M, x1 = (ci + 1) * CH + M, y1 = (cj + 1) * CH + M;
  for (const it of m.items) {
    if (it.bb[2] < x0 || it.bb[0] > x1 || it.bb[3] < y0 || it.bb[1] > y1) continue;
    paintItemInRect(ctx, it, x0, y0, x1, y1);
  }
  c.ctx = ctx;
  return c;
}
// Пошаговое запекание (для экрана загрузки)
function* bakeMapGen(m) {
  m.chunks = new Array(m.cols * m.rows);
  for (let j = 0; j < m.rows; j++) for (let i = 0; i < m.cols; i++) { m.chunks[j * m.cols + i] = paintChunk(m, i, j); yield (j * m.cols + i + 1) / (m.cols * m.rows); }
  buildNav(m);
}
function drawMap(ctx, m, vx0, vy0, vx1, vy1) {
  const i0 = Math.max(0, Math.floor(vx0 / CH)), i1 = Math.min(m.cols - 1, Math.floor(vx1 / CH));
  const j0 = Math.max(0, Math.floor(vy0 / CH)), j1 = Math.min(m.rows - 1, Math.floor(vy1 / CH));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const c = m.chunks[j * m.cols + i]; if (c) ctx.drawImage(c, i * CH, j * CH, CH + 0.6, CH + 0.6); }
}
// Декаль: брызги краски навсегда остаются на «холсте» карты
function decal(m, x, y, size, col) {
  if (!m.chunks.length) return;
  const rng = mulberry32((x * 13 + y * 7) | 0);
  const i0 = Math.floor((x - size * 2) / CH), i1 = Math.floor((x + size * 2) / CH), j0 = Math.floor((y - size * 2) / CH), j1 = Math.floor((y + size * 2) / CH);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (i < 0 || j < 0 || i >= m.cols || j >= m.rows) continue;
    const c = m.chunks[j * m.cols + i]; if (!c) continue;
    const r2 = mulberry32((x * 13 + y * 7) | 0); // одинаковая случайность для всех кусков
    paintSplat(c.ctx, x, y, size, col, r2);
  }
  void rng;
}

// ── навигация ──
function buildNav(m) {
  const gw = Math.ceil(m.w / CELL), gh = Math.ceil(m.h / CELL);
  m.gw = gw; m.gh = gh; m.block = new Uint8Array(gw * gh); m.flow = new Float32Array(gw * gh).fill(1e9);
  const pad = 12;
  for (const s of m.solids) {
    const x0 = s.t === 'r' ? s.x - pad : s.x - s.r - pad, y0 = s.t === 'r' ? s.y - pad : s.y - s.r - pad;
    const x1 = s.t === 'r' ? s.x + s.w + pad : s.x + s.r + pad, y1 = s.t === 'r' ? s.y + s.h + pad : s.y + s.r + pad;
    for (let gy = Math.max(0, Math.floor(y0 / CELL)); gy <= Math.min(gh - 1, Math.floor(y1 / CELL)); gy++)
      for (let gx = Math.max(0, Math.floor(x0 / CELL)); gx <= Math.min(gw - 1, Math.floor(x1 / CELL)); gx++) {
        const cx = (gx + 0.5) * CELL, cy = (gy + 0.5) * CELL;
        if (s.t === 'r') { if (cx > s.x - pad && cx < s.x + s.w + pad && cy > s.y - pad && cy < s.y + s.h + pad) m.block[gy * gw + gx] = 1; }
        else if (dist(cx, cy, s.x, s.y) < s.r + pad) m.block[gy * gw + gx] = 1;
      }
  }
  // корзины твёрдых тел для быстрых столкновений
  m.bucket = new Map();
  for (const s of m.solids) {
    const x0 = s.t === 'r' ? s.x : s.x - s.r, y0 = s.t === 'r' ? s.y : s.y - s.r, x1 = s.t === 'r' ? s.x + s.w : s.x + s.r, y1 = s.t === 'r' ? s.y + s.h : s.y + s.r;
    for (let by = Math.floor(y0 / 128); by <= Math.floor(y1 / 128); by++) for (let bx = Math.floor(x0 / 128); bx <= Math.floor(x1 / 128); bx++) {
      const k = by * 1000 + bx; if (!m.bucket.has(k)) m.bucket.set(k, []); m.bucket.get(k).push(s);
    }
  }
  m.queue = new Int32Array(gw * gh);
}
function isBlocked(m, x, y) {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
  if (m.block[Math.floor(y / CELL) * m.gw + Math.floor(x / CELL)]) return true;
  for (const g of m.gates) if (!g.open && x > g.x && x < g.x + g.w && y > g.y && y < g.y + g.h) return true;
  return false;
}
function updateFlow(m, tx, ty) {
  const gw = m.gw, gh = m.gh, f = m.flow, b = m.block, q = m.queue;
  f.fill(1e9);
  const sx = clamp(Math.floor(tx / CELL), 0, gw - 1), sy = clamp(Math.floor(ty / CELL), 0, gh - 1);
  let qh = 0, qt = 0; const s0 = sy * gw + sx; f[s0] = 0; q[qt++] = s0;
  const gateBlock = new Set();
  for (const g of m.gates) if (!g.open) for (let gy = Math.floor(g.y / CELL); gy <= Math.floor((g.y + g.h) / CELL); gy++) for (let gx = Math.floor(g.x / CELL); gx <= Math.floor((g.x + g.w) / CELL); gx++) gateBlock.add(gy * gw + gx);
  while (qh < qt) {
    const c = q[qh++], cx = c % gw, cy = (c / gw) | 0, d = f[c] + 1;
    if (d > 70) continue;
    for (let k = 0; k < 4; k++) {
      const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      const n = ny * gw + nx; if (b[n] || gateBlock.has(n) || f[n] <= d) continue;
      f[n] = d; q[qt++] = n;
    }
  }
}
// Направление вниз по полю расстояний
function flowAngle(m, x, y) {
  const gw = m.gw, cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  let best = m.flow[cy * gw + cx] ?? 1e9, bx = 0, by = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy;
    if (nx < 0 || ny < 0 || nx >= gw || ny >= m.gh) continue;
    if (dx && dy && (m.block[cy * gw + nx] || m.block[ny * gw + cx])) continue;
    const v = m.flow[ny * gw + nx] + (dx && dy ? 0.41 : 0);
    if (v < best) { best = v; bx = dx; by = dy; }
  }
  if (!bx && !by) return null;
  // целимся в центр соседней клетки — плавнее
  return Math.atan2((cy + by + 0.5) * CELL - y, (cx + bx + 0.5) * CELL - x);
}
function losClear(m, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / 14);
  for (let i = 1; i < n; i++) { const t = i / n; if (m.block[Math.floor((y0 + (y1 - y0) * t) / CELL) * m.gw + Math.floor((x0 + (x1 - x0) * t) / CELL)]) return false; }
  return true;
}
// Вытолкнуть круг из препятствий
function collideCircle(m, o, r) {
  let hit = false;
  const bx0 = Math.floor((o.x - r) / 128), bx1 = Math.floor((o.x + r) / 128), by0 = Math.floor((o.y - r) / 128), by1 = Math.floor((o.y + r) / 128);
  const seen = new Set();
  for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) {
    const arr = m.bucket.get(by * 1000 + bx); if (!arr) continue;
    for (const s of arr) { if (seen.has(s)) continue; seen.add(s); if (pushOut(o, r, s)) hit = true; }
  }
  for (const g of m.gates) if (!g.open && pushOut(o, r, { t: 'r', x: g.x, y: g.y, w: g.w, h: g.h })) hit = true;
  if (o.x < r) { o.x = r; hit = true; } if (o.y < r) { o.y = r; hit = true; }
  if (o.x > m.w - r) { o.x = m.w - r; hit = true; } if (o.y > m.h - r) { o.y = m.h - r; hit = true; }
  return hit;
}
function pushOut(o, r, s) {
  if (s.t === 'r') {
    const cx = clamp(o.x, s.x, s.x + s.w), cy = clamp(o.y, s.y, s.y + s.h);
    let dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
    if (d >= r) return false;
    if (d < 0.001) { // центр внутри — выталкиваем по ближайшей стороне
      const l = o.x - s.x, rr = s.x + s.w - o.x, t = o.y - s.y, b = s.y + s.h - o.y, mn = Math.min(l, rr, t, b);
      if (mn === l) o.x = s.x - r; else if (mn === rr) o.x = s.x + s.w + r; else if (mn === t) o.y = s.y - r; else o.y = s.y + s.h + r;
      return true;
    }
    o.x = cx + (dx / d) * r; o.y = cy + (dy / d) * r; return true;
  }
  const dx = o.x - s.x, dy = o.y - s.y, d = Math.hypot(dx, dy), rr = r + s.r;
  if (d >= rr || d < 0.001) return false;
  o.x = s.x + (dx / d) * rr; o.y = s.y + (dy / d) * rr; return true;
}
function pointSolid(m, x, y) {
  const arr = m.bucket.get(Math.floor(y / 128) * 1000 + Math.floor(x / 128));
  if (arr) for (const s of arr) { if (s.t === 'r' ? x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h : dist2(x, y, s.x, s.y) < s.r * s.r) return true; }
  for (const g of m.gates) if (!g.open && x > g.x && x < g.x + g.w && y > g.y && y < g.y + g.h) return true;
  return x < 0 || y < 0 || x > m.w || y > m.h;
}
// Случайная свободная точка в прямоугольнике
function freeSpot(m, x0, y0, x1, y1, tries = 30) {
  for (let i = 0; i < tries; i++) {
    const x = rand(x0, x1), y = rand(y0, y1);
    if (!isBlocked(m, x, y) && !isBlocked(m, x + 14, y) && !isBlocked(m, x - 14, y) && !isBlocked(m, x, y + 14) && !isBlocked(m, x, y - 14)) return { x, y };
  }
  return null;
}
// Путь-линия: равномерная выборка точек с шумом (живописный мазок)
function buildPath(pts) {
  const out = []; let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = dist(ax, ay, bx, by), n = Math.max(1, Math.ceil(L / 18));
    for (let k = 0; k < n; k++) { const t = k / n; out.push({ x: lerp(ax, bx, t), y: lerp(ay, by, t), s: total + L * t }); }
    total += L;
  }
  const last = pts[pts.length - 1]; out.push({ x: last[0], y: last[1], s: total });
  // сглаживание углов
  for (let it = 0; it < 4; it++) for (let i = 1; i < out.length - 1; i++) { out[i].x = (out[i - 1].x + out[i].x * 2 + out[i + 1].x) / 4; out[i].y = (out[i - 1].y + out[i].y * 2 + out[i + 1].y) / 4; }
  out.forEach((p, i) => { p.n1 = noise1(i * 0.21, 1) * 5; p.n2 = noise1(i * 0.17, 2) * 6; p.n3 = noise1(i * 0.23, 3) * 4; });
  return { pts: out, len: total };
}
