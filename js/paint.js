'use strict';
// ───────────── «масляная» живопись: мазки, SDF-формы, запекание спрайтов ─────────────

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

// Один мазок кистью: несколько «щетинок» вдоль квадратичной кривой, каждая своего оттенка
function brush(ctx, x0, y0, cx, cy, x1, y1, w, h, s, l, alpha, lj, hj, rng) {
  const n = w < 2.6 ? 1 : Math.min(5, Math.max(2, Math.round(w / 2.6)));
  const dx = x1 - x0, dy = y1 - y0, m = Math.hypot(dx, dy) || 1;
  const px = -dy / m, py = dx / m;
  const lw = n === 1 ? w : (w / n) * 1.75;
  for (let i = 0; i < n; i++) {
    const o = n === 1 ? 0 : (i / (n - 1) - 0.5) * w * 0.72;
    const ll = clamp(l + (rng() - 0.5) * lj, 0, 100);
    const hh = h + (rng() - 0.5) * hj;
    ctx.strokeStyle = 'hsla(' + hh.toFixed(1) + ',' + s + '%,' + ll.toFixed(1) + '%,' + (alpha * (0.62 + 0.38 * rng())).toFixed(2) + ')';
    ctx.lineWidth = lw * (0.7 + 0.6 * rng());
    const t0 = rng() * 0.18, t1 = 1 - rng() * 0.18;
    const ax = qb(x0, cx, x1, t0) + px * o, ay = qb(y0, cy, y1, t0) + py * o;
    const bx = qb(x0, cx, x1, t1) + px * o, by = qb(y0, cy, y1, t1) + py * o;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx + px * o, cy + py * o, bx, by); ctx.stroke();
  }
}
function qb(a, c, b, t) { const u = 1 - t; return u * u * a + 2 * u * t * c + t * t * b; }

// Мазок в точке (x,y) формы sdf. st — стиль, col — [h,s,l] или функция
const LX = -0.6, LY = -0.8; // свет сверху-слева
function strokeAt(ctx, st, sdf, col, x, y, rng) {
  const d = sdf(x, y);
  if (d > (st.rough === undefined ? 0.6 : st.rough)) return;
  let nx = 0, ny = 0, shadeL = 0, ang;
  const dir = st.dir;
  if (st.shade || dir === 'contour' || dir === 'radial') {
    nx = sdf(x + 1, y) - sdf(x - 1, y); ny = sdf(x, y + 1) - sdf(x, y - 1);
    const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m;
  }
  if (st.shade) {
    const edge = 1 - clamp(-d / (st.bevel || 8), 0, 1);
    shadeL = (nx * LX + ny * LY) * st.shade * (0.3 + 0.7 * edge);
    if (st.rim && d > -2.2) shadeL -= st.rim * clamp((nx * -LX + ny * -LY), 0, 1);
  }
  if (dir === 'contour') ang = Math.atan2(ny, nx) + Math.PI / 2;
  else if (dir === 'radial') ang = Math.atan2(ny, nx);
  else if (dir === 'flow') ang = noise2(x * 0.0045, y * 0.0045, 7) * Math.PI * 1.4;
  else if (typeof dir === 'function') ang = dir(x, y);
  else ang = dir || 0;
  ang += (rng() - 0.5) * (st.aj === undefined ? 0.5 : st.aj);
  const c = typeof col === 'function' ? col(x, y, rng, d) : col;
  const len = st.len * (0.6 + 0.8 * rng()), w = st.w * (0.7 + 0.6 * rng());
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const hx = (ca * len) / 2, hy = (sa * len) / 2;
  const bend = (rng() - 0.5) * len * 0.35;
  const a = (st.alpha === undefined ? 0.88 : st.alpha) * (c[3] === undefined ? 1 : c[3]);
  brush(ctx, x - hx, y - hy, x - sa * bend, y + ca * bend, x + hx, y + hy, w, c[0], c[1], c[2] + shadeL, a,
    st.lj === undefined ? 10 : st.lj, st.hj === undefined ? 6 : st.hj, rng);
  if (st.hl && rng() < st.hl) { // блик импасто
    brush(ctx, x - hx * 0.5, y - hy * 0.5, x, y, x + hx * 0.5, y + hy * 0.5, w * 0.45, c[0], c[1] * 0.7, Math.min(97, c[2] + shadeL + 22), a * 0.7, 6, 4, rng);
  }
}

// Заливка формы мазками в случайном порядке (для спрайтов)
function paintShape(ctx, sdf, bb, col, st, rng) {
  const step = st.step || 3, pts = [];
  for (let y = bb[1]; y <= bb[3]; y += step) for (let x = bb[0]; x <= bb[2]; x += step) pts.push(x + (rng() - 0.5) * step, y + (rng() - 0.5) * step);
  const idx = []; for (let i = 0; i < pts.length; i += 2) idx.push(i);
  shuffle(idx, rng);
  for (const i of idx) strokeAt(ctx, st, sdf, col, pts[i], pts[i + 1], rng);
}

// ── SDF-примитивы ──
const sdCircle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
const sdEllipse = (cx, cy, rx, ry) => (x, y) => { const dx = (x - cx) / rx, dy = (y - cy) / ry; return (Math.hypot(dx, dy) - 1) * Math.min(rx, ry); };
const sdBox = (cx, cy, hw, hh, r = 0) => (x, y) => {
  const qx = Math.abs(x - cx) - hw + r, qy = Math.abs(y - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const sdCapsule = (ax, ay, bx, by, r) => (x, y) => {
  const pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay || 1), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
};
const sdLine = (pts, r) => (x, y) => { // толстая ломаная
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
    const pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay;
    const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay || 1), 0, 1);
    const d = Math.hypot(pax - bax * h, pay - bay * h);
    if (d < best) best = d;
  }
  return best - r;
};
const sdU = (...fs) => (x, y) => { let m = 1e9; for (const f of fs) { const v = f(x, y); if (v < m) m = v; } return m; };
const sdSub = (a, b) => (x, y) => Math.max(a(x, y), -b(x, y));
const sdAnd = (a, b) => (x, y) => Math.max(a(x, y), b(x, y));
const sdRot = (f, cx, cy, ang) => { const c = Math.cos(-ang), s = Math.sin(-ang); return (x, y) => { const dx = x - cx, dy = y - cy; return f(cx + dx * c - dy * s, cy + dx * s + dy * c); }; };
const sdWobble = (f, amp, freq, seed = 0) => (x, y) => f(x, y) + noise2(x * freq, y * freq, seed) * amp;
const sdTri = (ax, ay, bx, by, cx, cy) => (x, y) => { // примерный треугольник (через полуплоскости)
  const e = (x0, y0, x1, y1) => { const nx = y1 - y0, ny = x0 - x1, m = Math.hypot(nx, ny); return ((x - x0) * nx + (y - y0) * ny) / m; };
  const s = Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
  return Math.max(e(ax, ay, bx, by) * -s, e(bx, by, cx, cy) * -s, e(cx, cy, ax, ay) * -s);
};

// Стили мазков
const ST = {
  obj: { step: 2.6, len: 7, w: 3.6, dir: 'contour', shade: 16, bevel: 7, rim: 10, lj: 9, hj: 5, aj: 0.5, hl: 0.05 },
  objBig: { step: 4, len: 13, w: 6, dir: 'contour', shade: 18, bevel: 14, rim: 12, lj: 10, hj: 6, aj: 0.5, hl: 0.06 },
  boss: { step: 5, len: 16, w: 7.5, dir: 'contour', shade: 20, bevel: 22, rim: 12, lj: 10, hj: 6, aj: 0.5, hl: 0.07 },
  fine: { step: 1.6, len: 4, w: 2.2, dir: 'contour', shade: 12, bevel: 4, lj: 8, hj: 4, aj: 0.6 },
  hatch: { step: 2.8, len: 8, w: 3.2, dir: 0.7, shade: 12, bevel: 6, lj: 10, hj: 5, aj: 0.4 },
};

// Запечь спрайт: fn(ctx, rng) рисует в координатах с центром (0,0)
function bake(w, h, seed, fn) {
  const c = makeCanvas(w, h), ctx = c.getContext('2d');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.translate(w / 2, h / 2);
  fn(ctx, mulberry32(seed));
  c.cx = w / 2; c.cy = h / 2;
  return c;
}
// Быстрый вызов: P(ctx, rng, sdf, [x0,y0,x1,y1], col, style)
function P(ctx, rng, sdf, bb, col, st = ST.obj) { paintShape(ctx, sdf, bb, col, st, rng); }
const bbC = (cx, cy, r) => [cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2];
const bbE = (cx, cy, rx, ry) => [cx - rx - 2, cy - ry - 2, cx + rx + 2, cy + ry + 2];
const bbB = (cx, cy, hw, hh) => [cx - hw - 2, cy - hh - 2, cx + hw + 2, cy + hh + 2];
// Пятнышко-мазок
function dab(ctx, rng, x, y, r, col, ang = rng() * TAU, alpha = 0.9) {
  const ca = Math.cos(ang) * r, sa = Math.sin(ang) * r;
  brush(ctx, x - ca, y - sa, x + (rng() - 0.5) * r, y + (rng() - 0.5) * r, x + ca, y + sa, r * 1.1, col[0], col[1], col[2], alpha, 8, 4, rng);
}

// Холст: текстура переплетения (накладывается поверх всего кадра)
function makeCanvasTexture() {
  const S = 256, c = makeCanvas(S, S), ctx = c.getContext('2d');
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, S, S);
  const img = ctx.getImageData(0, 0, S, S), d = img.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const wx = Math.sin(x * 1.57) * 0.5 + 0.5, wy = Math.sin(y * 1.57) * 0.5 + 0.5;
    const weave = ((x >> 1) + (y >> 1)) & 1 ? wx : wy;
    const n = noise2(x * 0.07, y * 0.07, 3) * 10 + noise2(x * 0.4, y * 0.4, 5) * 6 + (hash2(x, y, 9) - 0.5) * 14;
    const v = clamp(128 + (weave - 0.5) * 34 + n, 0, 255);
    const i = (y * S + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Брызги краски на произвольный контекст (декали на земле, смерть галлюцинаций)
function paintSplat(ctx, x, y, size, col, rng = Math.random) {
  ctx.lineCap = 'round';
  const n = 5 + Math.floor(size / 5);
  for (let i = 0; i < n; i++) {
    const a = rng() * TAU, r = rng() * size * 0.8;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    dab(ctx, rng, px, py, size * (0.18 + rng() * 0.22), [col[0] + (rng() - 0.5) * 16, col[1], col[2] + (rng() - 0.5) * 16], rng() * TAU, 0.75);
  }
  for (let i = 0; i < n; i++) { // капли
    const a = rng() * TAU, r = size * (0.8 + rng() * 0.9);
    ctx.fillStyle = hsl(col[0], col[1], col[2] + (rng() - 0.5) * 10, 0.8);
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.8 + rng() * size * 0.07, 0, TAU); ctx.fill();
  }
}
