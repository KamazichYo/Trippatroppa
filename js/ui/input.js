// Управление: мышь, тач, клавиатура, инструменты строительства.
import { DEFS, RANKS, ZONE_TOOLS } from '../data/buildings.js';
import { ROAD_BUILD_COST, ROAD_RANK, LINE_COST, PIPE_COST } from '../game/game.js';
import { igniteBuilding, startTornado, meteor } from '../game/disasters.js';
import { fmtMoney } from '../engine/util.js';
import { T_WATER } from '../game/world.js';

export class Input {
  constructor(canvas, renderer, ui) {
    this.cv = canvas; this.r = renderer; this.ui = ui;
    this.tool = { type: 'inspect' };
    this.drag = null; this.pointers = new Map(); this.pinch = null;
    this.hover = null;
    this.keys = new Set();
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.r.zoomBy(e.deltaY < 0 ? 1 : -1, e.offsetX * this.dpr(), e.offsetY * this.dpr()); }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.key(e, true));
    window.addEventListener('keyup', (e) => this.key(e, false));
  }
  get g() { return this.ui.g; }
  dpr() { return this.cv.width / this.cv.clientWidth; }
  setTool(t) {
    this.tool = t; this.drag = null; this.r.preview = null;
    this.r.underground = t.type === 'line' && t.net === 'pipe' || t.overlayUnder === true;
    if (t.overlay !== undefined) this.r.overlay = t.overlay; else if (this.ui.autoOverlay) this.r.overlay = this.ui.userOverlay;
    this.cv.style.cursor = t.type === 'inspect' ? 'grab' : 'crosshair';
  }

  tileFromEvent(e) {
    const rect = this.cv.getBoundingClientRect();
    const d = this.dpr();
    return this.r.tileAt((e.clientX - rect.left) * d, (e.clientY - rect.top) * d);
  }

  down(e) {
    this.cv.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.ui.closeTray();
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      this.drag = null; this.r.preview = null;
      return;
    }
    const pan = e.button === 1 || e.button === 2 || this.tool.type === 'inspect';
    const t = this.tileFromEvent(e);
    this.drag = { pan, sx: e.clientX, sy: e.clientY, cx: this.r.cam.x, cy: this.r.cam.y, start: t, cur: t, moved: false, button: e.button };
    if (!pan) this.updatePreview(t);
  }
  move(e) {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinch && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const z = this.r.zoom;
      this.r.cam.x -= (cx - this.pinch.cx) * this.dpr() / z; this.r.cam.y -= (cy - this.pinch.cy) * this.dpr() / z;
      this.pinch.cx = cx; this.pinch.cy = cy;
      if (d / this.pinch.d > 1.35) { this.r.zoomBy(1, cx * this.dpr(), cy * this.dpr()); this.pinch.d = d; }
      else if (d / this.pinch.d < 0.74) { this.r.zoomBy(-1, cx * this.dpr(), cy * this.dpr()); this.pinch.d = d; }
      return;
    }
    if (e.target !== this.cv && !this.drag) { this.ui.tooltip(null); return; }
    const t = this.tileFromEvent(e);
    this.hover = t;
    if (this.drag) {
      if (Math.abs(e.clientX - this.drag.sx) + Math.abs(e.clientY - this.drag.sy) > 6) this.drag.moved = true;
      if (this.drag.pan) {
        const z = this.r.zoom;
        this.r.cam.x = this.drag.cx - (e.clientX - this.drag.sx) * this.dpr() / z;
        this.r.cam.y = this.drag.cy - (e.clientY - this.drag.sy) * this.dpr() / z;
        this.ui.follow(null);
      } else { this.drag.cur = t; this.updatePreview(t); }
    } else if (this.tool.type !== 'inspect') this.updatePreview(t);
    else this.hoverInfo(t, e);
  }
  up(e) {
    this.pointers.delete(e.pointerId);
    if (this.pinch) { if (this.pointers.size < 2) this.pinch = null; this.drag = null; return; }
    const d = this.drag; this.drag = null;
    if (!d) return;
    if (d.pan) {
      if (!d.moved && d.button === 0) this.ui.inspectTile(d.start[0], d.start[1]);
      if (!d.moved && d.button === 2 && this.tool.type !== 'inspect') this.ui.selectTool({ type: 'inspect' });
      return;
    }
    this.apply(d.start, d.cur);
    this.updatePreview(d.cur);
  }
  key(e, down) {
    if (e.target.tagName === 'INPUT') return;
    if (!down) return;
    const k = e.key.toLowerCase();
    const step = 64 / this.r.zoom;
    if (k === 'arrowleft' || k === 'a' || k === 'ф') this.r.cam.x -= step;
    else if (k === 'arrowright' || k === 'd' || k === 'в') this.r.cam.x += step;
    else if (k === 'arrowup' || k === 'w' || k === 'ц') this.r.cam.y -= step;
    else if (k === 'arrowdown' || k === 's' || k === 'ы') this.r.cam.y += step;
    else if (k === '+' || k === '=') this.r.zoomBy(1);
    else if (k === '-') this.r.zoomBy(-1);
    else if (k === ' ') { e.preventDefault(); this.ui.togglePause(); }
    else if (k >= '1' && k <= '3') this.ui.setSpeed(+k);
    else if (k === 'escape') { this.ui.selectTool({ type: 'inspect' }); this.ui.closePanel(); this.ui.closeInfo(); }
    else if (k === 'b' || k === 'и') this.ui.selectTool({ type: 'rect', id: 'bulldoze', name: 'Бульдозер' });
    else if (k === 'r' || k === 'к') this.ui.selectTool({ type: 'line', road: 2, name: 'Дорога' });
    else if (k === 'g' || k === 'п') this.ui.openPanel('god');
  }

  // ---------- область действия ----------
  tilesFor(a, b) {
    const w = this.g.world, t = this.tool;
    const out = [];
    const push = (x, y) => { if (w.inb(x, y)) out.push(w.idx(x, y)); };
    if (t.type === 'line') {
      const [x0, y0] = a, [x1, y1] = b;
      if (Math.abs(x1 - x0) >= Math.abs(y1 - y0)) {
        for (let x = x0; x !== x1 + Math.sign(x1 - x0 || 1); x += Math.sign(x1 - x0 || 1)) push(x, y0);
        for (let y = y0 + Math.sign(y1 - y0 || 1); y1 !== y0 && y !== y1 + Math.sign(y1 - y0); y += Math.sign(y1 - y0)) push(x1, y);
      } else {
        for (let y = y0; y !== y1 + Math.sign(y1 - y0 || 1); y += Math.sign(y1 - y0 || 1)) push(x0, y);
        for (let x = x0 + Math.sign(x1 - x0 || 1); x1 !== x0 && x !== x1 + Math.sign(x1 - x0); x += Math.sign(x1 - x0)) push(x, y1);
      }
    } else if (t.type === 'rect') {
      const r = t.brush ? 0 : 1;
      for (let y = Math.min(a[1], b[1]); y <= Math.max(a[1], b[1]); y++) for (let x = Math.min(a[0], b[0]); x <= Math.max(a[0], b[0]); x++) push(x, y);
    } else push(b[0], b[1]);
    return out;
  }

  updatePreview(t) {
    const g = this.g, tool = this.tool, w = g.world;
    if (tool.type === 'inspect') { this.r.preview = null; return; }
    if (tool.type === 'build') {
      const def = DEFS[tool.id];
      const x = t[0] - Math.floor((def.size - 1) / 2), y = t[1] - Math.floor((def.size - 1) / 2);
      const err = g.placeCheck(tool.id, x, y);
      this.r.preview = { ghost: { def, x, y, ok: !err }, radius: def.service?.r };
      this.ui.tooltipAt(err ? `<span class="no">${err}</span>` : `${def.name}: <b>${fmtMoney(def.cost)}</b>`);
      return;
    }
    if (tool.type === 'god') {
      this.r.preview = { tiles: this.tilesFor(t, t), ok: true, color: 'rgba(200,120,255,0.45)' };
      this.ui.tooltipAt(tool.name);
      return;
    }
    const a = this.drag && !this.drag.pan ? this.drag.start : t;
    const tiles = this.tilesFor(a, t);
    const { cost, ok, msg } = this.costOf(tiles);
    this.r.preview = { tiles, ok };
    const n = tiles.length;
    this.ui.tooltipAt(`${tool.name}${n > 1 ? ` × ${n}` : ''}: <b>${cost > 0 ? fmtMoney(cost) : (tool.id === 'bulldoze' ? 'бесплатно' : '—')}</b>${msg ? ` <span class="no">${msg}</span>` : ''}`);
  }

  costOf(tiles) {
    const g = this.g, t = this.tool, w = g.world;
    let cost = 0, msg = '';
    if (t.road) {
      if (ROAD_RANK[t.road] > g.rank && !g.god.unlockAll) return { cost: 0, ok: false, msg: `Откроется при статусе «${RANKS[ROAD_RANK[t.road]].name}»` };
      for (const i of tiles) { const c = g.roadCost(i, t.road); if (c !== Infinity) cost += c; }
    } else if (t.net) { for (const i of tiles) if (!(t.net === 'power' ? w.power[i] : w.pipe[i]) && (t.net === 'pipe' || w.bld[i] < 0)) cost += t.net === 'power' ? LINE_COST : PIPE_COST; }
    else if (t.zone) {
      const zt = ZONE_TOOLS.find((z) => z.zone === t.zone && z.dens === t.dens);
      if (zt.rank > g.rank && !g.god.unlockAll) return { cost: 0, ok: false, msg: `Откроется при статусе «${RANKS[zt.rank].name}»` };
      for (const i of tiles) { const c = g.zoneCost(i, t.zone, t.dens); if (c !== Infinity) cost += c; }
    } else if (t.id === 'bulldoze') cost = g.bulldozeCost(tiles, this.r.underground);
    else if (t.id === 'trees') cost = tiles.length * 4;
    else if (t.god) cost = 0;
    if (!g.canAfford(cost)) msg = 'Недостаточно денег';
    return { cost, ok: !msg, msg };
  }

  apply(a, b) {
    const g = this.g, t = this.tool, w = g.world;
    let res = null;
    if (t.type === 'build') {
      const def = DEFS[t.id];
      const x = b[0] - Math.floor((def.size - 1) / 2), y = b[1] - Math.floor((def.size - 1) / 2);
      res = g.placeBuilding(t.id, x, y);
      if (res.ok) this.ui.sfx('build');
    } else if (t.type === 'god' || t.god) {
      const [x, y] = b;
      if (t.id === 'ignite') { const bb = w.buildingAt(x, y); if (bb) igniteBuilding(g, bb, 'Поджог (меню бога)'); }
      else if (t.id === 'tornado') startTornado(g, x + 0.5, y + 0.5);
      else if (t.id === 'meteor') meteor(g, x, y);
      else if (t.id === 'water' || t.id === 'land') g.terraform(this.tilesFor(a, b), t.id === 'water');
      else if (t.id === 'forest') { for (const i of this.tilesFor(a, b)) if (w.terrain[i] !== T_WATER && !w.road[i] && w.bld[i] < 0) w.tree[i] = 3; }
      return;
    } else {
      const tiles = this.tilesFor(a, b);
      if (t.road) {
        if (ROAD_RANK[t.road] > g.rank && !g.god.unlockAll) return this.ui.toast(`Откроется при статусе «${RANKS[ROAD_RANK[t.road]].name}»`, true);
        res = g.buildRoads(tiles, t.road);
      } else if (t.net) res = g.buildNet(tiles, t.net);
      else if (t.zone) {
        const zt = ZONE_TOOLS.find((z) => z.zone === t.zone && z.dens === t.dens);
        if (zt.rank > g.rank && !g.god.unlockAll) return this.ui.toast(`Откроется при статусе «${RANKS[zt.rank].name}»`, true);
        res = g.setZone(tiles, t.zone, t.dens);
      } else if (t.id === 'dezone') res = g.dezone(tiles);
      else if (t.id === 'bulldoze') { res = g.bulldoze(tiles, this.r.underground); if (res.ok && res.cost) this.ui.sfx('bulldoze'); }
      else if (t.id === 'trees') res = g.plantTrees(tiles);
      if (res?.ok && res.cost && t.id !== 'bulldoze') this.ui.sfx('place');
    }
    if (res && !res.ok) this.ui.toast(res.msg, true);
    if (res?.ok) this.ui.refresh(true);
  }

  hoverInfo(t, e) {
    const w = this.g.world;
    if (!w.inb(t[0], t[1])) { this.ui.tooltip(null); return; }
    const b = w.buildingAt(t[0], t[1]);
    if (b) this.ui.tooltip(`${DEFS[b.def].name}`, e.clientX, e.clientY);
    else this.ui.tooltip(null);
  }
}
