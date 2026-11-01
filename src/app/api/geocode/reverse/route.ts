import { type NextRequest, NextResponse } from 'next/server';
import { nearestLocality } from '@/lib/geo';

export const dynamic = 'force-dynamic';

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1000;

async function throttle() {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - timeSinceLast));
  }
  lastRequestTime = Date.now();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'invalid coordinates' }, { status: 400 });
  }

  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // Local fallback
  const fallback = () => {
    try {
      const loc = nearestLocality({ lat, lng });
      return {
        displayName: `${loc.name}, Bengaluru (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        locality: loc.name,
        lat,
        lng,
      };
    } catch {
      return {
        displayName: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        locality: 'Area',
        lat,
        lng,
      };
    }
  };

  try {
    await throttle();

    const nominatimUrl = new URL(
      process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org/reverse',
    );
    nominatimUrl.searchParams.set('lat', lat.toString());
    nominatimUrl.searchParams.set('lon', lng.toString());
    nominatimUrl.searchParams.set('format', 'jsonv2');
    nominatimUrl.searchParams.set('addressdetails', '1');

    const res = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'CommunityHeroCivicApp/1.0 (contact@communityhero.local)',
        'Accept-Language': 'en,en-US;q=0.9',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(fallback());
    }

    const data = await res.json();
    if (!data || !data.display_name) {
      return NextResponse.json(fallback());
    }

    const addr = data.address || {};
    const locality =
      addr.suburb ||
      addr.neighbourhood ||
      addr.quarter ||
      addr.city_district ||
      addr.village ||
      addr.town ||
      addr.city ||
      fallback().locality;

    const result = {
      displayName: data.display_name,
      locality,
      road: addr.road,
      suburb: addr.suburb || addr.neighbourhood,
      city: addr.city || addr.town,
      lat,
      lng,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(fallback());
  }
}

