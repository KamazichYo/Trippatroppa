// Машины 90-х: «Жигули», «Волга», «Москвич», «Запорожец», УАЗ, РАФ, ПАЗ, «Икарус», КамАЗ, ЗИЛ...
import { PC, box, plane, S } from '../engine/pixel.js';
import { cmul, cmix } from '../engine/util.js';

const GLASS = 0x2a3a4a, TIRE = 0x1a1a1a;
const HEAD = 0xfff4c8, TAIL = 0xff3020;

export const VEHICLE_TYPES = {
  lada: { l: 9, w: 4.4, h: 2.4, cab: [3.2, 4.6, 2.0], color: null },
  volga: { l: 10.5, w: 4.8, h: 2.6, cab: [3.4, 5, 2.1], color: null },
  moskvich: { l: 8.6, w: 4.3, h: 2.4, cab: [2.8, 4.4, 2.0], color: null },
  zaz: { l: 7, w: 4, h: 2.3, cab: [2.2, 3.4, 2.0], color: null },
  niva: { l: 8, w: 4.6, h: 3, cab: [1.6, 5.4, 2.2], color: null },
  uaz: { l: 8.5, w: 4.8, h: 3.4, cab: [1.4, 6.4, 2.6], color: 0x5d6b3a },
  merc: { l: 10.5, w: 4.8, h: 2.5, cab: [3.4, 5, 2.0], color: 0x161616 },
  rafik: { l: 10, w: 5, h: 5.4, cab: null, color: 0xe8e4d8, van: true },
  police: { l: 8.5, w: 4.8, h: 3.4, cab: [1.4, 6.4, 2.6], color: 0xe8ecf0, stripe: 0x2050c0, beacon: 0x3070ff },
  ambulance: { l: 10, w: 5, h: 5.4, cab: null, color: 0xf0ece0, van: true, stripe: 0xd02020, beacon: 0xff3030 },
  bus: { l: 15, w: 5.4, h: 6.6, cab: null, color: 0xe8c040, bus: true },
  ikarus: { l: 22, w: 5.6, h: 6.8, cab: null, color: 0xf0b020, bus: true, accordion: true },
  truck: { l: 14, w: 5.4, h: 6, truck: true, color: 0xe06020, cargo: 0x6a7a4a },
  fire: { l: 15, w: 5.4, h: 6.4, truck: true, color: 0xd42020, cargo: 0xc81818, beacon: 0x3070ff, ladder: true },
  garbage: { l: 14, w: 5.4, h: 6.4, truck: true, color: 0x3a7ab0, cargo: 0x5a8a3a },
  tractor: { l: 8, w: 4.6, h: 5, tractor: true, color: 0x2a6ab0 },
};

// dir: 0:+x 1:+y 2:-x 3:-y
export function drawVehicle(pc, cx, cy, dir, type, color, lights = true) {
  const T = VEHICLE_TYPES[type];
  const body = color ?? T.color ?? 0xb02020;
  const alongX = dir === 0 || dir === 2;
  const fwd = dir === 0 || dir === 1 ? 1 : -1;
  const L = T.l, W = T.w;
  // локальные -> мировые
  const rect = (a0, a1, b0, b1) => alongX
    ? [cx + Math.min(a0, a1) * 1, cy + b0, Math.abs(a1 - a0), b1 - b0]
    : [cx + b0, cy + Math.min(a0, a1), b1 - b0, Math.abs(a1 - a0)];
  const fz = (a) => a * fwd; // вдоль направления
  // грань, смотрящая вперёд (+x или +y), — это перед, если fwd>0, иначе зад
  const frontVisible = fwd > 0;
  const endShader = (base, hLights) => (u, v) => {
    if (v < 1) return TIRE;
    if (lights && v >= hLights - 0.6 && v < hLights + 0.8 && (u < 1.2 || u > W - 1.2)) {
      if (frontVisible) { S.glow = HEAD; return 0xf0f0e0; }
      S.glow = TAIL; return 0xc02010;
    }
    if (frontVisible && v >= hLights - 0.6 && v < hLights + 0.8) return 0x404040; // решётка
    return base;
  };
  const sideShader = (base, len, wheelsAt) => (u, v) => {
    if (v < 1.4) {
      for (const w of wheelsAt) if (Math.abs(u - w) < 1.3) return TIRE;
      return v < 0.6 ? -1 : cmul(base, 0.6);
    }
    if (T.stripe && v > 2 && v < 2.8) return T.stripe;
    return base;
  };
  const z0 = 0;
  if (T.bus || T.van) {
    const [x, y, sx, sy] = rect(-L / 2, L / 2, -W / 2, W / 2);
    const wheels = [L * 0.2, L * 0.8];
    const winSide = (u, v) => {
      if (v < 1.4) { for (const w of wheels) if (Math.abs(u - w) < 1.4) return TIRE; return v < 0.6 ? -1 : 0x303030; }
      if (v > T.h * 0.52 && v < T.h - 0.9 && u > 1 && u < L - 1) {
        if ((Math.floor(u) % 4) === 0) return cmul(body, 0.8);
        S.glow = 0xfff0b0; return cmix(GLASS, 0x7090a8, 0.3);
      }
      if (T.accordion && Math.abs(u - L * 0.55) < 0.8) return 0x202020;
      if (T.stripe && v > 2.2 && v < 3.2) return T.stripe;
      if (T.bus && v > 2 && v < 2.6) return 0xe8e8e0;
      return body;
    };
    const endS = (u, v) => {
      if (v < 1) return TIRE;
      if (v > T.h * 0.5 && v < T.h - 0.8 && u > 0.6 && u < W - 0.6) return frontVisible ? cmix(GLASS, 0x90b0c8, 0.3) : cmul(GLASS, 1.2);
      if (lights && v >= 1.4 && v < 2.6 && (u < 1.2 || u > W - 1.2)) { if (frontVisible) { S.glow = HEAD; return 0xf0f0e0; } S.glow = TAIL; return 0xc02010; }
      return body;
    };
    if (alongX) {
      plane(pc, [x + sx, y, z0], [0, sy, 0], [0, 0, T.h], endS);
      plane(pc, [x, y + sy, z0], [sx, 0, 0], [0, 0, T.h], winSide);
    } else {
      plane(pc, [x + sx, y, z0], [0, sy, 0], [0, 0, T.h], winSide);
      plane(pc, [x, y + sy, z0], [sx, 0, 0], [0, 0, T.h], endS);
    }
    plane(pc, [x, y, z0 + T.h], [sx, 0, 0], [0, sy, 0], (u, v) => (T.bus && (Math.floor(u + v) % 7 === 0) ? cmul(body, 0.85) : cmix(body, 0xffffff, 0.15)));
    if (T.beacon) {
      const [bx, by] = alongX ? [x + sx / 2 + fz(L * 0.3), y + sy / 2] : [x + sx / 2, y + sy / 2 + fz(L * 0.3)];
      box(pc, bx - 0.8, by - 1.4, T.h, 1.6, 2.8, 1, { top: T.beacon, left: T.beacon, right: T.beacon });
    }
    return;
  }
  if (T.truck || T.tractor) {
    // кабина спереди, кузов сзади
    const cabL = T.tractor ? 3.5 : 4.5;
    const cabA = [L / 2 - cabL, L / 2].map(fz), carA = [-L / 2, L / 2 - cabL - 0.6].map(fz);
    const drawPart = (a0, a1, h, col, isCab) => {
      const [x, y, sx, sy] = rect(a0, a1, -W / 2, W / 2);
      const len = Math.abs(a1 - a0);
      const sideS = (u, v) => {
        if (v < 1.8) { if (Math.abs(u - len / 2) < 1.6 || (!isCab && Math.abs(u - len * 0.25) < 1.6)) return TIRE; return v < 0.7 ? -1 : 0x2a2a2a; }
        if (isCab && v > h * 0.55 && v < h - 0.8 && u > 0.6 && u < len - 0.6) return cmix(GLASS, 0x7090a8, 0.3);
        if (!isCab && T.ladder && v > h - 1.5) return 0xd0d0d0;
        if (!isCab && T.cargo && (Math.floor(u) % 3 === 0)) return cmul(col, 0.85);
        return col;
      };
      const endS = (u, v) => {
        if (v < 1.8) return v < 0.8 ? TIRE : 0x2a2a2a;
        if (isCab && frontVisible && v > h * 0.55 && v < h - 0.8 && u > 0.6 && u < W - 0.6) return cmix(GLASS, 0x90b0c8, 0.3);
        if (lights && v >= 2 && v < 3 && (u < 1.2 || u > W - 1.2)) {
          if (isCab && frontVisible) { S.glow = HEAD; return 0xf0f0e0; }
          if (!isCab && !frontVisible) { S.glow = TAIL; return 0xc02010; }
        }
        return col;
      };
      if (alongX) { plane(pc, [x + sx, y, 0], [0, sy, 0], [0, 0, h], endS); plane(pc, [x, y + sy, 0], [sx, 0, 0], [0, 0, h], sideS); }
      else { plane(pc, [x + sx, y, 0], [0, sy, 0], [0, 0, h], sideS); plane(pc, [x, y + sy, 0], [sx, 0, 0], [0, 0, h], endS); }
      plane(pc, [x, y, h], [sx, 0, 0], [0, sy, 0], cmix(col, 0xffffff, 0.12));
    };
    if (T.tractor) {
      drawPart(-L / 2, L / 2, 3, T.color, false);
      const [x, y, sx, sy] = rect(fz(-L / 2 + 0.5), fz(L / 2 - 3.5), -W / 2 + 0.6, W / 2 - 0.6);
      box(pc, x, y, 3, sx, sy, 3, { top: 0xd0d0d0, left: cmix(GLASS, 0x90b0c8, 0.4), right: cmix(GLASS, 0x90b0c8, 0.4) });
      return;
    }
    if (frontVisible) { drawPart(carA[0], carA[1], T.h, T.cargo, false); drawPart(cabA[0], cabA[1], T.h - 1, body, true); }
    else { drawPart(cabA[0], cabA[1], T.h - 1, body, true); drawPart(carA[0], carA[1], T.h, T.cargo, false); }
    if (T.beacon) {
      const a = fz(L / 2 - 2.5);
      const [x, y] = alongX ? [cx + a, cy] : [cx, cy + a];
      box(pc, x - 0.7, y - 1.6, T.h - 1, 1.4, 3.2, 1, { top: T.beacon, left: T.beacon, right: T.beacon });
    }
    return;
  }
  // легковые
  const [x, y, sx, sy] = rect(-L / 2, L / 2, -W / 2, W / 2);
  const wheels = [L * 0.22, L * 0.78];
  const hb = T.h * 0.55;
  const side = sideShader(body, L, wheels);
  const endS = endShader(body, hb - 0.8);
  if (alongX) { plane(pc, [x + sx, y, 0], [0, sy, 0], [0, 0, hb], endS); plane(pc, [x, y + sy, 0], [sx, 0, 0], [0, 0, hb], side); }
  else { plane(pc, [x + sx, y, 0], [0, sy, 0], [0, 0, hb], side); plane(pc, [x, y + sy, 0], [sx, 0, 0], [0, 0, hb], endS); }
  plane(pc, [x, y, hb], [sx, 0, 0], [0, sy, 0], cmix(body, 0xffffff, 0.12));
  // кабина
  const [cOff, cLen, cH] = T.cab;
  const a0 = fz(-L / 2 + cOff), a1 = fz(-L / 2 + cOff + cLen);
  const [qx, qy, qsx, qsy] = rect(a0, a1, -W / 2 + 0.5, W / 2 - 0.5);
  const gl = cmix(GLASS, 0x8aa8c0, 0.35);
  const cabSide = (u, v) => (v > cH - 0.7 ? body : (Math.abs(u - cLen * 0.5) < 0.5 ? body : gl));
  const cabEnd = (u, v) => (v > cH - 0.7 ? body : (u < 0.5 || u > (W - 1) - 0.5) ? body : gl);
  if (alongX) { plane(pc, [qx + qsx, qy, hb], [0, qsy, 0], [0, 0, cH], cabEnd); plane(pc, [qx, qy + qsy, hb], [qsx, 0, 0], [0, 0, cH], cabSide); }
  else { plane(pc, [qx + qsx, qy, hb], [0, qsy, 0], [0, 0, cH], cabSide); plane(pc, [qx, qy + qsy, hb], [qsx, 0, 0], [0, 0, cH], cabEnd); }
  plane(pc, [qx, qy, hb + cH], [qsx, 0, 0], [0, qsy, 0], cmix(body, 0xffffff, 0.2));
  if (T.beacon) box(pc, qx + qsx / 2 - 0.6, qy + qsy / 2 - 1.2, hb + cH, 1.2, 2.4, 0.9, { top: T.beacon, left: T.beacon, right: 0xff3030 });
}

// Кэш спрайтов машин
const cache = new Map();
export function vehicleSprite(type, color, dir) {
  const key = type + '|' + color + '|' + dir;
  let s = cache.get(key);
  if (s) return s;
  const W = 48, H = 40;
  const pc = new PC(W, H, W / 2, H - 14);
  drawVehicle(pc, 0, 0, dir, type, color);
  s = { day: pc.toCanvas('day'), night: pc.toCanvas('night'), ax: W / 2, ay: H - 14 };
  cache.set(key, s);
  return s;
}
