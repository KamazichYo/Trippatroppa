'use strict';
// ───────────── ИИ-режиссёр: волны галлюцинаций, нарастание и откат ─────────────
// Следит за стрессом игрока и его стилем, сам подбирает, кого и откуда прислать.
class Director {
  constructor(cfg, rect, opts = {}) {
    this.cfg = cfg; this.rect = rect; this.opts = opts;
    this.state = 'calm'; this.stT = opts.calm ?? 4; this.wave = 0; this.stress = 0; this.peakStress = 0;
    this.spawnT = 0; this.budget = 0; this.spent = 0; this.recent = []; this.done = false; this.formation = 'mixed';
    this.style = { melee: 1, ranged: 1, still: 0, lastX: 0, lastY: 0, sampleT: 0, moved: 0, hurtBy: {} };
    this.waves = cfg.waves; this.events = [];
  }
  get intensity() { return clamp(this.stress * 0.7 + (this.state === 'peak' ? 0.3 : this.state === 'build' ? 0.15 : 0), 0, 1); }
  onHurt(d, src) { this.stress = clamp(this.stress + d / 55, 0, 1); if (src && src.type) this.style.hurtBy[src.type] = (this.style.hurtBy[src.type] || 0) + d; }
  onKill(e, src) { this.stress = clamp(this.stress + 0.025, 0, 1); if (src === 'melee') this.style.melee++; else this.style.ranged++; }
  alive() { return G.enemies.filter((e) => !e.boss && !e.ambient).length; }
  update(dt) {
    const p = G.P, s = this.style;
    // стресс: близость врагов + низкий рассудок, затухает в спокойствии
    let near = 0; for (const e of G.enemies) if (!e.hidden && dist2(e.x, e.y, p.x, p.y) < 260 * 260) near++;
    const target = clamp(near * 0.07 + (1 - p.hp / p.max) * 0.35, 0, 1);
    this.stress = clamp(this.stress + (target - this.stress) * dt * 0.35 - dt * 0.012, 0, 1);
    this.peakStress = Math.max(this.peakStress, this.stress);
    // стиль: стоит ли игрок на месте («окопался»)
    s.sampleT -= dt;
    if (s.sampleT <= 0) { s.sampleT = 1; s.moved = dist(s.lastX, s.lastY, p.x, p.y); s.lastX = p.x; s.lastY = p.y; s.still = s.moved < 70 ? Math.min(6, s.still + 1) : Math.max(0, s.still - 2); }
    this.stT -= dt;
    switch (this.state) {
      case 'calm': if (this.stT <= 0) this.startWave(); break;
      case 'build':
        this.spawnTick(dt, 1.0);
        if (this.spent >= this.budget * 0.55 || this.stress > 0.7 || this.stT <= 0) { this.state = 'peak'; this.stT = 10 + this.wave; this.peakFx(); }
        break;
      case 'peak':
        this.spawnTick(dt, 1.8);
        if (this.spent >= this.budget || this.stT <= 0) { this.state = 'fade'; this.stT = 16; }
        break;
      case 'fade':
        if (this.alive() <= Math.max(1, Math.floor(this.cfg.maxAlive * 0.15)) || this.stT <= 0) {
          if (this.alive() === 0 || this.stT <= 0) this.endWave();
        }
        break;
      case 'relax':
        if (this.stT <= 0) this.startWave();
        break;
    }
  }
  startWave() {
    if (this.wave >= this.waves) { this.state = 'done'; this.done = true; return; }
    this.wave++;
    // бюджет зависит от того, как игрок пережил прошлую волну
    const [a, b] = this.cfg.budget;
    const ease = this.peakStress > 0.75 ? -2 : this.peakStress < 0.35 ? 2 : 0;
    this.budget = Math.round(lerp(a, b, (this.wave - 1) / Math.max(1, this.waves - 1))) + ease;
    this.spent = 0; this.peakStress = 0; this.state = 'build'; this.stT = 9; this.spawnT = 0.5;
    this.formation = weightedPick([['mixed', 3], ['pincer', 1.2], ['ambush', this.style.still > 2 ? 3 : 1], ['swarm', 1], ['choir', this.cfg.pool.whisperer || this.cfg.pool.voice ? 1.2 : 0]]);
    this.events.push({ t: 'wave', wave: this.wave });
  }
  endWave() {
    this.state = 'relax'; this.stT = this.cfg.relax || 7;
    this.events.push({ t: 'relax', wave: this.wave });
    // передышка: подкинуть лечение, если тяжко
    const p = G.P;
    if (p.hp < p.max * 0.7 || chance(0.4)) { const sp = freeSpot(G.map, p.x - 240, p.y - 240, p.x + 240, p.y + 240); if (sp) addPickup(sp.x, sp.y, p.hp < 40 ? 'tea' : pick(['pill', 'sandwich'])); }
    if (p.hand.id === 'fists' && chance(0.7)) { const sp = freeSpot(G.map, p.x - 200, p.y - 200, p.x + 200, p.y + 200); if (sp) addPickup(sp.x, sp.y, pick(['baguette', 'umbrella', 'bottle', 'pan', 'pipe', 'brick'])); }
    if (this.wave >= this.waves) { this.state = 'done'; this.done = true; }
  }
  peakFx() { G.flash = 0.25; AU.play('roar', 0); this.events.push({ t: 'peak' }); }
  // Выбор типа: веса зоны × стиль игрока × разнообразие × состояние рассудка
  chooseType() {
    const s = this.style, p = G.P, pool = this.cfg.pool;
    const rangedHeavy = s.ranged / (s.melee + s.ranged), lowHp = p.hp < 40;
    const entries = Object.entries(pool).map(([t, w]) => {
      const tags = EDEF[t].tags || [];
      let k = w;
      if (s.still > 2 && (tags.includes('rush') || tags.includes('flank') || tags.includes('ambush'))) k *= 1.8; // окопался — выкурим
      if (rangedHeavy > 0.6 && (tags.includes('rush') || tags.includes('stalker'))) k *= 1.5;      // стреляет издалека — быстрые
      if (rangedHeavy < 0.4 && tags.includes('ranged')) k *= 1.5;                                   // машет в упор — дальние
      if (lowHp && (tags.includes('tank') || tags.includes('sniper'))) k *= 0.4;                     // пожалеем
      if ((s.hurtBy[t] || 0) > 40) k *= 0.6;                                                         // этот уже достал
      const rc = this.recent.filter((r) => r === t).length; k *= Math.pow(0.6, rc);                  // разнообразие
      return [t, k];
    });
    const t = weightedPick(entries);
    this.recent.push(t); if (this.recent.length > 5) this.recent.shift();
    return t;
  }
  spawnTick(dt, rate) {
    this.spawnT -= dt;
    if (this.spawnT > 0 || this.spent >= this.budget) return;
    if (this.alive() >= this.cfg.maxAlive) { this.spawnT = 0.5; return; }
    const type = this.chooseType();
    const d = EDEF[type];
    const n = d.group ? randi(d.group[0], d.group[1]) : this.formation === 'swarm' && (d.tags || []).includes('rush') ? 2 : 1;
    const mode = this.formation === 'ambush' ? (chance(0.6) ? 'behind' : 'edge') : this.formation === 'pincer' ? (this.wave % 2 ? 'left' : 'right') : this.formation === 'choir' && (d.tags || []).includes('ranged') ? 'ring' : 'edge';
    let pos = this.spawnPos(type, mode);
    if (!pos) { this.spawnT = 0.3; return; }
    for (let i = 0; i < n; i++) { spawnEnemy(type, pos.x + rand(-20, 20) * (n > 1 ? 1 : 0), pos.y + rand(-20, 20) * (n > 1 ? 1 : 0)); }
    if (this.formation === 'pincer' && chance(0.5)) { const p2 = this.spawnPos(type, this.wave % 2 ? 'right' : 'left'); if (p2) spawnEnemy(type, p2.x, p2.y); }
    this.spent += n > 1 ? Math.ceil(n / 2) : 1;
    this.spawnT = rand(0.85, 1.6) / rate;
  }
  spawnPos(type, mode) {
    const p = G.P, m = G.map, [x0, y0, x1, y1] = this.rect, beh = EDEF[type].beh;
    const view = viewRect(60);
    if (beh === 'mouth') return { x: p.x, y: p.y };
    if (beh === 'mimic') { for (let i = 0; i < 25; i++) { const a = rand(TAU), r = rand(240, 430), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if (x > x0 && x < x1 && y > y0 && y < y1 && !isBlocked(m, x, y) && !isBlocked(m, x + 24, y) && !isBlocked(m, x - 24, y)) return { x, y }; } return null; }
    if (beh === 'turret' && m.name === 'store') { // консервы прямо на полках
      const shelves = [300, 500, 680, 1060, 1240, 1440]; for (let i = 0; i < 10; i++) { const sx = pick(shelves) + 32, sy = rand(500, 960); if (dist(sx, sy, p.x, p.y) > 200) return { x: sx, y: sy, onShelf: true }; } return null;
    }
    if (beh === 'starer') { const sp = freeSpot(m, Math.max(x0, p.x - 450), Math.max(y0, p.y - 400), Math.min(x1, p.x + 450), Math.min(y1, p.y + 400)); return sp && dist(sp.x, sp.y, p.x, p.y) > 220 ? sp : null; }
    for (let i = 0; i < 40; i++) {
      let a, r = rand(480, 760);
      const look = INPUT.aimAng;
      if (mode === 'behind') a = look + Math.PI + rand(-0.7, 0.7);
      else if (mode === 'left') a = look - Math.PI / 2 + rand(-0.5, 0.5);
      else if (mode === 'right') a = look + Math.PI / 2 + rand(-0.5, 0.5);
      else if (mode === 'ring') { a = rand(TAU); r = rand(380, 520); }
      else a = rand(TAU);
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      if (isBlocked(m, x, y)) continue;
      const inView = x > view[0] && x < view[2] && y > view[1] && y < view[3];
      if (inView && mode !== 'ring' && i < 30) continue;
      if (!EDEF[type].fly) { const c = Math.floor(y / CELL) * m.gw + Math.floor(x / CELL); if (m.flow[c] > 60) continue; }
      return { x, y };
    }
    return null;
  }
}
