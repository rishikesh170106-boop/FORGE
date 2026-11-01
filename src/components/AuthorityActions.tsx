'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import type { IssueStatus } from '@/lib/types';
import ResolveWithProof from './ResolveWithProof';

const STEPS: IssueStatus[] = ['Acknowledged', 'In Progress'];

export default function AuthorityActions({ id, status }: { id: string; status: IssueStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function set(s: IssueStatus) {
    setBusy(s);
    await fetch(`/api/issues/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: s }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {STEPS.map((s) => {
        const done = status === s;
        return (
          <button
            key={s}
            className={`btn btn-sm ${done ? 'btn-primary' : 'btn-secondary'}`}
            disabled={busy !== null || done || status === 'Resolved'}
            onClick={() => set(s)}
          >
            {busy === s ? <Loader2 size={13} className="spin" /> : done ? <Check size={13} /> : null}
            {s}
          </button>
        );
      })}
      <ResolveWithProof id={id} />
    </div>
  );
}
