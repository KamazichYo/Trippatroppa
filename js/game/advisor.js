// Советник: раз в месяц подсказывает самую важную проблему города.
import { DEFS, RANKS } from '../data/buildings.js';

export function advise(g) {
  const w = g.world;
  const cnt = { power: 0, water: 0, heat: 0, gas: 0, sewage: 0, garbage: 0, road: 0, abandoned: 0, R: 0 };
  let producers = { power: 0, water: 0 };
  for (const b of w.buildings.values()) {
    const def = DEFS[b.def];
    if (b.built < 1) continue;
    if (def.prod?.power) producers.power++;
    if (def.prod?.water) producers.water++;
    if (def.kind === 'zone') {
      if (b.road < 0) cnt.road++;
      if (b.abandoned) cnt.abandoned++;
      if (def.zone === 'R') cnt.R++;
    }
    for (const k of ['power', 'water', 'heat', 'gas', 'sewage', 'garbage']) if (b.need[k] > 0 && !b.has[k]) cnt[k]++;
  }
  let freeR = 0;
  for (let i = 0; i < w.zone.length; i++) if (w.zone[i] === 1 && w.bld[i] < 0) freeR++;
  const s = g.supply || {};
  const short = (k) => s[k] && s[k].use > s[k].prod * 1.02 && s[k].use > 3;
  const tips = [];
  if (!g.stats.outside) tips.push(['outside', 'Город не связан с трассой! Соедините свои дороги с дорогой у края карты — иначе не будет новых жителей и торговли.']);
  if (w.buildings.size === 0) tips.push(['start', 'Начните с дороги от трассы, затем нарисуйте жилую и сельхоз зоны вдоль неё.']);
  if (cnt.R > 0 && producers.power === 0) tips.push(['nopower', 'В городе нет электростанции. Поставьте дизель-генератор или ветряк (вкладка ⚡).']);
  else if (cnt.power > 0) tips.push(['power', short('power') ? `Не хватает мощности электростанций: ${cnt.power} зданий без света. Постройте ещё станцию.` : `${cnt.power} зданий без электричества. Дороги не проводят ток — протяните ЛЭП к району (зоны и здания передают ток соседям).`]);
  if (cnt.R > 0 && producers.water === 0) tips.push(['nowater', 'Жителям нужна вода. Поставьте водонапорную башню или скважину (вкладка 💧) — им нужно электричество.']);
  else if (cnt.water > 0) tips.push(['water', short('water') ? `Воды не хватает (${cnt.water} зданий). Нужна ещё башня или насосная станция у реки.` : `${cnt.water} зданий без воды. Проложите трубы от водокачки к району.`]);
  if (cnt.heat > 0) tips.push(['heat', `Холодно! ${cnt.heat} домов без отопления. Многоэтажкам нужна котельная (она работает на газе) и трубы.`]);
  if (cnt.gas > 0) tips.push(['gas', `${cnt.gas} зданий без газа. Постройте газораспределительную станцию и соедините трубами.`]);
  if (cnt.sewage > 0) tips.push(['sewage', `${cnt.sewage} зданий без канализации — нужны очистные сооружения.`]);
  if (cnt.garbage > 0) tips.push(['garbage', `Мусор не вывозят в ${cnt.garbage} зданиях. Постройте свалку — мусоровозы ездят по дорогам.`]);
  if (cnt.road > 0) tips.push(['road', `${cnt.road} зданий без подъезда к дороге.`]);
  if ((g.stats.unemployment || 0) > 0.15) tips.push(['jobs', `Безработица ${Math.round(g.stats.unemployment * 100)}%. Нужны рабочие места: ${g.rank < 1 ? 'сельхоз зоны' : 'промышленные и коммерческие зоны'}.`]);
  if (g.demand.R > 0.4 && freeR < 4) tips.push(['zoneR', 'Высокий спрос на жильё — нарисуйте новые жилые зоны.']);
  if (g.demand.C > 0.4 && g.rank >= 1) tips.push(['zoneC', 'Жителям негде делать покупки — нужны коммерческие зоны.']);
  if (g.demand.I > 0.4 && g.rank >= 1) tips.push(['zoneI', 'Высокий спрос на промышленность.']);
  if (cnt.abandoned > 2) tips.push(['abandoned', `Заброшено зданий: ${cnt.abandoned}. Щёлкните по ним, чтобы узнать причины.`]);
  if (g.money < 2000 && !g.god.infiniteMoney) tips.push(['money', 'Казна почти пуста. Поднимите налоги, урежьте расходы или возьмите кредит (💰).']);
  if (g.rank < RANKS.length - 1 && !tips.length) tips.push(['grow', `До статуса «${RANKS[g.rank + 1].name}» нужно ${RANKS[g.rank + 1].pop.toLocaleString('ru')} жителей.`]);
  g.tips = tips;
  if (!tips.length) return;
  // по очереди, чтобы не повторяться
  g.tipIdx = ((g.tipIdx ?? -1) + 1) % tips.length;
  const [key, text] = tips[0][0] === 'outside' || tips[0][0] === 'nopower' ? tips[0] : tips[g.tipIdx];
  g.news.push({ t: g.time, text: 'Советник: ' + text, type: 'tip', key });
}
