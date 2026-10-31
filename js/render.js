'use strict';
// ───────────── отрисовка мира, существ и эффектов «живописи» ─────────────
function drawImg(ctx, img, x, y, ang = 0, sx = 1, sy = 1, alpha = 1) {
  if (!img) return;
  ctx.save(); ctx.translate(x, y); if (ang) ctx.rotate(ang); if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  ctx.drawImage(img, -(img.px ?? img.cx ?? img.width / 2), -(img.py ?? img.cy ?? img.height / 2));
  ctx.restore();
}
function shadow(ctx, x, y, rx, ry = rx * 0.7, a = 0.28) { ctx.fillStyle = `rgba(25,12,35,${a})`; ctx.beginPath(); ctx.ellipse(x + 4, y + 7, rx, ry, 0, 0, TAU); ctx.fill(); }

// Человек сверху: ноги, руки, корпус, голова — всё движется пружинно
function drawHuman(ctx, sp, x, y, ang, walk, moveAmt, t, o = {}) {
  const S = sp; if (!S) return;
  const fr = Math.floor((t * 7 + (o.seed || 0)) % S.frames);
  const sw = Math.sin(walk) * moveAmt, sc = o.scale || 1;
  const breath = 1 + Math.sin(t * 2.2 + (o.seed || 0)) * 0.018;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc * (1 + (o.sq || 0)) * breath, sc * (1 - (o.sq || 0) * 0.6));
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  for (const s of [-1, 1]) drawImg(ctx, S.foot, Math.sin(walk + (s > 0 ? 0 : Math.PI)) * 8 * moveAmt + 2, s * 6.5, 0);
  const twist = sw * 0.14;
  ctx.rotate(twist);
  // руки
  const armL = o.armL !== undefined ? o.armL : -0.5 + Math.sin(walk) * 0.55 * moveAmt;
  const armR = o.armR !== undefined ? o.armR : 0.5 - Math.sin(walk) * 0.55 * moveAmt;
  drawImg(ctx, S.arm, 0, -14, armL);
  drawImg(ctx, S.arm, 0, 14, armR);
  if (o.weapon) o.weapon(ctx);
  drawImg(ctx, S.torso[fr], 0, 0);
  ctx.rotate(-twist + (o.headTurn || 0));
  drawImg(ctx, S.head[fr], 1.5 + (o.lean || 0) * 6, 0);
  if (o.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(o.flash * 5, 0, 0.8); ctx.drawImage(S.torso[fr], -S.torso[fr].cx, -S.torso[fr].cy); ctx.drawImage(S.head[fr], -S.head[fr].cx, -S.head[fr].cy); }
  ctx.restore();
}

function drawPlayer(ctx) {
  const p = G.P, w = curW(p), d = WEAP[w.id];
  if (p.inv > 0 && p.hurtT > 0 && Math.floor(G.t * 30) % 2) ctx.globalAlpha = 0.5;
  shadow(ctx, p.x, p.y, 15);
  let armR, armL, wpn;
  const sw = p.swing;
  if (sw) {
    const k = easeOutBack(clamp(sw.t / sw.dur, 0, 1));
    const a0 = -sw.side * sw.arc / 2, a1 = sw.side * sw.arc / 2, wa = lerp(a0, a1, k);
    armR = wa * 0.6 + 0.2; armL = -0.6;
    // мазок-шлейф удара
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
    ctx.lineCap = 'round';
    const tr0 = lerp(a0, a1, Math.max(0, k - 0.35)), tr1 = wa;
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = hsl(44 + i * 8, 80, 75 - i * 8, (1 - sw.t / sw.dur) * (0.45 - i * 0.1)); ctx.lineWidth = 9 - i * 3; ctx.beginPath(); ctx.arc(0, 0, sw.range + 6 - i * 5, Math.min(tr0, tr1), Math.max(tr0, tr1)); ctx.stroke(); }
    ctx.restore();
    wpn = (c) => { if (w.id === 'fists') return; c.save(); c.rotate(wa); drawImg(c, SPR['w_' + w.id], 18 + (SPR['w_' + w.id].width / 2) * 0.55, 0, 0, 0.9, 0.9); c.restore(); };
  } else {
    const hold = d.kind === 'melee' ? 0.4 : 0.1;
    armR = d.kind !== 'melee' ? 0.15 : undefined; armL = d.kind !== 'melee' ? -0.35 : undefined;
    const img = SPR['w_' + w.id];
    wpn = (c) => { if (w.id === 'fists' || !img) return; c.save(); c.translate(14, 13); c.rotate(d.kind === 'melee' ? -hold : 0); const extra = d.kind === 'bow' ? -p.charge * 4 : 0; drawImg(c, img, img.width * 0.3 + extra, -6 * (d.kind === 'melee' ? 1 : 1), d.kind === 'bow' ? 0 : 0, 0.85, 0.85); c.restore(); };
  }
  // авоська в левой руке
  const avo = (c) => { wpn(c); c.save(); c.translate(6, -21); c.strokeStyle = 'rgba(230,220,190,.7)'; c.lineWidth = 1; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 3, 0); c.quadraticCurveTo(i * 5, 8 + Math.sin(G.t * 4) * 2, i * 2, 14); c.stroke(); } c.beginPath(); c.ellipse(0, 9, 7, 6, 0, 0, TAU); c.stroke(); if (G.flags.bread) { c.fillStyle = hsl(35, 70, 55); c.fillRect(-5, 6, 10, 4); } c.restore(); };
  drawHuman(ctx, SPR.player, p.x, p.y, p.ang, p.walk, p.moveAmt, p.t, { armL, armR, weapon: avo, sq: p.sq.x * 0.03, lean: p.lean.x, seed: 3 });
  ctx.globalAlpha = 1;
  // натяжение лука / перегрев
  if (d.kind === 'bow' && p.charge > 0) { ctx.strokeStyle = hsl(G.t * 300 % 360, 90, 65, 0.4 + p.charge * 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 26, p.ang - p.charge * 1.2, p.ang + p.charge * 1.2); ctx.stroke(); }
  if (p.overheat) { ctx.fillStyle = 'rgba(255,120,60,.5)'; ctx.beginPath(); ctx.arc(p.x + Math.cos(p.ang) * 24, p.y + Math.sin(p.ang) * 24, 6 + Math.sin(G.t * 30) * 2, 0, TAU); ctx.fill(); }
}

function drawEnemy(ctx, e) {
  const d = e.def, sc = (d.scale || 1) * (0.55 + 0.45 * easeOutBack(Math.min(1, e.spawnT)));
  const alpha = Math.min(1, e.spawnT * 2.2);
  const sq = e.sq.x * 0.03;
  const wob = G.madness > 0.4 ? Math.sin(G.t * 5 + e.seed) * 0.05 * G.madness : 0;
  ctx.save(); ctx.globalAlpha = alpha;
  if (d.human) {
    shadow(ctx, e.x, e.y, 14 * sc);
    let armL, armR;
    if (e.st === 'wind') { armL = -1.1; armR = 1.1; }
    if (e.st === 'lunge' || e.st === 'charge') { armL = -0.1; armR = 0.1; }
    if (e.frozen) { armL = -1.4; armR = 0.2; }
    if (e.st === 'wind' && e.def.beh === 'charger') { ctx.strokeStyle = 'rgba(200,40,40,.35)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(e.chA) * 300, e.y + Math.sin(e.chA) * 300); ctx.stroke(); ctx.setLineDash([]); }
    const extra = d.beh === 'charger' && e.spr === 'granny' ? (c) => { c.save(); c.translate(26, 0); c.fillStyle = 'rgba(40,30,30,.85)'; c.fillRect(-6, -10, 16, 20); c.strokeStyle = '#222'; c.lineWidth = 2; c.strokeRect(-6, -10, 16, 20); c.restore(); } : null;
    drawHuman(ctx, SPR[e.spr], e.x, e.y, e.ang + wob, e.walk, e.moveAmt, e.t, { armL, armR, sq: sq + (e.st === 'wind' ? Math.sin(e.t * 40) * 0.04 : 0), scale: sc, seed: e.seed, flash: e.flash, weapon: extra });
    if (e.mouthOpen > 0) { ctx.fillStyle = 'rgba(30,0,10,.6)'; ctx.beginPath(); ctx.arc(e.x, e.y, 10 + e.mouthOpen * 10, 0, TAU); ctx.fill(); }
  } else DRAWE[d.draw](ctx, e, sc, sq);
  ctx.restore();
  if (e.stun > 0 && !e.boss) { for (let i = 0; i < 3; i++) { const a = G.t * 4 + i * 2.1; ctx.fillStyle = hsl(50, 90, 70, 0.8); ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * 14, e.y - 18 + Math.sin(a) * 5, 2.5, 0, TAU); ctx.fill(); } }
}
function flashImg(ctx, img, e) { if (e.flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(e.flash * 5, 0, 0.8); ctx.drawImage(img, -img.cx, -img.cy); ctx.restore(); } }
const DRAWE = {
  pigeon(ctx, e, sc) {
    shadow(ctx, e.x, e.y + 14, 8, 5, 0.18);
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.ang); ctx.scale(sc, sc);
    const flap = Math.sin(e.t * 22 + e.seed);
    for (const s of [-1, 1]) { ctx.save(); ctx.translate(-2, s * 4); ctx.rotate(s * (0.6 + flap * 0.5)); ctx.scale(1, 0.6 + Math.abs(flap) * 0.6); drawImg(ctx, SPR.pigeon.wing, 0, s * 8); ctx.restore(); }
    const b = SPR.pigeon.body[Math.floor(e.t * 6) % 2]; ctx.drawImage(b, -b.cx, -b.cy); flashImg(ctx, b, e);
    ctx.restore();
  },
  cherub(ctx, e, sc) { const b = SPR.cherub[Math.floor(e.t * 10) % 2]; shadow(ctx, e.x, e.y + 16, 9, 5, 0.15); ctx.save(); ctx.translate(e.x, e.y + Math.sin(e.t * 5) * 4); ctx.rotate(e.ang); ctx.scale(sc, sc); ctx.drawImage(b, -b.cx, -b.cy); flashImg(ctx, b, e); ctx.restore(); },
  fish(ctx, e, sc) { const b = SPR.fish[Math.floor(e.t * 8) % 2]; ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.ang + Math.sin(e.t * 14) * 0.2); ctx.scale(sc, sc); ctx.drawImage(b, -b.cx, -b.cy); flashImg(ctx, b, e); ctx.restore(); if (chance(0.05)) ring(e.x, e.y, [195, 40, 75], 18); },
  dog(ctx, e, sc) {
    shadow(ctx, e.x, e.y, 16, 8);
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.ang); ctx.scale(sc * (1 + e.sq.x * 0.03), sc);
    ctx.strokeStyle = 'rgba(20,10,30,.9)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    for (const [lx, s, ph] of [[8, -1, 0], [8, 1, Math.PI], [-12, -1, Math.PI], [-12, 1, 0]]) { const k = Math.sin(e.walk * 1.4 + ph) * 7 * e.moveAmt; ctx.beginPath(); ctx.moveTo(lx, s * 5); ctx.lineTo(lx + k, s * 12); ctx.stroke(); }
    const b = SPR.dog[Math.floor(e.t * 8 + e.seed) % 3]; ctx.drawImage(b, -b.cx, -b.cy); flashImg(ctx, b, e);
    ctx.restore();
  },
  eye(ctx, e, sc) {
    const b = SPR.eyeball[Math.floor(e.t * 3) % 2];
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(sc, sc);
    const blink = e.st === 'track' && (e.t % 3.3) > 3.15 ? 0.15 : 1;
    ctx.scale(1, blink); ctx.drawImage(b, -b.cx, -b.cy);
    const look = e.ang; const ix = Math.cos(look) * 7, iy = Math.sin(look) * 5;
    drawImg(ctx, SPR.iris, ix, iy, 0, e.st === 'aim' ? 0.7 : 1, e.st === 'aim' ? 0.7 : 1);
    flashImg(ctx, b, e); ctx.restore();
    drawBeamTele(ctx, e);
  },
  tv(ctx, e, sc) {
    const b = SPR.tv[Math.floor(e.t * 10) % 2]; shadow(ctx, e.x, e.y, 20, 14);
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(sc, sc); ctx.drawImage(b, -b.cx, -b.cy);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 6; i++) ctx.fillRect(-9 + Math.random() * 20, -10 + Math.random() * 20, 4, 1);
    flashImg(ctx, b, e); ctx.restore(); drawBeamTele(ctx, e);
  },
  voice(ctx, e) {
    const a = Math.max(e.reveal || 0, e.st === 'wind' ? 0.5 : 0);
    if (a <= 0.02) return;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = hsl(280, 60, 70); ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); for (let k = 0; k <= 24; k++) { const an = (k / 24) * TAU, r = 12 + i * 5 + Math.sin(an * 5 + G.t * 9 + i) * 3; ctx.lineTo(e.x + Math.cos(an) * r, e.y + Math.sin(an) * r); } ctx.stroke(); }
    ctx.restore();
  },
  melter(ctx, e, sc) {
    const b = SPR.melter[Math.floor(e.t * 5 + e.seed) % 3];
    shadow(ctx, e.x, e.y, 18 * sc, 12 * sc);
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.ang); ctx.scale(sc * (1 + Math.sin(e.t * 3) * 0.06 + e.sq.x * 0.03), sc * (1 - Math.sin(e.t * 3) * 0.05)); ctx.drawImage(b, -b.cx, -b.cy); flashImg(ctx, b, e); ctx.restore();
    if (chance(0.06)) decal(G.map, e.x + rand(-10, 10), e.y + rand(-10, 10), 4, e.def.col);
  },
  mouth(ctx, e) {
    if (e.st === 'tele') { const k = 1 - e.stT / 0.9; ctx.strokeStyle = `rgba(80,10,20,${0.3 + k * 0.5})`; ctx.lineWidth = 3; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + e.seed; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(a) * 50 * k, e.y + Math.sin(a) * 50 * k); ctx.stroke(); } ctx.beginPath(); ctx.arc(e.x, e.y, 52, 0, TAU * k); ctx.stroke(); return; }
    if (e.hidden) return;
    const b = SPR.mouth[e.st === 'bite' ? 1 : Math.floor(e.t * 4) % 2], k = e.st === 'bite' ? 1.2 : 1 + Math.sin(e.t * 6) * 0.05;
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(k + e.sq.x * 0.03, (e.st === 'open' ? 0.8 + Math.sin(e.t * 5) * 0.2 : 0.5) * k); ctx.drawImage(b, -b.cx, -b.cy); flashImg(ctx, b, e); ctx.restore();
  },
  cart(ctx, e, sc) {
    const b = SPR.cart[e.st === 'charge' ? 1 : 0]; shadow(ctx, e.x, e.y, 24, 16);
    ctx.save(); ctx.translate(e.x + (e.st === 'wind' ? Math.sin(e.t * 50) * 2 : 0), e.y); ctx.rotate(e.st === 'go' ? e.ang : e.chA ?? e.ang); ctx.scale(sc, sc); ctx.drawImage(b, -b.cx, -b.cy); flashImg(ctx, b, e); ctx.restore();
    if (e.st === 'wind') { ctx.strokeStyle = 'rgba(200,40,40,.35)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(e.chA) * 300, e.y + Math.sin(e.chA) * 300); ctx.stroke(); ctx.setLineDash([]); }
  },
  can(ctx, e, sc) {
    const b = SPR.can[Math.floor(e.t * 2) % 2];
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(sc, sc); ctx.drawImage(b, -b.cx, -b.cy);
    drawImg(ctx, SPR.iris, Math.cos(e.ang) * 3, Math.sin(e.ang) * 3, 0, 0.8, 0.8); flashImg(ctx, b, e); ctx.restore();
  },
  snake(ctx, e, sc) {
    for (let i = e.segs.length - 1; i >= 0; i--) { const s = e.segs[i], k = 1 - i / e.segs.length * 0.4; shadow(ctx, s.x, s.y, 9 * k, 6 * k, 0.2); drawImg(ctx, SPR.sausage, s.x, s.y, i * 0.7 + e.t, k * sc, k * sc); }
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.ang); ctx.scale(sc + e.sq.x * 0.03, sc); ctx.drawImage(SPR.sausageHead, -SPR.sausageHead.cx, -SPR.sausageHead.cy); flashImg(ctx, SPR.sausageHead, e); ctx.restore();
  },
};
function drawBeamTele(ctx, e) {
  if (e.st === 'aim') { const L = beamLen(e.x, e.y, e.ang, 900); ctx.strokeStyle = `rgba(230,40,50,${0.25 + Math.sin(G.t * 30) * 0.15})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(e.ang) * L, e.y + Math.sin(e.ang) * L); ctx.stroke(); }
  if (e.st === 'fire') { const L = e.beamL || 900; paintBeam(ctx, e.x, e.y, e.ang, L, 14, [355, 80, 60]); }
}
function paintBeam(ctx, x, y, a, L, w, col) {
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) { ctx.strokeStyle = hsl(col[0] + i * 8, col[1], col[2] + i * 9, 0.55 - i * 0.08); ctx.lineWidth = w * (1.6 - i * 0.35) + Math.sin(G.t * 40 + i) * 2; const o = (i - 1.5) * 2; ctx.beginPath(); ctx.moveTo(x - Math.sin(a) * o, y + Math.cos(a) * o); ctx.lineTo(x + Math.cos(a) * L - Math.sin(a) * o, y + Math.sin(a) * L + Math.cos(a) * o); ctx.stroke(); }
  ctx.restore();
}

// ── боссы ──
function drawBoss(ctx, e) {
  const k = e.kind, t = e.t, sq = e.sq.x * 0.02;
  const alpha = e.dying ? Math.max(0, 1 - (e.dieT || 0) / 2.4) : Math.min(1, e.spawnT * 1.5);
  ctx.save(); ctx.globalAlpha = alpha;
  if (e.dying && k === 'jesus') ctx.translate(0, -(e.dieT || 0) * 60);
  const spr = { cashier: SPR.b_cashier, space: SPR.b_psych, heaven: SPR.b_god, hell: SPR.b_devil, jesus: SPR.b_jesus, atom: SPR.b_reynolds, art: SPR.b_adolf }[k];
  const fr = spr[Math.floor(t * 4) % spr.length];
  if (k === 'cashier') {
    shadow(ctx, e.x, e.y + 30, 70, 30);
    ctx.lineCap = 'round';
    for (const h of e.heads) { for (let i = 0; i < 3; i++) { ctx.strokeStyle = hsl(25, 45, 62 - i * 6, 0.9); ctx.lineWidth = 14 - i * 3; ctx.beginPath(); ctx.moveTo(e.x, e.y - 10); ctx.quadraticCurveTo(e.x + Math.cos(h.a + 0.4) * 50, e.y - 50 + Math.sin(t * 3 + i) * 6, h.x, h.y); ctx.stroke(); } }
    drawImg(ctx, fr, e.x, e.y, Math.sin(t * 1.4) * 0.04, 1 + sq, 1 - sq);
    for (const h of e.heads) drawImg(ctx, SPR.cashHead[Math.floor(t * 3 + h.a * 3) & 1], h.x, h.y, Math.sin(t * 2 + h.a) * 0.2, 1, 1);
  } else if (k === 'heaven') {
    ctx.save(); ctx.globalAlpha *= 0.35; ctx.fillStyle = hsl(48, 90, 80); ctx.beginPath(); ctx.arc(e.x, e.y, 200 + Math.sin(t * 2) * 10, 0, TAU); ctx.fill(); ctx.restore();
    drawImg(ctx, fr, e.x, e.y, Math.sin(t * 0.7) * 0.03, 1 + sq, 1 - sq);
    e.hands.forEach((h, i) => { shadow(ctx, h.x, h.y + 30, 40, 22, 0.25); drawImg(ctx, SPR.hand, h.x, h.y - (h.busy ? 20 : 0), (i ? Math.PI : 0) + Math.PI / 2 + Math.sin(t + i) * 0.15, i ? -1 : 1, 1); });
    if (e.rays) for (const r of e.rays) paintBeam(ctx, e.x, e.y, r, 1600, 14, [50, 100, 75]);
  } else {
    if (k === 'jesus') { ctx.strokeStyle = hsl(48, 90, 70, 0.7 * alpha); ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(e.x, e.y - 50, 40, 12, 0, 0, TAU); ctx.stroke(); }
    if (k !== 'space') shadow(ctx, e.x, e.y + fr.height * 0.4, fr.width * 0.35, 18);
    const bob = Math.sin(t * (k === 'space' ? 0.8 : 2.4)) * (k === 'space' ? 10 : 4);
    drawImg(ctx, fr, e.x, e.y + bob, (e.spin || 0) + Math.sin(t * 1.3) * 0.03 + (e.dizzy ? Math.sin(t * 6) * 0.2 : 0), 1 + sq, 1 - sq);
    if (k === 'hell') drawImg(ctx, SPR.pitchfork, e.x + 60, e.y + 10, e.atk && e.atk.n === 'dash' ? e.atk.ang : -1.2 + Math.sin(t * 2) * 0.2);
    if (k === 'space') { ctx.save(); ctx.globalAlpha *= 0.5; ctx.strokeStyle = hsl(40, 60, 70); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(e.x, e.y + bob, 190, 40, -0.25, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (e.dizzy) for (let i = 0; i < 4; i++) { const a = t * 5 + i * 1.6; ctx.fillStyle = hsl(50, 90, 70); ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * 40, e.y - 80 + Math.sin(a) * 10, 4, 0, TAU); ctx.fill(); }
  }
  if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(e.flash * 5, 0, 0.5); drawImg(ctx, fr, e.x, e.y); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  if (e.beam) { const ox = e.beam.ox || 0, oy = e.beam.oy || 0; if (e.beam.tele || !e.beam.on) { ctx.strokeStyle = `rgba(230,40,50,${0.3 + Math.sin(G.t * 30) * 0.2})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x + ox, e.y + oy); ctx.lineTo(e.x + ox + Math.cos(e.beam.a) * e.beam.L, e.y + oy + Math.sin(e.beam.a) * e.beam.L); ctx.stroke(); } else paintBeam(ctx, e.x + ox, e.y + oy, e.beam.a, e.beam.L, e.beam.w || 12, [355, 85, 58]); }
}

// ── снаряды ──
function drawProj(ctx, b) {
  switch (b.kind) {
    case 'word': {
      const wob = Math.sin(G.t * 8 + b.wob) * 0.12, fade = Math.min(1, (b.life - b.t) * 2);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(wob); ctx.globalAlpha = fade;
      ctx.font = `700 ${b.text.length > 14 ? 17 : 20}px Caveat, 'Comic Sans MS', cursive`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,5,15,.75)'; ctx.strokeText(b.text, 0, 0);
      ctx.fillStyle = hsl(b.hue + Math.sin(G.t * 10) * 20, 70, 72); ctx.fillText(b.text, 0, 0);
      ctx.restore(); break;
    }
    case 'q': ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.t * 4); ctx.font = '700 30px Caveat, cursive'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,5,15,.8)'; ctx.strokeText('?', 0, 0); ctx.fillStyle = hsl(40, 90, 65); ctx.fillText('?', 0, 0); ctx.restore(); break;
    case 'orb': case 'paint': ctx.fillStyle = hsl(b.hue, 85, 55, 0.35); ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.7, 0, TAU); ctx.fill(); ctx.fillStyle = hsl(b.hue, 90, 70); ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r * 0.75, b.t * 5, 0, TAU); ctx.fill(); break;
    case 'bolt': { const a = Math.atan2(b.vy, b.vx); ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a); ctx.fillStyle = hsl(b.hue, 90, 60, 0.35); ctx.beginPath(); ctx.ellipse(-6, 0, 18, 7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = hsl(b.hue, 90, 85); ctx.beginPath(); ctx.ellipse(0, 0, 10, 3.5, 0, 0, TAU); ctx.fill(); ctx.restore(); break; }
    case 'arrow': { const a = Math.atan2(b.vy, b.vx); ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a); ctx.lineCap = 'round'; for (let i = 0; i < 6; i++) { ctx.strokeStyle = hsl(i * 60 + b.hue, 90, 62, 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-34, (i - 2.5) * 1.6); ctx.lineTo(4, (i - 2.5) * 0.3); ctx.stroke(); } ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(0, -4); ctx.lineTo(0, 4); ctx.fill(); ctx.restore(); break; }
    case 'flame': { const k = b.t / b.life; ctx.fillStyle = hsl(b.hue + k * 20, 95, 60 - k * 25, 0.55 * (1 - k)); ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r * 0.6, Math.atan2(b.vy, b.vx), 0, TAU); ctx.fill(); break; }
    case 'thrown': drawImg(ctx, SPR['w_' + b.wid], b.x, b.y, b.t * 18); break;
    case 'boomer': drawImg(ctx, SPR.w_breadboom, b.x, b.y, b.t * 16); break;
    case 'toast': drawImg(ctx, SPR.toast, b.x, b.y, b.t * 10); break;
    case 'canvas': drawImg(ctx, SPR.canvasProj, b.x, b.y, Math.atan2(b.vy, b.vx)); break;
    case 'painting': drawImg(ctx, SPR.canvasProj, b.x, b.y, b.t * (b.spin || 3), 1.3, 1.3); break;
    case 'loaf': drawImg(ctx, SPR.loaf, b.x, b.y, b.t * 6); break;
    case 'couch': drawImg(ctx, SPR.couch, b.x, b.y, b.t * 2); break;
    case 'caddy': ctx.save(); ctx.translate(b.x, b.y); ctx.fillStyle = hsl(330, 60, 70); ctx.beginPath(); ctx.roundRect(-55, -24, 110, 48, 14); ctx.fill(); ctx.fillStyle = hsl(200, 40, 30); ctx.fillRect(10, -18, 18, 36); ctx.fillStyle = '#eee'; ctx.fillRect(-58, -26, 8, 52); ctx.restore(); break;
    case 'nukeFly': drawImg(ctx, SPR.nuke, b.x, b.y - Math.sin((b.t / b.life) * Math.PI) * 120, Math.atan2(b.vy, b.vx)); break;
    case 'puddleMaker': ctx.fillStyle = hsl(b.hue, 60, 40, 0.9); ctx.beginPath(); ctx.arc(b.x, b.y - Math.sin((b.t / b.life) * Math.PI) * 80, 9, 0, TAU); ctx.fill(); break;
    default: ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
  }
}
function drawParts(ctx) {
  for (const q of G.parts) {
    const k = q.life / q.max;
    if (q.kind === 'dab') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = hsl(q.col[0], q.col[1], q.col[2], 0.85 * k); ctx.beginPath(); ctx.ellipse(0, 0, q.size * (0.6 + k * 0.4), q.size * 0.45, 0, 0, TAU); ctx.fill(); ctx.fillStyle = hsl(q.col[0], q.col[1], q.col[2] + 12, 0.6 * k); ctx.beginPath(); ctx.ellipse(-q.size * 0.2, -1, q.size * 0.4, q.size * 0.2, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    else if (q.kind === 'spark') { ctx.strokeStyle = hsl(q.col[0], q.col[1], q.col[2], k); ctx.lineWidth = q.size * 0.6; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.04, q.y - q.vy * 0.04); ctx.stroke(); }
    else if (q.kind === 'ring') { ctx.strokeStyle = hsl(q.col[0], q.col[1], q.col[2], k * 0.7); ctx.lineWidth = 3 * k + 1; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1 - k * 0.7), 0, TAU); ctx.stroke(); }
    else if (q.kind === 'text') { ctx.save(); ctx.globalAlpha = k; ctx.font = `700 ${q.size}px Caveat, cursive`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,5,15,.7)'; ctx.strokeText(q.text, q.x, q.y); ctx.fillStyle = hsl(q.col[0], q.col[1], q.col[2]); ctx.fillText(q.text, q.x, q.y); ctx.restore(); }
  }
}
function drawMarks(ctx) {
  for (const k of G.marks) {
    const f = k.t / k.max;
    if (k.line) { ctx.fillStyle = hsl(k.col[0], k.col[1], k.col[2], 0.12 + f * 0.25); ctx.fillRect(40, k.y - 34, G.map.w - 80, 68); continue; }
    if (k.ray) { ctx.strokeStyle = hsl(k.col[0], k.col[1], k.col[2], 0.25 + f * 0.4); ctx.lineWidth = 50 * f + 4; ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x + Math.cos(k.ang) * 1600, k.y + Math.sin(k.ang) * 1600); ctx.stroke(); continue; }
    ctx.strokeStyle = hsl(k.col[0], k.col[1], k.col[2], 0.7); ctx.lineWidth = 3; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -G.t * 40; ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = hsl(k.col[0], k.col[1], k.col[2], 0.15 + f * 0.25); ctx.beginPath(); ctx.arc(k.x, k.y, k.r * f, 0, TAU); ctx.fill();
  }
  if (G.shelters) for (const s of G.shelters) { ctx.fillStyle = 'rgba(250,210,40,.25)'; ctx.beginPath(); ctx.arc(s.x, s.y, 70, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(30,30,30,.9)'; ctx.lineWidth = 4; ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.arc(s.x, s.y, 70, 0, TAU); ctx.stroke(); ctx.setLineDash([]); for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + G.t; ctx.fillStyle = 'rgba(250,200,30,.95)'; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, 26, a, a + 0.9); ctx.fill(); } }
  for (const u of G.puddles) { ctx.fillStyle = hsl(u.hue, u.enemy ? 50 : 80, u.enemy ? 35 : 55, Math.min(0.5, u.life * 0.3)); ctx.beginPath(); ctx.ellipse(u.x, u.y, u.r, u.r * 0.75, 0, 0, TAU); ctx.fill(); }
}

// ── путеводная линия: живописный мазок, по которому бегут блики ──
function drawPath(ctx) {
  const m = G.map; if (!m.path) return;
  const pts = m.path.pts, lim = G.pathLimit;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const strand = (dx, w, col, key) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); let started = false; for (const p of pts) { if (p.s > lim) break; const x = p.x + p[key] * dx, y = p.y - p[key] * dx * 0.6; if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); } ctx.stroke(); };
  const pulse = 0.5 + Math.sin(G.t * 2.4) * 0.15;
  strand(0, 30, `rgba(255,200,80,${0.1 * pulse + 0.04})`, 'n1');
  strand(1, 7, 'rgba(230,160,50,.32)', 'n1');
  strand(-1, 4, `rgba(255,214,110,${0.35 + pulse * 0.3})`, 'n2');
  strand(0.5, 2, 'rgba(255,244,190,.55)', 'n3');
  // бегущие мазки-блики
  for (let k = 0; k < 40; k++) {
    const s = ((G.t * 120 + k * 90) % Math.max(1, lim)); const p = pathAt(pts, s); if (!p) continue;
    const near = dist(p.x, p.y, G.P.x, G.P.y); if (near > 900) continue;
    ctx.fillStyle = `rgba(255,236,160,${0.6 * (1 - near / 900)})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 3, p.a, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function pathAt(pts, s) { for (let i = 1; i < pts.length; i++) if (pts[i].s >= s) { const a = pts[i - 1], b = pts[i], t = (s - a.s) / (b.s - a.s || 1); return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), a: Math.atan2(b.y - a.y, b.x - a.x) }; } return null; }

// Ворота-барьеры: вихрь тёмных мазков, рассеивается после волн
function drawGates(ctx) {
  for (const g of G.map.gates) {
    if (g.hidden) continue;
    if (g.open && g.t > 1) continue;
    const a = g.open ? 1 - g.t : 1; if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
    const cx = g.x + g.w / 2, cy = g.y + g.h / 2, n = 22;
    for (let i = 0; i < n; i++) {
      const ph = G.t * (0.8 + (i % 5) * 0.2) + i * 1.7, rx = g.w / 2 * (0.3 + (i % 7) / 9), ry = g.h / 2 * (0.3 + (i % 5) / 7);
      const x = cx + Math.cos(ph) * rx, y = cy + Math.sin(ph * 1.3) * ry;
      ctx.strokeStyle = g.lane ? hsl(ENDING_HUE[g.asp] ?? 280, 50, 30 + (i % 4) * 8, 0.7) : hsl(270 + (i % 3) * 20, 30, 15 + (i % 4) * 7, 0.75);
      ctx.lineWidth = 8 + (i % 4) * 3;
      ctx.beginPath(); ctx.arc(x, y, 18 + (i % 6) * 6, ph, ph + 1.8); ctx.stroke();
    }
    ctx.restore();
  }
}
const ENDING_HUE = { space: 230, heaven: 48, hell: 5, jesus: 195, atom: 30, art: 330 };

// Анимированный декор: глаза в окнах, фонтан, лава, вывески
function drawAnimDecor(ctx, layer) {
  for (const a of G.map.anim) {
    if (layer === 0 && a.t === 'fountain') { for (let i = 0; i < 4; i++) { const r = ((G.t * 30 + i * 28) % 110); ctx.strokeStyle = `rgba(220,240,255,${0.5 * (1 - r / 110)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, TAU); ctx.stroke(); } ctx.fillStyle = 'rgba(230,245,255,.6)'; for (let i = 0; i < 10; i++) { const an = G.t * 3 + i * 0.63, r = 8 + ((G.t * 50 + i * 13) % 40); ctx.beginPath(); ctx.arc(a.x + Math.cos(an) * r, a.y + Math.sin(an) * r, 2.2, 0, TAU); ctx.fill(); } }
    if (layer === 0 && a.t === 'lava') { ctx.strokeStyle = hsl(30, 100, 60, 0.25 + Math.sin(G.t * 2 + a.pts[0][0]) * 0.15); ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); a.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); }
    if (layer === 0 && a.t === 'glints') { for (let i = 0; i < 40; i++) { const x = (hash2(i, 1) * 1600 + G.t * 8) % 1600, y = hash2(i, 2) * 1200; const k = Math.sin(G.t * 3 + i) * 0.5 + 0.5; ctx.fillStyle = `rgba(255,255,240,${k * 0.5})`; ctx.beginPath(); ctx.ellipse(x, y, 10 * k, 2, 0, 0, TAU); ctx.fill(); } }
    if (layer === 1 && a.t === 'eye') {
      const vis = G.madness > 0.45 ? clamp((G.madness - 0.45) * 3, 0, 1) : 0; if (vis <= 0) continue;
      const open = clamp(Math.sin(G.t * 0.7 + a.ph) * 2, 0, 1) * vis; if (open <= 0.02) continue;
      const lx = a.x - a.s * 6, ly = a.y, look = angTo(lx, ly, G.P.x, G.P.y);
      ctx.save(); ctx.translate(lx, ly); ctx.scale(1, open);
      ctx.fillStyle = 'rgba(240,230,210,.95)'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 22, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(160,30,60,.95)'; ctx.beginPath(); ctx.arc(Math.cos(look) * 5, Math.sin(look) * 9, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#100'; ctx.beginPath(); ctx.arc(Math.cos(look) * 6, Math.sin(look) * 10, 3.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  if (layer === 1) for (const s of G.map.signs) {
    const flick = G.map.name === 'street' ? (Math.sin(G.t * 23) > 0.85 - G.madness * 0.5 ? 0.35 : 1) : 1;
    ctx.save(); ctx.font = `700 ${s.text[0].length > 16 ? 22 : 34}px 'Rubik Wet Paint', Caveat, cursive`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = hsl(s.hue, 90, 60); ctx.shadowBlur = 18 * flick; ctx.fillStyle = hsl(s.hue, 80, 70, flick); ctx.fillText(tr(s.text), s.x, s.y);
    ctx.restore();
  }
}

// Пикапы: покачиваются и мерцают
function drawPickups(ctx) {
  for (const k of G.pickups) {
    k.t += G.dt; k.cool -= G.dt;
    const bob = Math.sin(k.t * 3) * 3;
    ctx.fillStyle = `rgba(255,230,140,${0.18 + Math.sin(k.t * 4) * 0.08})`; ctx.beginPath(); ctx.ellipse(k.x, k.y + 6, 22, 9, 0, 0, TAU); ctx.fill();
    const img = k.heal ? SPR[k.id] : SPR['w_' + k.id];
    drawImg(ctx, img, k.x, k.y + bob, k.heal ? 0 : -0.5 + Math.sin(k.t) * 0.1, 0.9, 0.9);
  }
}
