'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThumbsUp, ThumbsDown, Loader2, LogIn } from 'lucide-react';
import { toast } from '@/lib/toast';

// Community consensus: neighbours can back a report (verify → priority up) or
// push back on it (dispute → priority damped; 3 disputes flag it for review).
export default function IssueActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'verify' | 'dispute' | null>(null);
  const [done, setDone] = useState<'verify' | 'dispute' | null>(null);
  const [needLogin, setNeedLogin] = useState(false);

  async function act(kind: 'verify' | 'dispute') {
    setBusy(kind);
    const r = await fetch(`/api/issues/${id}/${kind}`, { method: 'POST' });
    setBusy(null);
    if (r.status === 401) {
      setNeedLogin(true);
      toast(`Sign in to ${kind} issues`, 'info');
      return;
    }
    setDone(kind);
    toast(
      kind === 'verify'
        ? 'Verified — thanks for confirming! +5 points'
        : 'Dispute noted — the community consensus has been updated.',
      'success',
    );
    router.refresh();
  }

  if (needLogin) {
    return (
      <Link href="/login" className="btn btn-primary">
        <LogIn size={16} /> Sign in to verify
      </Link>
    );
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => act('verify')} disabled={busy !== null || done !== null}>
        {busy === 'verify' ? <Loader2 size={16} className="spin" /> : <ThumbsUp size={16} />}
        {done === 'verify' ? 'Verified ✓' : 'Verify this issue'}
      </button>
      <button
        className="btn btn-ghost"
        onClick={() => act('dispute')}
        disabled={busy !== null || done !== null}
        title="Believe this report is wrong or already fixed? Dispute it."
      >
        {busy === 'dispute' ? <Loader2 size={16} className="spin" /> : <ThumbsDown size={16} />}
        {done === 'dispute' ? 'Disputed' : 'Dispute'}
      </button>
    </>
  );
}
