import type { GeoPoint } from './types';

// Demo city is modelled on Bengaluru so the hyperlocal experience feels real.
// Browser geolocation, when granted, overrides this default centre.
export const CITY = {
  name: 'Bengaluru',
  center: { lat: 12.9716, lng: 77.5946 } as GeoPoint,
  // bounding box used to project lat/lng onto the custom SVG city map
  bounds: { minLat: 12.83, maxLat: 13.06, minLng: 77.5, maxLng: 77.77 },
};

export interface Locality {
  name: string;
  geo: GeoPoint;
}

export const LOCALITIES: Locality[] = [
  { name: 'MG Road', geo: { lat: 12.9756, lng: 77.6068 } },
  { name: 'Koramangala', geo: { lat: 12.9352, lng: 77.6245 } },
  { name: 'Indiranagar', geo: { lat: 12.9719, lng: 77.6412 } },
  { name: 'Jayanagar', geo: { lat: 12.925, lng: 77.5938 } },
  { name: 'Whitefield', geo: { lat: 12.9698, lng: 77.75 } },
  { name: 'HSR Layout', geo: { lat: 12.9116, lng: 77.6389 } },
  { name: 'Malleshwaram', geo: { lat: 13.0035, lng: 77.5647 } },
  { name: 'BTM Layout', geo: { lat: 12.9166, lng: 77.6101 } },
  { name: 'Electronic City', geo: { lat: 12.8452, lng: 77.6602 } },
  { name: 'Hebbal', geo: { lat: 13.0358, lng: 77.597 } },
  { name: 'Banashankari', geo: { lat: 12.925, lng: 77.5466 } },
  { name: 'Marathahalli', geo: { lat: 12.9591, lng: 77.6974 } },
];

const R = 6371000; // earth radius in metres

/** Great-circle distance in metres between two points. */
export function haversine(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nearest known locality name for a coordinate (lightweight reverse geocode). */
export function nearestLocality(p: GeoPoint): Locality {
  return LOCALITIES.reduce((best, loc) =>
    haversine(p, loc.geo) < haversine(p, best.geo) ? loc : best,
  );
}

/** Resolve a free-text location into a coordinate by matching a known locality. */
export function resolveLocation(text: string): { name: string; geo: GeoPoint } {
  const q = text.trim().toLowerCase();
  const hit = LOCALITIES.find((l) => q.includes(l.name.toLowerCase()));
  if (hit) return { name: text.trim() || hit.name, geo: jitter(hit.geo) };
  // unknown free text — anchor near city centre with a small offset
  return { name: text.trim() || CITY.name, geo: jitter(CITY.center) };
}

/** Small deterministic-ish offset so multiple pins don't stack perfectly. */
export function jitter(p: GeoPoint, meters = 250): GeoPoint {
  const dLat = (Math.random() - 0.5) * (meters / 111000);
  const dLng =
    (Math.random() - 0.5) * (meters / (111000 * Math.cos((p.lat * Math.PI) / 180)));
  return { lat: p.lat + dLat, lng: p.lng + dLng };
}

/** Project a geo point to 0..100 x/y for the SVG map (y is inverted for screen). */
export function projectToMap(p: GeoPoint): { x: number; y: number } {
  const { bounds } = CITY;
  const x = ((p.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = ((bounds.maxLat - p.lat) / (bounds.maxLat - bounds.minLat)) * 100;
  return {
    x: Math.max(2, Math.min(98, x)),
    y: Math.max(2, Math.min(98, y)),
  };
}

export function humanDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
