'use strict';
// ───────────── математика, шум, пружины, язык ─────────────
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const dist2 = (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const wrapA = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const angLerp = (a, b, t) => a + wrapA(b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise1(x, s = 0) {
  const i = Math.floor(x), f = x - i;
  return lerp(hash2(i, 0, s), hash2(i + 1, 0, s), smooth(f)) * 2 - 1;
}
function noise2(x, y, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
  const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy) * 2 - 1;
}
function shuffle(a, rng = Math.random) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function weightedPick(entries) { // [[item, w], ...]
  let tot = 0; for (const e of entries) tot += Math.max(0, e[1]);
  let r = Math.random() * tot;
  for (const e of entries) { r -= Math.max(0, e[1]); if (r <= 0) return e[0]; }
  return entries.length ? entries[entries.length - 1][0] : null;
}

// Пружина — для органичной анимации (сжатие/растяжение, наклоны, отдача)
class Spring {
  constructor(k = 180, d = 14, x = 0) { this.k = k; this.d = d; this.x = x; this.v = 0; }
  update(target, dt) { const f = (target - this.x) * this.k - this.v * this.d; this.v += f * dt; this.x += this.v * dt; return this.x; }
  kick(v) { this.v += v; }
}

// ───────────── язык ─────────────
let LANG = 'ru';
try { const s = localStorage.getItem('tp_lang'); if (s === 'ru' || s === 'en') LANG = s; else if (!/^ru|^be|^uk|^kk|^hy/i.test(navigator.language || 'ru')) LANG = 'en'; } catch (e) { /* без хранилища */ }
const T = (ru, en) => (LANG === 'ru' ? ru : en);
const tr = (p) => (Array.isArray(p) ? (LANG === 'ru' ? p[0] : p[1]) : p);

const QS = new URLSearchParams(location.search);
