/**
 * Service Worker for Dice of Dionysus PWA
 * Served from root to control entire origin. Provides offline support, caching, and app-like experience.
 */

const CACHE_NAME = 'dice-of-dionysus-v1.7.0';
const STATIC_CACHE_NAME = 'dice-of-dionysus-static-v1.7.0';
const DYNAMIC_CACHE_NAME = 'dice-of-dionysus-dynamic-v1.7.0';

try {
  importScripts('/sw-precache-manifest.js');
} catch (e) {
  console.warn('Service Worker: precache manifest missing', e);
}

// Files to cache for offline use (core shell + generated art/sfx manifest)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/css/balatro-effects.css',
  '/css/juice-effects.css',
  '/css/visual-tokens.css',
  '/js/Main.js',
  '/js/game/GameEngine.js',
  '/js/engine/ShopStockGenerator.js',
  '/js/classes/Die.js',
  '/js/classes/Card.js',
  '/js/classes/Boon.js',
  '/js/classes/WorshipCard.js',
  '/js/classes/LibationCard.js',
  '/js/classes/Artifact.js',
  '/js/data/gameData.js',
  '/js/data/assetMapping.js',
  '/js/data/AnteData_js.js',
  '/js/ui/UIManager.js',
  '/js/ui/ShopUI.js',
  '/js/ui/BalatroEffects.js',
  '/js/ui/SoundManager.js',
  '/js/utils/seededRNG.js',
  '/js/utils/dataManager.js',
  '/js/utils/AssetPreloader.js',
  '/js/utils/PointerDragGhost.js',
  '/manifest.json',
  ...(self.__SW_PRECACHE_ASSETS || []),
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        const urls = [...new Set(STATIC_ASSETS)];
        return cache.addAll(urls);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Vite dev (this repo uses port 3000): never intercept — precached JS/HTML breaks HMR and the WS client
  const p = url.port || (url.protocol === 'https:' ? '443' : '80');
  if (
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
    p === '3000'
  ) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache', request.url);
          return cachedResponse;
        }

        // Otherwise, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache dynamic content
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('Service Worker: Fetch failed', request.url, error);

            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }

            // Return a custom offline response for other requests
            return new Response('Offline content not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Background sync for game saves
self.addEventListener('sync', (event) => {
  if (event.tag === 'game-save') {
    console.log('Service Worker: Background sync for game save');
    event.waitUntil(syncGameSave());
  }
});

// Push notifications for game events
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New game event!',
    icon: '/ART/Title art.png',
    badge: '/ART/Title art.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open Game',
        icon: '/ART/Title art.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/ART/Title art.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Dice of Dionysus', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_GAME_DATA':
      cacheGameData(data);
      break;

    case 'CLEAR_CACHE':
      clearAllCaches();
      break;

    default:
      if (type) console.log('Service Worker: Unknown message type', type);
  }
});

// Helper functions
async function syncGameSave() {
  try {
    const pendingSaves = await getPendingSaves();

    for (const save of pendingSaves) {
      const response = await fetch('/api/save-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(save)
      });

      if (response.ok) {
        await removePendingSave(save.id);
        console.log('Service Worker: Game save synced successfully');
      }
    }
  } catch (error) {
    console.error('Service Worker: Failed to sync game save', error);
  }
}

async function cacheGameData(gameData) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const response = new Response(JSON.stringify(gameData), {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    await cache.put('/api/game-data', response);
    console.log('Service Worker: Game data cached');
  } catch (error) {
    console.error('Service Worker: Failed to cache game data', error);
  }
}

async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('Service Worker: All caches cleared');
  } catch (error) {
    console.error('Service Worker: Failed to clear caches', error);
  }
}

async function getPendingSaves() {
  return [];
}

async function removePendingSave(saveId) {
  console.log('Service Worker: Removed pending save', saveId);
}

console.log('Service Worker: Loaded successfully');
