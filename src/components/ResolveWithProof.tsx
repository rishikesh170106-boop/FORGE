'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Camera, ShieldAlert } from 'lucide-react';
import { toast } from '@/lib/toast';

interface Verdict { verified: boolean; confidence: number; note: string }

export default function ResolveWithProof({ id }: { id: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  async function onFile(f: File | null) {
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('image', f);
      const r = (await fetch(`/api/issues/${id}/resolve`, { method: 'POST', body: fd }).then((x) => x.json())) as Verdict;
      setVerdict(r);
      toast(
        r.verified
          ? `AI verified the fix (${Math.round(r.confidence * 100)}%) — resolved!`
          : `Resolved, but AI flagged the proof: ${r.note}`,
        r.verified ? 'success' : 'info',
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (verdict) {
    return (
      <span className="tiny" style={{ color: verdict.verified ? 'var(--success)' : 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
        {verdict.verified ? <CheckCircle2 size={13} /> : <ShieldAlert size={13} />}
        {verdict.verified ? `AI-verified fix (${Math.round(verdict.confidence * 100)}%)` : `Flagged: ${verdict.note}`}
      </span>
    );
  }

  if (!open) {
    return (
      <button className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>
        <CheckCircle2 size={14} /> Resolve with proof
      </button>
    );
  }

  return (
    <>
      <button className="btn btn-primary btn-sm" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 size={14} className="spin" /> : <Camera size={14} />}
        {busy ? 'Verifying…' : 'Upload “after” photo'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </>
  );
}
