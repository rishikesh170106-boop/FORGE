'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';

export default function EscalateButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    await fetch('/api/escalate', { method: 'POST' }).catch(() => {});
    setBusy(false);
    router.refresh();
  }

  return (
    <button className="btn btn-secondary btn-sm" onClick={run} disabled={busy} title="Auto-escalate SLA-breached issues">
      {busy ? <Loader2 size={14} className="spin" /> : <Zap size={14} />} Run escalation
    </button>
  );
}
