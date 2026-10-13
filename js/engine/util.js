// Общие утилиты: математика, случайные числа, цвета, шум.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
export const randInt = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));

// ---- цвета как целые 0xRRGGBB ----
export const rgb = (r, g, b) => ((clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255));
export const hex = (s) => parseInt(s.replace('#', ''), 16);
export const R = (c) => (c >> 16) & 255;
export const G = (c) => (c >> 8) & 255;
export const B = (c) => c & 255;
export function cmul(c, f) { return rgb(R(c) * f, G(c) * f, B(c) * f); }
export function cmix(a, b, t) { return rgb(lerp(R(a), R(b), t), lerp(G(a), G(b), t), lerp(B(a), B(b), t)); }
export function cadd(c, d) { return rgb(R(c) + d, G(c) + d, B(c) + d); }
export const css = (c) => '#' + (c & 0xffffff).toString(16).padStart(6, '0');
export function cssA(c, a) { return `rgba(${R(c)},${G(c)},${B(c)},${a})`; }

// ---- шум ----
function vgrid(ix, iy, seed) { return hash2(ix, iy, seed); }
export function valueNoise(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  const a = vgrid(ix, iy, seed), b = vgrid(ix + 1, iy, seed);
  const c = vgrid(ix, iy + 1, seed), d = vgrid(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}
export function fbm(x, y, seed = 0, oct = 4) {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += valueNoise(x * f, y * f, seed + i * 97) * amp; n += amp; amp *= 0.5; f *= 2; }
  return s / n;
}

// матрица Байера 4x4 для дизеринга
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER4[((y & 3) << 2) | (x & 3)];

export function fmtMoney(v) {
  const neg = v < 0; v = Math.abs(Math.round(v));
  const s = v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '−' : '') + s + ' ₽';
}
export function fmtNum(v) {
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function plural(n, one, few, many) {
  n = Math.abs(n) % 100; const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}
