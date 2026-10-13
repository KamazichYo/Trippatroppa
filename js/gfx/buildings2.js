// Многоэтажное жильё и коммерция.
import { plane, box, gable, hip, lathe, cyl, blob, line3, pole, S } from '../engine/pixel.js';
import { hash2, cmul, cmix, pick } from '../engine/util.js';
import { wall, flatRoof, solid, noisy, lawn, pavement, asphalt, parking, pal, WARM, TV } from './materials.js';
import * as P from './props.js';
import { reg } from './buildings.js';
import { textMask, textWidth } from '../engine/font.js';

const fl = Math.floor;
const BALC = [0xd8d4c8, 0xa8b8c8, 0xc8a888, 0x9ab08a, 0xe0d0a0, 0xb8b8b8, 0x88a0b8];

// двор: газон + асфальтовая дорожка спереди
function yard(pc, s, seed, frontY = 22) {
  P.ground(pc, s, lawn(seed, 0.01, 0.2));
  P.patch(pc, 0, frontY, 32 * s, 32 * s - frontY - 2, asphalt(0x5a5b5e, seed));
}

// Многоквартирный дом
function apt(pc, r, o, c) {
  const floorH = c.floorH ?? 6;
  const h = c.floors * floorH + 2;
  const n = c.ent ?? 2;
  const doors = [];
  for (let i = 0; i < n; i++) doors.push({ u: (i + 0.5) * c.sx / n - 1.5, w: 3, h: 5, color: 0x4a3a2a, light: true });
  P.bldg(pc, c.x, c.y, 0, c.sx, c.sy, h, {
    base: c.base, tex: c.tex ?? 'panel', floorH, winW: c.winW ?? 3, winH: c.winH ?? 3, winY: c.winY ?? 2, colW: c.colW ?? 5, margin: c.margin ?? 1.5,
    lit: c.lit ?? 0.42, seed: o.seed, glass: c.glass, balcony: c.balcony === false ? null : { every: c.balcEvery ?? 2, colors: c.balcColors ?? BALC },
    stripe: c.stripe, panelW: c.panelW ?? 10, trim: c.trim, plinth: c.plinth ?? 0x7a7a74, frame: c.frame ?? -1,
    left: { doors }, right: c.rightDoors ? { doors: c.rightDoors } : undefined,
  }, c.roof ?? { type: 'flat', color: 0x5a5a5a });
  if (!c.noCanopy) for (const d of doors) box(pc, c.x + d.u - 0.6, c.y + c.sy, 5.2, 4.2, 2.2, 0.6, { top: 0x9a9a94, left: 0x7a7a74, right: 0x6a6a64 });
  if (c.roof && c.roof.type !== 'flat') return h;
  // крыша: машинное отделение лифта, антенны
  if (c.lift) for (let i = 0; i < n; i++) box(pc, c.x + (i + 0.5) * c.sx / n - 2, c.y + c.sy / 2 - 2, h, 4, 4, 3, { top: 0x6a6a68, left: cmul(c.base, 0.95), right: cmul(c.base, 0.85) });
  const na = c.antennas ?? 3;
  for (let i = 0; i < na; i++) P.antenna(pc, c.x + 2 + r() * (c.sx - 4), c.y + 2 + r() * (c.sy - 4), h, 4 + r() * 3);
  if (r() < 0.4) P.dish(pc, c.x + 3 + r() * (c.sx - 6), c.y + c.sy - 2, h);
  return h;
}

// ======================= СРЕДНЯЯ ПЛОТНОСТЬ =======================
reg('r2_barrack', 40, (pc, r, o) => {
  P.ground(pc, 1, (u, v) => (hash2(fl(u / 3), fl(v / 3), o.seed) < 0.3 ? cmix(0x8a6c48, 0x6a8a40, hash2(fl(u), fl(v), 2)) : lawn(o.seed, 0.01, 0.4)(u, v)));
  P.shed(pc, 3, 3, 10, 5, 5, 0x6a5a40, 0x7a7e7c);
  P.tree(pc, 26, 4, 'poplar', 1, o.seed);
  const base = pick(r, [0xd8c088, 0xc8b898, 0xb8a888, 0xd0b078]);
  apt(pc, r, o, { x: 4, y: 10, sx: 24, sy: 11, floors: 2, floorH: 7, tex: r() < 0.5 ? 'wood' : 'plaster', base, winW: 3, winH: 4, colW: 5, ent: 2, balcony: false, noCanopy: true, antennas: 2, frame: 0xe8e8e0, lit: 0.5,
    roof: { type: 'gable', axis: 'x', rh: 6, mat: 'slate', color: pick(r, pal.slate) } });
  P.chimney(pc, 10, 14, 20, 2, 4); P.chimney(pc, 20, 14, 20, 2, 4);
  // бельё
  pole(pc, 6, 26, 0, 6, 0x6a6a6a); pole(pc, 16, 26, 0, 6, 0x6a6a6a);
  line3(pc, [6, 26, 6], [16, 26, 6], 0x9a9a9a);
  for (let i = 0; i < 4; i++) plane(pc, [7 + i * 2.2, 26, 3.5], [1.6, 0, 0], [0, 0, 2.4], pick(r, [0xf0f0f0, 0xd04040, 0x4060c0, 0xe0d040]));
  P.bench(pc, 20, 24, 'x');
  P.tree(pc, 28, 28, 'oak', 0.8, o.seed + 1);
});

reg('r2_khrush', 52, (pc, r, o) => {
  yard(pc, 1, o.seed, 23);
  P.tree(pc, 3, 4, 'poplar', 1.1, o.seed); P.tree(pc, 28, 3, 'poplar', 1, o.seed + 1);
  const silic = r() < 0.5;
  apt(pc, r, o, { x: 3, y: 8, sx: 26, sy: 12, floors: 5, floorH: 6, tex: silic ? 'silicate' : 'panel', base: silic ? 0xe4e0d6 : pick(r, pal.panel), ent: 3, colW: 4.3, winW: 3, winH: 3, lit: 0.45, antennas: 4 });
  P.bench(pc, 6, 25.5, 'x'); P.bench(pc, 20, 25.5, 'x');
  if (r() < 0.6) P.car(pc, 14, 28, 0, pick(r, ['lada', 'moskvich', 'zaz']), pick(r, pal.car));
  P.tree(pc, 30, 24, 'bush', 1, o.seed + 2);
});

reg('r2_brick4', 52, (pc, r, o) => {
  yard(pc, 1, o.seed, 23);
  P.tree(pc, 4, 4, 'oak', 1, o.seed);
  apt(pc, r, o, { x: 4, y: 8, sx: 24, sy: 13, floors: 4, floorH: 7, tex: 'brick', base: pick(r, pal.brick), ent: 2, colW: 5, winW: 3, winH: 4, lit: 0.45, frame: 0xe8e4dc, balcEvery: 3,
    roof: { type: 'hip', rh: 6, mat: 'metal', color: pick(r, [0x4a6a4a, 0x6a6a6a, 0x8a3a2a]) } });
  P.antenna(pc, 12, 14, 34, 5); P.antenna(pc, 20, 15, 34, 5);
  P.bench(pc, 9, 25.5, 'x');
  P.tree(pc, 28, 28, 'bush', 1, o.seed + 1);
});

reg('r2_town', 50, (pc, r, o) => {
  P.ground(pc, 1, lawn(o.seed, 0.03));
  P.patch(pc, 0, 26, 32, 5, pavement(0xb8b2a6, o.seed));
  for (let i = 0; i < 3; i++) {
    const base = pick(r, pal.pastel);
    P.bldg(pc, 3 + i * 9, 8, 0, 9, 14, 20, { base, floorH: 7, winW: 3, winH: 4, winY: 2.5, colW: 5, margin: 1.5, lit: 0.5, seed: o.seed + i, frame: 0xffffff, trim: 0xf0f0f0,
      left: { door: { u: 3, w: 3, color: pick(r, [0x8a2020, 0x204a8a, 0x2a5a2a]) } } },
      { type: 'gable', axis: 'y', rh: 7, mat: 'tiles', color: pick(r, pal.roofTile) });
    P.tree(pc, 6 + i * 9, 25, 'bush', 0.8, o.seed + i);
  }
  P.fenceX(pc, 0, 32, 30.5, 2.5, 0x303030, 'rail');
  if (r() < 0.6) P.car(pc, 26, 28, 0, 'volga', pick(r, pal.car));
});

reg('r2_stalin', 54, (pc, r, o) => {
  yard(pc, 1, o.seed, 24);
  P.tree(pc, 3, 3, 'oak', 1.1, o.seed); P.tree(pc, 28, 4, 'oak', 1, o.seed + 1);
  const base = pick(r, [0xe0c070, 0xe8b8a0, 0xd8c8a0, 0xc8a878]);
  const h = 4 * 8 + 2;
  P.bldg(pc, 3, 8, 0, 26, 14, h, { base, floorH: 8, winW: 3, winH: 5, winY: 2, colW: 5, margin: 2, lit: 0.45, seed: o.seed, frame: 0xf4f0e8, trim: 0xf4f0e8, stripe: 0xece6d8, plinth: 0x8a7a6a,
    left: { doors: [{ u: 5, w: 3, h: 6, color: 0x4a2a1a, light: true }, { u: 18, w: 3, h: 6, color: 0x4a2a1a, light: true }] } },
    { type: 'hip', rh: 6, mat: 'metal', color: 0x6a6e6c });
  // эркеры/пилястры
  for (const u of [11, 14]) box(pc, 3 + u, 22, 0, 1.4, 0.8, h - 1, { top: 0xf0ece4, left: 0xf0ece4, right: 0xe0dcd4 });
  P.antenna(pc, 10, 14, h + 4, 5); P.antenna(pc, 20, 15, h + 4, 5);
  P.bench(pc, 9, 26, 'x');
  P.lamp(pc, 28, 28, 10);
});

// ======================= ВЫСОКАЯ ПЛОТНОСТЬ =======================
reg('r3_panel9', 72, (pc, r, o) => {
  yard(pc, 1, o.seed, 23);
  P.tree(pc, 3, 3, 'poplar', 1.2, o.seed); P.tree(pc, 29, 3, 'poplar', 1.1, o.seed + 1);
  apt(pc, r, o, { x: 3, y: 8, sx: 26, sy: 12, floors: 9, floorH: 6, tex: 'panel', base: pick(r, pal.panel), ent: 3, colW: 4.3, lift: true, lit: 0.42, antennas: 5, panelW: 8.6 });
  P.bench(pc, 6, 25.5, 'x');
  for (let i = 0; i < 2; i++) if (r() < 0.6) P.car(pc, 10 + i * 12, 28.5, i ? 0 : 2, pick(r, ['lada', 'moskvich', 'volga', 'zaz']), pick(r, pal.car));
});

reg('r3_panel12', 90, (pc, r, o) => {
  yard(pc, 1, o.seed, 24);
  P.tree(pc, 4, 3, 'poplar', 1.2, o.seed);
  apt(pc, r, o, { x: 5, y: 7, sx: 22, sy: 14, floors: 12, floorH: 6, tex: 'panel', base: pick(r, [0xe0dcd0, 0xd0d4d8, 0xd8ccc0]), ent: 2, colW: 4.4, lift: true, lit: 0.42, antennas: 4, panelW: 8.8,
    stripe: r() < 0.5 ? pick(r, [0x8a3a3a, 0x3a5a8a, 0x5a7a4a]) : undefined });
  P.playground(pc, 20, 25);
  if (r() < 0.6) P.car(pc, 8, 28.5, 0, pick(r, ['lada', 'volga']), pick(r, pal.car));
});

reg('r3_tower16', 118, (pc, r, o) => {
  yard(pc, 1, o.seed, 26);
  const base = pick(r, [0xe8e8e8, 0xe0e4e8, 0xece4d8]);
  const accent = pick(r, [0x3a6ab0, 0xb04a3a, 0x3a8a6a, 0xd09030]);
  const h = 16 * 6 + 2;
  P.bldg(pc, 7, 6, 0, 18, 18, h, { base, tex: 'panel', floorH: 6, winW: 3, winH: 3, winY: 2, colW: 4.4, margin: 1, lit: 0.4, seed: o.seed, panelW: 9, balcony: { every: 2, colors: [accent, cmix(accent, 0xffffff, 0.3)] },
    left: { doors: [{ u: 7.5, w: 3, h: 5, color: 0x3a3a3a, light: true }] } }, { type: 'flat', color: 0x585858 });
  // угловые полосы
  box(pc, 24.2, 23.2, 2, 0.8, 0.8, h - 3, { top: accent, left: accent, right: cmul(accent, 0.85) });
  box(pc, 12, 9, h, 8, 8, 5, { top: 0x6a6a6a, left: cmul(accent, 0.9), right: cmul(accent, 0.75) });
  P.antenna(pc, 9, 9, h, 6); P.antenna(pc, 22, 20, h, 5);
  box(pc, 13.5, 24, 5.2, 5, 2.2, 0.6, { top: 0x9a9a94, left: 0x7a7a74, right: 0x6a6a64 });
  P.tree(pc, 3, 4, 'birch', 1, o.seed); P.tree(pc, 3, 20, 'birch', 0.9, o.seed + 2);
  P.lamp(pc, 28, 28, 10);
});

reg('r3_elite', 112, (pc, r, o) => {
  P.ground(pc, 1, lawn(o.seed, 0.01));
  P.patch(pc, 0, 25, 32, 6, pavement(0xc8bca8, o.seed, 3));
  const base = pick(r, [0xd8c0a0, 0xc8a080, 0xe0d0b8]);
  const brick = pick(r, [0xa8483a, 0x8a3a30]);
  const h = 14 * 6.5 + 2;
  P.bldg(pc, 6, 6, 0, 20, 17, h, { base, tex: 'tile', floorH: 6.5, winW: 4, winH: 4, winY: 1.5, colW: 5, margin: 1.5, lit: 0.5, seed: o.seed, frame: 0xffffff, stripe: brick, trim: brick, glass: 0x305070,
    left: { doors: [{ u: 8, w: 4, h: 6, glass: true }] } }, { type: 'flat', color: 0x5a5a5a });
  // эркеры
  for (const u of [3, 14]) box(pc, 6 + u, 23, 6.5, 3, 1.4, h - 9, { top: brick, left: (uu, v) => ((fl(v / 6.5) % 1 === 0 && (v % 6.5) > 1.5 && (v % 6.5) < 5.5) ? (S.glow = WARM[fl(v) % 5], 0x305070) : brick), right: cmul(brick, 0.85) });
  // мансарда-башенка
  hip(pc, 10, 10, h, 12, 9, 8, (u, v) => cmul(0x2a5a4a, (fl(u) & 1) ? 0.9 : 1.03), 0.5);
  P.dish(pc, 22, 9, h); P.dish(pc, 8, 20, h);
  P.lamp(pc, 3, 28, 10); P.lamp(pc, 29, 28, 10);
  P.car(pc, 26, 28.5, 2, 'merc'); P.tree(pc, 3, 3, 'pine', 1, o.seed);
});

reg('r3_long', 86, (pc, r, o) => {
  P.ground(pc, 2, lawn(o.seed, 0.01, 0.2));
  P.patch(pc, 0, 56, 64, 7, asphalt(0x5a5b5e, o.seed));
  P.patch(pc, 56, 0, 7, 56, asphalt(0x5a5b5e, o.seed + 1));
  const base = pick(r, pal.panel);
  const accent = pick(r, [0x8a3a3a, 0x3a5a8a, 0x5a7a4a, 0x9a7a3a]);
  // корпус А (сзади, вдоль x)
  apt(pc, r, o, { x: 3, y: 4, sx: 50, sy: 12, floors: 10, floorH: 6, base, ent: 4, colW: 4.2, lift: true, lit: 0.42, antennas: 6, panelW: 8.4, stripe: accent });
  // двор
  P.playground(pc, 12, 28); P.rocket(pc, 30, 34);
  P.tree(pc, 6, 22, 'poplar', 1.1, o.seed); P.tree(pc, 6, 46, 'birch', 1, o.seed + 1); P.tree(pc, 38, 24, 'oak', 1, o.seed + 2);
  P.bench(pc, 20, 22, 'x'); P.bench(pc, 26, 44, 'x');
  // гаражи-«ракушки»
  for (let i = 0; i < 3; i++) box(pc, 4 + i * 6, 50, 0, 5, 4, 3.5, { top: (u, v) => cmul(0x6a7a7a, 1 - v * 0.03), left: pick(r, [0x5a6a6a, 0x6a6a5a, 0x4a5a6a]), right: 0x4a5050 });
  // корпус Б (справа, вдоль y)
  apt(pc, r, o, { x: 42, y: 20, sx: 12, sy: 34, floors: 10, floorH: 6, base, ent: 1, colW: 4.2, lift: true, lit: 0.42, antennas: 3, panelW: 8.4, stripe: accent,
    rightDoors: [{ u: 6, w: 3, h: 5, color: 0x4a3a2a, light: true }, { u: 22, w: 3, h: 5, color: 0x4a3a2a, light: true }] });
  for (let i = 0; i < 4; i++) P.car(pc, 8 + i * 11, 60, i & 1 ? 0 : 2, pick(r, ['lada', 'moskvich', 'volga', 'zaz', 'niva']), pick(r, pal.car));
  P.lamp(pc, 60, 60, 11);
});

reg('r3_complex', 160, (pc, r, o) => {
  P.ground(pc, 2, pavement(0xc0b8a8, o.seed, 4));
  P.patch(pc, 8, 30, 22, 22, lawn(o.seed, 0.03));
  const cols = [[0xe8e0d0, 0xc0503a], [0xe0e4ec, 0x3a6ab0], [0xf0e8d8, 0xd09030]];
  const towers = [[4, 4, 20, 22], [36, 6, 20, 19], [34, 36, 17, 18]];
  towers.forEach(([x, y, f, sz], i) => {
    const [base, acc] = cols[i % 3];
    const h = f * 6 + 2;
    P.bldg(pc, x, y, 0, sz, sz, h, { base, tex: 'tile', floorH: 6, winW: 4, winH: 4, winY: 1, colW: 5, margin: 1, lit: 0.45, seed: o.seed + i, glass: 0x2a5070, stripe: acc, frame: 0xffffff,
      left: { doors: [{ u: sz / 2 - 2, w: 4, h: 6, glass: true }] } }, { type: 'flat', color: 0x505050 });
    hip(pc, x + 2, y + 2, h, sz - 4, sz - 4, 7, (u, v) => cmul(acc, (fl(u) & 1) ? 0.92 : 1.02), 0.5);
    if (i === 0) { P.tree(pc, 12, 36, 'oak', 1, o.seed); P.tree(pc, 22, 46, 'birch', 1, o.seed + 1); P.bench(pc, 14, 44, 'x'); }
  });
  P.lamp(pc, 6, 60, 11); P.lamp(pc, 30, 60, 11);
  for (let i = 0; i < 3; i++) P.car(pc, 54 + (i % 2) * 6, 30 + i * 9, 1, pick(r, ['merc', 'volga', 'lada']), pick(r, pal.car));
});

// ======================= КОММЕРЦИЯ =======================
function shop(pc, r, o, c) {
  // одноэтажный магазин с витринами и вывеской
  const h = c.h ?? 14;
  P.bldg(pc, c.x, c.y, 0, c.sx, c.sy, h, {
    base: c.base, tex: c.tex ?? 'tile', ground: h, groundStyle: 'shop', colW: c.colW ?? 6, winW: c.winW ?? 5, margin: 1.5, seed: o.seed, shopFrame: c.frame ?? 0x3a3a3a,
    left: { sign: c.sign, doors: c.doors ?? [{ u: c.sx - 6, w: 3.5, h: 6, glass: true }] },
    right: c.sign2 ? { sign: c.sign2 } : {},
  }, { type: 'flat', color: c.roof ?? 0x5e5e5e });
  return h;
}
function awning(pc, x, y, z, w, d, c1, c2, axis = 'x') {
  const sh = (u) => (fl(u / 2) & 1 ? c1 : c2);
  if (axis === 'x') plane(pc, [x, y, z], [w, 0, 0], [0, d, -2], sh);
  else plane(pc, [x, y, z], [0, w, 0], [d, 0, -2], sh);
}
function kiosk(pc, x, y, text, col, base) {
  const tw = textWidth(text);
  const fits = text.length > 0 && tw <= 7;
  const m = textMask(text, (8 - tw) / 2, 6.8);
  const front = (u, v) => {
    if (v > 6 && v < 12.5) {
      if (fits) { if (m(u, v)) { S.glow = col; return col; } return 0x222222; }
      if (v > 7 && v < 11.5 && u > 0.8 && u < 7.2) { S.glow = col; return (fl(u) + fl(v)) % 4 === 0 ? 0xffffff : col; }
      return 0x222222;
    }
    if (v > 2 && v < 5.5 && u > 1 && u < 7) { S.glow = WARM[1]; return (fl(u) + fl(v)) % 3 === 0 ? 0xd0b060 : 0x8ab0c8; }
    return base;
  };
  box(pc, x, y, 0, 8, 6, 13, { left: front, right: noisy(base, 0.06), top: 0x5a5a5a });
}

reg('c1_kiosk', 34, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xa8a294, o.seed, 3));
  const k = [['24', 0xffe040], ['24', 0x40ff80], ['', 0xffb030], ['', 0xff6060], ['', 0x60c0ff], ['', 0xff80c0]];
  const a = k[fl(r() * k.length)], b = k[fl(r() * k.length)], c = k[fl(r() * k.length)];
  kiosk(pc, 2, 8, a[0], a[1], pick(r, [0xc0c8c0, 0x6a8ab0, 0xb0a070]));
  kiosk(pc, 12, 8, b[0], b[1], pick(r, [0xc0c8c0, 0x6a8ab0, 0xb0a070, 0xa06a5a]));
  kiosk(pc, 22, 8, c[0], c[1], pick(r, [0xc0c8c0, 0x6a8ab0, 0xb0a070]));
  // телефонная будка
  box(pc, 26, 22, 0, 3, 3, 8, { left: (u, v) => (v > 2 && v < 7 && u > 0.6 && u < 2.4 ? 0x8ab0c8 : 0xc03030), right: 0xa02828, top: 0xc03030 });
  P.lamp(pc, 4, 26, 10);
  // мусорка, ящики
  box(pc, 14, 22, 0, 4, 3, 2.5, { top: 0x8a6a3a, left: 0x7a5a30, right: 0x6a4a28 });
  box(pc, 19, 23, 0, 3, 3, 2, { top: 0x6a8a3a, left: 0x5a7a30, right: 0x4a6a28 });
});

reg('c1_shop', 30, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xb0aa9c, o.seed));
  shop(pc, r, o, { x: 3, y: 5, sx: 26, sy: 18, base: pick(r, [0xd8d4c8, 0xc8d4d8, 0xe0d4b8]), sign: { text: 'ПРОДУКТЫ', color: pick(r, [0xff5040, 0x40d0ff, 0xffd040]), bg: 0x2a2a2a } });
  box(pc, 6, 24, 0, 3, 2, 3, { top: 0x4a6a8a, left: 0x3a5a7a, right: 0x2a4a6a }); // ящики
  P.lamp(pc, 28, 28, 10);
  if (r() < 0.5) P.car(pc, 14, 28, 0, 'rafik', 0xe8e4d8);
});

reg('c1_cafe', 32, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xb8b0a0, o.seed, 3));
  const base = pick(r, [0xe8d8b0, 0xd8e0d0, 0xf0d0c0]);
  shop(pc, r, o, { x: 3, y: 4, sx: 24, sy: 16, base, sign: { text: 'КАФЕ', color: pick(r, [0xff70a0, 0xffd040, 0x70ff90]), bg: 0x3a2a2a } });
  awning(pc, 3, 20, 11, 24, 3, 0xd03030, 0xf0f0f0);
  // столики с зонтиками
  for (let i = 0; i < 3; i++) {
    const x = 6 + i * 8, y = 27;
    pole(pc, x, y, 0, 7, 0x8a8a8a);
    lathe(pc, x, y, 6, 2, (t) => 4 * (1 - t), (psi) => ((fl((psi + 4) * 3) & 1) ? 0xe0e040 : 0x40a040), () => 0xe0e040);
    box(pc, x - 1.5, y - 1.5, 2, 3, 3, 0.6, { top: 0xf0f0f0, left: 0xc0c0c0, right: 0xb0b0b0 });
  }
});

reg('c1_bar', 30, (pc, r, o) => {
  P.ground(pc, 1, asphalt(0x5a5a5c, o.seed));
  shop(pc, r, o, { x: 4, y: 5, sx: 22, sy: 17, base: pick(r, pal.brick), tex: 'brick', sign: { text: 'ПИВО', color: 0xffb020, bg: 0x1a1a1a }, frame: 0x2a1a10 });
  // бочка с квасом/пивом
  const bx = 20, by = 27;
  box(pc, bx - 5, by - 1.5, 0.5, 10, 3, 0.6, { top: 0x2a2a2a, left: 0x202020, right: 0x202020 });
  lathe(pc, bx, by, 1, 4, (t) => 3 * Math.sqrt(1 - (2 * t - 1) ** 2 * 0.4), () => 0xe8c020, () => 0xe8c020);
  P.lamp(pc, 3, 27, 10);
  box(pc, 6, 25, 0, 4, 4, 2.5, { top: 0x7a5a3a, left: 0x6a4a2a, right: 0x5a3a20 });
});

reg('c1_video', 34, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xa8a294, o.seed));
  const base = pick(r, [0x4a4a6a, 0x5a3a5a, 0x3a4a5a]);
  shop(pc, r, o, { x: 4, y: 6, sx: 22, sy: 16, base, h: 15, sign: { text: 'ВИДЕО', color: 0xff40ff, bg: 0x101010 }, sign2: { text: 'VHS', color: 0x40ffff, bg: 0x101010 } });
  // афиши
  for (let i = 0; i < 3; i++) plane(pc, [6 + i * 5, 22.05, 3], [3.5, 0, 0], [0, 0, 5], pick(r, [0xd04040, 0x4040d0, 0xe0c040, 0x40a040]));
  P.lamp(pc, 28, 28, 10);
});

reg('c1_pharmacy', 30, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xc0bab0, o.seed));
  shop(pc, r, o, { x: 4, y: 5, sx: 24, sy: 17, base: 0xf0f0ec, sign: { text: 'АПТЕКА', color: 0x30e060, bg: 0x103a20 } });
  // крест
  plane(pc, [27.9, 9, 9], [0, 5, 0], [0, 0, 5], (u, v) => (Math.abs(u - 2.5) < 0.9 || Math.abs(v - 2.5) < 0.9 ? (S.glow = 0x40ff70, 0x20c050) : -1));
  P.tree(pc, 3, 27, 'bush', 1, o.seed); P.lamp(pc, 28, 28, 10);
});

reg('c1_barber', 30, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xb8b2a6, o.seed));
  shop(pc, r, o, { x: 4, y: 6, sx: 24, sy: 16, base: pick(r, [0xe8c8d8, 0xd8e0f0, 0xf0e8c8]), sign: { text: 'СТРИЖКА', color: 0xff60b0, bg: 0x2a1a2a } });
  // полосатый столб
  lathe(pc, 27, 25, 0, 6, () => 0.9, (psi, z) => ((fl(z + psi) & 1) ? 0xd02020 : 0xf0f0f0), () => 0xf0f0f0);
  P.bench(pc, 6, 25, 'x');
});

reg('c1_gas', 34, (pc, r, o) => {
  P.ground(pc, 1, asphalt(0x55565a, o.seed));
  // навес
  for (const [x, y] of [[8, 10], [8, 22], [22, 10], [22, 22]]) box(pc, x - 0.8, y - 0.8, 0, 1.6, 1.6, 11, { top: 0xd0d0d0, left: 0xe0e0e0, right: 0xc0c0c0 });
  // колонки
  for (const [x, y] of [[15, 12], [15, 20]]) box(pc, x - 1, y - 1.5, 0, 2, 3, 4.5, { top: 0xd02020, left: (u, v) => (v > 2.5 && v < 4 ? (S.glow = 0x80ff80, 0x204020) : 0xe03030), right: 0xb02020 });
  const brand = pick(r, [0xd02020, 0x2050c0, 0x20a040]);
  box(pc, 6, 8, 11, 20, 18, 2, { top: 0xe8e8e8, left: (u, v) => { S.glow = 0xffffff; return brand; }, right: (u, v) => { S.glow = 0xffffff; return brand; } });
  // будка
  box(pc, 24, 2, 0, 7, 5, 6, { top: 0x6a6a6a, left: (u, v) => (v > 2 && v < 5 && u > 1 ? (S.glow = WARM[1], 0x8ab0c8) : 0xe8e8e0), right: 0xd8d8d0 });
  // стела с ценами
  box(pc, 2, 26, 0, 1.2, 4, 12, { top: brand, right: (u, v) => (v > 5 && (fl(v) % 2 === 0) && u > 0.8 && u < 3.2 ? (S.glow = 0xffd030, 0xffd030) : brand), left: brand });
  if (r() < 0.6) P.car(pc, 15, 16, 1, pick(r, ['lada', 'volga', 'zaz']), pick(r, pal.car));
}, { noswap: false });

// ---- средняя плотность ----
reg('c2_univ', 40, (pc, r, o) => {
  P.ground(pc, 1, parking(o.seed));
  const base = pick(r, [0xd8d0c0, 0xc8c8c0, 0xe0d8c8]);
  P.bldg(pc, 2, 3, 0, 28, 20, 20, { base, tex: 'tile', ground: 12, groundStyle: 'shop', colW: 6, winW: 5, margin: 1.5, seed: o.seed, floorH: 8, winH: 0, noWindows: false,
    left: { sign: { text: 'МАГАЗИН', color: 0xff4040, bg: 0xf0f0f0 }, doors: [{ u: 3, w: 4, h: 7, glass: true }] } }, { type: 'flat', color: 0x5a5a5a });
  // вывеска на крыше
  P.sign3(pc, 4, 15, 20, 24, 7, 'УНИВЕРСАМ', 0xff3030, 0x202020);
  P.acUnit(pc, 20, 6, 20); P.acUnit(pc, 8, 6, 20);
  P.car(pc, 8, 28, 0, 'lada', pick(r, pal.car)); P.car(pc, 22, 28, 2, 'moskvich', pick(r, pal.car));
});

reg('c2_market', 44, (pc, r, o) => {
  P.ground(pc, 2, pavement(0xa8a090, o.seed, 4));
  // крытый павильон
  const L = 30;
  box(pc, 4, 4, 0, L, 20, 9, { left: (u, v) => (v > 2 && v < 8 && (fl(u / 4) % 2) ? (S.glow = WARM[1], 0x8aa8c0) : 0xd8d0c0), right: 0xc8c0b0, top: null });
  // арочная крыша
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, z = 9 + Math.sin(t * Math.PI) * 6;
    box(pc, 4, 4 + t * 20 - 0.6, z, L, 1.2, 0.8, { top: cmul(0x8a9aa8, 0.9 + Math.cos(t * Math.PI) * 0.12), left: 0x7a8a98, right: 0x6a7a88 });
  }
  P.sign3(pc, 10, 24.1, 9, 18, 7, 'РЫНОК', 0xffe040, 0x8a2020);
  // ряды палаток
  const tarp = [0xd03030, 0x3060c0, 0x30a050, 0xe0b030, 0xf0f0f0];
  for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) {
    const x = 38 + row * 12, y = 6 + i * 13;
    box(pc, x, y, 0, 8, 9, 3, { top: 0x8a6a3a, left: (u, v) => (hash2(fl(u), fl(v), i + row * 7) < 0.4 ? pick(r, [0xe04020, 0xf0c020, 0x60b030]) : 0x9a7a4a), right: 0x7a5a30 });
    pole(pc, x, y + 9, 0, 6, 0x6a6a6a); pole(pc, x + 8, y + 9, 0, 6, 0x6a6a6a);
    const c = tarp[(i + row * 2) % 5];
    plane(pc, [x - 0.5, y - 0.5, 7], [9, 0, 0], [0, 10, -1.5], (u) => (fl(u / 1.5) & 1 ? c : cmix(c, 0xffffff, 0.3)));
  }
  for (let i = 0; i < 4; i++) {
    const x = 6 + i * 7, y = 32 + (i % 2) * 12;
    box(pc, x, y, 0, 5, 4, 2.6, { top: 0x7a5a30, left: (u, v) => (hash2(fl(u), fl(v), i) < 0.5 ? 0xf0a020 : 0x8a6a3a), right: 0x6a4a28 });
    plane(pc, [x - 0.5, y - 0.5, 6], [6, 0, 0], [0, 5, -1.2], tarp[i % 5]);
    pole(pc, x, y + 4, 0, 5, 0x6a6a6a); pole(pc, x + 5, y + 4, 0, 5, 0x6a6a6a);
  }
  P.car(pc, 8, 58, 0, 'rafik', 0xe0dcd0); P.car(pc, 22, 58, 2, 'truck', 0x3a6a3a);
  P.lamp(pc, 60, 60, 11);
});

reg('c2_rest', 40, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xc8bca8, o.seed, 3));
  const base = pick(r, [0xe8d8c0, 0xd8c8b0, 0xf0e0d0]);
  P.bldg(pc, 3, 4, 0, 26, 18, 18, { base, floorH: 9, winW: 4, winH: 6, winY: 1.5, colW: 6, margin: 2, lit: 0.85, seed: o.seed, frame: 0xc8a050, trim: 0xc8a050, curtains: true,
    left: { sign: { text: 'РЕСТОРАН', color: 0xffd060, bg: 0x4a1a1a, v: 11.5 }, ground: 18, groundStyle: 'shop', doors: [{ u: 11, w: 4, h: 7, glass: true }] } },
    { type: 'flat', color: 0x5a4a4a });
  awning(pc, 3, 22, 9, 26, 2.5, 0x8a1a1a, 0xa82a2a);
  P.lamp(pc, 3, 28, 10); P.lamp(pc, 29, 28, 10);
  P.car(pc, 16, 28, 0, r() < 0.5 ? 'merc' : 'volga', 0x161616);
});

reg('c2_cinema', 46, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xb8b0a0, o.seed, 4));
  const base = pick(r, [0xd8d0c8, 0xc8d0d8]);
  box(pc, 3, 3, 0, 26, 19, 22, { left: (u, v) => {
    if (v < 9 && u > 2 && u < 24 && (fl(u / 3) % 2 === 0)) { S.glow = WARM[3]; return 0x8aa8c0; }
    if (v > 11 && v < 19 && u > 3 && u < 23) { // афиша
      const cc = [0xd03030, 0x3050c0, 0xe0b030][fl((u - 3) / 6.7) % 3];
      return hash2(fl(u), fl(v), 4) < 0.3 ? cmul(cc, 0.7) : cc;
    }
    return noisy(base, 0.04)(u, v);
  }, right: wall({ base, L: 19, H: 22, noWindows: true, tex: 'tile' }), top: flatRoof(0x5a5a5a, 26, 19) });
  P.sign3(pc, 7, 12, 22, 18, 8, 'КИНО', 0xff4040, 0x1a1a1a);
  plane(pc, [3, 22, 9], [26, 0, 0], [0, 3, 0], 0x9a9a9a); // козырёк
  for (let i = 0; i < 26; i += 3) pc.dot(3 + i, 25, 8.8, 0xffe080, 0xffe080);
  P.lamp(pc, 29, 28, 10);
});

reg('c2_hotel', 64, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xb8b2a6, o.seed));
  const base = pick(r, [0xe0dcd0, 0xd8c8b0, 0xc8d0d8]);
  P.bldg(pc, 4, 5, 0, 24, 16, 46, { base, tex: 'tile', floorH: 6.5, ground: 7, groundStyle: 'shop', winW: 3, winH: 4, colW: 4.6, margin: 1.5, lit: 0.55, seed: o.seed, frame: 0xffffff, curtains: true,
    left: { doors: [{ u: 10, w: 4, h: 6, glass: true }] } }, { type: 'flat', color: 0x5a5a5a });
  P.sign3(pc, 6, 12, 46, 20, 7, 'ГОСТИНИЦА', 0x60c0ff, 0x101830);
  plane(pc, [12, 21, 6.5], [8, 0, 0], [0, 4, 0], 0x7a2020);
  P.car(pc, 26, 27, 0, 'volga', 0x161616); P.car(pc, 8, 27, 2, 'volga', 0xe8e0c0);
  P.flag(pc, 5, 22, 46, 6);
});

reg('c2_dept', 52, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xb0aa9c, o.seed));
  const base = pick(r, [0xd8d4c8, 0xe0d0b0]);
  box(pc, 2, 3, 0, 28, 21, 30, {
    left: (u, v) => {
      if (v < 9) { if (v > 1.5 && v < 8 && (fl(u / 5) % 3 !== 2)) { S.glow = WARM[fl(u / 5) % 5]; return cmix(0x2c4a68, 0xa0c0d8, 0.3); } return 0x9a9a9a; }
      if (v > 10 && v < 28) { if (fl(u) % 3 === 0) return 0xb8b8b0; S.glow = hash2(fl(u / 3), fl(v / 6), 2) < 0.4 ? WARM[0] : -1; return cmix(0x2c4a68, 0x9ac0d8, 0.2 + (v - 10) * 0.012); }
      return base;
    },
    right: wall({ base, L: 21, H: 30, floorH: 7, ground: 9, colW: 5, winW: 3, winH: 4, seed: o.seed, tex: 'tile' }),
    top: flatRoof(0x5a5a5a, 28, 21),
  });
  P.sign3(pc, 6, 13, 30, 20, 7, 'ТОВАРЫ', 0xffd030, 0xa02020);
  P.acUnit(pc, 22, 6, 30);
  P.lamp(pc, 29, 29, 10);
});

reg('c2_bank', 46, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xd0c8b8, o.seed, 3));
  const base = pick(r, [0xe8e0cc, 0xd8d0c0]);
  P.bldg(pc, 4, 4, 0, 24, 16, 26, { base, tex: 'tile', floorH: 8, ground: 2, winW: 3, winH: 5, colW: 5, margin: 2, lit: 0.3, seed: o.seed, frame: 0x3a3a3a, trim: 0xf8f4e8,
    left: { sign: null, doors: [{ u: 10, w: 4, h: 8, glass: true }] } }, { type: 'flat', color: 0x6a6a6a });
  // портик с колоннами
  for (let i = 0; i < 4; i++) cyl(pc, 7 + i * 6, 23, 0, 1.2, 14, 0xf4f0e4, 0xf4f0e4);
  box(pc, 4.5, 20.5, 14, 23, 4, 3, { top: 0xe8e4d8, left: (u, v) => { const m = textMask('БАНК', 23 / 2 - 7, 0.6); if (m(u, v)) return 0xc09020; return 0xf0ece0; }, right: 0xe0dcd0 });
  P.flag(pc, 26, 6, 26, 6);
  P.car(pc, 8, 29, 0, 'merc'); P.lamp(pc, 29, 29, 10);
});

// ---- высокая плотность ----
reg('c3_office', 120, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xc0bab0, o.seed));
  const glass = pick(r, [0x2a5a8a, 0x2a6a6a, 0x3a4a6a, 0x5a6a7a]);
  const h = 98;
  box(pc, 5, 5, 0, 22, 20, h, {
    left: (u, v) => { if (v < 6) { if (u > 8 && u < 14) { S.glow = WARM[1]; return 0x8ab0c8; } return 0x7a7a7a; } if (fl(u) % 4 === 0 || fl(v) % 5 === 0) return 0xb0b4b8; if (hash2(fl(u / 4), fl(v / 5), o.seed) < 0.35) S.glow = 0xfff4d0; return cmix(glass, 0xc0e0ff, 0.1 + hash2(fl((u + v) / 10), 0, 3) * 0.25 + v / h * 0.25); },
    right: (u, v) => { if (v < 6) return 0x7a7a7a; if (fl(u) % 4 === 0 || fl(v) % 5 === 0) return 0xa0a4a8; if (hash2(fl(u / 4), fl(v / 5), o.seed + 1) < 0.35) S.glow = 0xfff4d0; return cmix(glass, 0xc0e0ff, 0.05 + v / h * 0.2); },
    top: flatRoof(0x6a6a6a, 22, 20),
  });
  box(pc, 10, 9, h, 10, 10, 6, { top: 0x5a5a5a, left: 0x8a8a8a, right: 0x7a7a7a });
  pole(pc, 15, 14, h + 6, 14, 0xc0c0c0);
  pc.dot(15, 14, h + 20, 0xff2020, 0xff2020);
  P.sign3(pc, 6, 25.1, h - 8, 20, 6, 'OFFICE', 0xffffff, glass);
  P.tree(pc, 3, 28, 'bush', 1, o.seed); P.lamp(pc, 29, 29, 10);
});

reg('c3_hotel', 150, (pc, r, o) => {
  P.ground(pc, 1, pavement(0xc8c0b0, o.seed));
  const h = 22 * 6 + 4;
  P.bldg(pc, 3, 9, 0, 26, 12, h, { base: 0xf0f0ec, tex: 'tile', floorH: 6, ground: 4, winW: 3, winH: 3, colW: 4, margin: 1, lit: 0.55, seed: o.seed, glass: 0x305a7a, curtains: true,
    left: { doors: [{ u: 11, w: 4, h: 4, glass: true }] } }, { type: 'flat', color: 0x5a5a5a });
  P.sign3(pc, 4, 15, h, 24, 8, 'ИНТУРИСТ', 0x40a0ff, 0x101020);
  box(pc, 2, 21, 0, 28, 6, 7, { top: flatRoof(0x6a6a6a, 28, 6), left: (u, v) => (v > 1.5 && v < 6 && fl(u) % 4 ? (S.glow = WARM[3], 0x8ab0c8) : 0xe0e0e0), right: 0xd0d0d0 });
  for (let i = 0; i < 3; i++) P.flag(pc, 6 + i * 4, 30, 0, 12, [[0xf8f8f8, 0x2050c0, 0xd02020], [0x2050c0, 0xf0d020, 0x2050c0], [0xd02020, 0xf0f0f0, 0xd02020]][i]);
});

reg('c3_casino', 70, (pc, r, o) => {
  P.ground(pc, 1, (u, v) => ((fl(u / 2) + fl(v / 2)) % 2 ? 0x3a2a3a : 0x2a1a2a));
  const h = 30;
  box(pc, 3, 3, 0, 26, 20, h, {
    left: (u, v) => { if (v < 10 && u > 2 && u < 24) { S.glow = 0xffd060; return 0xd0a030; } if (fl(v) % 4 === 0) { S.glow = [0xff40ff, 0x40ffff, 0xffff40][fl(u / 3) % 3]; return 0x8a2a8a; } return 0x2a1a3a; },
    right: (u, v) => { if (fl(v) % 4 === 0) { S.glow = [0xff40ff, 0x40ffff, 0xffff40][fl(u / 3) % 3]; return 0x8a2a8a; } return 0x241830; },
    top: flatRoof(0x3a2a3a, 26, 20),
  });
  P.sign3(pc, 5, 12, h, 22, 9, 'КАЗИНО', 0xffe040, 0x6a0a2a);
  // мигающие лампочки
  for (let i = 0; i < 26; i += 2) pc.dot(3 + i, 23, 10.5, 0xffe080, 0xffe080);
  P.car(pc, 26, 28, 2, 'merc'); P.car(pc, 10, 28, 0, 'merc', 0xe8e8e8);
  P.lamp(pc, 3, 29, 10);
});

reg('c3_mall', 70, (pc, r, o) => {
  P.ground(pc, 2, parking(o.seed));
  const base = pick(r, [0xe0dcd0, 0xd8d0c8]);
  box(pc, 4, 4, 0, 56, 36, 24, {
    left: (u, v) => { if (v < 10 && u > 20 && u < 36) { S.glow = WARM[1]; return cmix(0x2c4a68, 0xb0d0e8, 0.3); } if (v > 12 && v < 21 && fl(u / 6) % 2) return cmul(0xd04020, 1); return noisy(base, 0.04)(u, v); },
    right: (u, v) => (v > 14 && v < 20 && fl(u / 4) % 2 ? (S.glow = WARM[0], 0x6a8aa8) : noisy(cmul(base, 0.95), 0.04)(u, v)),
    top: flatRoof(0x6a6a6a, 56, 36),
  });
  // стеклянный атриум
  lathe(pc, 32, 20, 24, 10, (t) => 10 * Math.sqrt(1 - t * t), (psi, z) => { S.glow = WARM[3]; return cmix(0x5a8ab0, 0xd0e8ff, (z - 24) / 14); }, () => 0xd0e8ff);
  P.sign3(pc, 18, 40.1, 14, 28, 7, 'ТОРГОВЫЙ ЦЕНТР', 0xffffff, 0xd04020);
  for (let i = 0; i < 6; i++) P.car(pc, 6 + i * 9, 50 + (i % 2) * 8, i % 2 ? 0 : 2, pick(r, ['lada', 'volga', 'merc', 'moskvich', 'niva']), pick(r, pal.car));
  P.acUnit(pc, 10, 8, 24); P.acUnit(pc, 50, 30, 24); P.acUnit(pc, 50, 8, 24);
  P.lamp(pc, 2, 62, 11); P.lamp(pc, 62, 62, 11);
});

reg('c3_tower', 250, (pc, r, o) => {
  P.ground(pc, 2, pavement(0xc8c4bc, o.seed, 4));
  const glass = pick(r, [0x2a4a6a, 0x2a5a5a, 0x4a4a5a, 0x3a5a7a]);
  const h = 200;
  const face = (shade) => (u, v) => {
    if (v < 10) { if (fl(u / 5) % 2) { S.glow = WARM[1]; return 0x8ab0c8; } return 0x5a5a5a; }
    if (fl(u) % 4 === 0) return cmul(0xc0c4c8, shade);
    if (fl(v) % 5 === 0) return cmul(0x9aa0a8, shade);
    if (hash2(fl(u / 4), fl(v / 5), o.seed) < 0.38) S.glow = 0xfff4d8;
    return cmul(cmix(glass, 0xc8e4ff, 0.1 + hash2(fl((u * 0.5 + v) / 14), 1, 2) * 0.3 + v / h * 0.2), shade);
  };
  box(pc, 12, 12, 0, 40, 40, 16, { left: face(1), right: face(1), top: flatRoof(0x5a5a5a, 40, 40) });
  box(pc, 18, 18, 16, 28, 28, h - 40, { left: face(1), right: face(1), top: flatRoof(0x5a5a5a, 28, 28) });
  box(pc, 22, 22, h - 24, 20, 20, 26, { left: face(1.05), right: face(1.05), top: null });
  hip(pc, 22, 22, h + 2, 20, 20, 16, (u, v) => cmix(0xd0b040, 0xfff0a0, hash2(fl(u), fl(v), 3) * 0.3), 0);
  pole(pc, 32, 32, h + 18, 20, 0xd0d0d0);
  pc.dot(32, 32, h + 38, 0xff2020, 0xff2020);
  P.sign3(pc, 20, 46.1, h - 34, 24, 7, 'БИЗНЕС', 0xffffff, glass);
  P.tree(pc, 4, 60, 'oak', 1, o.seed); P.tree(pc, 60, 4, 'oak', 1, o.seed + 1);
  P.lamp(pc, 6, 6, 11); P.lamp(pc, 58, 58, 11);
  P.car(pc, 58, 40, 1, 'merc'); P.car(pc, 40, 58, 0, 'merc', 0xe0e0e0);
});

export {};
