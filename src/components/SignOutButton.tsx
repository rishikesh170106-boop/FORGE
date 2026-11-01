'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    document.cookie = 'ch_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'ch_demo_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.assign('/login');
  }

  return (
    <button className="btn btn-secondary btn-sm" onClick={signOut} disabled={busy}>
      {busy ? <Loader2 size={14} className="spin" /> : <LogOut size={14} />} Sign out
    </button>
  );
}
