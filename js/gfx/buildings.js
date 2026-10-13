// Процедурные спрайты зданий. Каждый строитель рисует участок 32*s x 32*s мировых единиц.
import { PC, plane, box, gable, hip, lathe, cyl, blob, line3, pole, S, TRI } from '../engine/pixel.js';
import { mulberry32, hashStr, hash2, cmul, cmix, pick } from '../engine/util.js';
import { wall, flatRoof, roofSlate, roofTiles, roofMetal, solid, noisy, lawn, pavement, asphalt, dirt, parking, pal, GRASS, WARM } from './materials.js';
import * as P from './props.js';
import { DEFS } from '../data/buildings.js';
import { drawTree } from './trees.js';
import { drawVehicle } from './vehicles.js';
import { textMask, textWidth } from '../engine/font.js';

const fl = Math.floor;
const REG = {};
function reg(id, H, fn, opt = {}) { REG[id] = { H, fn, ...opt }; }

const yardLawn = (seed) => lawn(seed, 0.025);
const pave = (seed) => pavement(0xb4aea2, seed);

// ======================= ЖИЛЫЕ: НИЗКАЯ ПЛОТНОСТЬ =======================
reg('r1_izba', 40, (pc, r, o) => {
  P.ground(pc, 1, yardLawn(o.seed));
  P.beds(pc, 3, 3, 12, 9, 0x4a8a30, o.seed);
  const fc = pick(r, [0x8a6a44, 0x6a8a5a, 0x9a8a6a]);
  P.fenceBack(pc, 1, 1, 31, 31, 4, fc, 'picket');
  P.shed(pc, 20, 3, 8, 6, 5, 0x6a4a2a);
  P.tree(pc, 4, 20, 'birch', 0.9, o.seed);
  const log = pick(r, [0x7a5230, 0x6a4628, 0x8a6038]);
  const shut = pick(r, [0x3a6ab0, 0x3a8a5a, 0xd8d8d0]);
  P.bldg(pc, 10, 13, 0, 13, 11, 9, { base: log, tex: 'wood', floorH: 9, winW: 3, winH: 4, winY: 3, colW: 6, margin: 2.5, lit: 0.55, seed: o.seed, frame: 0xf0ece0, shutters: shut, plinth: 0x5a4a3a, curtains: true, sill: 0xf0ece0,
    right: { door: { u: 2, w: 3, color: 0x5a3a20 }, noWindows: false } },
    { type: 'gable', axis: 'y', rh: 7, mat: r() < 0.6 ? 'slate' : 'metal', color: r() < 0.6 ? pick(r, pal.slate) : pick(r, pal.metal) });
  P.chimney(pc, 14, 16, 15, 2, 4);
  if (r() < 0.6) P.antenna(pc, 18, 20, 16, 5);
  P.woodpile(pc, 25, 14);
  P.fenceFront(pc, 1, 1, 31, 31, 4, fc, 'picket', { side: 'x', a: 22, b: 27 });
  P.tree(pc, 27, 26, 'apple', 0.8, o.seed + 1);
});

reg('r1_house', 44, (pc, r, o) => {
  P.ground(pc, 1, yardLawn(o.seed));
  const fc = pick(r, [0x4a7a4a, 0x5a6aa0, 0x8a6a44, 0xa0a0a0]);
  P.fenceBack(pc, 1, 1, 31, 31, 4, fc, r() < 0.5 ? 'picket' : 'mesh');
  P.beds(pc, 2, 2, 10, 8, 0x5a9a38, o.seed);
  P.greenhouse(pc, 20, 3, 8, 5, 4);
  const base = pick(r, pal.plaster);
  P.bldg(pc, 9, 12, 0, 15, 12, 10, { base, floorH: 10, winW: 3, winH: 5, winY: 3, colW: 6, margin: 2.5, lit: 0.5, seed: o.seed, frame: 0xf4f0e8, sill: 0xf4f0e8,
    left: { door: { u: 11, w: 3, color: 0x6a4a2e } } },
    { type: 'gable', axis: 'x', rh: 7, mat: pick(r, ['slate', 'metal', 'tiles']), color: pick(r, [...pal.slate, ...pal.metal, ...pal.roofTile]) });
  // крыльцо
  box(pc, 19, 24, 0, 5, 2.5, 1.2, { top: 0xb0a898, left: 0x908878, right: 0x807868 });
  if (r() < 0.7) P.antenna(pc, 15, 17, 18, 5);
  if (r() < 0.5) P.car(pc, 27, 19, 1, pick(r, ['lada', 'moskvich', 'zaz', 'niva']), pick(r, pal.car));
  else P.tree(pc, 27, 19, 'apple', 0.85, o.seed);
  P.fenceFront(pc, 1, 1, 31, 31, 4, fc, 'picket', { side: 'x', a: 15, b: 23 });
  P.tree(pc, 4, 27, 'bush', 1, o.seed + 3);
});

reg('r1_dacha', 36, (pc, r, o) => {
  P.ground(pc, 1, lawn(o.seed, 0.05));
  P.beds(pc, 2, 2, 14, 12, 0x5a9a38, o.seed);
  P.beds(pc, 18, 2, 12, 8, 0x8aaa30, o.seed + 1);
  P.fenceBack(pc, 1, 1, 31, 31, 3.5, 0x8a7a5a, 'picket');
  P.greenhouse(pc, 3, 17, 6, 10, 4);
  const base = pick(r, pal.wood);
  P.bldg(pc, 14, 16, 0, 10, 9, 6, { base, tex: 'wood', floorH: 6, winW: 3, winH: 3, winY: 2, colW: 6, margin: 2, lit: 0.3, seed: o.seed, frame: 0xf0f0f0,
    right: { door: { u: 3, w: 3, color: 0x5a4030 } } },
    { type: 'gable', axis: 'y', rh: 8, mat: 'metal', color: pick(r, pal.metal) });
  // бочка
  cyl(pc, 26, 18, 0, 1.8, 3.5, 0x3a5a8a, 0x1a2a3a);
  P.tree(pc, 27, 27, 'apple', 0.9, o.seed + 2);
  P.fenceFront(pc, 1, 1, 31, 31, 3.5, 0x8a7a5a, 'picket', { side: 'y', a: 20, b: 24 });
});

reg('r1_brick', 46, (pc, r, o) => {
  P.ground(pc, 1, yardLawn(o.seed));
  P.patch(pc, 22, 18, 8, 13, pave(o.seed));
  P.fenceBack(pc, 1, 1, 31, 31, 4.5, 0x9a4a34, 'brick');
  P.tree(pc, 5, 5, 'oak', 0.9, o.seed);
  const base = pick(r, pal.brick);
  P.bldg(pc, 6, 10, 0, 15, 15, 11, { base, tex: 'brick', floorH: 11, winW: 4, winH: 5, winY: 3, colW: 7, margin: 2, lit: 0.5, seed: o.seed, frame: 0xf0f0f0, sill: 0xe8e0d0,
    left: { door: { u: 6, w: 3, color: 0x4a3020 } } },
    { type: 'hip', rh: 7, mat: 'metal', color: pick(r, [0x3a6a4a, 0x8a3a2a, 0x3a4a7a]) });
  // гараж
  P.bldg(pc, 22, 10, 0, 8, 8, 6, { base, tex: 'brick', noWindows: true, seed: o.seed,
    right: { door: { u: 1.5, w: 5, h: 5, color: 0x7a7a7a } } }, { type: 'flat', color: 0x5a5a5a });
  P.antenna(pc, 13, 17, 20, 6);
  if (r() < 0.6) P.car(pc, 26, 24, 1, pick(r, ['lada', 'volga', 'niva']), pick(r, pal.car));
  P.fenceFront(pc, 1, 1, 31, 31, 4.5, 0x9a4a34, 'brick', { side: 'y', a: 21, b: 31 });
});

reg('r1_duplex', 44, (pc, r, o) => {
  P.ground(pc, 1, yardLawn(o.seed));
  P.fenceBack(pc, 1, 1, 31, 31, 4, 0x8a8a8a, 'mesh');
  P.beds(pc, 2, 2, 28, 6, 0x5a9a38, o.seed);
  const a = pick(r, pal.plaster), b = pick(r, pal.pastel);
  P.bldg(pc, 4, 11, 0, 12, 13, 10, { base: a, floorH: 10, winW: 3, winH: 5, winY: 3, colW: 6, margin: 2, lit: 0.5, seed: o.seed, frame: 0xf0f0f0,
    left: { door: { u: 7, w: 3 } } }, { type: 'gable', axis: 'y', rh: 7, mat: 'slate', color: pick(r, pal.slate) });
  P.bldg(pc, 16, 11, 0, 12, 13, 10, { base: b, floorH: 10, winW: 3, winH: 5, winY: 3, colW: 6, margin: 2, lit: 0.5, seed: o.seed + 1, frame: 0xf0f0f0,
    left: { door: { u: 2, w: 3 } } }, { type: 'gable', axis: 'y', rh: 7, mat: 'slate', color: pick(r, pal.slate) });
  P.antenna(pc, 12, 16, 17, 5);
  P.tree(pc, 6, 28, 'bush', 1, o.seed); P.tree(pc, 26, 28, 'bush', 1, o.seed + 1);
  P.fenceFront(pc, 1, 1, 31, 31, 4, 0x8a8a8a, 'mesh', { side: 'y', a: 8, b: 24 });
});

reg('r1_cottage', 60, (pc, r, o) => {
  P.ground(pc, 1, lawn(o.seed, 0.01));
  P.patch(pc, 20, 19, 10, 12, pave(o.seed));
  P.fenceBack(pc, 0.5, 0.5, 31.5, 31.5, 7, 0xa0442c, 'brick');
  P.tree(pc, 5, 5, 'pine', 1, o.seed); P.tree(pc, 26, 5, 'pine', 0.9, o.seed + 1);
  const base = pick(r, [0xa8402a, 0xb85a3a, 0xd8c8a8]);
  P.bldg(pc, 5, 9, 0, 17, 15, 18, { base, tex: base === 0xd8c8a8 ? 'plaster' : 'brick', floorH: 9, winW: 4, winH: 5, winY: 2.5, colW: 7, margin: 2, lit: 0.6, seed: o.seed, frame: 0xffffff, sill: 0xf0e8d8, curtains: true,
    left: { door: { u: 7, w: 4, color: 0x3a2a1a } } }, { type: 'hip', rh: 10, mat: 'metal', color: pick(r, [0x2a6a3a, 0x9a2a1a, 0x2a3a7a]) });
  // башенка
  cyl(pc, 22, 24, 0, 3.5, 20, (psi, z) => (z > 9 && z < 14 && Math.abs(Math.sin(psi * 3)) < 0.5 ? (S.glow = WARM[0], 0x2c4560) : cmul(base, 0.95 + hash2(fl(psi * 9), fl(z / 2), 1) * 0.1)), null);
  lathe(pc, 22, 24, 20, 9, (t) => 4.2 * (1 - t), () => 0x2a6a3a);
  P.dish(pc, 9, 14, 20);
  if (r() < 0.7) P.car(pc, 26, 26, 1, 'merc');
  P.fenceFront(pc, 0.5, 0.5, 31.5, 31.5, 7, 0xa0442c, 'brick', { side: 'y', a: 19, b: 31 });
});
// (продолжение — в buildings2.js)

export { REG, reg };

// ======================= рендер спрайта =======================
const spriteCache = new Map();

export function buildingSprite(id, variant = 0, mode = 'day') {
  const key = id + '#' + variant;
  let e = spriteCache.get(key);
  if (!e) { e = generate(id, variant); spriteCache.set(key, e); }
  if (!e[mode]) {
    const pc = makePC(id, variant);
    e[mode] = cropCanvas(pc.toCanvas(mode), e.cropY);
  }
  return e;
}

function makePC(id, variant) {
  const d = DEFS[id];
  const s = d ? d.size : 1;
  const R = REG[id];
  if (!R) throw new Error('Нет спрайта для ' + id);
  const pc = new PC(64 * s, 32 * s + R.H, 32 * s, R.H);
  pc.swap = !R.noswap && (variant & 1) === 1;
  const rng = mulberry32(hashStr(id) + (variant >> 1) * 7777 + 1);
  R.fn(pc, rng, { s, L: 32 * s, v: variant, seed: (variant >> 1) * 31 + 7 + (hashStr(id) % 100) });
  return pc;
}

function generate(id, variant) {
  const pc = makePC(id, variant);
  // обрезаем пустую верхнюю часть
  let top = 0;
  outer: for (let y = 0; y < pc.h; y++) { for (let x = 0; x < pc.w; x++) if (pc.c[y * pc.w + x] >= 0) { top = y; break outer; } }
  top = Math.max(0, top - 1);
  const e = { ax: pc.ax, ay: pc.ay - top, w: pc.w, h: pc.h - top, cropY: top, hasGlow: pc.hasGlow() };
  e.day = cropCanvas(pc.toCanvas('day'), top);
  e.night = cropCanvas(pc.toCanvas('night'), top);
  return e;
}

function cropCanvas(cv, top) {
  if (!top) return cv;
  const c = document.createElement('canvas');
  c.width = cv.width; c.height = cv.height - top;
  c.getContext('2d').drawImage(cv, 0, -top);
  return c;
}

export function hasSprite(id) { return !!REG[id]; }
// есть ли уже готовый спрайт (без генерации)
export function peekSprite(id, variant, mode = 'day') {
  const e = spriteCache.get(id + '#' + variant);
  return e && e[mode] ? e : null;
}
export function spriteInfo(id) { return REG[id]; }
