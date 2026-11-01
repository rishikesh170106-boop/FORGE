'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Send, Loader2, LogIn } from 'lucide-react';
import { useSession } from '@/lib/useSession';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';
import { timeAgo } from '@/components/ui';

interface Comment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export default function Comments({ issueId }: { issueId: string }) {
  const { profile } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/issues/${issueId}/comments`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .catch(() => {});
  }, [issueId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const sb = createClient();
    if (!sb) return;
    const ch = sb
      .channel(`comments-${issueId}-${Math.random()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `issue_id=eq.${issueId}` }, load)
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [issueId, load]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    const r = await fetch(`/api/issues/${issueId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    });
    setBusy(false);
    if (r.status === 401) return toast('Sign in to comment', 'info');
    if (!r.ok) return toast('Could not post comment', 'error');
    setBody('');
    load();
  }

  return (
    <div className="glass-card">
      <div className="section-title">
        <MessageCircle size={18} color="#7c3aed" />
        <h2 style={{ fontSize: '1.1rem' }}>Community discussion</h2>
        <span className="pill pill-muted" style={{ marginLeft: 'auto' }}>{comments.length}</span>
      </div>

      <div className="flex-col gap-3" style={{ marginBottom: '1rem' }}>
        {comments.length === 0 && <p className="muted small">No comments yet — start the conversation.</p>}
        {comments.map((c) => (
          <div key={c.id} className="panel" style={{ padding: '0.7rem 0.9rem' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '0.2rem' }}>
              <strong className="small" style={{ color: 'var(--foreground)' }}>{c.authorName}</strong>
              <span className="tiny muted">{timeAgo(c.createdAt)}</span>
            </div>
            <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{c.body}</p>
          </div>
        ))}
      </div>

      {profile ? (
        <form onSubmit={post} className="flex gap-2">
          <input
            className="input-field"
            placeholder="Add a comment…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            aria-label="Add a comment"
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !body.trim()}>
            {busy ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
          </button>
        </form>
      ) : (
        <Link href="/login" className="btn btn-secondary btn-sm">
          <LogIn size={14} /> Sign in to comment
        </Link>
      )}
    </div>
  );
}
