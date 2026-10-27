/* يخزّن ملفات اللعبة للعمل دون إنترنت */
const CACHE = 'sayyad-v2';
const FILES = [
  './', 'index.html', 'manifest.json',
  'css/style.css',
  'js/data.js', 'js/sprites.js', 'js/state.js', 'js/world.js', 'js/combat.js',
  'js/render.js', 'js/ui.js', 'js/input.js', 'js/main.js',
  'assets/icon.svg'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
