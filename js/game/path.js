// A* по дорожной сети с кэшированием маршрутов.
import { DIRS } from './world.js';

const ROAD_COST = [99, 1.5, 1, 0.75];

export class Pathfinder {
  constructor(world) {
    this.w = world;
    const n = world.W * world.H;
    this.g = new Float32Array(n);
    this.came = new Int32Array(n);
    this.stamp = new Uint32Array(n);
    this.closed = new Uint32Array(n);
    this.gen = 1;
    this.cache = new Map();
    this.version = -1;
    this.heap = []; this.heapF = [];
  }
  find(a, b) {
    const w = this.w;
    if (a < 0 || b < 0) return null;
    if (this.version !== w.version) { this.cache.clear(); this.version = w.version; }
    if (w.roadComp[a] !== w.roadComp[b] || w.roadComp[a] < 0) return null;
    const key = a * 65536 + b;
    const c = this.cache.get(key);
    if (c !== undefined) return c;
    const p = this.astar(a, b);
    if (this.cache.size > 4000) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, p);
    return p;
  }
  astar(a, b) {
    const w = this.w, W = w.W, H = w.H;
    if (a === b) return Int32Array.of(a);
    const gen = ++this.gen;
    const bx = b % W, by = (b / W) | 0;
    const heap = this.heap, hf = this.heapF; heap.length = 0; hf.length = 0;
    const push = (i, f) => {
      let k = heap.length; heap.push(i); hf.push(f);
      while (k > 0) { const p = (k - 1) >> 1; if (hf[p] <= hf[k]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; [hf[p], hf[k]] = [hf[k], hf[p]]; k = p; }
    };
    const pop = () => {
      const top = heap[0];
      const li = heap.pop(), lf = hf.pop();
      if (heap.length) {
        heap[0] = li; hf[0] = lf;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1, r = l + 1; let m = k;
          if (l < heap.length && hf[l] < hf[m]) m = l;
          if (r < heap.length && hf[r] < hf[m]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]]; [hf[m], hf[k]] = [hf[k], hf[m]]; k = m;
        }
      }
      return top;
    };
    this.g[a] = 0; this.stamp[a] = gen; this.came[a] = -1;
    push(a, 0);
    let iter = 0;
    while (heap.length) {
      const i = pop();
      if (i === b) break;
      if (this.closed[i] === gen) continue;
      this.closed[i] = gen;
      if (++iter > 40000) return null;
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of DIRS) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const j = Y * W + X;
        const rt = w.road[j];
        if (!rt) continue;
        const cost = this.g[i] + ROAD_COST[rt] + Math.min(2, w.traffic[j] * 0.004);
        if (this.stamp[j] !== gen || cost < this.g[j]) {
          this.stamp[j] = gen; this.g[j] = cost; this.came[j] = i;
          push(j, cost + (Math.abs(X - bx) + Math.abs(Y - by)) * 0.75);
        }
      }
    }
    if (this.stamp[b] !== gen) return null;
    const out = [];
    for (let i = b; i !== -1; i = this.came[i]) { out.push(i); if (out.length > 5000) return null; }
    out.reverse();
    return Int32Array.from(out);
  }
}
