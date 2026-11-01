'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CITY } from '@/lib/geo';
import type { Issue } from '@/lib/types';
import { SEVERITY_COLOR, SeverityBadge, StatusBadge, CategoryIcon } from './ui';
import { createIssuePin } from '@/lib/leafletIcons';

function MapController({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: true });
  }, [map, center.lat, center.lng, zoom]);
  return null;
}

export default function LeafletCityMap({
  issues,
  activeId,
  center: centerProp,
}: {
  issues: Issue[];
  activeId?: string;
  center?: { lat: number; lng: number };
}) {
  const [activeIssueId, setActiveIssueId] = useState<string | null>(activeId ?? null);

  const selected = issues.find((i) => i.id === activeIssueId);
  const mapCenter = selected?.geo ?? centerProp ?? issues[0]?.geo ?? CITY.center;
  const zoom = selected ? 15 : centerProp ? 14 : 12;

  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '16 / 10',
        minHeight: '340px',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--surface-border)',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <MapController center={mapCenter} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {issues.map((i) => (
          <Marker
            key={i.id}
            position={[i.geo.lat, i.geo.lng]}
            icon={createIssuePin(SEVERITY_COLOR[i.severity])}
            eventHandlers={{
              click: () => setActiveIssueId(i.id),
            }}
          >
            <Popup minWidth={220} maxWidth={260}>
              <div style={{ color: '#18181b', fontFamily: 'inherit', padding: '2px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ color: SEVERITY_COLOR[i.severity], display: 'inline-flex' }}>
                    <CategoryIcon category={i.category} size={16} />
                  </span>
                  <strong style={{ fontSize: 13, lineHeight: 1.25 }}>{i.title}</strong>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  <SeverityBadge severity={i.severity} />
                  <StatusBadge status={i.status} />
                </div>
                <div style={{ fontSize: 11, color: '#71717a', marginBottom: 8, lineHeight: 1.3 }}>
                  {i.location}
                </div>
                <Link
                  href={`/issues/${i.id}`}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--primary, #2563eb)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  View details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

