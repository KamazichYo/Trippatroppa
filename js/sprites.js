'use strict';
// ───────────── все спрайты, написанные «маслом» процедурно ─────────────
const SPR = {};

// Человек сверху. o: coat, skin, hair, hat, sleeve, shoe, eyes, stripes, box, shiny
function bakeHuman(key, o, seed, frames = 3) {
  const st = o.shiny ? { ...ST.obj, shade: 26, hl: 0.25, lj: 4 } : ST.obj;
  const torso = [], head = [];
  for (let f = 0; f < frames; f++) {
    torso.push(bake(60, 60, seed + f * 101, (ctx, r) => {
      if (o.box) P(ctx, r, sdBox(-11, 0, 8, 11, 2), bbB(-11, 0, 8, 11), o.box, st);
      if (o.hat === 'hood') P(ctx, r, sdEllipse(-8, 0, 6, 9), bbE(-8, 0, 6, 9), shadeC(o.coat, -8), st);
      P(ctx, r, sdEllipse(0, 0, 10.5 * (o.fat || 1), 17), bbE(0, 0, 11 * (o.fat || 1), 17), o.coat, st);
      if (o.stripes) for (const s of [-1, 1]) P(ctx, r, sdCapsule(-6, s * 13.5, 7, s * 15.5, 1.2), bbB(0, s * 14.5, 9, 3), o.stripes, ST.fine);
      if (o.strings) for (const s of [-1, 1]) P(ctx, r, sdCapsule(4, s * 3, 9, s * 4, 0.9), bbB(6, s * 3.5, 5, 2), o.strings, ST.fine);
      if (o.tie) P(ctx, r, sdCapsule(5, 0, 10, 0, 1.6), bbB(7, 0, 5, 3), o.tie, ST.fine);
    }));
    head.push(bake(34, 34, seed + f * 77 + 5, (ctx, r) => {
      const R = 8.5;
      if (o.hairLong) P(ctx, r, sdEllipse(-4, 0, 9, 10.5), bbE(-4, 0, 9, 10.5), o.hair, ST.fine);
      P(ctx, r, sdCircle(1.2, 0, R), bbC(1.2, 0, R), o.skin, ST.fine);
      if (o.beard) P(ctx, r, sdSub(sdCircle(2.5, 0, R - 0.5), sdCircle(-1, 0, R - 1.5)), bbC(2.5, 0, R), o.beard, ST.fine);
      if (o.mustache) P(ctx, r, sdCapsule(8.2, -1.6, 8.2, 1.6, 1.2), bbB(8, 0, 2, 3), o.mustache, ST.fine);
      if (o.hat === 'cap') { P(ctx, r, sdCircle(-0.5, 0, R + 0.6), bbC(0, 0, R + 1), o.hatC, st); P(ctx, r, sdEllipse(8, 0, 4.5, 7), bbE(8, 0, 4.5, 7), shadeC(o.hatC, -6), ST.fine); }
      else if (o.hat === 'scarf') { P(ctx, r, sdCircle(-0.8, 0, R + 1.4), bbC(0, 0, R + 2), o.hatC, st); P(ctx, r, sdCircle(-11, 0, 3), bbC(-11, 0, 3), shadeC(o.hatC, -10), ST.fine); for (let i = 0; i < 6; i++) dab(ctx, r, -6 + r() * 9, (r() - 0.5) * 12, 1.1, [50, 70, 85]); }
      else if (o.hat === 'hood') P(ctx, r, sdSub(sdCircle(-1.5, 0, R + 2.4), sdCircle(6, 0, R - 2)), bbC(0, 0, R + 3), shadeC(o.coat, -6), st);
      else if (o.hat === 'top') { P(ctx, r, sdCircle(0, 0, R + 4), bbC(0, 0, R + 4), [0, 0, 10], st); P(ctx, r, sdCircle(0, 0, R - 1), bbC(0, 0, R), [0, 0, 16], ST.fine); }
      else if (o.hat === 'beret') { P(ctx, r, sdEllipse(-1, -1, R + 1.5, R + 0.5), bbC(0, 0, R + 2), o.hatC, st); }
      else if (o.hat !== 'bald') P(ctx, r, sdSub(sdCircle(-0.6, 0, R + 0.5), sdCircle(7.5, 0, R - 1.2)), bbC(0, 0, R + 1), o.hair, st);
      if (o.part) P(ctx, r, sdCapsule(-7, -3, 4, -2, 0.7), bbB(-1, -2.5, 7, 2), shadeC(o.hair, 20), ST.fine);
      if (o.eyes) for (let i = 0; i < o.eyes; i++) {
        const ex = -5 + r() * 9, ey = (r() - 0.5) * 11, er = 1.8 + r() * 1.6;
        P(ctx, r, sdCircle(ex, ey, er), bbC(ex, ey, er), [50, 20, 92], ST.fine);
        ctx.fillStyle = 'rgba(15,5,10,0.9)'; ctx.beginPath(); ctx.arc(ex + er * 0.3, ey, er * 0.45, 0, TAU); ctx.fill();
      }
      if (o.mouthTop) { ctx.fillStyle = 'rgba(30,0,10,0.9)'; ctx.beginPath(); ctx.ellipse(-1, 0, 2.5, 5, 0, 0, TAU); ctx.fill(); for (let i = 0; i < 5; i++) dab(ctx, r, -1 + (r() - 0.5) * 3, -4 + i * 2, 0.8, [50, 10, 95]); }
    }));
  }
  const arm = bake(30, 16, seed + 9, (ctx, r) => {
    P(ctx, r, sdCapsule(-10, 0, 6, 0, 4.2), [-15, -6, 11, 6], o.sleeve || o.coat, ST.fine);
    P(ctx, r, sdCircle(8.8, 0, 3.3), bbC(8.8, 0, 3.3), o.hand || o.skin, ST.fine);
  });
  arm.px = 5; arm.py = 8;
  const foot = bake(18, 12, seed + 13, (ctx, r) => P(ctx, r, sdEllipse(0, 0, 6.2, 3.6), bbE(0, 0, 6.2, 3.6), o.shoe || [20, 10, 14], ST.fine));
  SPR[key] = { torso, head, arm, foot, frames, o };
}
function shadeC(c, dl) { return [c[0], c[1], clamp(c[2] + dl, 0, 100)]; }

function bakeAll(progress) {
  const jobs = [];
  const J = (f) => jobs.push(f);
  // Игрок: горчичная толстовка, тапки, авоська
  J(() => bakeHuman('player', { coat: [44, 72, 52], skin: [24, 45, 72], hair: [28, 30, 17], hat: 'hood', strings: [40, 20, 90], shoe: [350, 45, 32] }, 11));
  // Прохожие (нормальные цвета)
  const coats = [[210, 18, 32], [25, 28, 30], [0, 0, 26], [150, 12, 30], [15, 35, 38], [220, 30, 45], [35, 20, 55], [280, 10, 30]];
  const hairs = [[30, 30, 15], [35, 40, 30], [0, 0, 60], [20, 50, 25], [40, 10, 70]];
  coats.forEach((c, i) => J(() => bakeHuman('pass' + i, { coat: c, skin: [22 + i, 40, 66 + (i % 3) * 4], hair: hairs[i % hairs.length], hat: i % 3 === 0 ? 'cap' : 'none', hatC: [i * 40, 20, 25] }, 100 + i * 17)));
  J(() => bakeHuman('granny', { coat: [20, 35, 28], skin: [22, 35, 70], hat: 'scarf', hatC: [355, 55, 42], fat: 1.25 }, 300));
  J(() => bakeHuman('gopnik', { coat: [225, 40, 22], skin: [24, 40, 68], hair: [30, 20, 20], hat: 'cap', hatC: [0, 0, 12], stripes: [0, 0, 92] }, 320));
  J(() => bakeHuman('gopnik2', { coat: [0, 0, 14], skin: [20, 40, 64], hat: 'bald', stripes: [0, 0, 88] }, 333));
  J(() => bakeHuman('courier', { coat: [95, 70, 42], skin: [25, 40, 60], hat: 'cap', hatC: [95, 70, 38], box: [95, 70, 45] }, 350));
  J(() => bakeHuman('whisper', { coat: [240, 8, 42], skin: [230, 8, 62], hair: [240, 10, 30], hat: 'none', mouthTop: true }, 370));
  J(() => bakeHuman('whisper2', { coat: [270, 15, 35], skin: [250, 10, 58], hat: 'hood', mouthTop: true }, 380));
  // Галлюцинации: неестественные цвета, глаза на макушке
  J(() => bakeHuman('hallu0', { coat: [300, 55, 40], skin: [180, 30, 60], hair: [120, 60, 30], eyes: 3 }, 400));
  J(() => bakeHuman('hallu1', { coat: [170, 60, 35], skin: [50, 60, 60], hat: 'bald', eyes: 5 }, 410));
  J(() => bakeHuman('hallu2', { coat: [15, 80, 45], skin: [270, 30, 55], hair: [200, 70, 40], mouthTop: true, eyes: 2 }, 420));
  J(() => bakeHuman('mannequin', { coat: [32, 30, 78], skin: [32, 30, 80], hat: 'bald', shoe: [32, 30, 70], shiny: true }, 450));
  J(() => bakeHuman('critic', { coat: [0, 0, 16], skin: [25, 30, 72], hat: 'top', tie: [0, 0, 90] }, 470));
  J(() => bakeHuman('imp', { coat: [2, 75, 38], skin: [2, 70, 45], hat: 'bald', eyes: 2, shoe: [0, 0, 8] }, 480));
  J(() => bakeHuman('agent', { coat: [210, 10, 25], skin: [24, 40, 70], hat: 'cap', hatC: [30, 20, 30], tie: [0, 60, 40] }, 490));
  J(() => bakeHuman('angel', { coat: [45, 30, 92], skin: [28, 50, 78], hair: [45, 70, 60], hat: 'none' }, 495));
  // Звери и твари
  J(() => {
    SPR.pigeon = { body: [0, 1].map((f) => bake(34, 34, 500 + f, (ctx, r) => {
      P(ctx, r, sdEllipse(-2, 0, 9, 6), bbE(-2, 0, 9, 6), [225, 10, 58], ST.fine);
      P(ctx, r, sdCircle(7, 0, 4.2), bbC(7, 0, 4.2), [230, 12, 45], ST.fine);
      dab(ctx, r, 4, 0, 2.4, [150, 50, 40]); dab(ctx, r, 4, 1, 1.8, [290, 45, 45]);
      P(ctx, r, sdEllipse(-12, 0, 4, 3), bbE(-12, 0, 4, 3), [225, 10, 35], ST.fine);
      ctx.fillStyle = '#d98a3a'; ctx.beginPath(); ctx.ellipse(11.5, 0, 2, 1, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f2a51a'; ctx.beginPath(); ctx.arc(8.5, -2.3, 0.9, 0, TAU); ctx.arc(8.5, 2.3, 0.9, 0, TAU); ctx.fill();
    })), wing: bake(26, 14, 505, (ctx, r) => P(ctx, r, sdEllipse(0, 0, 10, 4.5), bbE(0, 0, 10, 4.5), [225, 8, 64], ST.fine)) };
  });
  J(() => {
    SPR.dog = [0, 1, 2].map((f) => bake(56, 34, 520 + f, (ctx, r) => {
      P(ctx, r, sdWobble(sdEllipse(-3, 0, 15, 7.5), 1.6, 0.25, f), bbE(-3, 0, 17, 9), [262, 30, 12], ST.obj);
      P(ctx, r, sdCircle(14, 0, 6.5), bbC(14, 0, 6.5), [262, 28, 14], ST.fine);
      P(ctx, r, sdEllipse(20, 0, 4, 3), bbE(20, 0, 4, 3), [262, 25, 10], ST.fine);
      P(ctx, r, sdEllipse(12, -6, 3.5, 2), bbE(12, -6, 3.5, 2), [262, 30, 8], ST.fine); P(ctx, r, sdEllipse(12, 6, 3.5, 2), bbE(12, 6, 3.5, 2), [262, 30, 8], ST.fine);
      P(ctx, r, sdCapsule(-17, 0, -25, (f - 1) * 4, 1.8), [-28, -8, -14, 8], [262, 30, 10], ST.fine);
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(17, -2.8, 1.4, 0, TAU); ctx.arc(17, 2.8, 1.4, 0, TAU); ctx.fill();
    }));
  });
  J(() => {
    SPR.eyeball = [0, 1].map((f) => bake(56, 56, 540 + f, (ctx, r) => {
      P(ctx, r, sdEllipse(0, 0, 24, 17), bbE(0, 0, 24, 17), [12, 45, 55], ST.obj);
      P(ctx, r, sdEllipse(0, 0, 18, 13), bbE(0, 0, 18, 13), [40, 25, 92], { ...ST.obj, rim: 18 });
      for (let i = 0; i < 7; i++) { const a = r() * TAU; ctx.strokeStyle = 'rgba(190,30,40,0.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 17, Math.sin(a) * 12); ctx.quadraticCurveTo(Math.cos(a + 0.3) * 12, Math.sin(a + 0.3) * 8, Math.cos(a) * 8, Math.sin(a) * 6); ctx.stroke(); }
    }));
    SPR.iris = bake(20, 20, 545, (ctx, r) => { P(ctx, r, sdCircle(0, 0, 7.5), bbC(0, 0, 7.5), [190, 70, 40], ST.fine); ctx.fillStyle = '#0a0508'; ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-2, -2, 1.3, 0, TAU); ctx.fill(); });
  });
  J(() => {
    SPR.mouth = [0, 1].map((f) => bake(64, 50, 560 + f, (ctx, r) => {
      P(ctx, r, sdEllipse(0, 0, 26, 18), bbE(0, 0, 26, 18), [355, 60, 42], ST.obj);
      ctx.fillStyle = '#1a0308'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 10, 0, 0, TAU); ctx.fill();
      for (let i = -3; i <= 3; i++) { dab(ctx, r, i * 4.6, -8, 2.2, [45, 20, 90], Math.PI / 2); dab(ctx, r, i * 4.6, 8, 2.2, [45, 20, 88], Math.PI / 2); }
      P(ctx, r, sdEllipse(0, 3, 9, 4), bbE(0, 3, 9, 4), [345, 60, 55], ST.fine);
    }));
  });
  J(() => {
    SPR.melter = [0, 1, 2].map((f) => bake(70, 70, 580 + f, (ctx, r) => {
      const blob = sdWobble(sdU(sdEllipse(0, 0, 13, 19), sdCircle(4, 0, 10), sdCapsule(-4, -10, -22 - f * 2, -16, 4), sdCapsule(-4, 10, -24, 15 + f, 3.5), sdCapsule(-8, 0, -27 + f, 2, 3)), 2.5, 0.18, f + 3);
      P(ctx, r, blob, [-32, -30, 24, 30], [95, 45, 45], { ...ST.obj, hl: 0.15 });
      P(ctx, r, sdCircle(6, -3, 2.8), bbC(6, -3, 3), [55, 80, 85], ST.fine); P(ctx, r, sdCircle(5, 4, 2.2), bbC(5, 4, 3), [55, 80, 85], ST.fine);
    }));
  });
  J(() => {
    SPR.cart = [0, 1].map((f) => bake(64, 48, 600 + f, (ctx, r) => {
      const c = [210, 8, 68];
      P(ctx, r, sdSub(sdBox(-2, 0, 20, 15, 3), sdBox(-2, 0, 17, 12, 2)), bbB(-2, 0, 20, 15), c, ST.fine);
      for (let i = -16; i <= 12; i += 5) brush(ctx, i, -12, i + 0.5, 0, i, 12, 1.2, 210, 8, 60, 0.8, 8, 3, r);
      for (let j = -9; j <= 9; j += 6) brush(ctx, -18, j, -2, j + 0.5, 14, j, 1.2, 210, 8, 60, 0.8, 8, 3, r);
      P(ctx, r, sdCapsule(-26, -14, -26, 14, 2.4), [-30, -17, -22, 17], [355, 70, 45], ST.fine);
      P(ctx, r, sdCapsule(-22, -13, -26, -13, 1.2), [-28, -16, -20, -10], c, ST.fine); P(ctx, r, sdCapsule(-22, 13, -26, 13, 1.2), [-28, 10, -20, 16], c, ST.fine);
      if (f) for (let i = 0; i < 4; i++) dab(ctx, r, -10 + r() * 20, (r() - 0.5) * 18, 3, [r() * 360, 60, 55]);
    }));
  });
  J(() => {
    SPR.can = [0, 1].map((f) => bake(44, 44, 620 + f, (ctx, r) => {
      P(ctx, r, sdCircle(0, 0, 16), bbC(0, 0, 16), [200, 6, 72], { ...ST.obj, hl: 0.2 });
      P(ctx, r, sdSub(sdCircle(0, 0, 16), sdCircle(0, 0, 12.5)), bbC(0, 0, 16), [f ? 5 : 140, 60, 45], ST.fine);
      P(ctx, r, sdCircle(0, 0, 9), bbC(0, 0, 9), [40, 20, 92], ST.fine);
    }));
  });
  J(() => {
    SPR.sausage = bake(30, 30, 640, (ctx, r) => { P(ctx, r, sdCircle(0, 0, 10), bbC(0, 0, 10), [355, 50, 52], { ...ST.obj, hl: 0.15 }); for (let i = 0; i < 7; i++) dab(ctx, r, (r() - 0.5) * 12, (r() - 0.5) * 12, 1.4, [20, 30, 90]); });
    SPR.sausageHead = bake(36, 36, 641, (ctx, r) => { P(ctx, r, sdEllipse(0, 0, 13, 11), bbE(0, 0, 13, 11), [355, 52, 48], ST.obj); for (const s of [-1, 1]) { P(ctx, r, sdCircle(5, s * 4.5, 3), bbC(5, s * 4.5, 3), [50, 20, 94], ST.fine); ctx.fillStyle = '#100'; ctx.beginPath(); ctx.arc(6.3, s * 4.5, 1.3, 0, TAU); ctx.fill(); } ctx.strokeStyle = '#300'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(9, 0, 4, -1, 1); ctx.stroke(); });
  });
  J(() => {
    SPR.cherub = [0, 1].map((f) => bake(50, 50, 660 + f, (ctx, r) => {
      for (const s of [-1, 1]) P(ctx, r, sdEllipse(-4, s * (12 + f * 3), 8, 5), bbE(-4, s * 14, 9, 7), [50, 15, 95], ST.fine);
      P(ctx, r, sdCircle(0, 0, 9), bbC(0, 0, 9), [15, 55, 78], ST.obj);
      P(ctx, r, sdCircle(5, 0, 6), bbC(5, 0, 6), [18, 55, 80], ST.fine);
      P(ctx, r, sdSub(sdCircle(4, 0, 6.5), sdCircle(4, 0, 4.5)), bbC(4, 0, 7), [48, 90, 60], ST.fine);
    }));
  });
  J(() => {
    SPR.fish = [0, 1].map((f) => bake(44, 24, 680 + f, (ctx, r) => {
      P(ctx, r, sdEllipse(2, 0, 12, 5.5), bbE(2, 0, 12, 5.5), [200, 15, 70], { ...ST.fine, hl: 0.2 });
      P(ctx, r, sdTri(-9, 0, -18, -7 + f * 2, -18, 7 - f * 2), [-19, -8, -8, 8], [200, 20, 60], ST.fine);
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(10, -1.8, 1.2, 0, TAU); ctx.fill();
    }));
  });
  J(() => {
    SPR.tv = [0, 1].map((f) => bake(50, 44, 700 + f, (ctx, r) => {
      P(ctx, r, sdBox(0, 0, 20, 16, 4), bbB(0, 0, 20, 16), [25, 40, 30], ST.obj);
      P(ctx, r, sdBox(3, 0, 13, 12, 5), bbB(3, 0, 13, 12), [170, 25, f ? 70 : 55], { ...ST.fine, hl: 0.2 });
      P(ctx, r, sdCircle(-14, -8, 2), bbC(-14, -8, 2), [40, 50, 60], ST.fine); P(ctx, r, sdCircle(-14, 0, 2), bbC(-14, 0, 2), [40, 50, 60], ST.fine);
    }));
  });
  J(() => {
    SPR.couch = bake(80, 56, 720, (ctx, r) => {
      P(ctx, r, sdWobble(sdBox(0, 0, 32, 20, 8), 3, 0.15), bbB(0, 0, 35, 23), [20, 40, 30], ST.objBig);
      P(ctx, r, sdBox(4, -9, 18, 8, 4), bbB(4, -9, 18, 8), [20, 45, 40], ST.obj); P(ctx, r, sdBox(4, 9, 18, 8, 4), bbB(4, 9, 18, 8), [20, 45, 38], ST.obj);
      for (let i = 0; i < 5; i++) P(ctx, r, sdCircle(-25 + r() * 50, (r() - 0.5) * 36, 3 + r() * 3), bbC(0, 0, 40), [220, 5, 35], ST.fine);
    });
  });
  // Подбираемые вещи и оружие
  J(() => {
    const W = (k, w, h, s, fn) => { SPR['w_' + k] = bake(w, h, s, fn); };
    W('umbrella', 60, 18, 800, (c, r) => { P(c, r, sdCapsule(-20, 0, 18, 0, 3.5), [-24, -5, 22, 5], [230, 30, 18], ST.fine); P(c, r, sdCapsule(-27, 3, -22, 0, 1.5), [-29, -2, -20, 6], [25, 50, 30], ST.fine); P(c, r, sdCircle(20, 0, 1.6), bbC(20, 0, 2), [45, 10, 70], ST.fine); });
    W('baguette', 60, 18, 801, (c, r) => { P(c, r, sdCapsule(-22, 0, 22, 0, 4.2), [-27, -6, 27, 6], [35, 70, 58], { ...ST.fine, hl: 0.15 }); for (let i = -14; i <= 14; i += 7) brush(c, i - 2, -3, i, 0, i + 2, 3, 1.4, 30, 50, 82, 0.9, 5, 3, r); });
    W('bottle', 48, 18, 802, (c, r) => { P(c, r, sdCapsule(-12, 0, 6, 0, 5), [-18, -6, 12, 6], [135, 50, 30], { ...ST.fine, hl: 0.3 }); P(c, r, sdCapsule(6, 0, 16, 0, 2.2), [4, -3, 19, 3], [135, 50, 32], ST.fine); P(c, r, sdBox(-4, 0, 5, 4.5), bbB(-4, 0, 5, 4.5), [45, 60, 70], ST.fine); });
    W('rose', 40, 18, 803, (c, r) => { P(c, r, sdCapsule(-12, 0, 0, 0, 2.4), [-15, -4, 3, 4], [135, 50, 30], ST.fine); P(c, r, sdTri(0, -5, 0, 5, 12, 0), [-1, -6, 13, 6], [135, 45, 40], { ...ST.fine, hl: 0.4 }); P(c, r, sdTri(2, -6, 10, -7, 6, -1), [1, -8, 11, 0], [135, 45, 42], ST.fine); });
    W('pan', 54, 34, 804, (c, r) => { P(c, r, sdCapsule(-24, 0, -8, 0, 2.6), [-28, -4, -6, 4], [20, 30, 25], ST.fine); P(c, r, sdCircle(6, 0, 12), bbC(6, 0, 12), [220, 6, 20], { ...ST.obj, hl: 0.15 }); P(c, r, sdCircle(6, 0, 8.5), bbC(6, 0, 8.5), [220, 5, 28], ST.fine); });
    W('brick', 34, 24, 805, (c, r) => { P(c, r, sdBox(0, 0, 12, 7, 1.5), bbB(0, 0, 12, 7), [12, 55, 42], ST.obj); });
    W('pipe', 60, 14, 806, (c, r) => { P(c, r, sdCapsule(-24, 0, 24, 0, 2.8), [-28, -5, 28, 5], [200, 8, 45], { ...ST.fine, hl: 0.3 }); });
    W('fists', 10, 10, 807, () => {});
    // дары галлюцинаций
    W('bow', 40, 64, 820, (c, r) => { for (let k = 0; k < 5; k++) { const rr = 24 - k * 1.8; c.strokeStyle = hsl(k * 60, 85, 58, 0.9); c.lineWidth = 2.2; c.beginPath(); c.arc(-12, 0, rr, -1.1, 1.1); c.stroke(); } c.strokeStyle = 'rgba(255,255,240,0.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-12 + Math.cos(-1.1) * 24, Math.sin(-1.1) * 24); c.lineTo(-12 + Math.cos(1.1) * 24, Math.sin(1.1) * 24); c.stroke(); });
    W('blaster', 50, 36, 821, (c, r) => { P(c, r, sdCircle(-4, 0, 9), bbC(-4, 0, 9), [320, 60, 65], { ...ST.obj, hl: 0.3 }); P(c, r, sdCapsule(2, 0, 18, 0, 5), [0, -6, 22, 6], [320, 55, 60], ST.fine); P(c, r, sdCapsule(-6, 4, -12, 14, 3), [-16, 2, -3, 17], [320, 40, 45], ST.fine); P(c, r, sdCircle(19, 0, 3.5), bbC(19, 0, 3.5), [180, 90, 65], ST.fine); });
    W('flamebrush', 70, 22, 822, (c, r) => { P(c, r, sdCapsule(-30, 0, 8, 0, 2.6), [-33, -4, 11, 4], [25, 50, 40], ST.fine); P(c, r, sdBox(10, 0, 4, 4.5, 1), bbB(10, 0, 4, 4.5), [45, 10, 70], ST.fine); P(c, r, sdEllipse(22, 0, 9, 6), bbE(22, 0, 9, 6), [8, 85, 50], { ...ST.fine, hl: 0.3 }); });
    W('breadboom', 50, 50, 823, (c, r) => { P(c, r, sdSub(sdCircle(0, 0, 16), sdCircle(0, 0, 8)), bbC(0, 0, 16), [36, 70, 55], { ...ST.obj, hl: 0.2 }); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; brush(c, Math.cos(a) * 10, Math.sin(a) * 10, Math.cos(a + 0.2) * 12, Math.sin(a + 0.2) * 12, Math.cos(a + 0.35) * 14, Math.sin(a + 0.35) * 14, 1.4, 32, 50, 82, 0.8, 5, 3, r); } });
    W('toaster', 46, 36, 824, (c, r) => { P(c, r, sdBox(0, 0, 14, 11, 4), bbB(0, 0, 14, 11), [200, 12, 78], { ...ST.obj, hl: 0.35 }); P(c, r, sdBox(9, -4, 3, 6, 1), bbB(9, -4, 3, 6), [30, 60, 55], ST.fine); P(c, r, sdBox(9, 5, 3, 4, 1), bbB(9, 5, 3, 4), [30, 60, 50], ST.fine); P(c, r, sdCircle(-9, 9, 2.5), bbC(-9, 9, 2.5), [0, 70, 50], ST.fine); });
    W('easel', 50, 50, 825, (c, r) => { P(c, r, sdCapsule(-14, -14, 14, 0, 1.8), [-16, -16, 16, 2], [28, 45, 40], ST.fine); P(c, r, sdCapsule(-14, 14, 14, 0, 1.8), [-16, -2, 16, 16], [28, 45, 40], ST.fine); P(c, r, sdBox(6, 0, 7, 12, 1), bbB(6, 0, 7, 12), [40, 25, 88], ST.fine); for (let i = 0; i < 4; i++) dab(c, r, 4 + r() * 6, -8 + r() * 16, 2, [r() * 360, 70, 55]); });
    SPR.pill = bake(22, 14, 840, (c, r) => { P(c, r, sdCapsule(-5, 0, 0, 0, 4), [-10, -5, 2, 5], [0, 0, 94], { ...ST.fine, hl: 0.4 }); P(c, r, sdCapsule(0, 0, 5, 0, 4), [-2, -5, 10, 5], [205, 70, 55], { ...ST.fine, hl: 0.4 }); });
    SPR.tea = bake(30, 30, 841, (c, r) => { P(c, r, sdCircle(0, 0, 9), bbC(0, 0, 9), [0, 0, 92], ST.obj); P(c, r, sdCircle(0, 0, 6.5), bbC(0, 0, 6.5), [28, 75, 35], ST.fine); P(c, r, sdSub(sdCircle(11, 0, 4), sdCircle(11, 0, 2)), bbC(11, 0, 4), [0, 0, 90], ST.fine); });
    SPR.sandwich = bake(30, 26, 842, (c, r) => { P(c, r, sdBox(0, 0, 10, 7, 3), bbB(0, 0, 10, 7), [36, 60, 62], ST.obj); P(c, r, sdBox(0, 0, 8, 5, 2), bbB(0, 0, 8, 5), [350, 55, 62], ST.fine); for (let i = 0; i < 3; i++) dab(c, r, -5 + i * 5, 0, 1.5, [100, 50, 45]); });
    SPR.toast = bake(22, 22, 843, (c, r) => { P(c, r, sdBox(0, 0, 7, 7, 2.5), bbB(0, 0, 7, 7), [30, 65, 45], ST.fine); P(c, r, sdBox(0, 0, 5, 5, 2), bbB(0, 0, 5, 5), [40, 60, 70], ST.fine); });
    SPR.canvasProj = bake(30, 26, 844, (c, r) => { P(c, r, sdBox(0, 0, 11, 8.5, 1), bbB(0, 0, 11, 8.5), [35, 50, 40], ST.fine); P(c, r, sdBox(0, 0, 8, 6, 1), bbB(0, 0, 8, 6), [200, 40, 70], ST.fine); for (let i = 0; i < 4; i++) dab(c, r, -5 + r() * 10, -3 + r() * 6, 1.6, [r() * 360, 65, 55]); });
    SPR.loaf = bake(34, 22, 845, (c, r) => { P(c, r, sdEllipse(0, 0, 12, 7), bbE(0, 0, 12, 7), [33, 70, 52], { ...ST.obj, hl: 0.2 }); for (let i = -6; i <= 6; i += 6) brush(c, i - 2, -4, i, 0, i + 2, 4, 1.4, 30, 50, 80, 0.9, 5, 3, r); });
    SPR.nuke = bake(30, 20, 846, (c, r) => { P(c, r, sdEllipse(0, 0, 10, 5.5), bbE(0, 0, 10, 5.5), [90, 20, 40], ST.obj); P(c, r, sdTri(-9, 0, -14, -6, -14, 6), [-15, -7, -8, 7], [90, 20, 35], ST.fine); P(c, r, sdCircle(4, 0, 2.5), bbC(4, 0, 2.5), [50, 90, 55], ST.fine); });
    SPR.pitchfork = bake(90, 30, 847, (c, r) => { P(c, r, sdCapsule(-40, 0, 20, 0, 2.2), [-43, -4, 23, 4], [20, 40, 22], ST.fine); for (const s of [-8, 0, 8]) P(c, r, sdCapsule(20, s, 38, s, 1.8), [18, s - 3, 41, s + 3], [0, 10, 25], ST.fine); P(c, r, sdCapsule(20, -8, 20, 8, 1.8), [17, -11, 23, 11], [0, 10, 25], ST.fine); });
    SPR.hand = bake(110, 110, 848, (c, r) => {
      P(c, r, sdEllipse(-6, 0, 30, 34), bbE(-6, 0, 30, 34), [28, 45, 78], ST.objBig);
      for (let i = 0; i < 4; i++) { const y = -24 + i * 16; P(c, r, sdCapsule(18, y, 44 - Math.abs(i - 1.5) * 4, y * 1.05, 7), [10, y - 9, 50, y + 9], [28, 45, 80], ST.obj); }
      P(c, r, sdCapsule(-6, 30, 16, 46, 7.5), [-14, 22, 25, 55], [28, 45, 78], ST.obj);
      P(c, r, sdBox(-36, 0, 6, 30, 3), bbB(-36, 0, 6, 30), [45, 10, 95], ST.obj);
    });
  });
  // Боссы (фронтальные портреты — галлюцинации смотрят прямо на тебя)
  J(() => { SPR.b_psych = [0, 1].map((f) => bake(280, 280, 900 + f, (c, r) => bakePsych(c, r, f))); });
  J(() => { SPR.b_god = [0, 1].map((f) => bake(300, 300, 910 + f, (c, r) => bakeGod(c, r, f))); });
  J(() => { SPR.b_devil = [0, 1].map((f) => bake(200, 200, 920 + f, (c, r) => bakeDevil(c, r, f))); });
  J(() => { SPR.b_jesus = [0, 1].map((f) => bake(170, 190, 930 + f, (c, r) => bakeJesus(c, r, f))); });
  J(() => { SPR.b_reynolds = [0, 1].map((f) => bake(170, 190, 940 + f, (c, r) => bakeReynolds(c, r, f))); });
  J(() => { SPR.b_adolf = [0, 1].map((f) => bake(170, 190, 950 + f, (c, r) => bakeAdolf(c, r, f))); });
  J(() => { SPR.b_cashier = [0, 1].map((f) => bake(170, 150, 960 + f, (c, r) => bakeCashier(c, r, f))); SPR.cashHead = [0, 1].map((f) => bake(70, 70, 965 + f, (c, r) => bakeCashHead(c, r, f))); });
  return jobs;
}

// ── портреты боссов ──
function faceEyes(c, r, x, y, sp, R, irisC, look = 0) {
  for (const s of [-1, 1]) {
    P(c, r, sdEllipse(x + s * sp, y, R, R * 0.7), bbE(x + s * sp, y, R, R * 0.7), [40, 20, 94], ST.fine);
    P(c, r, sdCircle(x + s * sp + look, y, R * 0.45), bbC(x + s * sp, y, R * 0.5), irisC, ST.fine);
    c.fillStyle = '#0b0608'; c.beginPath(); c.arc(x + s * sp + look, y, R * 0.22, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(x + s * sp + look - R * 0.15, y - R * 0.15, R * 0.1, 0, TAU); c.fill();
  }
}
function bakePsych(c, r, f) {
  // Планета-голова психолога: полосы как у Юпитера, очки, блокнот
  const R = 118;
  P(c, r, sdCircle(0, 0, R), bbC(0, 0, R), (x, y) => { const b = Math.sin(y * 0.09 + noise2(x * 0.02, y * 0.02, 4) * 2.2); return [28 + b * 14, 50 + b * 10, 58 + b * 12]; }, { ...ST.boss, dir: 0, aj: 0.3 });
  P(c, r, sdEllipse(40, 50, 26, 15), bbE(40, 50, 26, 15), [8, 60, 45], ST.objBig); // большое красное пятно
  faceEyes(c, r, 0, -18, 42, 20, [200, 50, 40], f ? 3 : -3);
  for (const s of [-1, 1]) { c.strokeStyle = 'rgba(20,10,10,.9)'; c.lineWidth = 6; c.beginPath(); c.arc(s * 42, -18, 30, 0, TAU); c.stroke(); }
  c.lineWidth = 5; c.beginPath(); c.moveTo(-12, -20); c.quadraticCurveTo(0, -30, 12, -20); c.stroke();
  P(c, r, sdEllipse(0, 22, 9, 16), bbE(0, 22, 9, 16), [25, 45, 62], ST.obj); // нос
  P(c, r, sdEllipse(0, 60, 34, f ? 10 : 6), bbE(0, 60, 34, 10), [355, 40, 35], ST.obj); // рот «мм-хм»
  P(c, r, sdEllipse(0, 46, 40, 9), bbE(0, 46, 40, 9), [30, 25, 30], ST.obj); // усы
}
function bakeGod(c, r, f) {
  P(c, r, sdCircle(0, -10, 128), bbC(0, -10, 128), [48, 80, 75, 0.35], { ...ST.boss, dir: 'radial', shade: 0 }); // сияние
  P(c, r, sdEllipse(0, -18, 70, 86), bbE(0, -18, 70, 86), [28, 45, 76], ST.boss);
  P(c, r, sdSub(sdEllipse(0, -40, 78, 82), sdEllipse(0, -6, 66, 74)), bbE(0, -40, 78, 82), [45, 8, 94], { ...ST.boss, dir: 'contour' }); // волосы
  P(c, r, sdWobble(sdU(sdEllipse(0, 52, 74, 64), sdTri(-60, 40, 60, 40, 0, 140)), 5, 0.06, f), [-80, -10, 80, 145], [45, 6, 95], { ...ST.boss, dir: Math.PI / 2, aj: 0.6 }); // борода
  faceEyes(c, r, 0, -30, 30, 15, [205, 70, 55], f ? 2 : -2);
  for (const s of [-1, 1]) P(c, r, sdCapsule(s * 16, -52, s * 46, -56 - f * 3, 5), [s * 16 - 8, -64, s * 46 + 8, -46], [45, 8, 96], ST.obj);
  P(c, r, sdEllipse(0, 2, 10, 18), bbE(0, 2, 10, 18), [26, 45, 70], ST.obj);
  P(c, r, sdEllipse(0, 30, 50, 12), bbE(0, 30, 50, 12), [45, 6, 97], ST.obj);
  P(c, r, sdEllipse(0, 42, 16, f ? 9 : 5), bbE(0, 42, 16, 9), [355, 30, 30], ST.obj);
}
function bakeDevil(c, r, f) {
  for (const s of [-1, 1]) P(c, r, sdWobble(sdTri(s * 20, -10, s * 98, -60 - f * 8, s * 80, 40), 4, 0.07, s + f), [s > 0 ? 15 : -100, -75, s > 0 ? 100 : -15, 45], [350, 40, 16], ST.objBig);
  P(c, r, sdEllipse(0, 30, 38, 50), bbE(0, 30, 38, 50), [355, 70, 34], ST.boss);
  P(c, r, sdCircle(0, -36, 34), bbC(0, -36, 34), [358, 72, 42], ST.boss);
  for (const s of [-1, 1]) P(c, r, sdU(sdCapsule(s * 18, -60, s * 30, -84, 7), sdCapsule(s * 30, -84, s * 24, -98, 4)), [s * 10 - 12, -104, s * 34 + 12, -52], [40, 25, 82], ST.obj);
  faceEyes(c, r, 0, -42, 14, 8, [50, 95, 55], f ? 1 : -1);
  for (const s of [-1, 1]) { c.strokeStyle = '#1a0004'; c.lineWidth = 4; c.beginPath(); c.moveTo(s * 4, -54); c.lineTo(s * 24, -50 - f * 3); c.stroke(); }
  P(c, r, sdTri(-14, -22, 14, -22, 0, 6), [-15, -23, 15, 7], [355, 60, 22], ST.fine); // бородка
  c.strokeStyle = '#250006'; c.lineWidth = 3; c.beginPath(); c.moveTo(-16, -26); c.quadraticCurveTo(0, -18 + f * 4, 16, -26); c.stroke();
  P(c, r, sdBox(0, 30, 10, 14, 2), bbB(0, 30, 10, 14), [45, 20, 90], ST.obj); // галстук-договор
  c.fillStyle = 'rgba(30,10,10,.8)'; for (let i = 0; i < 4; i++) c.fillRect(-6, 22 + i * 5, 12, 1.4);
}
function robed(c, r, robe, f) { P(c, r, sdWobble(sdU(sdEllipse(0, 40, 46, 52), sdBox(0, 70, 50, 26, 10)), 2, 0.1, f), [-54, -16, 54, 98], robe, ST.objBig); }
function bakeJesus(c, r, f) {
  robed(c, r, [40, 20, 92], f);
  P(c, r, sdCapsule(-22, 0, 22, 70, 7), [-32, -8, 32, 80], [355, 55, 42], ST.obj); // красная перевязь
  P(c, r, sdEllipse(0, -26, 34, 44), bbE(0, -26, 34, 44), [25, 40, 26], ST.objBig); // волосы
  P(c, r, sdEllipse(0, -30, 23, 29), bbE(0, -30, 23, 29), [24, 42, 70], ST.obj);
  P(c, r, sdWobble(sdEllipse(0, -8, 20, 18), 1.5, 0.2, f), bbE(0, -8, 22, 20), [25, 40, 27], ST.obj);
  faceEyes(c, r, 0, -36, 10, 6, [30, 50, 35], f);
  P(c, r, sdEllipse(0, -14, 8, 2.8), bbE(0, -14, 8, 3), [355, 35, 45], ST.fine);
  for (const s of [-1, 1]) P(c, r, sdCircle(s * 50, 34 + f * 4, 8), bbC(s * 50, 34, 9), [24, 42, 72], ST.obj);
}
function bakeReynolds(c, r, f) {
  P(c, r, sdU(sdEllipse(0, 46, 50, 44), sdBox(0, 70, 52, 24, 8)), [-56, 0, 56, 96], [215, 12, 34], ST.objBig); // костюм
  P(c, r, sdTri(-12, 4, 12, 4, 0, 40), [-13, 3, 13, 41], [0, 0, 94], ST.obj);
  P(c, r, sdTri(-4, 8, 4, 8, 0, 44), [-5, 7, 5, 45], [355, 65, 40], ST.fine);
  P(c, r, sdEllipse(0, -30, 27, 32), bbE(0, -30, 27, 32), [22, 45, 70], ST.obj);
  P(c, r, sdSub(sdEllipse(-2, -48, 30, 20), sdEllipse(4, -36, 26, 16)), bbE(0, -48, 30, 22), [30, 15, 70], ST.obj); // седой кок
  faceEyes(c, r, 0, -34, 11, 6, [210, 60, 50], f ? 1 : -1);
  P(c, r, sdEllipse(0, -12, 15, f ? 6 : 4), bbE(0, -12, 15, 6), [0, 0, 97], ST.fine); // голливудская улыбка
  c.strokeStyle = 'rgba(120,20,20,.8)'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(0, -12, 15, f ? 6 : 4, 0, 0, TAU); c.stroke();
  for (const s of [-1, 1]) P(c, r, sdCircle(s * 54, 40 - (s > 0 ? f * 18 : 0), 8), bbC(s * 54, 30, 20), [22, 45, 72], ST.obj);
}
function bakeAdolf(c, r, f) {
  // Абитуриент Венской академии художеств, 1907: берет, палитра, обида
  P(c, r, sdU(sdEllipse(0, 46, 44, 44), sdBox(0, 70, 46, 24, 8)), [-50, 0, 50, 96], [28, 25, 30], ST.objBig);
  P(c, r, sdEllipse(0, -28, 24, 30), bbE(0, -28, 24, 30), [26, 35, 72], ST.obj);
  P(c, r, sdEllipse(-4, -54, 30, 13), bbE(-4, -54, 30, 13), [345, 30, 22], ST.obj); // берет студента
  P(c, r, sdSub(sdEllipse(-8, -42, 18, 9), sdEllipse(10, -34, 18, 10)), bbE(-8, -42, 18, 10), [25, 25, 14], ST.fine); // чёлка
  faceEyes(c, r, 0, -30, 10, 6, [210, 40, 40], f ? 2 : -2);
  for (const s of [-1, 1]) { c.strokeStyle = '#1a0d08'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(s * 3, -38); c.lineTo(s * 17, -36 + f * 2); c.stroke(); } // нахмуренные брови
  P(c, r, sdBox(0, -16, 4.5, 3, 1), bbB(0, -16, 5, 3.5), [20, 30, 12], ST.fine);
  c.strokeStyle = '#3a1010'; c.lineWidth = 2; c.beginPath(); c.moveTo(-8, -9); c.quadraticCurveTo(0, -12 - f * 2, 8, -9); c.stroke();
  P(c, r, sdSub(sdEllipse(46, 46, 22, 15), sdCircle(54, 52, 5)), bbE(46, 46, 22, 15), [35, 40, 65], ST.obj); // палитра
  const cols = [[0, 70, 50], [50, 85, 60], [210, 70, 50], [120, 50, 40], [0, 0, 95]];
  cols.forEach((cc, i) => dab(c, r, 34 + i * 6, 38 + (i % 2) * 6, 3, cc));
}
function bakeCashier(c, r, f) {
  P(c, r, sdWobble(sdEllipse(0, 20, 64, 52), 3, 0.08, f), bbE(0, 20, 68, 56), [345, 45, 42], ST.boss);
  P(c, r, sdBox(0, 30, 40, 16, 5), bbB(0, 30, 40, 16), [50, 20, 90], ST.obj); // бейджик/фартук
  c.fillStyle = 'rgba(30,10,10,.8)'; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.fillText(LANG === 'ru' ? 'КАССА' : 'CASHIER', 0, 35);
}
function bakeCashHead(c, r, f) {
  P(c, r, sdCircle(0, 0, 24), bbC(0, 0, 24), [25, 45, 70], ST.obj);
  P(c, r, sdSub(sdCircle(0, -6, 27), sdCircle(0, 6, 22)), bbC(0, -6, 27), [40, 60, 40], ST.obj); // перманент
  P(c, r, sdBox(0, -26, 16, 5, 2), bbB(0, -26, 16, 5), [345, 50, 45], ST.fine); // пилотка
  faceEyes(c, r, 0, -2, 8, 5, [120, 40, 40], f);
  P(c, r, sdEllipse(0, 12, 8, f ? 5 : 2.5), bbE(0, 12, 8, 5), [350, 70, 35], ST.fine);
}
