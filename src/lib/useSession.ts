'use client';

import { useEffect, useState, useCallback } from 'react';

export interface ClientProfile {
  id: string;
  name: string;
  avatar: string;
  role: string;
  email?: string;
  points?: number;
  reportsCount?: number;
  verificationsCount?: number;
  resolvedImpact?: number;
  isDemo?: boolean;
}

// Client-side session hook connected to local SQLite auth
export function useSession() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!res.ok) {
        setProfile(null);
        return;
      }
      const data = await res.json();
      if (data?.profile) {
        setProfile(data.profile);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    const onAuthChange = () => load();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('ch-auth-change', onAuthChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('ch-auth-change', onAuthChange);
    };
  }, [load]);

  return { profile, loading, reload: load };
}
