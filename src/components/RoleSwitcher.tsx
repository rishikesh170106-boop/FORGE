'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Building2, HardHat, Landmark, User, ChevronDown, Check, LogOut } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  role: string;
  departmentName?: string;
  wardName?: string;
  isDemo?: boolean;
}

export default function RoleSwitcher() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function load() {
      fetch('/api/auth/session')
        .then((r) => r.json())
        .then((data) => {
          if (data?.profile) {
            setProfile(data.profile);
          }
        })
        .catch(() => {});
    }
    load();

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('ch-auth-change', load);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('ch-auth-change', load);
    };
  }, []);

  async function switchRole(targetRole: string, targetPath: string) {
    setSwitching(true);
    setOpen(false);
    if (targetRole === 'citizen') {
      document.cookie = 'ch_demo_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    try {
      await fetch('/api/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole }),
      });
      window.dispatchEvent(new Event('ch-auth-change'));
      window.location.assign(targetPath);
    } catch {
      setSwitching(false);
    }
  }

  const roleLabels: Record<string, { label: string; icon: any; color: string; path: string }> = {
    CITIZEN: { label: 'Citizen', icon: User, color: '#2563eb', path: '/dashboard' },
    DEPARTMENT_OFFICER: { label: 'Dept Officer', icon: Building2, color: '#7c3aed', path: '/authority' },
    FIELD_WORKER: { label: 'Field Worker', icon: HardHat, color: '#d97706', path: '/worker' },
    MUNICIPAL_ADMIN: { label: 'City Admin', icon: Landmark, color: '#dc2626', path: '/admin' },
  };

  const current = profile?.role && roleLabels[profile.role] ? roleLabels[profile.role] : roleLabels.CITIZEN;
  const CurrentIcon = current.icon;

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn btn-secondary btn-sm"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.35rem 0.65rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.78rem',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid var(--border)',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', color: current.color }}>
          <CurrentIcon size={14} />
        </span>
        <span>{current.label}</span>
        <span
          className="badge"
          style={{
            fontSize: '0.62rem',
            padding: '0.1rem 0.35rem',
            background: 'rgba(0,0,0,0.06)',
            color: 'var(--muted)',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          DEMO
        </span>
        <ChevronDown size={12} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div
          className="glass-card animate-rise"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 250,
            padding: '0.5rem',
            zIndex: 9999,
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.98)',
            border: '1px solid var(--border-strong)',
          }}
        >
          <div style={{ padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border)', marginBottom: '0.4rem' }}>
            <div className="tiny muted font-bold uppercase" style={{ letterSpacing: '0.05em' }}>
              Switch Operational Role
            </div>
            <div className="small" style={{ fontWeight: 600, marginTop: 2 }}>
              {profile?.name}
            </div>
            <div className="tiny muted">{profile?.departmentName || 'Citizen Community'}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ justifyContent: 'space-between', textAlign: 'left', width: '100%' }}
              onClick={() => switchRole('citizen', '/dashboard')}
            >
              <span className="flex items-center gap-2">
                <User size={14} style={{ color: '#2563eb' }} />
                <span>Citizen Portal</span>
              </span>
              {profile?.role === 'CITIZEN' && <Check size={14} style={{ color: '#2563eb' }} />}
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ justifyContent: 'space-between', textAlign: 'left', width: '100%' }}
              onClick={() => switchRole('authority', '/authority')}
            >
              <span className="flex items-center gap-2">
                <Building2 size={14} style={{ color: '#7c3aed' }} />
                <span>Department Officer</span>
              </span>
              {profile?.role === 'DEPARTMENT_OFFICER' && <Check size={14} style={{ color: '#7c3aed' }} />}
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ justifyContent: 'space-between', textAlign: 'left', width: '100%' }}
              onClick={() => switchRole('field_worker', '/worker')}
            >
              <span className="flex items-center gap-2">
                <HardHat size={14} style={{ color: '#d97706' }} />
                <span>Field Worker Portal</span>
              </span>
              {profile?.role === 'FIELD_WORKER' && <Check size={14} style={{ color: '#d97706' }} />}
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ justifyContent: 'space-between', textAlign: 'left', width: '100%' }}
              onClick={() => switchRole('municipal_admin', '/admin')}
            >
              <span className="flex items-center gap-2">
                <Landmark size={14} style={{ color: '#dc2626' }} />
                <span>Municipal Admin</span>
              </span>
              {profile?.role === 'MUNICIPAL_ADMIN' && <Check size={14} style={{ color: '#dc2626' }} />}
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.4rem', paddingTop: '0.3rem' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm full"
              style={{ color: 'var(--muted)', fontSize: '0.75rem', justifyContent: 'center' }}
              onClick={() => {
                fetch('/api/demo-login', { method: 'DELETE' }).then(() => window.location.assign('/login'));
              }}
            >
              <LogOut size={12} /> Sign out of demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

