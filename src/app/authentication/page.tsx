'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Mail,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  Building2,
  HardHat,
  Landmark,
  UserCheck,
  Lock,
} from 'lucide-react';

export default function AuthenticationPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const router = useRouter();

  const getNext = () =>
    new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('next') || '/dashboard';

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setDevOtp(null);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send login code');
      }

      if (data.token) {
        setDevOtp(data.token);
      }
      setNotice(data.message || `Login code ready for ${email}.`);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtpWithToken(tokenToVerify: string) {
    if (!tokenToVerify) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: tokenToVerify.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Invalid or expired code');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('ch-auth-change'));
      }
      window.location.assign(data.redirectUrl || getNext());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    await verifyOtpWithToken(otp);
  }

  async function loginWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Login failed');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('ch-auth-change'));
      }
      window.location.assign(data.redirectUrl || getNext());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setBusy(false);
    }
  }

  async function demoLogin(role: string = 'authority') {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      }).then((x) => x.json());

      if (!r.success) throw new Error(r.error || 'Demo login failed');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('ch-auth-change'));
      }
      window.location.assign(r.redirectUrl || '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed');
      setBusy(false);
    }
  }

  return (
    <div className="container narrow animate-fade-in" style={{ maxWidth: 460, paddingTop: '3vh' }}>
      <div className="center-text" style={{ marginBottom: '1.5rem' }}>
        <motion.span
          className="logo-badge"
          style={{ width: 52, height: 52, margin: '0 auto 1rem', borderRadius: 14 }}
          initial={{ scale: 0.8, rotate: -10, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
        >
          <ShieldCheck size={26} />
        </motion.span>
        <h1 style={{ fontSize: '1.85rem' }}>Welcome to CIVIC SENSE</h1>
        <p className="muted small">Smarter communities. Better cities. · Citizen & Official Sign-in</p>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        {/* Toggle between OTP and Password */}
        <div className="flex gap-2" style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'otp' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => { setMode('otp'); setError(null); }}
          >
            Quick Code (OTP)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'password' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => { setMode('password'); setError(null); }}
          >
            Password Login
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'password' ? (
            <motion.form
              key="password-form"
              onSubmit={loginWithPassword}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="input-group">
                <label className="input-label"><Mail size={14} /> Email address</label>
                <input
                  className="input-field"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shaiksameerbasha072@gmail.com"
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label className="input-label"><Lock size={14} /> Password</label>
                <input
                  className="input-field"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="tiny" style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}>{error}</p>}

              <button type="submit" className="btn btn-primary full" disabled={busy || !email || !password}>
                {busy ? <Loader2 size={16} className="spin" /> : <Lock size={16} />} Sign in with password
              </button>
            </motion.form>
          ) : step === 'email' ? (
            <motion.form
              key="email"
              onSubmit={sendOtp}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
            >
              <div className="input-group">
                <label className="input-label"><Mail size={14} /> Citizen or Official email</label>
                <input
                  className="input-field"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shaiksameerbasha072@gmail.com"
                  autoFocus
                />
              </div>
              {error && <p className="tiny" style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}>{error}</p>}
              <button type="submit" className="btn btn-primary full" disabled={busy || !email}>
                {busy ? <Loader2 size={16} className="spin" /> : <Mail size={16} />} Send login code
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="otp"
              onSubmit={verifyOtp}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
            >
              {notice && (
                <p
                  className="tiny center-text"
                  style={{
                    color: 'var(--success)',
                    marginBottom: '1rem',
                    background: 'rgba(22,163,74,0.08)',
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {notice}
                </p>
              )}
              {devOtp && (
                <div
                  style={{
                    margin: '0 0 1rem 0',
                    padding: '0.75rem 0.9rem',
                    background: 'rgba(59,130,246,0.08)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(59,130,246,0.25)',
                  }}
                  className="flex items-center justify-between gap-2 flex-wrap"
                >
                  <div>
                    <span className="tiny muted block" style={{ fontSize: '0.7rem' }}>Verification code ready</span>
                    <strong style={{ fontSize: '1.25rem', letterSpacing: '0.15rem', color: 'var(--primary)' }}>
                      {devOtp}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.75rem', height: 32, padding: '0 12px' }}
                    onClick={() => {
                      setOtp(devOtp);
                      verifyOtpWithToken(devOtp);
                    }}
                    disabled={busy}
                  >
                    Auto-fill & Log in
                  </button>
                </div>
              )}
              <div className="input-group">
                <label className="input-label"><KeyRound size={14} /> 6-digit code</label>
                <input
                  className="input-field"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  style={{ fontSize: '1.4rem', letterSpacing: '0.35rem', textAlign: 'center' }}
                  autoFocus
                />
              </div>
              {error && <p className="tiny center-text" style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}>{error}</p>}
              <button type="submit" className="btn btn-primary full" disabled={busy || otp.length < 4}>
                {busy ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />} Verify & continue
              </button>
              <div className="flex items-center justify-between" style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setStep('email'); setOtp(''); setError(null); }}
                >
                  <ArrowLeft size={14} /> Change email
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => sendOtp()} disabled={busy}>
                  Resend code
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Role Quick Sign-in Section */}
      <div className="center-text" style={{ marginTop: '1.25rem' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '0.85rem' }}>
          <div className="divider" style={{ flex: 1, margin: 0 }} />
          <span className="tiny muted font-bold">1-Click Role Sign In</span>
          <div className="divider" style={{ flex: 1, margin: 0 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => demoLogin('citizen')}
            disabled={busy}
            title="Citizen Portal (shaiksameerbasha072@gmail.com)"
          >
            <UserCheck size={14} /> Citizen (shaiksameerbasha072)
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => demoLogin('authority')}
            disabled={busy}
            title="Department Officer Console"
          >
            <Building2 size={14} /> Dept Officer
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => demoLogin('field_worker')}
            disabled={busy}
            title="Field Worker Tasks Console"
          >
            <HardHat size={14} /> Field Worker
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => demoLogin('municipal_admin')}
            disabled={busy}
            title="Municipal Admin Dashboard"
          >
            <Landmark size={14} /> City Admin
          </button>
        </div>

        <p className="tiny muted" style={{ marginTop: '0.75rem' }}>
          Fully local SQLite database with zero cloud dependencies.
        </p>
      </div>
    </div>
  );
}

