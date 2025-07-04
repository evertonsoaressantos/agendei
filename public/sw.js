// Service Worker para cache offline usando estratégia Stale-While-Revalidate
const CACHE_NAME = 'agendapro-v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Rotas e recursos para cache
const CACHE_ROUTES = [
  '/',
  '/calendar',
  '/clients', 
  '/appointments',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Dados da aplicação para cache
const API_CACHE_PATTERNS = [
  /\/api\/appointments/,
  /\/api\/clients/,
  /\/api\/customers/,
  /\/rest\/v1\/appointments/,
  /\/rest\/v1\/customers/,
  /\/rest\/v1\/users/
];

// Install event - cache recursos estáticos
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static resources');
        return cache.addAll(CACHE_ROUTES);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - estratégia Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests não-GET
  if (request.method !== 'GET') {
    return;
  }

  // Verificar se é uma rota/API que deve ser cacheada
  const shouldCache = CACHE_ROUTES.some(route => url.pathname === route) ||
                     API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));

  if (shouldCache) {
    event.respondWith(staleWhileRevalidate(request));
  } else {
    // Para outros recursos, tentar rede primeiro
    event.respondWith(networkFirst(request));
  }
});

// Estratégia Stale-While-Revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Verificar se o cache ainda é válido (TTL)
  if (cachedResponse) {
    const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date') || 0);
    const isExpired = Date.now() - cachedDate.getTime() > CACHE_TTL;
    
    if (!isExpired) {
      console.log('Service Worker: Serving from cache (fresh)', request.url);
      
      // Atualizar em background
      fetchAndCache(request, cache);
      
      return cachedResponse;
    }
  }

  try {
    console.log('Service Worker: Fetching from network', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cacheResponse(cache, request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, serving stale cache', request.url);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retornar página offline para navegação
    if (request.mode === 'navigate') {
      return createOfflinePage();
    }
    
    throw error;
  }
}

// Estratégia Network First para recursos não críticos
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Buscar e cachear em background
async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cacheResponse(cache, request, response);
    }
  } catch (error) {
    console.log('Service Worker: Background fetch failed', error);
  }
}

// Cachear resposta com timestamp
async function cacheResponse(cache, request, response) {
  const responseToCache = response.clone();
  
  // Adicionar timestamp ao header
  const headers = new Headers(responseToCache.headers);
  headers.set('sw-cached-date', new Date().toISOString());
  
  const cachedResponse = new Response(responseToCache.body, {
    status: responseToCache.status,
    statusText: responseToCache.statusText,
    headers: headers
  });
  
  await cache.put(request, cachedResponse);
  console.log('Service Worker: Cached response', request.url);
}

// Criar página offline
function createOfflinePage() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AgendaPro - Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #f7ffe0 0%, #ffffff 50%, #f0fdf0 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .offline-container {
          text-align: center;
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          max-width: 400px;
        }
        .offline-icon {
          width: 80px;
          height: 80px;
          background: #fef3c7;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 40px;
        }
        h1 {
          color: #1f2937;
          margin-bottom: 10px;
        }
        p {
          color: #6b7280;
          line-height: 1.6;
        }
        .retry-btn {
          background: #d6ff4e;
          color: #1f2937;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 20px;
        }
        .retry-btn:hover {
          background: #ccff1a;
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📱</div>
        <h1>Você está offline</h1>
        <p>Não foi possível conectar à internet. Você pode visualizar dados em cache ou tentar novamente quando a conexão for restaurada.</p>
        <button class="retry-btn" onclick="window.location.reload()">
          Tentar Novamente
        </button>
      </div>
    </body>
    </html>
  `;
  
  return new Response(offlineHTML, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Sincronização em background quando voltar online
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(syncData());
  }
});

// Sincronizar dados quando voltar online
async function syncData() {
  try {
    // Aqui você pode implementar lógica para sincronizar dados pendentes
    console.log('Service Worker: Syncing data...');
    
    // Notificar a aplicação que está online novamente
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_COMPLETE' });
    });
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}

// Listener para mensagens da aplicação
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});