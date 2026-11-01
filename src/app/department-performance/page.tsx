import Link from 'next/link';
import { ArrowLeft, Building2, Clock, CheckCircle2, Gauge } from 'lucide-react';
import { listIssues } from '@/lib/data';
import { computeScorecards, type DeptScore } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

const GRADE_COLOR: Record<DeptScore['grade'], string> = {
  A: '#16a34a',
  B: '#702D3B',
  C: '#d97706',
  D: '#dc2626',
};

function slaText(h: number) {
  if (!h) return '—';
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
}

export default async function DepartmentPerformancePage() {
  const scores = computeScorecards(await listIssues());
  const avgSla = scores.length ? Math.round(scores.reduce((s, d) => s + d.slaCompliancePct, 0) / scores.length) : 0;

  return (
    <div className="container animate-fade-in">
      <Link href="/dashboard" className="link flex items-center gap-1 tiny" style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <div className="flex items-center gap-3" style={{ marginBottom: '0.5rem' }}>
        <span className="logo-badge" style={{ width: 42, height: 42, borderRadius: 12 }}>
          <Building2 size={22} />
        </span>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Department Performance &amp; Accountability</h1>
          <p className="muted small">Public department scorecards — SLA compliance, resolution rate and turnaround speed.</p>
        </div>
      </div>

      <div className="panel" style={{ padding: '1rem 1.25rem', margin: '1.25rem 0' }}>
        <span className="small">
          City-wide SLA compliance: <strong style={{ color: avgSla >= 60 ? '#16a34a' : '#d97706' }}>{avgSla}%</strong> · {scores.length} departments tracked
        </span>
      </div>

      <div className="cards-grid">
        {scores.map((d) => (
          <div key={d.department} className="glass-card hoverable">
            <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
              <div className="flex items-center gap-2" style={{ maxWidth: '75%' }}>
                <Building2 size={16} color="var(--muted)" />
                <strong style={{ color: 'var(--foreground)', fontSize: '0.98rem' }}>{d.department}</strong>
              </div>
              <span
                className="badge"
                title="Grade from resolution rate + SLA compliance"
                style={{ background: GRADE_COLOR[d.grade] + '22', color: GRADE_COLOR[d.grade], fontWeight: 800, fontSize: '0.95rem', width: 28, height: 28, justifyContent: 'center', borderRadius: 8 }}
              >
                {d.grade}
              </span>
            </div>

            <div className="flex gap-4" style={{ marginBottom: '1rem' }}>
              <Metric label="Total" value={d.total} />
              <Metric label="Resolved" value={d.resolved} color="#16a34a" />
              <Metric label="Open" value={d.open} color={d.open ? '#d97706' : undefined} />
            </div>

            <Bar label="Resolution rate" pct={d.resolvedPct} color="#16a34a" icon={<CheckCircle2 size={12} />} />
            <Bar label="SLA compliance" pct={d.slaCompliancePct} color="var(--primary)" icon={<Gauge size={12} />} />

            <div className="flex items-center justify-between tiny muted" style={{ marginTop: '0.85rem' }}>
              <span className="flex items-center gap-1"><Clock size={12} /> Avg turnaround {slaText(d.avgResolutionH)}</span>
              {d.critical > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>{d.critical} critical</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: color ?? 'var(--foreground)', lineHeight: 1 }}>{value}</div>
      <div className="tiny muted">{label}</div>
    </div>
  );
}

function Bar({ label, pct, color, icon }: { label: string; pct: number; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div className="flex items-center justify-between tiny" style={{ marginBottom: '0.25rem' }}>
        <span className="muted flex items-center gap-1">{icon} {label}</span>
        <strong style={{ color }}>{pct}%</strong>
      </div>
      <div className="meter"><span style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

