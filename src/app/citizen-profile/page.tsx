import { redirect } from 'next/navigation';
import { Camera, ThumbsUp, CheckCircle2, Trophy, Mail, ShieldCheck } from 'lucide-react';
import { getProfile } from '@/lib/auth';
import { getMyRank, getMyReports, getMyVerifications } from '@/lib/data';
import IssueCard from '@/components/IssueCard';
import SignOutButton from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

function level(points: number) {
  if (points >= 500) return { name: 'Civic Champion', emoji: '🦸', floor: 500, ceil: 500 };
  if (points >= 300) return { name: 'City Guardian', emoji: '🏅', floor: 300, ceil: 500 };
  if (points >= 150) return { name: 'Active Citizen', emoji: '🛡️', floor: 150, ceil: 300 };
  if (points >= 50) return { name: 'Neighbourhood Helper', emoji: '🤝', floor: 50, ceil: 150 };
  return { name: 'Newcomer', emoji: '🌱', floor: 0, ceil: 50 };
}

export default async function CitizenProfilePage() {
  const profile = await getProfile(true);
  if (!profile) redirect('/authentication?next=/citizen-profile');

  const [reports, verified, rank] = await Promise.all([
    getMyReports(profile.id),
    getMyVerifications(profile.id),
    getMyRank(profile.id),
  ]);

  const earnedPoints = reports.reduce((s, r) => s + (r.severity === 'Critical' ? 50 : r.severity === 'High' ? 35 : r.severity === 'Medium' ? 20 : 10), 0);
  const displayPoints = Math.max(profile.points, earnedPoints);
  const resolvedImpact = reports.filter((r) => r.status === 'Resolved' || r.detailedStatus === 'CLOSED').length;
  const lv = level(displayPoints);
  const pct = lv.ceil > lv.floor ? Math.min(100, ((displayPoints - lv.floor) / (lv.ceil - lv.floor)) * 100) : 100;

  const badges = [
    { earned: reports.length >= 1, emoji: '📸', label: 'First Report' },
    { earned: reports.length >= 5, emoji: '🏆', label: 'Prolific Reporter' },
    { earned: verified.length >= 5, emoji: '👍', label: 'Active Verifier' },
    { earned: displayPoints >= 150, emoji: '🛡️', label: 'Guardian' },
    { earned: resolvedImpact >= 1, emoji: '✅', label: 'Impact Maker' },
    { earned: reports.some((r) => r.severity === 'Critical'), emoji: '🚨', label: 'Critical Spotter' },
  ];

  return (
    <div className="container narrow animate-fade-in">
      {/* Header */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div style={{ fontSize: '3.2rem', lineHeight: 1 }}>{profile.avatar}</div>
            <div>
              <h1 style={{ fontSize: '1.8rem', margin: 0 }}>{profile.name}</h1>
              <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: '0.4rem' }}>
                <span className={`pill ${profile.role === 'authority' ? 'pill-teal' : 'pill-primary'}`}>
                  {profile.role === 'authority' ? <ShieldCheck size={12} /> : <Trophy size={12} />}
                  {profile.role === 'authority' ? 'Authority' : `${lv.emoji} ${lv.name}`}
                </span>
                {profile.email && <span className="tiny muted flex items-center gap-1"><Mail size={12} /> {profile.email}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="center-text">
              <div className="kpi-value" style={{ fontSize: '1.6rem' }}>#{rank}</div>
              <div className="kpi-label">Rank</div>
            </div>
            <div className="center-text">
              <div className="text-gradient" style={{ fontSize: '1.6rem', fontWeight: 800 }}>{displayPoints}</div>
              <div className="kpi-label">Points</div>
            </div>
            <SignOutButton />
          </div>
        </div>

        {/* Level progress */}
        {profile.role !== 'authority' && (
          <div style={{ marginTop: '1.25rem' }}>
            <div className="flex items-center justify-between tiny muted" style={{ marginBottom: '0.4rem' }}>
              <span>{lv.emoji} {lv.name}</span>
              <span>{profile.points < lv.ceil ? `${lv.ceil - profile.points} pts to next level` : 'Max level 🎉'}</span>
            </div>
            <div className="meter"><span style={{ width: `${pct}%` }} /></div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <Stat icon={<Camera size={20} />} value={reports.length} label="Reports filed" />
        <Stat icon={<ThumbsUp size={20} />} value={verified.length} label="Issues verified" />
        <Stat icon={<CheckCircle2 size={20} />} value={resolvedImpact} label="Resolved impact" />
      </div>

      {/* Badges */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Badges & Recognitions</h2>
        <div className="flex gap-3 flex-wrap">
          {badges.map((b) => (
            <div
              key={b.label}
              className="panel center-text"
              style={{ padding: '0.9rem 1rem', width: 110, opacity: b.earned ? 1 : 0.4, filter: b.earned ? 'none' : 'grayscale(1)' }}
              title={b.earned ? 'Earned' : 'Locked'}
            >
              <div style={{ fontSize: '1.8rem' }}>{b.emoji}</div>
              <div className="tiny" style={{ fontWeight: 600, marginTop: '0.25rem' }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* My reports */}
      <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>My filed issues</h2>
      {reports.length ? (
        <div className="cards-grid" style={{ marginBottom: '2rem' }}>
          {reports.map((i) => <IssueCard key={i.id} issue={i} />)}
        </div>
      ) : (
        <div className="glass-card center-text muted" style={{ marginBottom: '2rem' }}>
          You haven&apos;t reported anything yet. <a className="link" href="/report-issue">File your first report →</a>
        </div>
      )}

      {/* Verified */}
      {verified.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Issues you verified</h2>
          <div className="cards-grid">
            {verified.map((i) => <IssueCard key={i.id} issue={i} />)}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="glass-card kpi" style={{ padding: '1.1rem' }}>
      <div className="kpi-icon" style={{ background: 'var(--primary-tint)', color: 'var(--primary-600)' }}>{icon}</div>
      <div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  );
}

