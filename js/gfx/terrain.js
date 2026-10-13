// Тайлы земли: трава, песок, вода, дороги (автотайлинг), трубы, зоны, руины.
import { PC, plane, box, pole, line3, S } from '../engine/pixel.js';
import { hash2, cmul, cmix } from '../engine/util.js';
import { lawn, dirt, GRASS } from './materials.js';
import { forestTile } from './trees.js';

const fl = Math.floor;
const cache = new Map();

function tilePC(h = 0) { return new PC(64, 32 + h, 32, h); }
function topPlane(pc, sh) { plane(pc, [0, 0, 0], [32, 0, 0], [0, 32, 0], sh); }

function finish(key, pc, opts = {}) {
  const e = { day: pc.toCanvas('day'), ax: pc.ax, ay: pc.ay, pc: opts.keepPC ? pc : null };
  if (opts.winter !== false) e.winter = pc.toCanvas('winter');
  if (opts.night) e.night = pc.toCanvas('night');
  cache.set(key, e);
  return e;
}

// ---------- трава ----------
export function grassTile(v) {
  const key = 'g' + v;
  let e = cache.get(key); if (e) return e;
  const pc = tilePC();
  topPlane(pc, lawn(v * 13 + 1, 0.012));
  return finish(key, pc);
}
export function sandTile(v) {
  const key = 's' + v;
  let e = cache.get(key); if (e) return e;
  const pc = tilePC();
  topPlane(pc, (u, w) => cmul(0xd8c890, 0.94 + hash2(fl(u), fl(w), v) * 0.1));
  return finish(key, pc);
}
export function dirtTile(v) {
  const key = 'd' + v;
  let e = cache.get(key); if (e) return e;
  const pc = tilePC();
  topPlane(pc, dirt(0x8a6c48, v));
  return finish(key, pc);
}
export function rubbleTile(v) {
  const key = 'rb' + v;
  let e = cache.get(key); if (e) return e;
  const pc = tilePC(10);
  topPlane(pc, (u, w) => cmul(hash2(fl(u), fl(w), v) < 0.3 ? 0x3a3434 : 0x6a6058, 0.8 + hash2(fl(u), fl(w), v + 1) * 0.3));
  for (let i = 0; i < 8; i++) {
    const x = 4 + hash2(i, 1, v) * 22, y = 4 + hash2(i, 2, v) * 22;
    box(pc, x, y, 0, 2 + hash2(i, 3, v) * 3, 2 + hash2(i, 4, v) * 3, 1 + hash2(i, 5, v) * 3, { top: 0x7a6a5a, left: 0x5a4a40, right: 0x4a3a30 });
  }
  return finish(key, pc);
}

// ---------- вода ----------
// mask: какие соседи — суша (1:+x 2:+y 4:-x 8:-y)
export function waterTile(frame, mask, deep = false) {
  const key = 'w' + frame + '_' + mask + (deep ? 'd' : '');
  let e = cache.get(key); if (e) return e;
  const pc = tilePC();
  topPlane(pc, (u, v) => {
    S.up = 0;
    // берег
    const dE = mask & 1 ? 32 - u : 99, dS = mask & 2 ? 32 - v : 99, dW = mask & 4 ? u : 99, dN = mask & 8 ? v : 99;
    const d = Math.min(dE, dS, dW, dN);
    const jitter = hash2(fl(u), fl(v), 3) * 1.2;
    if (d < 3.5 + jitter * 0.5) { S.up = 1; return cmul(0xd0c088, 0.92 + hash2(fl(u), fl(v), 1) * 0.12); }
    if (d < 4.6 + jitter) return cmix(0xd8e8f0, 0x8ac0d8, hash2(fl(u + frame), fl(v), 2)); // пена
    const depth = Math.min(1, (d - 4) / 12);
    let c = cmix(0x3a8ab8, deep ? 0x1a4a7a : 0x24609a, depth);
    // рябь
    const w = Math.sin((u + v) * 0.55 + frame * 1.57 + Math.sin(v * 0.3) * 2);
    if (w > 0.93 && hash2(fl(u), fl(v), frame) < 0.6) c = cmix(c, 0xd8f0ff, 0.6);
    else if (w < -0.85) c = cmul(c, 0.92);
    return c;
  });
  return finish(key, pc, { night: false });
}

// ---------- лес ----------
export function forest(density, variant, autumn = false) {
  const key = 'f' + density + '_' + variant + (autumn ? 'a' : '');
  let e = cache.get(key); if (e) return e;
  const pc = forestTile(density, variant, autumn);
  return finish(key, pc);
}

// ---------- дороги ----------
export const ROAD_NAMES = ['', 'Грунтовка', 'Дорога', 'Проспект'];
export function roadTile(type, mask, seed = 0) {
  const key = 'r' + type + '_' + mask + '_' + seed;
  let e = cache.get(key); if (e) return e;
  const pc = tilePC();
  const arms = [mask & 1, mask & 2, mask & 4, mask & 8];
  const nArms = arms.filter(Boolean).length;
  const straight = mask === 5 || mask === 10;
  const hw = type === 1 ? 7 : type === 2 ? 9 : 13;
  const sw = type === 1 ? 0 : type === 2 ? 4 : 3;
  topPlane(pc, (u, v) => {
    // расстояние до оси дороги и координата вдоль оси
    let d = Math.max(Math.abs(u - 16), Math.abs(v - 16)), t = 0, axis = -1;
    if (mask & 1 && u >= 16 && Math.abs(v - 16) < d + 0.001) { d = Math.abs(v - 16); t = u - 16; axis = 0; }
    if (mask & 4 && u <= 16 && Math.abs(v - 16) < d + 0.001) { d = Math.abs(v - 16); t = 16 - u; axis = 0; }
    if (mask & 2 && v >= 16 && Math.abs(u - 16) < d + 0.001) { d = Math.abs(u - 16); t = v - 16; axis = 1; }
    if (mask & 8 && v <= 16 && Math.abs(u - 16) < d + 0.001) { d = Math.abs(u - 16); t = 16 - v; axis = 1; }
    const along = axis === 0 ? u : v;
    if (type === 1) {
      S.up = 1;
      if (d < hw) {
        if (Math.abs(d - 3.5) < 0.9) return cmul(0x6a5034, 0.95 + hash2(fl(u), fl(v), 2) * 0.1);
        if (d < 1.4 && hash2(fl(u), fl(v), seed) < 0.5) return GRASS[fl(hash2(fl(u), fl(v), 3) * 3)];
        return cmul(0x9a7a50, 0.9 + hash2(fl(u), fl(v), seed) * 0.15);
      }
      return lawn(seed * 7 + 5, 0.01)(u, v);
    }
    if (d < hw) {
      S.up = 0;
      let c = cmul(0x56575b, 0.94 + hash2(fl(u), fl(v), seed) * 0.08);
      if (hash2(fl(u / 3), fl(v / 3), seed + 7) < 0.05) c = cmul(c, 0.82); // заплатки и ямы
      if (hash2(fl(u), fl(v), seed + 9) < 0.01) c = 0x2e2e30;
      const junction = nArms >= 3;
      const tc = t; // расстояние от центра вдоль руки
      // пешеходный переход
      if (junction && axis >= 0 && tc > hw + 0.5 && tc < hw + 4) {
        if ((fl(d * 0.9) & 1) === 0 && d < hw - 1) return 0xe8e8e0;
        return c;
      }
      if (type === 2) {
        if ((straight || (axis >= 0 && tc > hw)) && d < 0.5 && (fl(along / 3) & 1)) return 0xe8e8d8;
      } else {
        if ((straight || (axis >= 0 && tc > hw + 4)) && d < 1.6) { // разделительная полоса
          if (d < 1.0) { S.up = 1; return cmix(0x5a9a3a, 0x4a8a30, hash2(fl(u), fl(v), 2)); }
          return 0xc8c8c0;
        }
        if ((straight || (axis >= 0 && tc > hw)) && Math.abs(d - 7) < 0.45 && (fl(along / 3) & 1)) return 0xe8e8d8;
      }
      return c;
    }
    if (d < hw + 0.8) { S.up = 0; return 0xb0aca4; } // бордюр
    if (d < hw + sw) { // тротуар
      S.up = 1;
      const a = axis === 0 ? u : v, b = d;
      if ((a - fl(a / 4) * 4) < 0.5) return 0x9a968e;
      return cmul(0xb8b4ac, 0.95 + hash2(fl(a / 4), fl(b), seed) * 0.08);
    }
    return lawn(seed * 7 + 5, 0.01)(u, v);
  });
  return finish(key, pc);
}

// мост: настил над водой
export function bridgeTile(type, mask) {
  const key = 'br' + type + '_' + mask;
  let e = cache.get(key); if (e) return e;
  const pc = tilePC(14);
  const axisX = (mask & 5) !== 0 || mask === 0;
  // опоры
  box(pc, 13, 13, -10, 6, 6, 12, { top: 0x8a8a84, left: 0x9a968e, right: 0x7a7670 });
  // настил
  const hw = type === 3 ? 14 : 11;
  const deck = (u, v) => { const d = axisX ? Math.abs(v - 16) : Math.abs(u - 16); S.up = 0; if (d < hw - 2) { if (d < 0.5 && (fl((axisX ? u : v) / 3) & 1)) return 0xe8e8d8; return cmul(0x5a5b5f, 0.95 + hash2(fl(u), fl(v), 1) * 0.08); } return 0xb8b4ac; };
  if (axisX) {
    box(pc, 0, 16 - hw, 2, 32, hw * 2, 1.5, { top: deck, left: 0x8a8680, right: 0x7a7670 });
    for (const y of [16 - hw, 16 + hw - 0.6]) plane(pc, [0, y, 3.5], [32, 0, 0], [0, 0, 2.5], (u, v) => (v > 1.8 || fl(u) % 3 === 0 ? 0xd0d0c8 : -1));
  } else {
    box(pc, 16 - hw, 0, 2, hw * 2, 32, 1.5, { top: deck, left: 0x8a8680, right: 0x7a7670 });
    for (const x of [16 - hw, 16 + hw - 0.6]) plane(pc, [x, 0, 3.5], [0, 32, 0], [0, 0, 2.5], (u, v) => (v > 1.8 || fl(u) % 3 === 0 ? 0xd0d0c8 : -1));
  }
  return finish(key, pc, { night: true });
}

// ---------- зоны ----------
export function zoneTile(color, dens) {
  const key = 'z' + color + '_' + dens;
  let e = cache.get(key); if (e) return e;
  const pc = tilePC();
  const g = lawn(dens * 11, 0.005, 0.3);
  topPlane(pc, (u, v) => {
    const edge = Math.min(u, v, 32 - u, 32 - v);
    if (edge < 1.2 && (fl((u + v) / 2) & 1)) return color;
    if (dens >= 2 && edge > 2.2 && edge < 3.0 && (fl((u + v) / 2) & 1)) return cmix(color, 0xffffff, 0.3);
    if (dens >= 3 && edge > 4 && edge < 4.8 && (fl((u + v) / 2) & 1)) return cmix(color, 0xffffff, 0.5);
    return cmix(g(u, v), color, 0.18);
  });
  return finish(key, pc);
}

// ---------- подземный вид: трубы ----------
export function undergroundTile(mask, hasPipe, v) {
  const key = 'u' + mask + '_' + (hasPipe ? 1 : 0) + '_' + v;
  let e = cache.get(key); if (e) return e;
  const pc = tilePC();
  topPlane(pc, (u, w) => {
    S.up = 0;
    if (hasPipe) {
      let d = 99;
      if (mask & 1 && u >= 16) d = Math.min(d, Math.abs(w - 16));
      if (mask & 4 && u <= 16) d = Math.min(d, Math.abs(w - 16));
      if (mask & 2 && w >= 16) d = Math.min(d, Math.abs(u - 16));
      if (mask & 8 && w <= 16) d = Math.min(d, Math.abs(u - 16));
      d = Math.min(d, Math.max(Math.abs(u - 16), Math.abs(w - 16)) - 1.5);
      if (d < 3) return d < 1 ? 0xb8c8d8 : d < 2.2 ? 0x7a90a8 : 0x4a5a6a;
    }
    return cmul(0x4a3a2c, 0.85 + hash2(fl(u / 2), fl(w / 2), v) * 0.25);
  });
  return finish(key, pc, { winter: false });
}

// ---------- края карты ----------
export function edgeTile(side, isWater) {
  const key = 'e' + side + (isWater ? 'w' : '');
  let e = cache.get(key); if (e) return e;
  const pc = new PC(64, 32 + 24, 32, 0);
  const sh = (u, v) => {
    const depth = 18 - v;
    if (isWater && depth < 4) return 0x2a6a9a;
    if (depth < 2) return 0x4a7a30;
    if (depth < 6) return cmul(0x6a4a2a, 0.9 + hash2(fl(u), fl(v), 1) * 0.15);
    if (depth < 12) return cmul(0x5a4a3a, 0.9 + hash2(fl(u / 2), fl(v), 2) * 0.15);
    return cmul(0x4a4440, 0.85 + hash2(fl(u / 3), fl(v / 2), 3) * 0.2);
  };
  if (side === 0) plane(pc, [32, 0, -18], [0, 32, 0], [0, 0, 18], sh); // грань x=32
  else plane(pc, [0, 32, -18], [32, 0, 0], [0, 0, 18], sh); // грань y=32
  return finish(key, pc, { winter: false });
}

// ---------- столб ЛЭП ----------
export function powerPole(v) {
  const key = 'pp' + v;
  let e = cache.get(key); if (e) return e;
  const pc = tilePC(26);
  const c = 0x6a4a30;
  pole(pc, 16, 16, 0, 22, c, 2);
  line3(pc, [12, 20, 21], [20, 12, 21], 0x5a3a20);
  for (const [x, y] of [[12.5, 19.5], [16, 16], [19.5, 12.5]]) pc.dot(x, y, 22, 0xd8d8d0);
  return finish(key, pc, { night: true });
}

// ---------- стройплощадка ----------
export function constructionTile(v) {
  const key = 'cs' + v;
  let e = cache.get(key); if (e) return e;
  const pc = tilePC(8);
  topPlane(pc, dirt(0x8a6a44, v));
  const fence = (u, w) => (fl(u / 2) & 1 ? 0xe0b020 : 0x3a3a3a);
  plane(pc, [1, 1, 0], [30, 0, 0], [0, 0, 3], fence);
  plane(pc, [1, 1, 0], [0, 30, 0], [0, 0, 3], fence);
  plane(pc, [1, 31, 0], [30, 0, 0], [0, 0, 3], fence);
  plane(pc, [31, 1, 0], [0, 30, 0], [0, 0, 3], fence);
  return finish(key, pc);
}

export function clearTerrainCache() { cache.clear(); }
