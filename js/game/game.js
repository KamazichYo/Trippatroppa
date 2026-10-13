// Главный класс игры: время, действия игрока, симуляционный цикл, сохранение.
import { World, T_WATER, T_GRASS, T_SAND, ZONE_CODE, DIRS } from './world.js';
import { DEFS, RANKS, ZONE_TOOLS } from '../data/buildings.js';
import { updateNetworks } from './network.js';
import { updateMaps } from './maps.js';
import { updateDemand, growthStep, buildingStep, checkRank } from './growth.js';
import { monthlyBudget } from './economy.js';
import { Citizens } from './citizens.js';
import { fireStep, tornadoStep } from './disasters.js';
import { FLAVOR_NEWS, TOWN_NAMES } from '../data/names.js';
import { pick } from '../engine/util.js';

export const SPEEDS = [0, 4, 12, 32, 120];
export const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const ROAD_BUILD_COST = [0, 6, 25, 60];
export const ROAD_RANK = [0, 0, 1, 4];
export const LINE_COST = 6, PIPE_COST = 8, TREE_CLEAR = 3, BULLDOZE = 5;

const HISTORY_EVENTS = {
  [1992 * 12 + 0]: { text: 'Либерализация цен: всё подорожало в несколько раз!', fn: (g) => { g.money = Math.round(g.money * 0.6); } },
  [1992 * 12 + 9]: { text: 'Началась ваучерная приватизация. Каждому жителю — ваучер!', fn: (g) => { g.demand.C += 0.3; } },
  [1995 * 12 + 4]: { text: 'В городе появилась сотовая связь. Трубки размером с кирпич стоят как машина.', fn: () => {} },
  [1998 * 12 + 7]: { text: 'ДЕФОЛТ! Рубль обвалился, импорт подорожал, бизнес в панике.', fn: (g) => { g.events.default98 = 8; } },
  [2000 * 12 + 0]: { text: 'Наступил 2000 год! Ошибка 2000 не случилась. Город празднует.', fn: (g) => { g.money += 10000; } },
};

export class Game {
  constructor(opts = {}) {
    this.cityName = opts.name || pick(Math.random, TOWN_NAMES);
    const size = opts.size || 96;
    this.world = new World(size, size, opts.seed ?? Math.floor(Math.random() * 1e6));
    if (!opts.empty) this.world.generate(opts);
    this.money = opts.money ?? 30000;
    this.time = 4 * 1440 + 8 * 60; // минуты от начала 1990 (1 игровой день = 1 месяц); старт — май
    this.speed = 1;
    this.rank = 0;
    this.taxes = { R: 9, C: 9, I: 9, A: 7 };
    this.funding = { utilities: 1, fire: 1, police: 1, health: 1, edu: 1, leisure: 1, admin: 1, transport: 1 };
    this.god = { infiniteMoney: false, instantBuild: false, noDisasters: false, freeUtilities: false, maxDemand: false, allHappy: false, unlockAll: false, fillAll: false, freezeTime: false };
    this.demand = { R: 0.5, C: 0, I: 0, A: 0.5 };
    this.stats = { pop: 0, unemployment: 0, happiness: 0.6 };
    this.supply = null;
    this.budget = null;
    this.history = [];
    this.news = [];
    this.loans = [];
    this.events = {};
    this.wind = 1;
    this.trade = 0;
    this.center = [this.world.W / 2, this.world.H / 2];
    this.citizens = new Citizens(this);
    this.lastHour = Math.floor(this.time / 60);
    this.lastDay = Math.floor(this.time / 1440);
    this.world.recomputeRoads();
    updateNetworks(this);
    updateMaps(this);
  }

  // ---------- календарь ----------
  day() { return Math.floor(this.time / 1440); }
  month() { return this.day() % 12; }
  year() { return 1990 + Math.floor(this.day() / 12); }
  minuteOfDay() { return this.time % 1440; }
  weekday() { return 0; } // 1 игровой день = 1 месяц, поэтому выходных нет: досуг — по вечерам
  dateStr() { const m = this.minuteOfDay(); return `${MONTHS[this.month()]} ${this.year()}, ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`; }
  isWinter() { const m = this.month(); return m === 11 || m === 0 || m === 1; }
  // 0 — день, 1 — глубокая ночь
  darkness() {
    const h = this.minuteOfDay() / 60;
    const m = this.month();
    const sunrise = 6.5 + Math.cos((m - 5.5) / 12 * Math.PI * 2) * 1.6, sunset = 19.5 - Math.cos((m - 5.5) / 12 * Math.PI * 2) * 2.2;
    if (h > sunrise + 1 && h < sunset - 1) return 0;
    if (h >= sunset + 1 || h <= sunrise - 1) return 1;
    if (h <= sunrise + 1) return Math.min(1, Math.max(0, (sunrise + 1 - h) / 2));
    return Math.min(1, Math.max(0, (h - (sunset - 1)) / 2));
  }

  canAfford(cost) { return this.god.infiniteMoney || this.money >= cost; }
  spend(cost) { if (!this.god.infiniteMoney) this.money -= cost; }

  // ---------- действия ----------
  roadCost(i, type) {
    const w = this.world;
    if (w.road[i] === type || (type === 1 && w.road[i] === 2 && w.terrain[i] === T_WATER)) return 0;
    let c = ROAD_BUILD_COST[type];
    if (w.terrain[i] === T_WATER) { if (type === 1) c = ROAD_BUILD_COST[2]; c *= 6; }
    if (w.tree[i]) c += TREE_CLEAR;
    if (w.bld[i] >= 0) return Infinity;
    return c;
  }
  buildRoads(tiles, type) {
    const w = this.world;
    let cost = 0;
    for (const i of tiles) { const c = this.roadCost(i, type); if (c !== Infinity) cost += c; }
    if (!this.canAfford(cost)) return { ok: false, msg: 'Недостаточно денег' };
    let n = 0;
    for (const i of tiles) {
      const c = this.roadCost(i, type);
      if (c === Infinity || c === 0) continue;
      w.road[i] = type === 1 && w.terrain[i] === T_WATER ? 2 : type; w.tree[i] = 0; w.zone[i] = 0; w.dens[i] = 0; w.rubble[i] = 0;
      w.changed.add(i); n++;
    }
    this.spend(cost);
    if (n) { w.version++; w.roadsDirty = true; w.netDirty = true; }
    return { ok: true, cost };
  }
  buildNet(tiles, kind) {
    const w = this.world;
    const arr = kind === 'power' ? w.power : w.pipe;
    const unit = kind === 'power' ? LINE_COST : PIPE_COST;
    let cost = 0;
    const list = tiles.filter((i) => !arr[i] && (kind === 'pipe' || w.bld[i] < 0) && (w.terrain[i] !== T_WATER || kind === 'power'));
    for (const i of list) cost += unit + (kind === 'power' && w.tree[i] ? TREE_CLEAR : 0);
    if (!this.canAfford(cost)) return { ok: false, msg: 'Недостаточно денег' };
    for (const i of list) { arr[i] = 1; if (kind === 'power') w.tree[i] = 0; w.changed.add(i); }
    this.spend(cost);
    w.netDirty = true;
    return { ok: true, cost };
  }
  zoneCost(i, zone, dens) {
    const w = this.world;
    if (w.road[i] || w.terrain[i] === T_WATER) return Infinity;
    const b = w.bld[i] >= 0 ? w.buildings.get(w.bld[i]) : null;
    if (b && DEFS[b.def].kind === 'plop') return Infinity;
    if (w.zone[i] === ZONE_CODE[zone] && w.dens[i] === dens) return Infinity;
    const t = ZONE_TOOLS.find((z) => z.zone === zone && z.dens === dens);
    return (t?.cost ?? 5) + (w.tree[i] ? 1 : 0);
  }
  setZone(tiles, zone, dens) {
    const w = this.world;
    let cost = 0;
    const list = tiles.filter((i) => this.zoneCost(i, zone, dens) !== Infinity);
    for (const i of list) cost += this.zoneCost(i, zone, dens);
    if (!this.canAfford(cost)) return { ok: false, msg: 'Недостаточно денег' };
    const code = ZONE_CODE[zone];
    for (const i of list) {
      const b = w.bld[i] >= 0 ? w.buildings.get(w.bld[i]) : null;
      if (b && DEFS[b.def].zone !== zone) w.removeBuilding(b.id);
      w.zone[i] = code; w.dens[i] = dens; w.rubble[i] = 0; w.tree[i] = 0; w.changed.add(i);
    }
    this.spend(cost);
    w.netDirty = true;
    return { ok: true, cost };
  }
  dezone(tiles) {
    const w = this.world;
    for (const i of tiles) {
      const b = w.bld[i] >= 0 ? w.buildings.get(w.bld[i]) : null;
      if (b && DEFS[b.def].kind === 'zone') w.removeBuilding(b.id);
      if (!b || DEFS[b.def].kind === 'zone') { w.zone[i] = 0; w.dens[i] = 0; w.changed.add(i); }
    }
    return { ok: true, cost: 0 };
  }
  bulldozeCost(tiles, underground) {
    const w = this.world;
    let cost = 0; const seen = new Set();
    for (const i of tiles) {
      if (underground) { if (w.pipe[i]) cost += 2; continue; }
      const id = w.bld[i];
      if (id >= 0 && !seen.has(id)) { seen.add(id); const b = w.buildings.get(id); cost += BULLDOZE * b.s * b.s * (DEFS[b.def].kind === 'plop' ? 4 : 1); }
      else if (id < 0) { if (w.road[i]) cost += BULLDOZE; if (w.power[i]) cost += 2; if (w.tree[i]) cost += TREE_CLEAR; if (w.rubble[i]) cost += 2; }
    }
    return cost;
  }
  bulldoze(tiles, underground = false) {
    const w = this.world;
    const cost = this.bulldozeCost(tiles, underground);
    if (!this.canAfford(cost)) return { ok: false, msg: 'Недостаточно денег' };
    let roads = false;
    for (const i of tiles) {
      if (underground) { if (w.pipe[i]) { w.pipe[i] = 0; w.netDirty = true; } continue; }
      const id = w.bld[i];
      if (id >= 0) { const b = w.buildings.get(id); if (b) { w.removeBuilding(id); if (DEFS[b.def].kind === 'plop') this.refund(b); } }
      else {
        if (w.road[i]) { w.road[i] = 0; roads = true; }
        else if (w.power[i]) { w.power[i] = 0; w.netDirty = true; }
        else if (w.tree[i]) w.tree[i] = 0;
        w.rubble[i] = 0;
      }
      w.changed.add(i);
    }
    if (roads) { w.version++; w.roadsDirty = true; }
    this.spend(cost);
    return { ok: true, cost };
  }
  refund(b) { if (!this.god.infiniteMoney) this.money += Math.round(DEFS[b.def].cost * 0.25); }
  placeCheck(defId, x, y) {
    const def = DEFS[defId];
    const err = this.world.footprintOK(def, x, y);
    if (err) return err;
    if (def.rank > this.rank && !this.god.unlockAll) return `Откроется при статусе «${RANKS[def.rank].name}»`;
    if (def.unique) for (const b of this.world.buildings.values()) if (b.def === defId) return 'Такое здание уже есть';
    if (!this.canAfford(def.cost)) return 'Недостаточно денег';
    return null;
  }
  placeBuilding(defId, x, y) {
    const err = this.placeCheck(defId, x, y);
    if (err) return { ok: false, msg: err };
    const def = DEFS[defId];
    const b = this.world.addBuilding(defId, x, y, { built: this.god.instantBuild ? 1 : 0, variant: Math.floor(Math.random() * 4) });
    b.buildRate = 1 / (2 + def.size * 3);
    this.world.updateAccess(b);
    this.spend(def.cost);
    if (def.trade) this.trade += def.trade;
    return { ok: true, cost: def.cost, b };
  }
  plantTrees(tiles) {
    const w = this.world;
    const list = tiles.filter((i) => !w.road[i] && w.bld[i] < 0 && w.terrain[i] !== T_WATER && w.tree[i] < 3);
    const cost = list.length * 4;
    if (!this.canAfford(cost)) return { ok: false, msg: 'Недостаточно денег' };
    for (const i of list) { w.tree[i] = Math.min(3, w.tree[i] + 1 + (Math.random() < 0.4 ? 1 : 0)); w.changed.add(i); }
    this.spend(cost);
    return { ok: true, cost };
  }
  terraform(tiles, toWater) {
    const w = this.world;
    for (const i of tiles) {
      if (toWater) { const b = w.bld[i] >= 0 ? w.buildings.get(w.bld[i]) : null; if (b) w.removeBuilding(b.id); w.terrain[i] = T_WATER; w.tree[i] = 0; w.zone[i] = 0; if (w.road[i] === 1) w.road[i] = 0; }
      else if (w.terrain[i] === T_WATER) w.terrain[i] = T_GRASS;
      w.changed.add(i);
    }
    w.version++; w.roadsDirty = true; w.netDirty = true;
    return { ok: true, cost: 0 };
  }

  // ---------- цикл ----------
  update(dtReal) {
    if (this.god.freezeTime && this.speed > 0) { this.citizens.update(0); return; }
    const sp = SPEEDS[this.speed] || 0;
    let dt = Math.min(dtReal, 0.25) * sp;
    if (dt <= 0) return;
    // большой шаг дробим по часам
    let guard = 0;
    while (dt > 0 && guard++ < 20) {
      const step = Math.min(dt, 30);
      this.time += step; dt -= step;
      this.citizens.update(step);
      tornadoStep(this, step);
      const hour = Math.floor(this.time / 60);
      while (this.lastHour < hour) { this.lastHour++; this.hourly(); }
      const day = Math.floor(this.time / 1440);
      while (this.lastDay < day) { this.lastDay++; this.monthly(); }
    }
  }

  hourly() {
    const w = this.world;
    if (w.roadsDirty) w.recomputeRoads();
    this.wind = Math.max(0.3, Math.min(1.4, this.wind + (Math.random() - 0.5) * 0.2));
    if (w.netDirty || this.lastHour % 3 === 0) updateNetworks(this);
    updateDemand(this);
    growthStep(this, 1 / 6);
    buildingStep(this);
    fireStep(this);
    if (this.lastHour % 6 === 0) updateMaps(this);
    // затухание трафика
    for (let i = 0; i < w.traffic.length; i++) if (w.traffic[i]) w.traffic[i] *= 0.88;
    this.citizens.sync();
    this.citizens.hourly();
    checkRank(this);
    for (const b of w.buildings.values()) b.visitors = (b.visitors || 0) * 0.8;
  }

  monthly() {
    const w = this.world;
    updateMaps(this);
    const bud = monthlyBudget(this);
    const ym = this.year() * 12 + this.month();
    const ev = HISTORY_EVENTS[ym];
    if (ev) { ev.fn(this); this.news.push({ t: this.time, text: ev.text, type: 'event', big: true }); }
    if (this.events.default98) { this.events.default98--; if (!this.events.default98) delete this.events.default98; }
    if (Math.random() < 0.35) this.news.push({ t: this.time, text: pick(Math.random, FLAVOR_NEWS).replaceAll('{city}', this.cityName), type: 'flavor' });
    // жалобы
    const s = this.supply;
    if (s) for (const [k, name] of [['power', 'электроэнергии'], ['water', 'воды'], ['gas', 'газа'], ['heat', 'тепла'], ['sewage', 'мощности очистных'], ['garbage', 'вывоза мусора']]) {
      if (s[k].use > s[k].prod * 1.02 && s[k].use > 5) this.news.push({ t: this.time, text: `Не хватает ${name}: нужно ${Math.round(s[k].use)}, есть ${Math.round(s[k].prod)}.`, type: 'warn' });
    }
    if (this.money < 0) this.news.push({ t: this.time, text: 'Казна пуста! Возьмите кредит или поднимите налоги.', type: 'bad' });
    for (const b of w.buildings.values()) b.visitorsMonth = 0;
    this.history.push({ t: this.time, y: this.year(), m: this.month(), pop: this.stats.pop, money: Math.round(this.money), inc: Math.round(bud.totalInc), exp: Math.round(bud.totalExp), happy: this.stats.happiness, unemp: this.stats.unemployment, R: this.demand.R, C: this.demand.C, I: this.demand.I, jobs: this.stats.jobs });
    if (this.history.length > 360) this.history.shift();
    if (this.news.length > 200) this.news.splice(0, this.news.length - 200);
    this.onMonth?.();
  }

  // ---------- сохранение ----------
  serialize() {
    const w = this.world;
    const enc = (a) => { let s = ''; const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); };
    return JSON.stringify({
      v: 1, name: this.cityName, money: this.money, time: this.time, rank: this.rank, taxes: this.taxes, funding: this.funding, god: this.god,
      demand: this.demand, history: this.history, news: this.news.slice(-60), loans: this.loans, events: this.events, trade: this.trade,
      world: { W: w.W, H: w.H, seed: w.seed, nextId: w.nextId, terrain: enc(w.terrain), tree: enc(w.tree), road: enc(w.road), power: enc(w.power), pipe: enc(w.pipe), zone: enc(w.zone), dens: enc(w.dens), rubble: enc(w.rubble), landValue: enc(w.landValue) },
      buildings: [...w.buildings.values()].map((b) => [b.id, b.def, b.x, b.y, b.variant, +b.built.toFixed(3), Math.round(b.occ * 10) / 10, b.abandoned ? 1 : 0, b.age, b.name]),
    });
  }
  static deserialize(json) {
    const d = JSON.parse(json);
    const g = new Game({ empty: true, size: d.world.W, seed: d.world.seed, name: d.name });
    const w = g.world;
    const dec = (s, T) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); };
    w.terrain.set(dec(d.world.terrain, Uint8Array)); w.tree.set(dec(d.world.tree, Uint8Array)); w.road.set(dec(d.world.road, Uint8Array));
    w.power.set(dec(d.world.power, Uint8Array)); w.pipe.set(dec(d.world.pipe, Uint8Array)); w.zone.set(dec(d.world.zone, Uint8Array));
    w.dens.set(dec(d.world.dens, Uint8Array)); w.rubble.set(dec(d.world.rubble, Uint8Array));
    if (d.world.landValue) w.landValue.set(dec(d.world.landValue, Float32Array));
    for (const [id, def, x, y, variant, built, occ, ab, age, name] of d.buildings) {
      if (!DEFS[def]) continue;
      w.nextId = id;
      const b = w.addBuilding(def, x, y, { variant, built, occ, name });
      b.abandoned = !!ab; b.age = age || 0;
    }
    w.nextId = Math.max(w.nextId, d.world.nextId);
    Object.assign(g, { money: d.money, time: d.time, rank: d.rank, taxes: d.taxes, funding: d.funding, god: { ...g.god, ...d.god }, demand: d.demand, history: d.history || [], news: d.news || [], loans: d.loans || [], events: d.events || {}, trade: d.trade || 0 });
    g.lastHour = Math.floor(g.time / 60); g.lastDay = Math.floor(g.time / 1440);
    w.version++; w.recomputeRoads();
    g.citizens.setWorld(w);
    updateNetworks(g); updateDemand(g); updateMaps(g); g.citizens.sync();
    return g;
  }
}
