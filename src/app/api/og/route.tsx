import { ImageResponse } from 'next/og';
import { getIssue, getStats } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dynamic Open Graph share cards. `/api/og?id=CH-1042` renders a bold, branded
// card for an issue ("Fix this!") so shares on WhatsApp/X/news sites carry the
// live priority and status. Without an id it renders the city-wide card for
// sharing the platform itself.

const SEVERITY_COLOR: Record<string, string> = {
  Low: '#16a34a',
  Medium: '#d97706',
  High: '#ea580c',
  Critical: '#dc2626',
};

function priorityColor(p: number): string {
  if (p >= 80) return '#f87171';
  if (p >= 60) return '#fb923c';
  if (p >= 40) return '#fbbf24';
  return '#4ade80';
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const issue = id ? await getIssue(id) : undefined;

  if (!issue) {
    const stats = await getStats().catch(() => null);
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 72,
            background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 60%, #6d28d9 100%)',
            color: '#fff',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 34, fontWeight: 700 }}>
            🦸 Community Hero
          </div>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, marginTop: 28, lineHeight: 1.15 }}>
            Every citizen a sensor. Every issue tracked to resolution.
          </div>
          <div style={{ display: 'flex', gap: 40, marginTop: 44, fontSize: 30, color: '#ddd6fe' }}>
            {stats ? (
              <>
                <span>{stats.total} reports filed</span>
                <span>{stats.resolved} resolved</span>
                <span>{stats.verifications} verifications</span>
              </>
            ) : (
              <span>AI-triaged civic reporting for your neighbourhood</span>
            )}
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 60%, #6d28d9 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, fontWeight: 700 }}>
            🦸 Community Hero
          </div>
          <div
            style={{
              display: 'flex',
              padding: '10px 24px',
              borderRadius: 999,
              background: SEVERITY_COLOR[issue.severity] ?? '#d97706',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {issue.severity} · {issue.status}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 26, color: '#c4b5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>
            {issue.category} · {issue.location}
          </div>
          <div style={{ display: 'flex', fontSize: 58, fontWeight: 800, marginTop: 14, lineHeight: 1.15 }}>
            {issue.title.length > 70 ? `${issue.title.slice(0, 70)}…` : issue.title}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: '#ddd6fe' }}>
              <span>Priority score</span>
              <span style={{ color: priorityColor(issue.priority), fontWeight: 800 }}>{issue.priority}/100</span>
            </div>
            <div style={{ display: 'flex', width: '100%', height: 18, borderRadius: 999, background: 'rgba(255,255,255,0.18)' }}>
              <div
                style={{
                  display: 'flex',
                  width: `${Math.max(4, issue.priority)}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: priorityColor(issue.priority),
                }}
              />
            </div>
            <div style={{ display: 'flex', fontSize: 22, color: '#c4b5fd' }}>
              Verified by {issue.verifications} neighbour{issue.verifications === 1 ? '' : 's'} · Ref {issue.ref ?? issue.id}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              padding: '18px 40px',
              borderRadius: 999,
              background: '#fff',
              color: '#6d28d9',
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            {issue.status === 'Resolved' ? '✅ Fixed!' : '📣 Fix this!'}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // OG scrapers hammer share cards — let the edge serve them.
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
