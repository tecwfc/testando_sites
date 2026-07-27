// sw.js
const CACHE_NAME = 'wr-aroma-v1';
const assets = [
  './',
  './index.html',
  './script.js',
  './assets/Logo.png'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(assets);
      })
      .catch(err => {
        console.error('Erro ao adicionar assets ao cache:', err);
      })
  );
  self.skipWaiting();
});

// Ativação - limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptação de requisições - CORRIGIDO
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // IGNORAR requisições para placeholders e imagens externas
  if (url.hostname.includes('via.placeholder.com') ||
      url.hostname.includes('placehold.co') ||
      url.hostname.includes('lh3.googleusercontent.com') ||
      url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('tailwindcss.com') ||
      url.hostname.includes('api.ipify.org')) {
    // Não interceptar - deixar o navegador fazer a requisição normal
    return;
  }

  // Para requisições da própria aplicação
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se encontrou no cache, retorna
        if (response) {
          return response;
        }

        // Senão, faz a requisição normal
        return fetch(event.request)
          .then(response => {
            // Verifica se é uma resposta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clona a resposta para guardar no cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(err => {
                console.error('Erro ao salvar no cache:', err);
              });

            return response;
          })
          .catch(err => {
            console.error('Erro na requisição:', event.request.url, err);
            // Retorna uma resposta de fallback para imagens
            if (event.request.url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
              return caches.match('/assets/Logo.png');
            }
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});