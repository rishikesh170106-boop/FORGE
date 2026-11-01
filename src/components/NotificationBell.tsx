'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Bell, CheckCircle2, Clock, AlertTriangle, ShieldCheck, HardHat, Building2, User } from 'lucide-react';
import { useRealtime } from '@/lib/useRealtime';
import { timeAgo } from './ui';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  complaintId?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 64, right: 16 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const load = useCallback(() => {
    fetch('/api/notifications', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.notifications) setItems(d.notifications);
        else if (d.items) {
          // Backward compatibility mapping
          setItems(
            d.items.map((it: any, idx: number) => ({
              id: `notif-${idx}`,
              title: it.title,
              message: it.note,
              type: it.status,
              complaintId: it.issueId,
              isRead: false,
              createdAt: it.at,
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  useRealtime(load);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Position popover
  useEffect(() => {
    if (!open) return;
    function place() {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 10, right: Math.max(8, window.innerWidth - r.right) });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const unreadCount = items.filter((i) => !i.isRead).length;

  function markAllRead() {
    items.forEach((it) => {
      if (!it.isRead) {
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: it.id }),
        }).catch(() => {});
      }
    });
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
  }

  function getTypeIcon(type: string) {
    if (type.includes('VERIFIED') || type.includes('CLOSED')) return <CheckCircle2 size={14} style={{ color: '#16a34a' }} />;
    if (type.includes('OVERDUE') || type.includes('ESCALATED')) return <AlertTriangle size={14} style={{ color: '#dc2626' }} />;
    if (type.includes('WORKER') || type.includes('WORK_STARTED')) return <HardHat size={14} style={{ color: '#d97706' }} />;
    if (type.includes('OFFICER') || type.includes('DEPT')) return <Building2 size={14} style={{ color: '#7c3aed' }} />;
    return <Clock size={14} style={{ color: '#2563eb' }} />;
  }

  const dropdown =
    open && mounted
      ? createPortal(
          <div
            ref={popRef}
            className="glass animate-fade-in"
            style={{
              position: 'fixed',
              top: pos.top,
              right: pos.right,
              width: 'min(360px, calc(100vw - 16px))',
              maxHeight: 440,
              overflowY: 'auto',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              padding: '0.6rem',
              zIndex: 1000,
              background: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid var(--border-strong)',
            }}
          >
            <div className="flex items-center justify-between" style={{ padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border)' }}>
              <div className="tiny muted font-bold uppercase" style={{ letterSpacing: '0.04em' }}>
                Civic Action Notifications
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.4rem', height: 'auto' }}
                  onClick={markAllRead}
                >
                  Mark all read
                </button>
              )}
            </div>

            {items.length === 0 && (
              <p className="tiny muted" style={{ padding: '1.5rem', textAlign: 'center' }}>
                No notifications right now.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.4rem' }}>
              {items.map((it) => (
                <Link
                  key={it.id}
                  href={it.complaintId ? `/issues/${it.complaintId}` : '#'}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'block',
                    padding: '0.6rem',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    background: it.isRead ? 'transparent' : 'rgba(37,99,235,0.06)',
                    border: it.isRead ? '1px solid transparent' : '1px solid rgba(37,99,235,0.18)',
                    transition: 'background var(--transition-fast)',
                  }}
                >
                  <div className="flex items-center gap-2" style={{ marginBottom: '0.25rem' }}>
                    <span style={{ display: 'inline-flex' }}>{getTypeIcon(it.type)}</span>
                    <span className="tiny font-bold" style={{ color: 'var(--foreground)' }}>
                      {it.title}
                    </span>
                    <span className="tiny muted" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>
                      {timeAgo(it.createdAt)}
                    </span>
                  </div>
                  <div className="tiny muted" style={{ lineHeight: 1.4, fontSize: '0.76rem' }}>
                    {it.message}
                  </div>
                </Link>
              ))}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        className="navpill-link"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        style={{ position: 'relative' }}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 8,
              background: 'var(--danger)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {dropdown}
    </div>
  );
}
