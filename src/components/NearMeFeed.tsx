'use client';

import { useCallback, useEffect, useState } from 'react';
import { Crosshair, Loader2, MapPin } from 'lucide-react';
import IssueCard from './IssueCard';
import { useRealtime } from '@/lib/useRealtime';
import { haversine, humanDistance, nearestLocality } from '@/lib/geo';
import type { GeoPoint, Issue } from '@/lib/types';

export default function NearMeFeed({ limit = 4 }: { limit?: number }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loc, setLoc] = useState<GeoPoint | null>(null);
  const [locName, setLocName] = useState('');
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  const load = useCallback(() => {
    return fetch('/api/issues', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setIssues(d?.issues || []))
      .catch(() => { });
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(load);

  function locate() {
    if (!navigator.geolocation) {
      setDenied(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const g = { lat: p.coords.latitude, lng: p.coords.longitude };
        setLoc(g);
        setLocName(nearestLocality(g).name);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setDenied(true);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  const near = loc
    ? issues
      .map((i) => ({ issue: i, d: haversine(loc, i.geo) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, limit)
    : [];

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '1rem' }}>
        <div className="section-title" style={{ margin: 0 }}>
          <MapPin size={18} color="#2563eb" />
          <h2 style={{ fontSize: '1.1rem' }}>Issues near you</h2>
        </div>
        {!loc ? (
          <button className="btn btn-primary btn-sm" onClick={locate} disabled={locating}>
            {locating ? <Loader2 size={14} className="spin" /> : <Crosshair size={14} />} Use my location
          </button>
        ) : (
          <span className="pill pill-primary"><MapPin size={12} /> {locName}</span>
        )}
      </div>

      {!loc ? (
        <p className="muted small">
          {denied
            ? 'Location unavailable — explore the full map instead.'
            : 'Share your location to see the closest reports to you, ranked by distance.'}
        </p>
      ) : near.length ? (
        <div className="cards-grid">
          {near.map(({ issue, d }) => (
            <div key={issue.id} style={{ position: 'relative' }}>
              <span className="pill pill-primary" style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
                {humanDistance(d)}
              </span>
              <IssueCard issue={issue} />
            </div>
          ))}
        </div>
      ) : (
        <p className="muted small">No reports nearby yet — your area looks clear! 🎉</p>
      )}
    </div>
  );
}
