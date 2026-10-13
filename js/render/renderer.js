// Отрисовка мира: земля, объекты в порядке глубины, день/ночь, зима, частицы, слои данных.
import { DEFS } from '../data/buildings.js';
import { buildingSprite, peekSprite, spriteInfo } from '../gfx/allBuildings.js';
import * as TT from '../gfx/terrain.js';
import { vehicleSprite } from '../gfx/vehicles.js';
import { personSprite, statusIcon } from '../gfx/people.js';
import { T_WATER, T_SAND, ZONE_LETTER, DIRS } from '../game/world.js';
import { ZONES } from '../data/buildings.js';
import { NIGHT_TINT, NIGHT_A } from '../engine/pixel.js';
import { clamp, hash2, cssA, css, cmix } from '../engine/util.js';

const ZOOMS = [0.25, 0.5, 1, 2, 3, 4];
const NT = `${(NIGHT_TINT >> 16) & 255},${(NIGHT_TINT >> 8) & 255},${NIGHT_TINT & 255}`;

export class Renderer {
  constructor(canvas, game) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.setGame(game);
    this.zi = 3;
    this.particles = [];
    this.overlay = null; // режим слоя данных
    this.underground = false;
    this.preview = null; // {tiles:[], ok, ghost:{def,x,y,ok}, radius}
    this.selected = null;
    this.showIcons = true;
    this.frame = 0;
    this.lampGlow = this.makeGlow(48, [255, 220, 150]);
    this.headGlow = this.makeGlow(20, [255, 250, 210]);
    this.fireGlow = this.makeGlow(64, [255, 120, 40]);
    this.weather = [];
    this.genBudget = 0;
    this.shakeT = 0;
  }
  setGame(g) {
    this.g = g;
    const w = g.world;
    this.cam = { x: (w.W / 2 - w.H / 2) * 32, y: (w.W / 2 + w.H / 2) * 16 };
    this.particles = [];
  }
  get zoom() { return ZOOMS[this.zi]; }
  zoomBy(d, sx, sy) {
    const before = this.screenToWorldPx(sx ?? this.cv.width / 2, sy ?? this.cv.height / 2);
    this.zi = clamp(this.zi + d, 0, ZOOMS.length - 1);
    const after = this.screenToWorldPx(sx ?? this.cv.width / 2, sy ?? this.cv.height / 2);
    this.cam.x += before[0] - after[0]; this.cam.y += before[1] - after[1];
  }
  makeGlow(r, [R, G, B]) {
    const c = document.createElement('canvas'); c.width = c.height = r * 2;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, `rgba(${R},${G},${B},0.55)`); gr.addColorStop(0.4, `rgba(${R},${G},${B},0.2)`); gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, r * 2, r * 2);
    return c;
  }
  resize(w, h) { this.cv.width = w; this.cv.height = h; this.ctx.imageSmoothingEnabled = false; }

  // ---------- координаты ----------
  screenToWorldPx(sx, sy) { const z = this.zoom; return [(sx - this.cv.width / 2) / z + this.cam.x, (sy - this.cv.height / 2) / z + this.cam.y]; }
  worldPxToScreen(X, Y) { const z = this.zoom; return [(X - this.cam.x) * z + this.cv.width / 2, (Y - this.cam.y) * z + this.cv.height / 2]; }
  tileAt(sx, sy) {
    const [X, Y] = this.screenToWorldPx(sx, sy);
    const a = Y / 16, b = X / 32;
    return [Math.floor((a + b) / 2), Math.floor((a - b) / 2)];
  }
  tileToScreen(tx, ty) { return this.worldPxToScreen((tx - ty) * 32, (tx + ty) * 16); }
  centerOn(tx, ty) { this.cam.x = (tx - ty) * 32; this.cam.y = (tx + ty) * 16; }

  // ---------- кадр ----------
  render(dtReal) {
    const g = this.g, w = g.world, ctx = this.ctx, z = this.zoom;
    const W = this.cv.width, H = this.cv.height;
    this.frame++;
    this.genBudget = 6;
    const night = g.darkness();
    const winter = g.isWinter();
    const ug = this.underground;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = night > 0.5 ? '#05070f' : '#0d1420';
    ctx.fillRect(0, 0, W, H);
    // тряска
    let shx = 0, shy = 0;
    if (g.shake > 0) { g.shake -= dtReal; shx = (Math.random() - 0.5) * 8 * g.shake; shy = (Math.random() - 0.5) * 8 * g.shake; }
    const camX = this.cam.x - shx / z, camY = this.cam.y - shy / z;
    const ox = W / 2 - camX * z, oy = H / 2 - camY * z; // экран = мир*z + o
    const sx0 = -ox / z, sy0 = -oy / z, sx1 = (W - ox) / z, sy1 = (H - oy) / z;
    // диапазоны: d = x+y, e = x-y
    const dMin = Math.max(0, Math.floor(sy0 / 16) - 2), dMax = Math.min(w.W + w.H - 2, Math.ceil(sy1 / 16) + 24);
    const eMin = Math.floor(sx0 / 32) - 2, eMax = Math.ceil(sx1 / 32) + 2;
    const waterFrame = Math.floor(performance.now() / 450) % 4;
    const S = (X) => Math.round(X * z + ox), T = (Y) => Math.round(Y * z + oy);
    const tw = Math.ceil(64 * z), th = Math.ceil(32 * z);
    const visible = [];

    // ---------- проход 1: земля ----------
    for (let d = dMin; d <= dMax; d++) {
      const xa = Math.max(0, d - (w.H - 1), Math.ceil((d + eMin) / 2)), xb = Math.min(w.W - 1, d, Math.floor((d + eMax) / 2));
      for (let x = xa; x <= xb; x++) {
        const y = d - x;
        const i = y * w.W + x;
        const X = (x - y) * 32, Y = (x + y) * 16;
        const px = S(X - 32), py = T(Y);
        if (py > H || py + th < -40 * z) { if (py <= H) visible.push(i); continue; }
        visible.push(i);
        let e;
        const v = w.var[i];
        if (ug) {
          e = TT.undergroundTile(w.pipe[i] ? w.roadMask(x, y, w.pipe) : 0, !!w.pipe[i], v & 3);
        } else if (w.terrain[i] === T_WATER) {
          let m = 0;
          for (let k = 0; k < 4; k++) { const X2 = x + DIRS[k][0], Y2 = y + DIRS[k][1]; if (w.inb(X2, Y2) && w.terrain[Y2 * w.W + X2] !== T_WATER) m |= 1 << k; }
          e = TT.waterTile((waterFrame + (v & 3)) & 3, m);
        } else if (w.road[i]) e = TT.roadTile(w.road[i], w.roadMask(x, y), v & 1);
        else if (w.rubble[i]) e = TT.rubbleTile(v % 3);
        else if (w.bld[i] >= 0) {
          const b = w.buildings.get(w.bld[i]);
          e = b && b.built < 1 ? TT.constructionTile(v & 1) : TT.grassTile(v % 6);
        } else if (w.zone[i]) e = TT.zoneTile(ZONES[ZONE_LETTER[w.zone[i]]].color, w.dens[i]);
        else if (w.terrain[i] === T_SAND) e = TT.sandTile(v % 3);
        else e = TT.grassTile(v % 6);
        const img = winter && e.winter && !ug ? e.winter : e.day;
        ctx.drawImage(img, px, T(Y - e.ay), Math.ceil(img.width * z), Math.ceil(img.height * z));
        // края карты
        if (x === w.W - 1) { const ed = TT.edgeTile(0, w.terrain[i] === T_WATER); ctx.drawImage(ed.day, px, py, tw, Math.ceil(ed.day.height * z)); }
        if (y === w.H - 1) { const ed = TT.edgeTile(1, w.terrain[i] === T_WATER); ctx.drawImage(ed.day, px, py, tw, Math.ceil(ed.day.height * z)); }
      }
    }
    // блики на воде
    // ---------- ночь: затемнение земли и фонари ----------
    if (night > 0.01) {
      ctx.fillStyle = `rgba(${NT},${NIGHT_A * night})`;
      ctx.fillRect(0, 0, W, H);
      if (!ug && z >= 0.5) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = night;
        const gs = 48 * z * 2;
        for (const i of visible) {
          if (!w.road[i] || w.road[i] < 2) continue;
          const x = i % w.W, y = (i / w.W) | 0;
          if ((x + y) & 1) continue;
          const X = (x - y) * 32, Y = (x + y) * 16 + 16;
          ctx.drawImage(this.lampGlow, S(X) - gs / 2, T(Y) - gs / 2, gs, gs);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    // ---------- слой данных ----------
    if (this.overlay) this.drawOverlay(visible, S, T, z);

    // ---------- агенты по клеткам ----------
    const agentsAt = new Map();
    const cit = g.citizens;
    const addAgent = (tile, a) => { let l = agentsAt.get(tile); if (!l) agentsAt.set(tile, l = []); l.push(a); };
    if (!ug) {
      for (const c of cit.list) {
        if (c.state !== 'travel' || !c.path) continue;
        if (c.mode === 'bus' && (c.id % 4)) continue;
        const p = cit.posOf(c, c.mode === 'walk' ? 'walk' : 'car');
        addAgent(p.tile, { kind: c.mode === 'walk' ? 'walk' : 'car', c, p });
      }
      for (const v of cit.vehicles) { const p = cit.posOf(v, 'car'); addAgent(p.tile, { kind: 'veh', v, p }); }
    }

    // ---------- проход 2: объекты по глубине ----------
    const icons = [];
    const z2 = z;
    for (const i of visible) {
      const x = i % w.W, y = (i / w.W) | 0;
      const X = (x - y) * 32, Y = (x + y) * 16;
      if (ug) {
        if (w.bld[i] >= 0) { ctx.fillStyle = 'rgba(200,200,220,0.18)'; this.diamond(S(X), T(Y), z); }
        continue;
      }
      // мост
      if (w.road[i] && w.terrain[i] === T_WATER) {
        const e = TT.bridgeTile(w.road[i], w.roadMask(x, y));
        this.blit(e, X - 32, Y - e.ay, S, T, z, night, winter);
      }
      // деревья
      if (w.tree[i] && w.bld[i] < 0 && !w.road[i]) {
        const e = TT.forest(w.tree[i], w.var[i] & 7);
        this.blit(e, X - 32, Y - e.ay, S, T, z, night, winter);
      }
      // здание (рисуем в передней клетке)
      const bid = w.bld[i];
      if (bid >= 0) {
        const b = w.buildings.get(bid);
        if (b && x === b.x + b.s - 1 && y === b.y + b.s - 1) this.drawBuilding(b, S, T, z, night, winter, icons);
      }
      // ЛЭП
      if (w.power[i] && bid < 0) {
        const e = TT.powerPole(w.var[i] & 1);
        this.blit(e, X - 32, Y - e.ay, S, T, z, night, false);
        if (z >= 0.5) {
          ctx.strokeStyle = night > 0.5 ? 'rgba(40,40,50,0.8)' : 'rgba(30,30,30,0.7)';
          ctx.lineWidth = Math.max(1, z * 0.6);
          for (const [dx, dy] of [[1, 0], [0, 1]]) {
            const X2 = x + dx, Y2 = y + dy;
            if (!w.inb(X2, Y2)) continue;
            const j = Y2 * w.W + X2;
            if (!w.power[j] && w.bld[j] < 0) continue;
            const ax = S(X), ay = T(Y + 16 - 22), bx = S((X2 - Y2) * 32), by = T((X2 + Y2) * 16 + 16 - (w.power[j] ? 22 : 10));
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 3 * z, bx, by); ctx.stroke();
          }
        }
      }
      // агенты
      const ags = agentsAt.get(i);
      if (ags) for (const a of ags) this.drawAgent(a, S, T, z, night, winter);
    }
    // ---------- частицы ----------
    this.updateParticles(dtReal, S, T, z, night);
    // торнадо
    if (g.tornado) this.drawTornado(g.tornado, S, T, z);
    if (g.meteorFx) this.drawMeteor(g.meteorFx, dtReal, S, T, z);
    // иконки
    if (this.showIcons && !ug) {
      const blink = (performance.now() / 500 | 0) & 1;
      for (const ic of icons) {
        if (!blink && ic.kind !== 'fire') continue;
        const img = statusIcon(ic.kind);
        const s = Math.max(1, Math.round(z * 1.5));
        ctx.drawImage(img, Math.round(ic.x - img.width * s / 2), Math.round(ic.y - img.height * s), img.width * s, img.height * s);
      }
    }
    // предпросмотр инструмента
    if (this.preview) this.drawPreview(this.preview, S, T, z, night, winter);
    if (this.selected) this.drawSelection(this.selected, S, T, z);
    // погода и сумерки
    this.drawWeather(dtReal, winter, night);
    if (night > 0.05 && night < 0.95) {
      ctx.fillStyle = `rgba(255,120,40,${0.12 * Math.sin(night * Math.PI)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  diamond(cx, cy, z, fill = true) {
    const ctx = this.ctx;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 32 * z, cy + 16 * z); ctx.lineTo(cx, cy + 32 * z); ctx.lineTo(cx - 32 * z, cy + 16 * z); ctx.closePath();
    if (fill) ctx.fill(); else ctx.stroke();
  }

  blit(e, X, Y, S, T, z, night, winter) {
    const ctx = this.ctx;
    const img = winter && e.winter ? e.winter : e.day;
    const px = S(X), py = T(Y), w = Math.ceil(img.width * z), h = Math.ceil(img.height * z);
    ctx.drawImage(img, px, py, w, h);
    if (night > 0.01) {
      if (e.night) { ctx.globalAlpha = night; ctx.drawImage(e.night, px, py, w, h); ctx.globalAlpha = 1; }
      else { // без ночного варианта — затемняем силуэт
        ctx.globalAlpha = night * NIGHT_A;
        ctx.drawImage(this.darkOf(img), px, py, w, h);
        ctx.globalAlpha = 1;
      }
    }
  }
  darkOf(img) {
    if (img._dark) return img._dark;
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgb(${NT})`; x.fillRect(0, 0, c.width, c.height);
    img._dark = c; return c;
  }

  sprite(b, mode) {
    let e = peekSprite(b.def, b.variant, mode);
    if (e) return e;
    if (this.genBudget <= 0) return null;
    this.genBudget--;
    return buildingSprite(b.def, b.variant, mode);
  }

  drawBuilding(b, S, T, z, night, winter, icons) {
    const ctx = this.ctx, g = this.g;
    const def = DEFS[b.def];
    const X0 = (b.x - b.y) * 32, Y0 = (b.x + b.y) * 16; // северный угол
    const ruin = b.abandoned;
    const dayMode = ruin ? 'ruin' : winter ? 'winter' : 'day';
    const nightMode = ruin ? 'ruinNight' : winter ? 'winterNight' : 'night';
    const e = this.sprite(b, dayMode);
    if (!e) return;
    const img = e[dayMode];
    const px = S(X0 - e.ax), py = T(Y0 - e.ay);
    const w = Math.ceil(img.width * z), h = Math.ceil(img.height * z);
    if (b.built < 1) {
      // стройка: показываем нижнюю часть здания и леса
      const p = Math.max(0.05, b.built);
      const footH = 32 * b.s;
      const visH = Math.floor(footH + (img.height - footH) * p);
      const sy = img.height - visH;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(img, 0, sy, img.width, visH, px, py + Math.round(sy * z), w, Math.ceil(visH * z));
      ctx.globalAlpha = 1;
      // леса
      ctx.strokeStyle = 'rgba(200,140,40,0.9)'; ctx.lineWidth = Math.max(1, z * 0.7);
      const top = py + Math.round(sy * z), cx = S(X0), base = T(Y0 + 16 * b.s);
      for (let k = 0; k < 4; k++) { const yy = top + (base - top) * k / 4; ctx.beginPath(); ctx.moveTo(cx - 28 * b.s * z, yy + 14 * b.s * z * 0.3); ctx.lineTo(cx, yy + 14 * b.s * z * 0.9); ctx.lineTo(cx + 28 * b.s * z, yy + 14 * b.s * z * 0.3); ctx.stroke(); }
      if (b.s >= 2 || (def.dens ?? 1) >= 2) { // кран
        const kx = cx + 18 * z * b.s, ky = base - 10 * z;
        ctx.strokeStyle = '#e0b020'; ctx.lineWidth = Math.max(1, z);
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(kx, top - 30 * z); ctx.lineTo(kx - 40 * z, top - 30 * z); ctx.moveTo(kx, top - 30 * z); ctx.lineTo(kx + 12 * z, top - 30 * z); ctx.stroke();
        ctx.strokeStyle = '#333'; ctx.beginPath(); ctx.moveTo(kx - 30 * z, top - 30 * z); ctx.lineTo(kx - 30 * z, top - 10 * z); ctx.stroke();
      }
      if (night > 0.01) { ctx.globalAlpha = night * NIGHT_A; ctx.fillStyle = `rgb(${NT})`; ctx.globalAlpha = 1; }
      return;
    }
    ctx.drawImage(img, px, py, w, h);
    if (night > 0.01) {
      const en = this.sprite(b, nightMode);
      if (en) { ctx.globalAlpha = night; ctx.drawImage(en[nightMode], px, py, w, h); ctx.globalAlpha = 1; }
    }
    // анимации
    const info = spriteInfo(b.def);
    const odd = (b.variant & 1) && !info.noswap;
    const local = (lx, ly, lz) => { if (odd) { const t = lx; lx = ly; ly = t; } return [X0 + (lx - ly), Y0 + (lx + ly) / 2 - lz]; };
    const active = !ruin && (b.has.power || !(b.need.power > 0) || def.prod?.power);
    if (active && this.frame % 3 === 0) {
      const busy = def.kind === 'zone' ? b.occ / def.cap : 1;
      for (const s of info.smoke || []) if (Math.random() < 0.5 * busy + 0.1) { const [wx, wy] = local(...s); this.particles.push({ x: wx, y: wy, vx: 4 + Math.random() * 3, vy: -10 - Math.random() * 5, life: 4 + Math.random() * 2, age: 0, size: 3, kind: 'smoke' }); }
      for (const s of info.steam || []) if (Math.random() < 0.6) { const [wx, wy] = local(...s); this.particles.push({ x: wx + (Math.random() - 0.5) * 14, y: wy, vx: 3, vy: -8 - Math.random() * 4, life: 4, age: 0, size: 6, kind: 'steam' }); }
      for (const s of info.flame || []) { const [wx, wy] = local(...s); this.particles.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 3, vy: -14, life: 0.6, age: 0, size: 2, kind: 'fire' }); }
      if (info.fountain && Math.random() < 0.9) { const [wx, wy] = local(...info.fountain); this.particles.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 12, vy: -16 - Math.random() * 6, life: 0.9, age: 0, size: 1, kind: 'water', grav: 40 }); }
    }
    if (info.rotor && !ruin) {
      const [wx, wy] = local(...info.rotor);
      const cx = S(wx), cy = T(wy);
      const a = performance.now() / 1000 * (1 + g.wind * 2) * (g.speed ? 1 : 0.2);
      ctx.strokeStyle = night > 0.5 ? '#8a8a90' : '#f4f4f0'; ctx.lineWidth = Math.max(1, z * 1.2);
      ctx.beginPath();
      for (let k = 0; k < 3; k++) { const t = a + k * Math.PI * 2 / 3; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(t) * 20 * z * 0.6, cy + Math.sin(t) * 20 * z); }
      ctx.stroke();
      if (night > 0.3 && (this.frame >> 4) & 1) { ctx.fillStyle = '#ff2020'; ctx.fillRect(cx - z, cy - z, 2 * z, 2 * z); }
    }
    if (info.ferris && !ruin) {
      const [wx, wy] = local(info.ferris[0], info.ferris[1], info.ferris[2]);
      const r = info.ferris[3];
      const cx = S(wx), cy = T(wy);
      const a = performance.now() / 4000;
      ctx.strokeStyle = night > 0.5 ? '#c0c0d0' : '#d8d8e0'; ctx.lineWidth = Math.max(1, z * 0.8);
      ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.5 * z, r * z, 0, 0, Math.PI * 2); ctx.stroke();
      const cols = ['#e04040', '#40a0e0', '#e0c040', '#40c060', '#c060c0', '#e08040'];
      for (let k = 0; k < 12; k++) {
        const t = a + k * Math.PI / 6;
        const ex = cx + Math.cos(t) * r * 0.5 * z, ey = cy + Math.sin(t) * r * z;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.fillStyle = night > 0.5 ? '#ffe080' : cols[k % 6];
        ctx.fillRect(Math.round(ex - 1.5 * z), Math.round(ey), Math.ceil(3 * z), Math.ceil(3 * z));
      }
    }
    // пожар
    if (b.fire) {
      for (let k = 0; k < 3; k++) {
        const fx = X0 + (Math.random() - 0.5) * 40 * b.s, fy = Y0 + 16 * b.s - Math.random() * 30;
        this.particles.push({ x: fx, y: fy, vx: (Math.random() - 0.5) * 6, vy: -18 - Math.random() * 10, life: 0.8 + Math.random() * 0.5, age: 0, size: 3, kind: 'fire' });
        if (Math.random() < 0.4) this.particles.push({ x: fx, y: fy - 20, vx: 5, vy: -14, life: 3, age: 0, size: 5, kind: 'smoke', dark: true });
      }
      const gs = 128 * z * b.s;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 + Math.random() * 0.3;
      ctx.drawImage(this.fireGlow, S(X0) - gs / 2, T(Y0 + 16 * b.s) - gs / 2, gs, gs);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      icons.push({ kind: 'fire', x: S(X0), y: py - 4 * z });
    }
    // иконки нехватки
    if (!ruin && !b.fire) {
      let kind = null;
      const n = b.need, h = b.has;
      if (b.road < 0 && def.kind === 'zone') kind = 'road';
      else if (n.power > 0 && !h.power) kind = 'power';
      else if (n.water > 0 && !h.water) kind = 'water';
      else if (n.heat > 0.5 && !h.heat) kind = 'heat';
      else if (n.gas > 0 && !h.gas) kind = 'gas';
      else if (n.sewage > 0 && !h.sewage) kind = 'sewage';
      else if (n.garbage > 0 && !h.garbage) kind = 'garbage';
      if (kind) icons.push({ kind, x: S(X0), y: py + 2 * z });
    }
  }

  drawAgent(a, S, T, z, night, winter) {
    const ctx = this.ctx;
    const p = a.p;
    const X = (p.x - p.y) * 32, Y = (p.x + p.y) * 16;
    if (a.kind === 'walk') {
      if (z < 0.5) return;
      const fr = (performance.now() / 180 + a.c.id) & 1;
      const s = personSprite(a.c.look, p.dir, this.g.speed ? fr : 0, winter);
      const px = S(X) - s.ax * z, py = T(Y) - s.ay * z;
      ctx.drawImage(s.day, Math.round(px), Math.round(py), Math.ceil(s.day.width * z), Math.ceil(s.day.height * z));
      if (night > 0.05) { ctx.globalAlpha = night; ctx.drawImage(s.night, Math.round(px), Math.round(py), Math.ceil(s.day.width * z), Math.ceil(s.day.height * z)); ctx.globalAlpha = 1; }
      if (this.follow === a.c.id) this.marker(S(X), py);
      return;
    }
    let type, color;
    if (a.kind === 'car') { type = a.c.mode === 'bus' ? 'bus' : a.c.carType; color = a.c.mode === 'bus' ? null : a.c.carColor; }
    else { type = a.v.type; color = a.v.color; }
    const s = vehicleSprite(type, color, p.dir);
    const px = Math.round(S(X) - s.ax * z), py = Math.round(T(Y) - s.ay * z);
    const w = Math.ceil(s.day.width * z), h = Math.ceil(s.day.height * z);
    ctx.drawImage(s.day, px, py, w, h);
    if (night > 0.05) {
      ctx.globalAlpha = night; ctx.drawImage(s.night, px, py, w, h); ctx.globalAlpha = 1;
      // фары
      const [dx, dy] = DIRS[p.dir];
      const hx = S(X + (dx - dy) * 12), hy = T(Y + (dx + dy) * 6);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * 0.8;
      ctx.drawImage(this.headGlow, hx - 20 * z, hy - 20 * z, 40 * z, 40 * z);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if ((a.v?.emergency || type === 'police') && (this.frame >> 3) & 1) {
      ctx.fillStyle = type === 'police' ? '#4080ff' : '#ff3030';
      ctx.fillRect(S(X) - z, T(Y) - 9 * z, 2 * z, 2 * z);
    }
    if (a.c && this.follow === a.c.id) this.marker(S(X), py);
  }
  marker(x, y) {
    const ctx = this.ctx; const t = performance.now() / 200;
    ctx.fillStyle = '#ffe040'; ctx.strokeStyle = '#000';
    const yy = y - 8 - Math.abs(Math.sin(t)) * 4;
    ctx.beginPath(); ctx.moveTo(x, yy + 6); ctx.lineTo(x - 5, yy - 2); ctx.lineTo(x + 5, yy - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  updateParticles(dt, S, T, z, night) {
    const ctx = this.ctx;
    const g = this.g;
    const sp = g.speed ? 1 : 0.3;
    const out = [];
    for (const p of this.particles) {
      p.age += dt * sp;
      if (p.age >= p.life) continue;
      p.x += (p.vx + (p.kind === 'smoke' || p.kind === 'steam' ? g.wind * 3 : 0)) * dt * sp; p.y += p.vy * dt * sp;
      if (p.grav) p.vy += p.grav * dt * sp;
      out.push(p);
      const t = p.age / p.life;
      const px = S(p.x), py = T(p.y);
      let size = p.size * (1 + t * (p.kind === 'smoke' ? 3 : p.kind === 'steam' ? 2.5 : 0)) * z;
      if (p.kind === 'smoke') ctx.fillStyle = p.dark ? `rgba(30,28,28,${0.6 * (1 - t)})` : `rgba(${110 - night * 60},${110 - night * 60},${115 - night * 55},${0.55 * (1 - t)})`;
      else if (p.kind === 'steam') ctx.fillStyle = `rgba(${235 - night * 150},${235 - night * 150},${240 - night * 140},${0.6 * (1 - t)})`;
      else if (p.kind === 'water') ctx.fillStyle = `rgba(170,220,255,${0.9 * (1 - t)})`;
      else { ctx.fillStyle = t < 0.3 ? '#fff0a0' : t < 0.6 ? '#ffa020' : '#d03010'; size = p.size * z * (1 - t * 0.5); }
      ctx.fillRect(Math.round(px - size / 2), Math.round(py - size / 2), Math.ceil(size), Math.ceil(size));
    }
    this.particles = out.length > 3000 ? out.slice(-3000) : out;
  }

  drawTornado(t, S, T, z) {
    const ctx = this.ctx;
    const X = (t.x - t.y) * 32, Y = (t.x + t.y) * 16;
    const base = T(Y), cx = S(X);
    const tm = performance.now() / 100;
    for (let k = 0; k < 60; k++) {
      const h = k * 3 * z, r = (4 + k * 0.6) * z;
      const a = tm + k * 0.5;
      ctx.fillStyle = `rgba(90,85,80,${0.5 - k * 0.006})`;
      ctx.fillRect(cx + Math.cos(a) * r - 3 * z, base - h, 6 * z + r * 0.4, 3 * z);
    }
    for (let k = 0; k < 4; k++) this.particles.push({ x: X + (Math.random() - 0.5) * 40, y: Y, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30, life: 1.5, age: 0, size: 2, kind: 'smoke', dark: true });
  }
  drawMeteor(m, dt, S, T, z) {
    m.t += dt;
    if (m.t > 1.4) { this.g.meteorFx = null; for (let k = 0; k < 60; k++) this.particles.push({ x: (m.x - m.y) * 32, y: (m.x + m.y) * 16 + 16, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 120, life: 2, age: 0, size: 3, kind: Math.random() < 0.5 ? 'fire' : 'smoke', dark: true, grav: 60 }); return; }
    const p = Math.min(1, m.t / 1.2);
    const X = (m.x - m.y) * 32 + (1 - p) * 600, Y = (m.x + m.y) * 16 - (1 - p) * 900;
    const ctx = this.ctx;
    ctx.fillStyle = '#ffd060'; ctx.fillRect(S(X) - 4 * z, T(Y) - 4 * z, 8 * z, 8 * z);
    for (let k = 1; k < 12; k++) { ctx.fillStyle = `rgba(255,${160 - k * 10},40,${0.8 - k * 0.06})`; ctx.fillRect(S(X + k * 18) - 3 * z, T(Y - k * 27) - 3 * z, 6 * z, 6 * z); }
  }

  drawWeather(dt, winter, night) {
    const ctx = this.ctx, W = this.cv.width, H = this.cv.height;
    const g = this.g;
    const m = g.month();
    const raining = g.weather === 'rain' || (g.weather == null && (m === 3 || m === 9 || m === 10) && (g.day() % 3 === 0));
    const snowing = g.weather === 'snow' || (g.weather == null && winter && g.day() % 2 === 0);
    if (!raining && !snowing) { this.weather.length = 0; return; }
    const n = snowing ? 220 : 300;
    while (this.weather.length < n) this.weather.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() });
    ctx.fillStyle = snowing ? 'rgba(255,255,255,0.85)' : 'rgba(170,190,220,0.5)';
    for (const p of this.weather) {
      if (snowing) { p.y += (20 + p.s * 30) * dt; p.x += Math.sin(p.y / 30 + p.s * 10) * 15 * dt + g.wind * 10 * dt; ctx.fillRect(p.x, p.y, 2 * p.s + 0.5, 2 * p.s + 0.5); }
      else { p.y += 600 * dt * p.s; p.x += 60 * dt; ctx.fillRect(p.x, p.y, 1, 7 * p.s); }
      if (p.y > H) { p.y = -10; p.x = Math.random() * W; }
      if (p.x > W) p.x = 0;
    }
    if (raining) { ctx.fillStyle = 'rgba(40,50,70,0.15)'; ctx.fillRect(0, 0, W, H); }
  }

  drawOverlay(visible, S, T, z) {
    const g = this.g, w = g.world, ctx = this.ctx, ov = this.overlay;
    const col = (v, a = 0.55) => { // 0..1 зелёный->жёлтый->красный
      v = clamp(v, 0, 1);
      const r = v < 0.5 ? Math.round(v * 2 * 255) : 255, gg = v < 0.5 ? 220 : Math.round((1 - v) * 2 * 220);
      return `rgba(${r},${gg},40,${a})`;
    };
    for (const i of visible) {
      const x = i % w.W, y = (i / w.W) | 0;
      let fill = null;
      const b = w.bld[i] >= 0 ? w.buildings.get(w.bld[i]) : null;
      switch (ov) {
        case 'power': if (b && b.need.power > 0) fill = b.has.power ? 'rgba(255,230,40,0.55)' : 'rgba(255,40,40,0.6)'; else if (w.powered[i]) fill = 'rgba(255,230,40,0.35)'; else if (w.power[i]) fill = 'rgba(120,120,120,0.4)'; break;
        case 'water': case 'gas': case 'heat': case 'sewage': case 'garbage':
          if (b && b.need[ov] > 0) fill = b.has[ov] ? 'rgba(60,160,255,0.5)' : 'rgba(255,40,40,0.6)'; else if (ov !== 'garbage' && w.pipe[i]) fill = w.piped[i] ? 'rgba(60,160,255,0.35)' : 'rgba(140,140,140,0.4)'; break;
        case 'pollution': if (w.pollution[i] > 2) fill = col(w.pollution[i] / 60); break;
        case 'landValue': fill = col(1 - w.landValue[i] / 100, 0.5); break;
        case 'crime': if (w.crime[i] > 2) fill = col(w.crime[i] / 50); break;
        case 'traffic': if (w.road[i]) fill = col(w.traffic[i] / 400, 0.7); break;
        case 'noise': if (w.noise[i] > 1) fill = col(w.noise[i] / 30); break;
        case 'happiness': if (b && DEFS[b.def].zone === 'R' && b.built >= 1) fill = col(1 - b.happy, 0.65); break;
        default: { const c = w.cov[ov]; if (c && c[i] > 0.01) fill = `rgba(60,200,120,${Math.min(0.65, c[i] * 0.7)})`; else if (c) fill = 'rgba(255,60,60,0.12)'; }
      }
      if (fill) { ctx.fillStyle = fill; this.diamond(S((x - y) * 32), T((x + y) * 16), z); }
    }
  }

  drawPreview(pv, S, T, z, night, winter) {
    const ctx = this.ctx, w = this.g.world;
    if (pv.tiles) {
      for (const i of pv.tiles) {
        const x = i % w.W, y = (i / w.W) | 0;
        ctx.fillStyle = pv.color || (pv.ok ? 'rgba(80,220,120,0.35)' : 'rgba(255,60,60,0.4)');
        this.diamond(S((x - y) * 32), T((x + y) * 16), z);
      }
    }
    if (pv.ghost) {
      const { def, x, y, ok } = pv.ghost;
      const s = def.size;
      if (pv.radius) {
        const cx = x + s / 2, cy = y + s / 2;
        const [ex, ey] = [S((cx - cy) * 32), T((cx + cy) * 16)];
        ctx.strokeStyle = 'rgba(120,255,160,0.9)'; ctx.fillStyle = 'rgba(120,255,160,0.12)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(ex, ey, pv.radius * 32 * Math.SQRT2 * z * 0.71 * 1.414, pv.radius * 16 * Math.SQRT2 * z * 0.71 * 1.414, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
        ctx.fillStyle = ok ? 'rgba(80,220,120,0.45)' : 'rgba(255,60,60,0.5)';
        this.diamond(S((x + dx - y - dy) * 32), T((x + dx + y + dy) * 16), z);
      }
      const e = buildingSprite(def.id, 0, 'day');
      const X0 = (x - y) * 32, Y0 = (x + y) * 16;
      ctx.globalAlpha = ok ? 0.75 : 0.4;
      ctx.drawImage(e.day, S(X0 - e.ax), T(Y0 - e.ay), Math.ceil(e.day.width * z), Math.ceil(e.day.height * z));
      ctx.globalAlpha = 1;
    }
  }
  drawSelection(sel, S, T, z) {
    const ctx = this.ctx;
    if (sel.b) {
      const b = sel.b;
      ctx.strokeStyle = '#ffe040'; ctx.lineWidth = 2;
      const s = b.s;
      const X = (b.x - b.y) * 32, Y = (b.x + b.y) * 16;
      ctx.beginPath(); ctx.moveTo(S(X), T(Y)); ctx.lineTo(S(X + 32 * s), T(Y + 16 * s)); ctx.lineTo(S(X), T(Y + 32 * s)); ctx.lineTo(S(X - 32 * s), T(Y + 16 * s)); ctx.closePath(); ctx.stroke();
    }
  }
}

export { ZOOMS };
