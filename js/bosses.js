'use strict';
// ───────────── боссы: кассирша-гидра и шесть финалов ─────────────
function mark(x, y, r, time, col, fn) { G.marks.push({ x, y, r, t: 0, max: time, col, fn }); AU.play('telegraph', pan(x)); }
function updateMarks(dt) { for (const k of G.marks) { k.t += dt; if (k.t >= k.max) { k.done = true; k.fn && k.fn(k); } } G.marks = G.marks.filter((k) => !k.done); }
function eBullet(x, y, a, s, o = {}) { return proj({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 9, dmg: 9, from: 'e', life: 5, kind: 'orb', hue: 0, ...o }); }
function ringBullets(e, n, s, off = 0, o = {}) { for (let i = 0; i < n; i++) eBullet(e.x + (e.hx || 0), e.y + (e.hy || 0), off + (i / n) * TAU, s, o); }
function wordFan(e, set, n, spread, s = 230) { const a0 = angTo(e.x, e.y + (e.hy || 0), G.P.x, G.P.y); for (let i = 0; i < n; i++) shootWord({ x: e.x + (e.hx || 0), y: e.y + (e.hy || 0), r: 40, def: { dmg: 9, col: e.def.col } }, set, s, a0 + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0)); }
function summon(type, n, near = null) { for (let i = 0; i < n; i++) { const sp = near ? freeSpot(G.map, near.x - 160, near.y - 160, near.x + 160, near.y + 160) : freeSpot(G.map, 100, 100, G.map.w - 100, G.map.h - 100); if (sp) { const e = spawnEnemy(type, sp.x, sp.y); e.ambient = false; } } }

const BOSSES = {
  cashier: { name: ['Старшая кассирша-гидра', 'Head Cashier Hydra'], hp: 130, r: 60, col: [345, 45, 42], words: 'cashier',
    attacks: (ph) => (ph === 1 ? ['tags', 'scan', 'carts', 'tags'] : ['tags', 'scan', 'mannequins', 'scan', 'tags', 'carts']) },
  space: { name: () => tr(ENDINGS.space.boss), hp: 300, r: 100, col: [28, 50, 58], words: 'space', hitR: 0.95,
    attacks: (ph) => (ph === 1 ? ['rings', 'couches', 'spiral', 'laser'] : ['spiral', 'rings', 'laser', 'minions', 'couches', 'rings']) },
  heaven: { name: () => tr(ENDINGS.heaven.boss), hp: 300, r: 95, col: [45, 30, 92], words: 'heaven',
    attacks: (ph) => (ph === 1 ? ['slam', 'lightning', 'slam', 'cherubs'] : ['rays', 'slam', 'lightning', 'cherubs', 'slam', 'rays']) },
  hell: { name: () => tr(ENDINGS.hell.boss), hp: 300, r: 55, col: [355, 70, 34], words: 'hell',
    attacks: (ph) => (ph === 1 ? ['contracts', 'dash', 'pillars', 'imps'] : ['dash', 'pillars', 'contracts', 'dash', 'imps', 'pillars']) },
  jesus: { name: () => tr(ENDINGS.jesus.boss), hp: 280, r: 48, col: [40, 20, 92], words: 'jesus',
    attacks: (ph) => (ph === 1 ? ['loaves', 'wine', 'fish', 'loaves'] : ['forgive', 'loaves', 'wine', 'fish', 'forgive']) },
  atom: { name: () => tr(ENDINGS.atom.boss), hp: 300, r: 50, col: [215, 12, 34], words: 'atom',
    attacks: (ph) => (ph === 1 ? ['nukes', 'agents', 'cadillac', 'duck'] : ['duck', 'nukes', 'tvs', 'cadillac', 'nukes', 'agents']) },
  art: { name: () => tr(ENDINGS.art.boss), hp: 290, r: 48, col: [28, 25, 30], words: 'art',
    attacks: (ph) => (ph === 1 ? ['paintings', 'watercolor', 'critics', 'paintings'] : ['tantrum', 'paintings', 'watercolor', 'critics', 'tantrum']) },
};

function spawnBoss(kind, x, y) {
  const B = BOSSES[kind];
  const e = { id: ENEMY_ID++, boss: true, kind, def: { col: B.col, beh: 'boss', dmg: 12 }, x, y, vx: 0, vy: 0, kx: 0, ky: 0, r: B.r, hitR: B.hitR || 1, hp: B.hp, maxHp: B.hp,
    t: 0, atkT: 2.2, atk: null, atkI: 0, phase: 1, flash: 0, sq: new Spring(200, 12), spawnT: 0, hx: 0, hy: 0, dead: false, contactCd: 0, seed: rand(100), home: { x, y }, hands: [{ x: x - 260, y: y + 60 }, { x: x + 260, y: y + 60 }] };
  if (kind === 'cashier') e.heads = [0, 1, 2].map((i) => ({ a: -0.9 + i * 0.9, x: x, y: y - 60 }));
  G.enemies.push(e); G.boss = e;
  AU.play('roar'); AU.boss = true;
  return e;
}
function bossHit(e, dmg, ang, src) {
  if (e.invuln || e.dying) return;
  if (e.kind === 'art' && e.dizzy) dmg *= 2;
  e.hp -= dmg; e.flash = 0.1; e.sq.kick(1.6);
  G.hitstop = Math.max(G.hitstop, src === 'melee' ? 0.04 : 0.01); G.cam.shake = Math.max(G.cam.shake, src === 'melee' ? 4 : 1.5);
  AU.play('hit', pan(e.x), 0.7);
  for (let i = 0; i < 4; i++) part(G.P.x + Math.cos(ang) * 40, G.P.y + Math.sin(ang) * 40, Math.cos(ang + rand(-0.8, 0.8)) * rand(80, 220), Math.sin(ang + rand(-0.8, 0.8)) * rand(80, 220), 0.5, rand(3, 7), e.def.col);
  if (e.kind === 'art' && chance(0.25)) floatText(e.x + rand(-30, 30), e.y - 60, T('ОТКАЗАНО', 'REJECTED'), [0, 70, 50]);
  if (e.hp <= 0) { e.hp = 0; bossDie(e); }
}
function bossDie(e) {
  e.dying = true; e.invuln = true; e.atk = null; G.slowmo = 1.4; AU.play('roar'); AU.play('boom');
  for (const x of G.enemies) if (x !== e) { x.dead = true; decal(G.map, x.x, x.y, 20, x.def.col); }
  G.projs = G.projs.filter((b) => b.from === 'p'); G.marks = [];
  for (let i = 0; i < 6; i++) setTimeout(() => { decal(G.map, e.x + rand(-80, 80), e.y + rand(-80, 80), rand(30, 60), [e.def.col[0] + rand(-30, 30), e.def.col[1], e.def.col[2]]); AU.play('splat'); }, i * 180);
  if (e.kind === 'jesus') AU.play('choir');
}

function updateBoss(e, dt) {
  const B = BOSSES[e.kind], p = G.P;
  e.sq.update(0, dt); e.spawnT = Math.min(1, e.spawnT + dt);
  if (e.dying) { e.dieT = (e.dieT || 0) + dt; if (e.dieT > 2.6 && !e.reported) { e.reported = true; e.dead = true; onBossDefeated(e); } return; }
  e.phase = e.hp < e.maxHp * 0.5 ? 2 : 1;
  if (e.phase === 2 && !e.ph2) { // трансформация босса на второй фазе
    e.ph2 = true; e.bigger = 1.18; CHAOS.trip = 1.8; G.flash = 0.7; AU.play('roar'); AU.play('morph');
    floatText(e.x, e.y - 110, T('ТРАНСФОРМАЦИЯ', 'TRANSFORMATION'), [300, 90, 72]);
    for (let i = 0; i < 40; i++) { const a = rand(TAU), s = rand(100, 420); part(e.x, e.y, Math.cos(a) * s, Math.sin(a) * s, rand(0.5, 1.1), rand(6, 14), [rand(360), 85, 60]); }
  }
  const sp = e.phase === 2 ? 1.25 : 1;
  // перемещение по умолчанию
  const mover = BOSS_MOVE[e.kind]; if (mover) mover(e, dt, sp);
  if (e.atk) { const done = BOSS_ATK[e.atk.n](e, e.atk, dt * sp); e.atk.t += dt * sp; if (done) { e.atk = null; e.atkT = (e.phase === 2 ? 0.9 : 1.4) + rand(0, 0.6); } }
  else { e.atkT -= dt * sp; if (e.atkT <= 0) { const list = B.attacks(e.phase); e.atk = { n: list[e.atkI++ % list.length], t: 0, k: 0 }; } }
  // контакт
  if (e.contactCd > 0) e.contactCd -= dt;
  else if (dist(e.x + e.hx, e.y + e.hy, p.x, p.y) < e.r * 0.8 + p.r) { hurtPlayer(12, { x: e.x, y: e.y }); e.contactCd = 1; }
  e.x = clamp(e.x, 80, G.map.w - 80); e.y = clamp(e.y, 80, G.map.h - 80);
}

const BOSS_MOVE = {
  cashier(e, dt) { e.x = e.home.x + Math.sin(e.t * 0.5) * 300; e.y = e.home.y + Math.sin(e.t * 1.3) * 20; e.hy = -10; e.heads.forEach((h, i) => { const a = -Math.PI / 2 + (i - 1) * 0.7 + Math.sin(e.t * 2 + i * 2) * 0.25; h.x = e.x + Math.cos(a) * 80; h.y = e.y - 20 + Math.sin(a) * 70; h.a = a; }); },
  space(e) { e.x = e.home.x + Math.sin(e.t * 0.25) * 380; e.y = e.home.y + Math.sin(e.t * 0.4) * 60; },
  heaven(e, dt) {
    e.x = e.home.x + Math.sin(e.t * 0.3) * 120; e.y = e.home.y + Math.sin(e.t * 0.7) * 14;
    e.hands.forEach((h, i) => { if (!h.busy) { const tx = e.x + (i ? 260 : -260) + Math.sin(e.t + i) * 40, ty = e.y + 120 + Math.cos(e.t * 1.3 + i) * 40; h.x = damp(h.x, tx, 3, dt); h.y = damp(h.y, ty, 3, dt); } });
  },
  hell(e, dt) { if (!e.atk || e.atk.n !== 'dash') { const p = G.P, a = angTo(e.x, e.y, p.x, p.y), d = dist(e.x, e.y, p.x, p.y); const tx = p.x - Math.cos(a) * 300, ty = p.y - Math.sin(a) * 300; e.vx = damp(e.vx, (tx - e.x) * 1.2, 2, dt); e.vy = damp(e.vy, (ty - e.y) * 1.2, 2, dt); if (d < 120) { e.vx -= Math.cos(a) * 200 * dt; e.vy -= Math.sin(a) * 200 * dt; } e.x += e.vx * dt; e.y += e.vy * dt; collideCircle(G.map, e, 40); } },
  jesus(e, dt) { if (!e.glide || dist(e.x, e.y, e.glide.x, e.glide.y) < 20) { e.glide = freeSpot(G.map, 250, 200, G.map.w - 250, G.map.h - 350) || { x: 800, y: 400 }; } e.x = damp(e.x, e.glide.x, 0.8, dt); e.y = damp(e.y, e.glide.y, 0.8, dt); if (chance(dt * 3)) ring(e.x, e.y + 60, [190, 40, 80], 50); },
  atom(e, dt) { if (!e.glide || dist(e.x, e.y, e.glide.x, e.glide.y) < 20) e.glide = { x: rand(300, 1300), y: rand(250, 520) }; e.x = damp(e.x, e.glide.x, 1.1, dt); e.y = damp(e.y, e.glide.y, 1.1, dt); },
  art(e, dt) { if (e.dizzy) return; const p = G.P; if (!e.glide || dist(e.x, e.y, e.glide.x, e.glide.y) < 20 || e.t % 3 < dt) { const a = rand(TAU); e.glide = { x: clamp(p.x + Math.cos(a) * 320, 120, 1480), y: clamp(p.y + Math.sin(a) * 320, 120, 1080) }; } e.x = damp(e.x, e.glide.x, 1.6, dt); e.y = damp(e.y, e.glide.y, 1.6, dt); collideCircle(G.map, e, 40); },
};

const BOSS_ATK = {
  // ── кассирша ──
  tags(e, a) { if (a.t > a.k * 0.35 && a.k < 3) { a.k++; for (const h of e.heads) shootWord({ x: h.x, y: h.y, r: 20, def: { dmg: 8, col: e.def.col } }, 'store', 240, angTo(h.x, h.y, G.P.x, G.P.y) + rand(-0.2, 0.2)); } return a.t > 1.3; },
  scan(e, a, dt) {
    if (!a.a0) { a.a0 = angTo(e.x, e.y, G.P.x, G.P.y) - 1.1; AU.play('zap'); }
    const ang = a.a0 + clamp((a.t - 0.6) / 2, 0, 1) * 2.2; e.beam = { a: ang, on: a.t > 0.6, L: beamLen(e.x, e.y, ang, 1200) };
    if (e.beam.on && segDist(G.P.x, G.P.y, e.x, e.y, e.x + Math.cos(ang) * e.beam.L, e.y + Math.sin(ang) * e.beam.L) < G.P.r + 8) hurtPlayer(10, e);
    if (a.t > 2.7) { e.beam = null; return true; } return false;
  },
  carts(e, a) { if (a.k === 0) { a.k = 1; for (const x of [200, 1600]) { const c = spawnEnemy('cart', x, 1150); c.spawnT = 0.3; } } return a.t > 0.8; },
  mannequins(e, a) { if (a.k === 0) { a.k = 1; summon('mannequin', 2); } return a.t > 0.6; },
  // ── космос ──
  rings(e, a) { if (a.t > a.k * 0.5 && a.k < (e.phase === 2 ? 4 : 3)) { a.k++; ringBullets(e, 16, 190, a.k * 0.2, { kind: 'q', text: '?', hue: 40 }); AU.play('word'); } return a.t > 2; },
  spiral(e, a, dt) { a.c = (a.c || 0) + dt; if (a.c > 0.11) { a.c = 0; const ang = a.t * 3.1; shootWord({ x: e.x, y: e.y, r: 60, def: { dmg: 8, col: [30, 50, 60] } }, 'space', 200, ang); if (e.phase === 2) shootWord({ x: e.x, y: e.y, r: 60, def: { dmg: 8, col: [30, 50, 60] } }, 'space', 200, ang + Math.PI); } return a.t > 3; },
  couches(e, a) {
    if (a.k === 0) { a.k = 1; a.list = []; for (let i = 0; i < 3; i++) { const y = clamp(G.P.y + (i - 1) * 180 + rand(-40, 40), 120, 1080), left = chance(0.5); a.list.push({ y, left }); G.marks.push({ x: 800, y, r: 0, line: true, t: 0, max: 1, col: [20, 60, 50] }); } }
    if (a.k === 1 && a.t > 1) { a.k = 2; for (const c of a.list) proj({ x: c.left ? 20 : 1580, y: c.y, vx: c.left ? 620 : -620, vy: 0, r: 34, dmg: 16, from: 'e', life: 3, kind: 'couch', ghost: true }); AU.play('throw'); }
    return a.t > 1.6;
  },
  laser(e, a) {
    if (!a.aim) { a.aim = angTo(e.x, e.y + 40, G.P.x, G.P.y); AU.play('telegraph'); }
    if (a.t < 1.1) a.aim = angLerp(a.aim, angTo(e.x, e.y + 40, G.P.x, G.P.y), 0.04);
    e.beam = { a: a.aim, on: a.t > 1.1, L: 1500, w: 22, ox: 0, oy: 40, tele: a.t <= 1.1 };
    if (e.beam.on && segDist(G.P.x, G.P.y, e.x, e.y + 40, e.x + Math.cos(a.aim) * 1500, e.y + 40 + Math.sin(a.aim) * 1500) < G.P.r + 14) hurtPlayer(16, e, true);
    if (a.t > 1.5) { e.beam = null; return true; } return false;
  },
  minions(e, a) { if (a.k === 0) { a.k = 1; summon('cosmo', 3); } return a.t > 0.5; },
  // ── рай ──
  slam(e, a) {
    const h = e.hands[a.hi === undefined ? (a.hi = randi(0, 1)) : a.hi];
    if (a.k === 0) { h.busy = true; a.k = 1; }
    if (a.k === 1) { h.x = damp(h.x, G.P.x, 6, 1 / 60); h.y = damp(h.y, G.P.y - 30, 6, 1 / 60); if (a.t > 0.9) { a.k = 2; a.tx = G.P.x; a.ty = G.P.y; mark(a.tx, a.ty, 90, 0.6, [45, 80, 70]); } }
    if (a.k === 2 && a.t > 1.5) { a.k = 3; h.x = a.tx; h.y = a.ty; G.cam.shake = 12; AU.play('boom'); if (dist(a.tx, a.ty, G.P.x, G.P.y) < 95) hurtPlayer(18, { x: a.tx, y: a.ty }); ring(a.tx, a.ty, [45, 80, 80], 140); if (e.phase === 2) for (let i = 0; i < 10; i++) eBullet(a.tx, a.ty, i / 10 * TAU, 230, { hue: 48 }); }
    if (a.t > 2.2) { h.busy = false; return true; } return false;
  },
  lightning(e, a) { if (a.k === 0) { a.k = 1; for (let i = 0; i < (e.phase === 2 ? 8 : 5); i++) { const x = G.P.x + rand(-220, 220), y = G.P.y + rand(-220, 220); mark(x, y, 55, 1 + i * 0.12, [55, 90, 70], (k) => { AU.play('zap'); ring(k.x, k.y, [55, 100, 80], 70); for (let j = 0; j < 6; j++) part(k.x, k.y, rand(-200, 200), rand(-200, 200), 0.4, 4, [55, 100, 85], 'spark'); if (dist(k.x, k.y, G.P.x, G.P.y) < 60) hurtPlayer(14, k); }); } } return a.t > 2; },
  cherubs(e, a) { if (a.k === 0) { a.k = 1; AU.play('choir'); summon('cherub', e.phase === 2 ? 6 : 4, { x: e.x, y: e.y + 150 }); } return a.t > 0.6; },
  rays(e, a, dt) {
    const n = 3; e.rays = []; for (let i = 0; i < n; i++) e.rays.push(a.t * 0.9 + (i / n) * TAU);
    if (a.t > 0.8) for (const r of e.rays) if (segDist(G.P.x, G.P.y, e.x, e.y, e.x + Math.cos(r) * 1600, e.y + Math.sin(r) * 1600) < G.P.r + 12) hurtPlayer(12, e, true);
    void dt; if (a.t > 4.2) { e.rays = null; return true; } return false;
  },
  // ── ад ──
  contracts(e, a) { if (a.t > a.k * 0.45 && a.k < 3) { a.k++; wordFan(e, 'hell', e.phase === 2 ? 5 : 3, 0.8, 260); } return a.t > 1.5; },
  dash(e, a, dt) {
    if (a.k === 0) { a.k = 1; a.ang = angTo(e.x, e.y, G.P.x, G.P.y); G.marks.push({ x: e.x, y: e.y, ang: a.ang, ray: true, t: 0, max: 0.75, col: [10, 90, 50] }); AU.play('telegraph'); }
    if (a.k === 1 && a.t > 0.75) { a.k = 2; AU.play('roar'); }
    if (a.k === 2) { e.x += Math.cos(a.ang) * 900 * dt; e.y += Math.sin(a.ang) * 900 * dt; part(e.x, e.y, 0, 0, 0.4, 14, [10, 90, 45]); if (collideCircle(G.map, e, 40) || a.t > 1.7) { a.k = 3; G.cam.shake = 9; ring(e.x, e.y, [10, 90, 55], 120); } if (dist(e.x, e.y, G.P.x, G.P.y) < 60) hurtPlayer(20, e); }
    return a.k === 3 && a.t > 1.9;
  },
  pillars(e, a) {
    if (a.k === 0) { a.k = 1; const base = angTo(e.x, e.y, G.P.x, G.P.y); const lines = e.phase === 2 ? 5 : 3; for (let l = 0; l < lines; l++) { const ang = base + (l - (lines - 1) / 2) * 0.35; for (let i = 1; i < 9; i++) { const x = e.x + Math.cos(ang) * i * 80, y = e.y + Math.sin(ang) * i * 80; mark(x, y, 38, 0.5 + i * 0.1, [15, 95, 50], (k) => { ring(k.x, k.y, [20, 100, 55], 50); for (let j = 0; j < 4; j++) part(k.x, k.y, rand(-60, 60), rand(-160, -40), 0.6, rand(6, 12), [rand(5, 45), 95, 55]); if (dist(k.x, k.y, G.P.x, G.P.y) < 42) hurtPlayer(12, k); }); } } }
    return a.t > 1.8;
  },
  imps(e, a) { if (a.k === 0) { a.k = 1; summon('imp', e.phase === 2 ? 5 : 3, e); } return a.t > 0.5; },
  // ── Галилея ──
  loaves(e, a) { if (a.t > a.k * 0.6 && a.k < 3) { a.k++; const ang = angTo(e.x, e.y, G.P.x, G.P.y) + rand(-0.3, 0.3); proj({ x: e.x, y: e.y, vx: Math.cos(ang) * 230, vy: Math.sin(ang) * 230, r: 12, dmg: 8, from: 'e', life: 3, kind: 'loaf', split: 0.7, gen: e.phase === 2 ? 2 : 1 }); AU.play('throw'); } return a.t > 2; },
  wine(e, a) { if (a.t > a.k * 0.35 && a.k < 4) { a.k++; const tx = G.P.x + rand(-140, 140), ty = G.P.y + rand(-140, 140); const ang = angTo(e.x, e.y, tx, ty), d = dist(e.x, e.y, tx, ty); proj({ x: e.x, y: e.y, vx: Math.cos(ang) * d / 0.8, vy: Math.sin(ang) * d / 0.8, r: 10, dmg: 6, from: 'e', life: 0.8, kind: 'puddleMaker', hue: 330, ghost: true }); } return a.t > 1.6; },
  fish(e, a) { if (a.k === 0) { a.k = 1; summon('fish', e.phase === 2 ? 8 : 5, e); } return a.t > 0.6; },
  forgive(e, a) { if (a.t > a.k * 0.7 && a.k < 3) { a.k++; for (let i = 0; i < 12; i++) shootWord({ x: e.x, y: e.y, r: 40, def: { dmg: 7, col: [45, 60, 80] } }, 'jesus', 170, (i / 12) * TAU + a.k * 0.26); } return a.t > 2.2; },
  // ── 1953 ──
  nukes(e, a) { if (a.t > a.k * 0.4 && a.k < (e.phase === 2 ? 5 : 3)) { a.k++; const x = G.P.x + rand(-160, 160), y = G.P.y + rand(-160, 160); mark(x, y, 100, 1.3, [50, 90, 55], (k) => explode(k.x, k.y, 100, 16, 'e')); const ang = angTo(e.x, e.y, x, y); proj({ x: e.x, y: e.y, vx: Math.cos(ang) * dist(e.x, e.y, x, y) / 1.3, vy: Math.sin(ang) * dist(e.x, e.y, x, y) / 1.3, r: 1, dmg: 0, from: 'x', life: 1.3, kind: 'nukeFly', ghost: true }); } return a.t > 2.4; },
  duck(e, a) {
    if (a.k === 0) { a.k = 1; G.banner = { text: T('ЛОЖИСЬ И НАКРОЙСЯ!', 'DUCK AND COVER!'), t: 2.6 }; a.shelters = []; for (let i = 0; i < 2; i++) { const s = freeSpot(G.map, 200, 300, 1400, 1050); if (s) a.shelters.push(s); } G.shelters = a.shelters; AU.play('telegraph'); }
    if (a.k === 1 && Math.floor(a.t * 4) % 2 === 0 && a.t % 0.25 < 0.02) AU.play('telegraph');
    if (a.k === 1 && a.t > 2.8) { a.k = 2; G.flash = 1; AU.play('boom'); const safe = a.shelters.some((s) => dist(s.x, s.y, G.P.x, G.P.y) < 70) || G.P.inv > 0; if (!safe) hurtPlayer(26, null); G.shelters = null; }
    return a.t > 3.3;
  },
  cadillac(e, a) { if (a.k === 0) { a.k = 1; a.y = clamp(G.P.y, 200, 1050); G.marks.push({ x: 800, y: a.y, line: true, t: 0, max: 1, col: [330, 70, 60] }); } if (a.k === 1 && a.t > 1) { a.k = 2; proj({ x: 20, y: a.y, vx: 760, vy: 0, r: 34, dmg: 18, from: 'e', life: 2.5, kind: 'caddy', ghost: true }); AU.play('roar'); } return a.t > 1.4; },
  agents(e, a) { if (a.k === 0) { a.k = 1; summon('agent', 3); } return a.t > 0.5; },
  tvs(e, a) { if (a.k === 0) { a.k = 1; summon('tvset', 2); } return a.t > 0.5; },
  // ── Вена ──
  paintings(e, a) { if (a.t > a.k * 0.45 && a.k < 3) { a.k++; const n = e.phase === 2 ? 5 : 3, a0 = angTo(e.x, e.y, G.P.x, G.P.y); for (let i = 0; i < n; i++) { const ang = a0 + (i / (n - 1) - 0.5) * 0.9; proj({ x: e.x, y: e.y, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, r: 15, dmg: 9, from: 'e', life: 3.5, kind: 'painting', hue: rand(360), spin: rand(-4, 4) }); } AU.play('throw'); } return a.t > 1.6; },
  watercolor(e, a) { return BOSS_ATK.wine(e, a); },
  critics(e, a) { if (a.k === 0) { a.k = 1; summon('critic', 3); } return a.t > 0.5; },
  tantrum(e, a, dt) {
    a.c = (a.c || 0) + dt;
    if (a.t < 2.4) { if (a.c > 0.07) { a.c = 0; const ang = a.t * 7; for (const k of [0, Math.PI]) eBullet(e.x, e.y, ang + k, 240, { hue: rand(360), kind: 'paint', r: 8, dmg: 8 }); } e.spin = a.t * 12; }
    else if (!e.dizzy) { e.dizzy = true; e.spin = 0; floatText(e.x, e.y - 70, T('ГОЛОВА КРУЖИТСЯ ×2', 'DIZZY ×2'), [50, 90, 60]); }
    if (a.t > 4.6) { e.dizzy = false; return true; } return false;
  },
};
