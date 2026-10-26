var CACHE = 'tbg-v2';
var ASSETS = [
  '/', '/about', '/services', '/portfolio', '/contact',
  '/commercial-framing', '/residential-framing',
  '/styles.css', '/main.js', '/manifest.json', '/icons/icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.allSettled(ASSETS.map(function (a) {
        return c.add(new Request(a, { cache: 'reload' }));
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          e.waitUntil(caches.open(CACHE).then(function (c) { return c.put(e.request, copy); }));
        }
        return res;
      }).catch(function () { return caches.match(e.request); })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var network = fetch(e.request).then(function (res) {
        if (res.ok && !e.request.url.includes('wixstatic') && !e.request.url.includes('formspree')) {
          caches.open(CACHE).then(function (c) { c.put(e.request, res.clone()); });
        }
        return res;
      });
      return cached || network;
    }).catch(function () {
      return caches.match('/');
    })
  );
});
