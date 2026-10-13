// Спрос (RCI+С), рост зон, заселение, счастье, заброшенность.
import { DEFS, ZONE_BUILDINGS, RANKS } from '../data/buildings.js';
import { ZONE_LETTER, T_WATER } from './world.js';
import { clamp } from '../engine/util.js';
import { HEAT_SEASON } from './network.js';

export function wealthOf(lv) { return lv < 38 ? 1 : lv < 62 ? 2 : 3; }

const BUILD_HOURS = { 1: 5, 2: 12, 3: 20 };

export function utilFactor(b, def) {
  let f = 1;
  const n = b.need, h = b.has;
  if (n.power > 0 && !h.power) f *= def.zone === 'A' ? 0.6 : def.zone === 'R' && def.dens === 1 ? 0.5 : 0.15;
  if (n.water > 0 && !h.water) f *= def.zone === 'R' && def.dens === 1 ? 0.75 : 0.5;
  if (n.heat > 0 && !h.heat) f *= (n.season ?? 1) >= 0.5 ? 0.7 : 0.95;
  if (n.gas > 0 && !h.gas) f *= 0.88;
  if (n.sewage > 0 && !h.sewage) f *= 0.9;
  if (n.garbage > 0 && !h.garbage) f *= 0.9;
  return f;
}

export function computeHappiness(g, b) {
  const w = g.world, def = DEFS[b.def];
  const i = w.idx(Math.min(w.W - 1, b.x + (b.s >> 1)), Math.min(w.H - 1, b.y + (b.s >> 1)));
  const c = w.cov;
  const reasons = [];
  let h = 0.5;
  const util = utilFactor(b, def);
  h -= (1 - util) * 0.7;
  if (b.need.power > 0 && !b.has.power) reasons.push('нет электричества');
  if (b.need.water > 0 && !b.has.water) reasons.push('нет воды');
  if (b.need.heat > 0 && !b.has.heat) reasons.push((b.need.season ?? 1) >= 0.5 ? 'холодно — нет отопления' : 'нет горячей воды (котельная)');
  if (b.need.gas > 0 && !b.has.gas) reasons.push('нет газа');
  if (b.need.sewage > 0 && !b.has.sewage) reasons.push('нет канализации');
  if (b.need.garbage > 0 && !b.has.garbage) reasons.push('не вывозят мусор');
  const pol = w.pollution[i] / 100, cr = w.crime[i] / 100, lv = w.landValue[i] / 100, nz = w.noise[i] / 100;
  if (def.zone === 'R' || def.kind === 'plop') {
    const svc = (c.police[i] + c.fire[i] + c.health[i] + Math.max(c.school[i], c.kinder[i] * 0.6)) / 4;
    h += svc * 0.22 + c.park[i] * 0.08 + c.culture[i] * 0.06 + (c.phone[i] || 0) * 0.04 + (c.transit[i] || 0) * 0.03 + (c.admin[i] || 0) * 0.04;
    h += lv * 0.12;
    h -= pol * 0.45 + cr * 0.3 + nz * 0.15;
    h -= (g.stats.unemployment || 0) * 0.4;
    h -= (g.taxes.R - 9) * 0.015;
    if (pol > 0.35) reasons.push('грязный воздух');
    if (cr > 0.35) reasons.push('высокая преступность');
    if (c.health[i] < 0.1) reasons.push('далеко до врача');
    if (Math.max(c.school[i], c.kinder[i]) < 0.1 && g.rank >= 1) reasons.push('нет школы рядом');
    if (c.police[i] < 0.1 && g.rank >= 1) reasons.push('нет милиции рядом');
    if ((g.stats.unemployment || 0) > 0.15) reasons.push('нет работы');
  } else if (def.zone === 'C') {
    h += lv * 0.2 + (c.phone[i] || 0) * (def.dens >= 2 ? 0.12 : 0.04) + (c.transit[i] || 0) * 0.06;
    h -= cr * 0.35 + pol * 0.15;
    h += clamp(g.demand.C, -0.5, 0.5) * 0.3;
    h -= (g.taxes.C - 9) * 0.015;
    if (def.dens >= 2 && (c.phone[i] || 0) < 0.1 && g.rank >= 2) reasons.push('нет телефонной связи');
    if ((b.visitorsMonth ?? 10) < 2 && b.age > 48) reasons.push('мало покупателей');
  } else if (def.zone === 'I') {
    h += 0.1 + clamp(g.demand.I, -0.5, 0.5) * 0.3;
    if (!b.outside) { h -= 0.15; reasons.push('нет дороги за город'); }
    h -= cr * 0.2;
    h -= (g.taxes.I - 9) * 0.015;
  } else if (def.zone === 'A') {
    h += 0.15 - pol * 0.4;
    h -= (g.taxes.A - 9) * 0.015;
  }
  if (b.road < 0) { h -= 0.3; reasons.push('нет подъезда к дороге'); }
  if (b.fire > 0) h -= 0.5;
  if (g.god.allHappy) h = 1;
  b.happy = clamp(h, 0, 1);
  b.reasons = reasons;
  return b.happy;
}

export function updateDemand(g) {
  const w = g.world;
  let pop = 0, jobs = { C: 0, I: 0, A: 0, S: 0 }, filled = 0, happySum = 0, happyN = 0, rCap = 0;
  for (const b of w.buildings.values()) {
    const def = DEFS[b.def];
    if (b.built < 1 || b.abandoned) continue;
    if (def.zone === 'R') { pop += b.occ; rCap += def.cap; happySum += b.happy * b.occ; happyN += b.occ; }
    else if (def.kind === 'zone') jobs[def.zone] += def.cap;
    else jobs.S += def.jobs || 0;
  }
  const totalJobs = jobs.C + jobs.I + jobs.A + jobs.S;
  const workforce = pop * 0.56;
  filled = Math.min(workforce, totalJobs);
  const st = g.stats;
  st.pop = Math.round(pop); st.workforce = workforce; st.jobs = totalJobs; st.jobsFilled = filled;
  st.unemployment = workforce > 10 ? Math.max(0, (workforce - filled) / workforce) : 0;
  st.jobFill = totalJobs > 0 ? Math.min(1, workforce / totalJobs) : 0;
  st.happiness = happyN > 0 ? happySum / happyN : 0.6;
  st.jobsBy = jobs; st.rCap = rCap;
  const outside = w.compOutside?.some(Boolean);
  st.outside = outside;
  const early = pop < 300 ? 0.45 * (1 - pop / 300) : 0;
  const attract = (st.happiness - 0.5) * 0.8;
  let R = clamp((totalJobs * 1.08 - workforce) / Math.max(30, workforce * 0.4), -1, 1) * 0.65 + attract + early;
  if (rCap > 0 && pop / rCap < 0.7) R -= (0.7 - pop / rCap) * 0.8; // пустующее жильё
  if (!outside) R = Math.min(R, 0.1 + early);
  const tourism = (g.trade || 0) * 40;
  const cTarget = pop * 0.16 + tourism;
  let C = g.rank >= 1 ? clamp((cTarget - jobs.C) / Math.max(12, cTarget * 0.45), -1, 1) : -1;
  const iTarget = pop * 0.24 * (outside ? 1 : 0.35) + (g.trade || 0) * 60;
  let I = g.rank >= 1 ? clamp((iTarget - jobs.I) / Math.max(15, iTarget * 0.45), -1, 1) : -1;
  const aTarget = 20 + workforce * (g.rank < 2 ? 0.75 : g.rank < 4 ? 0.3 : 0.12);
  let A = clamp((aTarget - jobs.A) / Math.max(10, aTarget * 0.5), -1, 1);
  R -= (g.taxes.R - 9) * 0.04; C -= (g.taxes.C - 9) * 0.04; I -= (g.taxes.I - 9) * 0.04; A -= (g.taxes.A - 9) * 0.04;
  if (g.events?.default98) { C -= 0.3; I -= 0.2; }
  const nd = { R: clamp(R, -1, 1), C: clamp(C, -1, 1), I: clamp(I, -1, 1), A: clamp(A, -1, 1) };
  for (const k in nd) g.demand[k] = g.god.maxDemand ? 1 : g.demand[k] * 0.75 + nd[k] * 0.25;
}

function candidates(g, zone, dens, wealth, size) {
  return ZONE_BUILDINGS.filter((d) => d.zone === zone && d.dens === dens && d.lvl <= wealth && d.size === size && (d.minRank ?? 0) <= g.rank);
}
function choose(list, wealth) {
  let tot = 0; const ws = list.map((d) => { const v = d.lvl === wealth ? 4 : 1; tot += v; return v; });
  let r = Math.random() * tot;
  for (let k = 0; k < list.length; k++) { r -= ws[k]; if (r <= 0) return list[k]; }
  return list[list.length - 1];
}

function areaFree(w, x, y, s, z, dens) {
  if (x < 0 || y < 0 || x + s > w.W || y + s > w.H) return false;
  let road = false;
  for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
    const i = w.idx(x + dx, y + dy);
    if (w.zone[i] !== z || w.dens[i] !== dens || w.bld[i] >= 0 || w.road[i] || w.terrain[i] === T_WATER) return false;
    if (w.roadDist[i] <= 1) road = true;
  }
  return road;
}

export function growthStep(g, frac) {
  const w = g.world, n = w.W * w.H;
  const count = Math.ceil(n * frac);
  for (let k = 0; k < count; k++) {
    const i = (Math.random() * n) | 0;
    const zc = w.zone[i];
    if (!zc || w.bld[i] >= 0 || w.road[i] || w.terrain[i] === T_WATER) continue;
    if (w.roadDist[i] > 2) continue;
    const zone = ZONE_LETTER[zc];
    const d = g.demand[zone];
    if (d <= 0.02) continue;
    const x = i % w.W, y = (i / w.W) | 0;
    const lv = w.landValue[i];
    let desir = zone === 'R' ? 0.5 + lv / 120 - w.pollution[i] / 140 - w.crime[i] / 250
      : zone === 'C' ? 0.45 + lv / 110 - w.crime[i] / 200
        : zone === 'I' ? 0.75 : 0.8;
    let powerNear = w.powered[i];
    if (!powerNear) for (let dy = -1; dy <= 1 && !powerNear; dy++) for (let dx = -1; dx <= 1; dx++) if (w.inb(x + dx, y + dy) && w.powered[w.idx(x + dx, y + dy)]) { powerNear = 1; break; }
    const dens = w.dens[i] || 1;
    if (!powerNear && !g.god.freeUtilities) desir *= (zone === 'A' || (zone === 'R' && dens === 1)) ? 0.6 : 0.08;
    if (Math.random() > d * desir * 0.7) continue;
    const wealth = wealthOf(lv);
    // попытка поставить 2x2
    let placed = false;
    const big = candidates(g, zone, dens, wealth, 2);
    if (big.length && Math.random() < (dens === 3 ? 0.35 : 0.25)) {
      for (const [ox, oy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
        if (areaFree(w, x + ox, y + oy, 2, zc, dens)) { place(g, choose(big, wealth), x + ox, y + oy); placed = true; break; }
      }
    }
    if (!placed) {
      const small = candidates(g, zone, dens, wealth, 1);
      if (small.length) place(g, choose(small, wealth), x, y);
    }
  }
}

function place(g, def, x, y) {
  const b = g.world.addBuilding(def.id, x, y, { built: g.god.instantBuild ? 1 : 0 });
  b.buildRate = 1 / (BUILD_HOURS[def.dens] * (def.size > 1 ? 1.6 : 1));
  g.world.updateAccess(b);
  return b;
}

// почасовое обновление зданий
export function buildingStep(g) {
  const w = g.world;
  const st = g.stats;
  const month = g.month();
  const toUpgrade = [];
  for (const b of w.buildings.values()) {
    const def = DEFS[b.def];
    if (b.built < 1) {
      b.built = Math.min(1, b.built + (b.buildRate || 0.08) * (g.god.instantBuild ? 100 : 1));
      if (b.built >= 1) w.netDirty = true;
      continue;
    }
    b.age++;
    if (b.fire > 0) continue;
    computeHappiness(g, b);
    if (def.kind !== 'zone') { b.occ = def.jobs ? def.jobs * Math.min(1, st.jobFill + 0.2) : 0; continue; }
    // зона снята — здание сносится
    const i0 = w.idx(b.x, b.y);
    if (!w.zone[i0]) { w.removeBuilding(b.id); continue; }
    const util = utilFactor(b, def);
    if (b.abandoned) {
      if (b.happy > 0.45 && util > 0.8 && g.demand[def.zone] > 0.1) { b.bad -= 3; if (b.bad <= 0) { b.abandoned = false; b.bad = 0; } }
      continue;
    }
    let target;
    if (def.zone === 'R') {
      target = def.cap * util * clamp(0.35 + b.happy, 0.2, 1);
      if (g.demand.R < -0.4) target *= 0.85;
    } else {
      target = def.cap * util * clamp(st.jobFill * 1.05, 0.05, 1) * clamp(0.5 + b.happy, 0.3, 1);
    }
    if (g.god.fillAll) target = def.cap;
    const rate = def.cap * (def.zone === 'R' ? 0.03 + Math.max(0, g.demand.R) * 0.06 : 0.06);
    if (b.occ < target) b.occ = Math.min(target, b.occ + Math.max(0.2, rate));
    else b.occ = Math.max(target, b.occ - Math.max(0.2, def.cap * 0.02));
    // заброшенность
    if (b.happy < 0.18 || util < 0.3) b.bad++; else b.bad = Math.max(0, b.bad - 2);
    if (b.bad > 24 * 4 && !g.god.allHappy) { b.abandoned = true; b.occ = 0; w.netDirty = true; g.news.push({ t: g.time, text: `${def.name} на ${b.x},${b.y} заброшен(а): ${b.reasons?.[0] ?? 'жильцы недовольны'}`, type: 'bad', x: b.x, y: b.y }); }
    // уплотнение / улучшение
    const tileDens = w.dens[i0];
    if (b.occ >= def.cap * 0.85 && b.happy > 0.55 && g.demand[def.zone] > 0.15 && def.size === 1) {
      const wealth = wealthOf(w.landValue[i0]);
      if (tileDens > def.dens || wealth > def.lvl) toUpgrade.push(b);
    } else if (tileDens > def.dens && g.demand[def.zone] > 0.3 && Math.random() < 0.02) toUpgrade.push(b);
  }
  // не более нескольких улучшений за час
  for (const b of toUpgrade) {
    if (Math.random() > 0.08 && !g.god.instantBuild) continue;
    const def = DEFS[b.def];
    const i0 = w.idx(b.x, b.y);
    const dens = w.dens[i0], wealth = wealthOf(w.landValue[i0]);
    const list = candidates(g, def.zone, dens, wealth, 1).filter((d) => d.dens > def.dens || d.lvl > def.lvl || d.cap > def.cap);
    if (!list.length) continue;
    const nd = choose(list, wealth);
    const occ = b.occ;
    w.removeBuilding(b.id, true);
    const nb = place(g, nd, b.x, b.y);
    nb.occ = Math.min(occ, nd.cap);
    nb.built = 0.25;
  }
}

export function checkRank(g) {
  let r = 0;
  for (let k = 0; k < RANKS.length; k++) if (g.stats.pop >= RANKS[k].pop) r = k;
  if (g.god.unlockAll) r = Math.max(r, RANKS.length - 1);
  if (r > g.rank) {
    for (let k = g.rank + 1; k <= r; k++) {
      if (!g.god.unlockAll || g.stats.pop >= RANKS[k].pop) {
        g.money += RANKS[k].gift;
        g.news.push({ t: g.time, text: `Поздравляем! Ваш населённый пункт получил статус «${RANKS[k].name}». Субсидия из области: ${RANKS[k].gift.toLocaleString('ru')} ₽`, type: 'good', big: true });
      }
    }
    g.rank = r;
    g.onRankUp?.(r);
  }
}
