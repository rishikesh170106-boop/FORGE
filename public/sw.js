// Community Hero service worker — offline shell + static cache + Background
// Sync: reports queued offline are flushed the moment connectivity returns,
// even if the tab (or browser) was closed in between.
const CACHE = 'community-hero-v3';
const SHELL = ['/', '/dashboard', '/map', '/report', '/leaderboard'];
const IDB_NAME = 'ch-offline';
const IDB_STORE = 'reports';
const SYNC_TAG = 'ch-flush-reports';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never cache API calls — always hit the network.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network-first, fall back to cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Static assets: cache-first.
  if (url.pathname.startsWith('/_next/static') || /\.(?:js|css|svg|png|jpg|jpeg|webp|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
            return res;
          }),
      ),
    );
  }
});

// ----- Background Sync: flush the offline report outbox ---------------------

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE, { keyPath: 'queuedAt' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbAll(db) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function flushReports() {
  const db = await openDb();
  const items = await idbAll(db);
  for (const item of items) {
    try {
      const blob = await fetch(item.imageDataUrl).then((r) => r.blob());
      const fd = new FormData();
      fd.append('image', blob, 'report.jpg');
      fd.append('location', item.location || '');
      fd.append('notes', item.notes || '');
      fd.append('language', item.language || 'English');
      if (item.lat != null && item.lng != null) {
        fd.append('lat', String(item.lat));
        fd.append('lng', String(item.lng));
      }
      const res = await fetch('/api/triage', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('triage returned ' + res.status);
      await res.text(); // let the agent finish server-side
      await idbDelete(db, item.queuedAt);
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const c of clients) c.postMessage({ type: 'ch-synced', queuedAt: item.queuedAt });
    } catch (err) {
      // still offline or server error — rethrow so the browser retries the sync
      throw err;
    }
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) event.waitUntil(flushReports());
});
