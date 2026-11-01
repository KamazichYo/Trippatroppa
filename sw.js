// Офлайн-кэш: игра запускается без сети после первого открытия. Новая версия подтягивается в фоне.
const VER = 'tp-v2';
const CORE = ['./', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-180.png',
  'js/util.js', 'js/paint.js', 'js/sprites.js', 'js/audio.js', 'js/text.js', 'js/world.js', 'js/levels.js', 'js/entities.js',
  'js/director.js', 'js/bosses.js', 'js/chaos.js', 'js/render.js', 'js/input.js', 'js/ui.js', 'js/game.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VER).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VER).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(VER).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then((r) => { if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
