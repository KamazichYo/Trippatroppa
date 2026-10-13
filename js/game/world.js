// Карта мира: рельеф, дороги, сети, зоны, здания.
import { fbm, mulberry32, hash2, clamp } from '../engine/util.js';
import { DEFS } from '../data/buildings.js';

export const T_GRASS = 0, T_WATER = 1, T_SAND = 2;
export const Z_NONE = 0, Z_R = 1, Z_C = 2, Z_I = 3, Z_A = 4;
export const ZONE_LETTER = ['', 'R', 'C', 'I', 'A'];
export const ZONE_CODE = { R: 1, C: 2, I: 3, A: 4 };
export const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // бит 1,2,4,8

export class World {
  constructor(W, H, seed = 1) {
    this.W = W; this.H = H; this.seed = seed;
    const n = W * H;
    this.terrain = new Uint8Array(n);
    this.tree = new Uint8Array(n);
    this.road = new Uint8Array(n);
    this.power = new Uint8Array(n);
    this.pipe = new Uint8Array(n);
    this.zone = new Uint8Array(n);
    this.dens = new Uint8Array(n);
    this.bld = new Int32Array(n).fill(-1);
    this.rubble = new Uint8Array(n);
    this.var = new Uint8Array(n);
    // производные карты
    this.pollution = new Float32Array(n);
    this.landValue = new Float32Array(n).fill(30);
    this.crime = new Float32Array(n);
    this.traffic = new Float32Array(n);
    this.noise = new Float32Array(n);
    this.cov = {};
    this.roadComp = new Int32Array(n).fill(-1);
    this.roadDist = new Uint8Array(n).fill(255);
    this.powered = new Uint8Array(n); // тайл в запитанной сети (для отображения)
    this.piped = new Uint8Array(n);
    this.buildings = new Map();
    this.nextId = 1;
    this.version = 0; // увеличивается при изменении дорог
    this.netDirty = true; this.roadsDirty = true;
    this.changed = new Set(); // для мини-карты
    const rng = mulberry32(seed);
    for (let i = 0; i < n; i++) this.var[i] = Math.floor(rng() * 256);
  }
  idx(x, y) { return y * this.W + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }

  // ---------- генерация ----------
  generate(opts = {}) {
    const { W, H, seed } = this;
    const rng = mulberry32(seed * 31 + 7);
    const waterAmt = opts.water ?? 0.5, forestAmt = opts.forest ?? 0.5;
    // озёра
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const e = fbm(x / 22, y / 22, seed, 5);
      if (e > 0.69 - waterAmt * 0.08) this.terrain[this.idx(x, y)] = T_WATER;
    }
    // река
    if (opts.river !== false) {
      const horiz = rng() < 0.5;
      const L = horiz ? W : H, M = horiz ? H : W;
      let c = M * (0.25 + rng() * 0.5);
      const width = 2 + rng() * 2.5;
      for (let t = 0; t < L; t++) {
        c += (fbm(t / 18, 3.3, seed + 5, 3) - 0.5) * 1.6;
        c = clamp(c, 6, M - 7);
        const w = width + Math.sin(t / 9) * 0.8;
        for (let k = Math.floor(c - w); k <= Math.ceil(c + w); k++) {
          const [x, y] = horiz ? [t, k] : [k, t];
          if (this.inb(x, y)) this.terrain[this.idx(x, y)] = T_WATER;
        }
      }
    }
    // убрать одиночные клетки воды
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = this.idx(x, y);
      if (this.terrain[i] !== T_WATER) continue;
      let wn = 0; for (const [dx, dy] of DIRS) if (this.inb(x + dx, y + dy) && this.terrain[this.idx(x + dx, y + dy)] === T_WATER) wn++;
      if (wn <= 1) this.terrain[i] = T_GRASS;
    }
    // песок у воды
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = this.idx(x, y);
      if (this.terrain[i] !== T_GRASS) continue;
      let near = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (this.inb(x + dx, y + dy) && this.terrain[this.idx(x + dx, y + dy)] === T_WATER) near = true;
      if (near && hash2(x, y, seed) < 0.55) this.terrain[i] = T_SAND;
    }
    // леса
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = this.idx(x, y);
      if (this.terrain[i] !== T_GRASS) continue;
      const f = fbm(x / 14 + 50, y / 14 + 50, seed + 11, 4) + (forestAmt - 0.5) * 0.2;
      if (f > 0.6) this.tree[i] = 3; else if (f > 0.55) this.tree[i] = 2; else if (f > 0.5 || hash2(x, y, seed + 2) < 0.02) this.tree[i] = 1;
    }
    // трасса к внешнему миру — с запада
    let best = Math.floor(H / 2), bestScore = -1;
    for (let y = 8; y < H - 8; y++) {
      let s = 0; for (let x = 0; x < 18; x++) if (this.terrain[this.idx(x, y)] !== T_WATER) s++;
      s -= Math.abs(y - H / 2) * 0.05;
      if (s > bestScore) { bestScore = s; best = y; }
    }
    this.highwayY = best;
    for (let x = 0; x < 16; x++) {
      const i = this.idx(x, best);
      this.road[i] = 2; this.tree[i] = 0;
      if (this.terrain[i] === T_SAND) this.terrain[i] = T_GRASS;
    }
    this.netDirty = true; this.roadsDirty = true; this.version++;
  }

  // ---------- здания ----------
  footprintOK(def, x, y, opts = {}) {
    const s = def.size;
    if (x < 0 || y < 0 || x + s > this.W || y + s > this.H) return 'За краем карты';
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
      const i = this.idx(x + dx, y + dy);
      if (this.terrain[i] === T_WATER) return 'Нельзя строить на воде';
      if (this.road[i]) return 'Мешает дорога';
      if (this.bld[i] >= 0 && !opts.replace) return 'Место занято';
    }
    if (def.needsShore) {
      let ok = false;
      for (let dy = -1; dy <= s; dy++) for (let dx = -1; dx <= s; dx++) {
        if (dx >= 0 && dy >= 0 && dx < s && dy < s) continue;
        const X = x + dx, Y = y + dy;
        if (this.inb(X, Y) && this.terrain[this.idx(X, Y)] === T_WATER) ok = true;
      }
      if (!ok) return 'Нужно ставить у воды';
    }
    return null;
  }

  addBuilding(defId, x, y, opts = {}) {
    const def = DEFS[defId];
    const id = this.nextId++;
    const b = {
      id, def: defId, x, y, s: def.size,
      variant: opts.variant ?? Math.floor(Math.random() * 4),
      built: opts.built ?? 0, occ: opts.occ ?? 0, happy: 0.6,
      has: { power: false, water: false, gas: false, heat: false, sewage: false, garbage: false },
      need: {}, abandoned: false, fire: 0, bad: 0, age: 0, visitors: 0, visitorsToday: 0,
      name: opts.name ?? null, funding: 1,
    };
    for (let dy = 0; dy < b.s; dy++) for (let dx = 0; dx < b.s; dx++) {
      const i = this.idx(x + dx, y + dy);
      if (this.bld[i] >= 0 && this.bld[i] !== id) this.removeBuilding(this.bld[i], true);
      this.bld[i] = id; this.tree[i] = 0; this.rubble[i] = 0;
      if (def.kind === 'plop') { this.zone[i] = 0; this.dens[i] = 0; }
      if (this.terrain[i] === T_SAND && def.kind === 'plop') this.terrain[i] = T_GRASS;
      this.changed.add(i);
    }
    this.buildings.set(id, b);
    this.netDirty = true;
    return b;
  }

  removeBuilding(id, silent = false, rubble = false) {
    const b = this.buildings.get(id);
    if (!b) return;
    for (let dy = 0; dy < b.s; dy++) for (let dx = 0; dx < b.s; dx++) {
      const i = this.idx(b.x + dx, b.y + dy);
      if (this.bld[i] === id) this.bld[i] = -1;
      if (rubble) this.rubble[i] = 1;
      this.changed.add(i);
    }
    this.buildings.delete(id);
    this.netDirty = true;
    if (this.onRemove) this.onRemove(b);
  }

  buildingAt(x, y) {
    if (!this.inb(x, y)) return null;
    const id = this.bld[this.idx(x, y)];
    return id >= 0 ? this.buildings.get(id) : null;
  }

  // ---------- дороги ----------
  roadMask(x, y, arr = this.road) {
    let m = 0;
    for (let k = 0; k < 4; k++) {
      const X = x + DIRS[k][0], Y = y + DIRS[k][1];
      if (this.inb(X, Y)) { if (arr[this.idx(X, Y)]) m |= 1 << k; }
      else if (arr === this.road && arr[this.idx(x, y)] && (X < 0 || Y < 0 || X >= this.W || Y >= this.H)) m |= 1 << k; // выход за край
    }
    return m;
  }
  isEdgeRoad(i) {
    const x = i % this.W, y = (i / this.W) | 0;
    return this.road[i] && (x === 0 || y === 0 || x === this.W - 1 || y === this.H - 1);
  }

  // компоненты дорожной сети и расстояние до дороги
  recomputeRoads() {
    const { W, H } = this;
    const n = W * H;
    this.roadComp.fill(-1);
    this.compOutside = [];
    let c = 0;
    const q = new Int32Array(n);
    for (let s = 0; s < n; s++) {
      if (!this.road[s] || this.roadComp[s] >= 0) continue;
      let h = 0, t = 0; q[t++] = s; this.roadComp[s] = c;
      let outside = false;
      while (h < t) {
        const i = q[h++];
        if (this.isEdgeRoad(i)) outside = true;
        const x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of DIRS) {
          const X = x + dx, Y = y + dy;
          if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          const j = Y * W + X;
          if (this.road[j] && this.roadComp[j] < 0) { this.roadComp[j] = c; q[t++] = j; }
        }
      }
      this.compOutside[c] = outside;
      c++;
    }
    this.roadCompCount = c;
    // расстояние до ближайшей дороги (BFS до 4)
    this.roadDist.fill(255);
    let h = 0, t = 0;
    for (let i = 0; i < n; i++) if (this.road[i]) { this.roadDist[i] = 0; q[t++] = i; }
    while (h < t) {
      const i = q[h++];
      const d = this.roadDist[i];
      if (d >= 4) continue;
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of DIRS) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const j = Y * W + X;
        if (this.roadDist[j] > d + 1) { this.roadDist[j] = d + 1; q[t++] = j; }
      }
    }
    // доступ зданий к дороге
    for (const b of this.buildings.values()) this.updateAccess(b);
    this.roadsDirty = false;
  }

  // ближайшая к зданию дорожная клетка (соседняя по периметру)
  updateAccess(b) {
    b.road = -1;
    let best = 99;
    for (let dy = -1; dy <= b.s; dy++) for (let dx = -1; dx <= b.s; dx++) {
      const inside = dx >= 0 && dy >= 0 && dx < b.s && dy < b.s;
      if (inside) continue;
      if ((dx < 0 || dx >= b.s) && (dy < 0 || dy >= b.s)) continue; // углы не считаем
      const X = b.x + dx, Y = b.y + dy;
      if (!this.inb(X, Y)) continue;
      const i = this.idx(X, Y);
      if (this.road[i]) { const d = Math.abs(dx - b.s / 2) + Math.abs(dy - b.s / 2); if (d < best) { best = d; b.road = i; } }
    }
    if (b.road < 0) {
      // дорога через 1 клетку (для зон допускается)
      for (let dy = -2; dy <= b.s + 1 && b.road < 0; dy++) for (let dx = -2; dx <= b.s + 1; dx++) {
        const X = b.x + dx, Y = b.y + dy;
        if (!this.inb(X, Y)) continue;
        const i = this.idx(X, Y);
        if (this.road[i]) { b.road = i; b.farRoad = true; break; }
      }
    } else b.farRoad = false;
    b.comp = b.road >= 0 ? this.roadComp[b.road] : -1;
    b.outside = b.comp >= 0 && !!this.compOutside[b.comp];
  }
}
