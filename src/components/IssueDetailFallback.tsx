'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Building2,
  FileCheck2,
  ShieldAlert,
  ThumbsUp,
  Clock,
  User,
  ArrowLeft,
  Layers,
  CheckCircle2,
  Search,
  Loader2,
} from 'lucide-react';
import type { Issue } from '@/lib/types';
import MapView from '@/components/MapView';
import IssueActions from '@/components/IssueActions';
import ResolveWithProof from '@/components/ResolveWithProof';
import Comments from '@/components/Comments';
import OfficialLetter from '@/components/OfficialLetter';
import CouncilPanel from '@/components/CouncilPanel';
import ShareButton from '@/components/ShareButton';
import ComplaintLifecycleStepper from '@/components/ComplaintLifecycleStepper';
import {
  CategoryIcon,
  SeverityBadge,
  StatusBadge,
  priorityColor,
  statusClass,
  timeAgo,
} from '@/components/ui';

function slaText(hours: number): string {
  if (hours < 24) return `${hours} hours`;
  const d = Math.round(hours / 24);
  return `${d} day${d > 1 ? 's' : ''}`;
}

export default function IssueDetailFallback({ id }: { id: string }) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check local storage for direct match
    try {
      const direct = localStorage.getItem(`ch_issue_${id}`);
      if (direct) {
        const parsed = JSON.parse(direct) as Issue;
        setIssue(parsed);
        setLoading(false);
        // Sync with server in background
        fetch('/api/issues/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        }).catch(() => {});
        return;
      }

      // 2. Search local issues list
      const rawList = localStorage.getItem('ch_local_issues');
      if (rawList) {
        const list = JSON.parse(rawList) as Issue[];
        const found = list.find(
          (i) => i.id === id || i.ref === id || i.workOrderId === id,
        );
        if (found) {
          setIssue(found);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
    }

    // 3. Fallback: try fetching from API
    fetch(`/api/issues/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.issue) {
          setIssue(data.issue);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="container narrow center-text animate-fade-in" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
        <h2>Loading issue #{id}...</h2>
        <p className="muted small">Retrieving civic report and telemetry from municipal node...</p>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="container narrow animate-fade-in" style={{ paddingTop: '3rem' }}>
        <Link href="/dashboard" className="link flex items-center gap-1 tiny" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <div className="glass-card center-text" style={{ padding: '3rem 1.5rem' }}>
          <div className="kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', margin: '0 auto 1rem' }}>
            <Search size={28} />
          </div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Issue Not Found</h1>
          <p className="muted small" style={{ maxWidth: 440, margin: '0 auto 1.5rem' }}>
            Could not find issue reference <code className="mono">{id}</code>. It may have been filed in an earlier server session or is still processing.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/report-issue" className="btn btn-primary">
              Report an Issue
            </Link>
            <Link href="/dashboard" className="btn btn-secondary">
              View All Issues
            </Link>
            <Link href="/civic-map" className="btn btn-ghost">
              Open Civic Map
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const disputes = issue.disputes ?? 0;

  return (
    <div className="container narrow animate-fade-in">
      <Link href="/dashboard" className="link flex items-center gap-1 tiny" style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <div className="glass-card">
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '0.75rem' }}>
          <span className="pill pill-primary">
            <CategoryIcon category={issue.category} size={13} /> {issue.category}
          </span>
          <span className="mono tiny muted">{issue.ref ?? issue.id} · {issue.workOrderId}</span>
        </div>

        <h1 style={{ fontSize: '1.8rem' }}>{issue.title}</h1>
        <div className="flex items-center gap-2 flex-wrap" style={{ margin: '0.75rem 0 1.25rem' }}>
          <SeverityBadge severity={issue.severity} />
          <StatusBadge status={issue.status} />
          <span className="tag">{Math.round((issue.confidence ?? 0.85) * 100)}% AI confidence</span>
          {disputes >= 3 && (
            <span className="badge" style={{ background: 'rgba(217,119,6,0.12)', color: '#b45309' }}>
              <ShieldAlert size={12} /> Under community review
            </span>
          )}
          {issue.tags?.includes('pii-minimized') && (
            <span className="badge" style={{ background: 'rgba(8,145,178,0.12)', color: '#0891b2' }}>
              <ShieldAlert size={12} /> Privacy shield: PII flagged
            </span>
          )}
          <span className="tiny muted flex items-center gap-1"><MapPin size={12} /> {issue.location}</span>
        </div>

        <div className="two-col">
          <div>
            {issue.imageDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={issue.imageDataUrl}
                alt={issue.title}
                style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: '1rem', maxHeight: 280, objectFit: 'cover' }}
              />
            )}
            <p className="muted small">{issue.description}</p>

            <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: '1rem' }}>
              {(issue.tags ?? []).map((t) => <span key={t} className="tag">#{t}</span>)}
            </div>

            <div style={{ margin: '1.25rem 0 0.4rem' }} className="flex items-center justify-between tiny muted">
              <span>Priority score</span>
              <strong style={{ color: priorityColor(issue.priority) }}>{issue.priority}/100</strong>
            </div>
            <div className="meter">
              <span style={{ width: `${issue.priority}%`, background: priorityColor(issue.priority) }} />
            </div>

            {issue.safetyRisk && (
              <p className="tiny" style={{ marginTop: '1rem', color: '#dc2626' }}>
                <ShieldAlert size={13} style={{ verticalAlign: '-2px' }} /> {issue.safetyRisk}
              </p>
            )}
          </div>

          <div>
            <div className="panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <Row icon={<Building2 size={15} />} label="Department" value={issue.department} />
              <Row icon={<FileCheck2 size={15} />} label="SLA target" value={slaText(issue.slaHours || 48)} />
              <Row icon={<User size={15} />} label="Reported by" value={issue.reporter} />
              <Row
                icon={<ThumbsUp size={15} />}
                label="Community consensus"
                value={`${issue.verifications || 1} verify · ${disputes} dispute`}
              />
              <Row icon={<Clock size={15} />} label="Reported" value={timeAgo(issue.createdAt)} />
            </div>
            {issue.duplicateOf && (
              <p className="tiny muted" style={{ marginBottom: '1rem' }}>
                <Layers size={12} style={{ verticalAlign: '-2px' }} /> Linked to{' '}
                <Link className="link" href={`/issues/${issue.duplicateOf}`}>{issue.duplicateOf}</Link>
              </p>
            )}
            <div className="flex gap-2 flex-wrap items-center">
              <IssueActions id={issue.id} />
              <ShareButton
                title={`${issue.title} — Community Hero`}
                text={`${issue.category} at ${issue.location} needs fixing — priority ${issue.priority}/100.`}
              />
              {issue.status !== 'Resolved' && <ResolveWithProof id={issue.id} />}
            </div>
          </div>
        </div>

        {issue.advisory && (
          <div className="panel" style={{ padding: '1rem', marginTop: '1.25rem' }}>
            <div className="tiny" style={{ color: '#7c3aed', fontWeight: 700, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Agent advisory
            </div>
            <p className="small">{issue.advisory}</p>
          </div>
        )}

        <CouncilPanel id={issue.id} />
        <OfficialLetter id={issue.id} slaBreached={false} />
      </div>

      {/* 9-Stage Government-to-Citizen Resolution Workflow */}
      <ComplaintLifecycleStepper issue={issue} />

      {/* Timeline + map */}
      <div className="two-col" style={{ marginTop: '1.5rem' }}>
        <div className="glass-card">
          <div className="section-title">
            <Clock size={18} color="#7c3aed" />
            <h2 style={{ fontSize: '1.1rem' }}>Resolution timeline</h2>
          </div>
          <div className="timeline">
            {(issue.timeline ?? []).map((ev, i) => (
              <div key={i} className={`tl-step ${i === (issue.timeline?.length ?? 1) - 1 ? 'running' : 'done'}`}>
                <div className="tl-icon">
                  <span className={`badge ${statusClass(ev.status as any)}`} style={{ padding: 4 }}>
                    <span className="dot" style={{ background: 'currentColor' }} />
                  </span>
                </div>
                <div className="tl-body">
                  <div className="tl-title">{ev.status}</div>
                  <div className="tl-detail">{ev.note}</div>
                  <div className="tiny muted" style={{ marginTop: '0.2rem' }}>{ev.actor} · {timeAgo(ev.at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <div className="section-title">
            <MapPin size={18} color="#7c3aed" />
            <h2 style={{ fontSize: '1.1rem' }}>Location</h2>
          </div>
          <MapView issues={[issue]} activeId={issue.id} />
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <Comments issueId={issue.id} />
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '0.4rem 0' }}>
      <span className="tiny muted flex items-center gap-2">{icon} {label}</span>
      <span className="small" style={{ color: 'var(--foreground)', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
