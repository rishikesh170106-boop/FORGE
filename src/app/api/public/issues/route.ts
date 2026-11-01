import { listIssues } from '@/lib/data';
import type { IssueCategory, IssueStatus } from '@/lib/types';

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

// Public, read-only open-data feed — sanitized (no reporter PII, no internal id/image).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = (searchParams.get('category') as IssueCategory) || 'all';
  const status = (searchParams.get('status') as IssueStatus) || 'all';
  const area = (searchParams.get('area') || '').toLowerCase();
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  let issues = await listIssues({ category, status });
  if (area) issues = issues.filter((i) => i.location.toLowerCase().includes(area));

  const data = issues.slice(0, limit).map((i) => ({
    ref: i.ref ?? i.id,
    title: i.title,
    category: i.category,
    severity: i.severity,
    status: i.status,
    priority: i.priority,
    location: i.location,
    lat: i.geo.lat,
    lng: i.geo.lng,
    verifications: i.verifications,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }));

  return Response.json(
    { source: 'Community Hero open data', count: data.length, issues: data },
    { headers: CORS },
  );
}
