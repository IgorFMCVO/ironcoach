// public/sw.js
// ============================================================================
// IRON COACH - SERVICE WORKER
// Permite funcionamento offline e cache inteligente
// ============================================================================

const CACHE_NAME = 'iron-coach-v1';
const OFFLINE_URL = '/offline.html';

// Arquivos para cache inicial
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Instalar - fazer cache dos arquivos essenciais
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativar - limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch - estratégia Network First com fallback para cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET
  if (request.method !== 'GET') return;

  // Ignorar requisições do Supabase (sempre precisam de rede)
  if (url.hostname.includes('supabase')) return;

  // Ignorar extensões e APIs
  if (url.pathname.startsWith('/api/') || url.pathname.includes('.')) {
    // Para assets estáticos, usar Cache First
    if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/)) {
      event.respondWith(
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          });
        })
      );
      return;
    }
    return;
  }

  // Para navegação, usar Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clonar e guardar no cache
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => {
        // Se offline, tentar cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Se não tiver cache, mostrar página offline
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Push notifications (para futuro)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Nova notificação',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'iron-coach',
    requireInteraction: true,
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'IRON Coach', options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Se já tem uma janela aberta, focar nela
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Senão, abrir nova janela
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

console.log('[SW] Service Worker loaded');
