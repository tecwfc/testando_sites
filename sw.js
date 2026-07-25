const CACHE_NAME = 'glga-v1';
const ASSETS = [
  'index.html',
  'https://cdn.tailwindcss.com',
  'https://raw.githack.com/eKoopmans/html2pdf/master/dist/html2pdf.bundle.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});