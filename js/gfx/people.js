// Пиксельные человечки и иконки состояний.
import { cmul, cmix, css } from '../engine/util.js';
import { NIGHT_TINT, NIGHT_A } from '../engine/pixel.js';

const cache = new Map();

// dir: 0:+x (вправо-вниз) 1:+y (влево-вниз) 2:-x (влево-вверх) 3:-y (вправо-вверх); frame 0/1
export function personSprite(look, dir, frame, winter = false) {
  const key = `${look.skin}|${look.hair}|${look.top}|${look.bottom}|${look.female ? 1 : 0}|${look.small ? 1 : 0}|${look.scarf ? 1 : 0}|${dir}|${frame}|${winter ? 1 : 0}`;
  let s = cache.get(key);
  if (s) return s;
  const W = 7, H = 13;
  const day = document.createElement('canvas'); day.width = W; day.height = H;
  const ctx = day.getContext('2d');
  const px = (x, y, c) => { ctx.fillStyle = css(c); ctx.fillRect(x, y, 1, 1); };
  const front = dir === 0 || dir === 1;
  const flip = dir === 1 || dir === 2;
  const sm = look.small ? 3 : 0;
  const top = winter ? cmix(look.top, 0x3a3a4a, 0.45) : look.top;
  const ox = 2;
  const X = (x) => (flip ? W - 1 - (ox + x) : ox + x);
  const y0 = sm;
  // голова
  const hair = look.hair;
  if (look.scarf) { for (const [x, y] of [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]]) px(X(x), y0 + y, 0xc04060); px(X(1), y0 + 1, front ? look.skin : 0xc04060); px(X(1), y0 + 2, front ? look.skin : 0xa03050); }
  else if (winter) { for (let x = 0; x < 3; x++) px(X(x), y0, 0x5a4030); px(X(0), y0 + 1, 0x5a4030); px(X(2), y0 + 1, 0x5a4030); px(X(1), y0 + 1, front ? look.skin : hair); px(X(0), y0 + 2, front ? look.skin : hair); px(X(1), y0 + 2, front ? look.skin : hair); px(X(2), y0 + 2, front ? cmul(look.skin, 0.85) : hair); }
  else {
    for (let x = 0; x < 3; x++) px(X(x), y0, hair);
    px(X(0), y0 + 1, front ? look.skin : hair); px(X(1), y0 + 1, front ? look.skin : hair); px(X(2), y0 + 1, front ? cmul(look.skin, 0.85) : hair);
    px(X(0), y0 + 2, front ? look.skin : hair); px(X(1), y0 + 2, look.skin); px(X(2), y0 + 2, cmul(look.skin, 0.85));
    if (look.female && !look.small) { px(X(-1), y0 + 1, hair); px(X(-1), y0 + 2, hair); px(X(-1), y0 + 3, hair); }
  }
  // тело
  const bodyH = look.small ? 2 : 4;
  for (let y = 0; y < bodyH; y++) for (let x = 0; x < 3; x++) px(X(x), y0 + 3 + y, x === 2 ? cmul(top, 0.75) : top);
  // руки
  const sw = frame ? 1 : 0;
  px(X(-1), y0 + 4 + sw, cmul(top, 0.85)); px(X(3), y0 + 4 + (1 - sw), cmul(top, 0.7));
  if (!look.small) { px(X(-1), y0 + 5 + sw, look.skin); }
  // низ
  const by = y0 + 3 + bodyH;
  const legH = look.small ? 3 : 4;
  if (look.female && !look.small && !winter) {
    for (let x = 0; x < 3; x++) px(X(x), by, look.bottom === 0x2a2a2a ? 0x6a2a4a : cmix(look.bottom, 0xa04060, 0.5));
    for (let y = 1; y < legH; y++) { px(X(frame ? 0 : 1), by + y, cmul(look.skin, 0.9)); px(X(frame ? 2 : 1), by + y, cmul(look.skin, 0.8)); }
  } else {
    for (let y = 0; y < legH; y++) {
      const spread = y >= legH - 2 ? 1 : 0;
      px(X(frame && spread ? -0 : 0), by + y, look.bottom);
      px(X(frame && spread ? 2 : 1), by + y, cmul(look.bottom, 0.8));
    }
  }
  px(X(0), by + legH, 0x1a1a1a); px(X(frame ? 2 : 1), by + legH, 0x1a1a1a);
  const night = document.createElement('canvas'); night.width = W; night.height = H;
  const nc = night.getContext('2d');
  nc.drawImage(day, 0, 0);
  nc.globalCompositeOperation = 'source-atop';
  nc.fillStyle = `rgba(${(NIGHT_TINT >> 16) & 255},${(NIGHT_TINT >> 8) & 255},${NIGHT_TINT & 255},${NIGHT_A * 0.85})`;
  nc.fillRect(0, 0, W, H);
  s = { day, night, ax: 3, ay: H - 1 };
  cache.set(key, s);
  return s;
}

// ---------- иконки состояний над зданиями ----------
const ICONS = {
  power: ['..##.', '.##..', '#####', '..##.', '.##..'], // молния
  water: ['..#..', '.###.', '#####', '#####', '.###.'],
  heat: ['#.#.#', '.###.', '#####', '.###.', '#.#.#'], // снежинка
  gas: ['..#..', '.##..', '.###.', '#####', '.###.'],
  sewage: ['#####', '#...#', '#.#.#', '#...#', '#####'],
  garbage: ['.###.', '#####', '#.#.#', '#.#.#', '.###.'],
  road: ['#...#', '#.#.#', '#...#', '#.#.#', '#...#'],
  fire: ['..#..', '.##..', '.###.', '#####', '.###.'],
};
const ICON_COLORS = { power: [0xffe030, 0x8a6000], water: [0x40a0ff, 0x10306a], heat: [0xc0e8ff, 0x204060], gas: [0x60d0ff, 0x104060], sewage: [0xa07040, 0x3a2010], garbage: [0x90b060, 0x2a3a10], road: [0xffffff, 0x404040], fire: [0xff8020, 0x601000] };
const iconCache = new Map();
export function statusIcon(kind) {
  let c = iconCache.get(kind);
  if (c) return c;
  const rows = ICONS[kind];
  const [fg, bg] = ICON_COLORS[kind];
  c = document.createElement('canvas'); c.width = 11; c.height = 12;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(1, 0, 9, 10); ctx.fillRect(0, 1, 11, 8);
  ctx.fillStyle = css(cmix(bg, 0xffffff, 0.15)); ctx.fillRect(1, 1, 9, 8);
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(4, 10, 3, 1); ctx.fillRect(5, 11, 1, 1);
  ctx.fillStyle = css(fg);
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (rows[y][x] === '#') ctx.fillRect(3 + x, 2 + y, 1, 1);
  iconCache.set(kind, c);
  return c;
}
