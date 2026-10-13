// Коммунальные, социальные и прочие «ставимые» здания.
import { plane, box, gable, hip, lathe, cyl, blob, line3, pole, S, TRI } from '../engine/pixel.js';
import { hash2, cmul, cmix, pick } from '../engine/util.js';
import { wall, flatRoof, roofMetal, roofSlate, roofTiles, solid, noisy, lawn, pavement, asphalt, dirt, parking, pal, WARM } from './materials.js';
import * as P from './props.js';
import { reg } from './buildings.js';
import { textMask, textWidth } from '../engine/font.js';

const fl = Math.floor;
const CONCRETE = 0xa8a49a;
const YP = 0xe0c020, BP = 0x4a7ab0;
const water = (seed) => (u, v) => { S.up = 0; const h = hash2(fl(u / 2), fl(v), seed); return h < 0.08 ? 0x8ac0e0 : cmix(0x2a6a9a, 0x3a8ab8, hash2(fl(u / 3), fl(v / 2), seed + 1)); };
function indLot(pc, s, seed) { P.ground(pc, s, (u, v) => (hash2(fl(u / 4), fl(v / 4), seed) < 0.12 ? cmix(0x6a6a5a, 0x5a7a3a, 0.5) : asphalt(0x5e5e5a, seed)(u, v))); }
function hall(pc, x, y, sx, sy, h, c, seed, opt = {}) {
  P.bldg(pc, x, y, 0, sx, sy, h, { base: c, tex: opt.tex ?? 'brick', floorH: opt.floorH ?? 8, winW: opt.winW ?? 3, winH: opt.winH ?? 4, winY: 2, colW: opt.colW ?? 5, margin: 2, lit: opt.lit ?? 0.55, seed, glass: opt.glass ?? 0x3a5a78, frame: opt.frame ?? -1, curtains: opt.curtains ?? false, trim: opt.trim, stripe: opt.stripe,
    ground: opt.ground ?? 0, left: opt.left, right: opt.right }, opt.roof ?? { type: 'flat', color: 0x5a5a58 });
}

// ======================= ЭЛЕКТРОСТАНЦИИ =======================
reg('p_diesel', 30, (pc, r, o) => {
  P.ground(pc, 1, dirt(0x7a6a50, o.seed));
  P.fenceBack(pc, 1, 1, 31, 31, 4, 0x8a8a8a, 'mesh');
  box(pc, 4, 5, 0, 16, 8, 8, { top: flatRoof(0x5a6a5a, 16, 8), left: (u, v) => (fl(u) % 2 ? 0x4a7a4a : 0x548454), right: (u, v) => (v > 2 && v < 6 && u > 2 && u < 6 ? 0x2a2a2a : 0x447044) });
  for (const x of [8, 14]) { pole(pc, x, 9, 8, 6, 0x3a3a3a, 2); }
  // топливный бак
  box(pc, 5, 18, 0, 3, 8, 2, { top: 0x6a6a6a, left: 0x5a5a5a, right: 0x4a4a4a });
  box(pc, 5, 18, 2, 12, 8, 5, { top: (u, v) => cmul(0xc8c8c0, 1 - Math.abs(v - 4) * 0.05), left: 0xb8b8b0, right: 0xa8a8a0 });
  // трансформатор
  box(pc, 23, 6, 0, 5, 5, 6, { top: 0x6a6a6a, left: (u, v) => (fl(u) % 2 ? 0x8a8a8a : 0x9a9a9a), right: 0x7a7a7a });
  P.sign3(pc, 23.5, 11.05, 2, 4, 3, '', 0xffffff, 0xf0d020);
  P.fenceFront(pc, 1, 1, 31, 31, 4, 0x8a8a8a, 'mesh');
}, { smoke: [[8, 9, 15], [14, 9, 15]] });

reg('p_wind', 70, (pc, r, o) => {
  P.ground(pc, 1, lawn(o.seed, 0.03));
  lathe(pc, 16, 16, 0, 56, (t) => 1.8 * (1 - t * 0.5), () => 0xf0f0ec, () => 0xe8e8e4);
  box(pc, 13, 14.5, 56, 6, 3, 3, { top: 0xf0f0ec, left: 0xe0e0dc, right: 0xd0d0cc });
  box(pc, 17, 21, 0, 3, 3, 3, { top: 0xb0b0a8, left: 0xa0a098, right: 0x909088 });
}, { rotor: [19.5, 16, 57.5] });

reg('p_coal', 120, (pc, r, o) => {
  indLot(pc, 3, o.seed);
  P.fenceBack(pc, 0.5, 0.5, 95.5, 95.5, 5, CONCRETE, 'concrete');
  // градирня
  lathe(pc, 22, 22, 0, 46, (t) => 15 - Math.sin(t * Math.PI * 0.8) * 5.5 + t * 1.5, (psi, z) => cmul(0xc8c4bc, 0.92 + hash2(fl(psi * 10), fl(z / 4), 3) * 0.1 - (z < 4 ? 0.15 : 0)), (dx, dy) => (dx * dx + dy * dy > 0.82 ? 0xb8b4ac : 0x3a3a3a));
  // трубы
  P.stack(pc, 60, 12, 3.2, 100, { striped: true, color: 0xb0aca4 });
  P.stack(pc, 76, 12, 3.2, 100, { striped: true, color: 0xb0aca4 });
  // главный корпус
  hall(pc, 46, 26, 44, 28, 34, 0xb8b4a8, o.seed, { tex: 'panel', floorH: 11, winH: 6, winY: 3, colW: 4, lit: 0.6, roof: { type: 'flat', color: 0x5a5a58 } });
  box(pc, 54, 30, 34, 26, 20, 10, { top: flatRoof(0x5a5a58, 26, 20), left: (u, v) => (fl(u) % 3 === 0 ? 0x6a6a6a : 0xa8a49a), right: 0x989490 });
  // угольный склад
  P.ground; for (const [x, y, s] of [[14, 56, 9], [28, 66, 10], [14, 76, 8]]) blob(pc, x, y, 1, s, 5, (lf, px, py) => cmul(hash2(px, py, 1) < 0.4 ? 0x2a2a2a : 0x1a1a1c, lf * 1.1), x + y);
  // конвейер к корпусу
  plane(pc, [30, 66, 2], [16, -30, 26], [0, 3, 0], (u) => (fl(u) % 2 ? 0x5a5a5a : 0x6a6a6a));
  // ОРУ (подстанция)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const x = 54 + i * 9, y = 66 + j * 12;
    box(pc, x, y, 0, 3, 3, 5, { top: 0x7a7a7a, left: 0x9a9a9a, right: 0x8a8a8a });
    pole(pc, x + 1.5, y + 1.5, 5, 8, 0x8a8a8a);
    line3(pc, [x - 1, y + 1.5, 12], [x + 4, y + 1.5, 12], 0x8a8a8a);
  }
  P.car(pc, 30, 86, 0, 'truck', 0x3a3a3a); P.car(pc, 44, 90, 2, 'truck', 0xe06020);
}, { smoke: [[60, 12, 101], [76, 12, 101]], steam: [[22, 22, 48]] });

reg('p_gas', 110, (pc, r, o) => {
  P.ground(pc, 3, (u, v) => (u < 4 || v < 4 ? lawn(o.seed)(u, v) : pavement(0xb0aca4, o.seed, 6)(u, v)));
  P.fenceBack(pc, 0.5, 0.5, 95.5, 95.5, 4, 0x8a8a8a, 'mesh');
  P.stack(pc, 20, 14, 2.6, 90, { color: 0xc8ccd0 });
  P.stack(pc, 32, 14, 2.6, 90, { color: 0xc8ccd0 });
  hall(pc, 10, 24, 50, 26, 30, 0xe0e4e8, o.seed, { tex: 'tile', floorH: 10, winW: 5, winH: 6, colW: 7, lit: 0.6, stripe: 0x3a6ab0, glass: 0x2a5a80 });
  box(pc, 64, 24, 0, 22, 26, 18, { top: flatRoof(0x6a6a6a, 22, 26), left: (u, v) => (v > 12 && v < 15 ? 0x3a6ab0 : noisy(0xd8dce0, 0.04)(u, v)), right: noisy(0xc8ccd0, 0.04) });
  P.sign3(pc, 18, 50.05, 20, 30, 7, 'ТЭЦ', 0xffffff, 0x3a6ab0);
  // жёлтые газовые трубы
  P.pipeX(pc, 2, 64, 58, 2, 1.6, YP); P.pipeX(pc, 2, 64, 62, 2, 1.6, YP);
  P.pipeY(pc, 50, 90, 70, 6, 2.4, 0xd0d0c8); P.pipeY(pc, 50, 90, 76, 6, 2.4, 0xd0d0c8); // теплотрасса
  for (let i = 0; i < 3; i++) P.tank(pc, 16 + i * 14, 78, 5, 10, 0xd8dcdc);
  P.lamp(pc, 6, 90, 11); P.lamp(pc, 90, 6, 11);
}, { steam: [[20, 14, 91], [32, 14, 91]] });

reg('p_nuclear', 140, (pc, r, o) => {
  P.ground(pc, 4, (u, v) => (u < 6 || v < 6 ? lawn(o.seed)(u, v) : pavement(0xa8a49c, o.seed, 8)(u, v)));
  P.fenceBack(pc, 0.5, 0.5, 127.5, 127.5, 5, CONCRETE, 'concrete');
  // две градирни
  for (const [x, y] of [[26, 26], [26, 66]]) lathe(pc, x, y, 0, 70, (t) => 20 - Math.sin(t * Math.PI * 0.8) * 7 + t * 2, (psi, z) => cmul(0xd0ccc4, 0.92 + hash2(fl(psi * 12), fl(z / 5), 3) * 0.08 - (z < 5 ? 0.15 : 0) - ((z > 60 && z < 64) ? 0.1 : 0)), (dx, dy) => (dx * dx + dy * dy > 0.85 ? 0xc0bcb4 : 0x3a3a3a));
  // реакторный блок
  hall(pc, 62, 20, 40, 36, 30, 0xe8e8e4, o.seed, { tex: 'panel', floorH: 10, winW: 2, winH: 3, colW: 6, lit: 0.4, stripe: 0xc02020 });
  lathe(pc, 82, 38, 30, 12, (t) => 14 * Math.sqrt(1 - t * t), (psi, z) => cmul(0xe8e8e4, 1), () => 0xe0e0dc);
  P.stack(pc, 110, 26, 2.4, 80, { striped: true, color: 0xd0d0d0 });
  // турбинный зал
  hall(pc, 62, 64, 52, 26, 26, 0xd8d8d4, o.seed + 1, { tex: 'panel', floorH: 13, winW: 4, winH: 8, colW: 6, lit: 0.5, stripe: 0x3a6ab0, roof: { type: 'flat', color: 0x5a5a5a } });
  P.sign3(pc, 66, 90.05, 18, 44, 7, 'АЭС', 0xffffff, 0x3a6ab0);
  for (let i = 0; i < 5; i++) { const x = 16 + i * 16; box(pc, x, 104, 0, 4, 4, 6, { top: 0x7a7a7a, left: 0x9a9a9a, right: 0x8a8a8a }); pole(pc, x + 2, 106, 6, 14, 0x9a9a9a); }
  P.lamp(pc, 8, 120, 12); P.lamp(pc, 120, 8, 12);
}, { steam: [[26, 26, 72], [26, 66, 72]] });

// ======================= ВОДА =======================
reg('w_well', 24, (pc, r, o) => {
  P.ground(pc, 1, lawn(o.seed, 0.02));
  P.patch(pc, 10, 10, 12, 12, pavement(0xa0a098, o.seed, 3));
  box(pc, 11, 11, 0, 7, 6, 6, { top: null, left: noisy(0xd8d0c0, 0.05), right: (u, v) => (u > 2 && u < 4.5 && v < 5 ? 0x5a6a7a : noisy(0xc8c0b0, 0.05)(u, v)) });
  gable(pc, 11, 11, 6, 7, 6, 2.5, 'x', { roof: roofMetal(0x5a7a8a), gable: 0xc8c0b0 }, 0.6);
  // колонка
  box(pc, 22, 22, 0, 1.4, 1.4, 5, { top: 0x2a5a8a, left: 0x3a6a9a, right: 0x2a5a8a });
  box(pc, 22.5, 20.5, 4, 0.6, 2, 0.6, { top: 0x2a5a8a, left: 0x2a5a8a, right: 0x2a5a8a });
  P.fenceBack(pc, 8, 8, 24, 24, 3, 0x8a8a8a, 'mesh'); P.fenceFront(pc, 8, 8, 24, 24, 3, 0x8a8a8a, 'mesh', { side: 'x', a: 14, b: 18 });
});

reg('w_tower', 80, (pc, r, o) => {
  P.ground(pc, 1, lawn(o.seed, 0.02));
  const c = pick(r, [0x8a3a2a, 0x6a6e70, 0x3a5a6a]);
  // башня Рожновского: тонкий ствол и бак-«луковица»
  lathe(pc, 16, 16, 0, 44, () => 2.2, (psi, z) => cmul(c, (fl(z / 4) % 2) ? 0.92 : 1), null);
  lathe(pc, 16, 16, 40, 20, (t) => (t < 0.2 ? 2.2 + t * 18 : t < 0.65 ? 5.8 : 5.8 - (t - 0.65) * 15), (psi, z) => (Math.abs(z - 52) < 0.6 ? cmul(c, 0.8) : c), () => cmul(c, 1.1));
  pole(pc, 16, 16, 60, 4, 0x8a8a8a);
  box(pc, 17.5, 17.5, 0, 3, 3, 4, { top: 0x6a6a6a, left: 0xd8d0c0, right: 0xc8c0b0 });
  P.fenceBack(pc, 4, 4, 28, 28, 3.5, 0x8a8a8a, 'mesh'); P.fenceFront(pc, 4, 4, 28, 28, 3.5, 0x8a8a8a, 'mesh');
});

reg('w_pump', 40, (pc, r, o) => {
  P.ground(pc, 2, lawn(o.seed, 0.01));
  P.patch(pc, 4, 4, 56, 56, pavement(0xa8a49c, o.seed, 5));
  hall(pc, 8, 8, 26, 18, 14, 0xd8c8b0, o.seed, { tex: 'brick', floorH: 14, winW: 4, winH: 7, winY: 4, colW: 6, roof: { type: 'gable', rh: 5, mat: 'metal', color: 0x4a6a8a, axis: 'x' } });
  P.sign3(pc, 12, 26.05, 2, 18, 5, 'ВОДОКАНАЛ', 0xffffff, 0x2a5a9a);
  // резервуар
  lathe(pc, 46, 18, 0, 8, () => 10, (psi, z) => cmul(0xc0bcb4, 0.95), () => 0x8a9a8a);
  for (let i = 0; i < 3; i++) P.pipeY(pc, 28, 58, 12 + i * 6, 1, 1.6, BP);
  P.pipeX(pc, 34, 58, 30, 1, 1.6, BP);
  box(pc, 44, 40, 0, 10, 10, 6, { top: 0x6a6a6a, left: noisy(0xd8d0c0, 0.05), right: noisy(0xc8c0b0, 0.05) });
});

reg('w_intake', 50, (pc, r, o) => {
  P.ground(pc, 3, lawn(o.seed, 0.01));
  // отстойники
  for (let i = 0; i < 3; i++) {
    const x = 6 + i * 28;
    box(pc, x, 6, 0, 24, 30, 2, { top: (u, v) => (u < 1.5 || v < 1.5 || u > 22.5 || v > 28.5 ? 0xb8b4ac : water(o.seed + i)(u, v)), left: 0xa8a49c, right: 0x989490 });
  }
  hall(pc, 10, 48, 50, 22, 18, 0xe0d8c8, o.seed, { tex: 'tile', floorH: 9, winW: 4, winH: 5, colW: 6, stripe: 0x3a6ab0 });
  P.sign3(pc, 20, 70.05, 6, 30, 6, 'ВОДОЗАБОР', 0xffffff, 0x2a5a9a);
  for (let i = 0; i < 2; i++) P.tank(pc, 74 + i * 12, 58, 5, 16, 0xc8ccd0);
  for (let i = 0; i < 4; i++) P.pipeY(pc, 36, 48, 14 + i * 12, 0, 1.8, BP);
});

// ======================= КАНАЛИЗАЦИЯ =======================
reg('s_treat', 40, (pc, r, o) => {
  P.ground(pc, 3, lawn(o.seed, 0.01, 0.3));
  P.fenceBack(pc, 0.5, 0.5, 95.5, 95.5, 4, 0x8a8a8a, 'mesh');
  const sludge = (seed) => (u, v) => { S.up = 0; return cmix(0x5a6a4a, 0x7a7a5a, hash2(fl(u / 2), fl(v / 2), seed)); };
  for (const [x, y] of [[20, 20], [50, 20], [20, 50], [50, 50]]) {
    lathe(pc, x, y, 0, 3, () => 11, () => 0xb8b4ac, (dx, dy) => (dx * dx + dy * dy > 0.85 ? 0xc8c4bc : (Math.abs(dy * 2 - dx) < 0.08 ? 0x5a5a5a : sludge(x)(dx * 10, dy * 10))));
  }
  hall(pc, 68, 60, 22, 26, 12, 0xd8d0c0, o.seed, { tex: 'brick' });
  box(pc, 10, 74, 0, 40, 14, 2, { top: (u, v) => (u < 1.4 || v < 1.4 || u > 38.6 || v > 12.6 ? 0xb8b4ac : sludge(3)(u, v)), left: 0xa8a49c, right: 0x989490 });
  P.fenceFront(pc, 0.5, 0.5, 95.5, 95.5, 4, 0x8a8a8a, 'mesh');
});

reg('s_aeration', 40, (pc, r, o) => {
  P.ground(pc, 4, lawn(o.seed, 0.01, 0.3));
  for (let i = 0; i < 4; i++) {
    const y = 8 + i * 18;
    box(pc, 8, y, 0, 70, 14, 3, { top: (u, v) => { if (u < 1.4 || v < 1.4 || u > 68.6 || v > 12.6) return 0xb8b4ac; S.up = 0; return hash2(fl(u), fl(v), i) < 0.2 ? 0xd8e8e0 : cmix(0x4a7a7a, 0x6a8a7a, hash2(fl(u / 3), fl(v / 2), i)); }, left: 0xa8a49c, right: 0x989490 });
  }
  for (const [x, y] of [[100, 20], [100, 50]]) lathe(pc, x, y, 0, 3, () => 12, () => 0xb8b4ac, (dx, dy) => (dx * dx + dy * dy > 0.85 ? 0xc8c4bc : cmix(0x5a6a4a, 0x7a7a5a, hash2(fl(dx * 9), fl(dy * 9), 2))));
  hall(pc, 84, 80, 34, 30, 16, 0xe0d8c8, o.seed, { tex: 'tile', floorH: 8, stripe: 0x3a8a6a });
  for (let i = 0; i < 5; i++) P.lamp(pc, 6 + i * 24, 120, 11);
});

// ======================= ГАЗ И ТЕПЛО =======================
reg('g_grs', 34, (pc, r, o) => {
  P.ground(pc, 2, (u, v) => pavement(0xa8a49c, o.seed, 4)(u, v));
  P.fenceBack(pc, 1, 1, 63, 63, 4, 0x8a8a8a, 'mesh');
  hall(pc, 6, 6, 18, 14, 9, 0xe0d8c8, o.seed, { tex: 'brick', floorH: 9, winH: 4, roof: { type: 'gable', rh: 4, mat: 'metal', color: 0x8a3a2a, axis: 'x' } });
  // жёлтые трубы и задвижки
  for (let i = 0; i < 3; i++) {
    P.pipeX(pc, 6, 58, 30 + i * 6, 2, 1.8, YP);
    for (let k = 0; k < 3; k++) box(pc, 20 + k * 14, 29.5 + i * 6, 3.6, 2, 2.8, 2.2, { top: 0xd02020, left: 0xb01818, right: 0xa01010 });
  }
  pole(pc, 40, 12, 0, 16, 0x8a8a8a, 2);
  box(pc, 34, 8, 0, 10, 10, 5, { top: 0x7a7a7a, left: 0xe0c020, right: 0xd0b010 });
  P.sign3(pc, 8, 20.05, 3, 14, 4, 'ГАЗ', 0xd02020, 0xf0d020);
  P.fenceFront(pc, 1, 1, 63, 63, 4, 0x8a8a8a, 'mesh');
});

reg('g_holder', 50, (pc, r, o) => {
  P.ground(pc, 2, pavement(0xa8a49c, o.seed, 4));
  P.fenceBack(pc, 1, 1, 63, 63, 4, 0x8a8a8a, 'mesh');
  P.sphereTank(pc, 20, 20, 12, 18, 0xe8ecf0);
  P.sphereTank(pc, 46, 44, 10, 15, 0xe8ecf0);
  P.pipeX(pc, 4, 60, 6, 1, 1.6, YP);
  P.pipeY(pc, 6, 60, 6, 1, 1.6, YP);
  P.fenceFront(pc, 1, 1, 63, 63, 4, 0x8a8a8a, 'mesh');
});

reg('h_boiler', 80, (pc, r, o) => {
  indLot(pc, 2, o.seed);
  hall(pc, 6, 10, 32, 22, 16, pick(r, [0xb85a3a, 0xc8b8a0]), o.seed, { tex: 'brick', floorH: 16, winW: 4, winH: 9, winY: 4, colW: 6, left: { doors: [{ u: 2, w: 6, h: 8, color: 0x6a6a6a }] } });
  P.sign3(pc, 14, 32.05, 9, 18, 5, 'КОТЕЛЬНАЯ', 0xffffff, 0x8a2a1a);
  P.stack(pc, 50, 14, 2.4, 60, { color: 0x8a8e90 });
  for (let i = 0; i < 3; i++) line3(pc, [50, 14, 20 + i * 14], [50 + 8, 14 - 8, 0], 0x6a6a6a);
  // теплотрасса
  P.pipeY(pc, 32, 62, 22, 3, 2.2, 0xd0d0c8); P.pipeY(pc, 32, 62, 26, 3, 2.2, 0xd0d0c8);
  P.tank(pc, 50, 44, 5, 12, 0x8a8e90);
  blob(pc, 12, 48, 1, 6, 3, (lf, px, py) => cmul(hash2(px, py, 1) < 0.4 ? 0x2a2a2a : 0x1a1a1c, lf), 4);
}, { smoke: [[50, 14, 61]] });

// ======================= МУСОР =======================
reg('t_dump', 30, (pc, r, o) => {
  P.ground(pc, 3, dirt(0x7a6448, o.seed));
  P.fenceBack(pc, 0.5, 0.5, 95.5, 95.5, 5, CONCRETE, 'concrete');
  const junk = [0x8a6a4a, 0x5a5a5a, 0xa0a0a0, 0x3a6a3a, 0xc8c0a0, 0x6a3a3a, 0x3a4a7a, 0xe0d8c0, 0x9a8a5a];
  for (let i = 0; i < 12; i++) {
    const x = 10 + r() * 76, y = 10 + r() * 76;
    blob(pc, x, y, 1, 6 + r() * 6, 3 + r() * 4, (lf, px, py) => cmul(junk[fl(hash2(px, py, i) * junk.length)], lf), i);
  }
  P.car(pc, 40, 50, 0, 'garbage'); P.car(pc, 70, 30, 1, 'tractor', 0xe0a020);
  P.fenceFront(pc, 0.5, 0.5, 95.5, 95.5, 5, CONCRETE, 'concrete', { side: 'y', a: 40, b: 56 });
});

reg('t_recycle', 26, (pc, r, o) => {
  P.ground(pc, 1, asphalt(0x5e5e5a, o.seed));
  box(pc, 4, 4, 0, 14, 10, 8, { top: flatRoof(0x5a5a5a, 14, 10), left: (u, v) => (v > 3 && v < 6.5 && u > 3 && u < 11 ? (S.glow = WARM[1], 0x8ab0c8) : noisy(0x6a8a6a, 0.05)(u, v)), right: noisy(0x5a7a5a, 0.05) });
  P.sign3(pc, 4, 14.05, 6.5, 14, 1.5, '', 0xffffff, 0x2a8a3a);
  const cc = [0x2a7a3a, 0x2a5aa0, 0xd0a020, 0xa03020];
  for (let i = 0; i < 4; i++) box(pc, 3 + i * 7, 22, 0, 5, 5, 4.5, { top: cmul(cc[i], 1.1), left: cc[i], right: cmul(cc[i], 0.85) });
  box(pc, 22, 6, 0, 6, 6, 3, { top: (u, v) => (fl(u + v) % 2 ? 0x6a9a6a : 0x8ab0b0), left: 0x8a7a5a, right: 0x7a6a4a }); // ящики стеклотары
});

reg('t_incin', 90, (pc, r, o) => {
  indLot(pc, 2, o.seed);
  hall(pc, 6, 8, 36, 26, 24, 0xa8acb0, o.seed, { tex: 'metal', floorH: 12, winW: 3, winH: 3, colW: 8, roof: { type: 'flat', color: 0x5a5a5a } });
  box(pc, 10, 34, 0, 14, 8, 12, { top: 0x6a6a6a, left: (u, v) => (u > 3 && u < 11 && v < 9 ? 0x4a4a4a : 0x9a9ea2), right: 0x8a8e92 });
  P.stack(pc, 52, 14, 3, 72, { striped: true, color: 0xb0b0b0 });
  P.car(pc, 34, 52, 0, 'garbage'); P.car(pc, 50, 46, 1, 'garbage');
}, { smoke: [[52, 14, 73]] });

// ======================= ПОЖАРНЫЕ И МИЛИЦИЯ =======================
reg('f_post', 54, (pc, r, o) => {
  P.ground(pc, 1, asphalt(0x5a5a5a, o.seed));
  hall(pc, 4, 5, 18, 16, 9, 0xe8e0d0, o.seed, { tex: 'brick', floorH: 9, left: { doors: [{ u: 2, w: 6, h: 7, color: 0xc02020 }, { u: 10, w: 6, h: 7, color: 0xc02020 }] } });
  // каланча
  box(pc, 23, 6, 0, 6, 6, 30, { top: null, left: (u, v) => (v > 24 && u > 1 && u < 5 ? 0x3a4a5a : noisy(0xb8402a, 0.06)(u, v)), right: noisy(0xa8382a, 0.06) });
  hip(pc, 23, 6, 30, 6, 6, 5, roofMetal(0x5a5a5a), 1);
  P.sign3(pc, 6, 21.05, 7.5, 6, 1.4, '', 0xffffff, 0xc02020);
  P.sign3(pc, 10, 21.05, 7.5, 6, 1.4, '', 0xffffff, 0xc02020);
  P.sign3(pc, 23.5, 12.05, 18, 5, 6, '01', 0xffffff, 0xc02020);
}, {});

reg('f_station', 70, (pc, r, o) => {
  P.ground(pc, 2, asphalt(0x5a5a5a, o.seed));
  hall(pc, 6, 6, 40, 22, 18, 0xe8e0d0, o.seed, { tex: 'brick', floorH: 9, ground: 9, stripe: 0xc02020, left: { doors: [0, 1, 2, 3].map((i) => ({ u: 2 + i * 9.5, w: 7, h: 8, color: 0xc02020 })) } });
  box(pc, 48, 8, 0, 9, 9, 42, { top: null, left: (u, v) => (v > 34 && u > 1 && u < 8 ? 0x3a4a5a : noisy(0xb8402a, 0.06)(u, v)), right: noisy(0xa8382a, 0.06) });
  hip(pc, 48, 8, 42, 9, 9, 6, roofMetal(0x5a5a5a), 1);
  P.sign3(pc, 16, 28.05, 12, 20, 5, 'ПОЖАРНАЯ', 0xffffff, 0xc02020);
  P.car(pc, 12, 36, 1, 'fire'); P.car(pc, 22, 38, 1, 'fire');
  P.flag(pc, 4, 30, 0, 14);
});

reg('po_post', 34, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xb0aaa0, o.seed));
  hall(pc, 5, 6, 20, 14, 10, 0xe8e8e4, o.seed, { tex: 'tile', floorH: 10, winH: 4, stripe: 0x2a5ab0, curtains: true, left: { doors: [{ u: 8, w: 3.5, h: 6, color: 0x2a3a5a, light: true }] } });
  P.sign3(pc, 6, 20.05, 7, 18, 2, '', 0xffffff, 0x2a5ab0);
  P.sign3(pc, 25.05, 9, 4, 6, 6, '02', 0xffffff, 0x2a5ab0, 'y');
  P.car(pc, 24, 26, 0, 'police');
  P.lamp(pc, 3, 28, 10);
});

reg('po_station', 60, (pc, r, o) => {
  P.ground(pc, 2, pavement(0xb0aaa0, o.seed));
  hall(pc, 6, 6, 40, 20, 26, 0xe0dcd0, o.seed, { tex: 'tile', floorH: 8, winH: 4, colW: 5, stripe: 0x2a5ab0, curtains: true, left: { doors: [{ u: 18, w: 4, h: 6, color: 0x2a3a5a, light: true }] } });
  P.sign3(pc, 10, 26.05, 7.5, 32, 6, 'МИЛИЦИЯ', 0xffffff, 0x2a5ab0);
  P.fenceBack(pc, 48, 4, 62, 40, 5, CONCRETE, 'concrete');
  P.car(pc, 54, 14, 1, 'police'); P.car(pc, 54, 28, 1, 'police'); P.car(pc, 24, 40, 0, 'police');
  P.flag(pc, 4, 30, 0, 16);
  P.lamp(pc, 46, 46, 11);
});

// ======================= МЕДИЦИНА =======================
function redCross(pc, x, y, z, s, axis = 'x') {
  const sh = (u, v) => (Math.abs(u - s / 2) < s * 0.17 || Math.abs(v - s / 2) < s * 0.17 ? (S.glow = 0xff4040, 0xd02020) : 0xf8f8f8);
  if (axis === 'x') plane(pc, [x, y, z], [s, 0, 0], [0, 0, s], sh); else plane(pc, [x, y, z], [0, s, 0], [0, 0, s], sh);
}
reg('m_fap', 30, (pc, r, o) => {
  P.ground(pc, 1, lawn(o.seed, 0.02));
  P.patch(pc, 0, 24, 32, 7, pavement(0xb8b2a6, o.seed));
  P.bldg(pc, 6, 7, 0, 20, 14, 9, { base: 0xf0f0ec, floorH: 9, winW: 3, winH: 4, winY: 3, colW: 5, lit: 0.4, seed: o.seed, frame: 0xffffff, curtains: true, left: { doors: [{ u: 8, w: 3, h: 6, color: 0x5a7a9a, light: true }] } },
    { type: 'gable', axis: 'x', rh: 5, mat: 'metal', color: 0x3a6a5a });
  redCross(pc, 16, 21.05, 5.5, 3.5);
  P.car(pc, 26, 27, 0, 'ambulance');
});
reg('m_clinic', 50, (pc, r, o) => {
  P.ground(pc, 2, lawn(o.seed, 0.02));
  P.patch(pc, 0, 46, 64, 17, pavement(0xb8b2a6, o.seed));
  hall(pc, 6, 8, 46, 22, 30, 0xf0f0ec, o.seed, { tex: 'panel', floorH: 7.5, winW: 4, winH: 4, colW: 5.5, stripe: 0x3a8ab0, curtains: true, frame: 0xffffff, lit: 0.5, left: { doors: [{ u: 20, w: 5, h: 6, glass: true }] } });
  P.sign3(pc, 8, 30.05, 26, 40, 3.5, '', 0xffffff, 0x3a8ab0);
  redCross(pc, 52.05, 14, 18, 7, 'y');
  P.tree(pc, 6, 38, 'birch', 1, o.seed); P.tree(pc, 56, 40, 'birch', 1, o.seed + 1);
  P.car(pc, 30, 52, 0, 'ambulance'); P.car(pc, 44, 54, 2, 'ambulance');
  P.lamp(pc, 4, 60, 11);
});
reg('m_hospital', 80, (pc, r, o) => {
  P.ground(pc, 3, lawn(o.seed, 0.02));
  P.patch(pc, 0, 70, 96, 25, pavement(0xb8b2a6, o.seed));
  hall(pc, 8, 8, 70, 18, 52, 0xf0f0ec, o.seed, { tex: 'panel', floorH: 7, winW: 4, winH: 4, colW: 5.5, stripe: 0x3a8ab0, curtains: true, lit: 0.55 });
  hall(pc, 8, 30, 20, 34, 30, 0xe8e8e4, o.seed + 1, { tex: 'panel', floorH: 7, winW: 4, winH: 4, colW: 5.5, stripe: 0x3a8ab0, curtains: true, lit: 0.5 });
  hall(pc, 40, 30, 46, 30, 16, 0xe8e8e4, o.seed + 2, { tex: 'tile', floorH: 8, winW: 5, winH: 4, colW: 6, stripe: 0x3a8ab0, left: { doors: [{ u: 18, w: 6, h: 6, glass: true }] } });
  P.sign3(pc, 46, 60.05, 10, 34, 5, 'БОЛЬНИЦА', 0xffffff, 0xd02020);
  redCross(pc, 78.05, 12, 40, 9, 'y');
  // вертолётная площадка
  plane(pc, [50, 36, 16.1], [24, 0, 0], [0, 18, 0], (u, v) => { const d = Math.hypot(u - 12, v - 9); if (d < 6 && d > 5) return 0xf0f0f0; if (Math.abs(u - 12) < 3 && (Math.abs(v - 9) < 0.7 || Math.abs(u - 9.5) < 0.7 || Math.abs(u - 14.5) < 0.7) && Math.abs(v - 9) < 3) return 0xf0f0f0; return 0x6a6a6a; });
  for (let i = 0; i < 3; i++) P.car(pc, 50 + i * 12, 80, 0, 'ambulance');
  P.tree(pc, 30, 76, 'oak', 1, o.seed); P.tree(pc, 10, 82, 'oak', 1, o.seed + 1);
  P.lamp(pc, 4, 92, 11); P.lamp(pc, 92, 92, 11);
});

// ======================= ОБРАЗОВАНИЕ =======================
reg('e_kinder', 34, (pc, r, o) => {
  P.ground(pc, 1, lawn(o.seed, 0.04));
  P.fenceBack(pc, 1, 1, 31, 31, 3.5, 0x3a8a4a, 'rail');
  hall(pc, 4, 4, 18, 14, 14, pick(r, [0xf0e0b0, 0xe8d0d0, 0xd0e0f0]), o.seed, { tex: 'plaster', floorH: 7, winW: 4, winH: 4, colW: 5.5, curtains: true, frame: 0xffffff, lit: 0.3, left: { doors: [{ u: 7, w: 3, h: 5, color: 0x3a6a3a }] } });
  P.playground(pc, 3, 20);
  // веранда
  box(pc, 24, 6, 0, 6, 10, 0.5, { top: 0xb08a5a, left: 0x8a6a4a, right: 0x7a5a3a });
  plane(pc, [23.5, 5.5, 5], [7, 0, 0], [0, 11, 0.5], (u) => (fl(u) % 2 ? 0x3a8ab0 : 0xe0c040));
  for (const [x, y] of [[24, 6], [30, 6], [24, 16], [30, 16]]) pole(pc, x, y, 0, 5, 0x8a6a4a);
  P.fenceFront(pc, 1, 1, 31, 31, 3.5, 0x3a8a4a, 'rail');
});
reg('e_school', 54, (pc, r, o) => {
  P.ground(pc, 2, lawn(o.seed, 0.02));
  // стадион у школы
  P.patch(pc, 34, 34, 26, 26, (u, v) => { const d = Math.max(Math.abs(u - 13) - 5, 0); const e = Math.hypot(d, (v - 13)); if (e > 9 && e < 12) return 0xb05a3a; return cmix(0x4a8a3a, 0x5a9a44, (fl(u / 3) & 1) * 0.6); });
  const c = pick(r, [0xe8d8b0, 0xd8c8a8, 0xf0e8d8]);
  hall(pc, 4, 4, 46, 16, 28, c, o.seed, { tex: 'silicate', floorH: 7, winW: 4, winH: 4, colW: 5, curtains: false, frame: 0xffffff, lit: 0.25, stripe: 0xc87050 });
  hall(pc, 4, 20, 14, 22, 21, c, o.seed + 1, { tex: 'silicate', floorH: 7, winW: 4, winH: 4, colW: 5, frame: 0xffffff, lit: 0.25, stripe: 0xc87050, left: { doors: [{ u: 5, w: 4, h: 6, glass: true }] } });
  P.sign3(pc, 20, 20.05, 22, 20, 4.6, 'ШКОЛА', 0x1a1a1a, 0xf0f0f0);
  P.flag(pc, 24, 26, 0, 12);
  P.tree(pc, 24, 40, 'birch', 1, o.seed); P.tree(pc, 10, 50, 'oak', 1, o.seed + 1); P.tree(pc, 26, 54, 'birch', 0.9, o.seed + 2);
  pole(pc, 40, 40, 0, 6, 0xf0f0f0); pole(pc, 54, 40, 0, 6, 0xf0f0f0); // ворота
});
reg('e_library', 36, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xc0b8a8, o.seed, 3));
  hall(pc, 4, 5, 22, 16, 15, 0xe8d8b8, o.seed, { tex: 'tile', floorH: 15, winW: 3, winH: 8, winY: 3, colW: 5, trim: 0xf8f0e0, lit: 0.6 });
  for (let i = 0; i < 4; i++) cyl(pc, 7 + i * 5.5, 23, 0, 1, 13, 0xf4f0e4, null);
  box(pc, 5, 21, 13, 21, 4, 2.5, { top: 0xf0ece0, left: (u, v) => { const m = textMask('КНИГИ', 21 / 2 - 9, -1.5); return m(u, v + 0) ? 0x6a4a2a : 0xf0ece0; }, right: 0xe0dcd0 });
  P.tree(pc, 29, 28, 'oak', 0.8, o.seed);
});
reg('e_college', 56, (pc, r, o) => {
  P.ground(pc, 2, lawn(o.seed, 0.02));
  P.patch(pc, 0, 40, 64, 23, pavement(0xb8b2a6, o.seed));
  hall(pc, 4, 6, 50, 18, 36, pick(r, [0xd8d0c0, 0xc8d0d0]), o.seed, { tex: 'panel', floorH: 7, winW: 4, winH: 4, colW: 5, stripe: 0x6a8ab0, lit: 0.45 });
  hall(pc, 30, 24, 22, 14, 14, 0xe0d8c8, o.seed + 1, { tex: 'tile', floorH: 7, winW: 5, winH: 4, colW: 6, left: { doors: [{ u: 8, w: 5, h: 6, glass: true }] } });
  P.sign3(pc, 8, 24.05, 30, 14, 5, 'ПТУ', 0xffffff, 0x2a4a8a);
  P.tree(pc, 8, 34, 'birch', 1, o.seed); P.tree(pc, 20, 48, 'poplar', 1, o.seed + 1);
  P.lamp(pc, 60, 60, 11);
});
reg('e_univ', 200, (pc, r, o) => {
  P.ground(pc, 3, lawn(o.seed, 0.02));
  P.patch(pc, 30, 70, 36, 25, pavement(0xc0b8a8, o.seed, 4));
  const c = 0xe8dcc0;
  const wl = { tex: 'tile', floorH: 8, winW: 3, winH: 5, colW: 5, trim: 0xf8f0e0, lit: 0.5, frame: 0xffffff };
  // крылья
  hall(pc, 6, 18, 26, 50, 34, c, o.seed, wl);
  hall(pc, 64, 18, 26, 50, 34, c, o.seed + 1, wl);
  // центральная высотка со шпилем
  hall(pc, 32, 14, 32, 40, 60, c, o.seed + 2, wl);
  const w2 = { base: c, tex: 'tile', floorH: 8, winW: 3, winH: 5, colW: 5, trim: 0xf8f0e0, lit: 0.5, frame: 0xffffff, seed: o.seed + 3 };
  P.bldg(pc, 38, 22, 60, 20, 24, 40, w2, { type: 'flat', color: 0x5a5a58 });
  P.bldg(pc, 42, 28, 100, 12, 12, 26, w2, { type: 'flat', color: 0x5a5a58 });
  lathe(pc, 48, 34, 126, 40, (t) => 3.6 * (1 - t), (psi, z) => cmix(0xd8b040, 0xfff0a0, hash2(fl(psi * 5), fl(z / 3), 1) * 0.4), null);
  lathe(pc, 48, 34, 150, 4, (t) => 2.2 * Math.sqrt(1 - (2 * t - 1) ** 2), () => 0xf0d050, null);
  P.sign3(pc, 36, 54.05, 30, 24, 6, 'УНИВЕРСИТЕТ', 0xd0a030, 0x7a2a1a);
  for (let i = 0; i < 4; i++) P.tree(pc, 10 + i * 6, 78 + (i % 2) * 6, 'oak', 1, o.seed + i);
  for (let i = 0; i < 3; i++) P.tree(pc, 74 + i * 6, 76 + (i % 2) * 8, 'birch', 1, o.seed + 10 + i);
  P.lamp(pc, 32, 92, 11); P.lamp(pc, 64, 92, 11);
});

// ======================= ОТДЫХ =======================
function pathLawn(seed, fn) { return (u, v) => (fn(u, v) ? pavement(0xc8b898, seed, 3)(u, v) : lawn(seed, 0.04)(u, v)); }
reg('l_square', 26, (pc, r, o) => {
  P.ground(pc, 1, pathLawn(o.seed, (u, v) => Math.abs(u - v) < 3 || Math.abs(u + v - 32) < 3));
  P.tree(pc, 6, 16, 'oak', 0.8, o.seed); P.tree(pc, 26, 16, 'birch', 0.9, o.seed + 1); P.tree(pc, 16, 4, 'poplar', 0.8, o.seed + 2);
  P.bench(pc, 12, 24, 'x'); P.lamp(pc, 20, 20, 9);
  P.tree(pc, 16, 28, 'bush', 1, o.seed + 3);
});
reg('l_play', 26, (pc, r, o) => {
  P.ground(pc, 1, (u, v) => (u > 3 && v > 3 && u < 29 && v < 29 ? cmix(0xd8c8a0, 0xc8b890, hash2(fl(u), fl(v), 1)) : lawn(o.seed)(u, v)));
  P.playground(pc, 4, 4);
  P.rocket(pc, 23, 22);
  P.bench(pc, 6, 26, 'x');
  P.fenceX(pc, 1, 31, 31, 2.5, 0x3a8a4a, 'rail');
});
reg('l_park', 40, (pc, r, o) => {
  P.ground(pc, 2, pathLawn(o.seed, (u, v) => { const d = Math.hypot(u - 32, v - 32); return Math.abs(d - 16) < 2 || (Math.abs(u - 32) < 2 && d > 16) || (Math.abs(v - 32) < 2 && d > 16); }));
  // пруд
  P.patch(pc, 24, 24, 16, 16, (u, v) => { const d = Math.hypot(u - 8, v - 8); if (d < 6.5) return water(o.seed)(u, v); if (d < 8) return 0xb8a888; return lawn(o.seed)(u, v); }, 0.05);
  const types = ['oak', 'birch', 'pine', 'poplar', 'oak'];
  const pts = [[6, 6], [14, 8], [8, 18], [50, 6], [58, 14], [52, 22], [6, 50], [16, 58], [56, 50], [50, 58], [22, 46], [44, 18]];
  for (let i = 0; i < pts.length; i++) P.tree(pc, pts[i][0], pts[i][1], types[i % 5], 0.9 + hash2(i, 1, o.seed) * 0.3, o.seed + i);
  // беседка
  for (const [x, y] of [[44, 42], [50, 42], [44, 48], [50, 48]]) pole(pc, x, y, 0, 6, 0xe8e0d0);
  hip(pc, 43, 41, 6, 8, 8, 4, roofMetal(0x3a6a4a), 0.5);
  P.bench(pc, 26, 12, 'x'); P.bench(pc, 12, 34, 'y');
  P.lamp(pc, 20, 32, 9); P.lamp(pc, 44, 32, 9); P.lamp(pc, 32, 20, 9);
});
reg('l_fountain', 30, (pc, r, o) => {
  P.ground(pc, 1, (u, v) => { const d = Math.hypot(u - 16, v - 16); return (fl(d / 2.5) % 2) ? 0xc8bca8 : 0xb0a490; });
  lathe(pc, 16, 16, 0, 2, () => 9, () => 0xd0c8b8, (dx, dy) => (dx * dx + dy * dy > 0.85 ? 0xe0d8c8 : (S.up = 0, cmix(0x3a8ab8, 0x8ac8e8, hash2(fl(dx * 12), fl(dy * 12), 2) * 0.6))));
  lathe(pc, 16, 16, 2, 5, (t) => 1.5 - t * 0.8, () => 0xd8d0c0, null);
  lathe(pc, 16, 16, 7, 1, () => 3.5, () => 0xd8d0c0, () => (S.up = 0, 0x7ab8e0));
  lathe(pc, 16, 16, 8, 4, (t) => 0.8 * (1 - t), () => 0xc0e0f8, null);
  P.lamp(pc, 3, 3, 9); P.lamp(pc, 29, 29, 9); P.lamp(pc, 3, 29, 9); P.lamp(pc, 29, 3, 9);
  P.bench(pc, 4, 26, 'x');
}, { fountain: [16, 16, 12] });
reg('l_monument', 50, (pc, r, o) => {
  P.ground(pc, 1, (u, v) => (Math.abs(u - 16) < 10 && Math.abs(v - 16) < 10 ? pavement(0xa8a090, o.seed, 4)(u, v) : lawn(o.seed, 0.06)(u, v)));
  box(pc, 11, 11, 0, 10, 10, 1, { top: 0x9a9088, left: 0x8a8078, right: 0x7a7068 });
  box(pc, 13, 13, 1, 6, 6, 9, { top: 0x6a5a5a, left: noisy(0x7a5a5a, 0.05), right: noisy(0x6a4a4a, 0.05) });
  // фигура
  const br = 0x4a5a4a;
  box(pc, 15, 15, 10, 2, 2, 7, { top: br, left: br, right: cmul(br, 0.8) });
  box(pc, 14.5, 14.5, 17, 3, 3, 6, { top: br, left: br, right: cmul(br, 0.8) });
  blob(pc, 16, 16, 25, 1.4, 1.6, (lf) => cmul(br, lf), 1);
  line3(pc, [17.5, 16, 22], [20, 14, 27], br); line3(pc, [17.5, 16.5, 22], [20, 14.5, 27], br);
  for (const [x, y] of [[8, 8], [24, 8], [8, 24], [24, 24]]) P.tree(pc, x, y, 'bush', 0.8, x + y);
});
reg('l_church', 90, (pc, r, o) => {
  P.ground(pc, 2, lawn(o.seed, 0.02));
  P.patch(pc, 14, 14, 36, 36, pavement(0xc0b8a8, o.seed, 4));
  const c = 0xf4f0e8;
  P.bldg(pc, 18, 20, 0, 26, 22, 22, { base: c, tex: 'plaster', floorH: 22, winW: 3, winH: 8, winY: 8, colW: 7, trim: 0xe8d8a8, lit: 0.6, seed: o.seed, left: { doors: [{ u: 11, w: 4, h: 9, color: 0x6a3a1a }] } }, { type: 'flat', color: 0x3a6a4a });
  // барабан и купола-луковицы
  const gold = (psi, z) => cmix(0xd8a830, 0xfff0a0, Math.max(0, Math.cos(psi + 0.8)) * 0.6);
  const onion = (t) => (t < 0.55 ? 3 + Math.sin(t / 0.55 * Math.PI * 0.5) * 3.4 : 6.4 * Math.cos((t - 0.55) / 0.45 * Math.PI * 0.5) ** 1.5);
  lathe(pc, 31, 31, 22, 12, () => 4, (psi, z) => (z > 26 && z < 31 && Math.abs(Math.sin(psi * 4)) < 0.4 ? 0x3a4a5a : c), null);
  lathe(pc, 31, 31, 34, 12, onion, gold, null);
  pole(pc, 31, 31, 46, 6, 0xd8b040); line3(pc, [29.5, 32.5, 50], [32.5, 29.5, 50], 0xd8b040);
  for (const [x, y] of [[22, 24], [40, 24], [22, 38], [40, 38]]) {
    lathe(pc, x, y, 22, 5, () => 2, () => c, null);
    lathe(pc, x, y, 27, 6, (t) => onion(t) * 0.45, (psi) => cmix(0x2a5aa0, 0x8ab0e0, Math.max(0, Math.cos(psi + 0.8)) * 0.5), null);
  }
  // колокольня
  box(pc, 26, 44, 0, 10, 8, 30, { top: null, left: (u, v) => (v > 22 && v < 28 && Math.abs(u - 5) < 2 ? 0x2a2a2a : c), right: c });
  lathe(pc, 31, 48, 30, 10, (t) => 4 * (1 - t), gold, null);
  for (let i = 0; i < 3; i++) P.tree(pc, 6 + i * 4, 52 + i * 3, 'birch', 1, o.seed + i);
});
reg('l_dk', 50, (pc, r, o) => {
  P.ground(pc, 2, pavement(0xc0b8a8, o.seed, 4));
  const c = pick(r, [0xf0e0b8, 0xe8d0c0, 0xe0e0d0]);
  P.bldg(pc, 6, 6, 0, 50, 30, 24, { base: c, tex: 'plaster', floorH: 12, winW: 3, winH: 7, colW: 6, trim: 0xf8f4e8, lit: 0.6, seed: o.seed, curtains: true }, { type: 'flat', color: 0x6a6a6a });
  // портик
  for (let i = 0; i < 6; i++) cyl(pc, 14 + i * 7, 40, 0, 1.4, 20, 0xf8f4ec, null);
  box(pc, 10, 36, 20, 40, 6, 4, { top: 0xf0ece0, left: (u, v) => { const m = textMask('ДОМ КУЛЬТУРЫ', 20 - 23, 0.5); return m(u, v) ? 0x8a2a1a : 0xf8f4ec; }, right: 0xe8e4d8 });
  gable(pc, 10, 36, 24, 40, 6, 4, 'x', { roof: 0x7a7a7a, gable: 0xf0ece0 }, 0.3);
  P.lamp(pc, 6, 56, 10); P.lamp(pc, 56, 56, 10);
  P.tree(pc, 4, 46, 'oak', 1, o.seed);
});
reg('l_stadium', 50, (pc, r, o) => {
  P.ground(pc, 3, pavement(0xb0a898, o.seed, 6));
  // поле
  P.patch(pc, 20, 20, 56, 56, (u, v) => {
    if (u < 4 || v < 4 || u > 52 || v > 52) return 0xb05a3a; // беговая дорожка
    if (Math.abs(u - 28) < 0.5 || Math.abs(Math.hypot(u - 28, v - 28) - 7) < 0.5 || (u < 4.6 || u > 51.4 || v < 4.6 || v > 51.4)) return 0xf0f0f0;
    return (fl(v / 4) & 1) ? 0x4a9a3a : 0x5aaa44;
  }, 0.05);
  // трибуны
  const stand = (u, v) => ((fl(v / 1.5) & 1) ? pick(r, [0xd02020, 0x2050c0]) && cmix(0xc0c0c0, 0x8a2020, (fl(u / 4) % 3 === 0) ? 0.4 : 0) : 0xa0a0a0);
  for (let k = 0; k < 6; k++) {
    box(pc, 6 + k * 2, 6, 0, 84 - k * 4, 2, 2 + k * 2, { top: (u, v) => (fl(u / 2) % 2 ? 0xd03030 : 0x3060c0), left: 0x9a9a9a, right: 0x8a8a8a });
    box(pc, 6, 6 + k * 2, 0, 2, 84 - k * 4, 2 + k * 2, { top: (u, v) => (fl(v / 2) % 2 ? 0xd03030 : 0x3060c0), left: 0x8a8a8a, right: 0x9a9a9a });
  }
  for (const [x, y] of [[4, 4], [92, 4], [4, 92], [92, 92]]) {
    pole(pc, x, y, 0, 40, 0x7a7a7a, 2);
    box(pc, x - 2, y - 2, 40, 4, 4, 3, { top: 0x5a5a5a, left: (u, v) => (S.glow = 0xffffff, 0xf0f0e0), right: (u, v) => (S.glow = 0xffffff, 0xf0f0e0) });
  }
});
reg('l_amuse', 100, (pc, r, o) => {
  P.ground(pc, 3, pathLawn(o.seed, (u, v) => Math.abs(u - 48) < 3 || Math.abs(v - 48) < 3 || Math.hypot(u - 48, v - 48) < 10));
  // колесо обозрения (статичная опора, колесо крутится в рендере)
  line3(pc, [26, 20, 0], [26, 26, 46], 0x8a8a8a); line3(pc, [26, 32, 0], [26, 26, 46], 0x8a8a8a);
  line3(pc, [27, 20, 0], [27, 26, 46], 0x6a6a6a); line3(pc, [27, 32, 0], [27, 26, 46], 0x6a6a6a);
  // карусель
  lathe(pc, 66, 66, 0, 1, () => 9, () => 0xc0b0a0, () => 0xe0d0b0);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; pole(pc, 66 + Math.cos(a) * 6, 66 + Math.sin(a) * 6, 1, 7, [0xd02020, 0xf0d020, 0x2060d0, 0x20a040][i % 4]); }
  lathe(pc, 66, 66, 8, 5, (t) => 9 * (1 - t), (psi) => ((fl((psi + 4) * 4) & 1) ? 0xd02020 : 0xf0f0f0), () => 0xd02020);
  // американские горки
  for (let i = 0; i < 20; i++) {
    const t = i / 20, x = 60 + Math.cos(t * Math.PI * 2) * 22, y = 24 + Math.sin(t * Math.PI * 2) * 12, z = 10 + Math.sin(t * Math.PI * 4) * 8;
    pole(pc, x, y, 0, z, 0x7a7a7a);
    const t2 = (i + 1) / 20, x2 = 60 + Math.cos(t2 * Math.PI * 2) * 22, y2 = 24 + Math.sin(t2 * Math.PI * 2) * 12, z2 = 10 + Math.sin(t2 * Math.PI * 4) * 8;
    line3(pc, [x, y, z], [x2, y2, z2], 0xd02020); line3(pc, [x, y, z + 1], [x2, y2, z2 + 1], 0xb01818);
  }
  for (const [x, y, c] of [[20, 70, 0xe04080], [30, 80, 0x40a0e0], [76, 36, 0xe0c020]]) {
    box(pc, x, y, 0, 6, 5, 5, { top: c, left: (u, v) => (v > 2 && v < 4 ? (S.glow = c, 0xffffff) : c), right: cmul(c, 0.85) });
  }
  P.tree(pc, 8, 40, 'oak', 1, o.seed); P.tree(pc, 40, 88, 'birch', 1, o.seed + 1); P.tree(pc, 88, 60, 'oak', 1, o.seed + 2);
  for (let i = 0; i < 4; i++) P.lamp(pc, 38 + i * 6, 52, 10);
}, { ferris: [26, 26, 26, 20] });
reg('l_tvtower', 330, (pc, r, o) => {
  P.ground(pc, 2, lawn(o.seed, 0.02));
  P.patch(pc, 16, 16, 32, 32, pavement(0xc0b8a8, o.seed, 4));
  // ствол
  lathe(pc, 32, 32, 0, 30, (t) => 12 - t * 7, (psi, z) => cmul(0xe8e4dc, 0.95 + hash2(fl(psi * 6), fl(z / 5), 1) * 0.06), null);
  lathe(pc, 32, 32, 30, 190, (t) => 5 - t * 3, (psi, z) => (fl(z / 30) % 2 && z > 120 ? 0xe8e4dc : cmul(0xe8e4dc, 0.97)), null);
  // «шайба» с рестораном
  lathe(pc, 32, 32, 150, 12, (t) => 9 - Math.abs(t - 0.5) * 6, (psi, z) => (z > 154 && z < 159 ? (S.glow = WARM[3], 0x5a7a9a) : 0xd8d4cc), () => 0xc8c4bc);
  // антенна
  lathe(pc, 32, 32, 220, 90, (t) => 1.6 - t * 1.4, (psi, z) => ((fl(z / 8) & 1) ? 0xd02020 : 0xf0f0f0), null);
  pc.dot(32, 32, 312, 0xff2020, 0xff2020);
  pc.dot(32, 32, 260, 0xff2020, 0xff2020);
});

// ======================= АДМИНИСТРАЦИЯ И СВЯЗЬ =======================
reg('a_council', 40, (pc, r, o) => {
  P.ground(pc, 1, lawn(o.seed, 0.03));
  P.patch(pc, 0, 24, 32, 7, pavement(0xc0b8a8, o.seed));
  P.bldg(pc, 4, 5, 0, 24, 16, 15, { base: pick(r, [0xe8d8b0, 0xd8e0e8]), floorH: 7.5, winW: 3, winH: 4, colW: 5, trim: 0xffffff, lit: 0.4, seed: o.seed, frame: 0xffffff, curtains: true, left: { doors: [{ u: 10.5, w: 3, h: 6, color: 0x6a3a1a, light: true }] } }, { type: 'hip', rh: 5, mat: 'metal', color: 0x3a6a4a });
  P.flag(pc, 16, 13, 20, 10);
  P.bench(pc, 4, 27, 'x'); P.lamp(pc, 28, 28, 9);
});
reg('a_cityhall', 120, (pc, r, o) => {
  P.ground(pc, 3, pavement(0xc8c0b0, o.seed, 5));
  P.patch(pc, 8, 74, 80, 18, lawn(o.seed, 0.06));
  const c = 0xece4d0;
  hall(pc, 8, 10, 80, 40, 36, c, o.seed, { tex: 'tile', floorH: 9, winW: 3, winH: 6, colW: 5, trim: 0xf8f4e8, lit: 0.55, frame: 0xffffff, curtains: true });
  for (let i = 0; i < 8; i++) cyl(pc, 22 + i * 7.5, 55, 0, 1.6, 26, 0xf8f4ec, null);
  box(pc, 18, 50, 26, 60, 8, 5, { top: 0xf0ece0, left: (u, v) => { const m = textMask('МЭРИЯ', 30 - 11, 0); return m(u, v) ? 0x8a6a2a : 0xf4f0e8; }, right: 0xe8e4d8 });
  // часовая башня
  box(pc, 40, 22, 36, 16, 16, 34, { top: null, left: (u, v) => { const d = Math.hypot(u - 8, v - 24); if (d < 5) return d > 4.3 ? 0x3a3a3a : (S.glow = 0xfff8d8, 0xf8f4e8); return c; }, right: (u, v) => { const d = Math.hypot(u - 8, v - 24); if (d < 5) return d > 4.3 ? 0x3a3a3a : (S.glow = 0xfff8d8, 0xf8f4e8); return cmul(c, 0.97); } });
  hip(pc, 40, 22, 70, 16, 16, 12, roofMetal(0x3a6a5a), 1);
  P.flag(pc, 48, 30, 82, 12);
  for (let i = 0; i < 4; i++) P.lamp(pc, 14 + i * 22, 70, 11);
  for (let i = 0; i < 3; i++) P.tree(pc, 18 + i * 28, 84, 'oak', 1, o.seed + i);
});
reg('c_post', 30, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xb8b2a6, o.seed));
  hall(pc, 4, 5, 22, 16, 11, 0xe8e4dc, o.seed, { tex: 'tile', floorH: 11, winW: 4, winH: 5, winY: 3, colW: 6, stripe: 0x2a5aa0, left: { doors: [{ u: 9, w: 3.5, h: 6.5, glass: true }] } });
  P.sign3(pc, 6, 21.05, 7.5, 18, 3.4, '', 0xffffff, 0x2a5aa0);
  P.sign3(pc, 26.05, 8, 5, 10, 5, 'ПОЧТА', 0xffffff, 0x2a5aa0, 'y');
  box(pc, 27, 24, 0, 2.5, 2, 4, { top: 0x2a5aa0, left: 0x3a6ab0, right: 0x2a5aa0 }); // почтовый ящик
  P.car(pc, 14, 28, 0, 'rafik', 0x3a6ab0);
});
reg('c_ats', 80, (pc, r, o) => {
  P.ground(pc, 1, asphalt(0x5e5e5a, o.seed));
  hall(pc, 3, 8, 18, 18, 18, 0xc8b8a0, o.seed, { tex: 'brick', floorH: 9, winW: 3, winH: 4, colW: 5 });
  P.sign3(pc, 6, 26.05, 10, 12, 5, 'АТС', 0xffffff, 0x8a3a1a);
  // мачта
  for (let k = 0; k < 4; k++) { const [dx, dy] = [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]][k]; line3(pc, [26 + dx * 2, 12 + dy * 2, 0], [26 + dx * 0.4, 12 + dy * 0.4, 62], 0xa04030); }
  for (let z = 6; z < 60; z += 6) line3(pc, [26 - 2, 12, z], [26 + 2, 12, z + 3], 0xa0a0a0);
  pc.dot(26, 12, 64, 0xff2020, 0xff2020);
  for (const z of [30, 46]) blob(pc, 27, 13, z, 1.6, 1.6, (lf) => cmul(0xf0f0f0, Math.min(1.1, lf)), z);
});

// ======================= ТРАНСПОРТ =======================
reg('tr_stop', 26, (pc, r, o) => {
  P.ground(pc, 1, lawn(o.seed, 0.02));
  P.patch(pc, 2, 16, 28, 14, pavement(0xb0aaa0, o.seed));
  // советская остановка с мозаикой
  box(pc, 6, 16, 0, 18, 1.5, 10, { top: 0xb8b4ac, left: (u, v) => (v > 2 ? [0xd04030, 0x3060c0, 0xe0c040, 0x40a060, 0xf0f0f0][(fl(u / 2) + fl(v / 2) * 3) % 5] : 0x9a9a94), right: 0x9a9a94 });
  box(pc, 6, 16, 0, 1.5, 7, 10, { top: 0xb8b4ac, left: 0xa8a49c, right: 0x9a9690 });
  plane(pc, [5, 15, 10], [20, 0, 0], [0, 9, 0], 0xb0aca4);
  P.bench(pc, 10, 19, 'x');
  pole(pc, 27, 26, 0, 9, 0x5a5a5a);
  box(pc, 25.6, 25.6, 8, 2.8, 0.6, 2.6, { top: 0xf0d020, left: (u, v) => (Math.abs(u - 1.4) < 0.6 && v > 0.4 && v < 2.2 ? 0x1a1a1a : 0xf0d020), right: 0xd0b010 });
});
reg('tr_station', 46, (pc, r, o) => {
  P.ground(pc, 2, asphalt(0x55565a, o.seed));
  hall(pc, 4, 4, 32, 18, 16, 0xe0d8c8, o.seed, { tex: 'tile', floorH: 8, winW: 5, winH: 4, colW: 6, stripe: 0x3a8a6a, left: { doors: [{ u: 13, w: 6, h: 7, glass: true }] } });
  P.sign3(pc, 6, 22.05, 9, 28, 5, 'АВТОВОКЗАЛ', 0xffffff, 0x3a8a6a);
  // навес платформ
  for (let i = 0; i < 4; i++) pole(pc, 42, 6 + i * 16, 0, 8, 0x8a8a8a);
  plane(pc, [40, 4, 8], [6, 0, 0], [0, 56, 0], (u, v) => (fl(v / 3) % 2 ? 0x3a8a6a : 0x4a9a7a));
  P.car(pc, 52, 14, 1, 'ikarus'); P.car(pc, 52, 40, 1, 'bus'); P.car(pc, 20, 40, 0, 'bus', 0xd8d8c0);
  P.lamp(pc, 4, 60, 11);
});
reg('tr_rail', 60, (pc, r, o) => {
  P.ground(pc, 3, (u, v) => (v > 56 ? asphalt(0x5e5e5a, o.seed)(u, v) : pavement(0xb8b0a0, o.seed, 4)(u, v)));
  // пути
  for (const y of [64, 78]) P.patch(pc, 0, y, 96, 10, (u, v) => { if (Math.abs(v - 3) < 0.6 || Math.abs(v - 7) < 0.6) return 0x9a9aa0; if (fl(u) % 2 === 0 && v > 1.5 && v < 8.5) return 0x5a4030; return cmix(0x6a6258, 0x8a8278, hash2(fl(u), fl(v), 3)); }, 0.05);
  // вокзал
  const c = pick(r, [0xe8d098, 0xd8e0c8, 0xe0c8b0]);
  hall(pc, 10, 10, 70, 30, 22, c, o.seed, { tex: 'plaster', floorH: 11, winW: 4, winH: 7, colW: 6, trim: 0xf8f4ec, frame: 0xffffff, lit: 0.6 });
  box(pc, 38, 16, 22, 14, 14, 14, { top: null, left: (u, v) => { const d = Math.hypot(u - 7, v - 7); if (d < 4) return d > 3.3 ? 0x3a3a3a : (S.glow = 0xfff8d8, 0xf8f4e8); return c; }, right: cmul(c, 0.97) });
  hip(pc, 38, 16, 36, 14, 14, 8, roofMetal(0x3a6a5a), 1);
  P.sign3(pc, 20, 40.05, 12, 50, 6, 'ВОКЗАЛ', 0xffffff, 0x3a6a5a);
  // платформа
  box(pc, 4, 72, 0, 88, 5, 1.6, { top: 0xc0b8a8, left: 0xa8a090, right: 0x989080 });
  // электричка
  for (let i = 0; i < 4; i++) box(pc, 4 + i * 22, 79, 1, 20, 6, 8, { top: 0x8a8a8a, left: (u, v) => { if (v > 4.5 && v < 7 && fl(u) % 3) { S.glow = 0xfff0b0; return 0x5a7a9a; } if (v > 2 && v < 3) return 0xe0c040; return 0x3a7a4a; }, right: (u, v) => (i === 3 && v > 4.5 && v < 7 ? 0x5a7a9a : 0x2a6a3a) });
  P.lamp(pc, 20, 74, 10); P.lamp(pc, 60, 74, 10);
});
reg('tr_airport', 90, (pc, r, o) => {
  P.ground(pc, 4, lawn(o.seed, 0.01, 0.3));
  // ВПП
  P.patch(pc, 0, 74, 128, 22, (u, v) => { if (Math.abs(v - 11) < 0.6 && fl(u / 6) % 2) return 0xf0f0f0; if (v < 1 || v > 21) return 0xf0f0f0; return asphalt(0x4a4a4e, 3)(u, v); }, 0.05);
  P.patch(pc, 60, 40, 60, 34, asphalt(0x55565a, o.seed), 0.05);
  // терминал
  box(pc, 8, 10, 0, 56, 26, 18, { top: flatRoof(0x6a6a6a, 56, 26), left: (u, v) => (v > 3 && v < 15 && fl(u) % 4 ? (S.glow = WARM[3], cmix(0x2a5a7a, 0xb0d0e8, v / 20)) : 0xd8d8d4), right: (u, v) => (v > 3 && v < 15 && fl(u) % 4 ? cmix(0x2a5a7a, 0xb0d0e8, v / 20) : 0xc8c8c4) });
  P.sign3(pc, 16, 36.05, 18, 40, 7, 'АЭРОПОРТ', 0xffffff, 0x2a4a8a);
  // диспетчерская вышка
  lathe(pc, 80, 18, 0, 40, () => 3, () => 0xe0e0dc, null);
  lathe(pc, 80, 18, 40, 7, (t) => 5 + t * 1.5, (psi, z) => (S.glow = 0x80c0ff, cmix(0x3a6a8a, 0xa0d0f0, 0.4)), () => 0x6a6a6a);
  // самолёт
  const px = 92, py = 56;
  box(pc, px - 18, py - 2.2, 4, 36, 4.4, 4.4, { top: 0xf0f0f0, left: (u, v) => (v > 2.5 && v < 3.2 && fl(u) % 2 ? 0x3a4a6a : (v < 2 ? 0x2a5aa0 : 0xf0f0f0)), right: 0xe0e0e0 });
  plane(pc, [px - 4, py - 16, 5], [8, 0, 0], [-2, 32, 0], 0xd8d8d8);
  plane(pc, [px - 17, py - 6, 7], [4, 0, 0], [0, 12, 0], 0xd0d0d0);
  plane(pc, [px - 18, py, 8], [4, 0, 0], [0, 0, 7], 0x2a5aa0);
  for (let i = 0; i < 5; i++) P.lamp(pc, 66 + i * 12, 38, 11);
  P.car(pc, 70, 50, 0, 'bus', 0xe0e0e0);
});

export {};
