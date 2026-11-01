'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  HardHat,
  Send,
  Building2,
  Clock,
  Calendar,
  FileText,
  Eye,
  RefreshCw,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import type { Issue } from '@/lib/types';

interface OfficerActionModalProps {
  issue: Issue;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function OfficerActionModal({ issue, onClose, onUpdated }: OfficerActionModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'manage' | 'workorder' | 'reassign' | 'ai_verify'>('manage');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [workerName, setWorkerName] = useState('Ramesh Naidu (Lead Technician)');
  const [workerId, setWorkerId] = useState('demo-worker-ramesh');
  const [instructions, setInstructions] = useState(
    `Execute on-site inspection for ${issue.category} at ${issue.location}. Complete necessary repairs per municipal standards and upload photographic evidence.`,
  );
  const [deadlineHours, setDeadlineHours] = useState(issue.slaHours || 24);

  // Reassignment state
  const [newDept, setNewDept] = useState('Sanitation');
  const [reassignReason, setReassignReason] = useState('Jurisdictional transfer after site inspection.');

  // Verification state
  const [verifyNote, setVerifyNote] = useState('Repairs inspected and verified against municipal standards.');

  async function handleAction(actionPayload: any) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionPayload),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Action failed');

      setSuccess('Action executed and logged to audit trail.');
      setTimeout(() => {
        router.refresh();
        onUpdated?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setBusy(false);
    }
  }

  const workersList = [
    { id: 'demo-worker-ramesh', name: 'Ramesh Naidu (Lead Technician - Roads)', dept: 'Road Maintenance' },
    { id: 'demo-worker-suresh', name: 'Suresh Gowda (Water Line Specialist)', dept: 'Water Supply' },
    { id: 'demo-worker-manju', name: 'Manjunath (Desilting & Stormwater Lead)', dept: 'Drainage' },
    { id: 'demo-worker-krishna', name: 'Krishna Murthy (Sanitation & Waste)', dept: 'Sanitation' },
    { id: 'demo-worker-anil', name: 'Anil Kumar (Lineman - Streetlights)', dept: 'Electrical Department' },
  ];

  const deptsList = [
    'Road Maintenance',
    'Sanitation',
    'Water Supply',
    'Drainage',
    'Electrical Department',
    'Public Works',
    'Municipal Control Desk',
  ];

  const ai = issue.aiVerification;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          borderRadius: 'var(--radius-xl)',
          background: '#ffffff',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="badge" style={{ background: 'var(--primary-tint)', color: 'var(--primary-600)', fontWeight: 700 }}>
                {issue.ref || issue.id}
              </span>
              <span className="tiny muted">{issue.category} · {issue.wardName || 'Ward'}</span>
            </div>
            <h2 style={{ fontSize: '1.35rem', marginTop: '0.35rem', marginBottom: '0.2rem' }}>
              {issue.title}
            </h2>
            <p className="tiny muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={12} /> Reported {new Date(issue.createdAt).toLocaleString()} · SLA {issue.slaHours}h
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ borderRadius: 'var(--radius-full)', padding: '0.4rem' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 flex-wrap" style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${tab === 'manage' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('manage')}
          >
            <CheckCircle2 size={14} /> Quick Status
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tab === 'workorder' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('workorder')}
          >
            <HardHat size={14} /> Assign Worker & Work Order
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tab === 'reassign' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('reassign')}
          >
            <Building2 size={14} /> Reassign Dept
          </button>
          {issue.afterImageUrl && (
            <button
              type="button"
              className={`btn btn-sm ${tab === 'ai_verify' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab('ai_verify')}
              style={{ position: 'relative' }}
            >
              <Eye size={14} /> Review AI Proof
              <span style={{ width: 8, height: 8, borderRadius: 4, background: '#16a34a', display: 'inline-block', marginLeft: 4 }} />
            </button>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        {/* Tab 1: Manage Quick Status */}
        {tab === 'manage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="panel" style={{ padding: '1rem' }}>
              <div className="small font-bold" style={{ marginBottom: '0.5rem' }}>Complaint Overview</div>
              <div className="tiny muted" style={{ marginBottom: '0.75rem' }}>{issue.description || 'No description provided.'}</div>
              <div className="flex gap-4 flex-wrap tiny">
                <div><strong>Location:</strong> {issue.location}</div>
                <div><strong>Priority:</strong> {issue.priority} / 100</div>
                <div><strong>Current Lifecycle:</strong> <span className="badge">{issue.detailedStatus || issue.status}</span></div>
                {issue.assignedOfficerName && <div><strong>Officer:</strong> {issue.assignedOfficerName}</div>}
                {issue.assignedWorkerName && <div><strong>Field Tech:</strong> {issue.assignedWorkerName}</div>}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || issue.detailedStatus === 'ACCEPTED' || issue.status === 'Resolved'}
                onClick={() => handleAction({ action: 'accept', complaintId: issue.id })}
              >
                {busy ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                Formally Accept Complaint
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => setTab('workorder')}
              >
                <HardHat size={16} /> Dispatch Field Worker
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Assign Worker & Create Work Order */}
        {tab === 'workorder' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label"><HardHat size={14} /> Assign Field Technician</label>
              <select
                className="input-field"
                value={workerName}
                onChange={(e) => {
                  setWorkerName(e.target.value);
                  const found = workersList.find((w) => w.name === e.target.value);
                  if (found) setWorkerId(found.id);
                }}
              >
                {workersList.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name} — {w.dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label"><Clock size={14} /> Resolution Deadline (Hours from now)</label>
              <input
                type="number"
                className="input-field"
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(Number(e.target.value))}
                min={2}
                max={336}
              />
            </div>

            <div className="input-group">
              <label className="input-label"><FileText size={14} /> Technical Field Instructions</label>
              <textarea
                className="input-field"
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary full"
              disabled={busy}
              onClick={() =>
                handleAction({
                  action: 'assign_worker',
                  complaintId: issue.id,
                  workerId,
                  workerName,
                  instructions,
                  deadlineHours,
                })
              }
            >
              {busy ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              Generate Official Work Order & Dispatch
            </button>
          </div>
        )}

        {/* Tab 3: Reassign Department */}
        {tab === 'reassign' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label"><Building2 size={14} /> Target Municipal Department</label>
              <select
                className="input-field"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
              >
                {deptsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label"><FileText size={14} /> Reassignment Reason / Justification</label>
              <textarea
                className="input-field"
                rows={3}
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="State why this complaint falls under the chosen department's jurisdiction..."
              />
            </div>

            <button
              type="button"
              className="btn btn-primary full"
              disabled={busy || !newDept}
              onClick={() =>
                handleAction({
                  action: 'reassign',
                  complaintId: issue.id,
                  newDepartment: newDept,
                  reason: reassignReason,
                })
              }
            >
              {busy ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Confirm Department Reassignment
            </button>
          </div>
        )}

        {/* Tab 4: AI Resolution Verification & Sign-off */}
        {tab === 'ai_verify' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div className="tiny font-bold uppercase muted" style={{ marginBottom: '0.4rem' }}>Original Citizen Photo</div>
                {issue.imageDataUrl ? (
                  <img
                    src={issue.imageDataUrl}
                    alt="Original reported issue"
                    style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
                  />
                ) : (
                  <div className="panel center-text" style={{ height: 180, display: 'grid', placeItems: 'center' }}>No original photo</div>
                )}
              </div>
              <div>
                <div className="tiny font-bold uppercase muted" style={{ marginBottom: '0.4rem' }}>Field Worker After-Photo</div>
                {issue.afterImageUrl ? (
                  <img
                    src={issue.afterImageUrl}
                    alt="After repair proof"
                    style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
                  />
                ) : (
                  <div className="panel center-text" style={{ height: 180, display: 'grid', placeItems: 'center' }}>No after-photo yet</div>
                )}
              </div>
            </div>

            {/* AI Verification Analysis Card */}
            {ai ? (
              <div className="panel" style={{ background: 'rgba(37,99,235,0.04)', borderColor: 'rgba(37,99,235,0.2)' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                  <div className="small font-bold flex items-center gap-2">
                    <span>Gemini Vision Multimodal Verification</span>
                  </div>
                  <span
                    className="badge"
                    style={{
                      background: ai.recommendation === 'APPROVE' ? 'rgba(22,163,74,0.15)' : 'rgba(217,119,6,0.15)',
                      color: ai.recommendation === 'APPROVE' ? '#16a34a' : '#d97706',
                      fontWeight: 800,
                    }}
                  >
                    AI Recommendation: {ai.recommendation} ({(ai.verificationConfidence * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="tiny muted" style={{ lineHeight: 1.5, marginBottom: '0.5rem' }}>
                  <strong>Identified Defect:</strong> {ai.issueIdentifiedInOriginal}
                </div>
                <div className="tiny muted" style={{ lineHeight: 1.5, marginBottom: '0.5rem' }}>
                  <strong>Residual Damage:</strong> {ai.remainingVisibleDamage}
                </div>
                <div className="tiny" style={{ color: 'var(--foreground)', fontStyle: 'italic' }}>
                  &ldquo;{ai.explanation}&rdquo;
                </div>
              </div>
            ) : (
              <div className="panel tiny muted">
                Field worker submitted resolution proof. Officer inspection required before final approval.
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Officer Inspection Note</label>
              <input
                className="input-field"
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
                placeholder="Official sign-off comments..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, background: '#16a34a' }}
                disabled={busy}
                onClick={() =>
                  handleAction({
                    action: 'officer_verify',
                    complaintId: issue.id,
                    approved: true,
                    note: verifyNote,
                  })
                }
              >
                {busy ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                Verify & Approve Resolution
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ color: 'var(--danger)' }}
                disabled={busy}
                onClick={() =>
                  handleAction({
                    action: 'officer_verify',
                    complaintId: issue.id,
                    approved: false,
                    note: verifyNote || 'Rework requested by department officer.',
                  })
                }
              >
                <AlertTriangle size={16} /> Reject Proof / Request Rework
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

