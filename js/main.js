// Точка входа: загрузка, игровой цикл, автосохранение.
import { Game } from './game/game.js';
import { Renderer } from './render/renderer.js';
import { UI } from './ui/ui.js';
import { Input } from './ui/input.js';
import * as TT from './gfx/terrain.js';
import { buildingSprite } from './gfx/allBuildings.js';

const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function preload(progress) {
  const steps = [];
  for (let v = 0; v < 6; v++) steps.push(() => TT.grassTile(v));
  for (let v = 0; v < 3; v++) steps.push(() => TT.sandTile(v));
  for (let f = 0; f < 4; f++) steps.push(() => { for (let m = 0; m < 16; m++) TT.waterTile(f, m); });
  for (let d = 1; d <= 3; d++) steps.push(() => { for (let v = 0; v < 8; v++) TT.forest(d, v); });
  for (const t of [1, 2]) steps.push(() => { for (let m = 0; m < 16; m++) for (let s = 0; s < 2; s++) TT.roadTile(t, m, s); });
  for (const id of ['r1_izba', 'r1_house', 'r1_dacha', 'a_wheat', 'a_potato', 'p_diesel', 'w_tower']) steps.push(() => { for (let v = 0; v < 4; v++) buildingSprite(id, v); });
  for (let k = 0; k < steps.length; k++) {
    steps[k]();
    progress((k + 1) / steps.length);
    if (k % 3 === 0) await sleep(0);
  }
}

async function main() {
  const fill = $('#ld-fill'), txt = $('#ld-text');
  txt.textContent = 'Рисуем пиксели…';
  await preload((p) => { fill.style.width = Math.round(p * 100) + '%'; });
  txt.textContent = 'Строим город…';
  await sleep(0);

  let game = null;
  try {
    const last = localStorage.getItem('tp_last');
    if (last && localStorage.getItem(last)) game = Game.deserialize(localStorage.getItem(last));
  } catch (e) { console.warn('Не удалось загрузить сохранение', e); }
  const fresh = !game;
  if (!game) game = new Game({ size: 96 });

  const canvas = $('#view');
  const renderer = new Renderer(canvas, game);
  const ui = new UI(game, renderer);
  const input = new Input(canvas, renderer, ui);
  ui.input = input;
  window.addEventListener('pointermove', (e) => { input.lastClient = { x: e.clientX, y: e.clientY }; });

  const setGame = (g) => {
    game = g;
    renderer.setGame(g);
    ui.setGame(g);
    input.setTool({ type: 'inspect' });
    ui.markCat('inspect');
    if (g.world.highwayY != null) renderer.centerOn(14, g.world.highwayY);
  };
  ui.onLoad = (json) => setGame(Game.deserialize(json));
  ui.onNew = (opts) => {
    const g = new Game({ size: opts.size, water: opts.water, forest: opts.forest, seed: opts.seed });
    setGame(g);
    if (opts.demo) ui.demoVillage();
    ui.toast(`Основан новый населённый пункт: ${g.cityName}`);
  };

  const resize = () => {
    document.documentElement.style.setProperty('--topH', $('#top').offsetHeight + 'px');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.resize(Math.floor(innerWidth * dpr), Math.floor(innerHeight * dpr));
    renderer.dpr = dpr;
  };
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(() => document.documentElement.style.setProperty('--topH', $('#top').offsetHeight + 'px')).observe($('#top'));
  resize();
  if (renderer.dpr >= 2 && renderer.zi < 4) renderer.zi = 4;
  if (innerWidth < 800) renderer.zi = Math.max(2, renderer.zi - 1);
  if (game.world.highwayY != null) renderer.centerOn(fresh ? 16 : game.center[0], fresh ? game.world.highwayY : game.center[1]);
  else renderer.centerOn(game.center[0], game.center[1]);

  $('#loading').remove();
  ui.refresh(true);
  ui.drawMinimap();
  if (fresh) {
    ui.toast(`Добро пожаловать в ${game.cityName}! 1990 год. Начните с дороги от трассы слева.`);
    setTimeout(() => ui.toast('Подсказка: меню ☰ → «Новый город с деревней» для быстрого старта, ✨ — меню бога.'), 3000);
  }

  let last = performance.now();
  let saveT = 0;
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    try {
      game.update(dt);
      renderer.render(dt);
    } catch (e) { console.error(e); }
    saveT += dt;
    if (saveT > 90) { saveT = 0; ui.saveGame('tp_save_auto', true); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.__game = () => game;
  window.__ui = ui;
  window.__renderer = renderer;
  window.addEventListener('beforeunload', () => ui.saveGame('tp_save_auto', true));
}

main().catch((e) => { console.error(e); $('#ld-text').textContent = 'Ошибка: ' + e.message; });
