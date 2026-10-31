'use strict';
// ───────────── экраны: загрузка, титул, выбор даров, смерть, концовки ─────────────
const UI = {
  root: null, fade: null, ld: null,
  init() {
    this.root = document.getElementById('ui'); this.fade = document.getElementById('fade'); this.ld = document.getElementById('loading');
    document.getElementById('tbtn-dash').addEventListener('touchstart', (e) => { INPUT.dashPressed = true; e.preventDefault(); });
    document.getElementById('tbtn-use').addEventListener('touchstart', (e) => { INPUT.usePressed = true; e.preventDefault(); });
    document.getElementById('tbtn-swap').addEventListener('touchstart', (e) => { INPUT.swapPressed = true; e.preventDefault(); });
    document.getElementById('tbtn-throw').addEventListener('touchstart', (e) => { INPUT.throwPressed = true; e.preventDefault(); });
    document.getElementById('tbtn-pause').addEventListener('touchstart', (e) => { INPUT.pausePressed = true; e.preventDefault(); });
    if (matchMedia('(pointer:coarse)').matches) { INPUT.touch = true; document.body.classList.add('touch'); }
    try { AU.voices = localStorage.getItem('tp_voices') !== '0'; G.fx = localStorage.getItem('tp_fx') === '0' ? 0.35 : 1; } catch (e) { /* без хранилища */ }
  },
  clear() { this.root.innerHTML = ''; this.root.className = ''; },
  panel(html, cls = '') { this.root.innerHTML = `<div class="panel ${cls}">${html}</div>`; this.root.className = 'on'; return this.root.firstChild; },
  loading(p, label) { this.ld.classList.add('on'); this.ld.querySelector('.lbl').textContent = label || ''; this.ld.querySelector('.bar i').style.width = Math.round(p * 100) + '%'; },
  loadingHide() { this.ld.classList.remove('on'); },
  fadeOut() { return new Promise((r) => { this.fade.classList.add('on'); setTimeout(r, 650); }); },
  fadeIn() { return new Promise((r) => { this.fade.classList.remove('on'); setTimeout(r, 400); }); },
  title() {
    this.loadingHide(); G.state = 'title';
    const el = this.panel(`
      <h1 class="wet">TRIPPATROPPA</h1>
      <p class="sub">${T('Сходи за хлебом. Просто сходи за хлебом.', 'Go buy bread. Just go buy bread.')}</p>
      <button class="big" id="b-start">${T('Выйти из подъезда', 'Step outside')}</button>
      <div class="row">
        <button id="b-lang">${LANG === 'ru' ? 'English' : 'Русский'}</button>
        <button id="b-voice">${T('Голоса', 'Voices')}: ${AU.voices ? T('вкл', 'on') : T('выкл', 'off')}</button>
        <button id="b-fx">${T('Эффекты', 'Effects')}: ${G.fx === 1 ? T('полные', 'full') : T('мягкие', 'soft')}</button>
      </div>
      <div class="help">${INPUT.touch || matchMedia('(pointer:coarse)').matches
        ? T('Левый палец — идти, правый — целиться и бить. Кнопки: рывок, взять, сменить, бросить.', 'Left thumb — walk, right thumb — aim & attack. Buttons: dash, take, swap, throw.')
        : T('<b>WASD</b> — идти · <b>мышь</b> — целиться/бить · <b>Пробел</b> — рывок · <b>E</b> — взять · <b>ПКМ/G</b> — бросить · <b>Q/колесо</b> — сменить оружие · <b>Esc</b> — пауза', '<b>WASD</b> — move · <b>mouse</b> — aim/attack · <b>Space</b> — dash · <b>E</b> — take · <b>RMB/G</b> — throw · <b>Q/wheel</b> — swap weapon · <b>Esc</b> — pause')}</div>
      <p class="warn">${T('Гротескная игра о тревоге и галлюцинациях. Чёрный юмор, вспышки, шёпот. ~15 минут.', 'A grotesque game about anxiety and hallucinations. Dark humour, flashes, whispers. ~15 minutes.')}</p>`, 'title');
    el.querySelector('#b-start').onclick = () => { AU.init(); AU.play('click'); startGame(); };
    el.querySelector('#b-lang').onclick = () => { LANG = LANG === 'ru' ? 'en' : 'ru'; try { localStorage.setItem('tp_lang', LANG); } catch (e) { /* */ } document.documentElement.lang = LANG; this.title(); };
    el.querySelector('#b-voice').onclick = () => { AU.voices = !AU.voices; try { localStorage.setItem('tp_voices', AU.voices ? '1' : '0'); } catch (e) { /* */ } this.title(); };
    el.querySelector('#b-fx').onclick = () => { G.fx = G.fx === 1 ? 0.35 : 1; try { localStorage.setItem('tp_fx', G.fx === 1 ? '1' : '0'); } catch (e) { /* */ } this.title(); };
  },
  intro(cb) {
    let i = 0;
    const show = () => {
      if (i >= TXT.intro.length) { this.clear(); cb(); return; }
      const el = this.panel(`<p class="story">${tr(TXT.intro[i])}</p><button class="big" id="b-next">${i === TXT.intro.length - 1 ? T('Открыть дверь', 'Open the door') : T('Дальше', 'Next')}</button>`, 'card');
      el.querySelector('#b-next').onclick = () => { AU.play('click'); i++; show(); };
    };
    show();
  },
  card(title, text, btn, cb) {
    const el = this.panel(`<h2 class="wet">${title}</h2><p class="story">${text}</p><button class="big" id="b-ok">${btn}</button>`, 'card');
    el.querySelector('#b-ok').onclick = () => { AU.play('click'); this.clear(); cb(); };
  },
  choice(title, opts, cb) {
    const el = this.panel(`<h2 class="wet">${title}</h2><div class="cards">${opts.map((o, i) => `
      <button class="gift" data-i="${i}" style="--h:${ENDING_HUE[o.asp] ?? 45}">
        ${o.icon ? `<img src="${o.icon.toDataURL()}" alt="">` : `<span class="glyph">${o.type === 'perk' ? '✦' : '✧'}</span>`}
        <b>${o.name}</b><span>${o.desc}</span></button>`).join('')}</div>`, 'choice');
    el.querySelectorAll('.gift').forEach((b) => (b.onclick = () => { applyChoice(opts[+b.dataset.i]); this.clear(); cb(); }));
  },
  pause() {
    const el = this.panel(`<h2 class="wet">${T('Пауза', 'Paused')}</h2><p class="story">${T('Подыши. Вдох на четыре, выдох на шесть.', 'Breathe. In for four, out for six.')}</p>
      <button class="big" id="b-res">${T('Продолжить', 'Resume')}</button>
      <div class="row"><button id="b-voice">${T('Голоса', 'Voices')}: ${AU.voices ? T('вкл', 'on') : T('выкл', 'off')}</button><button id="b-fx">${T('Эффекты', 'Effects')}: ${G.fx === 1 ? T('полные', 'full') : T('мягкие', 'soft')}</button><button id="b-quit">${T('В меню', 'Main menu')}</button></div>`, 'card');
    el.querySelector('#b-res').onclick = () => { G.state = 'play'; this.clear(); };
    el.querySelector('#b-voice').onclick = () => { AU.voices = !AU.voices; this.pause(); };
    el.querySelector('#b-fx').onclick = () => { G.fx = G.fx === 1 ? 0.35 : 1; this.pause(); };
    el.querySelector('#b-quit').onclick = () => { AU.musicOn = false; AU.boss = false; this.title(); };
  },
  dead() {
    const lines = [
      ['Санитары нашли тебя у ларька. Ты объяснял шаурме, что она не настоящая.', 'The orderlies found you by the kiosk, explaining to a shawarma that it isn\'t real.'],
      ['Ты лёг на асфальт и решил, что это теперь твой дом. Психолог не одобряет.', 'You lay down on the asphalt and decided this is home now. Your therapist disapproves.'],
      ['Голоса победили. Временно. Они всегда побеждают временно.', 'The voices won. Temporarily. They always win temporarily.'],
      ['Ты закрыл глаза и посчитал до десяти. Неправильно.', 'You closed your eyes and counted to ten. Wrong.'],
    ];
    const el = this.panel(`<h2 class="wet">${T('Рассудок исчерпан', 'Out of sanity')}</h2><p class="story">${tr(pick(lines))}</p><button class="big" id="b-retry">${T('Ещё раз (с начала стадии)', 'Try again (from stage start)')}</button><div class="row"><button id="b-quit">${T('В меню', 'Main menu')}</button></div>`, 'card dead');
    el.querySelector('#b-retry').onclick = () => { AU.play('click'); retry(); };
    el.querySelector('#b-quit').onclick = () => { AU.musicOn = false; AU.boss = false; this.title(); };
  },
  ending(kind) {
    const E = ENDINGS[kind], s = G.stats, mm = Math.floor(s.time / 60), ss = Math.floor(s.time % 60);
    const found = (() => { try { const f = JSON.parse(localStorage.getItem('tp_endings') || '[]'); if (!f.includes(kind)) f.push(kind); localStorage.setItem('tp_endings', JSON.stringify(f)); return f.length; } catch (e) { return 1; } })();
    const el = this.panel(`<h2 class="wet">${T('Победа', 'Victory')}: ${tr(E.boss)}</h2>
      <p class="story">${tr(E.win)}</p>
      <p class="story small">${T('Ты вернулся домой. В авоське: хлеб, молоко и ', 'You came home. In the string bag: bread, milk and ')}${tr(E.item)}.<br>${T('Психолог: «Ну вот. А вы боялись. В четверг — на почту».', 'Therapist: "See? And you were scared. Thursday — the post office."')}</p>
      <div class="stats"><span>⏱ ${mm}:${String(ss).padStart(2, '0')}</span><span>☠ ${s.kills} ${T('галлюцинаций', 'hallucinations')}</span><span>💀 ${s.deaths} ${T('срывов', 'breakdowns')}</span><span>🏁 ${T('концовок', 'endings')}: ${found}/6</span></div>
      <button class="big" id="b-again">${T('Ещё прогулка', 'Another walk')}</button>`, 'card ending');
    el.querySelector('#b-again').onclick = () => { AU.play('click'); AU.musicOn = false; this.title(); };
  },
};
