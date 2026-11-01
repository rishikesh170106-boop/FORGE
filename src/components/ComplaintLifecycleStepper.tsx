'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Check,
  Send,
  Loader2,
  ThumbsUp,
} from 'lucide-react';
import type { DetailedComplaintStatus, Issue } from '@/lib/types';

interface Props {
  issue: Issue;
  currentRole?: string;
}

const LIFECYCLE_STAGES: { key: DetailedComplaintStatus; label: string; step: number }[] = [
  { key: 'SUBMITTED', label: 'Reported', step: 1 },
  { key: 'AI_ANALYZED', label: 'AI Triage', step: 2 },
  { key: 'ROUTED', label: 'Dept Routed', step: 3 },
  { key: 'ACCEPTED', label: 'Officer Accepted', step: 4 },
  { key: 'ASSIGNED', label: 'Crew Dispatched', step: 5 },
  { key: 'IN_PROGRESS', label: 'Work Underway', step: 6 },
  { key: 'RESOLUTION_SUBMITTED', label: 'Fix Submitted', step: 7 },
  { key: 'VERIFIED', label: 'Officer Verified', step: 8 },
  { key: 'CLOSED', label: 'Citizen Confirmed', step: 9 },
];

export default function ComplaintLifecycleStepper({ issue, currentRole }: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const status = issue.detailedStatus || (issue.status === 'Resolved' ? 'CLOSED' : 'SUBMITTED');

  // Determine active step index (0-based)
  const currentStageIndex = LIFECYCLE_STAGES.findIndex((s) => s.key === status);
  const effectiveIndex = currentStageIndex >= 0 ? currentStageIndex : issue.status === 'Resolved' ? 8 : 2;

  const isEscalated = issue.escalated || status === 'ESCALATED';
  const isReopened = status === 'REOPENED';
  const isRejected = status === 'REJECTED';

  async function handleCitizenConfirmation(confirmed: boolean) {
    setBusy(true);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'citizen_confirm',
          complaintId: issue.id,
          confirmed,
          feedback,
          actorName: 'Reporting Citizen',
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed');

      setActionSuccess(confirmed ? 'Thank you! Issue officially closed.' : 'Dispute logged. Complaint reopened.');
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setBusy(false);
      setShowFeedbackModal(false);
    }
  }

  return (
    <div className="glass-card" style={{ padding: '1.25rem', marginTop: '1.25rem' }}>
      <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '1rem' }}>
        <div className="tiny uppercase font-bold" style={{ color: 'var(--primary-600)', letterSpacing: '0.05em' }}>
          Government-to-Citizen Resolution Workflow
        </div>
        <div className="flex items-center gap-2">
          {isEscalated && (
            <span className="badge" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626', fontWeight: 800 }}>
              <AlertTriangle size={12} /> SLA ESCALATED
            </span>
          )}
          {isReopened && (
            <span className="badge" style={{ background: 'rgba(217,119,6,0.15)', color: '#b45309', fontWeight: 800 }}>
              <RotateCcw size={12} /> REOPENED BY CITIZEN
            </span>
          )}
          {isRejected && (
            <span className="badge" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626', fontWeight: 800 }}>
              REJECTED
            </span>
          )}
          <span className="badge font-bold" style={{ background: 'var(--primary-tint)', color: 'var(--primary-600)' }}>
            Stage {effectiveIndex + 1} of 9: {status}
          </span>
        </div>
      </div>

      {/* Horizontal Stepper Line */}
      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 640 }}>
          {LIFECYCLE_STAGES.map((s, idx) => {
            const isDone = idx < effectiveIndex || (idx === 8 && status === 'CLOSED');
            const isCurrent = idx === effectiveIndex && status !== 'CLOSED';
            const isUpcoming = idx > effectiveIndex;

            return (
              <div key={s.key} style={{ flex: 1, position: 'relative', textAlign: 'center' }}>
                {/* Connector line */}
                {idx > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 13,
                      left: '-50%',
                      right: '50%',
                      height: 3,
                      background: isDone || isCurrent ? 'var(--primary)' : 'var(--border)',
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Step circle */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    margin: '0 auto',
                    position: 'relative',
                    zIndex: 2,
                    display: 'grid',
                    placeItems: 'center',
                    background: isDone ? '#16a34a' : isCurrent ? 'var(--primary)' : 'var(--surface-solid)',
                    color: isDone || isCurrent ? '#fff' : 'var(--muted)',
                    border: isUpcoming ? '2px solid var(--border)' : 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    boxShadow: isCurrent ? '0 0 0 4px rgba(37,99,235,0.15)' : 'none',
                  }}
                >
                  {isDone ? <Check size={14} /> : s.step}
                </div>

                <div
                  className="tiny"
                  style={{
                    marginTop: 6,
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? 'var(--primary)' : isDone ? 'var(--foreground)' : 'var(--muted)',
                    whiteSpace: 'nowrap',
                    fontSize: '0.7rem',
                  }}
                >
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Citizen Resolution Confirmation Card */}
      {(issue.status === 'Resolved' || status === 'VERIFIED') && status !== 'CLOSED' && (
        <div
          className="panel"
          style={{
            background: 'linear-gradient(135deg, rgba(22,163,74,0.08), rgba(37,99,235,0.05))',
            borderColor: '#16a34a',
            padding: '1.25rem',
            marginTop: '1rem',
          }}
        >
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="small font-bold flex items-center gap-2" style={{ color: '#15803d' }}>
                <ShieldCheck size={18} /> Official Resolution Completed
              </div>
              <p className="tiny muted" style={{ marginTop: 2, marginBottom: '0.75rem' }}>
                The authority officer has verified the repairs. As the reporting citizen or local resident, please confirm the fix or request a review.
              </p>
            </div>
            {actionSuccess && (
              <span className="badge" style={{ background: '#16a34a', color: '#fff', fontWeight: 700 }}>
                {actionSuccess}
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#16a34a' }}
              disabled={busy}
              onClick={() => handleCitizenConfirmation(true)}
            >
              {busy ? <Loader2 size={16} className="spin" /> : <ThumbsUp size={16} />}
              Confirm Resolution (Close Case)
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => setShowFeedbackModal(true)}
            >
              <RotateCcw size={16} /> Dispute / Reopen Issue
            </button>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showFeedbackModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div className="glass-card" style={{ maxWidth: 460, width: '100%', padding: '1.5rem', background: '#fff' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Dispute / Reopen Complaint</h3>
            <p className="tiny muted" style={{ marginBottom: '1rem' }}>
              Explain what remains broken or unsatisfactory so the supervisor can reassign the crew.
            </p>
            <div className="input-group">
              <textarea
                className="input-field"
                rows={3}
                placeholder="E.g. Asphalt pothole filled with loose gravel that has already washed away..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2 justify-end" style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowFeedbackModal(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#dc2626' }}
                disabled={busy || !feedback.trim()}
                onClick={() => handleCitizenConfirmation(false)}
              >
                {busy ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                Submit Dispute &amp; Reopen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

