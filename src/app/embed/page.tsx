'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, MapPin } from 'lucide-react';
import MapView from '@/components/MapView';
import { SeverityBadge, StatusBadge, CategoryIcon, timeAgo } from '@/components/ui';
import type { Issue } from '@/lib/types';

// Standalone embeddable widget (no app chrome). Iframe it:
// <iframe src="https://YOUR-DOMAIN/embed?area=Koramangala" width="100%" height="480" />
export default function EmbedPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const a = params.get('area') || '';
    const category = params.get('category') || '';
    setArea(a);
    const qs = new URLSearchParams();
    if (a) qs.set('area', a);
    if (category) qs.set('category', category);
    qs.set('limit', '40');
    fetch(`/api/public/issues?${qs}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) =>
        setIssues(
          (d.issues || []).map((i: Record<string, unknown>) => ({
            ...i,
            id: i.ref,
            geo: { lat: i.lat, lng: i.lng },
            tags: [],
            timeline: [],
          })) as Issue[],
        ),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(
    () => [...issues].sort((a, b) => b.priority - a.priority),
    [issues],
  );

  return (
    <div style={{ minHeight: '100vh', padding: '1rem', background: 'var(--background)', marginTop: '-5rem' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
        <div className="flex items-center gap-2">
          <span className="logo-badge" style={{ width: 26, height: 26, borderRadius: 7 }}>
            <ShieldCheck size={15} />
          </span>
          <strong style={{ fontSize: '0.95rem' }}>
            Community<span className="text-gradient">Hero</span>
          </strong>
          {area && <span className="pill pill-primary"><MapPin size={11} /> {area}</span>}
        </div>
        <span className="tiny muted">{sorted.length} live issues</span>
      </div>

      <div className="split" style={{ gap: '0.75rem' }}>
        <div className="glass-card" style={{ padding: '0.5rem' }}>
          {loading ? (
            <div className="muted center-text" style={{ padding: '3rem' }}>Loading…</div>
          ) : (
            <MapView issues={sorted} />
          )}
        </div>
        <div className="flex-col gap-2" style={{ maxHeight: 420, overflowY: 'auto' }}>
          {sorted.slice(0, 12).map((i) => (
            <a
              key={i.id}
              href={`/issues/${i.id}`}
              target="_blank"
              rel="noreferrer"
              className="panel"
              style={{ padding: '0.6rem 0.8rem', textDecoration: 'none', display: 'block' }}
            >
              <div className="flex items-center gap-2" style={{ marginBottom: '0.25rem' }}>
                <CategoryIcon category={i.category} size={13} />
                <strong style={{ fontSize: '0.85rem', color: 'var(--foreground)' }}>{i.title}</strong>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <SeverityBadge severity={i.severity} />
                <StatusBadge status={i.status} />
                <span className="tiny muted">{timeAgo(i.createdAt)}</span>
              </div>
            </a>
          ))}
          {!loading && sorted.length === 0 && (
            <p className="muted small center-text" style={{ padding: '2rem' }}>No issues to show.</p>
          )}
        </div>
      </div>

      <div className="center-text tiny muted" style={{ marginTop: '0.75rem' }}>
        Powered by Community Hero · open civic data
      </div>
    </div>
  );
}
