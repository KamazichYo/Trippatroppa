// Пиксельный изометрический растеризатор.
// Мир: тайл = 32 единицы. Экран: sx = x - y, sy = (x + y) / 2 - z  (тайл 64x32 px).
// Каждая грань рисуется попиксельно с «шейдером» (u, v) -> цвет, с освещением по нормали.
// Для каждого пикселя хранится цвет днём, цвет свечения ночью и флаг «смотрит вверх» (для снега).

import { clamp, cmul, cmix, hash2, R, G, B } from './util.js';

export const S = { glow: -1, nolight: false, up: -1 }; // шейдер может выставить свечение пикселя

const Lr = [0.25, 0.6, 1];
const Ll = Math.hypot(...Lr);
const L = Lr.map((v) => v / Ll);
const AMB = 0.5, DIF = 0.6, TOP = AMB + DIF * L[2];

export function lightOf(n) {
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  const d = (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / l;
  return (AMB + DIF * Math.max(0, d)) / TOP;
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);

export const NIGHT_TINT = 0x0e1430;
export const NIGHT_A = 0.72;
const SNOW = 0xeef3fb;

export class PC {
  constructor(w, h, ax, ay) {
    this.w = w | 0; this.h = h | 0; this.ax = ax; this.ay = ay;
    this.c = new Int32Array(this.w * this.h).fill(-1);
    this.g = new Int32Array(this.w * this.h).fill(-1);
    this.up = new Uint8Array(this.w * this.h);
  }
  proj(x, y, z) { if (this.swap) { const t = x; x = y; y = t; } return [this.ax + x - y, this.ay + (x + y) / 2 - z]; }
  projRaw(x, y, z) { return [this.ax + x - y, this.ay + (x + y) / 2 - z]; }
  set(x, y, c, g = -1, up = 0) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x; this.c[i] = c; this.g[i] = g; this.up[i] = up;
  }
  get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1; return this.c[(y | 0) * this.w + (x | 0)]; }
  // точка в мировых координатах
  dot(x, y, z, c, g = -1) { const [px, py] = this.proj(x, y, z); this.set(Math.floor(px), Math.floor(py), c, g); }

  toCanvas(mode = 'day') {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext('2d');
    const id = ctx.createImageData(this.w, this.h);
    const d = id.data;
    const night = mode === 'night' || mode === 'winterNight' || mode === 'ruinNight';
    const winter = mode === 'winter' || mode === 'winterNight';
    const ruin = mode === 'ruin' || mode === 'ruinNight';
    for (let i = 0, n = this.w * this.h; i < n; i++) {
      let c = this.c[i];
      if (c < 0) continue;
      if (winter && this.up[i]) {
        const x = i % this.w, y = (i / this.w) | 0;
        if (hash2(x, y, 7) < 0.9) c = cmix(c, SNOW, 0.82);
      }
      if (ruin) {
        const l = (R(c) * 0.3 + G(c) * 0.59 + B(c) * 0.11);
        c = cmix(c, (l << 16) | (l << 8) | l, 0.75);
        c = cmul(c, 0.7);
      }
      if (night) {
        const g = this.g[i];
        c = g >= 0 && !ruin ? g : cmix(c, NIGHT_TINT, NIGHT_A);
      }
      const o = i * 4;
      d[o] = (c >> 16) & 255; d[o + 1] = (c >> 8) & 255; d[o + 2] = c & 255; d[o + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    return cv;
  }
  hasGlow() { for (let i = 0; i < this.g.length; i++) if (this.g[i] >= 0) return true; return false; }
}

function inShape(a, b, sh) {
  // выпуклый многоугольник в параметрическом пространстве
  let sign = 0;
  for (let i = 0; i < sh.length; i++) {
    const p = sh[i], q = sh[(i + 1) % sh.length];
    const cr = (q[0] - p[0]) * (b - p[1]) - (q[1] - p[1]) * (a - p[0]);
    if (cr > 1e-7) { if (sign < 0) return false; sign = 1; }
    else if (cr < -1e-7) { if (sign > 0) return false; sign = -1; }
  }
  return true;
}

export const TRI = [[0, 0], [1, 0], [0.5, 1]];

// Плоская грань: O + a*U + b*V, a,b ∈ [0,1] (или форма shape в этих координатах).
// shader(u, v, a, b, light) -> цвет | -1
export function plane(pc, O, U, V, shader, shape = null, opt = null) {
  if (pc.swap) { O = [O[1], O[0], O[2]]; U = [U[1], U[0], U[2]]; V = [V[1], V[0], V[2]]; }
  const [ox, oy] = pc.projRaw(O[0], O[1], O[2]);
  const ux = U[0] - U[1], uy = (U[0] + U[1]) / 2 - U[2];
  const vx = V[0] - V[1], vy = (V[0] + V[1]) / 2 - V[2];
  const det = ux * vy - uy * vx;
  if (Math.abs(det) < 1e-6) return;
  let n = cross(U, V);
  if (n[0] + n[1] + n[2] < 0) n = [-n[0], -n[1], -n[2]];
  const lf = opt && opt.light != null ? opt.light : lightOf(n);
  const upFace = n[2] / (len(n) || 1) > 0.55 ? 1 : 0;
  const lu = len(U), lv = len(V);
  const flipU = ux < -1e-6; // текст и узоры всегда слева направо на экране
  const xs = [ox, ox + ux, ox + ux + vx, ox + vx], ys = [oy, oy + uy, oy + uy + vy, oy + vy];
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(pc.w - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(pc.h - 1, Math.ceil(Math.max(...ys)));
  const eps = 1e-4;
  const sh = typeof shader === 'number' ? (() => shader) : shader;
  for (let py = y0; py <= y1; py++) {
    const dy = py + 0.5 - oy;
    for (let px = x0; px <= x1; px++) {
      const dx = px + 0.5 - ox;
      const a = (dx * vy - dy * vx) / det, b = (ux * dy - uy * dx) / det;
      if (shape) { if (a < -eps || b < -eps || a > 1 + eps || b > 1 + eps || !inShape(a, b, shape)) continue; }
      else if (a < -eps || a > 1 + eps || b < -eps || b > 1 + eps) continue;
      S.glow = -1; S.nolight = false; S.up = -1;
      const ca = clamp(a, 0, 1);
      const col = sh((flipU ? 1 - ca : ca) * lu, clamp(b, 0, 1) * lv, a, b, lf);
      if (col < 0) continue;
      const i = py * pc.w + px;
      pc.c[i] = S.nolight ? col : cmul(col, lf);
      pc.g[i] = S.glow;
      pc.up[i] = S.up >= 0 ? S.up : upFace;
    }
  }
}

// Параллелепипед; sh = {top, left, right} (цвета или шейдеры; null — не рисовать)
// left — грань y = y+sy (u вдоль x), right — грань x = x+sx (u вдоль y), top — (u вдоль x, v вдоль y)
export function box(pc, x, y, z, sx, sy, sz, sh) {
  if (sh.right != null) plane(pc, [x + sx, y, z], [0, sy, 0], [0, 0, sz], sh.right);
  if (sh.left != null) plane(pc, [x, y + sy, z], [sx, 0, 0], [0, 0, sz], sh.left);
  if (sh.top != null) plane(pc, [x, y, z + sz], [sx, 0, 0], [0, sy, 0], sh.top);
}

// Двускатная крыша. axis 'x' — конёк вдоль x.  sh = {roof, gable}
export function gable(pc, x, y, z, sx, sy, rh, axis, sh, o = 1.5) {
  if (axis === 'x') {
    const ex = x - o, esx = sx + 2 * o;
    plane(pc, [ex, y - o, z - o * rh / (sy / 2)], [esx, 0, 0], [0, sy / 2 + o, rh + o * rh / (sy / 2)], sh.roof);
    plane(pc, [ex, y + sy + o, z - o * rh / (sy / 2)], [esx, 0, 0], [0, -(sy / 2 + o), rh + o * rh / (sy / 2)], sh.roof);
    if (sh.gable != null) plane(pc, [x + sx, y, z], [0, sy, 0], [0, 0, rh], sh.gable, [[0, 0], [1, 0], [0.5, 1]]);
  } else {
    const ey = y - o, esy = sy + 2 * o;
    plane(pc, [x - o, ey, z - o * rh / (sx / 2)], [0, esy, 0], [sx / 2 + o, 0, rh + o * rh / (sx / 2)], sh.roof);
    plane(pc, [x + sx + o, ey, z - o * rh / (sx / 2)], [0, esy, 0], [-(sx / 2 + o), 0, rh + o * rh / (sx / 2)], sh.roof);
    if (sh.gable != null) plane(pc, [x, y + sy, z], [sx, 0, 0], [0, 0, rh], sh.gable, [[0, 0], [1, 0], [0.5, 1]]);
  }
}

// Вальмовая (четырёхскатная) крыша / пирамида
export function hip(pc, x, y, z, sx, sy, rh, sh, o = 1.5) {
  x -= o; y -= o; sx += 2 * o; sy += 2 * o; z -= o * 0.5;
  if (sx >= sy) {
    const k = (sy / 2) / sx;
    plane(pc, [x, y, z], [sx, 0, 0], [0, sy / 2, rh], sh, [[0, 0], [1, 0], [1 - k, 1], [k, 1]]);
    plane(pc, [x, y, z], [0, sy, 0], [sy / 2, 0, rh], sh, TRI);
    plane(pc, [x + sx, y, z], [0, sy, 0], [-sy / 2, 0, rh], sh, TRI);
    plane(pc, [x, y + sy, z], [sx, 0, 0], [0, -sy / 2, rh], sh, [[0, 0], [1, 0], [1 - k, 1], [k, 1]]);
  } else {
    const k = (sx / 2) / sy;
    plane(pc, [x, y, z], [0, sy, 0], [sx / 2, 0, rh], sh, [[0, 0], [1, 0], [1 - k, 1], [k, 1]]);
    plane(pc, [x, y, z], [sx, 0, 0], [0, sx / 2, rh], sh, TRI);
    plane(pc, [x, y + sy, z], [sx, 0, 0], [0, -sx / 2, rh], sh, TRI);
    plane(pc, [x + sx, y, z], [0, sy, 0], [-sx / 2, 0, rh], sh, [[0, 0], [1, 0], [1 - k, 1], [k, 1]]);
  }
}

// Тело вращения: радиус r(t), t∈[0,1] по высоте h. shader(angle, z, light) -> цвет
export function lathe(pc, cx, cy, z0, h, rfn, shader, topShader = null) {
  const [scx, scy] = pc.proj(cx, cy, 0);
  const steps = Math.max(1, Math.ceil(h * 2));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps, z = z0 + t * h, r = rfn(t);
    if (r <= 0) continue;
    const Rx = r * Math.SQRT2, Ry = Rx / 2;
    const cyz = scy - z;
    const isTop = s === steps;
    for (let py = Math.floor(cyz - Ry - 1); py <= Math.ceil(cyz + Ry + 1); py++) {
      for (let px = Math.floor(scx - Rx - 1); px <= Math.ceil(scx + Rx + 1); px++) {
        const dx = (px + 0.5 - scx) / Rx, dy = (py + 0.5 - cyz) / Ry;
        const q = dx * dx + dy * dy;
        if (q > 1) continue;
        if (py < 0 || px < 0 || py >= pc.h || px >= pc.w) continue;
        const i = py * pc.w + px;
        // угол точки на окружности -> нормаль
        const psi = Math.atan2(dy, dx); // экранный угол
        const th = psi - Math.PI / 4; // мировой угол (приближённо)
        const nx = Math.cos(th), ny = Math.sin(th);
        S.glow = -1; S.nolight = false; S.up = -1;
        let col;
        if (isTop && topShader) {
          col = topShader(dx, dy, z);
          if (col < 0) continue;
          pc.c[i] = S.nolight ? col : col; pc.g[i] = S.glow; pc.up[i] = 1;
          continue;
        }
        const lf = lightOf([nx, ny, 0.15]);
        col = shader(psi, z, lf, dx);
        if (col < 0) continue;
        pc.c[i] = S.nolight ? col : cmul(col, lf); pc.g[i] = S.glow; pc.up[i] = S.up >= 0 ? S.up : 0;
      }
    }
  }
}

export function cyl(pc, cx, cy, z0, r, h, shader, topShader) {
  lathe(pc, cx, cy, z0, h, () => r, typeof shader === 'number' ? () => shader : shader,
    topShader == null ? null : (typeof topShader === 'number' ? () => topShader : topShader));
}

// Сфероид/крона: эллипсоид с текстурой. col(lightLevel, px, py) -> цвет
export function blob(pc, cx, cy, cz, rx, rz, colfn, seed = 0, holes = 0) {
  const [sx, sy] = pc.proj(cx, cy, cz);
  const Rx = rx * Math.SQRT2 * 0.82, Ry = rz;
  for (let py = Math.floor(sy - Ry - 1); py <= Math.ceil(sy + Ry + 1); py++) {
    for (let px = Math.floor(sx - Rx - 1); px <= Math.ceil(sx + Rx + 1); px++) {
      if (py < 0 || px < 0 || py >= pc.h || px >= pc.w) continue;
      const dx = (px + 0.5 - sx) / Rx, dy = (py + 0.5 - sy) / Ry;
      // рваный край
      const edgeN = hash2(px, py, seed) * 0.22;
      const q = dx * dx + dy * dy;
      if (q > 1 - edgeN * (q > 0.6 ? 1 : 0)) continue;
      if (holes && q > 0.35 && hash2(px >> 1, py >> 1, seed + 3) < holes) continue;
      const nz = Math.sqrt(Math.max(0, 1 - q));
      const n = [dx * 0.8 - dy * 0.3, -dx * 0.8 - dy * 0.3, nz + 0.2 - dy * 0.4];
      const lf = lightOf([dx - dy * 0.5, -dx - dy * 0.5, nz * 1.3 - dy * 0.3]);
      const col = colfn(lf, px, py, n);
      if (col < 0) continue;
      const i = py * pc.w + px;
      pc.c[i] = col; pc.g[i] = -1; pc.up[i] = dy < -0.15 ? 1 : 0;
    }
  }
}

// Линия в мировых координатах (тонкая, 1px)
export function line3(pc, a, b, c, glow = -1) {
  const [x0, y0] = pc.proj(...a), [x1, y1] = pc.proj(...b);
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pc.set(Math.floor(x0 + (x1 - x0) * t), Math.floor(y0 + (y1 - y0) * t), c, glow);
  }
}

// вертикальная стойка (столб) толщиной 1-2px
export function pole(pc, x, y, z0, h, c, w = 1) {
  const [px, py] = pc.proj(x, y, z0);
  for (let k = 0; k < h; k++) for (let j = 0; j < w; j++) pc.set(Math.floor(px) + j, Math.floor(py) - k, j === 0 ? c : cmul(c, 0.7));
}
