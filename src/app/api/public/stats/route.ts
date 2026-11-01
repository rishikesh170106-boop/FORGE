import { getHotspots, getStats } from '@/lib/data';

export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  // Embedded widgets on news sites can hammer this feed — let the CDN absorb it.
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=59',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET() {
  const [stats, hotspots] = await Promise.all([getStats(), getHotspots()]);
  return Response.json(
    {
      source: 'Community Hero open data',
      stats: {
        total: stats.total,
        open: stats.open,
        resolved: stats.resolved,
        critical: stats.critical,
        verifications: stats.verifications,
        avgResolutionH: stats.avgResolutionH,
        byCategory: stats.byCategory,
        byStatus: stats.byStatus,
      },
      hotspots: hotspots.map((h) => ({
        area: h.area,
        count: h.count,
        openCount: h.openCount,
        topCategory: h.topCategory,
        maxSeverity: h.maxSeverity,
      })),
    },
    { headers: CORS },
  );
}
