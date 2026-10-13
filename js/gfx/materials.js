// Материалы-шейдеры для граней: стены с окнами, кирпич, панели, крыши, газоны, асфальт.
import { S } from '../engine/pixel.js';
import { hash2, cmul, cmix, hex } from '../engine/util.js';
import { textMask, textWidth } from '../engine/font.js';

const fl = Math.floor;

export const WARM = [0xffd47a, 0xffe6a3, 0xffc25e, 0xfff0c8, 0xffb04a];
export const TV = 0x9fd2ff;

export function solid(c) { return () => c; }
export function noisy(c, amt = 0.05, seed = 0, sc = 1) {
  return (u, v) => cmul(c, 1 + (hash2(fl(u * sc), fl(v * sc), seed) - 0.5) * amt * 2);
}

// ---------- базовые текстуры стен ----------
function texColor(tex, base, u, v, seed, o) {
  switch (tex) {
    case 'brick': {
      const row = fl(v / 2);
      const off = (row & 1) * 2;
      const bu = fl((u + off) / 4);
      if (v - row * 2 < 0.55 || (u + off) - bu * 4 < 0.6) return cmix(base, 0xd8d0c0, 0.45);
      return cmul(base, 0.92 + hash2(bu, row, seed) * 0.16);
    }
    case 'silicate': { // белый силикатный кирпич
      const row = fl(v / 2);
      const off = (row & 1) * 2;
      const bu = fl((u + off) / 4);
      if (v - row * 2 < 0.5) return cmul(base, 0.86);
      return cmul(base, 0.95 + hash2(bu, row, seed) * 0.08);
    }
    case 'panel': {
      const ph = o.floorH || 8, pw = o.panelW || 12;
      const pu = u - fl(u / pw) * pw, pv = v - fl(v / ph) * ph;
      if (pu < 0.6 || pv < 0.55) return cmul(base, 0.8);
      return cmul(base, 0.96 + hash2(fl(u / pw), fl(v / ph), seed) * 0.08 + (hash2(fl(u), fl(v), seed + 1) - 0.5) * 0.04);
    }
    case 'wood': {
      const row = fl(v / 2);
      if (v - row * 2 < 0.5) return cmul(base, 0.72);
      return cmul(base, 0.92 + hash2(row, fl(u / 7), seed) * 0.14);
    }
    case 'concrete':
      return cmul(base, 0.93 + hash2(fl(u), fl(v), seed) * 0.1 - (hash2(fl(u / 3), 0, seed) < 0.2 && v < 6 ? 0.06 : 0));
    case 'metal': {
      return cmul(base, (fl(u) & 1) ? 0.9 : 1.04);
    }
    case 'tile': { // облицовочная плитка
      if (u - fl(u / 3) * 3 < 0.5 || v - fl(v / 3) * 3 < 0.5) return cmul(base, 0.88);
      return cmul(base, 0.97 + hash2(fl(u / 3), fl(v / 3), seed) * 0.06);
    }
    case 'glass': {
      const mull = (u - fl(u / 4) * 4 < 0.6) || (v - fl(v / 4) * 4 < 0.55);
      if (mull) return cmul(base, 0.6);
      const refl = hash2(fl((u + v * 0.6) / 9), 0, seed) * 0.25;
      return cmix(base, 0xbfe2ff, 0.12 + refl + (v / (o.H || 40)) * 0.2);
    }
    default: // штукатурка
      return cmul(base, 0.97 + hash2(fl(u), fl(v), seed) * 0.05 - (hash2(fl(u / 5), fl(v / 7), seed + 3) < 0.08 ? 0.05 : 0));
  }
}

// ---------- стена с окнами ----------
// o: {base, tex, L, H, floorH, winW, winH, winY, colW, margin, ground, groundStyle, lit, seed, glass,
//     curtains, balcony, plinth, trim, door:{u,w,color}, sign:{text,color,bg}, stripe, shutters, frame}
export function wall(o) {
  const L = o.L, H = o.H;
  const floorH = o.floorH ?? 8, winW = o.winW ?? 3, winH = o.winH ?? 4, winY = o.winY ?? 2;
  const colW = o.colW ?? 6, margin = o.margin ?? 2, ground = o.ground ?? 0;
  const seed = o.seed ?? 1, lit = o.lit ?? 0.35;
  const glass = o.glass ?? 0x2c4560, frame = o.frame ?? -1;
  const tex = o.tex ?? 'plaster', base = o.base ?? 0xd8cdb4;
  const plinth = o.plinth ?? cmul(base, 0.6), trim = o.trim ?? -1;
  const topM = o.topMargin ?? 2;
  const floors = Math.max(0, fl((H - ground - topM) / floorH));
  const usable = L - 2 * margin;
  const n = o.noWindows ? 0 : Math.max(1, fl((usable + (colW - winW)) / colW));
  const total = n * colW - (colW - winW);
  const start = (L - total) / 2;
  const sign = o.sign;
  let signMask = null, signU0 = 0, signW = 0;
  if (sign) {
    signW = textWidth(sign.text);
    signU0 = (L - signW) / 2;
    signMask = textMask(sign.text, signU0, (sign.v ?? (ground - 6.5)));
  }
  const doors = o.doors ? o.doors : (o.door ? [o.door] : []);
  return (u, v) => {
    // цоколь
    if (v < 1.6) return plinth;
    // карниз
    if (trim >= 0 && v > H - 1.4) return trim;
    if (v > H - 0.8) return cmul(base, 0.75); // тень под крышей
    // двери
    for (let di = 0; di < doors.length; di++) {
      const door = doors[di];
      if (u >= door.u && u < door.u + door.w && v < (door.h ?? 6.5)) {
        if (u - door.u < 0.6 || door.u + door.w - u < 0.6 || v > (door.h ?? 6.5) - 0.7) return cmul(door.frame ?? base, 0.7);
        if (door.glass) { S.glow = WARM[1]; return cmix(glass, 0x8fb0c8, 0.3); }
        if (door.light && v > (door.h ?? 6.5) - 1.6) { S.glow = 0xfff0c0; }
        return door.color ?? 0x6b4a2e;
      }
    }
    // первый этаж (витрины)
    if (ground > 0 && v < ground) {
      if (signMask && v >= ground - 7.5 && v < ground - 0.5) {
        const bg = sign.bg ?? 0x2a2a2a;
        if (u >= signU0 - 1.5 && u < signU0 + signW + 1.5) {
          if (signMask(u, v)) { S.glow = sign.color; return sign.color; }
          return bg;
        }
      }
      if (o.groundStyle === 'shop') {
        const sv = v - 1.6;
        const top = ground - (signMask ? 8 : 2.5);
        const k = fl((u - start) / colW), fu = u - start - k * colW;
        if (sv > 0.6 && v < top && k >= 0 && k < n && fu >= -0.5 && fu < winW + 0.5) {
          if (fu < 0 || fu >= winW || v > top - 0.7) return cmul(o.shopFrame ?? 0x3a3a3a, 1);
          const g = hash2(k, 99, seed);
          S.glow = g < 0.8 ? WARM[(k + seed) % 5] : TV;
          if (v < top - 2.5 && hash2(fl(u), fl(v), seed + k) < 0.25) return cmix(glass, 0xe0c080, 0.4); // товары
          return cmix(glass, 0xa8c8e0, 0.25 + (v / ground) * 0.25);
        }
      }
      return texColor(o.groundTex ?? tex, o.groundBase ?? base, u, v, seed, o);
    }
    // окна по этажам
    const z = v - ground;
    const f = fl(z / floorH), fz = z - f * floorH;
    const k = fl((u - start) / colW), fu = u - start - k * colW;
    if (f < floors && k >= 0 && k < n) {
      const inW = fu >= 0 && fu < winW;
      if (inW && fz >= winY && fz < winY + winH) {
        const wh = hash2(k, f, seed);
        if (o.boarded && hash2(k, f, seed + 9) < o.boarded) return 0x6a5236;
        // рама
        if (frame >= 0 && (fu < 0.6 || fu > winW - 0.6 || fz > winY + winH - 0.6)) return frame;
        if (winW >= 4 && Math.abs(fu - winW / 2) < 0.5) return frame >= 0 ? frame : cmul(base, 0.8);
        // свет ночью
        const lh = hash2(k, f, seed + 1);
        if (lh < lit) S.glow = lh < lit * 0.12 ? TV : WARM[fl(hash2(k, f, seed + 2) * 5)];
        // шторы
        if (o.curtains !== false && wh < 0.45 && (fu < 1 || fu > winW - 1)) {
          const cc = [0xc0583a, 0xd8b048, 0x6f8f4f, 0xb6a48a, 0x9a4a6a][fl(wh * 11) % 5];
          if (S.glow >= 0) S.glow = cmix(S.glow, cc, 0.5);
          return cmul(cc, 0.85);
        }
        if (fz > winY + winH - 1.2) return cmix(glass, 0xb8d8f0, 0.45); // блик
        return cmul(glass, 0.9 + wh * 0.25);
      }
      // подоконник
      if (fz >= winY - 0.9 && fz < winY && fu >= -0.6 && fu < winW + 0.6) return o.sill ?? cmix(base, 0xffffff, 0.35);
      // балкон
      if (o.balcony && (k % (o.balcony.every ?? 2) === 0) && fz < winY - 0.9 && fz >= 0 && fu >= -1 && fu < winW + 1 && f > 0) {
        const bc = o.balcony.colors ? o.balcony.colors[fl(hash2(k, f, seed + 5) * o.balcony.colors.length)] : 0xc8c2b0;
        if (fz > winY - 1.7) return cmix(bc, 0xffffff, 0.2);
        return cmul(bc, 0.95);
      }
      // ставни
      if (o.shutters && fz >= winY && fz < winY + winH && (fu >= -1.2 && fu < 0 || fu >= winW && fu < winW + 1.2)) return o.shutters;
    }
    if (o.stripe != null && f > 0 && fz < 0.8) return o.stripe;
    let c = texColor(tex, base, u, v, seed, o);
    if (u > L - 0.7 || u < 0.6) c = cmul(c, 1.08); // угол
    return c;
  };
}

// ---------- крыши ----------
export function roofTiles(c, seed = 0) { // черепица
  return (u, v) => {
    const row = fl(v / 2.5), fv = v - row * 2.5;
    const off = (row & 1) * 1.5;
    const col = fl((u + off) / 3);
    let k = 0.94 + hash2(col, row, seed) * 0.12;
    if (fv < 0.7) k *= 0.72;
    return cmul(c, k);
  };
}
export function roofSlate(c, seed = 0) { // шифер
  return (u, v) => {
    const w = (fl(u) % 3);
    let k = w === 0 ? 0.86 : w === 1 ? 1.04 : 0.98;
    const row = fl(v / 7);
    if (v - row * 7 < 0.7) k *= 0.82;
    if (hash2(fl(u / 3), row, seed) < 0.06) k *= 0.85; // старые листы
    if (hash2(fl(u / 2), fl(v / 2), seed + 4) < 0.05) return cmix(c, 0x5d7a3a, 0.4); // мох
    return cmul(c, k);
  };
}
export function roofMetal(c, seed = 0) {
  return (u, v) => {
    let k = (fl(u) & 1) ? 0.9 : 1.05;
    if (hash2(fl(u / 4), fl(v / 6), seed) < 0.07) return cmix(c, 0x8a4a28, 0.5); // ржавчина
    return cmul(c, k);
  };
}
export function flatRoof(c, L, W, seed = 0, rim = null) {
  const rc = rim ?? cmix(c, 0xffffff, 0.25);
  return (u, v) => {
    if (u < 1.3 || v < 1.3 || u > L - 1.3 || v > W - 1.3) return rc;
    if (u < 2.1 || v < 2.1) return cmul(c, 0.8);
    const h = hash2(fl(u), fl(v), seed);
    let k = 0.94 + h * 0.1;
    if (hash2(fl(u / 5), fl(v / 5), seed + 2) < 0.12) k *= 0.88; // лужи/заплатки
    return cmul(c, k);
  };
}

// ---------- участки ----------
export const GRASS = [0x5f9a3c, 0x6aa744, 0x548c35, 0x77b24e];
export function lawn(seed = 0, flowers = 0.02, dry = 0) {
  return (u, v) => {
    const h = hash2(fl(u), fl(v), seed);
    const n = hash2(fl(u / 3), fl(v / 3), seed + 1);
    let c = GRASS[fl(n * 3.99)];
    if (dry) c = cmix(c, 0xa59a50, dry * hash2(fl(u / 4), fl(v / 4), seed + 3));
    if (h < flowers) return [0xf0e070, 0xe8e0c8, 0xe07090, 0xa0a0ff][fl(h * 400) % 4];
    if (h > 0.9) c = cmul(c, 1.12);
    else if (h < 0.15) c = cmul(c, 0.9);
    return c;
  };
}
export function pavement(c = 0xb8b2a6, seed = 0, tile = 4) {
  return (u, v) => {
    if (u - fl(u / tile) * tile < 0.5 || v - fl(v / tile) * tile < 0.5) return cmul(c, 0.84);
    return cmul(c, 0.95 + hash2(fl(u / tile), fl(v / tile), seed) * 0.08);
  };
}
export function asphalt(c = 0x55565a, seed = 0) {
  return (u, v) => {
    const h = hash2(fl(u), fl(v), seed);
    let k = 0.95 + h * 0.08;
    if (hash2(fl(u / 6), fl(v / 6), seed + 7) < 0.08) k *= 0.88;
    return cmul(c, k);
  };
}
export function dirt(c = 0x8a6c48, seed = 0) {
  return (u, v) => {
    const h = hash2(fl(u), fl(v), seed);
    if (h < 0.06) return cmul(c, 0.75);
    if (h > 0.95) return cmix(c, 0xcfc0a0, 0.4);
    return cmul(c, 0.94 + hash2(fl(u / 2), fl(v / 2), seed + 1) * 0.12);
  };
}

// Участок с разметкой парковки
export function parking(seed = 0) {
  const a = asphalt(0x4e4f53, seed);
  return (u, v) => {
    const col = u - fl(u / 6) * 6;
    if (col < 0.6 && (v % 16) > 3 && (v % 16) < 12) return 0xd8d8d0;
    return a(u, v);
  };
}

export const pal = {
  plaster: [0xe3d6b8, 0xd9c5a0, 0xe6d2c0, 0xcfd6c6, 0xd8c0a0, 0xe8e0d0, 0xc9b49a, 0xdcd0b8],
  pastel: [0xe8b8a0, 0xa8c8d8, 0xe8d898, 0xb8d8a8, 0xd8b8d0, 0xf0d0a0, 0xc8d0e8],
  brick: [0xa04a34, 0x94442f, 0xb0583c, 0x8a3e2c, 0xb46a48],
  wood: [0x8a5a32, 0x7a5230, 0x9a6a3a, 0x6f8a5a, 0x5a7a9a, 0xa08a50, 0x8a8a6a],
  roofTile: [0xa84a30, 0x9a3f2c, 0xb85a38, 0x7a3a2a],
  slate: [0x9a9e9c, 0x8c908e, 0xa8aaa2, 0x7f8584],
  metal: [0x5a7a5a, 0x4a6a8a, 0x8a4a3a, 0x6a6a6a, 0x3a5a4a],
  panel: [0xd6d2c6, 0xc8cac4, 0xd8d0c0, 0xbfc4c0, 0xe0dcd0],
  glass: [0x2c4a68, 0x24485a, 0x30506a, 0x2a3e58, 0x1e4a50],
  car: [0xb02020, 0xe8e0d0, 0x2050a0, 0x208040, 0xd0b020, 0x303030, 0x707070, 0x8a1a4a, 0x2a8aa0, 0xc06020, 0x5a3a8a, 0x8aa0b0],
};

export { hex };
