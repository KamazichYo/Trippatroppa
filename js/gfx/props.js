// Мелкие объекты для участков: заборы, фонари, лавки, антенны, трубы, баки, клумбы...
import { plane, box, gable, hip, lathe, cyl, blob, line3, pole, S, TRI } from '../engine/pixel.js';
import { hash2, cmul, cmix } from '../engine/util.js';
import { wall, flatRoof, roofSlate, roofTiles, roofMetal, solid, noisy } from './materials.js';
import { drawVehicle } from './vehicles.js';
import { drawTree } from './trees.js';
import { textMask, textWidth } from '../engine/font.js';

const fl = Math.floor;

export function ground(pc, s, sh) { plane(pc, [0, 0, 0], [32 * s, 0, 0], [0, 32 * s, 0], sh); }
export function patch(pc, x, y, w, d, sh, z = 0) { plane(pc, [x, y, z], [w, 0, 0], [0, d, 0], sh); }

function fenceShader(style, h, c) {
  switch (style) {
    case 'picket': return (u, v) => {
      const p = u - fl(u / 2) * 2;
      if (Math.abs(v - h * 0.3) < 0.5 || Math.abs(v - h * 0.75) < 0.5) return cmul(c, 0.85);
      if (p < 1.2 && v < h - (p < 0.6 ? 0 : 0.6)) return cmul(c, 0.95 + hash2(fl(u / 2), 0, 3) * 0.1);
      return -1;
    };
    case 'mesh': return (u, v) => {
      if (u - fl(u / 8) * 8 < 0.8) return 0x707070;
      if (v > h - 0.6) return 0x808080;
      const a = (u + v) - fl((u + v) / 2.5) * 2.5, b = (u - v + 100) - fl((u - v + 100) / 2.5) * 2.5;
      return a < 0.45 || b < 0.45 ? 0x9a9a9a : -1;
    };
    case 'concrete': return (u, v) => { // бетонный забор ПО-2
      const p = u - fl(u / 10) * 10;
      if (p < 0.7) return cmul(c, 0.75);
      const dd = Math.abs((p - 5)) + Math.abs(v - h / 2) * 1.6;
      if ((fl(dd) % 3) === 0) return cmul(c, 0.88);
      return cmul(c, 0.97 + hash2(fl(u), fl(v), 1) * 0.06);
    };
    case 'brick': return (u, v) => {
      const p = u - fl(u / 10) * 10;
      if (p < 1.6) return v > h - 0.6 ? 0xd8d0c0 : cmul(c, 0.85);
      if (v > h - 0.9) return 0xc8c0b0;
      const row = fl(v / 1.5);
      if (v - row * 1.5 < 0.4) return 0xc8bca8;
      return cmul(c, 0.94 + hash2(fl((u + (row & 1) * 2) / 4), row, 2) * 0.12);
    };
    case 'metal': return (u, v) => cmul(c, (fl(u) & 1) ? 0.9 : 1.05);
    case 'rail': return (u, v) => {
      if (u - fl(u / 4) * 4 < 0.6) return c;
      if (v > h - 0.7 || Math.abs(v - h * 0.45) < 0.4) return c;
      return -1;
    };
    case 'hedge': return (u, v) => {
      if (v > h - 1 && hash2(fl(u), 1, 5) < 0.4) return -1;
      return cmul(0x3e7a2e, 0.85 + hash2(fl(u), fl(v), 9) * 0.3);
    };
    default: return solid(c);
  }
}

export function fenceX(pc, x0, x1, y, h, c, style = 'picket') { plane(pc, [x0, y, 0], [x1 - x0, 0, 0], [0, 0, h], fenceShader(style, h, c)); }
export function fenceY(pc, y0, y1, x, h, c, style = 'picket') { plane(pc, [x, y0, 0], [0, y1 - y0, 0], [0, 0, h], fenceShader(style, h, c)); }
// забор по периметру: сначала задние стороны (рисовать до здания), затем передние
export function fenceBack(pc, x0, y0, x1, y1, h, c, style) { fenceX(pc, x0, x1, y0, h, c, style); fenceY(pc, y0, y1, x0, h, c, style); }
export function fenceFront(pc, x0, y0, x1, y1, h, c, style, gate = null) {
  if (gate && gate.side === 'y') { fenceX(pc, x0, gate.a, y1, h, c, style); fenceX(pc, gate.b, x1, y1, h, c, style); }
  else fenceX(pc, x0, x1, y1, h, c, style);
  if (gate && gate.side === 'x') { fenceY(pc, y0, gate.a, x1, h, c, style); fenceY(pc, gate.b, y1, x1, h, c, style); }
  else fenceY(pc, y0, y1, x1, h, c, style);
}

export function lamp(pc, x, y, h = 10, c = 0x4a4a4a) {
  pole(pc, x, y, 0, h, c, 1);
  const [px, py] = pc.proj(x, y, h);
  pc.set(fl(px) + 1, fl(py), 0x303030); pc.set(fl(px) + 2, fl(py), 0x303030);
  pc.set(fl(px) + 2, fl(py) + 1, 0xfff0c0, 0xfff6d0);
  pc.set(fl(px) + 3, fl(py) + 1, 0xfff0c0, 0xfff6d0);
}

export function bench(pc, x, y, axis = 'x') {
  if (axis === 'x') box(pc, x, y, 1.2, 6, 1.6, 0.8, { top: 0x8a5a30, left: 0x6a4020, right: 0x6a4020 });
  else box(pc, x, y, 1.2, 1.6, 6, 0.8, { top: 0x8a5a30, left: 0x6a4020, right: 0x6a4020 });
}

export function antenna(pc, x, y, z, h = 6) {
  pole(pc, x, y, z, h, 0x606060);
  for (let k = 0; k < 3; k++) {
    const zz = z + h - k * 1.6;
    line3(pc, [x - 2 + k * 0.4, y + 2 - k * 0.4, zz], [x + 2 - k * 0.4, y - 2 + k * 0.4, zz], 0x707070);
  }
}
export function dish(pc, x, y, z) {
  pole(pc, x, y, z, 2, 0x606060);
  blob(pc, x, y, z + 3, 1.6, 1.8, (lf) => cmul(0xe8e8e8, Math.min(1.1, lf)), 3);
}
export function chimney(pc, x, y, z, w, h, c = 0x8a4a34) {
  box(pc, x, y, z, w, w, h, { top: 0x202020, left: c, right: c });
  box(pc, x - 0.4, y - 0.4, z + h - 1, w + 0.8, w + 0.8, 1, { top: 0x303030, left: cmul(c, 1.1), right: cmul(c, 1.1) });
}
export function acUnit(pc, x, y, z) { box(pc, x, y, z, 3, 3, 2, { top: 0xb8bcc0, left: 0xa0a4a8, right: 0x909498 }); }
export function vent(pc, x, y, z, s = 2.5, h = 3) { box(pc, x, y, z, s, s, h, { top: 0x404040, left: 0x8a8a8a, right: 0x7a7a7a }); }

// Заводская труба: суженная кверху, с красно-белыми полосами
export function stack(pc, x, y, r, h, opt = {}) {
  const base = opt.color ?? 0x9a5a44;
  lathe(pc, x, y, opt.z ?? 0, h, (t) => r * (1 - t * 0.35), (psi, z) => {
    if (opt.striped && z > h * 0.55 && (fl(z / 5) & 1)) return 0xe8e4dc;
    if (opt.striped && z > h * 0.55) return 0xc02a1a;
    if (opt.brick) return cmul(base, 0.92 + hash2(fl(psi * 8), fl(z / 1.5), 2) * 0.14);
    return cmul(base, 0.95 + hash2(fl(psi * 6), fl(z / 3), 1) * 0.08);
  }, () => 0x1a1a1a);
}
export function tank(pc, x, y, r, h, c = 0xd8dcd8, top = null, z = 0) {
  lathe(pc, x, y, z, h, () => r, (psi, zz) => (Math.abs(zz - z - h * 0.6) < 0.5 ? cmul(c, 0.85) : c), () => top ?? cmix(c, 0xffffff, 0.15));
}
export function sphereTank(pc, x, y, r, z, c = 0xe0e4e8) {
  for (const [dx, dy] of [[-r * 0.6, -r * 0.6], [r * 0.6, -r * 0.6], [-r * 0.6, r * 0.6], [r * 0.6, r * 0.6]]) pole(pc, x + dx, y + dy, 0, z, 0x606870, 1);
  lathe(pc, x, y, z - r, 2 * r, (t) => Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)) * r, () => c, () => cmix(c, 0xffffff, 0.2));
}
export function pipeX(pc, x0, x1, y, z, d, c) { box(pc, x0, y, z, x1 - x0, d, d, { top: cmix(c, 0xffffff, 0.2), left: c, right: cmul(c, 0.8) }); }
export function pipeY(pc, y0, y1, x, z, d, c) { box(pc, x, y0, z, d, y1 - y0, d, { top: cmix(c, 0xffffff, 0.2), left: cmul(c, 0.8), right: c }); }

export function flag(pc, x, y, z, h = 12, colors = [0xf8f8f8, 0x2050c0, 0xd02020]) {
  pole(pc, x, y, z, h, 0xc8c8c8);
  plane(pc, [x, y, z + h - 4.5], [0.01, 6, 0], [0, 0, 4.5], (u, v) => colors[2 - Math.min(2, fl(v / 1.5))]);
}

export function car(pc, x, y, dir, type = 'lada', color = null) { drawVehicle(pc, x, y, dir, type, color, false); }
export function tree(pc, x, y, type = 'oak', sc = 1, seed = 0) { drawTree(pc, x, y, type, sc, seed); }

export function beds(pc, x, y, w, d, crop = 0x4a8a30, seed = 0) { // грядки
  plane(pc, [x, y, 0.2], [w, 0, 0], [0, d, 0], (u, v) => {
    const r = v - fl(v / 3) * 3;
    if (r < 1.2) return cmul(0x6a4a2a, 0.9 + hash2(fl(u), fl(v), seed) * 0.15);
    return hash2(fl(u), fl(v), seed + 1) < 0.55 ? cmul(crop, 0.85 + hash2(fl(u), fl(v), seed + 2) * 0.3) : 0x5a3e24;
  });
}

export function greenhouse(pc, x, y, w, d, h = 5) {
  const gl = (u, v) => ((fl(u) % 3 === 0) || (fl(v) % 3 === 0) ? 0xd0d8d8 : cmix(0x9ac0c8, 0xffffff, hash2(fl(u / 3), fl(v / 3), 4) * 0.3));
  box(pc, x, y, 0, w, d, h, { left: gl, right: gl, top: null });
  gable(pc, x, y, h, w, d, 2.5, w >= d ? 'x' : 'y', { roof: gl, gable: gl }, 0.3);
}

export function woodpile(pc, x, y) {
  box(pc, x, y, 0, 5, 3, 3, { top: 0xb08050, left: (u, v) => ((fl(u) + fl(v)) % 2 ? 0xc89868 : 0x8a6038), right: 0x7a5030 });
}

export function shed(pc, x, y, w, d, h, wallc = 0x7a5a3a, roofc = 0x8a8e8c) {
  box(pc, x, y, 0, w, d, h, { left: noisy(wallc, 0.08), right: noisy(wallc, 0.08), top: null });
  gable(pc, x, y, h, w, d, 2.5, w >= d ? 'x' : 'y', { roof: roofSlate(roofc), gable: noisy(wallc, 0.08) }, 0.8);
}

export function bushRow(pc, x0, y0, x1, y1, n, seed = 0) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    drawTree(pc, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 'bush', 0.8 + hash2(i, 0, seed) * 0.4, seed + i);
  }
}

export function playground(pc, x, y) {
  // песочница
  box(pc, x, y, 0, 6, 6, 0.8, { top: (u, v) => (u < 0.8 || v < 0.8 || u > 5.2 || v > 5.2 ? 0xa06a3a : cmul(0xe0c890, 0.9 + hash2(fl(u), fl(v), 3) * 0.2)), left: 0x8a5a2a, right: 0x7a4a20 });
  // горка
  box(pc, x + 9, y + 1, 0, 2, 2, 5, { top: 0xd04030, left: 0xc03020, right: 0xa02018 });
  plane(pc, [x + 11, y + 1, 5], [5, 0, -5], [0, 2, 0], 0xc0c8d0);
  // качели
  pole(pc, x + 2, y + 10, 0, 6, 0x3060c0); pole(pc, x + 8, y + 10, 0, 6, 0x3060c0);
  line3(pc, [x + 2, y + 10, 6], [x + 8, y + 10, 6], 0x3060c0);
  line3(pc, [x + 5, y + 10, 6], [x + 5, y + 10, 2], 0x505050);
  box(pc, x + 4, y + 9.5, 1.6, 2, 1, 0.4, { top: 0xe0b030, left: 0xc09020, right: 0xb08018 });
}

export function rocket(pc, x, y) { // горка-ракета
  lathe(pc, x, y, 0, 16, (t) => (t < 0.75 ? 2.6 : 2.6 * (1 - (t - 0.75) / 0.25)), (psi, z) => (fl(z / 3) % 2 ? 0xd03028 : 0xe8e0d0), () => 0xd03028);
  for (const [dx, dy] of [[3, 0], [0, 3], [-3, 0], [0, -3]]) box(pc, x + dx - 0.4, y + dy - 0.4, 0, 0.8, 0.8, 4, { top: 0x3060c0, left: 0x3060c0, right: 0x2050a0 });
}

// отдельная вывеска-щит с текстом (светится ночью)
export function sign3(pc, x, y, z, w, h, text, col, bg, axis = 'x') {
  const tw = textWidth(text);
  const m = textMask(text, (w - tw) / 2, (h - 5) / 2);
  const sh = (u, v) => { if (m(u, v)) { S.glow = col; return col; } return bg; };
  if (axis === 'x') plane(pc, [x, y, z], [w, 0, 0], [0, 0, h], sh);
  else plane(pc, [x, y, z], [0, w, 0], [0, 0, h], sh);
}

// Простое здание: короб со стенами и крышей
// w: опции стены (общие), w.left / w.right — переопределения для граней; roof: {type, ...}
export function bldg(pc, x, y, z, sx, sy, h, w, roof = { type: 'flat' }) {
  const mk = (L, ex) => wall({ ...w, L, H: h, ...(ex || {}) });
  let top = null;
  if (roof.type === 'flat') top = flatRoof(roof.color ?? 0x6a6a68, sx, sy, w.seed ?? 1, roof.rim);
  box(pc, x, y, z, sx, sy, h, { right: mk(sy, w.right), left: mk(sx, w.left), top });
  const mat = roofMaterial(roof);
  const gw = (L) => {
    const base = w.base ?? 0xd8cdb4;
    const wl = wall({ ...w, L, H: roof.rh ?? 6, noWindows: true, door: null, sign: null, ground: 0, trim: -1, plinth: base });
    return (u, v) => {
      if (roof.attic !== false && Math.abs(u - L / 2) < 1.2 && v > 1.5 && v < 4) { return v > 3.2 ? 0xb8d0e0 : 0x2c4058; }
      return wl(u, v + 2);
    };
  };
  if (roof.type === 'gable') {
    const ax = roof.axis ?? (sx >= sy ? 'x' : 'y');
    gable(pc, x, y, z + h, sx, sy, roof.rh ?? 6, ax, { roof: mat, gable: gw(ax === 'x' ? sy : sx) }, roof.o ?? 1.5);
  } else if (roof.type === 'hip') {
    hip(pc, x, y, z + h, sx, sy, roof.rh ?? 6, mat, roof.o ?? 1.5);
  }
}
export function roofMaterial(roof) {
  const c = roof.color ?? 0x8a8e8c;
  switch (roof.mat) {
    case 'tiles': return roofTiles(c, 3);
    case 'metal': return roofMetal(c, 3);
    case 'slate': return roofSlate(c, 3);
    default: return roofSlate(c, 3);
  }
}

export { wall, cmix, cmul, hash2 };
