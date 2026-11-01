import Link from 'next/link';
import { ArrowLeft, LogIn, Route } from 'lucide-react';
import { getProfile } from '@/lib/auth';
import { listIssues } from '@/lib/data';
import RouteOptimizer from '@/components/RouteOptimizer';

export const dynamic = 'force-dynamic';

// Smart dispatch routing for city crews: solves the shortest tour (TSP) over
// the department's open issues so one truck run covers every stop efficiently.
export default async function RouteOptimizerPage() {
  const profile = await getProfile();

  if (!profile || profile.role !== 'authority') {
    return (
      <div className="container narrow center-text" style={{ paddingTop: '2rem' }}>
        <span className="logo-badge" style={{ width: 44, height: 44, margin: '0 auto 1rem', borderRadius: 12 }}>
          <Route size={24} />
        </span>
        <h1>Dispatch Route Optimizer</h1>
        <p className="muted" style={{ marginBottom: '1.5rem' }}>
          Sign in with an authority account to plan optimized crew routes.
        </p>
        <Link href="/login" className="btn btn-primary"><LogIn size={16} /> Sign in</Link>
      </div>
    );
  }

  const open = (await listIssues()).filter((i) => i.status !== 'Resolved');
  const stops = open.map((i) => ({
    id: i.id,
    ref: i.ref,
    title: i.title,
    category: i.category,
    severity: i.severity,
    priority: i.priority,
    geo: i.geo,
    location: i.location,
    status: i.status,
    department: i.department,
  }));

  return (
    <div className="container animate-fade-in">
      <Link href="/authority" className="link flex items-center gap-1 tiny" style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={14} /> Back to console
      </Link>
      <div className="flex items-center gap-3" style={{ marginBottom: '1.25rem' }}>
        <span className="logo-badge" style={{ width: 42, height: 42, borderRadius: 12 }}>
          <Route size={22} />
        </span>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Dispatch Route Optimizer</h1>
          <p className="muted small">
            The shortest crew tour over every open issue — nearest-neighbour + 2-opt TSP on live data.
          </p>
        </div>
      </div>
      <RouteOptimizer issues={stops} />
    </div>
  );
}
