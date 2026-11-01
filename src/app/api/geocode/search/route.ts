import { type NextRequest, NextResponse } from 'next/server';
import { LOCALITIES } from '@/lib/geo';

export const dynamic = 'force-dynamic';

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1000; // 1 req/sec policy

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
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const cacheKey = q.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ results: cached.data });
  }

  // Fallback results from local knowledge base
  const localMatches = LOCALITIES.filter((l) =>
    l.name.toLowerCase().includes(cacheKey),
  ).map((l) => ({
    name: l.name,
    displayName: `${l.name}, Bengaluru, Karnataka, India`,
    lat: l.geo.lat,
    lng: l.geo.lng,
    locality: l.name,
  }));

  try {
    await throttle();

    const nominatimUrl = new URL(
      process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org/search',
    );
    nominatimUrl.searchParams.set('q', q);
    nominatimUrl.searchParams.set('format', 'jsonv2');
    nominatimUrl.searchParams.set('addressdetails', '1');
    nominatimUrl.searchParams.set('limit', '6');

    const res = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'CommunityHeroCivicApp/1.0 (contact@communityhero.local)',
        'Accept-Language': 'en,en-US;q=0.9',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ results: localMatches });
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ results: localMatches });
    }

    interface NominatimItem {
      display_name: string;
      name?: string;
      lat: string;
      lon: string;
      address?: {
        suburb?: string;
        neighbourhood?: string;
        quarter?: string;
        city_district?: string;
        city?: string;
        town?: string;
        road?: string;
      };
    }

    const results = (data as NominatimItem[]).map((item) => {
      const addr = item.address || {};
      const locality =
        addr.suburb ||
        addr.neighbourhood ||
        addr.quarter ||
        addr.city_district ||
        addr.city ||
        item.name ||
        item.display_name.split(',')[0].trim();

      return {
        name: item.name || locality,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        locality,
      };
    });

    cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: localMatches });
  }
}

