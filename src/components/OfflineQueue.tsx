'use client';

import { useCallback, useEffect, useState } from 'react';
import { CloudUpload, Loader2 } from 'lucide-react';
import { dataUrlToBlob, getQueue, setQueue, idbRemove } from '@/lib/offlineQueue';

export default function OfflineQueue() {
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => setCount(getQueue().length), []);

  const drain = useCallback(async () => {
    if (!navigator.onLine || getQueue().length === 0) return;
    setSyncing(true);
    for (const item of [...getQueue()]) {
      try {
        const fd = new FormData();
        fd.append('image', dataUrlToBlob(item.imageDataUrl), 'report.jpg');
        fd.append('location', item.location);
        fd.append('notes', item.notes);
        fd.append('language', item.language);
        if (item.lat != null && item.lng != null) {
          fd.append('lat', String(item.lat));
          fd.append('lng', String(item.lng));
        }
        const res = await fetch('/api/triage', { method: 'POST', body: fd });
        if (res.ok) {
          await res.text(); // let the agent finish server-side
          setQueue(getQueue().filter((x) => x.queuedAt !== item.queuedAt));
          void idbRemove(item.queuedAt);
          setCount(getQueue().length);
        } else {
          break;
        }
      } catch {
        break; // still offline / network error — try again later
      }
    }
    setSyncing(false);
    refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    drain();
    const onOnline = () => drain();
    const onChange = () => {
      refresh();
      drain();
    };
    // The service worker's Background Sync may flush reports while this tab is
    // idle — mirror those removals into the localStorage badge.
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'ch-synced') {
        setQueue(getQueue().filter((x) => x.queuedAt !== e.data.queuedAt));
        refresh();
      }
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('ch-queue-changed', onChange);
    navigator.serviceWorker?.addEventListener('message', onSwMessage);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('ch-queue-changed', onChange);
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    };
  }, [drain, refresh]);

  if (count === 0 && !syncing) return null;

  return (
    <div
      className="glass"
      style={{
        position: 'fixed', left: '1.5rem', bottom: '1.5rem', zIndex: 85,
        padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-full)', boxShadow: 'var(--shadow-lg)',
        display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500,
      }}
    >
      {syncing ? <Loader2 size={15} className="spin" /> : <CloudUpload size={15} color="var(--primary-600)" />}
      {syncing ? 'Syncing queued reports…' : `${count} report${count > 1 ? 's' : ''} queued offline`}
    </div>
  );
}
