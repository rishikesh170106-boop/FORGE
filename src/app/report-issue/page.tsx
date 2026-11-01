'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  Loader2,
  Crosshair,
  CheckCircle2,
  Camera,
  MapPin,
  Building2,
  FileCheck2,
  ShieldAlert,
  ArrowRight,
  Layers,
  Bot,
  LogIn,
  Mic,
} from 'lucide-react';
import AgentTimeline from '@/components/AgentTimeline';
import LocationInput from '@/components/LocationInput';
import { CategoryIcon, SeverityBadge, priorityColor } from '@/components/ui';
import { useSession } from '@/lib/useSession';
import { supabaseEnabled } from '@/lib/config';
import { toast } from '@/lib/toast';
import type { AgentStep, Issue } from '@/lib/types';

export default function ReportIssuePage() {
  const { profile, loading: authLoading } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [language, setLanguage] = useState('English');
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    setVoiceSupported(
      typeof window !== 'undefined' &&
        Boolean((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition),
    );
  }, []);

  const LANG_CODE: Record<string, string> = {
    English: 'en-IN', Hindi: 'hi-IN', Kannada: 'kn-IN', Tamil: 'ta-IN',
    Telugu: 'te-IN', Marathi: 'mr-IN', Bengali: 'bn-IN',
  };

  function startVoice() {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = LANG_CODE[language] ?? 'en-IN';
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    rec.start();
  }

  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [result, setResult] = useState<Issue | null>(null);
  const [running, setRunning] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fast client-side image compression to optimize Gemini Vision latency
  function compressImage(f: File): Promise<File> {
    return new Promise((resolve) => {
      if (f.size < 300 * 1024) return resolve(f);
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDim = 1024;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(f);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < f.size) {
                const compressed = new File([blob], f.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                });
                resolve(compressed);
              } else {
                resolve(f);
              }
            },
            'image/jpeg',
            0.8
          );
        };
        img.onerror = () => resolve(f);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(f);
      reader.readAsDataURL(f);
    });
  }

  async function onFile(f: File | null) {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    const optimized = await compressImage(f);
    setFile(optimized);
  }

  function appeal() {
    submit(undefined, true);
  }

  async function submit(e?: React.FormEvent, isAppeal = false) {
    e?.preventDefault();
    if (!file || running) return;
    setRunning(true);
    setSteps([]);
    setResult(null);
    setWarning(null);
    setRejected(false);

    const fd = new FormData();
    fd.append('image', file);
    fd.append('location', location);
    fd.append('notes', notes);
    fd.append('language', language);
    if (isAppeal) fd.append('appeal', '1');
    if (coords) {
      fd.append('lat', String(coords.lat));
      fd.append('lng', String(coords.lng));
    }
    if (profile?.id) {
      fd.append('reporterId', profile.id);
    }
    if (profile?.name) {
      fd.append('reporter', profile.name);
    }

    try {
      const res = await fetch('/api/triage', { method: 'POST', body: fd });
      if (!res.body) throw new Error('No response stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          handleEvent(JSON.parse(line));
        }
      }
      if (buffer.trim()) handleEvent(JSON.parse(buffer));
    } catch (err) {
      setWarning(`Something went wrong: ${String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  function handleEvent(ev: {
    type: string;
    step?: AgentStep;
    issue?: Issue;
    warning?: string;
    message?: string;
  }) {
    if (ev.type === 'step' && ev.step) {
      setSteps((prev) => {
        if (ev.step!.status === 'done') {
          const idx = [...prev]
            .reverse()
            .findIndex((s) => s.status === 'running' && s.tool === ev.step!.tool);
          if (idx !== -1) {
            const realIdx = prev.length - 1 - idx;
            const copy = [...prev];
            copy[realIdx] = ev.step!;
            return copy;
          }
        }
        return [...prev, ev.step!];
      });
    } else if (ev.type === 'result' && ev.issue) {
      setResult(ev.issue);
      if (ev.warning) setWarning(ev.warning);
      toast(`Filed ${ev.issue.workOrderId} · routed to ${ev.issue.department}`, 'success');
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(`ch_issue_${ev.issue.id}`, JSON.stringify(ev.issue));
          if (ev.issue.ref) localStorage.setItem(`ch_issue_${ev.issue.ref}`, JSON.stringify(ev.issue));
          if (ev.issue.workOrderId) localStorage.setItem(`ch_issue_${ev.issue.workOrderId}`, JSON.stringify(ev.issue));
          const raw = localStorage.getItem('ch_local_issues');
          const list = raw ? JSON.parse(raw) : [];
          list.unshift(ev.issue);
          localStorage.setItem('ch_local_issues', JSON.stringify(list.slice(0, 50)));
          window.dispatchEvent(new Event('ch-auth-change'));
        }
      } catch (e) {
        console.warn('Local caching error:', e);
      }
    } else if (ev.type === 'rejected') {
      setWarning(ev.message ?? "That photo doesn't look like a community issue.");
      setRejected(true);
      toast('Photo not accepted — not a community issue.', 'error');
    } else if (ev.type === 'error') {
      setWarning(ev.message ?? 'Agent error');
      toast('The agent hit an error — please try again.', 'error');
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setSteps([]);
    setWarning(null);
    setRejected(false);
    setNotes('');
  }

  if (supabaseEnabled() && !authLoading && !profile) {
    return (
      <div className="container narrow center-text animate-fade-in" style={{ paddingTop: '2rem' }}>
        <span className="logo-badge" style={{ width: 48, height: 48, margin: '0 auto 1rem', borderRadius: 13 }}>
          <Camera size={24} />
        </span>
        <h1>Sign in to report</h1>
        <p className="muted" style={{ maxWidth: 460, margin: '0.5rem auto 1.5rem' }}>
          Reporting an issue is tied to your account so you earn points, track its
          progress, and the right department knows who to follow up with.
        </p>
        <Link href="/authentication?next=/report-issue" className="btn btn-primary"><LogIn size={16} /> Sign in to continue</Link>
      </div>
    );
  }

  return (
    <div className="container narrow animate-fade-in">
      <div className="center-text" style={{ marginBottom: '2rem' }}>
        <span className="eyebrow">
          <Bot size={14} /> CIVIC SENSE · AI Triage Agent
        </span>
        <h1 style={{ marginTop: '1rem' }}>Report a Civic Issue</h1>
        <p className="muted" style={{ maxWidth: 560, margin: '0.5rem auto 0' }}>
          Upload a photo. Watch the CIVIC SENSE AI agent classify, route, and file it in
          real time with full accountability.
        </p>
      </div>

      <div className="split">
        {/* Form */}
        <form className="glass-card" onSubmit={submit}>
          <div className="input-group">
            <label className="input-label">
              <Camera size={15} /> Issue photo
            </label>
            <div
              className="dropzone"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFile(e.dataTransfer.files?.[0] ?? null);
              }}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="preview"
                  style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 'var(--radius-md)' }}
                />
              ) : (
                <div className="flex-col items-center gap-2 muted">
                  <UploadCloud size={42} color="var(--primary)" />
                  <p style={{ color: 'var(--foreground)', fontWeight: 600 }}>Click, drop, or capture a photo</p>
                  <p className="tiny">PNG / JPG · AI analyzes evidence directly</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">
              <MapPin size={15} /> Location
            </label>
            <LocationInput
              location={location}
              setLocation={setLocation}
              onLocationFound={setCoords}
              coords={coords}
            />
            {coords && (
              <span className="tiny" style={{ color: '#15803d', marginTop: '0.25rem', display: 'block' }}>
                ✓ Pinned at {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
            )}
          </div>

          <div className="input-group">
            <label className="input-label" style={{ justifyContent: 'space-between' }}>
              <span>Notes (optional)</span>
              {voiceSupported && (
                <button
                  type="button"
                  onClick={startVoice}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '0.2rem 0.6rem', color: listening ? 'var(--danger)' : 'var(--primary-600)' }}
                  disabled={listening}
                >
                  <Mic size={13} /> {listening ? 'Listening…' : 'Speak'}
                </button>
              )}
            </label>
            <textarea
              className="input-field"
              placeholder="Type, or tap Speak to dictate…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">🌐 Language</label>
            <select className="input-field" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Marathi', 'Bengali'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <span className="tiny muted">The AI writes your report &amp; advisory in this language.</span>
          </div>

          <button
            type="submit"
            className="btn btn-primary full"
            disabled={!file || running}
          >
            {running ? (
              <>
                <Loader2 size={18} className="spin" /> Agent is analyzing…
              </>
            ) : (
              <>
                <Bot size={18} /> Triage with AI agent
              </>
            )}
          </button>
        </form>

        {/* Agent panel */}
        <div className="glass-card">
          {steps.length === 0 && !result ? (
            <div className="flex-col items-center justify-center muted" style={{ height: '100%', minHeight: 260, textAlign: 'center', gap: '0.75rem' }}>
              <div className="kpi-icon" style={{ background: 'var(--primary-tint)', color: 'var(--primary)' }}>
                <Layers size={24} />
              </div>
              <p>The agent&apos;s reasoning will stream here, step by step.</p>
            </div>
          ) : (
            <>
              <div className="section-title">
                <Bot size={18} color="var(--primary)" />
                <h2 style={{ fontSize: '1.1rem' }}>
                  {running ? 'Agent working…' : 'Agent transcript'}
                </h2>
              </div>
              <AgentTimeline steps={steps} />
            </>
          )}
        </div>
      </div>

      {warning && (
        <div
          className="glass-card animate-rise"
          style={{ marginTop: '1.5rem', borderColor: 'rgba(251,191,36,0.3)' }}
        >
          <div className="flex items-center gap-2" style={{ color: '#b45309' }}>
            <ShieldAlert size={18} /> {warning}
          </div>
          {rejected && !running && (
            <div style={{ marginTop: '0.85rem' }}>
              <button className="btn btn-secondary" onClick={appeal} disabled={running}>
                <ShieldAlert size={15} /> Appeal — request human review
              </button>
              <p className="tiny muted" style={{ marginTop: '0.4rem' }}>
                The AI&apos;s verdict is never final. Appealing files the report at a capped
                priority for an authority to review.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="glass-card animate-rise" style={{ marginTop: '1.5rem' }}>
          <div className="flex items-center gap-2" style={{ color: '#15803d', marginBottom: '1.25rem' }}>
            <CheckCircle2 size={22} />
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#15803d' }}>
              Filed · {result.workOrderId}
            </h2>
          </div>

          <div className="two-col">
            <div>
              <h3 style={{ fontSize: '1.2rem' }}>{result.title}</h3>
              <div className="flex items-center gap-2 flex-wrap" style={{ margin: '0.6rem 0 1rem' }}>
                <span className="pill pill-primary">
                  <CategoryIcon category={result.category} size={13} /> {result.category}
                </span>
                <SeverityBadge severity={result.severity} />
                <span className="tag">{Math.round(result.confidence * 100)}% confidence</span>
              </div>
              <p className="muted small">{result.description}</p>

              <div style={{ margin: '1rem 0 0.4rem' }} className="flex items-center justify-between tiny muted">
                <span>Priority</span>
                <strong style={{ color: priorityColor(result.priority) }}>{result.priority}/100</strong>
              </div>
              <div className="meter">
                <span style={{ width: `${result.priority}%`, background: priorityColor(result.priority) }} />
              </div>

              {result.safetyRisk && (
                <p className="tiny" style={{ marginTop: '1rem', color: '#dc2626' }}>
                  <ShieldAlert size={13} style={{ verticalAlign: '-2px' }} /> {result.safetyRisk}
                </p>
              )}
            </div>

            <div>
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="reported"
                  style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: '1rem', maxHeight: 160, objectFit: 'cover' }}
                />
              )}
              <div className="panel" style={{ padding: '1rem' }}>
                <div className="flex items-center gap-2 small" style={{ color: 'var(--foreground)', marginBottom: '0.5rem' }}>
                  <Building2 size={15} color="var(--primary)" /> {result.department}
                </div>
                <div className="tiny muted flex items-center gap-1" style={{ marginBottom: '0.5rem' }}>
                  <MapPin size={12} /> {result.location}
                </div>
                <div className="tiny muted flex items-center gap-1">
                  <FileCheck2 size={12} /> SLA {slaText(result.slaHours)}
                </div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ padding: '1rem', marginTop: '1.25rem' }}>
            <div className="tiny" style={{ color: 'var(--primary)', fontWeight: 700, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Agent advisory
            </div>
            <p className="small">{result.advisory}</p>
          </div>

          {result.duplicateOf && (
            <p className="tiny muted" style={{ marginTop: '0.85rem' }}>
              <Layers size={12} style={{ verticalAlign: '-2px' }} /> Linked to nearby
              report <Link className="link" href={`/issues/${result.duplicateOf}`}>{result.duplicateOf}</Link> for a stronger signal.
            </p>
          )}

          <div className="flex gap-3 flex-wrap" style={{ marginTop: '1.5rem' }}>
            <Link href={`/issues/${result.id}`} className="btn btn-primary">
              Track this issue <ArrowRight size={16} />
            </Link>
            <Link href="/civic-map" className="btn btn-secondary">
              <MapPin size={16} /> See on map
            </Link>
            <button className="btn btn-ghost" onClick={reset}>
              Report another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function slaText(hours: number): string {
  if (hours < 24) return `${hours} hours`;
  const d = Math.round(hours / 24);
  return `${d} day${d > 1 ? 's' : ''}`;
}

