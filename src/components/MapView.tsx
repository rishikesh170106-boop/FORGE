'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { Issue } from '@/lib/types';

// Dynamic import with SSR disabled to prevent Leaflet window/document references
const LeafletCityMap = dynamic(() => import('./LeafletCityMap'), {
  ssr: false,
  loading: () => (
    <div
      className="glass-card flex items-center justify-center"
      style={{
        width: '100%',
        aspectRatio: '16 / 10',
        minHeight: '340px',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div className="muted small flex items-center gap-2">
        <Loader2 size={18} className="spin text-primary" /> Loading OpenStreetMap…
      </div>
    </div>
  ),
});

export default function MapView({
  issues,
  activeId,
  center,
  height,
}: {
  issues: Issue[];
  activeId?: string;
  center?: { lat: number; lng: number };
  height?: string;
}) {
  return (
    <div style={height ? { height, minHeight: height } : undefined}>
      <LeafletCityMap issues={issues} activeId={activeId} center={center} />
    </div>
  );
}
