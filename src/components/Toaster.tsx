'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

interface T {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const STYLE = {
  success: { color: '#16a34a', Icon: CheckCircle2 },
  error: { color: '#dc2626', Icon: AlertTriangle },
  info: { color: '#2563eb', Icon: Info },
};

export default function Toaster() {
  const [toasts, setToasts] = useState<T[]>([]);

  useEffect(() => {
    function on(e: Event) {
      const d = (e as CustomEvent).detail as T;
      setToasts((t) => [...t, d]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== d.id)), 4500);
    }
    window.addEventListener('ch-toast', on);
    return () => window.removeEventListener('ch-toast', on);
  }, []);

  if (!toasts.length) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 200,
        display: 'flex', flexDirection: 'column', gap: '0.5rem', width: 'min(420px, calc(100vw - 2rem))',
      }}
    >
      {toasts.map((t) => {
        const { color, Icon } = STYLE[t.type] ?? STYLE.info;
        return (
          <div
            key={t.id}
            className="glass animate-rise"
            style={{
              padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
              display: 'flex', alignItems: 'center', gap: '0.6rem', borderLeft: `3px solid ${color}`,
            }}
          >
            <Icon size={17} color={color} />
            <span className="small" style={{ flex: 1, color: 'var(--foreground)' }}>{t.message}</span>
            <button
              onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))}
              aria-label="Dismiss"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
