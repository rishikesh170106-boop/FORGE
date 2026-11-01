'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Filter, Crosshair, Loader2, X } from 'lucide-react';
import MapView from '@/components/MapView';
import IssueCard from '@/components/IssueCard';
import { useRealtime } from '@/lib/useRealtime';
import { LOCALITIES, haversine, humanDistance, nearestLocality } from '@/lib/geo';
import type { GeoPoint, Issue, IssueCategory } from '@/lib/types';

const CHIPS: (IssueCategory | 'all')[] = [
  'all', 'Pothole', 'Water Leak', 'Garbage', 'Streetlight', 'Drainage', 'Tree / Hazard',
];
const RADII = [2, 5, 10];

export default function CivicMapPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [cat, setCat] = useState<IssueCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);

  const [userLoc, setUserLoc] = useState<GeoPoint | null>(null);
  const [locName, setLocName] = useState<string>('');
  const [radiusKm, setRadiusKm] = useState(5);
  const [locating, setLocating] = useState(false);

  const load = useCallback(() => {
    return fetch('/api/issues', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setIssues(d.issues))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(load);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const g = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(g);
        setLocName(`Near you · ${nearestLocality(g).name}`);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function pickLocality(name: string) {
    if (!name) {
      setUserLoc(null);
      setLocName('');
      return;
    }
    const loc = LOCALITIES.find((l) => l.name === name);
    if (loc) {
      setUserLoc(loc.geo);
      setLocName(loc.name);
    }
  }

  // category filter
  const byCat = useMemo(
    () => (cat === 'all' ? issues : issues.filter((i) => i.category === cat)),
    [issues, cat],
  );

  // distance filter + sort when a location is chosen
  const withDistance = useMemo(() => {
    if (!userLoc) return byCat.map((i) => ({ issue: i, distM: undefined as number | undefined }));
    return byCat
      .map((i) => ({ issue: i, distM: haversine(userLoc, i.geo) }))
      .filter((r) => (r.distM as number) <= radiusKm * 1000)
      .sort((a, b) => (a.distM as number) - (b.distM as number));
  }, [byCat, userLoc, radiusKm]);

  const visibleIssues = withDistance.map((r) => r.issue);

  return (
    <div className="container animate-fade-in">
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '2rem' }}>CIVIC SENSE Live City Map</h1>
        <p className="muted small">Geotagged civic issue visualizer. Smarter communities with real-time field monitoring.</p>
      </div>

      {/* Location bar */}
      <div className="glass-card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="btn btn-primary btn-sm" onClick={useMyLocation} disabled={locating}>
            {locating ? <Loader2 size={14} className="spin" /> : <Crosshair size={14} />} Use my location
          </button>
          <span className="tiny muted">or</span>
          <select className="input-field" style={{ width: 'auto', padding: '0.45rem 0.8rem' }} value={LOCALITIES.find((l) => l.name === locName)?.name ?? ''} onChange={(e) => pickLocality(e.target.value)}>
            <option value="">Pick a locality…</option>
            {LOCALITIES.map((l) => <option key={l.name} value={l.name}>{l.name}</option>)}
          </select>

          {userLoc && (
            <>
              <span className="flex items-center gap-1 tiny" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>
                <MapPin size={12} /> {locName}
              </span>
              <div className="flex items-center gap-1">
                {RADII.map((r) => (
                  <button key={r} className="suggestion" style={radiusKm === r ? { color: '#fff', background: 'var(--primary)', borderColor: 'var(--primary)' } : undefined} onClick={() => setRadiusKm(r)}>
                    {r}km
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => pickLocality('')}><X size={13} /> Clear</button>
            </>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '1.25rem' }}>
        <span className="tiny muted flex items-center gap-1"><Filter size={13} /> Filter:</span>
        {CHIPS.map((c) => (
          <button key={c} className="suggestion" style={cat === c ? { color: '#fff', background: 'var(--primary)', borderColor: 'var(--primary)' } : undefined} onClick={() => setCat(c)}>
            {c === 'all' ? 'All' : c}
          </button>
        ))}
        <span className="tiny muted" style={{ marginLeft: 'auto' }}>
          <MapPin size={12} style={{ verticalAlign: '-2px' }} /> {visibleIssues.length} {userLoc ? `within ${radiusKm}km` : 'shown'}
        </span>
      </div>

      <div className="two-col">
        <div className="glass-card" style={{ padding: '0.75rem' }}>
          {loading ? (
            <div className="muted center-text" style={{ padding: '4rem' }}>Loading map…</div>
          ) : (
            <MapView issues={visibleIssues} center={userLoc ?? undefined} />
          )}
        </div>

        <div style={{ maxHeight: 560, overflowY: 'auto', paddingRight: '0.25rem' }} className="flex-col gap-3">
          {withDistance.slice(0, 14).map(({ issue, distM }) => (
            <div key={issue.id} style={{ position: 'relative' }}>
              {distM !== undefined && (
                <span className="pill pill-primary" style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
                  {humanDistance(distM)}
                </span>
              )}
              <IssueCard issue={issue} />
            </div>
          ))}
          {visibleIssues.length === 0 && !loading && (
            <p className="muted small center-text" style={{ padding: '2rem' }}>
              {userLoc ? `No ${cat === 'all' ? '' : cat + ' '}issues within ${radiusKm}km — try a wider radius.` : 'No issues in this category yet.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

