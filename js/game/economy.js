// Ежемесячный бюджет: налоги, торговля, закупки, содержание, кредиты.
import { DEFS } from '../data/buildings.js';

const FUND_OF_CAT = { power: 'utilities', water: 'utilities', sewage: 'utilities', gas: 'utilities', heat: 'utilities', garbage: 'utilities', fire: 'fire', police: 'police', health: 'health', edu: 'edu', leisure: 'leisure', admin: 'admin', transport: 'transport' };
export const FUNDING_NAMES = { utilities: 'Коммунальные службы', fire: 'Пожарная охрана', police: 'Милиция', health: 'Здравоохранение', edu: 'Образование', leisure: 'Культура и отдых', admin: 'Администрация', transport: 'Транспорт' };
export const ROAD_UPKEEP = [0, 0.3, 1, 2.5];

export function monthlyBudget(g) {
  const w = g.world;
  const inc = { taxR: 0, taxC: 0, taxI: 0, taxA: 0, export: 0, other: 0 };
  const exp = { services: {}, roads: 0, networks: 0, gas: 0, import: 0, loans: 0 };
  let goods = 0, food = 0, pop = 0, eduSum = 0;
  for (const b of w.buildings.values()) {
    const def = DEFS[b.def];
    if (b.built < 1) continue;
    const i = w.idx(b.x, b.y);
    const lv = w.landValue[i];
    if (def.kind === 'zone') {
      if (b.abandoned) continue;
      if (def.zone === 'R') {
        const edu = Math.max(w.cov.school?.[i] || 0, (w.cov.college?.[i] || 0) * 1.2, (w.cov.univ?.[i] || 0) * 1.5);
        const income = 22 + lv * 0.35 + edu * 12;
        inc.taxR += b.occ * income * g.taxes.R / 100;
        pop += b.occ; eduSum += edu * b.occ;
      } else if (def.zone === 'C') {
        const cust = 0.7 + Math.min(0.6, (b.visitorsMonth || 0) / Math.max(4, def.cap));
        inc.taxC += b.occ * (30 + lv * 0.25) * cust * g.taxes.C / 100;
      } else if (def.zone === 'I') {
        inc.taxI += b.occ * 30 * g.taxes.I / 100;
        goods += b.occ * (def.goods || 1);
        food += b.occ * (def.food || 0);
      } else if (def.zone === 'A') {
        inc.taxA += b.occ * 22 * g.taxes.A / 100;
        food += b.occ * (def.food || 1) * 4;
      }
    } else {
      const cat = FUND_OF_CAT[def.cat] || 'admin';
      const f = g.funding[cat] ?? 1;
      b.funding = f;
      exp.services[cat] = (exp.services[cat] || 0) + def.upkeep * f;
    }
  }
  // торговля
  const outside = g.stats.outside;
  const trade = 1 + (g.trade || 0);
  const goodsNeed = pop * 0.45, foodNeed = pop * 0.9;
  g.stats.goods = goods; g.stats.food = food; g.stats.goodsNeed = goodsNeed; g.stats.foodNeed = foodNeed;
  const priceK = g.events?.default98 ? 1.8 : 1;
  if (outside) {
    if (goods > goodsNeed) inc.export += (goods - goodsNeed) * 1.6 * trade; else exp.import += (goodsNeed - goods) * 0.5 * priceK;
    if (food > foodNeed) inc.export += (food - foodNeed) * 0.9 * trade; else exp.import += (foodNeed - food) * 0.35 * priceK;
  }
  // дороги и сети
  let roads = 0, lines = 0, pipes = 0;
  for (let i = 0; i < w.road.length; i++) { roads += ROAD_UPKEEP[w.road[i]]; lines += w.power[i]; pipes += w.pipe[i]; }
  exp.roads = roads * (g.funding.transport ?? 1);
  exp.networks = lines * 0.15 + pipes * 0.25;
  exp.gas = (g.supply?.gas?.use || 0) * 0.35 * priceK;
  // кредиты
  for (const L of g.loans) { const pay = Math.min(L.left, L.monthly); exp.loans += pay; L.left -= pay; }
  g.loans = g.loans.filter((L) => L.left > 0.5);
  const totalInc = Object.values(inc).reduce((a, b) => a + b, 0);
  const totalServ = Object.values(exp.services).reduce((a, b) => a + b, 0);
  const totalExp = totalServ + exp.roads + exp.networks + exp.gas + exp.import + exp.loans;
  if (!g.god.infiniteMoney) g.money += totalInc - totalExp;
  g.budget = { inc, exp, totalInc, totalExp, net: totalInc - totalExp };
  g.stats.edu = pop > 0 ? eduSum / pop : 0;
  return g.budget;
}

export function takeLoan(g, amount) {
  const months = 24;
  const rate = g.events?.default98 ? 0.6 : 0.25; // годовые — 90-е!
  const total = amount * (1 + rate * months / 12);
  g.loans.push({ amount, left: total, monthly: total / months, rate });
  g.money += amount;
}
