'use strict';
// ───────────── уровни: двор → улица → парк → «плывущий» квартал → магазин → арены ─────────────
const PASS_COLS = [[0, 55, 40], [205, 45, 42], [50, 60, 52], [140, 30, 35], [0, 0, 82], [25, 50, 35], [300, 25, 40]];
const ZONES = [
  { stage: 0, rect: [210, 4760, 1790, 5590], madness: 0.04, grade: [38, 70, 60, 0.12], key: 0, calm: 5,
    dir: { pool: { shover: 6, pigeon: 3, granny: 1.4 }, waves: 3, budget: [7, 10], maxAlive: 7, relax: 4 },
    loot: [['baguette', 760, 5380], ['umbrella', 300, 5250], ['tea', 1300, 5300]] },
  { stage: 1, rect: [210, 3560, 1990, 4590], madness: 0.18, grade: [210, 25, 50, 0.14], key: 1, calm: 2,
    dir: { pool: { whisperer: 6, shover: 3, pigeon: 2, starer: 2, granny: 1 }, waves: 4, budget: [8, 12], maxAlive: 9, relax: 4 },
    loot: [['bottle', 420, 4380], ['pan', 1700, 4380], ['brick', 900, 3700], ['pill', 1500, 3700]] },
  { stage: 2, rect: [210, 2460, 1990, 3390], madness: 0.36, grade: [24, 85, 52, 0.18], key: 2, calm: 2, clear: 'gift',
    dir: { pool: { gopnik: 5, dog: 4, courier: 2.5, whisperer: 2, starer: 1.2, granny: 0.8, mimic: 1.6 }, waves: 4, budget: [10, 14], maxAlive: 11, relax: 4 },
    loot: [['pipe', 700, 3200], ['brick', 1500, 2900], ['tea', 1600, 3250], ['sandwich', 450, 2700]] },
  { stage: 3, rect: [210, 900, 1790, 2290], madness: 0.58, grade: [275, 60, 40, 0.24], key: 3, calm: 2,
    dir: { pool: { voice: 4, melter: 3, mouth: 3, phantom: 3, dog: 2, whisperer: 1.5, starer: 1, mimic: 2 }, waves: 4, budget: [12, 16], maxAlive: 13, relax: 4 },
    loot: [['pan', 600, 2000], ['bottle', 1500, 1500], ['pill', 400, 1400], ['tea', 1400, 1100]] },
  { stage: 4, rect: [160, 340, 1640, 1270], madness: 0.8, grade: [95, 60, 40, 0.16], key: 4, calm: 3, clear: 'lanes',
    dir: { pool: { mannequin: 4, cart: 3, canEye: 2.5, sausage: 3, voice: 2, melter: 1.5, phantom: 2, dog: 1.5, mimic: 1.2 }, waves: 5, budget: [13, 18], maxAlive: 15, relax: 4, giftAfter: 2, miniboss: 'cashier' },
    loot: [['baguette', 400, 1180], ['bottle', 1400, 1180], ['pill', 900, 700], ['sandwich', 160, 1200]] },
];

function buildStreet() {
  const m = newMap('street', 2200, 5800, [32, 12, 42], 'street');
  paint(m, () => -10, [0, 0, 2200, 5800], varCol([32, 11, 44], 7, 0.002), MST.ground);
  // ── 1. Двор ──
  paint(m, sdWobble(sdEllipse(380, 5130, 230, 170), 12, 0.01), [130, 4940, 640, 5320], varCol([95, 38, 40], 8, 0.01), MST.grass);
  paint(m, sdWobble(sdEllipse(1500, 5060, 240, 190), 12, 0.01, 2), [1240, 4850, 1760, 5270], varCol([92, 38, 42], 8, 0.01), MST.grass);
  const drive = [[150, 5455], [1820, 5455]], arch = [[1110, 5455], [1110, 4590]];
  paint(m, sdLine(drive, 62), [100, 5380, 1850, 5530], varCol([220, 8, 36], 5, 0.008), { ...MST.asphalt, dir: 0 });
  paint(m, sdLine(arch, 72), [1030, 4580, 1190, 5530], varCol([220, 8, 37], 5, 0.008), { ...MST.asphalt, dir: Math.PI / 2 });
  paint(m, sdLine([[600, 5600], [600, 5300], [1110, 5060]], 30), [560, 5030, 1150, 5610], [35, 15, 60], { ...MST.paving, dir: lineDir([[600, 5600], [600, 5300], [1110, 5060]]) });
  paint(m, sdBox(380, 5130, 55, 55, 6), bbB(380, 5130, 58, 58), [28, 25, 34], MST.prop);
  paint(m, sdBox(380, 5130, 46, 46, 5), bbB(380, 5130, 48, 48), [42, 55, 70], { ...MST.paving, dir: 'flow' });
  for (const sx of [480, 520]) { paint(m, sdCircle(sx, 5000, 5), bbC(sx, 5000, 6), [0, 60, 40], MST.prop); }
  paint(m, sdBox(500, 5000, 30, 3, 1), bbB(500, 5000, 32, 4), [0, 60, 40], MST.prop);
  for (const [x, y, r] of [[250, 4900, 70], [720, 4880, 58], [1440, 4840, 76], [1700, 5250, 66], [900, 5250, 50], [230, 5330, 45]]) tree(m, x, y, r);
  bench(m, 330, 5340, 0); bench(m, 800, 5170, Math.PI / 2); bench(m, 1560, 5330, 0);
  car(m, 320, 5455, 0, [0, 55, 42]); car(m, 1400, 5450, 0.04, [200, 45, 45]); car(m, 1680, 5462, -0.03, [50, 55, 60]);
  bin(m, 1640, 5565); bin(m, 1700, 5565, [210, 20, 35]);
  puddle(m, 950, 5440, 50, 18);
  building(m, 150, 5600, 1360, 200, [0, 0, 50]);
  building(m, 1510, 5640, 310, 160, [25, 20, 36]);
  paint(m, sdBox(600, 5598, 46, 14, 3), bbB(600, 5598, 48, 16), [0, 0, 70], MST.prop); // козырёк подъезда
  paint(m, sdBox(600, 5606, 24, 5, 1), bbB(600, 5606, 26, 6), [20, 40, 22], MST.prop);
  building(m, 0, 4600, 200, 1200, [12, 38, 60]); building(m, 1820, 4600, 380, 1200, [14, 36, 58]);
  building(m, 0, 4600, 980, 150, [10, 36, 60]); building(m, 1240, 4600, 960, 150, [10, 36, 60]);
  paint(m, sdBox(1110, 4675, 130, 75), bbB(1110, 4675, 130, 75), [20, 15, 22], { ...MST.asphalt, dir: Math.PI / 2 }); // арка — тень
  // ── 2. Улица ──
  paint(m, sdBox(1100, 3780, 900, 230), bbB(1100, 3780, 900, 230), varCol([30, 14, 60], 5, 0.01), { ...MST.paving, dir: 0 });
  paint(m, sdBox(1100, 4430, 900, 180), bbB(1100, 4430, 900, 180), varCol([30, 14, 58], 5, 0.01), { ...MST.paving, dir: 0 });
  paint(m, sdBox(1100, 4125, 920, 125), bbB(1100, 4125, 920, 125), varCol([225, 10, 30], 4, 0.01), { ...MST.asphalt, dir: 0 });
  for (let x = 220; x < 2000; x += 120) paint(m, sdBox(x, 4125, 30, 3), bbB(x, 4125, 32, 4), [50, 15, 82], { ...MST.line, dir: 0 });
  zebra(m, 640, 4000, 160, 250, true);
  for (const [x, y, a, c] of [[320, 4035, 0, 0], [1040, 4215, 0, 1], [1520, 4035, Math.PI, 2], [1830, 4215, 0, 3], [230, 4215, 0, 5]]) car(m, x, y, a, PASS_COLS[c]);
  kiosk(m, 400, 4500, 130, 70, [200, 45, 45]); kiosk(m, 1750, 3700, 120, 80, [355, 45, 45]);
  kiosk(m, 1500, 4300, 160, 34, [200, 20, 55]); // остановка
  for (const [x, y, r] of [[300, 3700, 55], [930, 3650, 48], [1600, 4480, 52], [1880, 3900, 46], [1300, 4500, 40]]) tree(m, x, y, r, 100);
  for (let x = 260; x < 2000; x += 320) { lamp(m, x, 3985); lamp(m, x + 160, 4268); }
  bin(m, 1160, 4490); bin(m, 560, 3640);
  puddle(m, 1350, 3820, 60, 22); puddle(m, 500, 4300, 40, 14);
  building(m, 0, 3400, 200, 1200, [14, 38, 62]); building(m, 2000, 3400, 200, 1200, [18, 30, 58]);
  building(m, 0, 3400, 1200, 150, [8, 35, 58]); building(m, 1440, 3400, 760, 150, [8, 35, 58]);
  // ── 3. Парк ──
  paint(m, sdWobble(sdBox(1100, 2925, 900, 475, 30), 10, 0.01), [180, 2430, 2020, 3420], varCol([95, 42, 36], 10, 0.006, 4), MST.grass);
  const parkPath = [[1320, 3420], [1320, 3200], [900, 3050], [820, 2860], [1000, 2680], [1500, 2650], [1500, 2420]];
  paint(m, sdLine(parkPath, 42), [760, 2380, 1560, 3440], [38, 28, 64], { ...MST.paving, dir: lineDir(parkPath) });
  paint(m, sdSub(sdCircle(1100, 2930, 195), sdCircle(1100, 2930, 140)), bbC(1100, 2930, 196), [38, 26, 62], { ...MST.paving, dir: 'contour' });
  paint(m, sdCircle(1100, 2930, 132), bbC(1100, 2930, 133), [30, 10, 66], MST.propBig);
  paint(m, sdCircle(1100, 2930, 112), bbC(1100, 2930, 113), [195, 45, 42], { ...MST.water, dir: 'contour' });
  solidC(m, 1100, 2930, 128);
  for (const [x, y, r] of [[420, 2620, 80], [480, 3220, 70], [1720, 3230, 74], [1800, 2620, 70], [660, 2560, 54], [1250, 3280, 46], [1690, 2880, 58], [300, 2950, 50]]) tree(m, x, y, r, 98);
  bench(m, 1100, 2740, 0); bench(m, 1100, 3125, 0); bench(m, 1305, 2930, Math.PI / 2);
  flowerBed(m, 620, 2900, 60); flowerBed(m, 1600, 3060, 50);
  building(m, 0, 2300, 200, 1100, [16, 40, 60]); building(m, 2000, 2300, 200, 1100, [12, 30, 56]);
  building(m, 0, 2300, 1380, 150, [10, 36, 58]); building(m, 1620, 2300, 580, 150, [10, 36, 58]);
  // ── 4. «Плывущий» квартал ──
  const ave = [[1500, 2300], [1500, 2100], [1000, 1900], [1000, 1550], [500, 1300], [900, 1050], [1100, 880]];
  paint(m, sdBox(1000, 1575, 800, 725), bbB(1000, 1575, 800, 725), (x, y) => [270 + noise2(x * 0.004, y * 0.004, 9) * 40, 20, 34 + noise2(x * 0.01, y * 0.01) * 6], { ...MST.ground, dir: (x, y) => noise2(x * 0.006, y * 0.006, 11) * 6 });
  paint(m, sdWobble(sdLine(ave, 110), 14, 0.008), [350, 820, 1650, 2320], (x, y) => [250 + noise2(x * 0.005, y * 0.005, 3) * 30, 18, 24], { ...MST.asphalt, dir: lineDir(ave) });
  for (const [x, y, a, c] of [[600, 2100, 0.4, 0], [1420, 1700, -0.3, 1], [420, 1720, 1.2, 2], [1500, 1220, 2.6, 6], [760, 1500, -1.1, 3]]) car(m, x, y, a, PASS_COLS[c]);
  for (const [x, y, r] of [[700, 1170, 58], [1560, 1500, 56], [350, 2200, 55], [1350, 2050, 44]]) tree(m, x, y, r, 285);
  puddle(m, 800, 1720, 64, 30); puddle(m, 1280, 1980, 50, 24); puddle(m, 400, 1050, 40, 20);
  bin(m, 1300, 1350, [300, 30, 35]); lamp(m, 1250, 1100); lamp(m, 700, 1900); lamp(m, 1300, 1700);
  building(m, 0, 400, 200, 1900, [290, 30, 45]); building(m, 1800, 400, 400, 1900, [260, 25, 45]);
  building(m, 0, 0, 2200, 400, [250, 20, 30]); building(m, 200, 400, 400, 450, [280, 25, 42]); building(m, 1600, 400, 200, 450, [280, 25, 42]);
  building(m, 600, 450, 1000, 400, [150, 22, 58]); // магазин
  paint(m, sdBox(1100, 862, 120, 14, 3), bbB(1100, 862, 122, 16), [150, 15, 75], MST.prop); // крыльцо
  // окна-глаза на стенах (анимированный декор)
  for (let y = 520; y < 2250; y += 140) { m.anim.push({ t: 'eye', x: 200, y, s: 1, ph: rand(TAU) }); m.anim.push({ t: 'eye', x: 1800, y: y + 60, s: -1, ph: rand(TAU) }); }
  m.anim.push({ t: 'fountain', x: 1100, y: 2930 });
  m.signs.push({ x: 1100, y: 822, text: ['ПРОДУКТЫ 24', 'GROCERIES 24'], hue: 140 });
  // ── зоны, ворота, путь ──
  m.gates = [{ x: 980, y: 4600, w: 260, h: 150 }, { x: 1200, y: 3400, w: 240, h: 150 }, { x: 1380, y: 2300, w: 240, h: 150 }, { x: 960, y: 852, w: 280, h: 50, door: true }].map((g) => ({ ...g, open: false, t: 0 }));
  m.path = buildPath([[600, 5560], [600, 5300], [1110, 5050], [1110, 4700], [1110, 4470], [720, 4400], [720, 3900], [1320, 3750], [1320, 3480], [1320, 3200], [900, 3050], [820, 2860], [1000, 2680], [1500, 2650], [1500, 2380], [1500, 2100], [1000, 1900], [1000, 1550], [500, 1300], [900, 1050], [1100, 900]]);
  m.gates.forEach((g) => { g.s = nearestPathS(m.path, g.x + g.w / 2, g.y + g.h / 2); });
  bakePathStrokes(m);
  m.spawn = { x: 600, y: 5545 };
  m.zoneIdx = [0, 1, 2, 3];
  return m;
}
// Путеводная линия вписана в саму живопись: охристые мазки по асфальту и траве
function bakePathStrokes(m) {
  const pts = m.path.pts;
  for (let i = 0; i < pts.length - 1; i += 8) {
    const seg = pts.slice(i, Math.min(pts.length, i + 9)).map((p) => [p.x + p.n1, p.y + p.n2]);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of seg) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    paint(m, sdLine(seg, 6), [x0 - 12, y0 - 12, x1 + 12, y1 + 12], (x, y, r) => [40 + r() * 12, 70, 52 + r() * 14], { ...MST.line, dir: lineDir(seg), w: 5, len: 14, alpha: 0.75, hl: 0.15 });
  }
}
function nearestPathS(path, x, y) { let b = 1e9, s = 0; for (const p of path.pts) { const d = dist2(p.x, p.y, x, y); if (d < b) { b = d; s = p.s; } } return s; }

function buildStore() {
  const m = newMap('store', 1800, 1400, [100, 10, 52], 'store');
  // кафельный пол в шахматку
  paint(m, () => -10, [0, 0, 1800, 1400], (x, y) => { const k = (Math.floor(x / 80) + Math.floor(y / 80)) & 1; return [k ? 80 : 60, k ? 14 : 9, k ? 62 : 50 + noise2(x * 0.01, y * 0.01) * 4]; }, { ...MST.paving, step: 11, len: 18, dir: 0 });
  // стены
  const wall = [160, 12, 42];
  building(m, 0, 0, 1800, 60, wall); building(m, 0, 1340, 820, 60, wall); building(m, 980, 1340, 820, 60, wall);
  building(m, 0, 0, 60, 1400, wall); building(m, 1740, 0, 60, 1400, wall);
  // морозильники слева, стеллажи
  building(m, 60, 330, 80, 760, [195, 35, 75]);
  for (let i = 0; i < 9; i++) paint(m, sdBox(100, 360 + i * 82, 30, 36, 3), bbB(100, 360 + i * 82, 32, 38), [195, 50, 55], { ...MST.prop, hl: 0.25 });
  const shelfX = [300, 500, 680, 1060, 1240, 1440];
  shelfX.forEach((sx, i) => {
    building(m, sx, 470, 64, 520, [30, 15, 45]);
    const rng = mulberry32(i * 99 + 7);
    for (let k = 0; k < 26; k++) { const px = sx + 10 + rng() * 44, py = 485 + rng() * 490, pr = 6 + rng() * 6; paint(m, rng() < 0.5 ? sdCircle(px, py, pr) : sdBox(px, py, pr, pr * 0.8, 2), bbC(px, py, pr + 2), [Math.floor(rng() * 12) * 30, 65, 55], { ...MST.prop, step: 3 }); }
  });
  // кассы
  for (const cx of [380, 740, 1100, 1460]) { building(m, cx, 200, 180, 70, [0, 0, 28]); paint(m, sdBox(cx + 90, 235, 70, 14, 3), bbB(cx + 90, 235, 72, 15), [0, 0, 18], MST.prop); }
  paint(m, sdBox(900, 100, 840, 40), bbB(900, 100, 840, 40), [5, 60, 35], { ...MST.paving, dir: 0 }); // красная дорожка за кассами
  // фруктовые лотки
  for (const [x, y] of [[560, 1150], [1240, 1150]]) { paint(m, sdCircle(x, y, 48), bbC(x, y, 50), [28, 40, 38], MST.propBig); for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, d = 10 + (k % 3) * 11; paint(m, sdCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 7), bbC(x + Math.cos(a) * d, y + Math.sin(a) * d, 8), [pick([0, 30, 55, 90]), 70, 50], { ...MST.prop, step: 3 }); } solidC(m, x, y, 46); }
  m.lanes = [{ x: 560, w: 180, asp: null }, { x: 920, w: 180, asp: null }, { x: 1280, w: 180, asp: null }];
  m.gates = m.lanes.map((l) => ({ x: l.x, y: 200, w: l.w, h: 70, open: false, t: 0, lane: true }));
  m.gates.push({ x: 60, y: 200, w: 320, h: 70, open: false, t: 0, hidden: true }, { x: 1640, y: 200, w: 100, h: 70, open: false, t: 0, hidden: true });
  m.spawn = { x: 900, y: 1290 };
  m.path = buildPath([[900, 1300], [900, 1050], [900, 700], [900, 330]]);
  m.gates.forEach((g) => { g.s = 9999; });
  m.signs.push({ x: 900, y: 40, text: ['ВЫХОД НЕТ', 'NO EXIT'], hue: 0 });
  m.zoneIdx = [4];
  return m;
}

// ── арены финальных боссов ──
function arenaBase(kind) {
  const W = 1600, H = 1200;
  const th = {
    space: { base: [240, 50, 10], wall: [250, 40, 18] }, heaven: { base: [45, 45, 72], wall: [45, 30, 88] }, hell: { base: [5, 55, 16], wall: [0, 40, 10] },
    jesus: { base: [200, 55, 36], wall: [35, 30, 50] }, atom: { base: [100, 42, 42], wall: [0, 0, 92] }, art: { base: [28, 45, 38], wall: [35, 25, 70] },
  }[kind];
  const m = newMap('arena_' + kind, W, H, th.base, kind);
  m.spawn = { x: W / 2, y: H - 180 };
  if (kind === 'space') {
    const sw = [[400, 350], [1200, 800], [900, 300], [350, 900]];
    paint(m, () => -10, [0, 0, W, H], (x, y) => [225 + noise2(x * 0.003, y * 0.003, 2) * 30, 55, 16 + noise2(x * 0.006, y * 0.006, 5) * 10], { ...MST.ground, dir: (x, y) => { let best = 1e9, a = 0; for (const [sx, sy] of sw) { const d = dist2(x, y, sx, sy); if (d < best) { best = d; a = Math.atan2(y - sy, x - sx) + Math.PI / 2; } } return a; }, len: 44, w: 12 });
    for (const [sx, sy] of sw) paint(m, sdCircle(sx, sy, 120), bbC(sx, sy, 121), (x, y, r) => [200 + r() * 40, 60, 40 + r() * 25], { ...MST.ground, step: 9, dir: (x, y) => Math.atan2(y - sy, x - sx) + Math.PI / 2, len: 28, w: 7 });
    const rng = mulberry32(5); for (let i = 0; i < 140; i++) { const x = rng() * W, y = rng() * H, r = 2 + rng() * 5; paint(m, sdCircle(x, y, r), bbC(x, y, r + 2), [50, 90, 85], { ...MST.prop, step: 2, len: 5, w: 3 }); }
    for (const [x, y, r] of [[300, 600, 50], [1300, 400, 44], [1200, 950, 40], [600, 250, 34]]) { paint(m, sdWobble(sdCircle(x, y, r), 6, 0.06, x), bbC(x, y, r + 8), [25, 15, 35], MST.propBig); solidC(m, x, y, r); }
  } else if (kind === 'heaven') {
    paint(m, () => -10, [0, 0, W, H], (x, y, r) => [42 + r() * 12, 45, 70 + r() * 10], { ...MST.ground, dir: 'flow' });
    const rng = mulberry32(8); for (let i = 0; i < 14; i++) { const x = 100 + rng() * (W - 200), y = 100 + rng() * (H - 200), r = 40 + rng() * 50; if (dist(x, y, W / 2, H - 180) < 220 || dist(x, y, W / 2, 300) < 260) continue; paint(m, sdWobble(sdU(sdCircle(x, y, r), sdCircle(x + r * 0.7, y + 10, r * 0.7), sdCircle(x - r * 0.7, y + 12, r * 0.6)), 6, 0.04, i), bbC(x, y, r * 1.9), [45, 30, 97], { ...MST.foliage, shade: 14 }); if (rng() < 0.5) solidC(m, x, y, r * 0.8); }
    for (const x of [500, 1100]) { paint(m, sdCircle(x, 120, 34), bbC(x, 120, 36), [48, 80, 62], MST.propBig); solidC(m, x, 120, 32); }
  } else if (kind === 'hell') {
    paint(m, () => -10, [0, 0, W, H], (x, y, r) => [5 + r() * 15, 50, 14 + r() * 8], { ...MST.ground, dir: 'flow' });
    const rng = mulberry32(13); for (let i = 0; i < 16; i++) { const pts = []; let x = rng() * W, y = rng() * H; for (let k = 0; k < 5; k++) { pts.push([x, y]); x += (rng() - 0.5) * 220; y += (rng() - 0.5) * 220; } paint(m, sdLine(pts, 7), [0, 0, W, H], (px, py, r) => [20 + r() * 25, 95, 50 + r() * 15], { ...MST.line, dir: lineDir(pts), w: 6 }); m.anim.push({ t: 'lava', pts }); }
    for (let i = 0; i < 6; i++) { const x = 300 + i * 200, y = 980; paint(m, sdCircle(x, y, 9), bbC(x, y, 10), [45, 70, 55], MST.prop); solidC(m, x, y, 9); } // столбики очереди
    for (const [x, y, r] of [[250, 300, 50], [1350, 320, 46], [300, 850, 40], [1300, 850, 44]]) { paint(m, sdWobble(sdCircle(x, y, r), 7, 0.06, x), bbC(x, y, r + 8), [0, 20, 12], MST.propBig); solidC(m, x, y, r); }
    m.signs.push({ x: W / 2, y: 50, text: ['ВОЗЬМИТЕ ТАЛОН', 'TAKE A NUMBER'], hue: 10 });
  } else if (kind === 'jesus') {
    paint(m, () => -10, [0, 0, W, H], (x, y, r) => [195 + noise2(x * 0.004, y * 0.004) * 15, 55, 34 + r() * 14], { ...MST.water, step: 11, len: 34, w: 9 });
    const boat = sdEllipse(1350, 950, 110, 46); propShadow(m, boat, bbE(1350, 950, 112, 48), 10, 14); paint(m, boat, bbE(1350, 950, 112, 48), [25, 45, 32], MST.propBig); paint(m, sdEllipse(1350, 950, 90, 30), bbE(1350, 950, 92, 32), [28, 40, 42], { ...MST.prop, dir: 0 }); solidR(m, 1250, 915, 200, 70);
    for (const [x, y, r] of [[260, 300, 40], [1350, 260, 36], [220, 900, 34]]) { paint(m, sdWobble(sdCircle(x, y, r), 5, 0.06, x), bbC(x, y, r + 6), [30, 15, 40], MST.propBig); solidC(m, x, y, r); }
    m.anim.push({ t: 'glints' });
  } else if (kind === 'atom') {
    paint(m, () => -10, [0, 0, W, H], varCol([100, 45, 40], 10, 0.01), MST.grass);
    paint(m, sdLine([[0, 1000], [W, 1000]], 40), [0, 950, W, 1050], [30, 10, 72], { ...MST.paving, dir: 0 });
    for (const y of [140]) for (let x = 60; x < W - 60; x += 26) { paint(m, sdBox(x, y, 4, 14, 1), bbB(x, y, 5, 15), [0, 0, 95], MST.prop); }
    solidR(m, 40, 126, W - 80, 28);
    building(m, 1180, 300, 300, 220, [5, 50, 55]); building(m, 120, 300, 260, 200, [200, 40, 60]);
    car(m, 700, 1000, 0, [330, 60, 72]); // розовый «кадиллак»
    paint(m, sdU(sdCircle(260, 80, 120), sdCircle(380, 60, 90), sdCircle(160, 60, 80)), [40, -60, 500, 200], (x, y, r) => [30 + r() * 20, 60, 60 + r() * 20], MST.foliage); // гриб на горизонте
    m.anim.push({ t: 'tvs' });
  } else if (kind === 'art') {
    paint(m, () => -10, [0, 0, W, H], (x, y) => { const k = (Math.floor((x + y) / 40) + Math.floor((x - y) / 40)) & 1; return [28, 45, k ? 40 : 32]; }, { ...MST.paving, dir: (x, y) => ((Math.floor((x + y) / 40) + Math.floor((x - y) / 40)) & 1 ? Math.PI / 4 : -Math.PI / 4), len: 24, w: 9 });
    paint(m, sdBox(W / 2, H / 2, 140, 560), bbB(W / 2, H / 2, 140, 560), [355, 55, 32], { ...MST.paving, dir: Math.PI / 2 }); // ковровая дорожка
    for (const [x, y] of [[300, 300], [1300, 300], [300, 850], [1300, 850], [560, 580], [1040, 580]]) { paint(m, sdBox(x, y, 26, 26, 3), bbB(x, y, 28, 28), [40, 10, 85], MST.propBig); paint(m, sdCircle(x, y, 14), bbC(x, y, 15), [40, 6, 92], MST.prop); solidR(m, x - 26, y - 26, 52, 52); } // постаменты с бюстами
    for (let x = 120; x < W - 100; x += 170) { const c = [rand(360), 50, 45]; paint(m, sdBox(x, 62, 50, 16, 2), bbB(x, 62, 52, 18), [40, 70, 45], MST.prop); paint(m, sdBox(x, 62, 42, 10, 1), bbB(x, 62, 43, 11), c, MST.prop); }
    m.signs.push({ x: W / 2, y: 40, text: ['AKADEMIE DER BILDENDEN KÜNSTE', 'AKADEMIE DER BILDENDEN KÜNSTE'], hue: 45 });
  }
  building(m, 0, 0, W, 40, th.wall); building(m, 0, H - 40, W, 40, th.wall); building(m, 0, 0, 40, H, th.wall); building(m, W - 40, 0, 40, H, th.wall);
  m.path = null; m.zoneIdx = [];
  return m;
}
const ARENA_GRADE = { space: [235, 70, 40, 0.18], heaven: [40, 70, 55, 0.12], hell: [5, 90, 45, 0.24], jesus: [190, 60, 55, 0.12], atom: [32, 70, 62, 0.14], art: [30, 45, 50, 0.18] };
const ARENA_POOL = {
  space: { cosmo: 4, voice: 2 }, heaven: { cherub: 5, angel: 2 }, hell: { imp: 5, dog: 2 },
  jesus: { fish: 5, phantom: 1 }, atom: { agent: 4, tvset: 3 }, art: { critic: 5, whisperer: 1 },
};
