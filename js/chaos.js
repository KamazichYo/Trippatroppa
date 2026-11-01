'use strict';
// ───────────── СДВГ-режим: комбо, гиперфокус, глюки-мутаторы, навязчивые задания, визуальные трипы ─────────────
const CHAOS = {
  combo: 0, comboT: 0, best: 0, focus: 0, hyper: 0, glitch: null, glitchT: 16, chal: null, chalT: 9,
  flow: [], drips: [], trip: 0, waveAmp: 0, buf: null, ally: null, score: 0, lastWave: 0,
};
function chaosReset(full) {
  Object.assign(CHAOS, { combo: 0, comboT: 0, hyper: 0, glitch: null, glitchT: rand(12, 18), chal: null, chalT: rand(7, 11), ally: null, trip: 0, drips: [], flow: [] });
  if (full) { CHAOS.score = 0; CHAOS.best = 0; CHAOS.focus = 0; }
  AU.disco = false;
}
const chaosOn = () => G.state === 'play' && (G.map.name === 'street' || G.map.name === 'store') && G.zoneI >= 0;
const gl = (id) => CHAOS.glitch && CHAOS.glitch.id === id;
function timeMul() { return (CHAOS.hyper > 0 ? 0.45 : 1) * (gl('slowmo') ? 0.5 : 1); }
function dmgMul() { return CHAOS.hyper > 0 ? 2 : 1; }
function buzz(ms) { try { if (navigator.vibrate && INPUT.touch) navigator.vibrate(ms); } catch (e) { /* без вибрации */ } }

// ── комбо и гиперфокус ──
function chaosOnKill(e) {
  CHAOS.combo++; CHAOS.comboT = 2.8; CHAOS.best = Math.max(CHAOS.best, CHAOS.combo);
  CHAOS.score += 10 * CHAOS.combo * (e.elite ? 3 : 1);
  if (CHAOS.hyper <= 0) CHAOS.focus = Math.min(1, CHAOS.focus + 0.035 + Math.min(CHAOS.combo, 20) * 0.004 + (e.elite ? 0.15 : 0));
  G.P.dashCd -= 0.25;
  if (CHAOS.combo >= 5 && CHAOS.combo % 5 === 0) {
    const words = [['ОГОНЬ', 'FIRE'], ['ЕЩЁ!', 'MORE!'], ['НЕ ТОРМОЗИ', "DON'T STOP"], ['ДОФАМИН', 'DOPAMINE'], ['БЕЗУМИЕ', 'MADNESS'], ['СДВГ', 'ADHD']];
    floatText(G.P.x, G.P.y - 50, '×' + CHAOS.combo + ' ' + tr(pick(words)), [rand(360), 90, 70]);
    AU.play('pickup'); buzz(15);
  }
  if (CHAOS.chal && CHAOS.chal.def.onKill) CHAOS.chal.def.onKill(CHAOS.chal);
}
function chaosOnHurt() { CHAOS.combo = 0; if (CHAOS.chal && CHAOS.chal.def.onHurt) CHAOS.chal.def.onHurt(CHAOS.chal); buzz(40); }
function chaosOnWord() { CHAOS.score += 5; CHAOS.focus = Math.min(1, CHAOS.focus + 0.01); if (CHAOS.chal && CHAOS.chal.def.onWord) CHAOS.chal.def.onWord(CHAOS.chal); }
function startHyper() {
  CHAOS.hyper = 6.5; CHAOS.focus = 0; CHAOS.trip = Math.max(CHAOS.trip, 0.8); G.flash = 0.5;
  G.banner = { text: T('ГИПЕРФОКУС', 'HYPERFOCUS'), sub: T('время тянется · урон ×2', 'time stretches · damage ×2'), t: 2 };
  AU.play('choir'); AU.play('gate'); buzz(80);
}

// ── глюки-мутаторы: каждые ~20–30 с мир ломается по-новому ──
function scaleEnemy(e, k) { e.gScale = k; e.r = (e.r0 || e.def.r) * k; }
const GLITCHES = {
  giant: { name: ['Всё огромное', 'Everything is huge'], start() { G.enemies.forEach((e) => !e.boss && scaleEnemy(e, 1.55)); }, spawn(e) { scaleEnemy(e, 1.55); e.hp *= 1.4; }, end() { G.enemies.forEach((e) => !e.boss && scaleEnemy(e, 1)); } },
  tiny: { name: ['Всё крошечное', 'Everything is tiny'], start() { G.enemies.forEach((e) => { if (!e.boss) { scaleEnemy(e, 0.6); e.spdMul = 1.4; } }); }, spawn(e) { scaleEnemy(e, 0.6); e.spdMul = 1.4; }, end() { G.enemies.forEach((e) => { if (!e.boss) { scaleEnemy(e, 1); e.spdMul = 1; } }); } },
  pigeons: { name: ['Голубиный дождь', 'Pigeon rain'], street: true, tick(g, dt) { g.c = (g.c || 0) - dt; if (g.c <= 0) { g.c = 1.3; const a = rand(TAU), p = G.P; for (let i = 0; i < randi(3, 5); i++) { const e = spawnEnemy('pigeon', clamp(p.x + Math.cos(a) * 520 + rand(-40, 40), 30, G.map.w - 30), clamp(p.y + Math.sin(a) * 420 + rand(-40, 40), 30, G.map.h - 30), { ambient: true, ttl: 12 }); e.st = 'dive'; } } } },
  lava: { name: ['Пол — это лава', 'The floor is lava'], min: 1, tick(g, dt) { g.c = (g.c || 0) - dt; if (g.c <= 0) { g.c = 0.75; const p = G.P, x = p.x + rand(-260, 260) + p.vx * 0.5, y = p.y + rand(-200, 200) + p.vy * 0.5; mark(x, y, 46, 0.9, [20, 95, 55], (k) => G.puddles.push({ x: k.x, y: k.y, r: 46, life: 5, hue: 18, lava: true })); } } },
  disco: { name: ['Дискотека в голове', 'Disco in my head'], start() { AU.disco = true; }, spawn(e) { e.spdMul = 0.75; }, tick() { G.enemies.forEach((e) => { if (!e.boss) e.dance = true; }); }, end() { AU.disco = false; G.enemies.forEach((e) => { e.dance = false; e.spdMul = 1; }); } },
  wobble: { name: ['Всё плывёт', 'Everything melts'], min: 1 },
  slowmo: { name: ['Время тянется', 'Time stretches'] },
  caffeine: { name: ['Кофеин', 'Caffeine'], start() { G.enemies.forEach((e) => (e.spdMul = 1.25)); }, spawn(e) { e.spdMul = 1.25; }, end() { G.enemies.forEach((e) => (e.spdMul = 1)); } },
  ally: { name: ['Воображаемый друг', 'Imaginary friend'], start() { const p = G.P; CHAOS.ally = { x: p.x - 40, y: p.y, vx: 0, vy: 0, ang: 0, walk: 0, t: 0, cd: 0, say: 2 }; AU.play('choir'); }, end() { if (CHAOS.ally) { ring(CHAOS.ally.x, CHAOS.ally.y, [50, 80, 80], 60); CHAOS.ally = null; } } },
  faces: { name: ['Лица поменялись', 'Faces swapped'], min: 1, start() { G.enemies.forEach((e) => { if (e.spr && !e.boss) { e.morphFrom = e.disg || e.spr; e.disg = null; e.spr = 'hallu' + randi(0, 2); e.morphT = 0.7; } }); AU.play('morph'); }, spawn(e) { if (e.spr) { e.spr = 'hallu' + randi(0, 2); } } },
  paintrain: { name: ['Дождь из краски', 'Raining paint'], tick(g, dt) { g.c = (g.c || 0) - dt; if (g.c <= 0) { g.c = 0.45; const p = G.P, x = p.x + rand(-320, 320), y = p.y + rand(-240, 240), h = rand(360); mark(x, y, 40, 0.8, [h, 80, 60], (k) => { decal(G.map, k.x, k.y, 26, [h, 75, 55]); AU.play('splat', pan(k.x), 0.4); if (chance(0.4)) G.puddles.push({ x: k.x, y: k.y, r: 40, life: 4, hue: 130, heal: true }); for (const e of G.enemies) if (!e.boss && dist(e.x, e.y, k.x, k.y) < 46) hitEnemy(e, 2, 0, 0, 'ranged'); }); } } },
};
function startGlitch() {
  const stage = ZONES[G.zoneI].stage;
  const ids = Object.keys(GLITCHES).filter((k) => (GLITCHES[k].min || 0) <= stage && (!GLITCHES[k].street || G.map.name === 'street') && k !== CHAOS.lastGlitch);
  const id = pick(ids), g = { id, def: GLITCHES[id], t: rand(12, 15) };
  g.max = g.t; CHAOS.glitch = g; CHAOS.lastGlitch = id;
  CHAOS.trip = Math.max(CHAOS.trip, 1); G.flash = Math.max(G.flash, 0.3);
  CHAOS.glitchBanner = { text: T('ГЛЮК: ', 'GLITCH: ') + tr(g.def.name), t: 2.6 };
  AU.play('morph'); AU.play('roar', 0, 0.5); buzz(30);
  if (g.def.start) g.def.start(g);
}
function endGlitch() { const g = CHAOS.glitch; if (!g) return; if (g.def.end) g.def.end(g); CHAOS.glitch = null; CHAOS.glitchT = rand(14, 22); }

// ── навязчивые задания ──
const CHALS = {
  kills: { text: (c) => T(`Убей ${c.n} за ${c.max} с`, `Kill ${c.n} in ${c.max}s`), start(c) { c.n = randi(5, 8); c.max = c.t = 10; c.k = 0; }, onKill(c) { if (++c.k >= c.n) chalDone(true); }, prog: (c) => c.k / c.n },
  nohit: { text: () => T('Не пропусти ни удара', "Don't get hit"), start(c) { c.max = c.t = 12; }, onHurt() { chalDone(false); }, timeout: true },
  words: { text: (c) => T(`Разбей ${c.n} слова`, `Smash ${c.n} words`), need: 'words', start(c) { c.n = 4; c.max = c.t = 14; c.k = 0; }, onWord(c) { if (++c.k >= c.n) chalDone(true); }, prog: (c) => c.k / c.n },
  pill: { text: () => T('Поймай убегающую таблетку!', 'Catch the runaway pill!'), start(c) { c.max = c.t = 12; const p = G.P, a = rand(TAU); const s = freeSpot(G.map, p.x + Math.cos(a) * 200 - 60, p.y + Math.sin(a) * 200 - 60, p.x + Math.cos(a) * 200 + 60, p.y + Math.sin(a) * 200 + 60) || { x: p.x + 120, y: p.y }; addPickup(s.x, s.y, 'pill'); c.pill = G.pickups[G.pickups.length - 1]; c.pill.runaway = true; c.pill.onPick = () => chalDone(true); }, end(c) { if (c.pill && !c.pill.dead) { c.pill.dead = true; ring(c.pill.x, c.pill.y, [205, 70, 70], 40); } } },
  move: { text: () => T('Не останавливайся!', "Don't stop moving!"), start(c) { c.max = c.t = 10; c.still = 0; }, tick(c, dt) { const p = G.P; c.still = Math.hypot(p.vx, p.vy) < 40 ? c.still + dt : 0; if (c.still > 0.6) chalDone(false); }, timeout: true },
  combo: { text: (c) => T(`Комбо ×${c.n}`, `Combo ×${c.n}`), start(c) { c.n = randi(7, 10); c.max = c.t = 15; }, tick(c) { if (CHAOS.combo >= c.n) chalDone(true); }, prog: (c) => Math.min(1, CHAOS.combo / c.n) },
};
function startChal() {
  const words = Object.keys(ZONES[G.zoneI].dir.pool).some((t) => EDEF[t].words);
  const ids = Object.keys(CHALS).filter((k) => k !== CHAOS.lastChal && (CHALS[k].need !== 'words' || words));
  const id = pick(ids), c = { id, def: CHALS[id] }; c.def.start(c); CHAOS.chal = c; CHAOS.lastChal = id;
  AU.play('telegraph'); AU.play('whisper', 0, 0.6);
}
function chalDone(win) {
  const c = CHAOS.chal; if (!c) return; CHAOS.chal = null; CHAOS.chalT = rand(9, 15);
  if (c.def.end) c.def.end(c);
  const p = G.P;
  if (win) { p.hp = Math.min(p.max, p.hp + 15); CHAOS.focus = Math.min(1, CHAOS.focus + 0.35); CHAOS.score += 250; floatText(p.x, p.y - 60, T('ВЫПОЛНЕНО! +рассудок +фокус', 'DONE! +sanity +focus'), [120, 80, 70]); AU.play('heal'); AU.play('gate'); buzz(30); }
  else { floatText(p.x, p.y - 60, T('провал… бывает', 'failed… happens'), [0, 60, 70]); AU.play('hurt'); }
}

// ── обновление ──
function chaosUpdate(dt) {
  const C = CHAOS, p = G.P;
  C.comboT -= dt; if (C.comboT <= 0) C.combo = 0;
  if (C.hyper > 0) { C.hyper -= dt; if (chance(dt * 30)) part(p.x + rand(-30, 30), p.y + rand(-30, 30), rand(-40, 40), rand(-40, 40), 0.5, rand(3, 6), [50, 100, 65], 'spark'); }
  else if (C.focus >= 1) startHyper();
  C.trip = Math.max(0, C.trip - dt * 0.8);
  if (C.glitchBanner) { C.glitchBanner.t -= dt; if (C.glitchBanner.t <= 0) C.glitchBanner = null; }
  if (chaosOn()) {
    if (C.glitch) { C.glitch.t -= dt; if (C.glitch.def.tick) C.glitch.def.tick(C.glitch, dt); if (C.glitch.t <= 0) endGlitch(); }
    else { C.glitchT -= dt; if (C.glitchT <= 0 && G.director && G.director.state !== 'calm') startGlitch(); }
    if (C.chal) { if (C.chal.def.tick) C.chal.def.tick(C.chal, dt); if (C.chal) { C.chal.t -= dt; if (C.chal.t <= 0) chalDone(!!C.chal.def.timeout); } }
    else { C.chalT -= dt; if (C.chalT <= 0 && G.director && G.director.state !== 'calm') startChal(); }
  } else if (C.glitch && G.state === 'play') endGlitch();
  // убегающая таблетка
  for (const k of G.pickups) if (k.runaway) { const a = angTo(p.x, p.y, k.x, k.y) + Math.sin(G.t * 3 + k.t) * 0.8, d = dist(p.x, p.y, k.x, k.y); const s = d < 260 ? 175 : 40; k.x += Math.cos(a) * s * dt; k.y += Math.sin(a) * s * dt; collideCircle(G.map, k, 12); if (chance(dt * 8)) part(k.x, k.y, 0, 0, 0.4, 4, [205, 70, 70]); }
  // лужи-эффекты
  for (const u of G.puddles) {
    if (u.lava) { if (dist(u.x, u.y, p.x, p.y) < u.r) hurtPlayer(5, null); for (const e of G.enemies) if (!e.boss && !e.def.fly && dist(u.x, u.y, e.x, e.y) < u.r) { e.hp -= dt * 2; e.flash = 0.05; if (e.hp <= 0) killEnemy(e, 'ranged'); } }
    if (u.heal && dist(u.x, u.y, p.x, p.y) < u.r) p.hp = Math.min(p.max, p.hp + dt * 9);
  }
  // воображаемый друг
  const A = C.ally;
  if (A) {
    A.t += dt; A.cd -= dt; A.say -= dt;
    let tgt = null, bd = 520; for (const e of G.enemies) { if (e.dead || e.hidden || e.boss) continue; const d = dist(A.x, A.y, e.x, e.y); if (d < bd) { bd = d; tgt = e; } }
    const tx = tgt ? tgt.x : p.x - 50, ty = tgt ? tgt.y : p.y + 30;
    const a = angTo(A.x, A.y, tx, ty), far = dist(A.x, A.y, tx, ty);
    A.vx = damp(A.vx, far > 30 ? Math.cos(a) * 270 : 0, 8, dt); A.vy = damp(A.vy, far > 30 ? Math.sin(a) * 270 : 0, 8, dt);
    A.x += A.vx * dt; A.y += A.vy * dt; collideCircle(G.map, A, 12); A.ang = angLerp(A.ang, a, 0.2); A.walk += Math.hypot(A.vx, A.vy) * dt * 0.06;
    if (tgt && bd < tgt.r + 30 && A.cd <= 0) { A.cd = 0.4; hitEnemy(tgt, 1.6, a, 220, 'melee'); A.swing = 0.2; }
    A.swing = Math.max(0, (A.swing || 0) - dt);
    if (A.say <= 0) { A.say = rand(3, 5); floatText(A.x, A.y - 30, tr(pick([['Я с тобой!', "I've got you!"], ['Он не настоящий!', "He's not real!"], ['Дыши!', 'Breathe!'], ['Мы справимся', "We've got this"], ['Это просто голубь', "It's just a pigeon"]])), [50, 80, 80]); }
  }
  // волна искажения
  const pk = G.director && G.director.state === 'peak' && G.madness > 0.55 ? 3 : 0;
  C.waveAmp = damp(C.waveAmp, ((gl('wobble') ? 16 : 0) + C.trip * 14 + pk + (C.hyper > 0 ? 3 : 0)) * G.fx * (G.lowQ ? 0.6 : 1), 4, dt);
  updateFlowStrokes(dt); updateDrips(dt);
}

// ── живописные галлюцинации: «звёздная ночь» поверх мира и стекающая краска ──
function updateFlowStrokes(dt) {
  const want = Math.floor(clamp((G.madness - 0.2) / 0.7, 0, 1) * 120 * G.fx * (G.lowQ ? 0.4 : 1) + (CHAOS.hyper > 0 ? 40 : 0) + (gl('wobble') || gl('disco') ? 50 : 0));
  const v = viewRect(40), F = CHAOS.flow;
  while (F.length < want) F.push({ x: rand(v[0], v[2]), y: rand(v[1], v[3]), tr: [], life: rand(1.5, 3.5), max: 3.5, w: rand(2, 6), h: rand(-50, 50) });
  if (F.length > want) F.length = Math.max(0, want);
  for (const f of F) {
    f.life -= dt;
    const a = noise2(f.x * 0.0035 + G.t * 0.05, f.y * 0.0035, 21) * TAU * 1.2, s = 70 + G.madness * 80;
    f.tr.push(f.x, f.y); if (f.tr.length > 14) f.tr.splice(0, 2);
    f.x += Math.cos(a) * s * dt; f.y += Math.sin(a) * s * dt;
    if (f.life <= 0 || f.x < v[0] || f.x > v[2] || f.y < v[1] || f.y > v[3]) { f.x = rand(v[0], v[2]); f.y = rand(v[1], v[3]); f.tr = []; f.life = f.max = rand(1.5, 3.5); }
  }
}
function drawFlowStrokes(ctx) {
  const gr = G.zoneI >= 0 ? ZONES[G.zoneI].grade : [270, 60, 50];
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const f of CHAOS.flow) {
    if (f.tr.length < 4) continue;
    const k = Math.min(1, f.life, (f.max - f.life) * 2);
    ctx.strokeStyle = hsl((gr[0] + f.h + G.t * 20) % 360, CHAOS.hyper > 0 ? 95 : 70, 62, 0.35 * k);
    ctx.lineWidth = f.w; ctx.beginPath(); ctx.moveTo(f.tr[0], f.tr[1]);
    for (let i = 2; i < f.tr.length; i += 2) ctx.lineTo(f.tr[i], f.tr[i + 1]);
    ctx.stroke();
  }
  ctx.restore();
}
function updateDrips(dt) {
  const D = CHAOS.drips, on = (G.madness > 0.55 || gl('wobble')) && G.fx > 0.5;
  if (on && D.length < (G.lowQ ? 10 : 22) && chance(dt * 3)) D.push({ x: rand(W), len: 0, max: rand(H * 0.12, H * 0.45), sp: rand(30, 90), w: rand(5, 14), hue: rand(360), a: 1 });
  for (const d of D) { if (d.len < d.max) d.len += d.sp * dt; else d.a -= dt * 0.4; }
  CHAOS.drips = D.filter((d) => d.a > 0);
}
function drawDrips(ctx) {
  ctx.save(); ctx.lineCap = 'round';
  for (const d of CHAOS.drips) {
    ctx.strokeStyle = hsl(d.hue, 70, 45, 0.55 * d.a); ctx.lineWidth = d.w; ctx.beginPath(); ctx.moveTo(d.x, -10); ctx.lineTo(d.x + Math.sin(d.len * 0.05) * 3, d.len); ctx.stroke();
    ctx.fillStyle = hsl(d.hue, 70, 50, 0.6 * d.a); ctx.beginPath(); ctx.arc(d.x + Math.sin(d.len * 0.05) * 3, d.len, d.w * 0.8, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// Волновое искажение кадра полосами
function drawWave(ctx) {
  const amp = CHAOS.waveAmp; if (amp < 0.6) return;
  if (!CHAOS.buf || CHAOS.buf.width !== CV.width || CHAOS.buf.height !== CV.height) { CHAOS.buf = makeCanvas(CV.width, CV.height); }
  const b = CHAOS.buf, bc = b.getContext('2d'); bc.clearRect(0, 0, b.width, b.height); bc.drawImage(CV, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const n = G.lowQ ? 24 : 44, sh = Math.ceil(CV.height / n);
  for (let i = 0; i < n; i++) { const off = Math.sin(i * 0.38 + G.t * 4.2) * amp * DPR + Math.sin(i * 1.7 - G.t * 7) * amp * 0.25 * DPR; ctx.drawImage(b, 0, i * sh, CV.width, sh + 1, off, i * sh, CV.width, sh + 1); }
  ctx.restore();
}
function drawAlly(ctx) {
  const A = CHAOS.ally; if (!A) return;
  ctx.save(); ctx.globalAlpha = 0.8 + Math.sin(G.t * 6) * 0.1;
  ctx.strokeStyle = hsl(50, 90, 75, 0.6); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(A.x, A.y - 4, 16, 6, 0, 0, TAU); ctx.stroke();
  drawHuman(ctx, SPR.angel, A.x, A.y, A.ang, A.walk, clamp(Math.hypot(A.vx, A.vy) / 200, 0, 1), A.t, { armR: A.swing > 0 ? 1.2 - A.swing * 6 : undefined, seed: 7 });
  ctx.restore();
}
// HUD: комбо, фокус, глюк, задание
function drawChaosHUD(ctx, w, h) {
  const C = CHAOS;
  txt(ctx, T('ФОКУС', 'FOCUS'), 24, 108, 17, C.hyper > 0 ? '#ffe680' : '#d8c8a8');
  paintBar(ctx, 90, 108, 158, 8, C.hyper > 0 ? C.hyper / 6.5 : C.focus, C.hyper > 0 ? [50, 100, 60] : [190, 70, 60]);
  if (C.combo >= 2) { const s = 30 + Math.min(C.combo, 30) * 1.2; ctx.save(); ctx.translate(w - 110, 112); ctx.rotate(Math.sin(G.t * 12) * 0.06); txt(ctx, '×' + C.combo, 0, 0, s, hsl((G.t * 200) % 360, 90, 72), 'center', 'wet'); ctx.restore(); paintBar(ctx, w - 170, 140, 120, 5, C.comboT / 2.8, [45, 90, 65]); }
  if (C.glitch) txt(ctx, '⚡ ' + tr(C.glitch.def.name) + ' · ' + Math.ceil(C.glitch.t), w - 25, 165, 19, '#c8a0ff', 'right');
  if (C.chal) { const c = C.chal, y = G.boss ? 92 : 30; ctx.save(); ctx.translate(w / 2, y); ctx.rotate(Math.sin(G.t * 5) * 0.02); txt(ctx, '☐ ' + c.def.text(c), 0, 0, 24, '#fff2a8', 'center'); ctx.restore(); paintBar(ctx, w / 2 - 110, y + 22, 220, 5, c.t / c.max, [50, 90, 60]); if (c.def.prog) paintBar(ctx, w / 2 - 110, y + 34, 220 * c.def.prog(c), 5, 1, [120, 70, 55]); }
  if (C.glitchBanner) { const k = Math.min(1, C.glitchBanner.t * 2); ctx.save(); ctx.globalAlpha = k; ctx.translate(w / 2, h * 0.42); ctx.rotate(Math.sin(G.t * 9) * 0.05); ctx.scale(1 + (1 - k) * 0.4, 1 + (1 - k) * 0.4); txt(ctx, C.glitchBanner.text, 0, 0, 40, hsl((G.t * 300) % 360, 90, 72), 'center', 'wet'); ctx.restore(); }
}
