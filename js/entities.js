'use strict';
// ───────────── оружие, игрок, галлюцинации, снаряды, частицы ─────────────
const WEAP = {
  fists: { name: ['Кулаки', 'Fists'], kind: 'melee', dmg: 1, range: 30, arc: 1.3, cd: 0.28, knock: 170, dur: Infinity },
  umbrella: { name: ['Зонт', 'Umbrella'], kind: 'melee', dmg: 1.6, range: 54, arc: 1.9, cd: 0.42, knock: 250, dur: 22 },
  baguette: { name: ['Багет', 'Baguette'], kind: 'melee', dmg: 1.5, range: 50, arc: 1.7, cd: 0.34, knock: 190, dur: 18 },
  bottle: { name: ['Бутылка', 'Bottle'], kind: 'melee', dmg: 2.6, range: 40, arc: 1.3, cd: 0.38, knock: 160, dur: 3, breakTo: 'rose' },
  rose: { name: ['Розочка', 'Broken bottle'], kind: 'melee', dmg: 2.2, range: 36, arc: 1.1, cd: 0.22, knock: 80, dur: 14 },
  pan: { name: ['Сковорода', 'Frying pan'], kind: 'melee', dmg: 2.4, range: 46, arc: 1.8, cd: 0.55, knock: 430, dur: 25, stun: 0.8 },
  pipe: { name: ['Труба', 'Pipe'], kind: 'melee', dmg: 2.1, range: 58, arc: 1.5, cd: 0.44, knock: 270, dur: 24 },
  brick: { name: ['Кирпич', 'Brick'], kind: 'melee', dmg: 1.6, range: 32, arc: 1.0, cd: 0.4, knock: 210, dur: 10, throwDmg: 5 },
  // дары галлюцинаций
  bow: { name: ['Радужный лук', 'Rainbow bow'], kind: 'bow', gift: true, asp: 'heaven', desc: ['Держи — натягивай. Полный заряд пробивает насквозь.', 'Hold to draw. Full charge pierces through.'] },
  blaster: { name: ['Бластер-фен', 'Hairdryer blaster'], kind: 'gun', gift: true, asp: 'space', cd: 0.09, dmg: 0.75, desc: ['Скорострельный. Перегревается — не жадничай.', 'Rapid fire. Overheats — don\'t be greedy.'] },
  flamebrush: { name: ['Кисть-огнемёт', 'Flame brush'], kind: 'flame', gift: true, asp: 'hell', desc: ['Закрашивает галлюцинации горящим кадмием.', 'Paints over hallucinations with burning cadmium.'] },
  breadboom: { name: ['Хлеб-бумеранг', 'Bread boomerang'], kind: 'boomer', gift: true, asp: 'jesus', desc: ['Летит, режет всех, возвращается. Хлеб преломлённый.', 'Flies, cuts everyone, comes back. Bread, broken.'] },
  toaster: { name: ['Атомный тостер', 'Atomic toaster'], kind: 'toaster', gift: true, asp: 'atom', desc: ['Стреляет тостами, которые взрываются. Прогресс!', 'Fires exploding toast. Progress!'] },
  easel: { name: ['Мольберт-пушка', 'Easel cannon'], kind: 'easel', gift: true, asp: 'art', desc: ['Холсты пробивают ряды и «вставляют в раму» — оглушают.', 'Canvases pierce rows and "frame" enemies — stunning them.'] },
};
const GIFTS = ['bow', 'blaster', 'flamebrush', 'breadboom', 'toaster', 'easel'];
const PERKS = {
  foil: { name: ['Шапочка из фольги', 'Tinfoil hat'], desc: ['Шёпот, голоса и взгляды ранят вдвое слабее.', 'Whispers, voices and stares hurt half as much.'], asp: 'space' },
  halo: { name: ['Нимб', 'Halo'], desc: ['Рассудок понемногу восстанавливается сам.', 'Sanity slowly regenerates.'], asp: 'heaven' },
  horns: { name: ['Рога', 'Horns'], desc: ['Ближний бой: +60% урона.', 'Melee: +60% damage.'], asp: 'hell' },
  loaves: { name: ['Хлеба и рыбы', 'Loaves and fishes'], desc: ['Еда падает чаще и лечит в полтора раза сильнее.', 'Food drops more often and heals 50% more.'], asp: 'jesus' },
  duck: { name: ['Ложись и накройся', 'Duck and cover'], desc: ['Рывок перезаряжается быстрее, неуязвимость дольше.', 'Dash recharges faster, longer invulnerability.'], asp: 'atom' },
  palette: { name: ['Палитра', 'Palette'], desc: ['Попадания оставляют едкие лужи краски.', 'Hits leave caustic paint puddles.'], asp: 'art' },
  coffee: { name: ['Третья кружка кофе', 'Third cup of coffee'], desc: ['Скорость +15%, удары быстрее.', 'Speed +15%, faster attacks.'], asp: null },
};
const HEALS = { pill: 22, tea: 35, sandwich: 30 };

// ── враги-галлюцинации ──
const EDEF = {
  shover: { hp: 2, r: 14, spd: 85, dmg: 7, human: 'pass', beh: 'shover', tags: ['rush'], col: [210, 30, 45] },
  pigeon: { hp: 1, r: 9, spd: 210, dmg: 3, beh: 'flyer', fly: true, tags: ['swarm'], group: [4, 7], col: [225, 10, 60], draw: 'pigeon' },
  granny: { hp: 5, r: 18, spd: 55, dmg: 14, human: 'granny', beh: 'charger', chargeSpd: 400, tags: ['tank'], col: [355, 55, 42], scale: 1.12 },
  whisperer: { hp: 3, r: 14, spd: 95, dmg: 6, human: 'whisper', beh: 'ranged', words: 'whispers', keep: 270, fire: 2.5, tags: ['ranged'], col: [250, 15, 45], psy: true },
  starer: { hp: 4, r: 22, spd: 0, dmg: 11, beh: 'starer', tags: ['ranged', 'sniper'], col: [10, 50, 55], draw: 'eye', psy: true },
  gopnik: { hp: 4, r: 15, spd: 155, dmg: 12, human: 'gopnik', beh: 'lunger', tags: ['rush'], col: [225, 40, 30] },
  dog: { hp: 2, r: 13, spd: 245, dmg: 8, beh: 'dog', tags: ['rush', 'swarm'], group: [2, 3], col: [262, 30, 15], draw: 'dog' },
  courier: { hp: 3, r: 16, spd: 120, dmg: 16, human: 'courier', beh: 'charger', chargeSpd: 580, tags: ['flank'], col: [95, 70, 42] },
  voice: { hp: 3, r: 16, spd: 135, dmg: 10, beh: 'voice', fly: true, tags: ['sound', 'stalker'], col: [280, 60, 60], draw: 'voice', psy: true },
  melter: { hp: 7, r: 20, spd: 62, dmg: 12, beh: 'chaser', split: 'melterSmall', tags: ['tank'], col: [95, 45, 45], draw: 'melter' },
  melterSmall: { hp: 2, r: 12, spd: 120, dmg: 6, beh: 'chaser', tags: ['rush'], col: [95, 45, 45], draw: 'melter', scale: 0.6 },
  mouth: { hp: 5, r: 26, spd: 0, dmg: 18, beh: 'mouth', tags: ['ambush'], col: [355, 60, 42], draw: 'mouth' },
  phantom: { hp: 3, r: 14, spd: 170, dmg: 10, human: 'hallu', beh: 'chaser', tags: ['rush'], col: [300, 55, 45] },
  mannequin: { hp: 6, r: 14, spd: 290, dmg: 14, human: 'mannequin', beh: 'mannequin', tags: ['stalker'], col: [32, 30, 78], scale: 1.08 },
  cart: { hp: 5, r: 22, spd: 70, dmg: 15, beh: 'charger', chargeSpd: 540, bounce: 3, tags: ['charge'], col: [210, 8, 68], draw: 'cart' },
  canEye: { hp: 3, r: 15, spd: 0, dmg: 7, beh: 'turret', words: 'store', fire: 1.9, tags: ['ranged'], col: [200, 6, 72], draw: 'can', psy: true },
  sausage: { hp: 6, r: 13, spd: 155, dmg: 10, beh: 'snake', segs: 7, tags: ['rush'], col: [355, 50, 52], draw: 'snake' },
  mimic: { hp: 5, r: 20, spd: 205, dmg: 12, beh: 'mimic', tags: ['ambush'], col: [140, 30, 28], draw: 'mimic' },
  // помощники боссов
  cosmo: { hp: 2, r: 14, spd: 115, dmg: 6, human: 'hallu1', beh: 'ranged', words: 'space', keep: 300, fire: 2.2, tags: ['ranged'], col: [170, 60, 35], psy: true },
  cherub: { hp: 2, r: 12, spd: 195, dmg: 6, beh: 'flyer', fly: true, group: [3, 5], tags: ['swarm'], col: [15, 55, 78], draw: 'cherub' },
  angel: { hp: 3, r: 14, spd: 110, dmg: 7, human: 'angel', beh: 'ranged', words: 'heaven', keep: 280, fire: 2.4, tags: ['ranged'], col: [45, 30, 92], psy: true },
  imp: { hp: 2, r: 12, spd: 225, dmg: 7, human: 'imp', beh: 'dog', group: [2, 4], tags: ['rush'], col: [2, 75, 38], scale: 0.8 },
  fish: { hp: 1, r: 10, spd: 215, dmg: 5, beh: 'flyer', fly: true, group: [4, 7], tags: ['swarm'], col: [200, 15, 70], draw: 'fish' },
  agent: { hp: 3, r: 14, spd: 120, dmg: 7, human: 'agent', beh: 'ranged', words: 'atom', keep: 280, fire: 2.2, tags: ['ranged'], col: [210, 10, 25], psy: true },
  tvset: { hp: 4, r: 20, spd: 0, dmg: 10, beh: 'starer', tags: ['sniper'], col: [25, 40, 30], draw: 'tv', psy: true },
  critic: { hp: 3, r: 14, spd: 105, dmg: 7, human: 'critic', beh: 'ranged', words: 'art', keep: 260, fire: 2.2, tags: ['ranged'], col: [0, 0, 16], psy: true },
};

// кто приходит, прикинувшись обычным прохожим
const DISGUISE = ['gopnik', 'phantom', 'whisperer', 'courier', 'melter', 'granny'];

// ── игрок ──
function newPlayer(x, y) {
  return { x, y, vx: 0, vy: 0, r: 13, ang: -Math.PI / 2, hp: 100, max: 100, hand: { id: 'fists', dur: Infinity }, gift: null, active: 'hand',
    atkCd: 0, swing: null, swingSide: 1, charge: 0, dashT: 0, dashCd: 0, inv: 0, heat: 0, overheat: false, walk: 0, moveAmt: 0,
    hurtT: 0, sq: new Spring(260, 14), lean: new Spring(120, 12), flameT: 0, boomOut: false, slow: 0, dead: false, t: 0 };
}
function curW(p) { return p.active === 'gift' && p.gift ? p.gift : p.hand; }
function giftMul(p) { return p.gift ? 1 + 0.35 * (p.gift.lvl - 1) : 1; }

function updatePlayer(dt) {
  const p = G.P, I = INPUT;
  p.t += dt; p.atkCd -= dt * (gl('caffeine') ? 1.4 : 1) * (CHAOS.hyper > 0 ? 1.25 : 1); p.dashCd -= dt; p.inv -= dt; p.hurtT -= dt; p.slow -= dt;
  const spd = 235 * (G.perks.has('coffee') ? 1.15 : 1) * (p.slow > 0 ? 0.55 : 1) * (gl('caffeine') ? 1.3 : 1) * (CHAOS.hyper > 0 ? 1.1 : 1);
  if (p.dashT > 0) p.dashT -= dt;
  else { p.vx = damp(p.vx, I.mx * spd, 15, dt); p.vy = damp(p.vy, I.my * spd, 15, dt); }
  if (I.dashPressed && p.dashCd <= 0) {
    const a = I.mx || I.my ? Math.atan2(I.my, I.mx) : p.ang;
    p.dashT = 0.17; p.dashCd = G.perks.has('duck') ? 0.65 : 1.05; p.inv = Math.max(p.inv, G.perks.has('duck') ? 0.4 : 0.22);
    p.vx = Math.cos(a) * 660; p.vy = Math.sin(a) * 660; AU.play('dash'); p.sq.kick(-3);
    for (let i = 0; i < 8; i++) part(p.x, p.y, -p.vx * rand(0.05, 0.25) + rand(-60, 60), -p.vy * rand(0.05, 0.25) + rand(-60, 60), rand(0.3, 0.6), rand(4, 8), [44, 60, 70]);
  }
  p.x += p.vx * dt; p.y += p.vy * dt; collideCircle(G.map, p, p.r);
  p.ang = angLerp(p.ang, I.aimAng, 1 - Math.exp(-28 * dt));
  const sp = Math.hypot(p.vx, p.vy); p.moveAmt = damp(p.moveAmt, clamp(sp / 200, 0, 1), 10, dt); p.walk += sp * dt * 0.06;
  p.sq.update(0, dt); p.lean.update(clamp(sp / 400, 0, 0.6), dt);
  if (I.swapPressed && p.gift) { p.active = p.active === 'gift' ? 'hand' : 'gift'; AU.play('click'); p.charge = 0; }
  if (I.slot1) p.active = 'hand'; if (I.slot2 && p.gift) p.active = 'gift';
  weaponUpdate(p, dt);
  if (G.perks.has('halo') && p.hp < p.max) p.hp = Math.min(p.max, p.hp + dt * 1.4);
  // подбор
  let near = null, nd = 50;
  for (const k of G.pickups) {
    const d = dist(p.x, p.y, k.x, k.y);
    if (k.heal && d < 30) { const h = HEALS[k.id] * (G.perks.has('loaves') ? 1.5 : 1); p.hp = Math.min(p.max, p.hp + h); k.dead = true; if (k.onPick) k.onPick(); AU.play('heal'); floatText(k.x, k.y - 10, '+' + Math.round(h), [120, 60, 70]); continue; }
    if (!k.heal && d < nd && k.cool <= 0) { nd = d; near = k; }
  }
  G.nearPickup = near;
  if (near && (I.usePressed || (p.hand.id === 'fists' && nd < 26))) {
    if (p.hand.id !== 'fists') dropPickup(p.x, p.y, p.hand.id, p.hand.dur);
    p.hand = { id: near.id, dur: near.dur }; near.dead = true; p.active = 'hand'; AU.play('pickup');
  }
  if (p.swing) { p.swing.t += dt; if (p.swing.t >= p.swing.dur) p.swing = null; }
}

function weaponUpdate(p, dt) {
  const w = curW(p), d = WEAP[w.id], I = INPUT, gm = giftMul(p);
  if (!p.gift || p.active !== 'gift' || d.kind !== 'gun') p.heat = Math.max(0, p.heat - dt * 0.7);
  if (I.throwPressed && p.hand.id !== 'fists') { throwHand(p); return; }
  switch (d.kind) {
    case 'melee': if (I.fire && p.atkCd <= 0) meleeSwing(p, w, d); break;
    case 'gun':
      p.heat = Math.max(0, p.heat - dt * 0.55); if (p.overheat && p.heat < 0.25) p.overheat = false;
      if (I.fire && p.atkCd <= 0 && !p.overheat) {
        p.atkCd = d.cd * (G.perks.has('coffee') ? 0.85 : 1); p.heat += 0.065; if (p.heat >= 1) { p.overheat = true; AU.play('hurt'); }
        const a = p.ang + rand(-0.07, 0.07);
        proj({ x: p.x + Math.cos(p.ang) * 22, y: p.y + Math.sin(p.ang) * 22, vx: Math.cos(a) * 850, vy: Math.sin(a) * 850, r: 6, dmg: d.dmg * gm, from: 'p', life: 0.8, kind: 'bolt', hue: 300 + rand(-30, 30) });
        AU.play('shoot', 0, 0.8); p.sq.kick(1.5); G.cam.shake = Math.max(G.cam.shake, 1.5);
      }
      break;
    case 'bow':
      if (I.fire) { p.charge = Math.min(1, p.charge + dt * 1.5); }
      else if (p.charge > 0.08) {
        const c = p.charge; p.charge = 0; p.atkCd = 0.15;
        const s = 600 + 800 * c;
        proj({ x: p.x + Math.cos(p.ang) * 20, y: p.y + Math.sin(p.ang) * 20, vx: Math.cos(p.ang) * s, vy: Math.sin(p.ang) * s, r: 7, dmg: (1.2 + 4.5 * c) * gm, from: 'p', life: 1.1, kind: 'arrow', pierce: c > 0.85 ? 6 : 1, hue: G.t * 200 });
        AU.play('bow'); p.sq.kick(2 + c * 3);
      } else p.charge = 0;
      break;
    case 'flame':
      p.flameT -= dt;
      if (I.fire && p.flameT <= 0) {
        p.flameT = 0.03;
        for (let k = 0; k < 2; k++) { const a = p.ang + rand(-0.28, 0.28), s = rand(380, 520); proj({ x: p.x + Math.cos(p.ang) * 30, y: p.y + Math.sin(p.ang) * 30, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 10, dmg: 0.2 * gm, from: 'p', life: rand(0.35, 0.5), kind: 'flame', hue: rand(0, 45), pierce: 99, grow: 1 }); }
        if (chance(0.3)) AU.play('flame');
      }
      break;
    case 'boomer':
      if (I.fire && !p.boomOut && p.atkCd <= 0) {
        p.boomOut = true; p.atkCd = 0.2;
        proj({ x: p.x, y: p.y, vx: Math.cos(p.ang) * 720, vy: Math.sin(p.ang) * 720, r: 16, dmg: 2 * gm, from: 'p', life: 3, kind: 'boomer', pierce: 99, rehit: 0.25, home: 0 });
        AU.play('throw');
      }
      break;
    case 'toaster':
      if (I.fire && p.atkCd <= 0) { p.atkCd = 0.45; proj({ x: p.x + Math.cos(p.ang) * 20, y: p.y + Math.sin(p.ang) * 20, vx: Math.cos(p.ang) * 620, vy: Math.sin(p.ang) * 620, r: 8, dmg: 1.5 * gm, from: 'p', life: 0.9, kind: 'toast', boom: 80 * Math.sqrt(gm), boomDmg: 3 * gm }); AU.play('throw'); p.sq.kick(2); }
      break;
    case 'easel':
      if (I.fire && p.atkCd <= 0) { p.atkCd = 0.6; proj({ x: p.x + Math.cos(p.ang) * 20, y: p.y + Math.sin(p.ang) * 20, vx: Math.cos(p.ang) * 700, vy: Math.sin(p.ang) * 700, r: 14, dmg: 2.4 * gm, from: 'p', life: 1, kind: 'canvas', pierce: 4, stun: 1.3 }); AU.play('throw'); p.sq.kick(3); }
      break;
  }
}

function meleeSwing(p, w, d) {
  const cdm = G.perks.has('coffee') ? 0.82 : 1;
  p.atkCd = d.cd * cdm; p.swingSide *= -1;
  p.swing = { t: 0, dur: Math.max(0.16, d.cd * 0.7 * cdm), side: p.swingSide, arc: d.arc, range: d.range, ang: p.ang };
  AU.play('swing'); p.sq.kick(2.4);
  const dmg = d.dmg * (G.perks.has('horns') ? 1.6 : 1);
  let hitAny = false;
  for (const e of G.enemies) {
    if (e.dead || e.hidden) continue;
    const rr = d.range + e.r + 14, dd = dist(p.x, p.y, e.x, e.y);
    if (dd > rr) continue;
    if (Math.abs(wrapA(angTo(p.x, p.y, e.x, e.y) - p.ang)) > d.arc / 2 + (dd < 30 ? 1.2 : 0.25)) continue;
    hitEnemy(e, dmg, angTo(p.x, p.y, e.x, e.y), d.knock, 'melee', d.stun);
    hitAny = true;
  }
  for (const b of G.projs) {
    if (b.from !== 'e' || b.dead) continue;
    if (dist(p.x, p.y, b.x, b.y) < d.range + 26 && Math.abs(wrapA(angTo(p.x, p.y, b.x, b.y) - p.ang)) < d.arc / 2 + 0.4) { killProj(b, true); hitAny = true; }
  }
  if (hitAny && w.dur !== Infinity) {
    w.dur--;
    if (w.dur <= 0) {
      AU.play('break'); for (let i = 0; i < 10; i++) part(p.x + Math.cos(p.ang) * 30, p.y + Math.sin(p.ang) * 30, rand(-150, 150), rand(-150, 150), 0.5, rand(2, 5), [130, 30, 70], 'spark');
      if (d.breakTo) p.hand = { id: d.breakTo, dur: WEAP[d.breakTo].dur }; else p.hand = { id: 'fists', dur: Infinity };
    }
  }
}
function throwHand(p) {
  const id = p.hand.id, d = WEAP[id];
  proj({ x: p.x + Math.cos(p.ang) * 16, y: p.y + Math.sin(p.ang) * 16, vx: Math.cos(p.ang) * 760, vy: Math.sin(p.ang) * 760, r: 10, dmg: d.throwDmg || 2.6, from: 'p', life: 0.55, kind: 'thrown', wid: id, wdur: p.hand.dur, stun: 1, spin: 0 });
  p.hand = { id: 'fists', dur: Infinity }; p.active = 'hand'; AU.play('throw'); p.atkCd = 0.2;
}
function dropPickup(x, y, id, dur) { if (id === 'fists') return; G.pickups.push({ x, y, id, dur: dur === undefined ? WEAP[id].dur : dur, heal: !!HEALS[id], cool: 0.6, t: rand(10), dead: false }); }
function addPickup(x, y, id) { G.pickups.push({ x, y, id, dur: HEALS[id] ? 0 : WEAP[id].dur, heal: !!HEALS[id], cool: 0, t: rand(10), dead: false }); }

function hurtPlayer(dmg, src, psy) {
  const p = G.P; if (p.inv > 0 || p.dead || G.flags.god) return;
  if (psy && G.perks.has('foil')) dmg *= 0.5;
  chaosOnHurt();
  p.hp -= dmg; p.inv = 0.5; p.hurtT = 0.35; G.stats.dmg += dmg;
  G.cam.shake = Math.max(G.cam.shake, 7); AU.play('hurt'); p.sq.kick(-4);
  if (src) { const a = angTo(src.x, src.y, p.x, p.y); p.vx += Math.cos(a) * 260; p.vy += Math.sin(a) * 260; }
  if (G.director) G.director.onHurt(dmg, src);
  for (let i = 0; i < 6; i++) part(p.x, p.y, rand(-120, 120), rand(-120, 120), 0.5, rand(3, 6), [44, 70, 55]);
  if (p.hp <= 0) { p.hp = 0; p.dead = true; onPlayerDeath(); }
}

// ── галлюцинации ──
let ENEMY_ID = 1;
function spawnEnemy(type, x, y, extra = {}) {
  const d = EDEF[type];
  const e = { id: ENEMY_ID++, type, def: d, x, y, vx: 0, vy: 0, kx: 0, ky: 0, r: d.r, hp: d.hp, maxHp: d.hp, ang: angTo(x, y, G.P.x, G.P.y), t: 0, st: 'go', stT: 0,
    spawnT: 0, flash: 0, sq: new Spring(240, 12), walk: rand(10), moveAmt: 0, seed: rand(100), contactCd: 0, stun: 0, fireT: rand(0.5, 1.5) + (d.fire || 0) * 0.5, dead: false, ...extra };
  if (d.human) {
    if (d.human === 'pass') e.spr = 'pass' + randi(0, 7);
    else if (d.human === 'hallu') e.spr = 'hallu' + randi(0, 2);
    else e.spr = d.human;
  }
  if (d.beh === 'snake') { e.segs = []; for (let i = 0; i < d.segs; i++) e.segs.push({ x: x - i * 14, y }); }
  if (d.beh === 'voice') { AU.speak(tr(pick(TXT.voices)), clamp((x - G.P.x) / 500, -1, 1)); caption(tr(pick(TXT.voices)), x, y); }
  if (d.beh === 'mouth') { e.hidden = true; e.st = 'under'; e.stT = rand(0.3, 0.8); }
  if (d.beh === 'starer') e.st = 'track';
  if (d.beh === 'mimic') e.st = 'hide';
  e.r0 = e.r; e.gScale = 1; e.spdMul = e.spdMul || 1;
  const stage = G.zoneI >= 0 ? ZONES[G.zoneI].stage : -1;
  if (!e.ambient && stage >= 0 && !d.group && !d.fly && !['mouth', 'turret', 'mimic', 'starer'].includes(d.beh) && chance(0.04 + 0.035 * stage)) { e.elite = true; e.hp = e.maxHp = d.hp * 2.2; e.r0 = e.r = d.r * 1.25; }
  if (!e.ambient && stage >= 1 && stage <= 3 && DISGUISE.includes(type) && chance(0.55)) e.disg = 'pass' + randi(0, 7);
  if (CHAOS.glitch && CHAOS.glitch.def.spawn) CHAOS.glitch.def.spawn(e);
  G.enemies.push(e);
  return e;
}

function hitEnemy(e, dmg, ang, knock, src, stun) {
  if (e.dead || e.hidden || e.invuln) return false;
  dmg *= dmgMul();
  if (e.boss) { bossHit(e, dmg, ang, src); return true; }
  e.hp -= dmg; e.flash = 0.13; e.sq.kick(5);
  const kb = knock * (e.def.beh === 'starer' || e.def.beh === 'turret' || e.def.beh === 'mouth' ? 0 : 1) / (e.def.scale || 1);
  e.kx += Math.cos(ang) * kb; e.ky += Math.sin(ang) * kb;
  if (stun) e.stun = Math.max(e.stun, stun);
  if (e.def.beh === 'voice') e.reveal = 1;
  G.hitstop = Math.max(G.hitstop, src === 'melee' ? 0.045 : 0.015);
  G.cam.shake = Math.max(G.cam.shake, src === 'melee' ? 4 : 2);
  AU.play('hit', pan(e.x), src === 'melee' ? 1 : 0.5);
  for (let i = 0; i < 5; i++) part(e.x, e.y, Math.cos(ang + rand(-0.6, 0.6)) * rand(80, 260), Math.sin(ang + rand(-0.6, 0.6)) * rand(80, 260), rand(0.3, 0.6), rand(3, 7), e.def.col);
  if (G.perks.has('palette') && chance(0.4)) G.puddles.push({ x: e.x, y: e.y, r: 34, life: 3, hue: rand(360) });
  if (e.hp <= 0) killEnemy(e, src);
  return true;
}
function killEnemy(e, src) {
  e.dead = true; G.stats.kills++; if (src === 'melee') G.stats.melee++; else G.stats.ranged++;
  if (G.director) G.director.onKill(e, src);
  chaosOnKill(e);
  if (e.elite) addPickup(e.x, e.y, chance(0.5) ? pick(['tea', 'sandwich']) : pick(['pan', 'pipe', 'umbrella', 'baguette', 'bottle']));
  else if (!e.ambient && chance(0.03)) addPickup(e.x, e.y, pick(['brick', 'bottle', 'baguette', 'umbrella']));
  AU.play('splat', pan(e.x));
  decal(G.map, e.x, e.y, 14 + e.r * 0.9, e.def.col);
  for (let i = 0; i < 14; i++) { const a = rand(TAU), s = rand(60, 260); part(e.x, e.y, Math.cos(a) * s, Math.sin(a) * s, rand(0.4, 0.9), rand(4, 10), [e.def.col[0] + rand(-20, 20), e.def.col[1], e.def.col[2] + rand(-15, 15)]); }
  if (e.def.split) for (let i = 0; i < 2; i++) { const c = spawnEnemy(e.def.split, e.x + rand(-10, 10), e.y + rand(-10, 10)); c.spawnT = 0.6; c.kx = rand(-200, 200); c.ky = rand(-200, 200); }
  const food = G.perks.has('loaves') ? 0.09 : 0.045;
  if (chance(food) && !e.boss) addPickup(e.x, e.y, pick(['pill', 'sandwich', 'tea']));
  if (e.def.beh === 'snake') for (const s of e.segs) decal(G.map, s.x, s.y, 10, e.def.col);
}
const pan = (x) => clamp((x - G.P.x) / 600, -1, 1);

// поведение
function steerTo(e, tx, ty, spd, dt, k = 8) {
  let a;
  if (e.def.fly || losClear(G.map, e.x, e.y, tx, ty)) a = angTo(e.x, e.y, tx, ty);
  else a = flowAngle(G.map, e.x, e.y); if (a === null) a = angTo(e.x, e.y, tx, ty);
  e.vx = damp(e.vx, Math.cos(a) * spd, k, dt); e.vy = damp(e.vy, Math.sin(a) * spd, k, dt);
  e.ang = angLerp(e.ang, Math.atan2(e.vy, e.vx), 1 - Math.exp(-10 * dt));
}
function contact(e, mult = 1) { const p = G.P; if (e.contactCd <= 0 && dist(e.x, e.y, p.x, p.y) < e.r + p.r + 2) { hurtPlayer(e.def.dmg * mult, e, e.def.psy); e.contactCd = 0.9; return true; } return false; }

const BEH = {
  mimic(e, dt) {
    const p = G.P, d = dist(e.x, e.y, p.x, p.y); e.stT -= dt;
    if (e.st === 'hide') { e.vx = e.vy = 0; if (d < 150 || e.hp < e.maxHp) { e.st = 'wake'; e.stT = 0.55; AU.play('roar', pan(e.x), 0.4); AU.play('morph', pan(e.x)); } }
    else if (e.st === 'wake') { e.vx = e.vy = 0; if (e.stT <= 0) { e.st = 'go'; e.sq.kick(10); } }
    else { steerTo(e, p.x, p.y, e.def.spd, dt, 6); contact(e); }
  },
  shover(e, dt) {
    const p = G.P, d = dist(e.x, e.y, p.x, p.y);
    if (e.st === 'go') {
      const sp = d < 170 ? e.def.spd * 2.1 : e.def.spd;
      steerTo(e, p.x, p.y, sp, dt, 5);
      if (contact(e)) { e.st = 'back'; e.stT = rand(1.2, 2); e.kx -= Math.cos(e.ang) * 150; e.ky -= Math.sin(e.ang) * 150; AU.play('swing', pan(e.x)); }
    } else { e.stT -= dt; steerTo(e, e.x * 2 - p.x, e.y * 2 - p.y, e.def.spd, dt, 3); if (e.stT <= 0) e.st = 'go'; }
  },
  chaser(e, dt) { steerTo(e, G.P.x, G.P.y, e.def.spd * (1 + Math.sin(e.t * 3 + e.seed) * 0.15), dt, 6); contact(e); },
  flyer(e, dt) {
    const p = G.P; e.stT -= dt;
    if (e.st === 'go') { // кружим
      const a = angTo(p.x, p.y, e.x, e.y) + 0.9 * dt * (e.seed > 50 ? 1 : -1) * 2;
      const R = 150 + Math.sin(e.t * 2 + e.seed) * 40;
      const tx = p.x + Math.cos(a) * R, ty = p.y + Math.sin(a) * R;
      e.vx = damp(e.vx, (tx - e.x) * 3, 4, dt); e.vy = damp(e.vy, (ty - e.y) * 3, 4, dt);
      if (e.stT <= 0) { e.st = 'dive'; e.stT = 0.7; const a2 = angTo(e.x, e.y, p.x, p.y); e.vx = Math.cos(a2) * e.def.spd * 1.8; e.vy = Math.sin(a2) * e.def.spd * 1.8; if (e.type === 'pigeon') AU.play('coo', pan(e.x)); }
    } else { contact(e); if (e.stT <= 0) { e.st = 'go'; e.stT = rand(1.2, 2.6); } }
    const sp = Math.hypot(e.vx, e.vy); if (sp > e.def.spd * 2) { e.vx *= (e.def.spd * 2) / sp; e.vy *= (e.def.spd * 2) / sp; }
    e.ang = Math.atan2(e.vy, e.vx);
  },
  charger(e, dt) {
    const p = G.P, d = dist(e.x, e.y, p.x, p.y); e.stT -= dt;
    if (e.st === 'go') { steerTo(e, p.x, p.y, e.def.spd, dt, 5); if (d < 300 && losClear(G.map, e.x, e.y, p.x, p.y)) { e.st = 'wind'; e.stT = 0.65; e.chA = angTo(e.x, e.y, p.x, p.y); AU.play('telegraph', pan(e.x)); } }
    else if (e.st === 'wind') { e.vx = damp(e.vx, 0, 10, dt); e.vy = damp(e.vy, 0, 10, dt); e.chA = angLerp(e.chA, angTo(e.x, e.y, p.x, p.y), 0.05); e.ang = e.chA; if (e.stT <= 0) { e.st = 'charge'; e.stT = 0.8; e.bounces = e.def.bounce || 0; } }
    else if (e.st === 'charge') {
      e.vx = Math.cos(e.chA) * e.def.chargeSpd; e.vy = Math.sin(e.chA) * e.def.chargeSpd;
      if (contact(e)) { e.st = 'rest'; e.stT = 0.7; }
      if (e.wallHit) { if (e.bounces > 0) { e.bounces--; e.chA = e.chA + Math.PI + rand(-0.5, 0.5); e.stT = 0.6; AU.play('hit', pan(e.x), 0.4); } else { e.st = 'rest'; e.stT = 1; e.stun = 0.8; G.cam.shake = Math.max(G.cam.shake, 3); } }
      if (e.stT <= 0) { e.st = 'rest'; e.stT = 0.6; }
    } else { e.vx = damp(e.vx, 0, 6, dt); e.vy = damp(e.vy, 0, 6, dt); if (e.stT <= 0) e.st = 'go'; }
  },
  lunger(e, dt) {
    const p = G.P, d = dist(e.x, e.y, p.x, p.y); e.stT -= dt;
    if (e.st === 'go') { steerTo(e, p.x + Math.cos(e.t + e.seed) * 40, p.y + Math.sin(e.t + e.seed) * 40, e.def.spd, dt, 7); if (d < 130) { e.st = 'wind'; e.stT = 0.33; AU.play('telegraph', pan(e.x)); } }
    else if (e.st === 'wind') { e.vx = damp(e.vx, -Math.cos(e.ang) * 60, 10, dt); e.vy = damp(e.vy, -Math.sin(e.ang) * 60, 10, dt); e.ang = angLerp(e.ang, angTo(e.x, e.y, p.x, p.y), 0.2); if (e.stT <= 0) { e.st = 'lunge'; e.stT = 0.24; } }
    else if (e.st === 'lunge') { e.vx = Math.cos(e.ang) * 560; e.vy = Math.sin(e.ang) * 560; if (contact(e)) { e.st = 'rest'; e.stT = 0.8; } if (e.stT <= 0) { e.st = 'rest'; e.stT = 0.7; } }
    else { e.vx = damp(e.vx, 0, 8, dt); e.vy = damp(e.vy, 0, 8, dt); if (e.stT <= 0) e.st = 'go'; }
  },
  dog(e, dt) {
    const p = G.P, d = dist(e.x, e.y, p.x, p.y); e.stT -= dt;
    if (e.st === 'go') { const zig = Math.sin(e.t * 7 + e.seed) * 60; const a = angTo(e.x, e.y, p.x, p.y) + Math.PI / 2; steerTo(e, p.x + Math.cos(a) * zig, p.y + Math.sin(a) * zig, e.def.spd, dt, 7); if (d < 95) { e.st = 'leap'; e.stT = 0.3; e.ang = angTo(e.x, e.y, p.x, p.y); if (e.type === 'dog') AU.play('bark', pan(e.x)); } contact(e, 0.6); }
    else if (e.st === 'leap') { e.vx = Math.cos(e.ang) * 480; e.vy = Math.sin(e.ang) * 480; if (contact(e)) { e.st = 'rest'; e.stT = 0.5; } if (e.stT <= 0) { e.st = 'rest'; e.stT = 0.45; } }
    else { e.vx = damp(e.vx, 0, 7, dt); e.vy = damp(e.vy, 0, 7, dt); if (e.stT <= 0) e.st = 'go'; }
  },
  ranged(e, dt) {
    const p = G.P, d = dist(e.x, e.y, p.x, p.y), los = losClear(G.map, e.x, e.y, p.x, p.y);
    const keep = e.def.keep || 260;
    if (d > keep + 80 || !los) steerTo(e, p.x, p.y, e.def.spd, dt, 5);
    else if (d < keep - 80) steerTo(e, e.x * 2 - p.x, e.y * 2 - p.y, e.def.spd, dt, 5);
    else { const a = angTo(p.x, p.y, e.x, e.y) + (e.seed > 50 ? 1 : -1) * 0.6; steerTo(e, p.x + Math.cos(a) * keep, p.y + Math.sin(a) * keep, e.def.spd * 0.7, dt, 3); }
    e.ang = angLerp(e.ang, angTo(e.x, e.y, p.x, p.y), 0.1);
    e.fireT -= dt;
    if (e.fireT < 0.5 && e.fireT + dt >= 0.5 && los && d < 700) e.mouthOpen = 0.5;
    if (e.fireT <= 0) { e.fireT = e.def.fire * rand(0.8, 1.25); if (los && d < 720) shootWord(e, e.def.words); }
    e.mouthOpen = Math.max(0, (e.mouthOpen || 0) - dt);
    contact(e, 0.5);
  },
  turret(e, dt) {
    const p = G.P; e.vx = e.vy = 0; e.ang = angTo(e.x, e.y, p.x, p.y); e.fireT -= dt;
    if (e.fireT <= 0) { e.fireT = e.def.fire * rand(0.8, 1.2); if (dist(e.x, e.y, p.x, p.y) < 760) shootWord(e, e.def.words); }
  },
  starer(e, dt) {
    const p = G.P; e.vx = e.vy = 0; e.stT -= dt;
    const look = angTo(e.x, e.y, p.x, p.y);
    if (e.st === 'track') { e.ang = angLerp(e.ang, look, 0.08); if (e.stT <= 0) { e.st = 'aim'; e.stT = 0.9; AU.play('telegraph', pan(e.x)); } }
    else if (e.st === 'aim') { e.ang = angLerp(e.ang, look, 0.03); if (e.stT <= 0) { e.st = 'fire'; e.stT = 0.28; AU.play('zap', pan(e.x)); G.cam.shake = Math.max(G.cam.shake, 2); } }
    else if (e.st === 'fire') {
      const L = beamLen(e.x, e.y, e.ang, 900); e.beamL = L;
      if (segDist(p.x, p.y, e.x, e.y, e.x + Math.cos(e.ang) * L, e.y + Math.sin(e.ang) * L) < p.r + 8) hurtPlayer(e.def.dmg, e, true);
      if (e.stT <= 0) { e.st = 'track'; e.stT = rand(1.6, 2.6); }
    }
  },
  voice(e, dt) {
    const p = G.P, d = dist(e.x, e.y, p.x, p.y); e.stT -= dt; e.reveal = Math.max(0, (e.reveal || 0) - dt * 1.5);
    e.ripT = (e.ripT || 0) - dt;
    if (e.ripT <= 0) { e.ripT = e.st === 'wind' ? 0.12 : 1.1; ring(e.x, e.y, e.st === 'wind' ? [0, 80, 55] : [280, 60, 70], e.st === 'wind' ? 90 : 60); if (e.st !== 'wind' && chance(0.3)) AU.play('whisper', pan(e.x), 0.5); }
    if (e.st === 'go') { steerTo(e, p.x, p.y, e.def.spd, dt, 3); if (d < 80) { e.st = 'wind'; e.stT = 0.55; AU.play('scream', pan(e.x), 0.6); caption(tr(pick(TXT.voices)), e.x, e.y); } }
    else if (e.st === 'wind') { e.vx = damp(e.vx, 0, 8, dt); e.vy = damp(e.vy, 0, 8, dt); e.reveal = Math.max(e.reveal, 0.6); if (e.stT <= 0) { if (dist(e.x, e.y, p.x, p.y) < 100) hurtPlayer(e.def.dmg, e, true); ring(e.x, e.y, [0, 90, 60], 110); e.st = 'rest'; e.stT = 1.2; } }
    else { steerTo(e, e.x * 2 - p.x, e.y * 2 - p.y, e.def.spd * 0.6, dt, 3); if (e.stT <= 0) e.st = 'go'; }
  },
  mouth(e, dt) {
    const p = G.P; e.stT -= dt; e.vx = e.vy = 0;
    if (e.st === 'under') { e.hidden = true; if (e.stT <= 0) { const a = rand(TAU), r = rand(20, 90); e.x = p.x + Math.cos(a) * r + p.vx * 0.3; e.y = p.y + Math.sin(a) * r + p.vy * 0.3; if (isBlocked(G.map, e.x, e.y)) { e.stT = 0.2; return; } e.st = 'tele'; e.stT = 0.9; AU.play('telegraph', pan(e.x)); } }
    else if (e.st === 'tele') { if (e.stT <= 0) { e.hidden = false; e.st = 'bite'; e.stT = 0.25; e.sq.kick(8); G.cam.shake = Math.max(G.cam.shake, 4); if (dist(e.x, e.y, p.x, p.y) < 52) hurtPlayer(e.def.dmg, e); AU.play('hit', pan(e.x)); } }
    else if (e.st === 'bite') { if (e.stT <= 0) { e.st = 'open'; e.stT = 1.6; } }
    else if (e.st === 'open') { if (e.stT <= 0) { e.st = 'under'; e.stT = rand(0.8, 1.6); e.hidden = true; } }
  },
  mannequin(e, dt) {
    const p = G.P, d = dist(e.x, e.y, p.x, p.y);
    const seen = d < 760 && Math.abs(wrapA(angTo(p.x, p.y, e.x, e.y) - p.ang)) < 0.95 && losClear(G.map, p.x, p.y, e.x, e.y);
    if (seen && e.spawnT > 0.9) { e.vx = 0; e.vy = 0; e.frozen = true; }
    else { if (e.frozen) AU.play('telegraph', pan(e.x)); e.frozen = false; steerTo(e, p.x, p.y, e.def.spd, dt, 14); contact(e); }
  },
  snake(e, dt) {
    const p = G.P; const wig = Math.sin(e.t * 6) * 0.9;
    const a = (losClear(G.map, e.x, e.y, p.x, p.y) ? angTo(e.x, e.y, p.x, p.y) : flowAngle(G.map, e.x, e.y) ?? angTo(e.x, e.y, p.x, p.y)) + wig;
    e.vx = damp(e.vx, Math.cos(a) * e.def.spd, 5, dt); e.vy = damp(e.vy, Math.sin(a) * e.def.spd, 5, dt);
    e.ang = Math.atan2(e.vy, e.vx);
    contact(e);
    for (const s of e.segs) if (dist(s.x, s.y, p.x, p.y) < 10 + p.r && e.contactCd <= 0) { hurtPlayer(e.def.dmg * 0.6, e); e.contactCd = 0.9; }
  },
};
function updateSnakeSegs(e) { let px = e.x, py = e.y; for (const s of e.segs) { const d = dist(px, py, s.x, s.y), L = 15; if (d > L) { s.x = px + ((s.x - px) / d) * L; s.y = py + ((s.y - py) / d) * L; } px = s.x; py = s.y; } }
function beamLen(x, y, a, max) { const c = Math.cos(a), s = Math.sin(a); for (let L = 20; L < max; L += 12) if (pointSolid(G.map, x + c * L, y + s * L)) return L; return max; }
function segDist(px, py, ax, ay, bx, by) { const bax = bx - ax, bay = by - ay, h = clamp(((px - ax) * bax + (py - ay) * bay) / (bax * bax + bay * bay || 1), 0, 1); return Math.hypot(px - ax - bax * h, py - ay - bay * h); }

function shootWord(e, set, spd = 220, ang) {
  const src = set === 'whispers' ? TXT.whispers : set === 'store' ? TXT.store : TXT.bossWords[set] || TXT.whispers;
  const a = ang === undefined ? angTo(e.x, e.y, G.P.x, G.P.y) + rand(-0.08, 0.08) : ang;
  const text = tr(pick(src));
  proj({ x: e.x + Math.cos(a) * (e.r + 6), y: e.y + Math.sin(a) * (e.r + 6), vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 14, dmg: e.def ? e.def.dmg : 7, from: 'e', life: 4, kind: 'word', text, psy: true, hue: e.def ? e.def.col[0] : 0, wob: rand(TAU) });
  AU.play('word', pan(e.x));
}

function updateEnemies(dt) {
  const p = G.P;
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.t += dt; e.spawnT = Math.min(1, e.spawnT + dt * 1.8); e.flash -= dt; e.contactCd -= dt; e.wallHit = false;
    if (e.boss) { updateBoss(e, dt); continue; }
    if (e.ttl !== undefined) { e.ttl -= dt; if (e.ttl <= 0) { e.dead = true; ring(e.x, e.y, e.def.col, 30); continue; } }
    if (e.morphT > 0) {
      e.morphT -= dt; e.vx = damp(e.vx, 0, 10, dt); e.vy = damp(e.vy, 0, 10, dt);
      if (chance(dt * 45)) { const a = rand(TAU); part(e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 34, -Math.sin(a) * 170, Math.cos(a) * 170, 0.5, rand(4, 9), [rand(360), 80, 60]); }
      if (e.morphT <= 0) { e.morphFrom = null; e.sq.kick(12); ring(e.x, e.y, e.def.col, 80); }
    } else if (e.disg) { steerTo(e, p.x, p.y, 55, dt, 3); if (dist(e.x, e.y, p.x, p.y) < 210 || e.hp < e.maxHp) beginMorph(e); }
    else if (e.stun > 0) { e.stun -= dt; e.vx = damp(e.vx, 0, 8, dt); e.vy = damp(e.vy, 0, 8, dt); }
    else if (e.spawnT > 0.35) BEH[e.def.beh](e, dt);
    const sm = e.spdMul || 1;
    e.x += (e.vx * sm + e.kx) * dt; e.y += (e.vy * sm + e.ky) * dt;
    e.kx = damp(e.kx, 0, 7, dt); e.ky = damp(e.ky, 0, 7, dt);
    if (!e.def.fly && !e.hidden) { if (collideCircle(G.map, e, e.r)) e.wallHit = true; }
    else { e.x = clamp(e.x, 20, G.map.w - 20); e.y = clamp(e.y, 20, G.map.h - 20); }
    if (e.segs) updateSnakeSegs(e);
    const sp = Math.hypot(e.vx, e.vy); e.moveAmt = damp(e.moveAmt, clamp(sp / 150, 0, 1), 8, dt); e.walk += sp * dt * 0.06;
    e.sq.update(0, dt);
  }
  // расталкивание
  const E = G.enemies;
  for (let i = 0; i < E.length; i++) {
    const a = E[i]; if (a.dead || a.hidden || a.def.beh === 'starer' || a.def.beh === 'turret') continue;
    for (let j = i + 1; j < E.length; j++) {
      const b = E[j]; if (b.dead || b.hidden || b.boss || a.boss) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r; const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2), k = (rr - d) / d * 0.5; a.x -= dx * k; a.y -= dy * k; if (b.def.beh !== 'starer' && b.def.beh !== 'turret') { b.x += dx * k; b.y += dy * k; } }
    }
  }
  G.enemies = G.enemies.filter((e) => !e.dead);
}
// Прохожий сбрасывает маску: превращение в галлюцинацию
function beginMorph(e) { e.morphFrom = e.disg; e.disg = null; e.morphT = 0.7; AU.play('morph', pan(e.x)); CHAOS.trip = Math.max(CHAOS.trip, 0.3); }

// ── снаряды ──
function proj(o) { o.t = 0; o.dead = false; o.hit = new Map(); G.projs.push(o); return o; }
function killProj(b, byPlayer) {
  b.dead = true;
  if (b.kind === 'word') { for (let i = 0; i < 8; i++) part(b.x, b.y, rand(-140, 140), rand(-140, 140), 0.5, rand(2, 5), [b.hue, 30, 80], 'spark'); if (byPlayer) { AU.play('break', 0, 0.4); chaosOnWord(); } }
  if (b.kind === 'toast') explode(b.x, b.y, b.boom, b.boomDmg, 'p');
  if (b.kind === 'nuke') explode(b.x, b.y, b.boom || 120, b.dmg, 'e');
  if (b.kind === 'thrown') {
    if (b.wid === 'bottle') { AU.play('break'); for (let i = 0; i < 10; i++) part(b.x, b.y, rand(-180, 180), rand(-180, 180), 0.5, rand(2, 4), [130, 40, 60], 'spark'); }
    else { const s = { x: b.x, y: b.y }; collideCircle(G.map, s, 10); dropPickup(s.x, s.y, b.wid, b.wdur); }
  }
  if (b.kind === 'boomer') G.P.boomOut = false;
}
function explode(x, y, R, dmg, from) {
  AU.play('boom', pan(x)); G.cam.shake = Math.max(G.cam.shake, 10);
  ring(x, y, [30, 90, 60], R * 1.2);
  for (let i = 0; i < 26; i++) { const a = rand(TAU), s = rand(80, 380); part(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.4, 0.9), rand(6, 14), [rand(10, 50), 90, rand(50, 70)]); }
  decal(G.map, x, y, R * 0.5, [20, 40, 20]);
  if (from === 'p') { for (const e of G.enemies) if (!e.dead && dist(x, y, e.x, e.y) < R + e.r) hitEnemy(e, dmg, angTo(x, y, e.x, e.y), 300, 'ranged'); }
  else if (dist(x, y, G.P.x, G.P.y) < R + G.P.r) hurtPlayer(dmg, { x, y });
}
function updateProjs(dtP, tm = 1) {
  const p = G.P;
  for (const b of G.projs) {
    if (b.dead) continue;
    const dt = b.from === 'p' ? dtP : dtP * tm;
    b.t += dt;
    if (b.kind === 'boomer') { // летит, тормозит, возвращается
      const back = b.t > 0.42;
      if (back) { const a = angTo(b.x, b.y, p.x, p.y); b.vx = damp(b.vx, Math.cos(a) * 820, 6, dt); b.vy = damp(b.vy, Math.sin(a) * 820, 6, dt); if (dist(b.x, b.y, p.x, p.y) < 24) { killProj(b); continue; } }
      else { b.vx *= 1 - dt * 1.8; b.vy *= 1 - dt * 1.8; }
    }
    if (b.home) { const t = b.homeT || G.P; const a = angTo(b.x, b.y, t.x, t.y), s = Math.hypot(b.vx, b.vy), cur = Math.atan2(b.vy, b.vx); const na = angLerp(cur, a, b.home * dt); b.vx = Math.cos(na) * s; b.vy = Math.sin(na) * s; }
    if (b.grow) b.r += dt * 26;
    if (b.split && b.t > b.split) { b.split = 0; const s = Math.hypot(b.vx, b.vy), a = Math.atan2(b.vy, b.vx); for (const k of [-0.5, 0.5]) proj({ ...b, hit: new Map(), vx: Math.cos(a + k) * s, vy: Math.sin(a + k) * s, split: b.gen > 0 ? 0.7 : 0, gen: (b.gen || 0) - 1, t: 0, life: 2 }); b.dead = true; continue; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.slowdown) { b.vx *= 1 - b.slowdown * dt; b.vy *= 1 - b.slowdown * dt; }
    if (b.t > b.life) { if (b.kind === 'puddleMaker') G.puddles.push({ x: b.x, y: b.y, r: 50, life: 4, hue: 330, slow: true, enemy: true }); killProj(b); continue; }
    if (b.kind !== 'boomer' && b.kind !== 'word' && !b.ghost && pointSolid(G.map, b.x, b.y)) { if (b.kind === 'flame') { b.dead = true; continue; } killProj(b); continue; }
    if (b.kind === 'word' && b.t > 0.3 && pointSolid(G.map, b.x, b.y)) { killProj(b); continue; }
    if (b.from === 'p') {
      for (const e of G.enemies) {
        if (e.dead || e.hidden) continue;
        const rr = b.r + e.r * (e.boss ? e.hitR || 1 : 1);
        const ex = e.boss ? e.x + (e.hx || 0) : e.x, ey = e.boss ? e.y + (e.hy || 0) : e.y;
        let hit = dist2(b.x, b.y, ex, ey) < rr * rr;
        if (!hit && e.segs) for (const s of e.segs) if (dist2(b.x, b.y, s.x, s.y) < (b.r + 10) ** 2) { hit = true; break; }
        if (!hit) continue;
        const last = b.hit.get(e.id);
        if (last !== undefined && (!b.rehit || b.t - last < b.rehit)) continue;
        b.hit.set(e.id, b.t);
        hitEnemy(e, b.dmg, Math.atan2(b.vy, b.vx), b.kind === 'flame' ? 30 : b.kind === 'thrown' ? 300 : 140, b.kind === 'thrown' ? 'melee' : 'ranged', b.stun);
        if (b.kind === 'flame' && chance(0.08)) decal(G.map, e.x + rand(-10, 10), e.y + rand(-10, 10), 6, [rand(0, 40), 90, 50]);
        if (b.pierce !== undefined && b.pierce > 1) { b.pierce--; continue; }
        if (b.pierce === 99) continue;
        killProj(b); break;
      }
      if (!b.dead && b.kind !== 'flame') for (const w of G.projs) if (w.from === 'e' && w.kind === 'word' && !w.dead && dist2(w.x, w.y, b.x, b.y) < (w.r + b.r) ** 2) { killProj(w, true); if (b.kind === 'bolt') { killProj(b); break; } }
    } else if (b.from === 'e') {
      if (dist2(b.x, b.y, p.x, p.y) < (b.r + p.r) ** 2) { hurtPlayer(b.dmg, b, b.psy); if (b.kind !== 'beamSeg') killProj(b); }
    }
    if (b.kind === 'flame' && chance(0.3)) part(b.x, b.y, b.vx * 0.2, b.vy * 0.2, 0.25, b.r * 0.8, [b.hue, 95, 55]);
  }
  G.projs = G.projs.filter((b) => !b.dead);
  // лужи краски
  const dt = dtP;
  for (const u of G.puddles) {
    u.life -= dt;
    if (u.enemy) { if (dist(u.x, u.y, p.x, p.y) < u.r) p.slow = 0.2; }
    else if (!u.heal && !u.lava) for (const e of G.enemies) if (!e.dead && !e.boss && dist(u.x, u.y, e.x, e.y) < u.r + e.r) { e.hp -= dt * 1.2; e.flash = 0.05; if (e.hp <= 0) killEnemy(e, 'ranged'); }
  }
  G.puddles = G.puddles.filter((u) => u.life > 0);
}

// ── частицы, кольца, подписи ──
function part(x, y, vx, vy, life, size, col, kind = 'dab') { if (G.parts.length > 700) G.parts.shift(); G.parts.push({ x, y, vx, vy, life, max: life, size, col, kind, rot: rand(TAU), vr: rand(-6, 6) }); }
function ring(x, y, col, R) { G.parts.push({ x, y, vx: 0, vy: 0, life: 0.7, max: 0.7, size: R, col, kind: 'ring' }); }
function floatText(x, y, text, col) { G.parts.push({ x, y, vx: 0, vy: -40, life: 1.1, max: 1.1, size: 22, col, kind: 'text', text }); }
function caption(text, x, y) { G.captions.push({ text, x, y, life: 3.2, max: 3.2 }); if (G.captions.length > 4) G.captions.shift(); }
function updateParts(dt) {
  for (const q of G.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - dt * 3; q.vy *= 1 - dt * 3; q.rot += q.vr * dt; }
  G.parts = G.parts.filter((q) => q.life > 0);
  for (const c of G.captions) c.life -= dt; G.captions = G.captions.filter((c) => c.life > 0);
}
