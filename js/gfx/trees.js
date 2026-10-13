// Деревья и кусты.
import { blob, lathe, pole, PC } from '../engine/pixel.js';
import { hash2, cmul, cmix, bayer, mulberry32 } from '../engine/util.js';

function foliage(pal, seed, fruit = null) {
  return (lf, px, py) => {
    const n = hash2(px >> 1, py >> 1, seed) * 0.35 + hash2(px, py, seed + 1) * 0.15;
    let t = (lf - 0.45) * 1.7 + n - 0.25 + bayer(px, py) * 0.25;
    const i = Math.max(0, Math.min(pal.length - 1, Math.floor(t * pal.length)));
    if (fruit && hash2(px, py, seed + 9) < 0.05) return fruit;
    return pal[i];
  };
}

const PAL = {
  oak: [0x1f4a1c, 0x2d6326, 0x3c7d2e, 0x5a9a3a, 0x7fbf4f],
  birch: [0x2f6a2a, 0x4a8a34, 0x6aa840, 0x8fc456, 0xb5dc78],
  poplar: [0x1e4824, 0x2b5e2c, 0x3f7a34, 0x5a943c, 0x78ae4c],
  pine: [0x0f2e22, 0x173f2c, 0x205236, 0x2f6a42, 0x3f8350],
  bush: [0x24521f, 0x346b2a, 0x4a8a36, 0x66a848, 0x8cc460],
  autumn: [0x6a2a10, 0x9a4a18, 0xc87a22, 0xe0a830, 0xf0cc58],
};

function trunk(pc, x, y, h, c = 0x5a3e28) { pole(pc, x, y, 0, h, c, 2); }

export function drawTree(pc, x, y, type, sc = 1, seed = 0, autumn = false) {
  const rng = mulberry32(seed * 7919 + 13);
  switch (type) {
    case 'pine': {
      trunk(pc, x, y, 4 * sc, 0x4a3020);
      const h = (16 + rng() * 6) * sc, r = (4.6 + rng()) * sc;
      lathe(pc, x, y, 2 * sc, h, (t) => r * (1 - t) * (0.75 + 0.25 * Math.abs(Math.sin(t * 13))) + 0.3,
        (psi, z, lf, dx) => {
          const v = lf + (hash2(Math.floor(psi * 6), Math.floor(z), seed) - 0.5) * 0.35;
          const pal = PAL.pine;
          return cmul(pal[Math.max(0, Math.min(4, Math.floor((v - 0.4) * 5)))], 1);
        });
      break;
    }
    case 'birch': {
      const h = (8 + rng() * 3) * sc;
      const [px, py] = pc.proj(x, y, 0);
      for (let k = 0; k < h; k++) {
        pc.set(Math.floor(px), Math.floor(py) - k, hash2(k, 1, seed) < 0.25 ? 0x222222 : 0xf0efe8);
        pc.set(Math.floor(px) + 1, Math.floor(py) - k, hash2(k, 2, seed) < 0.2 ? 0x333333 : 0xc8c6c0);
      }
      blob(pc, x, y, h + 3 * sc, 4.2 * sc, 6 * sc, foliage(autumn ? PAL.autumn : PAL.birch, seed), seed, 0.18);
      break;
    }
    case 'poplar': {
      trunk(pc, x, y, 4 * sc);
      blob(pc, x, y, (13 + rng() * 3) * sc, 3.4 * sc, 10 * sc, foliage(autumn ? PAL.autumn : PAL.poplar, seed), seed, 0.05);
      break;
    }
    case 'apple': {
      trunk(pc, x, y, 4 * sc, 0x5a3a24);
      blob(pc, x, y, 7 * sc, 4.6 * sc, 4.4 * sc, foliage(PAL.bush, seed, autumn ? -1 : 0xd83020), seed, 0.08);
      break;
    }
    case 'bush': {
      blob(pc, x, y, 2.5 * sc, 3.2 * sc, 2.8 * sc, foliage(PAL.bush, seed), seed);
      break;
    }
    default: { // дуб/липа
      trunk(pc, x, y, 6 * sc);
      blob(pc, x - 1.5 * sc, y + 1 * sc, 10 * sc, 4.5 * sc, 4.5 * sc, foliage(autumn ? PAL.autumn : PAL.oak, seed), seed, 0.06);
      blob(pc, x + 1.5 * sc, y - 1 * sc, 11 * sc, 4.5 * sc, 4.6 * sc, foliage(autumn ? PAL.autumn : PAL.oak, seed + 1), seed + 1, 0.06);
      blob(pc, x, y, 13 * sc, 5 * sc, 5 * sc, foliage(autumn ? PAL.autumn : PAL.oak, seed + 2), seed + 2, 0.06);
    }
  }
}

// Готовые спрайты «лесных» тайлов: несколько деревьев в тайле
export function forestTile(density, variant) {
  const H = 34;
  const pc = new PC(64, 32 + H, 32, H);
  const rng = mulberry32(variant * 131 + density * 17);
  const n = density === 1 ? 1 + Math.floor(rng() * 2) : density === 2 ? 3 : 5;
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([4 + rng() * 24, 4 + rng() * 24]);
  pts.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  const types = ['pine', 'pine', 'oak', 'birch', 'poplar', 'pine'];
  for (const [x, y] of pts) {
    const t = types[Math.floor(rng() * types.length)];
    drawTree(pc, x, y, t, 0.75 + rng() * 0.35, Math.floor(rng() * 1000));
  }
  return pc;
}

export { PAL as TREE_PAL };
