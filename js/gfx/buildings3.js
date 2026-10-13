// Промышленность и сельское хозяйство.
import { plane, box, gable, hip, lathe, cyl, blob, line3, pole, S, TRI } from '../engine/pixel.js';
import { hash2, cmul, cmix, pick } from '../engine/util.js';
import { wall, flatRoof, roofMetal, roofSlate, solid, noisy, lawn, pavement, asphalt, dirt, parking, pal, WARM } from './materials.js';
import * as P from './props.js';
import { reg } from './buildings.js';

const fl = Math.floor;
const CONCRETE = 0xa8a49a;
const BLUE_PIPE = 0x4a7ab0, YELLOW_PIPE = 0xe0c020;

function indLot(pc, s, seed) {
  P.ground(pc, s, (u, v) => {
    const h = hash2(fl(u / 4), fl(v / 4), seed);
    if (h < 0.15) return cmix(0x6a6a5a, 0x5a7a3a, hash2(fl(u), fl(v), 1));
    return asphalt(0x5e5e5a, seed)(u, v);
  });
}

// шедовая крыша
function sawtooth(pc, x, y, z, sx, sy, n, wallc, glass = 0x7a9ab0) {
  const step = sy / n;
  for (let i = 0; i < n; i++) {
    const y0 = y + i * step;
    plane(pc, [x, y0, z], [sx, 0, 0], [0, step, 4], (u, v) => cmul(0x7a7e80, (fl(u) & 1) ? 0.92 : 1.02));
    plane(pc, [x, y0 + step, z], [sx, 0, 0], [0, 0, 4], (u, v) => { if (fl(u) % 3 === 0) return 0x5a5a5a; S.glow = hash2(fl(u / 3), i, 3) < 0.6 ? 0xfff0c0 : -1; return cmix(glass, 0xd0e8f0, (v / 4) * 0.4); });
    plane(pc, [x + sx, y0, z], [0, step, 0], [0, 0, 4], noisy(wallc, 0.05), [[0, 0], [1, 0], [1, 1]]);
  }
}

function hall(pc, x, y, sx, sy, h, c, seed, opt = {}) {
  P.bldg(pc, x, y, 0, sx, sy, h, { base: c, tex: opt.tex ?? 'brick', floorH: opt.floorH ?? h, winW: opt.winW ?? 4, winH: opt.winH ?? Math.max(3, h - 6), winY: 3, colW: opt.colW ?? 7, margin: 2, lit: 0.6, seed, glass: 0x4a6a80, curtains: false, frame: 0x5a5a5a,
    left: opt.left, right: opt.right }, opt.roof ?? { type: 'flat', color: 0x5a5a58 });
}

// ======================= ЛЁГКАЯ ПРОМЫШЛЕННОСТЬ =======================
reg('i1_workshop', 34, (pc, r, o) => {
  indLot(pc, 1, o.seed);
  P.fenceBack(pc, 1, 1, 31, 31, 4, 0x8a8a8a, 'mesh');
  hall(pc, 3, 4, 20, 15, 11, pick(r, pal.brick), o.seed, { left: { doors: [{ u: 3, w: 8, h: 8, color: 0x6a7a8a }], sign: null }, roof: { type: 'gable', rh: 4, mat: 'slate', color: pick(r, pal.slate), axis: 'x' } });
  P.sign3(pc, 13, 19.05, 7, 9, 3.6, '', 0xffffff, 0x2050a0);
  for (let i = 0; i < 3; i++) cyl(pc, 26, 6 + i * 4, 0, 1.6, 4, pick(r, [0x2a5aa0, 0xb03020, 0x3a7a3a]), 0x3a3a3a);
  box(pc, 25, 20, 0, 5, 5, 1.2, { top: 0xb08a50, left: 0x9a7a40, right: 0x8a6a30 });
  box(pc, 25, 20, 1.2, 5, 5, 1.2, { top: 0xb08a50, left: 0x9a7a40, right: 0x8a6a30 });
  if (r() < 0.7) P.car(pc, 12, 26, 0, 'truck', pick(r, [0x3a6a3a, 0xe06020, 0x3a5a8a]));
  P.fenceFront(pc, 1, 1, 31, 31, 4, 0x8a8a8a, 'mesh', { side: 'y', a: 4, b: 20 });
}, { smoke: [] });

reg('i1_garage', 26, (pc, r, o) => {
  P.ground(pc, 1, asphalt(0x5a5a58, o.seed));
  // гаражный кооператив
  const n = 5;
  for (let i = 0; i < n; i++) {
    const x = 2 + i * 5.6;
    const door = pick(r, [0x4a6a8a, 0x6a4a3a, 0x3a6a4a, 0x8a8a8a, 0x8a3a2a, 0xa08a40]);
    box(pc, x, 3, 0, 5.6, 11, 6, { left: (u, v) => (u > 0.8 && u < 4.8 && v < 5 ? (fl(v) % 2 ? door : cmul(door, 0.9)) : noisy(0xb0aca0, 0.06)(u, v)), right: noisy(0xa09c90, 0.06), top: (u, v) => cmul(0x5a5a5a, 0.95 + hash2(fl(u), fl(v), i) * 0.1) });
  }
  // СТО
  hall(pc, 4, 19, 14, 10, 8, 0xd0ccc0, o.seed, { tex: 'plaster', right: { doors: [{ u: 2, w: 6, h: 6, color: 0x7a7a7a }] }, left: { noWindows: false } });
  P.sign3(pc, 6, 29.05, 3, 9, 4, 'СТО', 0xffe040, 0x2a2a2a);
  P.car(pc, 25, 24, 1, pick(r, ['lada', 'moskvich', 'zaz', 'volga']), pick(r, pal.car));
  box(pc, 21, 18, 0, 3, 3, 1.5, { top: 0x2a2a2a, left: 0x1a1a1a, right: 0x1a1a1a }); // шины
});

reg('i1_sawmill', 30, (pc, r, o) => {
  P.ground(pc, 1, dirt(0x8a7050, o.seed));
  // штабеля брёвен
  for (let j = 0; j < 2; j++) for (let k = 0; k < 3; k++) {
    const y = 3 + j * 7;
    box(pc, 2, y, k * 1.8, 14, 5, 1.8, { top: (u, v) => cmul(0x8a6038, 0.9 + hash2(fl(u), fl(v), k) * 0.2), left: (u, v) => cmul(0x6a4828, 0.9 + hash2(fl(u / 2), k, 2) * 0.2), right: (u, v) => ((fl(u * 1.2) + fl(v)) % 2 ? 0xd0a868 : 0xb08850) });
  }
  // навес с пилорамой
  for (const [x, y] of [[18, 4], [30, 4], [18, 18], [30, 18]]) box(pc, x - 0.6, y - 0.6, 0, 1.2, 1.2, 9, { top: 0x5a4030, left: 0x6a4a30, right: 0x5a3a20 });
  box(pc, 21, 9, 0, 6, 4, 3, { top: 0x5a5a5a, left: 0x4a4a4a, right: 0x3a3a3a });
  gable(pc, 18, 4, 9, 12, 14, 3, 'y', { roof: roofMetal(0x6a6a6a), gable: null }, 1);
  // опилки
  blob(pc, 9, 22, 1, 4, 3, (lf) => cmul(0xd8b878, lf), 3);
  // доски
  box(pc, 3, 26, 0, 10, 4, 2.5, { top: (u, v) => (fl(v) % 2 ? 0xe0c088 : 0xc8a870), left: 0xb89860, right: 0xa88850 });
  if (r() < 0.6) P.car(pc, 22, 27, 0, 'truck', 0x3a5a3a);
}, { smoke: [] });

reg('i1_warehouse', 34, (pc, r, o) => {
  indLot(pc, 1, o.seed);
  const c = pick(r, [0x8a9aa8, 0x9a9a8a, 0x7a8a7a]);
  box(pc, 3, 3, 0, 24, 18, 8, { left: (u, v) => (u > 8 && u < 16 && v < 7 ? (fl(v) % 2 ? 0x6a6a6a : 0x7a7a7a) : cmul(c, (fl(u) & 1) ? 0.92 : 1.02)), right: (u, v) => cmul(c, (fl(u) & 1) ? 0.85 : 0.95), top: null });
  for (let i = 0; i <= 18; i++) {
    const t = i / 18, z = 8 + Math.sin(t * Math.PI) * 5;
    box(pc, 3, 3 + t * 18 - 0.6, z, 24, 1.2, 0.8, { top: cmul(c, 0.9 + Math.cos(t * Math.PI) * 0.15), left: cmul(c, 0.85), right: cmul(c, 0.75) });
  }
  // контейнеры
  const cc = [0xb03020, 0x2050a0, 0x2a7a3a, 0xc08020];
  box(pc, 4, 23, 0, 12, 5, 5, { top: cmul(cc[o.seed % 4], 1.1), left: (u, v) => cmul(cc[o.seed % 4], (fl(u) & 1) ? 0.9 : 1), right: cmul(cc[o.seed % 4], 0.85) });
  box(pc, 18, 24, 0, 11, 5, 5, { top: cmul(cc[(o.seed + 1) % 4], 1.1), left: (u, v) => cmul(cc[(o.seed + 1) % 4], (fl(u) & 1) ? 0.9 : 1), right: cmul(cc[(o.seed + 1) % 4], 0.85) });
  box(pc, 28, 6, 0, 3, 4, 3, { top: 0xe0b020, left: 0xd0a010, right: 0xb08a10 }); // погрузчик
});

// ======================= СРЕДНЯЯ ПРОМЫШЛЕННОСТЬ =======================
reg('i2_bakery', 64, (pc, r, o) => {
  indLot(pc, 1, o.seed);
  P.fenceBack(pc, 1, 1, 31, 31, 5, CONCRETE, 'concrete');
  hall(pc, 3, 4, 22, 16, 16, pick(r, [0xc8a888, 0xd8c8a8, 0xb85a3a]), o.seed, { floorH: 8, winH: 4, colW: 5, tex: 'brick', left: { doors: [{ u: 2, w: 6, h: 7, color: 0x7a7a7a }] } });
  P.sign3(pc, 12, 20.05, 10, 11, 5, 'ХЛЕБ', 0xffd060, 0x8a3a1a);
  P.stack(pc, 27, 7, 1.8, 36, { brick: true, color: 0x9a4a34 });
  box(pc, 8, 8, 16, 8, 6, 4, { top: 0x6a6a6a, left: 0x8a8a8a, right: 0x7a7a7a });
  P.car(pc, 22, 26, 0, 'rafik', 0xe8d8a8);
  P.fenceFront(pc, 1, 1, 31, 31, 5, CONCRETE, 'concrete', { side: 'y', a: 8, b: 18 });
}, { smoke: [[27, 7, 37]] });

reg('i2_dairy', 50, (pc, r, o) => {
  indLot(pc, 1, o.seed);
  hall(pc, 3, 12, 18, 14, 12, 0xe8e8e4, o.seed, { tex: 'tile', floorH: 12, winH: 5, colW: 5, left: { doors: [{ u: 2, w: 6, h: 7, color: 0x6a8aa0 }] } });
  P.sign3(pc, 8, 26.05, 7, 12, 4.5, 'МОЛОКО', 0x3080ff, 0xf0f0f0);
  for (let i = 0; i < 3; i++) P.tank(pc, 6 + i * 7, 5, 3, 16, 0xdce0e4, 0xc8ccd0);
  P.pipeX(pc, 4, 24, 9, 12, 1, 0xc0c4c8);
  P.tank(pc, 27, 20, 2.6, 10, 0xdce0e4);
  P.car(pc, 26, 28, 0, 'truck', 0x3a6ab0);
});

reg('i2_textile', 44, (pc, r, o) => {
  indLot(pc, 1, o.seed);
  const c = pick(r, pal.brick);
  box(pc, 3, 3, 0, 24, 22, 10, { left: wall({ base: c, tex: 'brick', L: 24, H: 10, floorH: 10, winW: 4, winH: 5, winY: 3, colW: 6, seed: o.seed, lit: 0.6, glass: 0x4a6a80, curtains: false }), right: wall({ base: c, tex: 'brick', L: 22, H: 10, floorH: 10, winW: 4, winH: 5, winY: 3, colW: 6, seed: o.seed, lit: 0.6, glass: 0x4a6a80, curtains: false }), top: null });
  sawtooth(pc, 3, 3, 10, 24, 22, 4, c);
  P.stack(pc, 29, 4, 1.4, 28, { brick: true, color: 0x8a3a2a });
  P.sign3(pc, 6, 25.05, 3, 14, 4.5, 'ФАБРИКА', 0xffffff, 0x3a3a8a);
}, { smoke: [[29, 4, 29]] });

reg('i2_factory', 60, (pc, r, o) => {
  indLot(pc, 1, o.seed);
  P.fenceBack(pc, 0.5, 0.5, 31.5, 31.5, 5, CONCRETE, 'concrete');
  const c = pick(r, [0xb8b4a8, 0x9aa0a0, 0xc8b8a0]);
  hall(pc, 3, 3, 20, 20, 15, c, o.seed, { tex: 'panel', floorH: 15, winH: 8, winY: 4, colW: 5, roof: { type: 'gable', axis: 'y', rh: 5, mat: 'metal', color: 0x6a7070 }, left: { doors: [{ u: 7, w: 7, h: 9, color: 0x6a6a6a }] } });
  P.stack(pc, 27, 6, 2, 44, { striped: true, color: 0xa8a49c });
  P.tank(pc, 27, 17, 2.4, 9, 0x8a8a8a);
  P.pipeY(pc, 6, 17, 26, 8, 0.9, BLUE_PIPE);
  P.fenceFront(pc, 0.5, 0.5, 31.5, 31.5, 5, CONCRETE, 'concrete', { side: 'y', a: 6, b: 16 });
  // проходная
  box(pc, 18, 26, 0, 6, 4, 5, { top: 0x6a6a6a, left: (u, v) => (v > 2 && v < 4.5 && u > 1 && u < 5 ? (S.glow = WARM[1], 0x8ab0c8) : 0xd8d0c0), right: 0xc8c0b0 });
}, { smoke: [[27, 6, 45]] });

// ======================= ТЯЖЁЛАЯ ПРОМЫШЛЕННОСТЬ =======================
reg('i3_steel', 110, (pc, r, o) => {
  indLot(pc, 2, o.seed);
  P.fenceBack(pc, 0.5, 0.5, 63.5, 63.5, 5, CONCRETE, 'concrete');
  // трубы
  P.stack(pc, 8, 6, 2.6, 80, { striped: true, color: 0xa09a90 });
  P.stack(pc, 16, 6, 2.6, 80, { striped: true, color: 0xa09a90 });
  P.stack(pc, 24, 6, 2.4, 70, { striped: true, color: 0xa09a90 });
  // доменная печь
  lathe(pc, 46, 14, 0, 40, (t) => (t < 0.15 ? 7 : t < 0.7 ? 7 - (t - 0.15) * 4 : 4.8 - (t - 0.7) * 8), (psi, z) => (fl(z / 4) % 3 === 0 ? 0x5a4a40 : cmul(0x7a6a5a, 0.9 + hash2(fl(psi * 6), fl(z / 3), 2) * 0.2)), () => 0x2a2a2a);
  P.tank(pc, 56, 8, 3.4, 30, 0x6a6058);
  P.tank(pc, 56, 22, 3.4, 30, 0x6a6058);
  line3(pc, [46, 14, 38], [56, 8, 28], 0x4a4a4a); line3(pc, [46, 14, 36], [56, 22, 28], 0x4a4a4a);
  // цеха
  hall(pc, 4, 30, 34, 18, 20, 0x9a8a7a, o.seed, { tex: 'panel', floorH: 20, winH: 10, winY: 5, colW: 5, roof: { type: 'gable', axis: 'x', rh: 6, mat: 'metal', color: 0x5a5e60 } });
  // конвейер
  box(pc, 40, 30, 0, 3, 3, 14, { top: 0x5a5a5a, left: 0x6a6a6a, right: 0x5a5a5a });
  plane(pc, [42, 24, 22], [0, 10, -10], [2.5, 0, 0], 0x4a4a4a);
  // шлак / руда
  blob(pc, 50, 44, 2, 7, 5, (lf, x, y) => cmul(hash2(x, y, 3) < 0.5 ? 0x5a3a2a : 0x7a4a30, lf), 5);
  hall(pc, 42, 50, 18, 10, 10, 0xa89a8a, o.seed + 1, { tex: 'brick' });
  P.car(pc, 12, 56, 0, 'truck', 0xe06020); P.car(pc, 28, 58, 2, 'truck', 0x3a6a3a);
}, { smoke: [[8, 6, 81], [16, 6, 81], [24, 6, 71], [46, 14, 42]] });

reg('i3_chem', 90, (pc, r, o) => {
  indLot(pc, 2, o.seed);
  P.fenceBack(pc, 0.5, 0.5, 63.5, 63.5, 5, CONCRETE, 'concrete');
  // шаровые резервуары
  P.sphereTank(pc, 10, 10, 6, 10, 0xe4e8ec); P.sphereTank(pc, 26, 10, 6, 10, 0xe4e8ec);
  // колонны
  for (let i = 0; i < 4; i++) {
    const x = 40 + (i % 2) * 8, y = 6 + fl(i / 2) * 10;
    P.tank(pc, x, y, 1.8 + (i % 2) * 0.5, 32 + i * 6, 0xc8ccd0, 0x8a8a8a);
    for (let k = 1; k < 5; k++) P.tank(pc, x, y, 2.4, 0.6, 0x5a5a5a, null, k * 7);
  }
  // факел
  pole(pc, 58, 6, 0, 50, 0x8a8a8a, 2);
  blob(pc, 58, 6, 52, 1.6, 2.6, (lf, x, y) => { return hash2(x, y, 1) < 0.5 ? 0xffd040 : 0xff7020; }, 2);
  P.pipeX(pc, 6, 56, 22, 3, 1.4, YELLOW_PIPE); P.pipeX(pc, 6, 56, 25, 3, 1.4, 0xb0b4b8);
  // цилиндрические баки
  for (let i = 0; i < 3; i++) P.tank(pc, 10 + i * 12, 38, 5, 12, pick(r, [0xd8dcdc, 0xc8a050, 0xe0e0e0]));
  hall(pc, 40, 34, 20, 14, 14, 0xc8c4b8, o.seed, { tex: 'panel', floorH: 7, winH: 3, colW: 4 });
  P.car(pc, 14, 56, 0, 'truck', 0xd8d8d8); P.car(pc, 32, 58, 2, 'truck', 0x3a6ab0);
}, { smoke: [[42, 8, 36], [48, 18, 48]], flame: [[58, 6, 54]] });

reg('i3_auto', 64, (pc, r, o) => {
  indLot(pc, 2, o.seed);
  const c = 0xc8c4b8;
  box(pc, 3, 3, 0, 40, 30, 12, { left: wall({ base: c, tex: 'panel', L: 40, H: 12, floorH: 12, winW: 6, winH: 6, winY: 4, colW: 8, seed: o.seed, lit: 0.6, curtains: false }), right: wall({ base: c, tex: 'panel', L: 30, H: 12, floorH: 12, winW: 6, winH: 6, winY: 4, colW: 8, seed: o.seed, lit: 0.6, curtains: false }), top: null });
  sawtooth(pc, 3, 3, 12, 40, 30, 5, c);
  P.sign3(pc, 6, 33.05, 4, 36, 6, 'АВТОЗАВОД', 0xffffff, 0x2050a0);
  P.stack(pc, 52, 8, 2, 46, { striped: true });
  hall(pc, 48, 16, 12, 18, 18, 0xd8d4c8, o.seed + 1, { tex: 'tile', floorH: 6, winH: 3, colW: 4 });
  // ряды новых машин
  const colors = [0xd8d8d0, 0xb02020, 0x2050a0, 0x208040, 0xd0b020, 0x6a1a3a, 0x1a6a6a];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) P.car(pc, 6 + i * 7, 42 + row * 7, 1, 'lada', colors[(i + row * 3) % colors.length]);
  P.car(pc, 54, 50, 1, 'truck', 0xe06020);
}, { smoke: [[52, 8, 47]] });

reg('i3_tech', 80, (pc, r, o) => {
  P.ground(pc, 2, lawn(o.seed, 0.02));
  P.patch(pc, 0, 50, 64, 13, parking(o.seed));
  const glass = pick(r, [0x2a5a7a, 0x3a5a5a]);
  box(pc, 6, 6, 0, 36, 22, 48, {
    left: (u, v) => { if (v < 1.5) return 0x7a7a7a; if (fl(v / 6) % 2 === 0 && v % 6 > 1) { S.glow = hash2(fl(u / 3), fl(v / 6), 2) < 0.5 ? 0xfff4d8 : -1; return cmix(glass, 0xc0e0ff, 0.2 + v / 100); } return 0xe8e4dc; },
    right: (u, v) => { if (fl(v / 6) % 2 === 0 && v % 6 > 1) { S.glow = hash2(fl(u / 3), fl(v / 6), 3) < 0.5 ? 0xfff4d8 : -1; return cmix(glass, 0xc0e0ff, 0.1); } return 0xd8d4cc; },
    top: flatRoof(0x6a6a6a, 36, 22),
  });
  P.sign3(pc, 12, 28.05, 40, 24, 6, 'ТЕХНОПАРК', 0xffffff, glass);
  // антенны-тарелки
  for (const [x, y, s] of [[52, 10, 5], [52, 26, 4]]) {
    pole(pc, x, y, 0, 6, 0x8a8a8a, 2);
    blob(pc, x, y, 10, s, s * 0.9, (lf) => cmul(0xf0f0f0, Math.min(1.1, lf)), 2);
  }
  P.tree(pc, 6, 36, 'birch', 1, o.seed); P.tree(pc, 18, 40, 'birch', 1, o.seed + 1); P.tree(pc, 34, 38, 'pine', 1, o.seed + 2);
  for (let i = 0; i < 5; i++) P.car(pc, 6 + i * 10, 56, i % 2 ? 0 : 2, pick(r, ['lada', 'volga', 'merc', 'niva']), pick(r, pal.car));
  P.lamp(pc, 2, 62, 11);
});

// ======================= СЕЛЬСКОЕ ХОЗЯЙСТВО =======================
function field(pc, s, seed, fn) { P.ground(pc, s, fn); }

reg('a_wheat', 14, (pc, r, o) => {
  field(pc, 1, o.seed, (u, v) => {
    if (u < 1.5 || v < 1.5) return dirt(0x8a7050, o.seed)(u, v);
    const row = (u + v * 0.0) - fl(u / 2) * 2;
    const g = hash2(fl(u), fl(v), o.seed);
    return row < 0.6 ? 0xa08a38 : cmix(0xd8b848, 0xe8d070, g * 0.6);
  });
  if (r() < 0.4) P.car(pc, 20, 12, 1, 'tractor');
});
reg('a_potato', 10, (pc, r, o) => {
  field(pc, 1, o.seed, (u, v) => {
    if (u < 1.5 || v < 1.5) return dirt(0x8a7050, o.seed)(u, v);
    const row = v - fl(v / 3) * 3;
    if (row < 1.4) return cmul(0x5a3e24, 0.9 + hash2(fl(u), fl(v), 1) * 0.2);
    return hash2(fl(u), fl(v), o.seed + 1) < 0.7 ? cmix(0x3e7a2a, 0x6aa040, hash2(fl(u / 2), fl(v), 2)) : 0x4a3220;
  });
});
reg('a_sunflower', 18, (pc, r, o) => {
  field(pc, 1, o.seed, (u, v) => {
    if (u < 1.5 || v < 1.5) return dirt(0x8a7050, o.seed)(u, v);
    return hash2(fl(u), fl(v), o.seed) < 0.6 ? cmix(0x3a6a28, 0x5a8a30, hash2(fl(u), fl(v), 2)) : 0x5a4028;
  });
  for (let y = 4; y < 30; y += 3) for (let x = 3; x < 30; x += 3) {
    const [px, py] = pc.proj(x + hash2(x, y, 1), y, 0);
    pc.set(fl(px), fl(py) - 1, 0x3a6a28); pc.set(fl(px), fl(py) - 2, 0x3a6a28);
    pc.set(fl(px), fl(py) - 3, 0xf0c020); pc.set(fl(px) + 1, fl(py) - 3, 0xe0a010); pc.set(fl(px), fl(py) - 4, 0xf8d040); pc.set(fl(px) + 1, fl(py) - 4, 0x5a3a10);
  }
});
function cow(pc, x, y, axis) {
  const sp = (u, v) => (hash2(fl(u), fl(v), fl(x * 7 + y)) < 0.35 ? 0x222222 : 0xf0ece4);
  if (axis) box(pc, x, y, 1.5, 4, 2, 2, { top: sp, left: sp, right: sp });
  else box(pc, x, y, 1.5, 2, 4, 2, { top: sp, left: sp, right: sp });
  pc.dot(x + 1, y + 1, 0.5, 0x3a3a3a); pc.dot(x + 1, y + 1, 1.2, 0x3a3a3a);
}
reg('a_cows', 30, (pc, r, o) => {
  P.ground(pc, 1, lawn(o.seed, 0.02, 0.5));
  P.bldg(pc, 3, 3, 0, 26, 10, 7, { base: 0xe0dcd0, tex: 'silicate', floorH: 7, winW: 2, winH: 2, winY: 4, colW: 4, seed: o.seed, lit: 0.2, curtains: false, right: { doors: [{ u: 3, w: 4, h: 6, color: 0x7a5a3a }] } },
    { type: 'gable', axis: 'x', rh: 4, mat: 'slate', color: pick(r, pal.slate) });
  P.fenceX(pc, 2, 30, 16, 3, 0x8a6a44, 'rail'); P.fenceY(pc, 16, 30, 2, 3, 0x8a6a44, 'rail');
  for (let i = 0; i < 5; i++) cow(pc, 5 + r() * 20, 18 + r() * 9, r() < 0.5);
  P.fenceX(pc, 2, 30, 30, 3, 0x8a6a44, 'rail'); P.fenceY(pc, 16, 30, 30, 3, 0x8a6a44, 'rail');
});
reg('a_green', 20, (pc, r, o) => {
  P.ground(pc, 1, dirt(0x7a6448, o.seed));
  for (let i = 0; i < 3; i++) {
    const x = 3 + i * 9.5;
    box(pc, x, 3, 0, 8, 26, 4, { left: (u, v) => ((fl(u) % 3 === 0) ? 0xd0d8d8 : cmix(0x9ac0c8, 0x6aa040, 0.3)), right: (u, v) => ((fl(u) % 4 === 0) ? 0xd0d8d8 : cmix(0x9ac0c8, 0x6aa040, 0.3 + hash2(fl(u / 2), fl(v), 1) * 0.2)), top: null });
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, z = 4 + Math.sin(t * Math.PI) * 4;
      box(pc, x + t * 8 - 0.5, 3, z, 1, 26, 0.6, { top: (u, v) => (fl(v) % 4 === 0 ? 0xd8e0e0 : cmix(0xb0d0d8, 0xffffff, 0.2 + Math.cos(t * Math.PI) * 0.2)), left: 0xa8c8d0, right: 0x98b8c0 });
    }
  }
});
reg('a_farm', 50, (pc, r, o) => {
  P.ground(pc, 2, (u, v) => (u > 34 ? lawn(o.seed, 0.01, 0.5)(u, v) : dirt(0x8a7050, o.seed)(u, v)));
  // коровник
  P.bldg(pc, 4, 4, 0, 30, 12, 8, { base: 0xd8d4c8, tex: 'silicate', floorH: 8, winW: 2, winH: 2, winY: 5, colW: 4, seed: o.seed, lit: 0.2, curtains: false },
    { type: 'gable', axis: 'x', rh: 5, mat: 'slate', color: 0x9a9e9c });
  // силосная башня
  P.tank(pc, 44, 10, 4.2, 30, 0xc8c4bc);
  lathe(pc, 44, 10, 30, 4, (t) => 4.2 * Math.sqrt(1 - t * t), () => 0x8a8e8c, () => 0x8a8e8c);
  P.tank(pc, 54, 10, 3.4, 22, 0xb8b4ac);
  // склад-ангар
  P.bldg(pc, 4, 24, 0, 22, 14, 9, { base: 0x8a8e8c, tex: 'metal', noWindows: true, seed: o.seed, left: { doors: [{ u: 6, w: 9, h: 8, color: 0x5a5a5a }] } },
    { type: 'gable', axis: 'x', rh: 4, mat: 'metal', color: 0x7a7e80 });
  // стога
  for (const [x, y] of [[40, 34], [48, 40], [42, 46]]) blob(pc, x, y, 2.5, 4, 4, (lf, px, py) => cmul(hash2(px, py, 2) < 0.5 ? 0xd8b858 : 0xc8a848, lf), x);
  P.car(pc, 14, 46, 0, 'tractor'); P.car(pc, 28, 52, 2, 'truck', 0x3a6a3a);
  for (let i = 0; i < 4; i++) cow(pc, 40 + r() * 18, 50 + r() * 10, r() < 0.5);
  P.fenceX(pc, 36, 62, 62, 3, 0x8a6a44, 'rail'); P.fenceY(pc, 30, 62, 62, 3, 0x8a6a44, 'rail');
});

export {};
