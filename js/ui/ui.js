// Интерфейс: верхняя панель, инструменты, инспектор, панели, меню бога, мини-карта.
import { DEFS, RANKS, ZONE_TOOLS, ZONES, PLOP_BUILDINGS, CATEGORIES, DENS, RES, SERVICE_NAMES, USE } from '../data/buildings.js';
import { buildingSprite } from '../gfx/allBuildings.js';
import { personSprite } from '../gfx/people.js';
import { fmtMoney, fmtNum, css, clamp, cmix } from '../engine/util.js';
import { MONTHS, SPEEDS, ROAD_BUILD_COST, ROAD_RANK, LINE_COST, PIPE_COST } from '../game/game.js';
import { FUNDING_NAMES, takeLoan } from '../game/economy.js';
import { earthquake, startTornado, meteor } from '../game/disasters.js';
import { wealthOf } from '../game/growth.js';
import { STREETS } from '../data/names.js';
import { T_WATER, ZONE_LETTER } from '../game/world.js';
import { ROAD_NAMES } from '../gfx/terrain.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (v) => Math.round(v * 100) + '%';

const LAYERS = [
  ['', 'Без слоя'], ['power', '⚡ Электричество'], ['water', '💧 Вода'], ['gas', '🔥 Газ'], ['heat', '♨ Отопление'], ['sewage', '🚽 Канализация'], ['garbage', '🗑 Мусор'],
  ['pollution', '🏭 Загрязнение'], ['landValue', '💎 Стоимость земли'], ['crime', '🔪 Преступность'], ['traffic', '🚗 Трафик'], ['noise', '🔊 Шум'], ['happiness', '🙂 Счастье'],
  ['fire', '🚒 Пожарные'], ['police', '🚓 Милиция'], ['health', '🏥 Медицина'], ['school', '🎓 Школы'], ['kinder', '🧸 Детсады'], ['park', '🌳 Парки'], ['culture', '🎭 Культура'], ['phone', '☎ Телефон'], ['transit', '🚌 Транспорт'],
];

export class UI {
  constructor(game, renderer) {
    this.g = game; this.r = renderer;
    this.input = null;
    this.curCat = null;
    this.info = null; // {type:'b'|'c'|'t', ...}
    this.panel = null;
    this.followId = null;
    this.autoOverlay = true; this.userOverlay = null;
    this.thumbs = new Map();
    this.lastNews = 0;
    this.audio = null;
    this.sound = true;
    this.bindTop();
    this.buildToolbar();
    $('#panelClose').onclick = () => this.closePanel();
    $('#minimap').addEventListener('pointerdown', (e) => this.minimapClick(e));
    $('#minimap').addEventListener('pointermove', (e) => { if (e.buttons) this.minimapClick(e); });
    setInterval(() => this.refresh(), 300);
    setInterval(() => this.drawMinimap(), 1500);
  }
  setGame(g) { this.g = g; this.closeInfo(); this.closePanel(); this.refresh(true); this.drawMinimap(); }

  // ---------- верхняя панель ----------
  bindTop() {
    document.querySelectorAll('[data-speed]').forEach((b) => b.onclick = () => this.setSpeed(+b.dataset.speed));
    document.querySelectorAll('[data-panel]').forEach((b) => b.onclick = () => this.openPanel(b.dataset.panel));
    $('#cityName').onclick = () => { const n = prompt('Название города:', this.g.cityName); if (n) { this.g.cityName = n.slice(0, 40); this.refresh(true); } };
  }
  setSpeed(s) { this.g.speed = s; this.prevSpeed = s || this.prevSpeed; this.refresh(true); }
  togglePause() { if (this.g.speed) { this.prevSpeed = this.g.speed; this.g.speed = 0; } else this.g.speed = this.prevSpeed || 1; this.refresh(true); }

  refresh(force) {
    const g = this.g, st = g.stats;
    $('#cityName').textContent = g.cityName;
    $('#rankName').textContent = RANKS[g.rank].name + (g.rank < RANKS.length - 1 ? ` → ${fmtNum(RANKS[g.rank + 1].pop)}` : '');
    $('#money').textContent = g.god.infiniteMoney ? '∞' : fmtMoney(g.money);
    $('#money').style.color = g.money < 0 ? 'var(--bad)' : '';
    const net = g.budget?.net;
    const md = $('#moneyDelta');
    if (net != null) { md.textContent = (net >= 0 ? '+' : '') + fmtNum(net); md.className = 'delta ' + (net >= 0 ? 'pos' : 'neg'); }
    $('#pop').textContent = fmtNum(st.pop || 0);
    $('#happy').textContent = pct(st.happiness ?? 0.6);
    $('#moodIco').textContent = st.happiness > 0.7 ? '😀' : st.happiness > 0.5 ? '🙂' : st.happiness > 0.35 ? '😐' : '😠';
    $('#unemp').textContent = pct(st.unemployment || 0);
    $('#date').textContent = g.dateStr();
    document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('on', +b.dataset.speed === g.speed));
    for (const el of document.querySelectorAll('.dbar')) {
      const v = g.demand[el.dataset.z] || 0;
      const f = el.querySelector('.fill');
      const h = Math.abs(v) * 50;
      f.style.height = h + '%';
      f.style.top = v >= 0 ? (50 - h) + '%' : '50%';
      f.style.background = css(ZONES[el.dataset.z].color);
      f.style.opacity = v >= 0 ? 1 : 0.45;
    }
    // новости
    if (g.news.length !== this.lastNews) {
      const fresh = g.news.slice(this.lastNews);
      this.lastNews = g.news.length;
      this.seenTips = this.seenTips || new Set();
      for (const n of fresh) {
        if (n.big || n.type === 'bad') this.toast(n.text, n.type === 'bad');
        else if (n.type === 'tip' && !this.seenTips.has(n.key)) { this.seenTips.add(n.key); this.toast(n.text); }
      }
      const last = g.news.slice(-6).map((n) => n.text).join('   •   ');
      $('#tickerText').textContent = last;
    }
    if (this.info) this.renderInfo();
    if (this.panel && (force || this.panelLive)) this.renderPanel();
    // слежение
    if (this.followId) {
      const c = g.citizens.byId.get(this.followId);
      if (!c) this.follow(null);
      else {
        let x, y;
        if (c.state === 'travel' && c.path) { const p = g.citizens.posOf(c, 'walk'); x = p.x; y = p.y; }
        else { const b = g.world.buildings.get(c.at); if (b) { x = b.x + b.s / 2; y = b.y + b.s / 2; } }
        if (x != null) { const tx = (x - y) * 32, ty = (x + y) * 16; this.r.cam.x += (tx - this.r.cam.x) * 0.5; this.r.cam.y += (ty - this.r.cam.y) * 0.5; }
      }
    }
  }
  follow(id) { this.followId = id; this.r.follow = id; }

  // ---------- инструменты ----------
  buildToolbar() {
    const cats = [
      { id: 'inspect', icon: '🔍', name: 'Осмотр', tool: { type: 'inspect' } },
      { id: 'roads', icon: '🛣', name: 'Дороги' },
      { id: 'zones', icon: '🏘', name: 'Зоны' },
      { id: 'power', icon: '⚡', name: 'Энергия' },
      { id: 'water', icon: '💧', name: 'Вода' },
      { id: 'gasheat', icon: '🔥', name: 'Газ, тепло' },
      { id: 'garbage', icon: '🗑', name: 'Мусор' },
      { id: 'safety', icon: '🚒', name: 'Службы' },
      { id: 'edu', icon: '🎓', name: 'Учёба' },
      { id: 'leisure', icon: '🌳', name: 'Отдых' },
      { id: 'city', icon: '🏛', name: 'Город' },
      { id: 'bulldoze', icon: '🚜', name: 'Снос', tool: { type: 'rect', id: 'bulldoze', name: 'Бульдозер' } },
    ];
    const nav = $('#tools');
    nav.innerHTML = '';
    for (const c of cats) {
      const b = document.createElement('button');
      b.innerHTML = `${c.icon}<small>${c.name}</small>`;
      b.title = c.name;
      b.dataset.cat = c.id;
      b.onclick = (e) => { e.stopPropagation(); if (c.tool) { this.closeTray(); this.selectTool(c.tool); this.markCat(c.id); } else this.openTray(c.id); };
      nav.appendChild(b);
    }
    this.markCat('inspect');
  }
  markCat(id) { document.querySelectorAll('#tools button').forEach((b) => b.classList.toggle('on', b.dataset.cat === id)); this.curCat = id; }

  trayItems(cat) {
    const g = this.g;
    const plops = (cats) => PLOP_BUILDINGS.filter((d) => cats.includes(d.cat)).map((d) => ({ def: d, tool: { type: 'build', id: d.id, name: d.name } }));
    switch (cat) {
      case 'roads': return [
        ...[1, 2, 3].map((t) => ({ icon: ['', '🟫', '⬛', '🛣'][t], name: ROAD_NAMES[t], sub: `${fmtMoney(ROAD_BUILD_COST[t])}/клетка${t > 1 ? ', мост ×6' : ''}`, rank: ROAD_RANK[t], tool: { type: 'line', road: t, name: ROAD_NAMES[t] } })),
        { icon: '🚜', name: 'Бульдозер', sub: 'Снос всего', tool: { type: 'rect', id: 'bulldoze', name: 'Бульдозер' } },
      ];
      case 'zones': return [
        ...ZONE_TOOLS.map((z) => ({ zone: z, name: `${ZONES[z.zone].name} — ${DENS[z.dens]}`, sub: `${fmtMoney(z.cost)}/клетка`, rank: z.rank, tool: { type: 'rect', zone: z.zone, dens: z.dens, name: `${ZONES[z.zone].name} зона` } })),
        { icon: '❎', name: 'Снять зонирование', sub: 'Бесплатно', tool: { type: 'rect', id: 'dezone', name: 'Снять зону' } },
      ];
      case 'power': return [{ icon: '🔌', name: 'ЛЭП', sub: `${fmtMoney(LINE_COST)}/клетка. Здания проводят ток соседям`, tool: { type: 'line', net: 'power', name: 'ЛЭП', overlay: 'power' } }, ...plops(['power']).map((x) => ({ ...x, tool: { ...x.tool, overlay: 'power' } }))];
      case 'water': return [{ icon: '🔧', name: 'Трубы (водопровод, газ, тепло, канализация)', sub: `${fmtMoney(PIPE_COST)}/клетка. Подземный вид`, tool: { type: 'line', net: 'pipe', name: 'Трубы', overlay: 'water' } }, ...plops(['water', 'sewage']).map((x) => ({ ...x, tool: { ...x.tool, overlay: 'water' } }))];
      case 'gasheat': return [{ icon: '🔧', name: 'Трубы', sub: `${fmtMoney(PIPE_COST)}/клетка`, tool: { type: 'line', net: 'pipe', name: 'Трубы', overlay: 'gas' } }, ...plops(['gas', 'heat']).map((x) => ({ ...x, tool: { ...x.tool, overlay: x.def.cat } }))];
      case 'garbage': return plops(['garbage']).map((x) => ({ ...x, tool: { ...x.tool, overlay: 'garbage' } }));
      case 'safety': return plops(['fire', 'police', 'health']).map((x) => ({ ...x, tool: { ...x.tool, overlay: x.def.service.type } }));
      case 'edu': return plops(['edu']).map((x) => ({ ...x, tool: { ...x.tool, overlay: x.def.service.type } }));
      case 'leisure': return [{ icon: '🌲', name: 'Посадить деревья', sub: '4 ₽/клетка. Снижают загрязнение', tool: { type: 'rect', id: 'trees', name: 'Деревья' } }, ...plops(['leisure']).map((x) => ({ ...x, tool: { ...x.tool, overlay: x.def.service?.type ?? null } }))];
      case 'city': return plops(['admin', 'transport']).map((x) => ({ ...x, tool: { ...x.tool, overlay: x.def.service?.type ?? null } }));
    }
    return [];
  }

  thumb(defId) {
    if (this.thumbs.has(defId)) return this.thumbs.get(defId);
    const e = buildingSprite(defId, 0, 'day');
    const c = document.createElement('canvas'); c.width = 56; c.height = 48;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const k = Math.min(54 / e.day.width, 46 / e.day.height);
    const k2 = k >= 1 ? Math.floor(k) : k;
    const w = e.day.width * k2, h = e.day.height * k2;
    x.drawImage(e.day, (56 - w) / 2, (48 - h) / 2, w, h);
    this.thumbs.set(defId, c);
    return c;
  }

  openTray(cat) {
    const tray = $('#tray');
    if (!tray.classList.contains('hidden') && this.trayCat === cat) { this.closeTray(); return; }
    this.trayCat = cat;
    tray.innerHTML = `<h3>${$(`[data-cat=${cat}]`).title}</h3>`;
    const g = this.g;
    for (const it of this.trayItems(cat)) {
      const d = it.def;
      const rank = d ? d.rank : it.rank ?? 0;
      const locked = rank > g.rank && !g.god.unlockAll;
      const el = document.createElement('div');
      el.className = 'titem' + (locked ? ' locked' : '');
      let pic;
      if (d) pic = this.thumb(d.id);
      else {
        pic = document.createElement('div'); pic.className = 'tico';
        if (it.zone) { pic.style.background = css(ZONES[it.zone.zone].color); pic.style.color = '#fff'; pic.textContent = ZONES[it.zone.zone].short + '·'.repeat(it.zone.dens); }
        else pic.textContent = it.icon;
      }
      el.appendChild(pic);
      const txt = document.createElement('div');
      let sub = it.sub || '';
      if (d) {
        const parts = [];
        if (d.prod) for (const k in d.prod) parts.push(`+${d.prod[k]} ${RES[k].unit} ${RES[k].name.toLowerCase()}`);
        if (d.service) parts.push(`радиус ${d.service.r}`);
        if (d.needsShore) parts.push('у воды');
        sub = `${parts.join(', ')}${parts.length ? '. ' : ''}${d.desc || ''} Содержание ${fmtMoney(d.upkeep)}/мес.`;
      }
      txt.innerHTML = `<div class="tname">${esc(d ? d.name : it.name)} ${d ? `<span class="tcost">${fmtMoney(d.cost)}</span>` : ''}</div><div class="tsub">${locked ? `🔒 Статус «${RANKS[rank].name}» (${fmtNum(RANKS[rank].pop)} жит.)` : esc(sub)}</div>`;
      el.appendChild(txt);
      el.onclick = (e) => { e.stopPropagation(); if (locked) { this.toast(`Откроется при статусе «${RANKS[rank].name}»`, true); return; } this.selectTool(it.tool); this.markCat(cat); this.closeTray(); };
      tray.appendChild(el);
    }
    tray.classList.remove('hidden');
    tray.onpointerdown = (e) => e.stopPropagation();
  }
  closeTray() { $('#tray').classList.add('hidden'); }
  selectTool(t) {
    if (t.type === 'inspect') { this.markCat('inspect'); }
    this.input.setTool(t);
    if (t.overlay === undefined) this.r.overlay = this.userOverlay;
  }

  // ---------- подсказки ----------
  tooltip(html, x, y) {
    const tt = $('#tooltip');
    if (!html) { tt.classList.add('hidden'); return; }
    tt.innerHTML = html; tt.classList.remove('hidden');
    tt.style.left = (x + 16) + 'px'; tt.style.top = (y + 16) + 'px';
  }
  tooltipAt(html) {
    const tt = $('#tooltip');
    tt.innerHTML = html; tt.classList.remove('hidden');
    const p = this.input.lastClient || { x: 0, y: 0 };
    tt.style.left = (p.x + 18) + 'px'; tt.style.top = (p.y + 18) + 'px';
  }
  toast(text, bad = false) {
    const el = document.createElement('div');
    el.className = 'toast-item' + (bad ? ' bad' : '');
    el.textContent = text;
    $('#toast').appendChild(el);
    setTimeout(() => el.remove(), 4500);
    while ($('#toast').children.length > 4) $('#toast').firstChild.remove();
  }
  sfx(kind) {
    if (!this.sound) return;
    try {
      this.audio = this.audio || new (window.AudioContext || window.webkitAudioContext)();
      const a = this.audio, o = a.createOscillator(), gn = a.createGain();
      o.type = 'square';
      const f = { place: [440, 660], build: [330, 880], bulldoze: [120, 60] }[kind] || [440, 440];
      o.frequency.setValueAtTime(f[0], a.currentTime); o.frequency.exponentialRampToValueAtTime(f[1], a.currentTime + 0.12);
      gn.gain.setValueAtTime(0.04, a.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.18);
      o.connect(gn).connect(a.destination); o.start(); o.stop(a.currentTime + 0.2);
    } catch (e) { /* без звука */ }
  }

  // ---------- инспектор ----------
  address(b) {
    const w = this.g.world;
    if (b.road < 0) return 'без адреса';
    const rx = b.road % w.W, ry = (b.road / w.W) | 0;
    const horiz = (w.inb(rx + 1, ry) && w.road[w.idx(rx + 1, ry)]) || (w.inb(rx - 1, ry) && w.road[w.idx(rx - 1, ry)]);
    const street = STREETS[(horiz ? ry * 7 : rx * 13 + 3) % STREETS.length];
    return `${street}, д. ${1 + ((horiz ? rx : ry) % 97)}`;
  }
  inspectTile(x, y) {
    const g = this.g, w = g.world;
    // житель рядом с точкой?
    const cit = g.citizens;
    let best = null, bd = 0.7;
    for (const c of cit.list) {
      if (c.state !== 'travel' || !c.path) continue;
      const p = cit.posOf(c, c.mode === 'walk' ? 'walk' : 'car');
      const d = Math.hypot(p.x - (x + 0.5), p.y - (y + 0.5));
      if (d < bd) { bd = d; best = c; }
    }
    if (best) { this.info = { type: 'c', id: best.id }; this.r.selected = null; this.renderInfo(); return; }
    if (!w.inb(x, y)) { this.closeInfo(); return; }
    const b = w.buildingAt(x, y);
    if (b) { this.info = { type: 'b', id: b.id }; this.r.selected = { b }; }
    else { this.info = { type: 't', x, y }; this.r.selected = null; }
    this.renderInfo();
  }
  closeInfo() { this.info = null; this.r.selected = null; $('#info').classList.add('hidden'); $('#info')._html = null; }

  renderInfo() {
    const el = $('#info'), g = this.g, w = g.world;
    const inf = this.info;
    let html = '<button class="close-x" id="infoClose">✕</button>';
    if (inf.type === 'b') {
      const b = w.buildings.get(inf.id);
      if (!b) { this.closeInfo(); return; }
      this.r.selected = { b };
      html += this.buildingHtml(b);
    } else if (inf.type === 'c') {
      const c = g.citizens.byId.get(inf.id);
      if (!c) { this.closeInfo(); return; }
      html += this.citizenHtml(c);
    } else html += this.tileHtml(inf.x, inf.y);
    if (el._html === html && !el.classList.contains('hidden')) return; // без изменений — не трогаем DOM, чтобы не терять клики
    el._html = html;
    el.innerHTML = html;
    el.classList.remove('hidden');
    $('#infoClose').onclick = () => this.closeInfo();
    el.querySelectorAll('[data-act]').forEach((bt) => bt.onclick = () => this.infoAction(bt.dataset.act, bt.dataset.v));
    const pc = el.querySelector('canvas.portrait');
    if (pc && inf.type === 'c') {
      const c = g.citizens.byId.get(inf.id);
      const s = personSprite(c.look, 0, 0, g.isWinter());
      const x = pc.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, pc.width, pc.height);
      x.drawImage(s.day, 6, 2, s.day.width * 6, s.day.height * 6);
    }
  }

  resRow(b, k) {
    const n = b.need[k] || 0;
    if (n <= 0) return '';
    const ok = b.has[k];
    return `<div class="row"><span class="k">${RES[k].icon} ${RES[k].name}</span><span class="${ok ? 'ok' : 'no'}">${ok ? '✔' : '✘'} ${n.toFixed(1)} ${RES[k].unit}</span></div>`;
  }
  buildingHtml(b) {
    const g = this.g, w = g.world, def = DEFS[b.def];
    const i = w.idx(b.x, b.y);
    let h = `<h2>${esc(def.name)}</h2><div class="sub">${esc(this.address(b))}${def.kind === 'zone' ? ` · ${ZONES[def.zone].name.toLowerCase()} зона, ${DENS[def.dens]} плотность` : ''}</div>`;
    if (b.built < 1) h += `<div class="row"><span class="k">🏗 Строительство</span><span>${pct(b.built)}</span></div><div class="meter"><div style="width:${b.built * 100}%;background:var(--accent)"></div></div>`;
    if (b.abandoned) h += `<div class="no">🏚 Заброшено. Улучшите условия, чтобы люди вернулись.</div>`;
    if (b.fire) h += `<div class="no">🔥 ГОРИТ! ${b.fireFighters ? 'Пожарные на месте.' : b.noFireDept ? 'Пожарной части нет!' : 'Пожарные выехали.'}</div>`;
    if (def.kind === 'zone') {
      const lbl = def.zone === 'R' ? 'Жильцы' : 'Работники';
      h += `<div class="row"><span class="k">${def.zone === 'R' ? '👥' : '👷'} ${lbl}</span><span>${Math.round(b.occ)} / ${def.cap}</span></div>`;
      h += `<div class="row"><span class="k">🙂 Довольство</span><span class="${b.happy > 0.55 ? 'ok' : b.happy > 0.3 ? 'wr' : 'no'}">${pct(b.happy)}</span></div><div class="meter"><div style="width:${b.happy * 100}%;background:${b.happy > 0.55 ? 'var(--good)' : b.happy > 0.3 ? 'var(--warn)' : 'var(--bad)'}"></div></div>`;
      if (def.zone !== 'R') h += `<div class="row"><span class="k">🛒 Посетители за месяц</span><span>${Math.round(b.visitorsMonth || 0)}</span></div>`;
      if (def.goods) h += `<div class="row"><span class="k">📦 Производит товары</span><span>${(b.occ * def.goods).toFixed(0)}/мес</span></div>`;
      if (def.food) h += `<div class="row"><span class="k">🥖 Производит еду</span><span>${(b.occ * def.food * (def.zone === 'A' ? 4 : 1)).toFixed(0)}/мес</span></div>`;
      if (def.poll) h += `<div class="row"><span class="k">🏭 Выбросы</span><span class="wr">${def.poll}</span></div>`;
      h += `<div class="row"><span class="k">💎 Стоимость земли</span><span>${Math.round(w.landValue[i])} (уровень ${wealthOf(w.landValue[i])}/3)</span></div>`;
    } else {
      if (def.prod) for (const k in def.prod) {
        const s = g.supply?.[k];
        h += `<div class="row"><span class="k">Производит: ${RES[k].icon} ${RES[k].name}</span><span class="ok">${Math.round(def.prod[k] * (def.wind ? g.wind : 1))} ${RES[k].unit}</span></div>`;
      }
      if (def.service) h += `<div class="row"><span class="k">Служба</span><span>${SERVICE_NAMES[def.service.type]}, радиус ${def.service.r}</span></div>`;
      if (def.jobs) h += `<div class="row"><span class="k">👷 Работники</span><span>${Math.round(b.occ)} / ${def.jobs}</span></div>`;
      h += `<div class="row"><span class="k">💸 Содержание</span><span>${fmtMoney(def.upkeep * (b.funding ?? 1))}/мес</span></div>`;
      if (def.desc) h += `<div class="sub" style="margin-top:6px">${esc(def.desc)}</div>`;
    }
    const rr = ['power', 'water', 'gas', 'heat', 'sewage', 'garbage'].map((k) => this.resRow(b, k)).join('');
    if (rr) h += `<div class="sec">Ресурсы (потребление)</div>${rr}`;
    if (b.reasons?.length) h += `<div class="sec">Жалобы</div>${b.reasons.map((r) => `<div class="wr">• ${esc(r)}</div>`).join('')}`;
    // жители дома
    if (def.zone === 'R' && b.built >= 1) {
      const res = g.citizens.list.filter((c) => c.home === b.id).slice(0, 6);
      if (res.length) h += `<div class="sec">Жильцы (выборочно)</div>${res.map((c) => `<div class="row click" data-act="cit" data-v="${c.id}" style="cursor:pointer"><span>${esc(c.first)} ${esc(c.sur)}, ${c.age}</span><span class="k" style="font-size:11px">${esc(c.job)}</span></div>`).join('')}`;
    } else if (def.kind !== 'zone' || def.zone !== 'R') {
      const wk = g.citizens.list.filter((c) => c.work === b.id).slice(0, 4);
      if (wk.length) h += `<div class="sec">Работники (выборочно)</div>${wk.map((c) => `<div class="row" data-act="cit" data-v="${c.id}" style="cursor:pointer"><span>${esc(c.first)} ${esc(c.sur)}</span><span class="k" style="font-size:11px">${esc(c.job)}</span></div>`).join('')}`;
    }
    h += `<div class="btns"><button data-act="demolish">🚜 Снести</button>${g.god.instantBuild || true ? '<button data-act="god-fire">🔥 Поджечь</button>' : ''}${def.kind === 'zone' ? '<button data-act="god-up">⬆ Улучшить</button>' : ''}</div>`;
    return h;
  }
  citizenHtml(c) {
    const g = this.g, w = g.world;
    const home = w.buildings.get(c.home), work = c.work >= 0 ? w.buildings.get(c.work) : null;
    let h = `<canvas class="portrait" width="54" height="84"></canvas><h2>${esc(c.first)} ${esc(c.sur)}</h2><div class="sub">${esc(g.citizens.fullName(c))}, ${c.age} ${c.age % 10 === 1 && c.age !== 11 ? 'год' : c.age % 10 >= 2 && c.age % 10 <= 4 && (c.age < 12 || c.age > 14) ? 'года' : 'лет'}</div>`;
    h += `<div class="row"><span class="k">Сейчас</span><span style="text-align:right">${esc(c.actText)}</span></div>`;
    h += `<div class="row"><span class="k">Занятие</span><span>${esc(c.job)}${c.student ? ' (студент)' : ''}</span></div>`;
    if (home) h += `<div class="row"><span class="k">Дом</span><span>${esc(DEFS[home.def].name)}, ${esc(this.address(home))}</span></div>`;
    if (work) h += `<div class="row"><span class="k">Работа</span><span>«${esc(DEFS[work.def].name)}»</span></div>`;
    if (c.kind === 'adult') h += `<div class="row"><span class="k">Работа с</span><span>${String(Math.floor(c.wStart / 60)).padStart(2, '0')}:${String(c.wStart % 60).padStart(2, '0')} до ${String(Math.floor((c.wStart + c.shift) / 60) % 24).padStart(2, '0')}:${String((c.wStart + c.shift) % 60).padStart(2, '0')}</span></div>`;
    h += `<div class="row"><span class="k">Транспорт</span><span>${c.car ? `своя машина` : 'пешком / автобус'}</span></div>`;
    h += `<div class="row"><span class="k">Сбережения</span><span>${fmtMoney(c.money)}</span></div>`;
    if (home) h += `<div class="row"><span class="k">Настроение</span><span class="${home.happy > 0.55 ? 'ok' : home.happy > 0.3 ? 'wr' : 'no'}">${pct(home.happy)}</span></div>`;
    if (home?.reasons?.length) h += `<div class="wr" style="font-size:12px">Жалуется: ${esc(home.reasons.slice(0, 3).join(', '))}</div>`;
    h += `<div class="sec">Дневник</div><div class="log">${c.log.map((l) => `<div>${this.timeStr(l.t)} — ${esc(l.text)}</div>`).join('')}</div>`;
    h += `<div class="btns"><button data-act="follow" data-v="${c.id}" class="${this.followId === c.id ? 'on' : ''}">🎥 ${this.followId === c.id ? 'Не следить' : 'Следить'}</button>${home ? `<button data-act="goto-b" data-v="${home.id}">🏠 Дом</button>` : ''}${work ? `<button data-act="goto-b" data-v="${work.id}">🏭 Работа</button>` : ''}</div>`;
    return h;
  }
  tileHtml(x, y) {
    const w = this.g.world, i = w.idx(x, y);
    const terr = w.terrain[i] === T_WATER ? 'Вода' : w.road[i] ? ROAD_NAMES[w.road[i]] : w.rubble[i] ? 'Руины' : w.tree[i] ? 'Лес' : 'Пустырь';
    let h = `<h2>${terr}</h2><div class="sub">Клетка ${x}, ${y}</div>`;
    if (w.zone[i]) h += `<div class="row"><span class="k">Зона</span><span>${ZONES[ZONE_LETTER[w.zone[i]]].name}, ${DENS[w.dens[i]]}</span></div>`;
    h += `<div class="row"><span class="k">💎 Стоимость земли</span><span>${Math.round(w.landValue[i])}</span></div>`;
    h += `<div class="row"><span class="k">🏭 Загрязнение</span><span>${Math.round(w.pollution[i])}</span></div>`;
    h += `<div class="row"><span class="k">🔪 Преступность</span><span>${Math.round(w.crime[i])}</span></div>`;
    if (w.road[i]) h += `<div class="row"><span class="k">🚗 Трафик</span><span>${Math.round(w.traffic[i])}</span></div>`;
    h += `<div class="row"><span class="k">⚡ Сеть / трубы</span><span>${w.power[i] ? 'ЛЭП' : '—'} / ${w.pipe[i] ? 'есть' : '—'}</span></div>`;
    const cov = ['fire', 'police', 'health', 'school', 'park'].map((k) => `${SERVICE_NAMES[k]}: ${pct(w.cov[k]?.[i] || 0)}`).join('<br>');
    h += `<div class="sec">Покрытие служб</div><div class="sub">${cov}</div>`;
    return h;
  }
  timeStr(t) { const m = t % 1440; return `${MONTHS[Math.floor(t / 1440) % 12].slice(0, 3)} ${1990 + Math.floor(Math.floor(t / 1440) / 12)} ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`; }

  infoAction(act, v) {
    const g = this.g, w = g.world;
    if (act === 'demolish' && this.info?.type === 'b') { const b = w.buildings.get(this.info.id); if (b) { const tiles = []; for (let dy = 0; dy < b.s; dy++) for (let dx = 0; dx < b.s; dx++) tiles.push(w.idx(b.x + dx, b.y + dy)); const r = g.bulldoze(tiles); if (!r.ok) this.toast(r.msg, true); else this.sfx('bulldoze'); this.closeInfo(); } }
    else if (act === 'god-fire' && this.info?.type === 'b') { import('../game/disasters.js').then((m) => m.igniteBuilding(g, w.buildings.get(this.info.id), 'Поджог')); }
    else if (act === 'god-up' && this.info?.type === 'b') { const b = w.buildings.get(this.info.id); if (b) { b.occ = DEFS[b.def].cap; b.happy = 1; b.built = 1; b.age += 100; this.toast('Здание заселено полностью'); } }
    else if (act === 'cit') { this.info = { type: 'c', id: +v }; this.renderInfo(); }
    else if (act === 'follow') { this.follow(this.followId === +v ? null : +v); this.renderInfo(); }
    else if (act === 'goto-b') { const b = w.buildings.get(+v); if (b) { this.follow(null); this.r.centerOn(b.x + b.s / 2, b.y + b.s / 2); this.info = { type: 'b', id: b.id }; this.renderInfo(); } }
  }

  // ---------- панели ----------
  openPanel(name) {
    if (this.panel === name) { this.closePanel(); return; }
    this.panel = name;
    this.panelTab = this.panelTab || {};
    $('#panel').classList.remove('hidden');
    this.renderPanel();
  }
  closePanel() { this.panel = null; $('#panel').classList.add('hidden'); $('#panelBody')._html = null; }
  renderPanel() {
    const fn = this['panel_' + this.panel];
    if (!fn) return;
    // не перерисовываем, пока пользователь двигает ползунок
    if (document.activeElement && document.activeElement.type === 'range' && $('#panel').contains(document.activeElement)) return;
    const [title, html, after, live] = fn.call(this);
    $('#panelTitle').textContent = title;
    const body = $('#panelBody');
    if (body._html === html && this._panelName === this.panel) return;
    body._html = html; this._panelName = this.panel;
    const st = body.scrollTop;
    body.innerHTML = html;
    body.scrollTop = st;
    this.panelLive = !!live;
    after?.(body);
  }

  panel_budget() {
    const g = this.g, b = g.budget;
    let h = '<div class="sec">Налоги</div>';
    for (const [k, n] of [['R', 'Жилой сектор'], ['C', 'Коммерция'], ['I', 'Промышленность'], ['A', 'Сельское хозяйство']]) h += `<div class="slider-row"><span>${n}</span><input type="range" min="0" max="20" step="1" value="${g.taxes[k]}" data-tax="${k}"><span>${g.taxes[k]}%</span></div>`;
    h += '<div class="sec">Финансирование служб</div>';
    for (const k in FUNDING_NAMES) h += `<div class="slider-row"><span>${FUNDING_NAMES[k]}</span><input type="range" min="0" max="120" step="10" value="${Math.round(g.funding[k] * 100)}" data-fund="${k}"><span>${Math.round(g.funding[k] * 100)}%</span></div>`;
    if (b) {
      const I = b.inc, E = b.exp;
      h += `<div class="sec">Прошлый месяц</div><div class="grid2"><div><table>
        <tr><th colspan="2">Доходы</th></tr>
        <tr><td>Налог с жителей</td><td>${fmtMoney(I.taxR)}</td></tr><tr><td>Налог с торговли</td><td>${fmtMoney(I.taxC)}</td></tr>
        <tr><td>Налог с промышленности</td><td>${fmtMoney(I.taxI)}</td></tr><tr><td>Налог с сельхоза</td><td>${fmtMoney(I.taxA)}</td></tr>
        <tr><td>Экспорт товаров и еды</td><td>${fmtMoney(I.export)}</td></tr><tr><td><b>Итого</b></td><td><b>${fmtMoney(b.totalInc)}</b></td></tr></table></div><div><table>
        <tr><th colspan="2">Расходы</th></tr>
        ${Object.entries(E.services).map(([k, v]) => `<tr><td>${FUNDING_NAMES[k]}</td><td>${fmtMoney(v)}</td></tr>`).join('')}
        <tr><td>Дороги</td><td>${fmtMoney(E.roads)}</td></tr><tr><td>ЛЭП и трубы</td><td>${fmtMoney(E.networks)}</td></tr>
        <tr><td>Закупка газа</td><td>${fmtMoney(E.gas)}</td></tr><tr><td>Импорт товаров/еды</td><td>${fmtMoney(E.import)}</td></tr>
        <tr><td>Кредиты</td><td>${fmtMoney(E.loans)}</td></tr><tr><td><b>Итого</b></td><td><b>${fmtMoney(b.totalExp)}</b></td></tr></table></div></div>
        <div style="margin-top:6px">Баланс: <b class="${b.net >= 0 ? 'ok' : 'no'}">${fmtMoney(b.net)}</b> в месяц</div>`;
    } else h += '<div class="sub">Отчёт появится в конце первого месяца.</div>';
    h += `<div class="sec">Кредиты (90-е: 25% годовых)</div>`;
    h += g.loans.map((L) => `<div class="row"><span>Кредит ${fmtMoney(L.amount)}</span><span>осталось ${fmtMoney(L.left)}, ${fmtMoney(L.monthly)}/мес</span></div>`).join('') || '<div class="sub">Нет кредитов</div>';
    h += `<div class="btns"><button data-loan="10000">Взять 10 000 ₽</button><button data-loan="50000">Взять 50 000 ₽</button></div>`;
    return ['💰 Бюджет', h, (body) => {
      body.querySelectorAll('[data-tax]').forEach((el) => el.oninput = () => { g.taxes[el.dataset.tax] = +el.value; el.nextElementSibling.textContent = el.value + '%'; });
      body.querySelectorAll('[data-fund]').forEach((el) => el.oninput = () => { g.funding[el.dataset.fund] = +el.value / 100; el.nextElementSibling.textContent = el.value + '%'; });
      body.querySelectorAll('[data-loan]').forEach((el) => el.onclick = () => { takeLoan(g, +el.dataset.loan); this.toast(`Получен кредит ${fmtMoney(+el.dataset.loan)}`); this.renderPanel(); });
    }];
  }

  panel_stats() {
    const g = this.g, st = g.stats;
    const tab = this.panelTab.stats || 'pop';
    const tabs = [['pop', 'Население'], ['money', 'Казна'], ['flow', 'Доходы/расходы'], ['happy', 'Счастье'], ['demand', 'Спрос']];
    let h = `<div class="tabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div><canvas class="chart" width="680" height="160"></canvas>`;
    const jb = st.jobsBy || {};
    h += `<div class="grid2">
      <div class="row"><span class="k">Население</span><span>${fmtNum(st.pop || 0)}</span></div><div class="row"><span class="k">Статус</span><span>${RANKS[g.rank].name}</span></div>
      <div class="row"><span class="k">Рабочая сила</span><span>${fmtNum(st.workforce || 0)}</span></div><div class="row"><span class="k">Рабочих мест</span><span>${fmtNum(st.jobs || 0)}</span></div>
      <div class="row"><span class="k">— в торговле</span><span>${fmtNum(jb.C || 0)}</span></div><div class="row"><span class="k">— в промышленности</span><span>${fmtNum(jb.I || 0)}</span></div>
      <div class="row"><span class="k">— в сельхозе</span><span>${fmtNum(jb.A || 0)}</span></div><div class="row"><span class="k">— в бюджетной сфере</span><span>${fmtNum(jb.S || 0)}</span></div>
      <div class="row"><span class="k">Безработица</span><span>${pct(st.unemployment || 0)}</span></div><div class="row"><span class="k">Образованность</span><span>${pct(st.edu || 0)}</span></div>
      <div class="row"><span class="k">Товары: произв./нужно</span><span>${fmtNum(st.goods || 0)} / ${fmtNum(st.goodsNeed || 0)}</span></div><div class="row"><span class="k">Еда: произв./нужно</span><span>${fmtNum(st.food || 0)} / ${fmtNum(st.foodNeed || 0)}</span></div>
      <div class="row"><span class="k">Связь с внешним миром</span><span class="${st.outside ? 'ok' : 'no'}">${st.outside ? 'есть' : 'нет!'}</span></div><div class="row"><span class="k">Зданий</span><span>${fmtNum(g.world.buildings.size)}</span></div>
    </div>`;
    return ['📈 Статистика', h, (body) => {
      body.querySelectorAll('[data-tab]').forEach((el) => el.onclick = () => { this.panelTab.stats = el.dataset.tab; this.renderPanel(); });
      const series = {
        pop: [['pop', '#5ad070']], money: [['money', '#ffcc40']], flow: [['inc', '#5ad070'], ['exp', '#ff5a4a']], happy: [['happy', '#4aa0ff'], ['unemp', '#ff5a4a']], demand: [['R', '#4caf50'], ['C', '#3f8fe0'], ['I', '#e0b030']],
      }[tab];
      this.chart(body.querySelector('canvas'), g.history, series);
    }];
  }
  chart(cv, data, series) {
    const x = cv.getContext('2d'), W = cv.width, H = cv.height;
    x.fillStyle = '#0e131d'; x.fillRect(0, 0, W, H);
    if (data.length < 2) { x.fillStyle = '#9aa4b8'; x.font = '14px sans-serif'; x.fillText('Данные появятся через пару месяцев', 20, 80); return; }
    let mn = Infinity, mx = -Infinity;
    for (const d of data) for (const [k] of series) { mn = Math.min(mn, d[k]); mx = Math.max(mx, d[k]); }
    if (mn > 0) mn = 0; if (mx === mn) mx = mn + 1;
    const P = 30;
    x.strokeStyle = '#2c3850'; x.lineWidth = 1;
    for (let k = 0; k <= 4; k++) { const y = P / 2 + (H - P) * k / 4; x.beginPath(); x.moveTo(P, y); x.lineTo(W - 4, y); x.stroke(); x.fillStyle = '#9aa4b8'; x.font = '10px sans-serif'; const v = mx - (mx - mn) * k / 4; x.fillText(Math.abs(v) >= 1000 ? Math.round(v / 1000) + 'к' : (Math.abs(v) < 2 ? v.toFixed(2) : Math.round(v)), 2, y + 3); }
    for (const [k, col] of series) {
      x.strokeStyle = col; x.lineWidth = 2; x.beginPath();
      data.forEach((d, i) => { const px = P + (W - P - 4) * i / (data.length - 1), py = P / 2 + (H - P) * (1 - (d[k] - mn) / (mx - mn)); i ? x.lineTo(px, py) : x.moveTo(px, py); });
      x.stroke();
    }
    x.fillStyle = '#9aa4b8'; x.font = '10px sans-serif';
    x.fillText(`${MONTHS[data[0].m].slice(0, 3)} ${data[0].y}`, P, H - 3);
    const l = data[data.length - 1]; x.fillText(`${MONTHS[l.m].slice(0, 3)} ${l.y}`, W - 60, H - 3);
  }

  panel_resources() {
    const g = this.g, s = g.supply;
    let h = '<div class="sub">Электричество идёт по ЛЭП, вода, газ, тепло и канализация — по подземным трубам. Соседние здания передают ресурсы друг другу. Мусор вывозится по дорогам.</div>';
    if (s) for (const k of ['power', 'water', 'gas', 'heat', 'sewage', 'garbage']) {
      const p = s[k].prod, u = s[k].use;
      const ratio = p > 0 ? Math.min(1, u / p) : (u > 0 ? 1 : 0);
      const bad = u > p * 1.001 && u > 0.5;
      h += `<div class="row"><span>${RES[k].icon} ${RES[k].name}</span><span class="${bad ? 'no' : 'ok'}">${fmtNum(u)} / ${fmtNum(p)} ${RES[k].unit}</span></div><div class="meter"><div style="width:${ratio * 100}%;background:${bad ? 'var(--bad)' : css(RES[k].color)}"></div></div>`;
    }
    const month = g.month();
    h += `<div class="sub">Сейчас ${MONTHS[month].toLowerCase()}: потребность в отоплении ${pct([1, 1, 0.8, 0.5, 0.2, 0.08, 0.05, 0.08, 0.3, 0.6, 0.9, 1][month])} от зимней. Ветер: ${pct(g.wind)}.</div>`;
    h += `<div class="sec">Нормы потребления на человека в месяц</div><table><tr><th>Тип</th><th>⚡</th><th>💧</th><th>🔥</th><th>♨</th><th>🚽</th><th>🗑</th></tr>`;
    const names = { R1: 'Частный сектор', R2: 'Жильё ср.', R3: 'Многоэтажки', C1: 'Магазины', C2: 'Торговля ср.', C3: 'Офисы', I1: 'Мастерские', I2: 'Заводы', I3: 'Комбинаты', A1: 'Сельхоз' };
    for (const k in USE) { const u = USE[k]; h += `<tr><td>${names[k]}</td><td>${u.power}</td><td>${u.water}</td><td>${u.gas}</td><td>${u.heat}</td><td>${u.sewage}</td><td>${u.garbage}</td></tr>`; }
    h += '</table><div class="sub">Частные дома отапливаются печами и используют септики — им не нужны котельная и канализация.</div>';
    return ['⚡ Ресурсы и коммуникации', h, null, true];
  }

  panel_people() {
    const g = this.g, cit = g.citizens;
    const list = cit.list;
    const counts = { kid: 0, adult: 0, pens: 0, travel: 0, work: 0, unemp: 0 };
    for (const c of list) { counts[c.kind]++; if (c.state === 'travel') counts.travel++; if (c.act === 'work') counts.work++; if (c.kind === 'adult' && c.work < 0 && !c.student) counts.unemp++; }
    let h = `<div class="sub">Отслеживается ${fmtNum(list.length)} жителей (каждый представляет ~${Math.round(cit.ratio)} чел.). Щёлкните по жителю, чтобы узнать, чем он занят, и следить за ним.</div>`;
    h += `<div class="grid2"><div class="row"><span class="k">Дети</span><span>${counts.kid}</span></div><div class="row"><span class="k">Взрослые</span><span>${counts.adult}</span></div><div class="row"><span class="k">Пенсионеры</span><span>${counts.pens}</span></div><div class="row"><span class="k">Сейчас в пути</span><span>${counts.travel}</span></div><div class="row"><span class="k">На работе</span><span>${counts.work}</span></div><div class="row"><span class="k">Без работы</span><span>${counts.unemp}</span></div></div>`;
    h += '<table><tr><th>Имя</th><th>Возраст</th><th>Занятие</th><th>Сейчас</th></tr>';
    for (const c of list.slice(0, 80)) h += `<tr class="click" data-cit="${c.id}"><td>${esc(c.first)} ${esc(c.sur)}</td><td>${c.age}</td><td>${esc(c.job)}</td><td style="font-size:12px">${esc(c.actText)}</td></tr>`;
    h += '</table>';
    return ['👤 Жители', h, (body) => body.querySelectorAll('[data-cit]').forEach((el) => el.onclick = () => { this.info = { type: 'c', id: +el.dataset.cit }; this.renderInfo(); this.follow(+el.dataset.cit); })];
  }

  panel_news() {
    const g = this.g;
    const h = g.news.slice().reverse().slice(0, 80).map((n) => `<div class="news-item ${n.type || ''}" ${n.x != null ? `data-x="${n.x}" data-y="${n.y}" style="cursor:pointer"` : ''}><span class="d">${this.timeStr(n.t)}</span>${esc(n.text)}</div>`).join('') || '<div class="sub">Пока тихо.</div>';
    return ['📰 Городская газета «Вестник»', h, (body) => body.querySelectorAll('[data-x]').forEach((el) => el.onclick = () => this.r.centerOn(+el.dataset.x, +el.dataset.y))];
  }

  panel_layers() {
    const h = `<div class="layer-grid">${LAYERS.map(([k, n]) => `<button data-layer="${k}" class="${(this.r.overlay || '') === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="sec">Вид</div><div class="btns"><button data-act2="ug" class="${this.r.underground ? 'on' : ''}">🕳 Подземный вид (трубы)</button><button data-act2="icons" class="${this.r.showIcons ? 'on' : ''}">⚠ Значки проблем</button><button data-act2="sound" class="${this.sound ? 'on' : ''}">🔊 Звук</button></div>
      <div class="sub" style="margin-top:8px">Зелёный — хорошо, красный — плохо. Значки над зданиями: ⚡ нет тока, 💧 нет воды, ❄ нет отопления, 🔥 газ/пожар.</div>`;
    return ['🗺 Информационные слои', h, (body) => {
      body.querySelectorAll('[data-layer]').forEach((el) => el.onclick = () => { this.userOverlay = el.dataset.layer || null; this.r.overlay = this.userOverlay; this.renderPanel(); });
      body.querySelectorAll('[data-act2]').forEach((el) => el.onclick = () => { const a = el.dataset.act2; if (a === 'ug') this.r.underground = !this.r.underground; if (a === 'icons') this.r.showIcons = !this.r.showIcons; if (a === 'sound') this.sound = !this.sound; this.renderPanel(); });
    }];
  }

  panel_god() {
    const g = this.g, gd = g.god;
    const tog = (k, n) => `<button data-god="${k}" class="${gd[k] ? 'on' : ''}">${gd[k] ? '☑' : '☐'} ${n}</button>`;
    let h = `<div class="sub">Меню для проверки и экспериментов. Всё работает мгновенно.</div><div class="sec">Режимы</div><div class="god-grid">
      ${tog('infiniteMoney', '∞ Бесконечные деньги')}${tog('instantBuild', '⚡ Мгновенная стройка')}${tog('unlockAll', '🔓 Открыть все здания')}
      ${tog('freeUtilities', '🚰 Бесплатные ресурсы')}${tog('maxDemand', '📈 Максимальный спрос')}${tog('allHappy', '😀 Все счастливы')}
      ${tog('fillAll', '🏠 Заселить всё сразу')}${tog('noDisasters', '🛡 Без пожаров')}${tog('freezeTime', '⏸ Остановить время')}</div>
      <div class="sec">Деньги</div><div class="god-grid"><button data-money="10000">+10 000 ₽</button><button data-money="100000">+100 000 ₽</button><button data-money="1000000">+1 000 000 ₽</button><button data-money="-50000">−50 000 ₽</button></div>
      <div class="sec">Время</div><div class="slider-row"><span>Время суток</span><input type="range" min="0" max="1439" step="10" value="${g.minuteOfDay()}" id="godTime"><span>${String(Math.floor(g.minuteOfDay() / 60)).padStart(2, '0')}:00</span></div>
      <div class="god-grid"><button data-gs="4">⏩ Скорость ×30</button><button data-skip="1">+1 месяц</button><button data-skip="12">+1 год</button><button data-season="0">❄ Зима</button><button data-season="6">☀ Лето</button><button data-weather="rain">🌧 Дождь</button><button data-weather="snow">🌨 Снег</button><button data-weather="clear">🌤 Ясно</button><button data-weather="auto">🔄 Погода авто</button></div>
      <div class="sec">Рост города</div><div class="god-grid"><button data-act3="grow">🏗 Застроить все зоны</button><button data-act3="complete">✅ Достроить всё</button><button data-act3="fill">👥 Заселить дома</button><button data-act3="rank">⭐ Следующий статус</button><button data-act3="clearRuins">🧹 Убрать руины и брошенные</button><button data-act3="village">🏘 Построить демо-деревню</button></div>
      <div class="sec">Стихии и инструменты (щёлкните по карте)</div><div class="god-grid"><button data-gt="ignite">🔥 Поджечь здание</button><button data-gt="tornado">🌪 Торнадо</button><button data-gt="meteor">☄ Метеорит</button><button data-act3="quake">🌋 Землетрясение</button><button data-gt="water">🌊 Сделать воду</button><button data-gt="land">⛰ Сделать сушу</button><button data-gt="forest">🌲 Вырастить лес</button></div>`;
    return ['✨ Меню бога', h, (body) => {
      body.querySelectorAll('[data-god]').forEach((el) => el.onclick = () => { gd[el.dataset.god] = !gd[el.dataset.god]; g.world.netDirty = true; if (el.dataset.god === 'unlockAll') { import('../game/growth.js').then((m) => { m.checkRank(g); }); this.thumbs.clear(); } this.renderPanel(); this.refresh(true); });
      body.querySelectorAll('[data-money]').forEach((el) => el.onclick = () => { g.money += +el.dataset.money; this.refresh(true); });
      const tm = body.querySelector('#godTime'); tm.oninput = () => { g.time = Math.floor(g.time / 1440) * 1440 + +tm.value; tm.nextElementSibling.textContent = String(Math.floor(tm.value / 60)).padStart(2, '0') + ':00'; g.citizens.list.forEach((c) => c.until = Math.min(c.until, g.time)); };
      body.querySelectorAll('[data-gs]').forEach((el) => el.onclick = () => this.setSpeed(4));
      body.querySelectorAll('[data-skip]').forEach((el) => el.onclick = () => { for (let k = 0; k < +el.dataset.skip; k++) { g.time += 1440; g.lastHour = Math.floor(g.time / 60) - 1; g.hourly(); g.lastHour = Math.floor(g.time / 60); g.lastDay++; g.monthly(); } this.toast(`Перемотано: ${el.dataset.skip} мес.`); this.refresh(true); });
      body.querySelectorAll('[data-season]').forEach((el) => el.onclick = () => { const d = g.day(); const target = Math.floor(d / 12) * 12 + +el.dataset.season; g.time = target * 1440 + g.minuteOfDay(); g.lastDay = Math.floor(g.time / 1440); g.lastHour = Math.floor(g.time / 60); this.refresh(true); });
      body.querySelectorAll('[data-weather]').forEach((el) => el.onclick = () => { g.weather = el.dataset.weather === 'auto' ? null : el.dataset.weather === 'clear' ? 'clear' : el.dataset.weather; });
      body.querySelectorAll('[data-gt]').forEach((el) => el.onclick = () => { const names = { ignite: 'Поджечь', tornado: 'Торнадо', meteor: 'Метеорит', water: 'Вода', land: 'Суша', forest: 'Лес' }; this.selectTool({ type: el.dataset.gt === 'water' || el.dataset.gt === 'land' || el.dataset.gt === 'forest' ? 'rect' : 'god', godRect: true, id: el.dataset.gt, name: names[el.dataset.gt] }); if (['water', 'land', 'forest'].includes(el.dataset.gt)) this.input.tool.type = 'rect', this.input.tool.god = true; this.closePanel(); this.toast('Щёлкните по карте'); });
      body.querySelectorAll('[data-act3]').forEach((el) => el.onclick = () => this.godAction(el.dataset.act3));
    }];
  }
  godAction(a) {
    const g = this.g, w = g.world;
    if (a === 'grow') { const prev = { ...g.god }; g.god.maxDemand = true; g.god.instantBuild = true; g.demand = { R: 1, C: 1, I: 1, A: 1 }; for (let k = 0; k < 8; k++) import('../game/growth.js').then((m) => m.growthStep(g, 1)); setTimeout(() => { g.god.maxDemand = prev.maxDemand; g.god.instantBuild = prev.instantBuild; w.netDirty = true; }, 100); this.toast('Зоны застроены'); }
    else if (a === 'complete') { for (const b of w.buildings.values()) b.built = 1; w.netDirty = true; }
    else if (a === 'fill') { for (const b of w.buildings.values()) { const d = DEFS[b.def]; if (d.kind === 'zone') { b.occ = d.cap; b.abandoned = false; b.bad = 0; } } g.world.netDirty = true; import('../game/growth.js').then((m) => m.updateDemand(g)); g.citizens.sync(); }
    else if (a === 'rank') { if (g.rank < RANKS.length - 1) { g.rank++; g.money += RANKS[g.rank].gift; g.news.push({ t: g.time, text: `Статус повышен до «${RANKS[g.rank].name}» (меню бога)`, type: 'good', big: true }); this.thumbs.clear(); } }
    else if (a === 'clearRuins') { for (let i = 0; i < w.rubble.length; i++) if (w.rubble[i]) { w.rubble[i] = 0; w.changed.add(i); } for (const b of [...w.buildings.values()]) if (b.abandoned) w.removeBuilding(b.id); }
    else if (a === 'quake') earthquake(g);
    else if (a === 'village') this.demoVillage();
    this.refresh(true);
  }
  // Быстрый старт: деревня у трассы
  demoVillage() {
    const g = this.g, w = g.world;
    const hy = w.highwayY ?? Math.floor(w.H / 2);
    const prevMoney = g.god.infiniteMoney; g.god.infiniteMoney = true;
    const x0 = 16;
    const idx = (x, y) => w.idx(x, y);
    const line = (ax, ay, bx, by) => { const t = []; if (ay === by) for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) t.push(idx(x, ay)); else for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) t.push(idx(ax, y)); return t; };
    g.buildRoads(line(x0, hy, x0 + 16, hy), 2);
    for (const dx of [4, 10, 16]) g.buildRoads(line(x0 + dx, hy - 6, x0 + dx, hy + 6), 1);
    const rect = (ax, ay, bx, by) => { const t = []; for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) if (w.inb(x, y)) t.push(idx(x, y)); return t; };
    g.setZone(rect(x0 + 5, hy - 6, x0 + 9, hy - 1), 'R', 1);
    g.setZone(rect(x0 + 5, hy + 1, x0 + 9, hy + 6), 'R', 1);
    g.setZone(rect(x0 + 11, hy + 1, x0 + 15, hy + 6), 'A', 1);
    g.placeBuilding('p_diesel', x0 + 2, hy - 3);
    g.placeBuilding('w_tower', x0 + 2, hy + 2);
    g.buildNet(line(x0 + 3, hy - 3, x0 + 3, hy + 2), 'power');
    g.buildNet([idx(x0 + 4, hy - 3), idx(x0 + 4, hy + 3), idx(x0 + 3, hy + 3)], 'power');
    g.buildNet(line(x0 + 3, hy - 4, x0 + 3, hy + 3), 'pipe');
    g.buildNet(line(x0 + 3, hy - 4, x0 + 5, hy - 4), 'pipe');
    g.buildNet(line(x0 + 3, hy + 3, x0 + 5, hy + 3), 'pipe');
    g.placeBuilding('m_fap', x0 + 11, hy - 1);
    g.placeBuilding('l_square', x0 + 12, hy - 1);
    g.buildNet([idx(x0 + 10, hy - 1)], 'power'); g.buildNet([idx(x0 + 10, hy - 1)], 'pipe');
    g.buildNet([idx(x0 + 10, hy + 1)], 'power'); g.buildNet([idx(x0 + 10, hy + 1)], 'pipe');
    g.buildNet([idx(x0 + 11, hy + 1)], 'power'); g.buildNet([idx(x0 + 11, hy + 1)], 'pipe');
    g.god.infiniteMoney = prevMoney;
    this.r.centerOn(x0 + 8, hy);
    this.toast('Деревня построена у трассы');
  }

  panel_game() {
    const saves = this.listSaves();
    let h = `<div class="sec">Сохранение</div><div class="btns"><button data-g="save">💾 Сохранить</button><button data-g="export">⬇ Скачать файл</button><label><button data-g="import">⬆ Загрузить файл</button></label></div>`;
    h += `<div class="sec">Сохранённые игры</div>` + (saves.map((s) => `<div class="row"><span>${esc(s.name)} — ${esc(s.info)}</span><span><button data-load="${s.key}">Загрузить</button> <button data-del="${s.key}">✕</button></span></div>`).join('') || '<div class="sub">Нет сохранений</div>');
    h += `<div class="sec">Новый город</div><div class="slider-row"><span>Размер карты</span><select id="ngSize"><option value="64">64×64 (быстро)</option><option value="96" selected>96×96</option><option value="128">128×128</option><option value="160">160×160 (огромная)</option></select><span></span></div>
      <div class="slider-row"><span>Вода</span><input id="ngWater" type="range" min="0" max="1" step="0.1" value="0.5"><span></span></div>
      <div class="slider-row"><span>Леса</span><input id="ngForest" type="range" min="0" max="1" step="0.1" value="0.5"><span></span></div>
      <div class="btns"><button data-g="new">🌱 Начать новый город</button><button data-g="newdemo">🏘 Новый город с деревней</button></div>
      <div class="sec">Как играть</div><div class="sub" style="line-height:1.5">
      1. Проведите <b>дорогу</b> от трассы (слева на карте) — по ней приезжают жители.<br>
      2. Нарисуйте <b>жилые</b> и <b>сельхоз</b> зоны рядом с дорогой.<br>
      3. Поставьте <b>дизель-генератор</b> и <b>водонапорную башню</b>, соедините ЛЭП и трубами (здания передают ресурсы соседям).<br>
      4. Следите за спросом (столбики Ж/К/П/С) и жалобами жителей. С ростом населения открываются новые здания: от деревни до мегаполиса.<br>
      5. Многоэтажкам нужны отопление (котельная + газ) и канализация.<br>
      Управление: ЛКМ — действие, ПКМ/перетаскивание — сдвиг, колесо — масштаб, Пробел — пауза, 1–3 — скорость, B — снос, R — дорога, G — меню бога, Esc — отмена.</div>`;
    return ['☰ Игра', h, (body) => {
      body.querySelectorAll('[data-g]').forEach((el) => el.onclick = () => this.gameAction(el.dataset.g));
      body.querySelectorAll('[data-load]').forEach((el) => el.onclick = () => this.loadKey(el.dataset.load));
      body.querySelectorAll('[data-del]').forEach((el) => el.onclick = () => { localStorage.removeItem(el.dataset.del); this.renderPanel(); });
    }];
  }
  listSaves() {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k.startsWith('tp_save_')) continue;
        const meta = JSON.parse(localStorage.getItem(k + '_meta') || '{}');
        if (k.endsWith('_meta')) continue;
        out.push({ key: k, name: meta.name || k, info: meta.info || '' });
      }
    } catch (e) { /* хранилище недоступно */ }
    return out;
  }
  saveGame(key = 'tp_save_' + this.g.cityName.replace(/\s+/g, '_'), silent = false) {
    try {
      const g = this.g;
      localStorage.setItem(key, g.serialize());
      localStorage.setItem(key + '_meta', JSON.stringify({ name: g.cityName, info: `${fmtNum(g.stats.pop)} жит., ${g.dateStr()}` }));
      localStorage.setItem('tp_last', key);
      if (!silent) this.toast('Игра сохранена');
    } catch (e) { if (!silent) this.toast('Не удалось сохранить: ' + e.message, true); }
  }
  loadKey(key) {
    try { const s = localStorage.getItem(key); if (!s) return; this.onLoad?.(s); this.toast('Игра загружена'); this.closePanel(); } catch (e) { this.toast('Ошибка загрузки: ' + e.message, true); }
  }
  gameAction(a) {
    if (a === 'save') { this.saveGame(); this.renderPanel(); }
    else if (a === 'export') {
      const blob = new Blob([this.g.serialize()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const el = document.createElement('a'); el.href = url; el.download = `${this.g.cityName}.trippatroppa.json`; el.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else if (a === 'import') {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
      inp.onchange = () => { const f = inp.files[0]; if (!f) return; f.text().then((t) => { try { this.onLoad?.(t); this.toast('Город загружен'); this.closePanel(); } catch (e) { this.toast('Ошибка: ' + e.message, true); } }); };
      inp.click();
    } else if (a === 'new' || a === 'newdemo') {
      const size = +$('#ngSize').value, water = +$('#ngWater').value, forest = +$('#ngForest').value;
      this.onNew?.({ size, water, forest, demo: a === 'newdemo' });
      this.closePanel();
    }
  }

  // ---------- мини-карта ----------
  drawMinimap() {
    const cv = $('#minimap'), g = this.g, w = g.world;
    const x = cv.getContext('2d');
    const id = x.createImageData(w.W, w.H);
    const d = id.data;
    for (let i = 0; i < w.W * w.H; i++) {
      let c;
      const b = w.bld[i] >= 0 ? w.buildings.get(w.bld[i]) : null;
      if (w.terrain[i] === T_WATER) c = w.road[i] ? 0x9a9a9a : 0x2a6aa0;
      else if (w.road[i]) c = 0xb0b0b0;
      else if (b) { const def = DEFS[b.def]; c = def.kind === 'zone' ? cmix(ZONES[def.zone].color, 0x000000, 0.2) : 0xd05050; if (b.fire) c = 0xff8000; }
      else if (w.zone[i]) c = cmix(ZONES[ZONE_LETTER[w.zone[i]]].color, 0x3a6a2a, 0.6);
      else if (w.tree[i]) c = 0x2a5a24;
      else c = w.terrain[i] === 2 ? 0xc8b880 : 0x4a8a34;
      d[i * 4] = c >> 16; d[i * 4 + 1] = (c >> 8) & 255; d[i * 4 + 2] = c & 255; d[i * 4 + 3] = 255;
    }
    const tmp = document.createElement('canvas'); tmp.width = w.W; tmp.height = w.H; tmp.getContext('2d').putImageData(id, 0, 0);
    // изометрическая мини-карта
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = '#0a0e16'; x.fillRect(0, 0, cv.width, cv.height);
    const s = cv.width / (w.W * Math.SQRT2) * 0.98;
    x.imageSmoothingEnabled = false;
    x.setTransform(s * 0.7071, s * 0.3536, -s * 0.7071, s * 0.3536, cv.width / 2, cv.height / 2 - w.H * s * 0.3536);
    x.drawImage(tmp, 0, 0);
    // рамка обзора
    x.setTransform(1, 0, 0, 1, 0, 0);
    const corners = [[0, 0], [this.r.cv.width, 0], [this.r.cv.width, this.r.cv.height], [0, this.r.cv.height]].map(([a, b]) => { const [X, Y] = this.r.screenToWorldPx(a, b); const tx = (Y / 16 + X / 32) / 2, ty = (Y / 16 - X / 32) / 2; return [cv.width / 2 + (tx - ty) * s * 0.7071, cv.height / 2 - w.H * s * 0.3536 + (tx + ty) * s * 0.3536]; });
    x.strokeStyle = '#ffe040'; x.lineWidth = 1; x.beginPath(); corners.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.stroke();
    this.mm = { s, cw: cv.width, ch: cv.height, H: w.H };
  }
  minimapClick(e) {
    const cv = $('#minimap'), rect = cv.getBoundingClientRect();
    if (!this.mm) return;
    const px = (e.clientX - rect.left) * cv.width / rect.width, py = (e.clientY - rect.top) * cv.height / rect.height;
    const { s, cw, ch, H } = this.mm;
    const u = (px - cw / 2) / (s * 0.7071), v = (py - (ch / 2 - H * s * 0.3536)) / (s * 0.3536);
    const tx = (u + v) / 2, ty = (v - u) / 2;
    this.follow(null);
    this.r.centerOn(tx, ty);
    this.drawMinimap();
  }
}
