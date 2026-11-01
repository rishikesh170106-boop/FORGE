'use client';

// Tiny offline outbox for reports captured without connectivity.
// Reports are mirrored into IndexedDB so the service worker's Background Sync
// can flush them even when the tab is closed (see public/sw.js); localStorage
// keeps the in-page badge fast and synchronous.
export interface QueuedReport {
  location: string;
  notes: string;
  language: string;
  lat?: number;
  lng?: number;
  imageDataUrl: string;
  queuedAt: number;
}

const KEY = 'ch_offline_queue';
const IDB_NAME = 'ch-offline';
const IDB_STORE = 'reports';
export const SYNC_TAG = 'ch-flush-reports';

export function getQueue(): QueuedReport[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function setQueue(q: QueuedReport[]) {
  localStorage.setItem(KEY, JSON.stringify(q));
}

// ----- IndexedDB mirror (shared with the service worker) --------------------

function openDb(): Promise<IDBDatabase> {
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

async function idbPut(item: QueuedReport): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* IDB unavailable (private mode) — localStorage path still works */
  }
}

export async function idbRemove(queuedAt: number): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(queuedAt);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

/** Ask the service worker to flush the outbox as soon as connectivity returns —
 *  Background Sync fires even if the user closes the tab. */
async function requestBackgroundSync(): Promise<void> {
  try {
    const reg = (await navigator.serviceWorker?.ready) as
      | (ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } })
      | undefined;
    await reg?.sync?.register(SYNC_TAG);
  } catch {
    /* Background Sync unsupported — the in-page drain covers it */
  }
}

export function enqueueReport(item: QueuedReport) {
  const q = getQueue();
  q.push(item);
  setQueue(q);
  void idbPut(item);
  void requestBackgroundSync();
  window.dispatchEvent(new Event('ch-queue-changed'));
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);/)?.[1] || 'image/jpeg';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
