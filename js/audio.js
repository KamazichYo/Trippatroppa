'use strict';
// ───────────── звук: синтез эффектов, сердцебиение-музыка, голоса в голове ─────────────
const AU = {
  ctx: null, master: null, sfx: null, mus: null, noise: null, on: false,
  voices: true, intensity: 0, zoneKey: 0, boss: false, lastVoice: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = (this.ctx = new AC());
    this.master = c.createGain(); this.master.gain.value = 0.8;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.7; this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.gain.value = 0.45; this.mus.connect(this.master);
    // реверб из шума — «комната в голове»
    this.verb = c.createConvolver(); const len = c.sampleRate * 2.2, ib = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ib.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.verb.buffer = ib; this.verbGain = c.createGain(); this.verbGain.gain.value = 0.35; this.verb.connect(this.verbGain); this.verbGain.connect(this.master);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb; this.on = true;
    this.startMusic();
  },
  pan(p) { const n = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null; if (n) n.pan.value = clamp(p, -1, 1); return n; },
  out(node, p = 0, verb = 0) {
    const pn = this.pan(p); let last = node;
    if (pn) { node.connect(pn); last = pn; }
    last.connect(this.sfx); if (verb) { const g = this.ctx.createGain(); g.gain.value = verb; last.connect(g); g.connect(this.verb); }
  },
  tone(f, dur, type = 'sine', vol = 0.3, slide = 0, p = 0, verb = 0, delay = 0) {
    if (!this.on) return; const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); this.out(g, p, verb); o.start(t); o.stop(t + dur + 0.05);
  },
  hiss(dur, freq = 1000, q = 1, vol = 0.3, p = 0, sweep = 0, type = 'bandpass', verb = 0, delay = 0) {
    if (!this.on) return; const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(freq, t); fl.Q.value = q;
    if (sweep) fl.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); this.out(g, p, verb); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  // готовые эффекты
  play(name, p = 0, k = 1) {
    if (!this.on) return;
    switch (name) {
      case 'swing': this.hiss(0.16, 900, 1.2, 0.18 * k, p, 3); break;
      case 'hit': this.tone(110, 0.12, 'sine', 0.5 * k, 0.5, p); this.hiss(0.1, 600, 1, 0.3 * k, p, 0.4); break;
      case 'splat': this.hiss(0.22, 500, 2, 0.35 * k, p, 0.3, 'lowpass'); this.tone(180 + Math.random() * 80, 0.18, 'triangle', 0.18 * k, 0.4, p); break;
      case 'shoot': this.tone(880, 0.12, 'square', 0.12 * k, 0.35, p); this.hiss(0.06, 3000, 1, 0.1, p); break;
      case 'bow': this.tone(240, 0.25, 'triangle', 0.25 * k, 1.6, p); this.hiss(0.15, 2000, 3, 0.1, p, 2); break;
      case 'flame': this.hiss(0.12, 700, 0.7, 0.12 * k, p, 1.4, 'lowpass'); break;
      case 'throw': this.hiss(0.2, 1400, 1, 0.15, p, 0.5); break;
      case 'break': this.hiss(0.3, 4000, 0.8, 0.3, p, 0.6, 'highpass'); for (let i = 0; i < 4; i++) this.tone(2000 + Math.random() * 3000, 0.08, 'sine', 0.08, 1, p, 0, i * 0.03); break;
      case 'pickup': this.tone(520, 0.08, 'triangle', 0.2, 1.5, p); this.tone(780, 0.12, 'triangle', 0.15, 1.2, p, 0, 0.06); break;
      case 'heal': [523, 659, 784].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.14, 1, 0, 0.3, i * 0.07)); break;
      case 'dash': this.hiss(0.22, 600, 0.8, 0.22, p, 4); break;
      case 'hurt': this.tone(70, 0.35, 'sine', 0.7, 0.6); this.tone(3400 + Math.random() * 400, 0.6, 'sine', 0.05, 1, 0, 0.4); break;
      case 'whisper': for (let i = 0; i < 3; i++) this.hiss(0.12 + Math.random() * 0.15, 2200 + Math.random() * 2400, 6, 0.14 * k, p, 0.7 + Math.random() * 0.6, 'bandpass', 0.6, i * 0.14); break;
      case 'word': this.tone(300 + Math.random() * 200, 0.15, 'sawtooth', 0.05 * k, 0.6, p); this.hiss(0.15, 3000, 4, 0.08 * k, p, 0.6, 'bandpass', 0.4); break;
      case 'scream': this.tone(420, 0.6, 'sawtooth', 0.12 * k, 0.4, p, 0.6); this.hiss(0.6, 1800, 2, 0.2 * k, p, 0.4, 'bandpass', 0.6); break;
      case 'gate': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.9, 'sine', 0.12, 1, 0, 0.7, i * 0.09)); break;
      case 'boom': this.tone(55, 1.2, 'sine', 0.8, 0.4); this.hiss(1.2, 300, 0.7, 0.6, p, 0.2, 'lowpass', 0.5); break;
      case 'roar': this.tone(70, 1.1, 'sawtooth', 0.25, 0.7, p, 0.5); this.tone(73, 1.1, 'sawtooth', 0.2, 0.68, p, 0.5); this.hiss(1, 400, 1, 0.3, p, 0.5, 'lowpass', 0.5); break;
      case 'zap': this.tone(1600, 0.25, 'sawtooth', 0.12, 0.2, p); this.hiss(0.25, 5000, 1, 0.15, p, 0.3, 'highpass'); break;
      case 'telegraph': this.tone(660, 0.2, 'square', 0.06, 1.02, p); break;
      case 'bark': this.tone(300, 0.12, 'sawtooth', 0.15, 0.6, p); this.hiss(0.1, 900, 2, 0.15, p, 0.5); break;
      case 'coo': this.tone(420, 0.25, 'sine', 0.08, 0.85, p); break;
      case 'choir': [261, 329, 392, 523].forEach((f) => { this.tone(f, 2.2, 'sine', 0.07, 1, 0, 0.9); this.tone(f * 1.005, 2.2, 'triangle', 0.04, 1, 0, 0.9); }); break;
      case 'click': this.tone(1200, 0.04, 'square', 0.06, 1); break;
    }
  },
  // ── музыка: сердцебиение + дрон + арпеджио; темп и слои зависят от интенсивности ──
  startMusic() {
    const c = this.ctx; this.nextBeat = c.currentTime + 0.2; this.step = 0;
    this.drone = []; const dg = c.createGain(); dg.gain.value = 0.0; dg.connect(this.mus); this.droneGain = dg;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.connect(dg); this.droneLP = lp;
    for (let i = 0; i < 3; i++) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55; o.detune.value = (i - 1) * 9; o.connect(lp); o.start(); this.drone.push(o); }
    this.lfo = c.createOscillator(); this.lfo.frequency.value = 0.13; const lg = c.createGain(); lg.gain.value = 180; this.lfo.connect(lg); lg.connect(lp.frequency); this.lfo.start();
    setInterval(() => this.schedule(), 30);
  },
  setDroneRoot(f) { if (!this.on) return; const t = this.ctx.currentTime; const ratios = [1, 1.5, 1.189]; this.drone.forEach((o, i) => o.frequency.setTargetAtTime(f * ratios[i], t, 0.8)); },
  schedule() {
    if (!this.on || this.ctx.state !== 'running') return;
    const c = this.ctx, I = clamp(this.intensity, 0, 1);
    this.droneGain.gain.setTargetAtTime(this.musicOn ? 0.05 + I * 0.08 : 0, c.currentTime, 0.5);
    this.droneLP.frequency.setTargetAtTime(400 + I * 1600, c.currentTime, 0.4);
    if (!this.musicOn) { this.nextBeat = c.currentTime + 0.1; return; }
    const bpm = this.boss ? 150 : 62 + I * 80;
    const stepDur = 60 / bpm / 4;
    while (this.nextBeat < c.currentTime + 0.12) {
      const t = this.nextBeat, s = this.step % 16;
      // тук-тук сердца
      if (s === 0 || s === 3 || (this.boss && (s === 8 || s === 11))) this.kick(t, s === 0 || s === 8 ? 1 : 0.6);
      if (I > 0.55 && (s === 4 || s === 12)) this.snare(t, I);
      if (I > 0.3 && s % 2 === 1) this.hat(t, (I - 0.3) * 0.25);
      if (I > 0.2 || this.boss) {
        const sc = this.scale(); const n = sc[(this.step * 3 + (s % 4 === 0 ? 0 : s)) % sc.length];
        if (s % 2 === 0) this.arp(t, n * (s % 8 === 0 ? 1 : 2), stepDur * 1.6, (I - 0.2) * 0.12 + (this.boss ? 0.05 : 0));
      }
      if ((I > 0.7 || this.boss) && s % 4 === 0) this.bass(t, this.root() / 2, stepDur * 3, 0.16);
      this.nextBeat += stepDur; this.step++;
    }
  },
  root() { return [55, 49, 46.25, 41.2, 36.7, 61.7][this.zoneKey % 6]; },
  scale() { const r = this.root() * 4; return [1, 1.189, 1.335, 1.498, 1.587, 1.782, 2].map((x) => r * x); },
  kick(t, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9 * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(this.mus); o.start(t); o.stop(t + 0.35); },
  snare(t, v) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25 * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); s.connect(f); f.connect(g); g.connect(this.mus); s.start(t, Math.random()); s.stop(t + 0.2); },
  hat(t, v) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.001, v), t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(f); f.connect(g); g.connect(this.mus); s.start(t, Math.random()); s.stop(t + 0.06); },
  arp(t, f, d, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter(); o.type = 'square'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 900 + this.intensity * 2000; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.001, v), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(fl); fl.connect(g); g.connect(this.mus); const vg = c.createGain(); vg.gain.value = 0.3; g.connect(vg); vg.connect(this.verb); o.start(t); o.stop(t + d + 0.02); },
  bass(t, f, d, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(), ws = c.createWaveShaper(); const cu = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cu[i] = Math.tanh(x * 4); } ws.curve = cu; o.type = 'sawtooth'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(ws); ws.connect(g); g.connect(this.mus); o.start(t); o.stop(t + d + 0.02); },
  // ── голоса (звуковые галлюцинации): синтез речи шёпотом ──
  speak(text, p = 0) {
    this.play('whisper', p, 0.8);
    if (!this.voices || !window.speechSynthesis) return;
    const now = performance.now(); if (now - this.lastVoice < 2600) return; this.lastVoice = now;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = LANG === 'ru' ? 'ru-RU' : 'en-US';
      const vs = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith(LANG));
      if (vs.length) u.voice = pick(vs);
      u.volume = 0.35 + Math.random() * 0.2; u.pitch = pick([0.1, 0.3, 1.6, 1.9, 0.5]); u.rate = 0.75 + Math.random() * 0.35;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* без голосов */ }
  },
};
