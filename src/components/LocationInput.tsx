'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Crosshair, Loader2, MapPin, Search, Map as MapIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/lib/toast';

interface Props {
  location: string;
  setLocation: (val: string) => void;
  onLocationFound: (coords: { lat: number; lng: number } | null) => void;
  coords: { lat: number; lng: number } | null;
}

interface SearchResult {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  locality?: string;
}

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), {
  ssr: false,
  loading: () => (
    <div
      className="glass-card flex items-center justify-center"
      style={{ width: '100%', height: '260px', marginTop: '0.5rem', borderRadius: 'var(--radius-md)' }}
    >
      <div className="muted small flex items-center gap-2">
        <Loader2 size={16} className="spin" /> Loading OpenStreetMap…
      </div>
    </div>
  ),
});

export default function LocationInput({ location, setLocation, onLocationFound, coords }: Props) {
  const [query, setQuery] = useState(location);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync external location prop if changed externally
  useEffect(() => {
    setQuery(location);
  }, [location]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search using OpenStreetMap Nominatim
  const handleQueryChange = (val: string) => {
    setQuery(val);
    setLocation(val);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(val.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.results || []);
          setShowDropdown(Boolean(data.results && data.results.length > 0));
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 380);
  };

  const handleSelectSuggestion = (s: SearchResult) => {
    setQuery(s.displayName);
    setLocation(s.displayName);
    onLocationFound({ lat: s.lat, lng: s.lng });
    setShowDropdown(false);
  };

  // Reverse geocode coordinates to human-readable address
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
        if (res.ok) {
          const data = await res.json();
          if (data.displayName) {
            setQuery(data.displayName);
            setLocation(data.displayName);
            return;
          }
        }
      } catch {
        /* fallback below */
      }
      const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setQuery(fallback);
      setLocation(fallback);
    },
    [setLocation],
  );

  // Map click or drag handler
  const handleMapLocationSelect = async (newCoords: { lat: number; lng: number }) => {
    onLocationFound(newCoords);
    await reverseGeocode(newCoords.lat, newCoords.lng);
  };

  // Native Browser Geolocation GPS
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast('Geolocation is not supported by your browser', 'error');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onLocationFound({ lat, lng });
        await reverseGeocode(lat, lng);
        setLocating(false);
        toast('GPS location acquired!', 'success');
      },
      (err) => {
        setLocating(false);
        let msg = 'Could not acquire GPS position.';
        if (err.code === 1) msg = 'Location permission denied by browser.';
        else if (err.code === 2) msg = 'Location unavailable or offline.';
        else if (err.code === 3) msg = 'Location request timed out.';
        toast(msg, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  return (
    <div className="w-full flex flex-col gap-1" ref={dropdownRef}>
      <div className="flex gap-2 w-full relative">
        <div className="relative flex-1">
          <input
            className="input-field"
            style={{ width: '100%', paddingLeft: '2.25rem' }}
            placeholder="Search neighborhood, street, or landmark…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
              pointerEvents: 'none',
              display: 'flex',
            }}
          >
            {searching ? <Loader2 size={16} className="spin text-primary" /> : <Search size={16} />}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={useMyLocation}
          disabled={locating}
          title="Detect current GPS coordinates"
          style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          {locating ? <Loader2 size={15} className="spin text-primary" /> : <Crosshair size={15} />}
          {coords ? 'Relocate GPS' : 'Use GPS'}
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowMap((prev) => !prev)}
          title="Toggle interactive map"
          style={{ padding: '0.4rem 0.6rem' }}
        >
          <MapIcon size={15} />
          {showMap ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* Nominatim Suggestions Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div
            className="glass-card"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: '90px',
              marginTop: '4px',
              zIndex: 2000,
              maxHeight: '230px',
              overflowY: 'auto',
              padding: '0.35rem',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--border)',
            }}
          >
            {suggestions.map((item, idx) => (
              <div
                key={`${item.lat}-${item.lng}-${idx}`}
                onClick={() => handleSelectSuggestion(item)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <MapPin size={14} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>
                    {item.name}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.displayName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Embedded interactive OpenStreetMap for selecting/adjusting location */}
      {showMap && (
        <LocationPickerMap
          coords={coords}
          onLocationSelect={handleMapLocationSelect}
          locality={query.split(',')[0]}
        />
      )}
    </div>
  );
}
