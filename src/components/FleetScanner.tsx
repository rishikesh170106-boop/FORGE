'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Video,
  Loader2,
  ScanSearch,
  CheckCircle2,
  Link2,
  FileCheck2,
  CircleSlash,
  Truck,
  Upload,
} from 'lucide-react';
import { LOCALITIES } from '@/lib/geo';
import { toast } from '@/lib/toast';
import { SeverityBadge } from '@/components/ui';
import type { GeoPoint, Severity } from '@/lib/types';

// ---------------------------------------------------------------------------
// Fleet Watch client: samples frames from a dashcam video, interpolates GPS
// along the vehicle's route, and streams each frame through Gemini Vision.
// Confident detections are auto-filed as geo-tagged civic reports — passive
// crowdsourcing with zero citizen effort.
// ---------------------------------------------------------------------------

type FrameStatus = 'pending' | 'scanning' | 'clear' | 'filed' | 'linked' | 'skipped';

interface Frame {
  t: number;
  dataUrl: string;
  geo: GeoPoint;
  status: FrameStatus;
  detail?: string;
  severity?: Severity;
  issue?: { id: string; ref: string };
}

const MAX_FRAMES = 8;
const FRAME_WIDTH = 640;

function lerp(a: GeoPoint, b: GeoPoint, f: number): GeoPoint {
  return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
}

async function extractFrames(file: File, start: GeoPoint, end: GeoPoint): Promise<Frame[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Could not read the video'));
  });

  const duration = video.duration;
  const n = Math.min(MAX_FRAMES, Math.max(3, Math.floor(duration)));
  const canvas = document.createElement('canvas');
  const scale = FRAME_WIDTH / video.videoWidth;
  canvas.width = FRAME_WIDTH;
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext('2d')!;

  const frames: Frame[] = [];
  for (let i = 0; i < n; i++) {
    // skip the very start/end (garage, parking) and spread evenly through the drive
    const f = (i + 0.5) / n;
    const t = duration * f;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = t;
    });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push({
      t,
      dataUrl: canvas.toDataURL('image/jpeg', 0.72),
      geo: lerp(start, end, f),
      status: 'pending',
    });
  }
  URL.revokeObjectURL(url);
  return frames;
}

export default function FleetScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [busy, setBusy] = useState<'extracting' | 'scanning' | null>(null);
  const [startArea, setStartArea] = useState('Koramangala');
  const [endArea, setEndArea] = useState('Indiranagar');
  const [vehicle] = useState('Fleet Dashcam #07');
  const inputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(
    () => ({
      scanned: frames.filter((f) => !['pending', 'scanning'].includes(f.status)).length,
      filed: frames.filter((f) => f.status === 'filed').length,
      linked: frames.filter((f) => f.status === 'linked').length,
    }),
    [frames],
  );

  async function onPick(f: File) {
    setFile(f);
    setBusy('extracting');
    try {
      const start = LOCALITIES.find((l) => l.name === startArea)?.geo ?? LOCALITIES[0].geo;
      const end = LOCALITIES.find((l) => l.name === endArea)?.geo ?? LOCALITIES[1].geo;
      const fr = await extractFrames(f, start, end);
      setFrames(fr);
      toast(`Sampled ${fr.length} frames from the drive`, 'success');
    } catch {
      toast('Could not read that video — try an MP4/WebM clip', 'error');
      setFile(null);
    } finally {
      setBusy(null);
    }
  }

  async function scan() {
    setBusy('scanning');
    try {
      for (let i = 0; i < frames.length; i++) {
        setFrames((fs) => fs.map((f, j) => (j === i ? { ...f, status: 'scanning' } : f)));
        try {
          const base64 = frames[i].dataUrl.split(',')[1];
          const res = await fetch('/api/fleet/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64,
              mimeType: 'image/jpeg',
              lat: frames[i].geo.lat,
              lng: frames[i].geo.lng,
              vehicle,
            }),
          });
          const d = await res.json();
          setFrames((fs) =>
            fs.map((f, j) => {
              if (j !== i) return f;
              if (d.filed)
                return {
                  ...f,
                  status: 'filed',
                  detail: `${d.title} · ${Math.round(d.confidence * 100)}%`,
                  severity: d.severity,
                  issue: d.issue,
                };
              if (d.detected && d.linkedTo)
                return { ...f, status: 'linked', detail: d.note, severity: d.severity, issue: d.linkedTo };
              if (d.reason) return { ...f, status: 'skipped', detail: d.reason };
              return { ...f, status: 'clear' };
            }),
          );
        } catch {
          setFrames((fs) => fs.map((f, j) => (j === i ? { ...f, status: 'skipped', detail: 'Scan failed' } : f)));
        }
      }
      toast('Fleet pass complete', 'success');
    } finally {
      setBusy(null);
    }
  }

  const scanned = frames.length > 0 && frames.every((f) => !['pending', 'scanning'].includes(f.status));

  return (
    <>
      {/* mission control */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: '1rem' }}>
          <div className="input-group" style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label className="input-label" htmlFor="fleet-start">Route start</label>
            <select id="fleet-start" className="input-field" value={startArea} onChange={(e) => setStartArea(e.target.value)} disabled={busy !== null}>
              {LOCALITIES.map((l) => <option key={l.name}>{l.name}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label className="input-label" htmlFor="fleet-end">Route end</label>
            <select id="fleet-end" className="input-field" value={endArea} onChange={(e) => setEndArea(e.target.value)} disabled={busy !== null}>
              {LOCALITIES.map((l) => <option key={l.name}>{l.name}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <span className="input-label"><Truck size={14} /> Vehicle</span>
            <span className="tag" style={{ padding: '0.55rem 0.8rem' }}>{vehicle}</span>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn btn-secondary" onClick={() => inputRef.current?.click()} disabled={busy !== null}>
            {busy === 'extracting' ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
            {file ? 'Replace dashcam clip' : 'Upload dashcam clip'}
          </button>
          {frames.length > 0 && (
            <button className="btn btn-primary" onClick={scan} disabled={busy !== null || scanned}>
              {busy === 'scanning' ? <Loader2 size={16} className="spin" /> : <ScanSearch size={16} />}
              {busy === 'scanning' ? 'Scanning the drive…' : scanned ? 'Pass complete' : `Scan ${frames.length} frames`}
            </button>
          )}
          {file && <span className="tiny muted">{file.name}</span>}
        </div>

        {frames.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: '1rem' }}>
            <span className="tag">{stats.scanned}/{frames.length} frames scanned</span>
            <span className="tag" style={{ color: '#15803d' }}>{stats.filed} report(s) auto-filed</span>
            <span className="tag">{stats.linked} matched existing reports</span>
          </div>
        )}
      </div>

      {/* filmstrip */}
      {frames.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1rem' }}>
          {frames.map((f, i) => (
            <motion.div
              key={i}
              className="glass-card"
              style={{ padding: '0.75rem' }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.dataUrl}
                alt={`Frame at ${Math.round(f.t)}s`}
                style={{
                  width: '100%',
                  borderRadius: 'var(--radius-md)',
                  filter: f.status === 'scanning' ? 'saturate(0.4)' : undefined,
                }}
              />
              <div className="tiny muted flex items-center justify-between" style={{ margin: '0.5rem 0 0.35rem' }}>
                <span><Video size={11} style={{ verticalAlign: '-1px' }} /> {Math.round(f.t)}s</span>
                <span>{f.geo.lat.toFixed(4)}, {f.geo.lng.toFixed(4)}</span>
              </div>
              <FrameBadge frame={f} />
              {f.issue && (
                <Link href={`/issues/${f.issue.id}`} className="link tiny" style={{ display: 'inline-block', marginTop: '0.3rem' }}>
                  View report {f.issue.ref} →
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {frames.length === 0 && (
        <div className="glass-card center-text" style={{ padding: '3rem 2rem' }}>
          <span className="logo-badge" style={{ width: 48, height: 48, margin: '0 auto 1rem', borderRadius: 14 }}>
            <Video size={26} />
          </span>
          <h2 style={{ fontSize: '1.2rem' }}>Run a fleet pass</h2>
          <p className="muted small" style={{ maxWidth: 520, margin: '0.5rem auto 0' }}>
            Pick the vehicle&apos;s route, upload a dashcam clip, and watch the edge inspector sample the
            drive frame-by-frame. Clear detections become geo-tagged work orders automatically — no
            citizen effort, no duplicate spam.
          </p>
        </div>
      )}
    </>
  );
}

function FrameBadge({ frame }: { frame: Frame }) {
  switch (frame.status) {
    case 'pending':
      return <span className="tag">queued</span>;
    case 'scanning':
      return (
        <span className="tag" style={{ color: '#7c3aed' }}>
          <Loader2 size={11} className="spin" style={{ verticalAlign: '-1px' }} /> Gemini scanning…
        </span>
      );
    case 'clear':
      return (
        <span className="tag" style={{ color: '#15803d' }}>
          <CheckCircle2 size={11} style={{ verticalAlign: '-1px' }} /> road clear
        </span>
      );
    case 'filed':
      return (
        <div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="badge" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>
              <FileCheck2 size={11} /> auto-filed
            </span>
            {frame.severity && <SeverityBadge severity={frame.severity} />}
          </div>
          {frame.detail && <div className="tiny muted" style={{ marginTop: '0.25rem' }}>{frame.detail}</div>}
        </div>
      );
    case 'linked':
      return (
        <div>
          <span className="badge" style={{ background: 'rgba(8,145,178,0.12)', color: '#0891b2' }}>
            <Link2 size={11} /> matched existing
          </span>
          {frame.detail && <div className="tiny muted" style={{ marginTop: '0.25rem' }}>{frame.detail}</div>}
        </div>
      );
    default:
      return (
        <span className="tag">
          <CircleSlash size={11} style={{ verticalAlign: '-1px' }} /> {frame.detail ?? 'skipped'}
        </span>
      );
  }
}
