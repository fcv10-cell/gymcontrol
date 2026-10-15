// GymControl — service worker: la app abre y funciona sin internet.
// Sube VERSION cada vez que cambies archivos de la app.
const VERSION = 'gc-v5';
const SHELL = [
  './', './index.html', './css/styles.css', './js/config.js', './js/app.js', './js/data.js', './js/demo.js',
  './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return; // datos: siempre a la red

  // Navegación: primero la red (para tener lo último), si no hay internet la copia guardada.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { caches.open(VERSION).then(c => c.put('./index.html', r.clone())); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  const save = r => { if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; };
  // Archivos propios: primero la red (así las mejoras llegan solas), sin internet la copia guardada.
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(save).catch(() => caches.match(req)));
    return;
  }
  // Fuentes y librerías externas: la copia guardada, y se renueva en segundo plano.
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(save).catch(() => hit);
    return hit || net;
  }));
});
