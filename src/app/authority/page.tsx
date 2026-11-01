import Link from 'next/link';
import { Building2, Clock, AlertTriangle, LogIn, Route } from 'lucide-react';
import { getProfile } from '@/lib/auth';
import { listIssues } from '@/lib/data';
import { Zap } from 'lucide-react';
import OpsCopilot from '@/components/OpsCopilot';
import AuthorityActions from '@/components/AuthorityActions';
import EscalateButton from '@/components/EscalateButton';
import { CategoryIcon, SeverityBadge, StatusBadge, priorityColor } from '@/components/ui';

export const dynamic = 'force-dynamic';

function sla(createdAt: string, slaHours: number) {
  const deadline = new Date(createdAt).getTime() + slaHours * 3600_000;
  const remH = Math.round((deadline - Date.now()) / 3600_000);
  if (remH < 0) return { text: `Overdue ${Math.abs(remH)}h`, overdue: true };
  if (remH < 24) return { text: `${remH}h left`, overdue: false };
  return { text: `${Math.round(remH / 24)}d left`, overdue: false };
}

export default async function AuthorityPage() {
  const profile = await getProfile();

  if (!profile) {
    return (
      <div className="container narrow center-text" style={{ paddingTop: '2rem' }}>
        <span className="logo-badge" style={{ width: 44, height: 44, margin: '0 auto 1rem', borderRadius: 12 }}>
          <Building2 size={24} />
        </span>
        <h1>Authority Console</h1>
        <p className="muted" style={{ marginBottom: '1.5rem' }}>Sign in with an authority account to manage and resolve reports.</p>
        <Link href="/login" className="btn btn-primary"><LogIn size={16} /> Sign in</Link>
      </div>
    );
  }

  const role = profile.role?.toLowerCase();
  const hasAuthorityAccess = role === 'authority' || role === 'department_officer' || role === 'municipal_admin';

  if (!hasAuthorityAccess) {
    return (
      <div className="container narrow" style={{ paddingTop: '2rem' }}>
        <div className="glass-card center-text">
          <span className="logo-badge" style={{ width: 44, height: 44, margin: '0 auto 1rem', borderRadius: 12 }}>
            <Building2 size={24} />
          </span>
          <h1>Authority access required</h1>
          <p className="muted">
            You&apos;re signed in as <strong>{profile.name}</strong> (citizen). To unlock the
            console, set your role to <code>authority</code> in Supabase:
          </p>
          <pre className="panel mono tiny" style={{ padding: '1rem', textAlign: 'left', overflowX: 'auto', marginTop: '1rem' }}>
{`update public.profiles set role = 'authority'
where id = '${profile.id}';`}
          </pre>
        </div>
      </div>
    );
  }

  const open = (await listIssues())
    .filter((i) => i.status !== 'Resolved')
    .sort((a, b) => Number(Boolean(b.escalated)) - Number(Boolean(a.escalated)) || b.priority - a.priority);
  const escalatedCount = open.filter((i) => i.escalated).length;

  return (
    <div className="container animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: '1.5rem' }}>
        <div className="flex items-center gap-3">
          <span className="logo-badge" style={{ width: 42, height: 42, borderRadius: 12 }}>
            <Building2 size={22} />
          </span>
          <div>
            <h1 style={{ fontSize: '2rem', margin: 0 }}>Authority Console</h1>
            <p className="muted small">
              {open.length} open · signed in as {profile.name}
              {escalatedCount > 0 && (
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}> · {escalatedCount} escalated</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/authority/route" className="btn btn-secondary">
            <Route size={16} /> Route optimizer
          </Link>
          <EscalateButton />
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <OpsCopilot />
      </div>

      <div className="glass-card">
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Open work queue</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Issue</th>
                <th className="hide-sm">Dept</th>
                <th>Priority</th>
                <th>SLA</th>
                <th>Status / actions</th>
              </tr>
            </thead>
            <tbody>
              {open.map((i) => {
                const s = sla(i.createdAt, i.slaHours);
                return (
                  <tr key={i.id}>
                    <td>
                      <Link href={`/issues/${i.id}`} style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none' }}>
                        {i.title}
                      </Link>
                      <div className="tiny muted flex items-center gap-1">
                        <CategoryIcon category={i.category} size={11} /> {i.category} · {i.location}
                      </div>
                    </td>
                    <td className="hide-sm tiny muted">{i.department}</td>
                    <td>
                      <span style={{ color: priorityColor(i.priority), fontWeight: 800 }}>{i.priority}</span>
                      <div className="flex items-center gap-1 flex-wrap" style={{ marginTop: 2 }}>
                        <SeverityBadge severity={i.severity} />
                        {i.escalated && (
                          <span className="badge" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>
                            <Zap size={10} /> Escalated
                          </span>
                        )}
                        {i.tags.includes('citizen-appeal') && (
                          <span className="badge" style={{ background: 'rgba(217,119,6,0.12)', color: '#b45309' }}>
                            <AlertTriangle size={10} /> Appeal — review
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className="tiny"
                        style={{ color: s.overdue ? 'var(--danger)' : 'var(--muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        {s.overdue ? <AlertTriangle size={12} /> : <Clock size={12} />} {s.text}
                      </span>
                    </td>
                    <td>
                      <div style={{ marginBottom: '0.4rem' }}><StatusBadge status={i.status} /></div>
                      <AuthorityActions id={i.id} status={i.status} />
                    </td>
                  </tr>
                );
              })}
              {open.length === 0 && (
                <tr><td colSpan={5} className="muted center-text" style={{ padding: '2rem' }}>🎉 No open issues — everything is resolved!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
