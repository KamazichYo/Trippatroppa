// Инженерные сети: электричество (ЛЭП), трубы (вода, газ, тепло, канализация), вывоз мусора (по дорогам).
// Здания проводят ресурсы к соседним зданиям — как в SimCity.
import { DEFS, USE } from '../data/buildings.js';
import { DIRS } from './world.js';

export const HEAT_SEASON = [1, 1, 0.8, 0.5, 0.2, 0.08, 0.05, 0.08, 0.3, 0.6, 0.9, 1];

// Потребность здания в ресурсах при текущей заполненности
export function computeNeeds(b, month, rank = 9) {
  const def = DEFS[b.def];
  const need = { power: 0, water: 0, gas: 0, heat: 0, sewage: 0, garbage: 0 };
  if (b.built < 1 || b.abandoned) return need;
  const hs = HEAT_SEASON[month];
  need.season = hs;
  if (def.kind === 'zone') {
    const u = USE[def.zone + def.dens];
    const occ = Math.max(b.occ, def.cap * 0.25);
    for (const k in need) need[k] = (u[k] || 0) * occ;
    need.heat *= hs;
    // в деревне — газ в баллонах и печи, мусор сжигают сами
    if (def.dens === 1 && rank < 2) need.gas = 0;
    if (def.dens === 1 && rank < 1) need.garbage = 0;
  } else {
    const u = def.use || {};
    need.power = u.power || 0; need.water = u.water || 0; need.gas = u.gas || 0;
    need.heat = (u.heat || 0) * hs;
    need.sewage = (u.water || 0) >= 10 ? u.water * 0.8 : 0;
    need.garbage = (def.jobs || 0) >= 8 ? def.jobs * 0.3 : 0;
    if (def.needs) for (const k in def.needs) need[k] = (need[k] || 0) + def.needs[k];
  }
  return need;
}

export function updateNetworks(g) {
  const w = g.world, { W, H } = w;
  const n = W * H;
  const month = g.month();
  const blds = [...w.buildings.values()];
  for (const b of blds) {
    b.need = computeNeeds(b, month, g.rank);
    b.has = { power: false, water: false, gas: false, heat: false, sewage: false, garbage: false };
  }
  const free = g.god.freeUtilities;
  const supply = { power: { prod: 0, use: 0 }, water: { prod: 0, use: 0 }, gas: { prod: 0, use: 0 }, heat: { prod: 0, use: 0 }, sewage: { prod: 0, use: 0 }, garbage: { prod: 0, use: 0 } };
  const windF = g.wind ?? 1;

  // ---- поиск компонент сети ----
  function components(conductTile) {
    const comp = new Int32Array(n).fill(-1);
    const comps = [];
    const q = new Int32Array(n);
    for (let s = 0; s < n; s++) {
      if (comp[s] >= 0 || !conductTile(s)) continue;
      const c = comps.length;
      const list = []; const bset = new Set();
      let h = 0, t = 0; q[t++] = s; comp[s] = c;
      while (h < t) {
        const i = q[h++];
        list.push(i);
        const bid = w.bld[i];
        if (bid >= 0) bset.add(bid);
        const x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of DIRS) {
          const X = x + dx, Y = y + dy;
          if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          const j = Y * W + X;
          if (comp[j] < 0 && conductTile(j)) { comp[j] = c; q[t++] = j; }
        }
      }
      comps.push({ tiles: list, blds: [...bset].map((id) => w.buildings.get(id)).filter((b) => b && b.built >= 1) });
    }
    return { comp, comps };
  }
  const isBuilt = (i) => { const id = w.bld[i]; if (id < 0) return false; const b = w.buildings.get(id); return b && b.built >= 1 && !b.abandoned; };

  // ---- распределение одного ресурса в компоненте ----
  function distribute(blds, res, prodFn) {
    let prod = 0;
    for (const b of blds) prod += prodFn(b);
    const consumers = blds.filter((b) => (b.need[res] || 0) > 0);
    // сначала обслуживаются производители и соцобъекты, затем по id (старые дома раньше)
    consumers.sort((a, b) => (DEFS[a.def].kind === 'plop' ? 0 : 1) - (DEFS[b.def].kind === 'plop' ? 0 : 1) || a.id - b.id);
    let left = prod, used = 0;
    for (const b of consumers) {
      const nd = b.need[res];
      if (free || left >= nd) { b.has[res] = true; left -= nd; used += nd; }
      else { b.has[res] = false; }
    }
    // те, кому не нужен ресурс, считаются обеспеченными
    for (const b of blds) if (!(b.need[res] > 0)) b.has[res] = true;
    supply[res].prod += prod; supply[res].use += consumers.reduce((s, b) => s + b.need[res], 0);
    return used;
  }

  // ---- электричество ----
  const pw = components((i) => w.power[i] || w.zone[i] || isBuilt(i)); // зоны проводят — внутриквартальные сети
  w.powered.fill(0);
  const inPower = new Set();
  for (const c of pw.comps) {
    for (const b of c.blds) inPower.add(b.id);
    distribute(c.blds, 'power', (b) => {
      const d = DEFS[b.def];
      if (!d.prod || !d.prod.power) return 0;
      let p = d.prod.power * (b.funding ?? 1);
      if (d.wind) p *= windF;
      if (d.needs && d.needs.gas && b.lastGas === false) p *= 0.1; // ТЭЦ без газа
      return p;
    });
    const ok = c.blds.some((b) => b.has.power && DEFS[b.def].prod?.power);
    if (ok) for (const i of c.tiles) w.powered[i] = 1;
  }
  for (const b of blds) if (!inPower.has(b.id)) { b.has.power = !(b.need.power > 0) || free; }

  // ---- трубы: вода, газ, тепло, канализация ----
  const pp = components((i) => w.pipe[i] || w.zone[i] || isBuilt(i));
  w.piped.fill(0);
  const inPipe = new Set();
  for (const c of pp.comps) {
    for (const b of c.blds) inPipe.add(b.id);
    distribute(c.blds, 'water', (b) => { const d = DEFS[b.def]; return d.prod?.water && (b.has.power || free) ? d.prod.water * (b.funding ?? 1) : 0; });
    distribute(c.blds, 'gas', (b) => { const d = DEFS[b.def]; return d.prod?.gas ? d.prod.gas * (b.funding ?? 1) : 0; });
    distribute(c.blds, 'heat', (b) => { const d = DEFS[b.def]; return d.prod?.heat && (b.has.gas || free) && (b.has.power || d.prod.power || free) ? d.prod.heat * (b.funding ?? 1) : 0; });
    distribute(c.blds, 'sewage', (b) => { const d = DEFS[b.def]; return d.prod?.sewage && (b.has.power || free) ? d.prod.sewage * (b.funding ?? 1) : 0; });
    if (c.blds.some((b) => DEFS[b.def].prod?.water)) for (const i of c.tiles) w.piped[i] = 1;
  }
  for (const b of blds) if (!inPipe.has(b.id)) for (const r of ['water', 'gas', 'heat', 'sewage']) b.has[r] = !(b.need[r] > 0) || free;
  for (const b of blds) b.lastGas = b.has.gas;

  // ---- мусор: по дорожной сети ----
  const byComp = new Map();
  for (const b of blds) {
    if (b.built < 1) continue;
    const key = b.comp ?? -1;
    if (!byComp.has(key)) byComp.set(key, []);
    byComp.get(key).push(b);
  }
  for (const [key, list] of byComp) {
    if (key < 0) { for (const b of list) { b.has.garbage = !(b.need.garbage > 0) || free; if (b.need.garbage > 0) { supply.garbage.use += b.need.garbage; } } continue; }
    distribute(list, 'garbage', (b) => { const d = DEFS[b.def]; return d.prod?.garbage ? d.prod.garbage * (b.funding ?? 1) : 0; });
  }
  // производители не потребляют свой же ресурс
  g.supply = supply;
  w.netDirty = false;
}
