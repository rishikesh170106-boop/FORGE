'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  HardHat,
  Clock,
  MapPin,
  CheckCircle2,
  Camera,
  UploadCloud,
  FileText,
  AlertTriangle,
  Play,
  Send,
  Loader2,
  Navigation,
  Sparkles,
} from 'lucide-react';
import type { WorkOrder, Issue } from '@/lib/types';
import { SeverityBadge, priorityColor } from './ui';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="panel center-text" style={{ height: 260 }}>Loading interactive map...</div>,
});

interface Props {
  initialWorkOrders: WorkOrder[];
  issues: Issue[];
  workerProfile: {
    name: string;
    departmentName?: string;
    badgeNumber?: string;
  };
}

export default function FieldWorkerPortalClient({ initialWorkOrders, issues, workerProfile }: Props) {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'map'>('active');
  const [selectedWoId, setSelectedWoId] = useState<string | null>(
    initialWorkOrders.length > 0 ? initialWorkOrders[0].id : null,
  );

  // Form states for completion submission
  const [completionNotes, setCompletionNotes] = useState('');
  const [afterPhotoPreview, setAfterPhotoPreview] = useState<string | null>(null);
  const [afterPhotoBase64, setAfterPhotoBase64] = useState<{ mimeType: string; data: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [aiResult, setAiResult] = useState<any | null>(null);

  const selectedWo = workOrders.find((w) => w.id === selectedWoId) || workOrders[0];
  const relatedIssue = selectedWo ? issues.find((i) => i.id === selectedWo.complaintId || i.workOrderId === selectedWo.id) : null;

  const activeWorkOrders = workOrders.filter((w) => w.status === 'Assigned' || w.status === 'In Progress');
  const completedWorkOrders = workOrders.filter((w) => w.status === 'Completed' || w.status === 'Verified');

  async function handleStartWork(woId: string) {
    setBusy(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'worker_start', workOrderId: woId, actorName: workerProfile.name }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to start repair');

      setWorkOrders((prev) =>
        prev.map((w) => (w.id === woId ? { ...w, status: 'In Progress', startedAt: new Date().toISOString() } : w)),
      );
      setFeedbackMsg({ type: 'success', text: 'Task accepted! Check-in recorded on site.' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error updating status' });
    } finally {
      setBusy(false);
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAfterPhotoPreview(result);
      const mime = file.type || 'image/jpeg';
      const b64 = result.split(',')[1];
      if (b64) setAfterPhotoBase64({ mimeType: mime, data: b64 });
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmitCompletion(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWo) return;
    if (!afterPhotoBase64 && !afterPhotoPreview) {
      setFeedbackMsg({ type: 'error', text: 'Please attach or capture a resolution photo proof.' });
      return;
    }

    setBusy(true);
    setFeedbackMsg(null);
    setAiResult(null);

    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'worker_submit',
          workOrderId: selectedWo.id,
          complaintId: selectedWo.complaintId,
          notes: completionNotes || 'Repairs completed on site.',
          afterPhotoUrl: afterPhotoPreview,
          afterImageBase64: afterPhotoBase64,
          actorName: workerProfile.name,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Submission failed');

      setWorkOrders((prev) =>
        prev.map((w) =>
          w.id === selectedWo.id
            ? { ...w, status: 'Completed', completionNotes, afterPhotoUrl: afterPhotoPreview || undefined }
            : w,
        ),
      );

      setAiResult(data.aiVerification);
      setFeedbackMsg({
        type: 'success',
        text: 'Work completed and submitted! Gemini AI inspection has analyzed the repair.',
      });

      setTimeout(() => {
        router.refresh();
      }, 2500);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Submission error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container narrow animate-fade-in" style={{ maxWidth: 840, paddingBottom: '4rem' }}>
      {/* Mobile-friendly Worker Header */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem', background: 'linear-gradient(135deg, rgba(217,119,6,0.08), rgba(37,99,235,0.05))' }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="logo-badge" style={{ width: 42, height: 42, borderRadius: 12, background: '#d97706', color: '#fff' }}>
              <HardHat size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 style={{ fontSize: '1.45rem', margin: 0 }}>Field Worker Portal</h1>
                <span className="badge" style={{ background: '#d97706', color: '#fff', fontSize: '0.65rem', fontWeight: 800 }}>
                  CREW APP
                </span>
              </div>
              <p className="tiny muted" style={{ margin: 0 }}>
                Technician: <strong>{workerProfile.name}</strong> · {workerProfile.departmentName || 'Field Operations'} {workerProfile.badgeNumber ? `(${workerProfile.badgeNumber})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="badge" style={{ background: 'var(--primary-tint)', color: 'var(--primary-600)', fontWeight: 700 }}>
              {activeWorkOrders.length} Active Tasks
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2" style={{ marginBottom: '1.25rem' }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setActiveTab('active')}
        >
          <HardHat size={14} /> Active Tasks ({activeWorkOrders.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setActiveTab('completed')}
        >
          <CheckCircle2 size={14} /> Completed ({completedWorkOrders.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'map' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setActiveTab('map')}
        >
          <MapPin size={14} /> Location Map
        </button>
      </div>

      {feedbackMsg && (
        <div
          style={{
            background: feedbackMsg.type === 'success' ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
            color: feedbackMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {feedbackMsg.text}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'map' ? (
        <div className="glass-card" style={{ padding: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Active Job Locations</h2>
          <MapView
            issues={issues.filter((i) => workOrders.some((w) => w.complaintId === i.id))}
            height="380px"
          />
        </div>
      ) : activeTab === 'completed' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {completedWorkOrders.map((wo) => {
            const iss = issues.find((i) => i.id === wo.complaintId);
            return (
              <div key={wo.id} className="glass-card" style={{ padding: '1.25rem' }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="badge" style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a', fontWeight: 800 }}>
                      {wo.status}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', marginTop: '0.4rem', marginBottom: '0.2rem' }}>
                      {iss?.title || wo.instructions}
                    </h3>
                    <p className="tiny muted">{iss?.location || 'Ward 101'}</p>
                  </div>
                  <span className="tiny muted font-bold">{wo.id}</span>
                </div>
                {wo.completionNotes && (
                  <p className="tiny" style={{ background: 'var(--panel)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', marginTop: '0.6rem' }}>
                    <strong>Completion Note:</strong> {wo.completionNotes}
                  </p>
                )}
              </div>
            );
          })}
          {completedWorkOrders.length === 0 && (
            <div className="glass-card center-text muted" style={{ padding: '3rem' }}>
              No completed tasks yet.
            </div>
          )}
        </div>
      ) : (
        /* Active Tasks Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Work order selector chips */}
          <div className="flex gap-2 flex-wrap" style={{ marginBottom: '0.5rem' }}>
            {activeWorkOrders.map((w) => (
              <button
                key={w.id}
                type="button"
                className={`btn btn-sm ${selectedWo?.id === w.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedWoId(w.id)}
                style={{ fontSize: '0.78rem' }}
              >
                {w.id} · {w.status}
              </button>
            ))}
          </div>

          {selectedWo ? (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div className="flex items-start justify-between gap-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="badge" style={{ background: 'rgba(217,119,6,0.15)', color: '#b45309', fontWeight: 800 }}>
                      {selectedWo.status}
                    </span>
                    <span className="tiny muted">{selectedWo.departmentName}</span>
                  </div>
                  <h2 style={{ fontSize: '1.35rem', marginTop: '0.35rem', marginBottom: '0.2rem' }}>
                    {relatedIssue?.title || selectedWo.instructions}
                  </h2>
                  <p className="tiny muted flex items-center gap-1">
                    <MapPin size={13} /> {relatedIssue?.location || 'Ward Indiranagar'}
                  </p>
                </div>
                <div className="center-text">
                  <div className="tiny muted uppercase font-bold">Target SLA</div>
                  <span className="badge" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', fontWeight: 800, marginTop: 4 }}>
                    <Clock size={11} /> {selectedWo.deadline ? new Date(selectedWo.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '24h'}
                  </span>
                </div>
              </div>

              {/* Instructions Panel */}
              <div className="panel" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
                <div className="tiny font-bold uppercase muted" style={{ marginBottom: '0.3rem' }}>
                  Supervising Officer Instructions:
                </div>
                <div className="small" style={{ lineHeight: 1.5 }}>
                  {selectedWo.instructions}
                </div>
              </div>

              {/* Photos Comparison preview */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div className="tiny font-bold uppercase muted" style={{ marginBottom: '0.4rem' }}>Original Complaint Defect</div>
                  {relatedIssue?.imageDataUrl || selectedWo.beforePhotoUrl ? (
                    <img
                      src={relatedIssue?.imageDataUrl || selectedWo.beforePhotoUrl}
                      alt="Before repair"
                      style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
                    />
                  ) : (
                    <div className="panel center-text tiny muted" style={{ height: 160, display: 'grid', placeItems: 'center' }}>
                      No photo attached
                    </div>
                  )}
                </div>

                <div>
                  <div className="tiny font-bold uppercase muted" style={{ marginBottom: '0.4rem' }}>Your Resolution Photo</div>
                  {afterPhotoPreview ? (
                    <img
                      src={afterPhotoPreview}
                      alt="After repair proof"
                      style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '2px solid var(--primary)' }}
                    />
                  ) : (
                    <label
                      style={{
                        height: 160,
                        border: '2px dashed var(--border-strong)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: '1rem',
                        textAlign: 'center',
                      }}
                    >
                      <Camera size={24} style={{ opacity: 0.5, marginBottom: '0.4rem' }} />
                      <span className="tiny font-bold">Tap to capture or upload after-photo</span>
                      <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              </div>

              {/* Action Buttons based on status */}
              {selectedWo.status === 'Assigned' && (
                <button
                  type="button"
                  className="btn btn-primary full"
                  style={{ padding: '0.85rem' }}
                  disabled={busy}
                  onClick={() => handleStartWork(selectedWo.id)}
                >
                  {busy ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
                  Accept Task &amp; Check-In On Site
                </button>
              )}

              {selectedWo.status === 'In Progress' && (
                <form onSubmit={handleSubmitCompletion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="input-group">
                    <label className="input-label"><FileText size={14} /> Repair Progress &amp; Completion Notes</label>
                    <textarea
                      className="input-field"
                      rows={3}
                      placeholder="Describe the materials used, repair steps performed, and final condition..."
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', flex: 1, justifyContent: 'center' }}>
                      <Camera size={16} /> Retake / Choose Photo
                      <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    </label>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 1.4 }}
                      disabled={busy || !afterPhotoPreview}
                    >
                      {busy ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                      Submit Fix for AI Verification
                    </button>
                  </div>
                </form>
              )}

              {/* AI Verification Results Callout */}
              {aiResult && (
                <div className="panel" style={{ marginTop: '1.25rem', background: 'rgba(37,99,235,0.05)', borderColor: 'var(--primary)' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.4rem' }}>
                    <div className="small font-bold flex items-center gap-1">
                      <Sparkles size={16} style={{ color: 'var(--primary)' }} /> Gemini Multimodal Verdict
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: aiResult.recommendation === 'APPROVE' ? 'rgba(22,163,74,0.15)' : 'rgba(217,119,6,0.15)',
                        color: aiResult.recommendation === 'APPROVE' ? '#16a34a' : '#d97706',
                        fontWeight: 800,
                      }}
                    >
                      {aiResult.recommendation} ({(aiResult.verificationConfidence * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="tiny muted" style={{ lineHeight: 1.5 }}>
                    {aiResult.explanation}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card center-text muted" style={{ padding: '3rem' }}>
              No active work orders assigned to your crew.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

