'use client';

import { useEffect } from 'react';

// Registers the service worker (production only, to avoid Turbopack-dev interference).
export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
