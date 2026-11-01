'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  ThumbsUp,
  TrendingUp,
  Flame,
  Bot,
  RefreshCw,
  Gauge,
  Lightbulb,
  Building2,
  Download,
} from 'lucide-react';
import {
  CategoryIcon,
  SeverityBadge,
  StatusBadge,
  priorityColor,
  timeAgo,
} from '@/components/ui';
import { useRealtime } from '@/lib/useRealtime';
import NearMeFeed from '@/components/NearMeFeed';
import ForecastPanel from '@/components/ForecastPanel';
import type { Insight, Issue, IssueCategory, IssueStatus, Severity } from '@/lib/types';

interface Stats {
  total: number;
  open: number;
  critical: number;
  pending: number;
  inProgress: number;
  resolved: number;
  overdue: number;
  verifications: number;
  avgResolutionH: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  trend: { day: string; count: number }[];
}
interface Hotspot {
  area: string;
  count: number;
  topCategory: IssueCategory;
  maxSeverity: Severity;
  openCount: number;
}

const CATS: (IssueCategory | 'all')[] = [
  'all', 'Pothole', 'Streetlight', 'Water Leak', 'Garbage', 'Drainage',
  'Tree / Hazard', 'Traffic Signal', 'Stray Animals', 'Public Toilet', 'Encroachment', 'Other',
];
const STATUSES: (IssueStatus | 'all')[] = ['all', 'Reported', 'Acknowledged', 'In Progress', 'Resolved'];

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [aiInsights, setAiInsights] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [cat, setCat] = useState<IssueCategory | 'all'>('all');
  const [status, setStatus] = useState<IssueStatus | 'all'>('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    const r = await fetch('/api/stats', { cache: 'no-store' }).then((x) => x.json());
    setStats(r.stats);
    setHotspots(r.hotspots);
  }, []);

  const loadIssues = useCallback(async () => {
    const params = new URLSearchParams();
    if (cat !== 'all') params.set('category', cat);
    if (status !== 'all') params.set('status', status);
    if (q) params.set('q', q);
    const r = await fetch(`/api/issues?${params}`, { cache: 'no-store' }).then((x) => x.json());
    setIssues(r?.issues || []);
  }, [cat, status, q]);

  const loadInsights = useCallback(async () => {
    const r = await fetch('/api/insights', { cache: 'no-store' }).then((x) => x.json());
    setInsights(r.insights);
    setAiInsights(r.ai);
  }, []);

  useEffect(() => {
    Promise.all([loadStats(), loadInsights()]).finally(() => setLoading(false));
  }, [loadStats, loadInsights]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const onLive = useCallback(() => {
    loadStats();
    loadIssues();
  }, [loadStats, loadIssues]);
  useRealtime(onLive);

  function exportCsv() {
    const header = ['ref', 'title', 'category', 'severity', 'status', 'priority', 'location', 'verifications', 'createdAt'];
    const rows = issues.map((i) => [i.ref ?? i.id, i.title, i.category, i.severity, i.status, i.priority, i.location, i.verifications, i.createdAt]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `civic-sense-issues-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const trendList = Array.isArray(stats?.trend) ? stats.trend : [];
  const maxTrend = Math.max(1, ...(trendList.length ? trendList.map((t) => t.count) : [1]));
  const catEntries = Object.entries(stats?.byCategory ?? {}).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...(catEntries.length ? catEntries.map(([, c]) => c) : [1]));

  return (
    <div className="container animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>CIVIC SENSE Intelligence Dashboard</h1>
          <p className="muted small">Live hyperlocal civic intelligence & operations</p>
        </div>
        <div className="flex gap-2 items-center">
          <Link href="/department-performance" className="btn btn-secondary btn-sm">
            <Building2 size={15} /> Dept scorecards
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={exportCsv}>
            <Download size={15} /> Export CSV
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { loadStats(); loadIssues(); loadInsights(); }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <Kpi icon={<Flame size={22} />} color="#dc2626" bg="rgba(244,63,94,0.12)" value={stats?.critical ?? '–'} label="Critical open" />
        <Kpi icon={<AlertTriangle size={22} />} color="#b45309" bg="rgba(251,191,36,0.12)" value={stats?.overdue ?? '–'} label="Overdue (SLA)" />
        <Kpi icon={<Clock size={22} />} color="#2563eb" bg="rgba(96,165,250,0.12)" value={stats?.inProgress ?? '–'} label="In progress" />
        <Kpi icon={<CheckCircle2 size={22} />} color="#15803d" bg="rgba(52,211,153,0.12)" value={stats?.resolved ?? '–'} label="Resolved" />
        <Kpi icon={<ThumbsUp size={22} />} color="#2563eb" bg="rgba(99,102,241,0.12)" value={stats?.verifications ?? '–'} label="Verifications" />
      </div>

      {/* Near me */}
      <div style={{ marginBottom: '1.5rem' }}>
        <NearMeFeed limit={4} />
      </div>

      {/* Risk forecast */}
      <div style={{ marginBottom: '1.5rem' }}>
        <ForecastPanel />
      </div>

      {/* Charts row */}
      <div className="two-col" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-card">
          <div className="section-title">
            <TrendingUp size={18} color="#7c3aed" />
            <h2 style={{ fontSize: '1.1rem' }}>Reports · last 7 days</h2>
          </div>
          <div className="bars">
            {(stats?.trend ?? []).map((t) => (
              <div key={t.day} className="bar-col">
                <span className="tiny muted">{t.count}</span>
                <div className="bar" style={{ height: `${(t.count / maxTrend) * 100}%` }} />
                <span className="bar-label">{t.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <div className="section-title">
            <Gauge size={18} color="#7c3aed" />
            <h2 style={{ fontSize: '1.1rem' }}>By category</h2>
          </div>
          <div className="flex-col gap-3">
            {catEntries.slice(0, 6).map(([c, n]) => (
              <div key={c}>
                <div className="flex items-center justify-between tiny" style={{ marginBottom: '0.3rem' }}>
                  <span className="flex items-center gap-1" style={{ color: '#3f3f46' }}>
                    <CategoryIcon category={c as IssueCategory} size={13} /> {c}
                  </span>
                  <span className="muted">{n}</span>
                </div>
                <div className="meter">
                  <span style={{ width: `${(n / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights + Hotspots */}
      <div className="two-col" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ borderColor: 'rgba(99,102,241,0.25)' }}>
          <div className="section-title">
            <Bot size={18} color="#2563eb" />
            <h2 style={{ fontSize: '1.1rem' }}>AI predictive insights</h2>
            <span className={`pill ${aiInsights ? 'pill-teal' : 'pill-muted'}`} style={{ marginLeft: 'auto' }}>
              {aiInsights ? 'Gemini' : 'Heuristic'}
            </span>
          </div>
          <div className="flex-col gap-3">
            {insights.length === 0 && <p className="muted small">Generating insights…</p>}
            {insights.map((ins, i) => (
              <div key={i} className="panel" style={{ padding: '0.85rem 1rem' }}>
                <div className="flex items-center gap-2" style={{ marginBottom: '0.25rem' }}>
                  <Lightbulb size={14} color={priorityColor({ Low: 30, Medium: 50, High: 70, Critical: 90 }[ins.severity])} />
                  <strong style={{ fontSize: '0.92rem', color: 'var(--foreground)' }}>{ins.title}</strong>
                  <span className="tag" style={{ marginLeft: 'auto' }}>{ins.type}</span>
                </div>
                <p className="tiny muted">{ins.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <div className="section-title">
            <Flame size={18} color="#dc2626" />
            <h2 style={{ fontSize: '1.1rem' }}>Hotspots</h2>
          </div>
          <div className="flex-col gap-2">
            {hotspots.slice(0, 6).map((h, i) => (
              <div key={h.area} className="flex items-center gap-3 panel" style={{ padding: '0.7rem 0.9rem' }}>
                <span className="kpi-icon" style={{ width: 34, height: 34, background: 'rgba(244,63,94,0.1)', color: '#dc2626', fontWeight: 800, fontSize: '0.9rem' }}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="small" style={{ color: 'var(--foreground)', fontWeight: 600 }}>{h.area}</div>
                  <div className="tiny muted">{h.topCategory} · {h.openCount} open</div>
                </div>
                <div className="flex-col items-center">
                  <strong style={{ color: '#dc2626' }}>{h.count}</strong>
                  <SeverityBadge severity={h.maxSeverity} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Issues table */}
      <div className="glass-card">
        <div className="flex justify-between items-center flex-wrap gap-3" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem' }}>All reports</h2>
          <div className="flex gap-2 flex-wrap">
            <input
              className="input-field"
              style={{ width: 180, padding: '0.5rem 0.8rem' }}
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select className="input-field" style={{ width: 'auto', padding: '0.5rem 0.8rem' }} value={cat} onChange={(e) => setCat(e.target.value as IssueCategory | 'all')}>
              {CATS.map((c) => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}
            </select>
            <select className="input-field" style={{ width: 'auto', padding: '0.5rem 0.8rem' }} value={status} onChange={(e) => setStatus(e.target.value as IssueStatus | 'all')}>
              {STATUSES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Issue</th>
                <th className="hide-sm">Category</th>
                <th>Severity</th>
                <th className="hide-sm">Priority</th>
                <th>Status</th>
                <th className="hide-sm">Reported</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.id} onClick={() => router.push(`/issues/${i.id}`)}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{i.title}</div>
                    <div className="tiny muted">{i.location}</div>
                  </td>
                  <td className="hide-sm">
                    <span className="pill pill-primary"><CategoryIcon category={i.category} size={12} /> {i.category}</span>
                  </td>
                  <td><SeverityBadge severity={i.severity} /></td>
                  <td className="hide-sm">
                    <span style={{ color: priorityColor(i.priority), fontWeight: 700 }}>{i.priority}</span>
                  </td>
                  <td><StatusBadge status={i.status} /></td>
                  <td className="hide-sm tiny muted">{timeAgo(i.createdAt)}</td>
                </tr>
              ))}
              {issues.length === 0 && !loading && (
                <tr><td colSpan={6} className="muted center-text" style={{ padding: '2rem' }}>No issues match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, color, bg, value, label }: { icon: React.ReactNode; color: string; bg: string; value: number | string; label: string }) {
  return (
    <div className="glass-card kpi" style={{ padding: '1.1rem' }}>
      <div className="kpi-icon" style={{ background: bg, color }}>{icon}</div>
      <div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  );
}
