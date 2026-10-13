// Карты влияния: покрытие служб, загрязнение, стоимость земли, преступность, шум.
import { DEFS, SERVICE_NAMES } from '../data/buildings.js';
import { T_WATER } from './world.js';
import { clamp } from '../engine/util.js';

export const SERVICE_TYPES = Object.keys(SERVICE_NAMES);
const FUND_CAT = { fire: 'fire', police: 'police', health: 'health', kinder: 'edu', school: 'edu', library: 'edu', college: 'edu', univ: 'edu', park: 'leisure', culture: 'leisure', admin: 'admin', post: 'admin', phone: 'admin', transit: 'transport' };

function blur(src, W, H, passes = 1) {
  const tmp = new Float32Array(src.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const k = dx === 0 && dy === 0 ? 2 : 1;
        s += src[Y * W + X] * k; c += k;
      }
      tmp[y * W + x] = s / c;
    }
    src.set(tmp);
  }
}

export function updateMaps(g) {
  const w = g.world, { W, H } = w;
  const n = W * H;
  // ---- покрытие служб ----
  for (const t of SERVICE_TYPES) { if (!w.cov[t]) w.cov[t] = new Float32Array(n); else w.cov[t].fill(0); }
  const lvBoost = new Float32Array(n);
  for (const b of w.buildings.values()) {
    const def = DEFS[b.def];
    if (b.built < 1 || b.abandoned) continue;
    if (def.service) {
      const fund = g.funding[FUND_CAT[def.service.type]] ?? 1;
      const eff = (b.has.power || !(b.need.power > 0) ? 1 : 0.4) * Math.min(1.3, fund);
      const r = def.service.r * (0.6 + 0.4 * Math.min(1.2, fund));
      const cx = b.x + b.s / 2, cy = b.y + b.s / 2;
      const map = w.cov[def.service.type];
      const R = Math.ceil(r);
      for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(H, cy + R); y++) for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(W, cx + R); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d > r) continue;
        const v = eff * Math.sqrt(1 - d / r);
        const i = y * W + x;
        if (v > map[i]) map[i] = v;
      }
    }
    if (def.lv) {
      const cx = b.x + b.s / 2, cy = b.y + b.s / 2, r = 4 + b.s * 2;
      for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(H, cy + r); y++) for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(W, cx + r); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d < r) lvBoost[y * W + x] += def.lv * (1 - d / r);
      }
    }
  }
  // ---- загрязнение ----
  const pol = w.pollution; pol.fill(0);
  for (const b of w.buildings.values()) {
    const def = DEFS[b.def];
    if (b.built < 1 || b.abandoned || !def.poll) continue;
    let p = def.poll;
    if (def.kind === 'zone') p *= 0.3 + 0.7 * (b.occ / def.cap);
    if (def.prod?.power && !b.has.power && def.kind === 'plop') p *= 1;
    const area = b.s * b.s;
    for (let dy = 0; dy < b.s; dy++) for (let dx = 0; dx < b.s; dx++) pol[w.idx(b.x + dx, b.y + dy)] += p * 6 / area;
  }
  for (let i = 0; i < n; i++) {
    if (w.road[i]) pol[i] += Math.min(6, w.traffic[i] * 0.05);
  }
  blur(pol, W, H, 4);
  for (let i = 0; i < n; i++) { pol[i] = clamp(pol[i] * 3 - w.tree[i] * 1.5, 0, 100); }
  // ---- шум ----
  const nz = w.noise; nz.fill(0);
  for (let i = 0; i < n; i++) if (w.road[i]) nz[i] = Math.min(30, w.traffic[i] * 0.15) + w.road[i] * 2;
  blur(nz, W, H, 2);
  // ---- центр города ----
  let sx = 0, sy = 0, sp = 0;
  for (const b of w.buildings.values()) { const p = b.occ || 0; sx += (b.x + b.s / 2) * p; sy += (b.y + b.s / 2) * p; sp += p; }
  const cx = sp > 0 ? sx / sp : W / 2, cy = sp > 0 ? sy / sp : H / 2;
  g.center = [cx, cy];
  const maxD = Math.hypot(W, H) / 2;
  // ---- близость воды ----
  const waterNear = new Float32Array(n);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (w.terrain[y * W + x] === T_WATER) {
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const v = 1 - Math.hypot(dx, dy) / 4.3;
      const j = Y * W + X;
      if (v > waterNear[j]) waterNear[j] = v;
    }
  }
  // ---- преступность (до стоимости земли — использует плотность) ----
  const dens = new Float32Array(n);
  for (const b of w.buildings.values()) {
    if (!b.occ) continue;
    const per = b.occ / (b.s * b.s);
    for (let dy = 0; dy < b.s; dy++) for (let dx = 0; dx < b.s; dx++) dens[w.idx(b.x + dx, b.y + dy)] += per;
  }
  blur(dens, W, H, 3);
  const unemp = g.stats.unemployment ?? 0;
  const cr = w.crime;
  for (let i = 0; i < n; i++) {
    const base = Math.min(60, Math.sqrt(dens[i]) * 4) * (0.6 + unemp * 2.5);
    cr[i] = clamp(base * (1 - 0.85 * (w.cov.police[i] || 0)) - w.landValue[i] * 0.1 + (g.events?.crimeWave ? 15 : 0), 0, 100);
  }
  // ---- стоимость земли ----
  const lv = w.landValue;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (w.terrain[i] === T_WATER) { lv[i] = 0; continue; }
    const c = w.cov;
    const services = (c.police[i] + c.fire[i] + c.health[i] + c.school[i]) / 4;
    const closeness = 1 - Math.min(1, Math.hypot(x - cx, y - cy) / maxD);
    let v = 22 + waterNear[i] * 16 + c.park[i] * 18 + c.culture[i] * 8 + services * 16 + closeness * 18 + w.tree[i] * 2 + lvBoost[i]
      + (c.transit[i] || 0) * 6 + (c.phone[i] || 0) * 4 - pol[i] * 0.55 - cr[i] * 0.3 - nz[i] * 0.2;
    lv[i] = clamp(v, 0, 100);
  }
  g.mapsTime = g.time;
}

// Сводная оценка обеспеченности клетки службами (0..1)
export function serviceScore(w, i) {
  const c = w.cov;
  return {
    police: c.police?.[i] || 0, fire: c.fire?.[i] || 0, health: c.health?.[i] || 0,
    edu: Math.max(c.school?.[i] || 0, (c.kinder?.[i] || 0) * 0.5),
    park: c.park?.[i] || 0, culture: c.culture?.[i] || 0, phone: c.phone?.[i] || 0, transit: c.transit?.[i] || 0,
  };
}
