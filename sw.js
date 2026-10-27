
/* يخزّن ملفات اللعبة للعمل دون إنترنت */
const CACHE = 'sayyad-v2.1';

const FILES = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './data.js',
  './sprites.js',
  './state.js',
  './world.js',
  './combat.js',
  './render.js',
  './ui.js',
  './input.js',
  './main.js',
  './icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(
      response => response || fetch(e.request)
    )
  );
});
