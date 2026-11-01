'use strict';
// ───────────── состояние, цикл, камера, стадии, пост-эффекты, HUD ─────────────
const G = {
  state: 'boot', t: 0, dt: 0, map: null, P: null, enemies: [], projs: [], parts: [], pickups: [], captions: [], marks: [], puddles: [],
  cam: { x: 0, y: 0, shake: 0, zoom: 1 }, madness: 0, hitstop: 0, slowmo: 0, flash: 0, director: null, zoneI: -1, boss: null,
  stats: { kills: 0, melee: 0, ranged: 0, dmg: 0, deaths: 0, time: 0 }, aspects: {}, perks: new Set(), flags: {}, pathLimit: 0, pathTarget: 0,
  banner: null, ending: null, ecg: new Array(120).fill(0), fx: 1, maps: {},
};
let CV, CTX, W = 0, H = 0, DPR = 1, TEX = null, TEXPAT = null;

function resize() {
  const coarse = matchMedia('(pointer:coarse)').matches;
  DPR = Math.min(window.devicePixelRatio || 1, G.lowQ ? 1 : coarse ? 1.35 : 1.6);
  readSafe();
  W = innerWidth; H = innerHeight;
  CV.width = Math.floor(W * DPR); CV.height = Math.floor(H * DPR);
  CV.style.width = W + 'px'; CV.style.height = H + 'px';
  G.cam.zoom = clamp(Math.hypot(W, H) / 1200, 0.55, 2);
}
const SAFE = { l: 0, r: 0, t: 0, b: 0 };
function readSafe() {
  let pr = document.getElementById('safe-probe');
  if (!pr) { pr = document.createElement('div'); pr.id = 'safe-probe'; pr.style.cssText = 'position:fixed;inset:0;pointer-events:none;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(pr); }
  const cs = getComputedStyle(pr); SAFE.t = parseFloat(cs.paddingTop) || 0; SAFE.r = parseFloat(cs.paddingRight) || 0; SAFE.b = parseFloat(cs.paddingBottom) || 0; SAFE.l = parseFloat(cs.paddingLeft) || 0;
}
function viewRect(m = 0) { const z = G.cam.zoom; return [G.cam.x - W / 2 / z - m, G.cam.y - H / 2 / z - m, G.cam.x + W / 2 / z + m, G.cam.y + H / 2 / z + m]; }
function screenToWorld(sx, sy) { const z = G.cam.zoom; return { x: G.cam.x + (sx - W / 2) / z, y: G.cam.y + (sy - H / 2) / z }; }

// ── загрузка карт ──
function loadMap(m, label) {
  return new Promise((res) => {
    const gen = bakeMapGen(m);
    UI.loading(0, label);
    const step = () => {
      const t0 = performance.now(); let r;
      do { r = gen.next(); } while (!r.done && performance.now() - t0 < 30);
      if (r.done) { UI.loading(1, label); res(m); } else { UI.loading(r.value, label); requestAnimationFrame(step); }
    };
    requestAnimationFrame(step);
  });
}
async function bakeSprites() {
  const jobs = bakeAll();
  for (let i = 0; i < jobs.length; i++) { jobs[i](); if (i % 3 === 0) { UI.loading(i / jobs.length * 0.5, T('Замешиваю краски…', 'Mixing paints…')); await new Promise((r) => requestAnimationFrame(r)); } }
}

async function boot() {
  CV = document.getElementById('game'); CTX = CV.getContext('2d');
  resize(); addEventListener('resize', resize);
  bindCanvasInput(CV);
  TEX = makeCanvasTexture(); TEXPAT = CTX.createPattern(TEX, 'repeat');
  UI.init();
  try { await document.fonts.load('700 20px Caveat'); await document.fonts.load('20px "Rubik Wet Paint"'); } catch (e) { /* шрифты не обязательны */ }
  await bakeSprites();
  G.map = buildStreet();
  await loadMap(G.map, T('Грунтую холст…', 'Priming the canvas…'));
  G.P = newPlayer(G.map.spawn.x, G.map.spawn.y); G.cam.x = G.P.x; G.cam.y = G.P.y - 200;
  G.state = 'title'; G.mapDirty = false;
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !QS.has('nosw')) navigator.serviceWorker.register('sw.js').catch(() => {});
  requestAnimationFrame(loop);
  if (QS.has('zone') || QS.has('boss')) { AU.init(); startGame(); } else UI.title();
}

// ── игра ──
async function startGame() {
  UI.clear(); G.state = 'loading';
  G.enemies = []; G.projs = []; G.parts = []; G.pickups = []; G.captions = []; G.marks = []; G.puddles = [];
  G.stats = { kills: 0, melee: 0, ranged: 0, dmg: 0, deaths: 0, time: 0 }; G.aspects = {}; G.perks = new Set(); G.flags = { god: QS.has('god') }; chaosReset(true);
  G.boss = null; G.ending = null; G.director = null; G.zoneI = -1; G.banner = null; AU.boss = false;
  if (G.mapDirty || G.map.name !== 'street') { G.map = buildStreet(); await loadMap(G.map, T('Грунтую холст…', 'Priming the canvas…')); }
  G.mapDirty = true; UI.loadingHide();
  G.P = newPlayer(G.map.spawn.x, G.map.spawn.y);
  G.cam.x = G.P.x; G.cam.y = G.P.y;
  G.pathLimit = 0; G.pathTarget = G.map.gates[0].s;
  AU.musicOn = true; AU.zoneKey = 0; AU.setDroneRoot && AU.on && AU.setDroneRoot(AU.root());
  const dz = QS.has('zone') ? clamp(parseInt(QS.get('zone'), 10) || 0, 0, 4) : 0;
  if (QS.has('boss')) { const k = QS.get('boss'); G.P.gift = { id: GIFTS[ASPECTS.indexOf(k)] || 'blaster', lvl: 2 }; G.P.active = 'gift'; await enterArena(ASPECTS.includes(k) ? k : 'space'); return; }
  if (dz > 0) {
    for (let i = 0; i < Math.min(dz, 4); i++) { G.map.gates[i].open = true; G.map.gates[i].t = 2; }
    if (dz >= 3) { G.P.gift = { id: QS.get('gift') || pick(GIFTS), lvl: 1 }; G.P.active = 'gift'; G.aspects[WEAP[G.P.gift.id].asp] = 3; }
    if (dz === 4) { await enterStore(); return; }
    const z = ZONES[dz]; G.P.x = (z.rect[0] + z.rect[2]) / 2; G.P.y = z.rect[3] - 60; collideCircle(G.map, G.P, 14);
    G.pathLimit = G.pathTarget = G.map.gates[dz].s;
    G.state = 'play'; startZone(dz); return;
  }
  G.state = 'intro';
  UI.intro(() => { G.state = 'play'; startZone(0); });
}
function startZone(i) {
  const z = ZONES[i]; G.zoneI = i;
  G.director = new Director(z.dir, z.rect, { calm: z.calm });
  AU.zoneKey = z.key; if (AU.on) AU.setDroneRoot(AU.root());
  G.banner = { text: tr(TXT.stages[z.stage]), sub: tr(TXT.stageHints[z.stage]), t: 4.5 };
  endGlitch(); if (CHAOS.chal) chalDone(false); CHAOS.trip = 2.2; CHAOS.glitchT = rand(10, 16); CHAOS.chalT = rand(6, 10);
  for (const [id, x, y] of z.loot) { const s = { x, y }; if (!isBlocked(G.map, x, y)) addPickup(s.x, s.y, id); }
  saveCheckpoint();
  AU.play('whisper', 0, 1.2);
}
function saveCheckpoint() {
  const p = G.P;
  G.check = { map: G.map.name, zoneI: G.zoneI, x: p.x, y: p.y, hand: { ...p.hand }, gift: p.gift ? { ...p.gift } : null, perks: new Set(G.perks), aspects: { ...G.aspects }, hp: Math.max(p.hp, 70), ending: G.ending };
}
function onPlayerDeath() {
  G.stats.deaths++; G.slowmo = 1.2; AU.play('roar');
  setTimeout(() => { G.state = 'dead'; UI.dead(); }, 1300);
}
async function retry() {
  const c = G.check; UI.clear();
  G.enemies = []; G.projs = []; G.marks = []; G.puddles = []; G.captions = []; G.boss = null; G.shelters = null; AU.boss = false; G.pickups = [];
  G.perks = new Set(c.perks); G.aspects = { ...c.aspects }; chaosReset(false);
  const p = (G.P = newPlayer(c.x, c.y)); p.hand = { ...c.hand }; p.gift = c.gift ? { ...c.gift } : null; p.hp = 100; if (p.gift) p.active = 'gift';
  if (c.map.startsWith('arena')) { await enterArena(c.ending, true); return; }
  if (c.map === 'store') { await enterStore(true); return; }
  G.cam.x = p.x; G.cam.y = p.y; G.state = 'play'; startZone(c.zoneI);
}
function zoneCleared() {
  const z = ZONES[G.zoneI];
  AU.play('gate');
  if (G.map.name === 'street') {
    const g = G.map.gates[G.zoneI]; g.open = true; g.t = 0;
    const next = G.map.gates[G.zoneI + 1]; G.pathTarget = next ? next.s : G.map.path.len; if (g.door) G.pathTarget = G.map.path.len;
    G.banner = { text: g.door ? T('Магазин открыт', 'The store is open') : T('Путь свободен', 'The way is clear'), sub: T('Иди по линии', 'Follow the line'), t: 3 };
    if (z.clear === 'gift') { G.state = 'choice'; UI.choice(T('Галлюцинация протягивает тебе подарок', 'A hallucination offers you a gift'), giftOptions(), () => { G.state = 'play'; }); }
  }
}
function giftOptions() { return shuffle(GIFTS.slice()).slice(0, 3).map((id) => ({ type: 'gift', id, asp: WEAP[id].asp, name: tr(WEAP[id].name), desc: tr(WEAP[id].desc), icon: SPR['w_' + id] })); }
function perkOptions(n = 3) { return shuffle(Object.keys(PERKS).filter((k) => !G.perks.has(k))).slice(0, n).map((id) => ({ type: 'perk', id, asp: PERKS[id].asp, name: tr(PERKS[id].name), desc: tr(PERKS[id].desc), icon: null })); }
function applyChoice(o) {
  if (o.type === 'gift') { G.P.gift = { id: o.id, lvl: 1 }; G.P.active = 'gift'; G.aspects[o.asp] = (G.aspects[o.asp] || 0) + 3; }
  else if (o.type === 'perk') { G.perks.add(o.id); if (o.asp) G.aspects[o.asp] = (G.aspects[o.asp] || 0) + 2; }
  else if (o.type === 'upgrade') { G.P.gift.lvl++; G.aspects[o.asp] = (G.aspects[o.asp] || 0) + 2; }
  AU.play('heal'); G.P.hp = Math.min(G.P.max, G.P.hp + 25);
}

async function enterStore(isRetry) {
  G.state = 'loading'; AU.play('roar');
  await UI.fadeOut();
  if (!G.maps.store || G.maps.storeDirty) { G.maps.store = buildStore(); await loadMap(G.maps.store, T('Магазин «Продукты 24»…', 'The 24/7 store…')); }
  G.maps.storeDirty = true;
  G.map = G.maps.store; G.map.gates.forEach((g) => { if (g.lane) { g.open = false; g.t = 0; g.asp = null; } });
  if (!G.map.gates.some((g) => g.door)) G.map.gates.push({ x: 820, y: 1340, w: 160, h: 60, open: false, t: 0, hidden: true, door: true });
  G.enemies = []; G.projs = []; G.pickups = []; G.marks = []; G.puddles = [];
  const p = G.P; p.x = G.map.spawn.x; p.y = G.map.spawn.y; p.vx = p.vy = 0; G.cam.x = p.x; G.cam.y = p.y;
  G.pathLimit = 0; G.pathTarget = 0; G.zoneI = 4; G.flags.lanes = false; G.flags.midChoice = false; G.flags.cashier = false;
  UI.loadingHide(); await UI.fadeIn();
  G.state = 'play';
  const begin = () => { G.state = 'play'; startZone(4); G.flags.midChoice = false; };
  if (!isRetry && !G.flags.storePerk) { G.flags.storePerk = true; G.state = 'choice'; UI.choice(T('Двери закрылись. В голове щёлкнуло.', 'The doors shut. Something clicked in your head.'), perkOptions(), begin); }
  else begin();
}
function storeUpdate() {
  const d = G.director; if (!d) return;
  if (!G.flags.midChoice && d.wave >= (ZONES[4].dir.giftAfter || 2) && d.state === 'relax') {
    G.flags.midChoice = true; G.state = 'choice';
    const opts = perkOptions(2); if (G.P.gift) opts.unshift({ type: 'upgrade', id: G.P.gift.id, asp: WEAP[G.P.gift.id].asp, name: T('Усилить: ', 'Empower: ') + tr(WEAP[G.P.gift.id].name), desc: T('Голоса шепчут, как сделать его сильнее. +35% урона.', 'The voices whisper how to make it stronger. +35% damage.'), icon: SPR['w_' + G.P.gift.id] });
    UI.choice(T('Голоса предлагают сделку', 'The voices offer a deal'), opts, () => { G.state = 'play'; });
  }
  if (d.done && !G.flags.cashier) { G.flags.cashier = true; spawnBoss('cashier', 900, 400); G.banner = { text: tr(BOSSES.cashier.name), sub: T('Касса №1 закрыта. Все кассы закрыты.', 'Till 1 is closed. All tills are closed.'), t: 3.5 }; }
  if (G.flags.lanes) {
    const p = G.P;
    if (p.y < 190) for (const l of G.map.lanes) if (p.x > l.x && p.x < l.x + l.w) { G.flags.lanes = false; enterArena(l.asp); break; }
  }
}
function openLanes() {
  const sc = ASPECTS.map((a) => [a, (G.aspects[a] || 0) + Math.random() * 0.9]).sort((a, b) => b[1] - a[1]);
  const top = [sc[0][0], sc[1][0]], rest = ASPECTS.filter((a) => !top.includes(a));
  const asps = shuffle([...top, pick(rest)]);
  G.map.lanes.forEach((l, i) => { l.asp = asps[i]; const g = G.map.gates[i]; g.asp = asps[i]; g.open = true; g.t = 0; });
  G.map.signs = G.map.signs.filter((s) => !s.lane);
  G.map.lanes.forEach((l) => G.map.signs.push({ x: l.x + l.w / 2, y: 170, text: ENDINGS[l.asp].lane, hue: ENDING_HUE[l.asp], lane: true }));
  G.flags.lanes = true; G.pathTarget = G.map.path.len;
  G.banner = { text: T('Выбери кассу', 'Choose a checkout'), sub: T('Каждая ведёт туда, куда ты заслужил', 'Each leads where you deserve'), t: 4 };
  AU.play('gate');
}
function onBossDefeated(e) {
  AU.boss = false;
  if (e.kind === 'cashier') { G.flags.bread = true; floatText(G.P.x, G.P.y - 40, T('+ хлеб, + молоко', '+ bread, + milk'), [45, 80, 70]); G.boss = null; openLanes(); return; }
  G.boss = null; G.director = null; G.state = 'ending';
  setTimeout(() => UI.ending(G.ending), 600);
}
async function enterArena(kind, isRetry) {
  G.state = 'loading'; G.ending = kind; AU.play('roar');
  await UI.fadeOut();
  const m = arenaBase(kind); await loadMap(m, tr(ENDINGS[kind].lane) + '…');
  G.map = m; G.enemies = []; G.projs = []; G.pickups = []; G.marks = []; G.puddles = []; G.parts = [];
  const p = G.P; p.x = m.spawn.x; p.y = m.spawn.y; p.vx = p.vy = 0; G.cam.x = p.x; G.cam.y = p.y - 200;
  G.zoneI = -1; G.pathLimit = 0;
  saveCheckpoint(); G.check.map = m.name; G.check.ending = kind;
  UI.loadingHide(); await UI.fadeIn();
  const go = () => {
    G.state = 'play'; AU.zoneKey = 5; if (AU.on) AU.setDroneRoot(AU.root());
    const pos = { space: [800, 330], heaven: [800, 240], hell: [800, 400], jesus: [800, 420], atom: [800, 380], art: [800, 420] }[kind];
    spawnBoss(kind, pos[0], pos[1]);
    G.director = new Director({ pool: ARENA_POOL[kind], waves: 99, budget: [3, 5], maxAlive: 4, relax: 9 }, [80, 80, m.w - 80, m.h - 80], { calm: 8 });
    G.banner = { text: tr(ENDINGS[kind].boss), sub: tr(TXT.stages[5]), t: 4 };
    addPickup(300, 1000, 'tea'); addPickup(1300, 1000, 'sandwich');
  };
  if (isRetry) go(); else { G.state = 'intro'; UI.card(tr(ENDINGS[kind].lane), tr(ENDINGS[kind].intro), T('Драться', 'Fight'), go); }
}

// ── цикл ──
let lastT = performance.now();
function loop(now) {
  let dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  G.dt = dt; G.t += dt;
  if (G.state === 'play' && !G.lowQ) { G.perfAcc = (G.perfAcc || 0) * 0.97 + dt * 0.03; G.perfN = (G.perfN || 0) + 1; if (G.perfN > 240 && G.perfAcc > 0.027) { G.lowQ = true; resize(); } }
  INPUT.update();
  if (INPUT.pausePressed && (G.state === 'play' || G.state === 'paused')) { if (G.state === 'play') { G.state = 'paused'; UI.pause(); } else { G.state = 'play'; UI.clear(); } }
  if (G.state === 'play') {
    let sdt = dt;
    if (G.hitstop > 0) { G.hitstop -= dt; sdt *= 0.08; }
    if (G.slowmo > 0) { G.slowmo -= dt; sdt *= 0.3; }
    update(sdt);
  } else if (G.state === 'title') { const st = G.map.name === 'street'; G.cam.x = (st ? 700 : G.map.w / 2) + Math.sin(G.t * 0.08) * (st ? 400 : 200); G.cam.y = (st ? 5100 : G.map.h / 2) + Math.cos(G.t * 0.06) * (st ? 300 : 150); G.madness = 0.15 + Math.sin(G.t * 0.2) * 0.1; AU.intensity = 0; }
  else if (G.state === 'ending' || G.state === 'dead' || G.state === 'intro' || G.state === 'choice') { updateParts(dt * 0.5); if (G.state === 'ending' || G.state === 'dead') updateEnemies(dt * 0.2); }
  if (G.state !== 'boot' && G.map && G.map.chunks.length) render();
  INPUT.endFrame();
  requestAnimationFrame(loop);
}
function update(dt) {
  const p = G.P, m = G.map;
  G.stats.time += dt;
  updatePlayer(dt);
  chaosUpdate(dt);
  G.flowT = (G.flowT || 0) - dt; if (G.flowT <= 0) { G.flowT = 0.25; updateFlow(m, p.x, p.y); }
  if (G.director) {
    G.director.update(dt);
    if (G.director.done && !G.director.reported && G.zoneI >= 0 && G.map.name === 'street' && !G.enemies.some((e) => !e.ambient)) { G.director.reported = true; zoneCleared(); }
  }
  if (m.name === 'store') storeUpdate();
  const tm = timeMul();
  updateEnemies(dt * tm); updateProjs(dt, tm); updateMarks(dt * tm); updateParts(dt);
  G.pickups = G.pickups.filter((k) => !k.dead);
  for (const g of m.gates) if (g.open) g.t += dt;
  G.pathLimit = damp(G.pathLimit, G.pathTarget, 1.2, dt);
  // переходы между стадиями на улице
  if (m.name === 'street') {
    const nz = G.zoneI + 1;
    if (nz <= 3 && G.map.gates[G.zoneI] && G.map.gates[G.zoneI].open) { const r = ZONES[nz].rect; if (p.x > r[0] && p.x < r[2] && p.y > r[1] && p.y < r[3] - 20) startZone(nz); }
    const door = m.gates[3]; if (door.open && p.y < 915 && Math.abs(p.x - 1100) < 140) enterStore();
  }
  // безумие = база стадии + напряжение режиссёра
  const base = G.zoneI >= 0 ? ZONES[G.zoneI].madness : G.map.name.startsWith('arena') ? 0.9 : 0.1;
  const target = clamp(base + (G.director ? G.director.intensity * 0.3 : 0) + (1 - p.hp / p.max) * 0.15, 0, 1);
  G.madness = damp(G.madness, target, 1.5, dt);
  AU.intensity = G.director ? G.director.intensity * 0.8 + base * 0.3 : 0.2;
  // камера: заглядывает вперёд по прицелу
  const look = INPUT.touch ? 90 : Math.min(INPUT.aimDist || 0, 500) * 0.3;
  const tx = p.x + Math.cos(INPUT.aimAng) * look, ty = p.y + Math.sin(INPUT.aimAng) * look;
  G.cam.x = damp(G.cam.x, tx, 6, dt); G.cam.y = damp(G.cam.y, ty, 6, dt);
  { const hw = W / 2 / G.cam.zoom, hh = H / 2 / G.cam.zoom, mw = G.map.w, mh = G.map.h; G.cam.x = mw > hw * 2 ? clamp(G.cam.x, hw, mw - hw) : mw / 2; G.cam.y = mh > hh * 2 ? clamp(G.cam.y, hh, mh - hh) : mh / 2; }
  G.cam.shake = damp(G.cam.shake, 0, 9, dt);
  G.flash = Math.max(0, G.flash - dt * 2);
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  G.ecg.push(G.director ? G.director.intensity : 0.1); G.ecg.shift();
}

// ── отрисовка кадра ──
function render() {
  const ctx = CTX, z = G.cam.zoom, mad = G.madness * G.fx;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const b = G.map.base; ctx.fillStyle = hsl(b[0], b[1], b[2] * 0.6); ctx.fillRect(0, 0, W, H);
  ctx.save();
  const sh = G.cam.shake * G.fx;
  ctx.translate(W / 2 + rand(-sh, sh), H / 2 + rand(-sh, sh));
  ctx.rotate(Math.sin(G.t * 0.31) * 0.035 * mad);
  const breath = 1 + Math.sin(G.t * 0.55) * 0.02 * mad;
  ctx.scale(z * breath, z * breath);
  ctx.translate(-G.cam.x, -G.cam.y);
  const v = viewRect(80);
  drawMap(ctx, G.map, v[0], v[1], v[2], v[3]);
  drawAnimDecor(ctx, 0);
  if (G.state !== 'title') drawFlowStrokes(ctx);
  if (G.state !== 'title') {
    drawPath(ctx); drawGates(ctx); drawMarks(ctx); drawPickups(ctx);
    const list = G.enemies.filter((e) => e.x > v[0] - 200 && e.x < v[2] + 200 && e.y > v[1] - 200 && e.y < v[3] + 200);
    list.sort((a, b) => (a.def.beh === 'mouth' ? -1e5 : a.y) - (b.def.beh === 'mouth' ? -1e5 : b.y));
    if ((G.madness > 0.55 || CHAOS.hyper > 0 || CHAOS.glitch) && !G.lowQ) for (const e of list) { // шлейф-двойник у быстрых галлюцинаций
      if (e.boss || e.hidden || e.disg || Math.hypot(e.vx, e.vy) < 90) continue;
      ctx.save(); ctx.globalAlpha = 0.22; ctx.translate(-e.vx * 0.09, -e.vy * 0.09); drawEnemy(ctx, e); ctx.restore();
    }
    for (const e of list) if (!e.boss) drawEnemy(ctx, e);
    drawAlly(ctx);
    if (!G.P.dead || G.slowmo > 0) drawPlayer(ctx);
    for (const e of list) if (e.boss) drawBoss(ctx, e);
    for (const bb of G.projs) drawProj(ctx, bb);
    drawParts(ctx);
  }
  drawAnimDecor(ctx, 1);
  ctx.restore();
  post(ctx, mad);
  if (G.state !== 'title') drawHUD(ctx);
}
function post(ctx, mad) {
  // цветокоррекция стадии
  const gr = G.zoneI >= 0 ? ZONES[G.zoneI].grade : G.map.name.startsWith('arena') ? ARENA_GRADE[G.map.theme] : [38, 50, 60, 0.1];
  ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = hsl(gr[0], gr[1], gr[2], gr[3] * 2.2); ctx.fillRect(0, 0, W, H);
  if (mad > 0.45) { ctx.globalCompositeOperation = 'hue'; ctx.fillStyle = hsl((G.t * 25) % 360, 70, 50, (mad - 0.45) * 0.22); ctx.fillRect(0, 0, W, H); }
  // двоение — хроматический «сдвиг» восприятия
  const pk = G.director && G.director.state === 'peak' ? 0.15 : 0;
  const ghost = clamp((mad - 0.3) * 0.4 + pk, 0, 0.26) * G.fx;
  if (ghost > 0.02) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = ghost;
    const o = (3 + mad * 9 + Math.sin(G.t * 3) * 3) * DPR;
    ctx.drawImage(CV, o, 0); ctx.globalAlpha = ghost * 0.6; ctx.drawImage(CV, -o * 0.7, o * 0.4);
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  if (G.state !== 'title') drawWave(ctx);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (CHAOS.hyper > 0) { ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'hsla(0,100%,50%,.45)'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  if (CHAOS.trip > 0.05) { ctx.globalCompositeOperation = 'hue'; ctx.fillStyle = hsl((G.t * 160) % 360, 80, 50, Math.min(0.4, CHAOS.trip * 0.22) * G.fx); ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  if (gl('disco')) { ctx.globalCompositeOperation = 'overlay'; for (let i = 0; i < 3; i++) { const x = W / 2 + Math.sin(G.t * 2 + i * 2) * W * 0.35, y = H / 2 + Math.cos(G.t * 1.6 + i) * H * 0.3; const g = ctx.createRadialGradient(x, y, 0, x, y, 260); g.addColorStop(0, hsl((G.t * 300 + i * 120) % 360, 100, 60, 0.6 * G.fx)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); } ctx.globalCompositeOperation = 'source-over'; }
  // виньетка + пульс при низком рассудке
  const p = G.P, low = p ? clamp(1 - p.hp / 45, 0, 1) : 0;
  const pulse = low * (0.5 + 0.5 * Math.sin(G.t * (5 + low * 4)));
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, low > 0 ? `rgba(${90 + pulse * 80},0,10,${0.55 + pulse * 0.25})` : `rgba(10,0,20,${0.5 + mad * 0.25})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (p && p.hurtT > 0) { ctx.fillStyle = `rgba(160,10,30,${p.hurtT * 0.6})`; ctx.fillRect(0, 0, W, H); }
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,250,235,${G.flash * 0.7})`; ctx.fillRect(0, 0, W, H); }
  if (CHAOS.hyper > 0) { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(255,200,40,.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (G.state !== 'title') drawDrips(ctx);
  // фактура холста поверх всего
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.32; ctx.fillStyle = TEXPAT; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}

// ── HUD ──
function paintBar(ctx, x, y, w, h, k, col, back = 'rgba(20,10,20,.55)') {
  ctx.lineCap = 'round';
  ctx.strokeStyle = back; ctx.lineWidth = h + 8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + 2); ctx.stroke();
  if (k > 0) for (let i = 0; i < 3; i++) { ctx.strokeStyle = hsl(col[0] + i * 6, col[1], col[2] + i * 8 - 6, 0.9 - i * 0.2); ctx.lineWidth = h - i * 3; ctx.beginPath(); ctx.moveTo(x, y + (i - 1) * 2); ctx.lineTo(x + w * k + Math.sin(G.t * 3 + i) * 2, y + (i - 1) * 2 + 1.5); ctx.stroke(); }
}
function txt(ctx, s, x, y, size = 22, col = '#f4ead8', align = 'left', font = 'Caveat') {
  ctx.font = `700 ${size}px ${font === 'wet' ? "'Rubik Wet Paint', Caveat" : 'Caveat'}, cursive`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = 'rgba(15,5,15,.8)'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function drawHUD(ctx) {
  const p = G.P; if (!p) return;
  const s = clamp(Math.min(W, H) / 700, 0.7, 1.3);
  ctx.save(); ctx.translate(SAFE.l, SAFE.t); ctx.scale(s, s); const w = (W - SAFE.l - SAFE.r - (INPUT.touch ? 70 : 0)) / s, h = (H - SAFE.t - SAFE.b) / s;
  // рассудок
  txt(ctx, T('РАССУДОК', 'SANITY'), 24, 26, 22);
  paintBar(ctx, 28, 52, 220, 14, p.hp / p.max, p.hp > 40 ? [44, 75, 58] : [355, 75, 55]);
  const stage = G.zoneI >= 0 ? tr(TXT.stages[ZONES[G.zoneI].stage]) : G.map.name.startsWith('arena') ? tr(TXT.stages[5]) : '';
  txt(ctx, stage, 24, 82, 19, '#e8d6b8');
  // ЭКГ режиссёра
  const ex = w - 220, ey = 40;
  ctx.strokeStyle = 'rgba(20,10,20,.5)'; ctx.lineWidth = 34; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + 190, ey); ctx.stroke();
  ctx.strokeStyle = hsl(355 - (G.director ? G.director.intensity * 40 : 0), 80, 62); ctx.lineWidth = 2.2; ctx.beginPath();
  for (let i = 0; i < G.ecg.length; i++) { const k = G.ecg[i], ph = (i + G.t * 30 * (1 + k * 2)) % 20; const spike = ph < 2 ? -k * 22 * Math.sin(ph / 2 * Math.PI) : ph < 3 ? k * 8 : 0; ctx.lineTo(ex + (i / G.ecg.length) * 190, ey + spike + Math.sin(i * 0.5 + G.t * 8) * k * 2); }
  ctx.stroke();
  if (G.director && G.zoneI >= 0) { const d = G.director; const st = { calm: T('тихо…', 'quiet…'), build: T('нарастает', 'building'), peak: T('ПИК', 'PEAK'), fade: T('отступает', 'fading'), relax: T('передышка', 'breather'), done: T('прошло', 'over') }[d.state]; txt(ctx, `${st} · ${Math.min(d.wave, d.waves)}/${d.waves}`, ex + 95, ey + 30, 18, d.state === 'peak' ? '#ff8a7a' : '#e8d6b8', 'center'); }
  // оружие
  const slots = [{ w: p.hand, act: p.active === 'hand', key: '1' }, { w: p.gift, act: p.active === 'gift', key: '2' }];
  slots.forEach((sl, i) => {
    const x = 30 + i * 96, y = h - 64;
    ctx.fillStyle = sl.act ? 'rgba(250,215,120,.28)' : 'rgba(20,10,20,.45)'; ctx.beginPath(); ctx.roundRect(x, y - 30, 84, 60, 12); ctx.fill();
    if (sl.act) { ctx.strokeStyle = 'rgba(250,215,120,.8)'; ctx.lineWidth = 2; ctx.stroke(); }
    if (sl.w) { const img = SPR['w_' + sl.w.id]; if (img && sl.w.id !== 'fists') drawImg(ctx, img, x + 42, y - 4, -0.4, Math.min(1, 60 / img.width), Math.min(1, 60 / img.width)); else txt(ctx, '✊', x + 42, y - 4, 26, '#fff', 'center');
      txt(ctx, tr(WEAP[sl.w.id].name) + (sl.w.lvl > 1 ? ' +' + (sl.w.lvl - 1) : ''), x + 42, y + 20, 15, '#f4ead8', 'center');
      if (sl.w.dur !== Infinity && sl.w.dur !== undefined && !WEAP[sl.w.id].gift) { const max = WEAP[sl.w.id].dur; ctx.fillStyle = 'rgba(250,230,180,.8)'; ctx.fillRect(x + 8, y - 26, 68 * (sl.w.dur / max), 3); } }
    else txt(ctx, '—', x + 42, y, 20, '#a99', 'center');
    if (!INPUT.touch) txt(ctx, sl.key, x + 8, y - 22, 14, '#d8c8a8');
  });
  if (p.gift && WEAP[p.gift.id].kind === 'gun' && p.active === 'gift') paintBar(ctx, 132, h - 100, 70, 6, p.heat, p.overheat ? [0, 90, 55] : [30, 90, 60]);
  // подсказка подбора
  if (G.nearPickup && !G.nearPickup.heal) txt(ctx, (INPUT.touch ? '✋ ' : 'E — ') + T('взять: ', 'take: ') + tr(WEAP[G.nearPickup.id].name), w / 2, h - 40, 22, '#ffe7a0', 'center');
  // босс
  if (G.boss && !G.boss.dead) { const bb = G.boss; const nm = typeof BOSSES[bb.kind].name === 'function' ? BOSSES[bb.kind].name() : tr(BOSSES[bb.kind].name); txt(ctx, nm, w / 2, 26, 26, '#ffd9c0', 'center', 'wet'); paintBar(ctx, w / 2 - 220, 56, 440, 12, bb.hp / bb.maxHp, [355, 70, 50]); }
  // голоса у краёв экрана
  for (const c of G.captions) {
    const a = angTo(p.x, p.y, c.x, c.y), k = Math.min(1, c.life, (c.max - c.life) * 3);
    const cx = w / 2 + Math.cos(a) * (w / 2 - 140), cy = h / 2 + Math.sin(a) * (h / 2 - 90);
    ctx.save(); ctx.globalAlpha = k * 0.9; txt(ctx, '« ' + c.text + ' »', cx + Math.sin(G.t * 9) * 2, cy, 22, hsl(280, 60, 80), 'center'); ctx.restore();
  }
  // баннер стадии
  if (G.banner) { const k = Math.min(1, G.banner.t, 0.6) / 0.6; ctx.save(); ctx.globalAlpha = k; txt(ctx, G.banner.text, w / 2, h * 0.28, 44, '#ffe2b0', 'center', 'wet'); if (G.banner.sub) txt(ctx, G.banner.sub, w / 2, h * 0.28 + 44, 24, '#f0e0c8', 'center'); ctx.restore(); }
  drawChaosHUD(ctx, w, h);
  ctx.restore();
  // сенсорные стики
  if (INPUT.touch) for (const k of ['L', 'R']) { const st = INPUT.sticks[k]; if (!st) continue; ctx.strokeStyle = 'rgba(255,240,200,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(st.ox, st.oy, 60, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,240,200,.35)'; ctx.beginPath(); ctx.arc(st.ox + clamp(st.x - st.ox, -60, 60), st.oy + clamp(st.y - st.oy, -60, 60), 24, 0, TAU); ctx.fill(); }
}

window.__game = G;
addEventListener('load', boot);
