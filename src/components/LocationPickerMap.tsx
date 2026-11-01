'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CITY } from '@/lib/geo';
import { createPickerPin } from '@/lib/leafletIcons';

interface LocationPickerMapProps {
  coords: { lat: number; lng: number } | null;
  onLocationSelect: (coords: { lat: number; lng: number }) => void;
  locality?: string;
}

function MapEventsHandler({
  onLocationSelect,
}: {
  onLocationSelect: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function CenterController({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom() < 14 ? 15 : map.getZoom(), {
      animate: true,
    });
  }, [map, center.lat, center.lng]);
  return null;
}

export default function LocationPickerMap({
  coords,
  onLocationSelect,
  locality,
}: LocationPickerMapProps) {
  const markerRef = useRef<LeafletMarker>(null);
  const activeCenter = coords ?? CITY.center;
  const pinIcon = useMemo(() => createPickerPin(), []);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onLocationSelect({ lat: latLng.lat, lng: latLng.lng });
        }
      },
    }),
    [onLocationSelect],
  );

  return (
    <div
      style={{
        width: '100%',
        height: '260px',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        position: 'relative',
        zIndex: 1,
        marginTop: '0.5rem',
      }}
    >
      <MapContainer
        center={[activeCenter.lat, activeCenter.lng]}
        zoom={coords ? 15 : 12}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <MapEventsHandler onLocationSelect={onLocationSelect} />
        {coords && <CenterController center={coords} />}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {coords && (
          <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={[coords.lat, coords.lng]}
            ref={markerRef}
            icon={pinIcon}
          />
        )}
      </MapContainer>

      {/* Floating status bar on the map */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          right: 8,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(8px)',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '11px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          zIndex: 1000,
          pointerEvents: 'none',
        }}
      >
        <span style={{ color: '#15803d', fontWeight: 600 }}>
          {coords ? `📍 ${locality || 'Pinned location'}` : 'Click or tap anywhere on map to pin'}
        </span>
        {coords && (
          <span style={{ color: '#64748b', fontFamily: 'monospace' }}>
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}

