// Жители: распорядок дня, поездки, работа, отдых. Служебный транспорт.
import { DEFS } from '../data/buildings.js';
import { MALE, FEMALE, SURNAMES, PATRO_M, PATRO_F, femSurname } from '../data/names.js';
import { Pathfinder } from './path.js';
import { pick } from '../engine/util.js';
import { pal } from '../gfx/materials.js';

const MAX_AGENTS = 1400;
const SPEED = { walk: 0.22, car: 0.75, bus: 0.55, truck: 0.6, service: 0.85 };
const CAR_TYPES = ['lada', 'lada', 'lada', 'moskvich', 'zaz', 'volga', 'niva', 'lada'];

const JOBS = {
  shop: ['Продавец', 'Кассир', 'Товаровед', 'Грузчик', 'Охранник'],
  food: ['Повар', 'Официантка', 'Бармен', 'Посудомойщица'],
  office: ['Менеджер', 'Бухгалтер', 'Программист', 'Секретарь', 'Юрист', 'Экономист'],
  I: ['Рабочий', 'Слесарь', 'Токарь', 'Инженер', 'Мастер цеха', 'Сварщик', 'Технолог', 'Кладовщик'],
  A: ['Тракторист', 'Доярка', 'Агроном', 'Механизатор', 'Скотник', 'Зоотехник'],
  fire: ['Пожарный', 'Начальник караула'], police: ['Милиционер', 'Участковый', 'Следователь'],
  health: ['Врач', 'Медсестра', 'Фельдшер', 'Санитарка'], edu: ['Учитель', 'Воспитательница', 'Завуч', 'Преподаватель'],
  power: ['Энергетик', 'Электрик'], water: ['Сантехник', 'Оператор насосной'], sewage: ['Оператор очистных'], gas: ['Газовщик'], heat: ['Кочегар', 'Оператор котельной'],
  garbage: ['Мусорщик', 'Водитель мусоровоза'], admin: ['Чиновник', 'Почтальон', 'Телефонистка', 'Делопроизводитель'], leisure: ['Работник культуры', 'Садовник', 'Тренер'],
  transport: ['Водитель автобуса', 'Диспетчер', 'Кассир'],
};

function jobTitle(def) {
  if (def.kind === 'plop') return pick(Math.random, JOBS[def.cat] || JOBS.admin);
  if (def.zone === 'I') return pick(Math.random, JOBS.I);
  if (def.zone === 'A') return pick(Math.random, JOBS.A);
  if (def.id === 'c3_office' || def.id === 'c3_tower' || def.id === 'c2_bank') return pick(Math.random, JOBS.office);
  if (def.id === 'c3_casino') return 'Крупье';
  if (def.id === 'c2_hotel' || def.id === 'c3_hotel') return pick(Math.random, ['Администратор', 'Горничная', 'Портье']);
  if (def.tags?.includes('food')) return pick(Math.random, JOBS.food);
  return pick(Math.random, JOBS.shop);
}

const LOOK = {
  skin: [0xf0c8a0, 0xe8b890, 0xd8a078, 0xf4d0b0],
  hair: [0x2a1a10, 0x4a3020, 0x6a4a2a, 0xc8a050, 0x8a3a1a, 0x1a1a1a, 0xa0a0a0],
  top: [0xc03030, 0x3050a0, 0x308040, 0xd0b030, 0x6a3a8a, 0x2a2a2a, 0xe0e0e0, 0x8a5a3a, 0x30a0b0, 0xd06090, 0x5a6a3a],
  bottom: [0x2a3a6a, 0x2a2a2a, 0x4a4a4a, 0x3a2a1a, 0x5a6a8a],
};

export class Citizens {
  constructor(g) {
    this.g = g;
    this.list = [];
    this.byId = new Map();
    this.nextId = 1;
    this.vehicles = [];
    this.ratio = 1;
    this.pf = new Pathfinder(g.world);
    this.places = {};
    this.followId = null;
  }
  setWorld(w) { this.pf = new Pathfinder(w); }

  // ---------- создание жителя ----------
  make(home) {
    const r = Math.random();
    const kind = r < 0.2 ? 'kid' : r < 0.82 ? 'adult' : 'pens';
    const male = Math.random() < 0.48;
    const age = kind === 'kid' ? 4 + Math.floor(Math.random() * 13) : kind === 'adult' ? 17 + Math.floor(Math.random() * 43) : 60 + Math.floor(Math.random() * 25);
    const sur = pick(Math.random, SURNAMES);
    const c = {
      id: this.nextId++, kind, male, age,
      first: pick(Math.random, male ? MALE : FEMALE),
      patro: kind === 'kid' ? '' : pick(Math.random, male ? PATRO_M : PATRO_F),
      sur: male ? sur : femSurname(sur),
      home: home.id, work: -1, job: kind === 'kid' ? (age < 7 ? 'Дошкольник' : 'Школьник') : kind === 'pens' ? 'Пенсионер' : 'Безработный',
      state: 'at', at: home.id, until: 0, act: 'home', actText: 'Дома',
      car: kind === 'adult' && Math.random() < 0.38, carType: pick(Math.random, CAR_TYPES), carColor: pick(Math.random, pal.car),
      look: {
        skin: pick(Math.random, LOOK.skin), hair: kind === 'pens' && Math.random() < 0.6 ? 0xb8b8b8 : pick(Math.random, LOOK.hair),
        top: pick(Math.random, LOOK.top), bottom: pick(Math.random, LOOK.bottom), female: !male, small: kind === 'kid', scarf: kind === 'pens' && !male && Math.random() < 0.6,
      },
      side: Math.random() < 0.5 ? 1 : -1,
      wStart: 7 * 60 + Math.floor(Math.random() * 120), shift: 8 * 60 + Math.floor(Math.random() * 60),
      lunchy: Math.random() < 0.45, mood: 0.7, log: [], trips: 0, money: 50 + Math.floor(Math.random() * 300),
    };
    if (kind === 'adult' && age < 22 && Math.random() < 0.4) c.student = true;
    return c;
  }
  fullName(c) { return `${c.sur} ${c.first}${c.patro ? ' ' + c.patro : ''}`; }

  // ---------- синхронизация с населением ----------
  sync() {
    const w = this.g.world;
    const pop = this.g.stats.pop || 0;
    this.ratio = Math.max(1, pop / MAX_AGENTS);
    const byHome = new Map();
    for (const c of this.list) { if (!byHome.has(c.home)) byHome.set(c.home, []); byHome.get(c.home).push(c); }
    const keep = [];
    const removed = new Set();
    for (const b of w.buildings.values()) {
      const def = DEFS[b.def];
      if (def.zone !== 'R' || b.built < 1) continue;
      const want = b.abandoned ? 0 : Math.round(b.occ / this.ratio);
      const have = byHome.get(b.id) || [];
      byHome.delete(b.id);
      if (have.length > want) { for (let k = want; k < have.length; k++) removed.add(have[k].id); have.length = want; }
      while (have.length < want) { const c = this.make(b); have.push(c); this.log(c, 'Переехал(а) в город'); }
      keep.push(...have);
    }
    for (const list of byHome.values()) for (const c of list) removed.add(c.id); // дом снесён
    this.list = keep;
    this.byId = new Map(keep.map((c) => [c.id, c]));
    if (this.followId && !this.byId.has(this.followId)) this.followId = null;
    this.assignJobs();
    this.indexPlaces();
  }

  indexPlaces() {
    const w = this.g.world;
    const P = { shop: [], food: [], fun: [], park: [], school: [], kinder: [], univ: [], health: [], work: [], police: [], fire: [], garbage: [], transit: [], industry: [] };
    for (const b of w.buildings.values()) {
      if (b.built < 1 || b.abandoned || b.road < 0) continue;
      const def = DEFS[b.def];
      for (const t of def.tags || []) if (P[t]) P[t].push(b);
      if (def.service?.type === 'police') P.police.push(b);
      if (def.service?.type === 'fire') P.fire.push(b);
      if (def.service?.type === 'transit') P.transit.push(b);
      if (def.prod?.garbage) P.garbage.push(b);
      if (def.zone === 'I') P.industry.push(b);
    }
    this.places = P;
  }

  assignJobs() {
    const w = this.g.world;
    const slots = new Map();
    for (const b of w.buildings.values()) {
      if (b.built < 1 || b.abandoned) continue;
      const def = DEFS[b.def];
      let jobs = 0;
      if (def.kind === 'zone' && def.zone !== 'R') jobs = def.cap; else if (def.kind === 'plop') jobs = def.jobs || 0;
      if (jobs > 0) slots.set(b.id, Math.max(1, Math.round(jobs / this.ratio)));
    }
    for (const c of this.list) { if (c.work >= 0) { const s = slots.get(c.work); if (s > 0) slots.set(c.work, s - 1); else { c.work = -1; if (c.kind === 'adult') c.job = 'Безработный'; } } }
    const free = [...slots.entries()].filter(([, s]) => s > 0);
    if (!free.length) return;
    for (const c of this.list) {
      if (c.kind !== 'adult' || c.work >= 0 || c.student) continue;
      const home = w.buildings.get(c.home);
      if (!home) continue;
      let best = null, bd = 1e9;
      for (let k = 0; k < 8; k++) {
        const e = free[(Math.random() * free.length) | 0];
        if (e[1] <= 0) continue;
        const b = w.buildings.get(e[0]);
        if (!b) continue;
        const d = Math.abs(b.x - home.x) + Math.abs(b.y - home.y) + (b.comp !== home.comp ? 1000 : 0);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) continue;
      best[1]--;
      const wb = w.buildings.get(best[0]);
      c.work = wb.id; c.job = jobTitle(DEFS[wb.def]);
      this.log(c, `Устроился(-ась) на работу: ${c.job}, «${DEFS[wb.def].name}»`);
    }
  }

  log(c, text) {
    c.log.unshift({ t: this.g.time, text });
    if (c.log.length > 8) c.log.length = 8;
  }

  nearest(list, from, n = 5) {
    if (!list || !list.length || !from) return null;
    const cand = [];
    for (const b of list) {
      if (b.comp !== from.comp) continue;
      const d = Math.abs(b.x - from.x) + Math.abs(b.y - from.y);
      cand.push([d, b]);
    }
    if (!cand.length) return null;
    cand.sort((a, b) => a[0] - b[0]);
    return cand[Math.floor(Math.random() * Math.min(n, cand.length))][1];
  }

  // ---------- решения ----------
  decide(c) {
    const g = this.g, w = g.world;
    const m = g.minuteOfDay(), wd = g.weekday() < 5;
    const home = w.buildings.get(c.home);
    if (!home) return;
    const here = w.buildings.get(c.at) || home;
    const night = m >= 22 * 60 + 30 || m < 6 * 60;
    const P = this.places;
    const go = (b, act, text, dur) => this.trip(c, b, act, text, dur);
    if (night) { if (c.at !== c.home) go(home, 'home', 'Спит дома', 0); else { c.act = 'sleep'; c.actText = 'Спит'; c.until = g.time + ((m < 6 * 60 ? 6 * 60 - m : 30 * 60 - m) + Math.random() * 60); } return; }
    if (c.kind === 'kid') {
      const sch = c.age < 7 ? P.kinder : P.school;
      if (wd && m < 13 * 60 && m >= 7 * 60 && sch?.length && c.act !== 'school') {
        const s = this.nearest(sch, home, 2);
        if (s) return go(s, 'school', c.age < 7 ? 'В детском саду' : 'На уроках в школе', Math.max(30, 14 * 60 - m));
      }
      if (m >= 14 * 60 && m < 19 * 60 && Math.random() < 0.45 && P.park?.length) { const p = this.nearest(P.park, here); if (p) return go(p, 'park', 'Играет во дворе и на площадке', 60 + Math.random() * 90); }
      if (m >= 15 * 60 && m < 18 * 60 && Math.random() < 0.15 && P.shop?.length) { const p = this.nearest(P.shop, here); if (p) return go(p, 'shop', 'Покупает жвачку с вкладышами', 20 + Math.random() * 20); }
      return this.stayHome(c, home, 'Дома: смотрит мультики');
    }
    if (c.kind === 'pens') {
      if (m >= 8 * 60 && m < 12 * 60 && Math.random() < 0.5 && P.shop?.length) { const p = this.nearest(P.shop, home); if (p) return go(p, 'shop', 'Стоит в очереди за продуктами', 40 + Math.random() * 60); }
      if (m >= 9 * 60 && m < 13 * 60 && Math.random() < 0.12 && P.health?.length) { const p = this.nearest(P.health, home, 2); if (p) return go(p, 'health', 'На приёме у врача', 60 + Math.random() * 60); }
      if (m >= 13 * 60 && m < 18 * 60 && Math.random() < 0.35 && P.park?.length) { const p = this.nearest(P.park, home); if (p) return go(p, 'park', 'Гуляет, кормит голубей', 60 + Math.random() * 90); }
      if (c.at !== c.home) return go(home, 'home', 'Возвращается домой', 0);
      return this.stayHome(c, home, Math.random() < 0.5 ? 'Сидит на лавочке у подъезда' : 'Дома: смотрит сериал');
    }
    // взрослые
    const work = c.work >= 0 ? w.buildings.get(c.work) : null;
    if (c.student && wd && m >= 8 * 60 && m < 15 * 60 && P.univ?.length && c.act !== 'study') { const u = this.nearest(P.univ, home, 2); if (u) return go(u, 'study', 'На лекциях', 15 * 60 - m); }
    if (work && wd) {
      const end = c.wStart + c.shift;
      if (m >= c.wStart - 60 && m < end) {
        if (c.act === 'work' && c.at === work.id && c.lunchy && !c.lunched && m >= 12 * 60 + 30 && m < 14 * 60 && P.food?.length) {
          const f = this.nearest(P.food, work, 3);
          c.lunched = true;
          if (f && f !== work) return go(f, 'lunch', `Обедает в «${DEFS[f.def].name}»`, 40);
        }
        if (c.at !== work.id) return go(work, 'work', `Работает: ${c.job} — «${DEFS[work.def].name}»`, end - m);
        c.act = 'work'; c.actText = `Работает: ${c.job} — «${DEFS[work.def].name}»`; c.until = g.time + Math.min(end - m, 13 * 60 - m > 0 ? 13 * 60 - m + 30 : end - m);
        return;
      }
    }
    if (m < 9 * 60 && c.at === c.home) { c.lunched = false; return this.stayHome(c, home, 'Завтракает дома', 30 + Math.random() * 60); }
    // досуг
    if (m < 22 * 60 && c.act !== 'leisure' && Math.random() < (wd ? 0.6 : 0.75)) {
      const r = Math.random();
      let list, text, dur;
      if (!work && c.kind === 'adult' && wd && m < 17 * 60 && r < 0.3 && P.industry.length) { list = [...P.industry, ...(P.shop || [])]; text = 'Ищет работу, обходит предприятия'; dur = 40; }
      else if (r < 0.32) { list = P.shop; text = 'Ходит по магазинам'; dur = 30 + Math.random() * 50; }
      else if (r < 0.52) { list = P.food; text = Math.random() < 0.5 ? 'Ужинает в кафе с друзьями' : 'Пьёт пиво с соседями'; dur = 60 + Math.random() * 90; }
      else if (r < 0.68) { list = P.fun; text = Math.random() < 0.5 ? 'Смотрит кино' : 'Отдыхает, развлекается'; dur = 90 + Math.random() * 60; }
      else if (r < 0.85) { list = P.park; text = 'Гуляет в парке'; dur = 50 + Math.random() * 70; }
      if (list && list.length) { const p = this.nearest(list, here); if (p && p.id !== c.at) { c.lastLeisure = g.time; return go(p, 'leisure', text + ` («${DEFS[p.def].name}»)`, dur); } }
    }
    if (c.at !== c.home) return go(home, 'home', 'Возвращается домой', 0);
    this.stayHome(c, home, pick(Math.random, ['Дома: смотрит телевизор', 'Дома: ужинает с семьёй', 'Дома: чинит видеомагнитофон', 'Дома: читает газету', 'Дома: играет в «Денди»', 'Дома: болтает по телефону']));
  }

  stayHome(c, home, text, dur = 60 + Math.random() * 120) {
    c.act = 'home'; c.actText = text; c.at = home.id; c.state = 'at';
    c.until = this.g.time + dur;
  }

  trip(c, dest, act, text, dur) {
    const g = this.g, w = g.world;
    const from = w.buildings.get(c.at) || w.buildings.get(c.home);
    if (!from || !dest) return;
    if (from.id === dest.id) { c.act = act; c.actText = text; c.until = g.time + Math.max(20, dur); return; }
    const path = this.pf.find(from.road, dest.road);
    if (!path) { c.act = act === 'home' ? 'home' : 'stuck'; c.actText = act === 'home' ? 'Дома' : 'Не может добраться: нет дороги'; c.until = g.time + 60; if (act !== 'home') this.log(c, 'Не смог(ла) добраться — нет дороги'); return; }
    const L = path.length;
    let mode = 'walk';
    if (L > 9) {
      if (c.car) mode = 'car';
      else if ((w.cov.transit?.[from.road] || 0) > 0.05 && (w.cov.transit?.[dest.road] || 0) > 0.05) mode = 'bus';
    }
    c.state = 'travel'; c.path = path; c.p = 0; c.dest = dest.id; c.mode = mode;
    c.act = act; c.actTextDest = text; c.dur = dur;
    const verb = mode === 'car' ? 'Едет' : mode === 'bus' ? 'Едет на автобусе' : 'Идёт';
    const where = act === 'home' ? 'домой' : act === 'work' ? 'на работу' : act === 'school' ? (c.age < 7 ? 'в детский сад' : 'в школу') : `в «${DEFS[dest.def].name}»`;
    c.actText = `${verb} ${where}`;
    c.trips++;
    if (act === 'work' || act === 'school' || act === 'leisure' || act === 'lunch') this.log(c, c.actText);
  }

  arrive(c) {
    const g = this.g, w = g.world;
    const b = w.buildings.get(c.dest);
    c.state = 'at'; c.path = null;
    if (!b) { c.at = c.home; c.until = g.time + 30; c.actText = 'Дома'; return; }
    c.at = b.id;
    c.actText = c.actTextDest;
    c.until = g.time + Math.max(15, c.dur || 60);
    b.visitors = (b.visitors || 0) + this.ratio;
    b.visitorsMonth = (b.visitorsMonth || 0) + this.ratio;
    if (c.act === 'leisure' || c.act === 'lunch') c.money = Math.max(0, c.money - 5 - Math.random() * 20);
  }

  // ---------- кадр ----------
  update(dtMin) {
    const g = this.g, w = g.world;
    const t = g.time;
    let budget = 60; // решений за кадр
    for (const c of this.list) {
      if (c.state === 'travel') {
        const i = c.path[Math.min(c.path.length - 1, Math.floor(c.p))];
        const congestion = c.mode === 'car' ? 1 / (1 + w.traffic[i] / 300) : 1;
        const rt = w.road[i] || 2;
        const sp = SPEED[c.mode] * (c.mode === 'walk' ? 1 : rt === 3 ? 1.25 : rt === 1 ? 0.6 : 1) * congestion;
        const before = Math.floor(c.p);
        c.p += sp * dtMin;
        if (c.mode === 'car' && Math.floor(c.p) !== before) w.traffic[i] += this.ratio;
        if (c.p >= c.path.length - 1) this.arrive(c);
      } else if (t >= c.until && budget > 0) {
        budget--;
        this.decide(c);
      }
    }
    for (const v of this.vehicles) {
      const i = v.path[Math.min(v.path.length - 1, Math.floor(v.p))];
      const before = Math.floor(v.p);
      v.p += (v.speed || SPEED.service) * dtMin / (1 + (v.emergency ? 0 : w.traffic[i] / 300));
      if (Math.floor(v.p) !== before) w.traffic[i] += 2;
      if (v.p >= v.path.length - 1) { v.done = true; v.onArrive?.(v); }
    }
    this.vehicles = this.vehicles.filter((v) => !v.done);
  }

  // ---------- служебный транспорт ----------
  spawnVehicle(fromTile, toTile, type, opts = {}) {
    if (this.vehicles.length > 140) return null;
    const path = this.pf.find(fromTile, toTile);
    if (!path || path.length < 2) return null;
    const v = { path, p: 0, type, color: opts.color ?? null, speed: opts.speed, emergency: !!opts.emergency, onArrive: opts.onArrive, label: opts.label };
    this.vehicles.push(v);
    return v;
  }
  roundTrip(fromB, toTile, type, opts = {}) {
    return this.spawnVehicle(fromB.road, toTile, type, { ...opts, onArrive: (v) => { opts.onArrive?.(v); this.spawnVehicle(toTile, fromB.road, type, { color: opts.color, speed: opts.speed, label: opts.label }); } });
  }

  hourly() {
    const g = this.g, w = g.world, P = this.places;
    const m = g.minuteOfDay();
    const randomRoad = (b, r) => {
      for (let k = 0; k < 10; k++) {
        const x = b.x + Math.round((Math.random() * 2 - 1) * r), y = b.y + Math.round((Math.random() * 2 - 1) * r);
        if (!w.inb(x, y)) continue;
        const i = w.idx(x, y);
        if (w.road[i] && w.roadComp[i] === b.comp) return i;
      }
      return -1;
    };
    // патрули милиции
    for (const b of P.police || []) if (Math.random() < 0.5) { const tgt = randomRoad(b, 12); if (tgt >= 0) this.roundTrip(b, tgt, 'police', { label: 'Патруль милиции' }); }
    // мусоровозы утром
    if (m >= 6 * 60 && m < 11 * 60) for (const b of P.garbage || []) if (Math.random() < 0.6) { const tgt = randomRoad(b, 18); if (tgt >= 0) this.roundTrip(b, tgt, 'garbage', { label: 'Мусоровоз' }); }
    // скорая
    for (const b of P.health || []) if (Math.random() < 0.2) { const tgt = randomRoad(b, 14); if (tgt >= 0) this.roundTrip(b, tgt, 'ambulance', { label: 'Скорая помощь', emergency: true }); }
    // автобусы между остановками
    const tr = P.transit || [];
    if (tr.length >= 2 && m >= 6 * 60 && m < 23 * 60) for (let k = 0; k < Math.min(6, tr.length); k++) {
      const a = pick(Math.random, tr), b = pick(Math.random, tr);
      if (a !== b && a.comp === b.comp) this.spawnVehicle(a.road, b.road, Math.random() < 0.4 ? 'ikarus' : 'bus', { speed: SPEED.bus, label: 'Автобус' });
    }
    // фуры с товарами с трассы
    if (g.stats.outside && (P.industry || []).length && m >= 5 * 60 && m < 21 * 60) {
      const edges = [];
      for (let i = 0; i < w.road.length; i++) if (w.isEdgeRoad(i)) edges.push(i);
      for (let k = 0; k < Math.min(4, 1 + P.industry.length / 6); k++) {
        const e = pick(Math.random, edges), b = pick(Math.random, P.industry);
        if (e !== undefined && b && w.roadComp[e] === b.comp) this.spawnVehicle(e, b.road, 'truck', { speed: SPEED.truck, color: pick(Math.random, [0xe06020, 0x3a6a3a, 0x3a5a8a, 0xd8d8d8]), label: 'Грузовик с товаром', onArrive: () => this.spawnVehicle(b.road, e, 'truck', { speed: SPEED.truck }) });
      }
    }
    // транзитные машины
    if (g.stats.outside && Math.random() < 0.8) {
      const edges = [];
      for (let i = 0; i < w.road.length; i++) if (w.isEdgeRoad(i)) edges.push(i);
      if (edges.length) {
        const blds = [...w.buildings.values()].filter((b) => b.road >= 0 && b.comp === w.roadComp[edges[0]]);
        if (blds.length) { const b = pick(Math.random, blds); this.spawnVehicle(pick(Math.random, edges), b.road, pick(Math.random, CAR_TYPES), { speed: SPEED.car, color: pick(Math.random, pal.car), label: 'Гости города' }); }
      }
    }
  }

  dispatchFire(target) {
    const st = this.nearest(this.places.fire || [], target, 1);
    if (!st) return false;
    this.spawnVehicle(st.road, target.road, 'fire', { emergency: true, speed: 1.1, label: 'Пожарная машина', onArrive: () => { target.fireFighters = (target.fireFighters || 0) + 1; this.spawnVehicle(target.road, st.road, 'fire', { label: 'Пожарная машина' }); } });
    return true;
  }

  // позиция агента/машины в мировых координатах тайлов
  posOf(a, kind) {
    const w = this.g.world, W = w.W;
    const path = a.path;
    const k = Math.min(path.length - 2, Math.floor(a.p));
    const f = Math.min(1, a.p - k);
    const i0 = path[Math.max(0, k)], i1 = path[Math.max(0, k) + 1] ?? i0;
    const x0 = i0 % W, y0 = (i0 / W) | 0, x1 = i1 % W, y1 = (i1 / W) | 0;
    const dx = x1 - x0, dy = y1 - y0;
    let x = x0 + 0.5 + dx * f, y = y0 + 0.5 + dy * f;
    // смещение на полосу/тротуар
    const off = kind === 'walk' ? 0.36 * (a.side || 1) : 0.15;
    x += -dy * off; y += dx * off;
    const dir = dx > 0 ? 0 : dy > 0 ? 1 : dx < 0 ? 2 : 3;
    return { x, y, dir, tile: (Math.floor(y)) * W + Math.floor(x) };
  }
}
