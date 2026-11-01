import Link from 'next/link';
import { HardHat, LogIn } from 'lucide-react';
import { getProfile } from '@/lib/auth';
import { listIssues, listWorkOrders } from '@/lib/data';
import FieldWorkerPortalClient from '@/components/FieldWorkerPortalClient';

export const dynamic = 'force-dynamic';

export default async function FieldOperationsPage() {
  const profile = await getProfile();

  if (!profile) {
    return (
      <div className="container narrow center-text" style={{ paddingTop: '4rem' }}>
        <span className="logo-badge" style={{ width: 48, height: 48, margin: '0 auto 1.25rem', borderRadius: 14, background: 'var(--primary)', color: '#fff' }}>
          <HardHat size={26} />
        </span>
        <h1 style={{ fontSize: '1.8rem' }}>Field Operations &amp; Work Orders</h1>
        <p className="muted" style={{ marginBottom: '1.75rem' }}>
          Sign in with your field operations credentials to view assigned work orders and upload repair proof.
        </p>
        <Link href="/authentication" className="btn btn-primary">
          <LogIn size={16} /> Sign in / Demo Login
        </Link>
      </div>
    );
  }

  const workOrders = await listWorkOrders(profile.id);
  const allWorkOrders = workOrders.length > 0 ? workOrders : await listWorkOrders(); // fallback to all active for demo
  const issues = await listIssues();

  return (
    <FieldWorkerPortalClient
      initialWorkOrders={allWorkOrders}
      issues={issues}
      workerProfile={{
        name: profile.name,
        departmentName: profile.departmentName || 'Road Maintenance',
        badgeNumber: profile.badgeNumber || 'WRK-FIELD-109',
      }}
    />
  );
}

