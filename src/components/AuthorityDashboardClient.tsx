'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Search,
  HardHat,
  Activity,
  Zap,
  TrendingUp,
  FileCheck,
  Eye,
  Route,
  UserCheck,
} from 'lucide-react';
import type { Issue, IssueCategory, IssueStatus, Severity } from '@/lib/types';
import { CategoryIcon, SeverityBadge, StatusBadge, priorityColor } from './ui';
import OfficerActionModal from './OfficerActionModal';
import EscalateButton from './EscalateButton';

interface Props {
  initialIssues: Issue[];
  officerProfile: {
    name: string;
    departmentName?: string;
    wardName?: string;
    badgeNumber?: string;
  };
}

export default function AuthorityDashboardClient({ initialIssues, officerProfile }: Props) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Filters
  const [wardFilter, setWardFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [sevFilter, setSevFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // Compute government dashboard KPIs
  const kpis = useMemo(() => {
    const total = issues.length;
    const resolved = issues.filter((i) => i.status === 'Resolved' || i.detailedStatus === 'CLOSED').length;
    const open = issues.filter((i) => i.status !== 'Resolved' && i.detailedStatus !== 'CLOSED');
    const newComplaints = open.filter((i) => i.status === 'Reported' || i.detailedStatus === 'SUBMITTED' || i.detailedStatus === 'ROUTED').length;
    const critical = open.filter((i) => i.severity === 'Critical').length;
    const pending = open.filter((i) => i.status === 'Acknowledged' || i.detailedStatus === 'ACCEPTED' || i.detailedStatus === 'ASSIGNED').length;
    const inProgress = open.filter((i) => i.status === 'In Progress' || i.detailedStatus === 'IN_PROGRESS' || i.detailedStatus === 'RESOLUTION_SUBMITTED').length;

    const overdue = open.filter((i) => {
      const deadline = i.resolutionDeadline
        ? new Date(i.resolutionDeadline).getTime()
        : new Date(i.createdAt).getTime() + (i.slaHours || 48) * 3600_000;
      return Date.now() > deadline;
    }).length;

    const complianceRate = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;

    return {
      total,
      newComplaints,
      critical,
      pending,
      inProgress,
      overdue,
      resolved,
      complianceRate,
    };
  }, [issues]);

  // Filtered issues
  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (wardFilter !== 'all' && i.wardName?.toLowerCase() !== wardFilter.toLowerCase()) return false;
      if (catFilter !== 'all' && i.category !== catFilter) return false;
      if (sevFilter !== 'all' && i.severity !== sevFilter) return false;
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;

      if (dateFilter === 'overdue') {
        const deadline = i.resolutionDeadline
          ? new Date(i.resolutionDeadline).getTime()
          : new Date(i.createdAt).getTime() + (i.slaHours || 48) * 3600_000;
        if (Date.now() <= deadline || i.status === 'Resolved') return false;
      } else if (dateFilter === 'today') {
        const d = new Date(i.createdAt);
        const today = new Date();
        if (d.toDateString() !== today.toDateString()) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mTitle = i.title.toLowerCase().includes(q);
        const mRef = (i.ref || i.id).toLowerCase().includes(q);
        const mLoc = i.location.toLowerCase().includes(q);
        const mWard = (i.wardName || '').toLowerCase().includes(q);
        if (!mTitle && !mRef && !mLoc && !mWard) return false;
      }

      return true;
    });
  }, [issues, wardFilter, catFilter, sevFilter, statusFilter, dateFilter, searchQuery]);

  function getSlaStatus(i: Issue) {
    const deadline = i.resolutionDeadline
      ? new Date(i.resolutionDeadline).getTime()
      : new Date(i.createdAt).getTime() + (i.slaHours || 48) * 3600_000;
    const remH = Math.round((deadline - Date.now()) / 3600_000);
    if (i.status === 'Resolved') return { text: 'Resolved', overdue: false };
    if (remH < 0) return { text: `Overdue ${Math.abs(remH)}h`, overdue: true };
    if (remH < 24) return { text: `${remH}h left`, overdue: false };
    return { text: `${Math.round(remH / 24)}d left`, overdue: false };
  }

  const wards = ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'Jayanagar', 'Malleshwaram'];
  const categories = ['Pothole', 'Streetlight', 'Water Leak', 'Garbage', 'Drainage', 'Tree / Hazard', 'Traffic Signal'];
  const severities = ['Critical', 'High', 'Medium', 'Low'];
  const statuses = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Officer Header */}
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: '1.75rem' }}>
        <div className="flex items-center gap-3">
          <span className="logo-badge" style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)' }}>
            <Building2 size={24} style={{ color: '#fff' }} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 style={{ fontSize: '1.85rem', margin: 0 }}>Authority Operations Console</h1>
              <span className="badge" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontWeight: 700 }}>
                {officerProfile.departmentName || 'Public Works'}
              </span>
            </div>
            <p className="muted small" style={{ marginTop: 2 }}>
              Signed in as <strong>{officerProfile.name}</strong> · Jurisdiction: {officerProfile.wardName || 'City Central'} {officerProfile.badgeNumber ? `(${officerProfile.badgeNumber})` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/authority/route" className="btn btn-secondary">
            <Route size={16} /> Crew Route Optimizer
          </Link>
          <EscalateButton />
        </div>
      </div>

      {/* Government Operational KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <div className="panel center-text" style={{ padding: '0.85rem 0.5rem' }}>
          <div className="tiny muted font-bold uppercase">Total Assigned</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--foreground)' }}>{kpis.total}</div>
          <div className="tiny muted">All records</div>
        </div>

        <div className="panel center-text" style={{ padding: '0.85rem 0.5rem' }}>
          <div className="tiny muted font-bold uppercase">New Complaints</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb' }}>{kpis.newComplaints}</div>
          <div className="tiny muted">Awaiting triage</div>
        </div>

        <div className="panel center-text" style={{ padding: '0.85rem 0.5rem' }}>
          <div className="tiny muted font-bold uppercase">Critical</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626' }}>{kpis.critical}</div>
          <div className="tiny muted">Priority &gt; 90</div>
        </div>

        <div className="panel center-text" style={{ padding: '0.85rem 0.5rem' }}>
          <div className="tiny muted font-bold uppercase">Pending Worker</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706' }}>{kpis.pending}</div>
          <div className="tiny muted">Accepted / queued</div>
        </div>

        <div className="panel center-text" style={{ padding: '0.85rem 0.5rem' }}>
          <div className="tiny muted font-bold uppercase">In-Progress</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7c3aed' }}>{kpis.inProgress}</div>
          <div className="tiny muted">Work order active</div>
        </div>

        <div className="panel center-text" style={{ padding: '0.85rem 0.5rem', background: kpis.overdue > 0 ? 'rgba(220,38,38,0.06)' : undefined, borderColor: kpis.overdue > 0 ? 'rgba(220,38,38,0.3)' : undefined }}>
          <div className="tiny font-bold uppercase" style={{ color: kpis.overdue > 0 ? '#dc2626' : 'var(--muted)' }}>Overdue</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: kpis.overdue > 0 ? '#dc2626' : 'var(--foreground)' }}>{kpis.overdue}</div>
          <div className="tiny muted">Breached SLA</div>
        </div>

        <div className="panel center-text" style={{ padding: '0.85rem 0.5rem' }}>
          <div className="tiny muted font-bold uppercase">Resolved</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}>{kpis.resolved}</div>
          <div className="tiny muted">Verified &amp; closed</div>
        </div>

        <div className="panel center-text" style={{ padding: '0.85rem 0.5rem' }}>
          <div className="tiny muted font-bold uppercase">SLA Compliance</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: kpis.complianceRate >= 80 ? '#16a34a' : '#d97706' }}>
            {kpis.complianceRate}%
          </div>
          <div className="tiny muted">Target: &gt;85%</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search ID, title, address, ward..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2rem' }}
            />
          </div>

          {/* Ward filter */}
          <div>
            <select className="input-field" value={wardFilter} onChange={(e) => setWardFilter(e.target.value)}>
              <option value="all">All Wards</option>
              {wards.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div>
            <select className="input-field" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Severity filter */}
          <div>
            <select className="input-field" value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
              <option value="all">All Severities</option>
              {severities.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select className="input-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Date / SLA filter */}
          <div>
            <select className="input-field" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">All Time</option>
              <option value="today">Reported Today</option>
              <option value="overdue">Overdue Only ⚠️</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaint Management Table */}
      <div className="glass-card" style={{ padding: '0.5rem' }}>
        <div className="flex items-center justify-between" style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Active Complaint Management Queue</h2>
            <div className="tiny muted">Showing {filtered.length} of {issues.length} total municipal cases</div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Complaint</th>
                <th>Ward &amp; Dept</th>
                <th>Severity / Priority</th>
                <th>SLA Countdown</th>
                <th>Assigned Field Tech</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const s = getSlaStatus(i);
                return (
                  <tr key={i.id}>
                    {/* Complaint ID & Title */}
                    <td style={{ minWidth: 220 }}>
                      <div className="flex items-center gap-2">
                        <span className="badge" style={{ fontWeight: 700, fontSize: '0.7rem' }}>
                          {i.ref || i.id}
                        </span>
                        {i.escalated && (
                          <span className="badge" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626', fontSize: '0.65rem' }}>
                            <Zap size={10} /> Escalated
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/issues/${i.id}`}
                        style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', display: 'block', marginTop: 3 }}
                      >
                        {i.title}
                      </Link>
                      <div className="tiny muted flex items-center gap-1" style={{ marginTop: 2 }}>
                        <CategoryIcon category={i.category} size={11} /> {i.category} · {i.location.split(',')[0]}
                      </div>
                    </td>

                    {/* Ward & Dept */}
                    <td className="tiny" style={{ minWidth: 140 }}>
                      <div style={{ fontWeight: 600 }}>{i.wardName || 'Central Ward'}</div>
                      <div className="muted">{i.department}</div>
                    </td>

                    {/* Severity / Priority */}
                    <td>
                      <div className="flex items-center gap-1">
                        <span style={{ color: priorityColor(i.priority), fontWeight: 800 }}>{i.priority}</span>
                        <SeverityBadge severity={i.severity} />
                      </div>
                    </td>

                    {/* SLA */}
                    <td>
                      <span
                        className="tiny"
                        style={{
                          color: s.overdue ? 'var(--danger)' : 'var(--muted)',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {s.overdue ? <AlertTriangle size={12} /> : <Clock size={12} />} {s.text}
                      </span>
                    </td>

                    {/* Assigned Personnel */}
                    <td className="tiny" style={{ minWidth: 140 }}>
                      {i.assignedWorkerName ? (
                        <div className="flex items-center gap-1">
                          <HardHat size={12} style={{ color: '#d97706' }} />
                          <span style={{ fontWeight: 600 }}>{i.assignedWorkerName.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span className="muted" style={{ fontStyle: 'italic' }}>Unassigned</span>
                      )}
                      {i.workOrderId && <div className="tiny muted">{i.workOrderId}</div>}
                    </td>

                    {/* Status badge */}
                    <td>
                      <StatusBadge status={i.status} />
                      {i.aiVerification && (
                        <div className="tiny" style={{ color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                          Evidence submitted
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedIssue(i)}
                        style={{ fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted center-text" style={{ padding: '2.5rem' }}>
                    No complaints match the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Managing Officer Actions */}
      {selectedIssue && (
        <OfficerActionModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onUpdated={() => {
            fetch('/api/workflow')
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}

