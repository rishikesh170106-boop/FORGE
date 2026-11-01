import Link from 'next/link';
import { Landmark, LogIn } from 'lucide-react';
import { getProfile } from '@/lib/auth';
import { listIssues, listWorkOrders, listAuditLogs, getStats } from '@/lib/data';
import { MUNICIPAL_DEPARTMENTS, MUNICIPAL_WARDS } from '@/lib/routing';
import MunicipalAdminDashboardClient from '@/components/MunicipalAdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const profile = await getProfile();

  if (!profile) {
    return (
      <div className="container narrow center-text" style={{ paddingTop: '4rem' }}>
        <span className="logo-badge" style={{ width: 48, height: 48, margin: '0 auto 1.25rem', borderRadius: 14, background: '#dc2626', color: '#fff' }}>
          <Landmark size={26} />
        </span>
        <h1 style={{ fontSize: '1.8rem' }}>Municipal Administration</h1>
        <p className="muted" style={{ marginBottom: '1.75rem' }}>
          City-wide command portal for Municipal Administrators, Ward Commissioners, and Department Supervisors.
        </p>
        <Link href="/login" className="btn btn-primary">
          <LogIn size={16} /> Sign in / Demo Login
        </Link>
      </div>
    );
  }

  const issues = await listIssues();
  const workOrders = await listWorkOrders();
  const auditLogs = await listAuditLogs();
  const stats = await getStats();

  const wardBreakdown = MUNICIPAL_WARDS.map((w) => {
    const wardIssues = issues.filter((i) => i.wardId === w.id || i.wardName?.toLowerCase() === w.name.toLowerCase());
    const open = wardIssues.filter((i) => i.status !== 'Resolved' && i.detailedStatus !== 'CLOSED');
    const resolved = wardIssues.filter((i) => i.status === 'Resolved' || i.detailedStatus === 'CLOSED');
    const critical = open.filter((i) => i.severity === 'Critical').length;
    const overdue = open.filter((i) => {
      const deadline = i.resolutionDeadline ? new Date(i.resolutionDeadline).getTime() : new Date(i.createdAt).getTime() + (i.slaHours || 48) * 3600_000;
      return Date.now() > deadline;
    }).length;

    return {
      id: w.id,
      code: w.code,
      name: w.name,
      zone: w.zone,
      lat: w.lat,
      lng: w.lng,
      population: w.population,
      headOfficer: w.headOfficerName,
      totalIssues: wardIssues.length,
      openIssues: open.length,
      resolvedIssues: resolved.length,
      criticalIssues: critical,
      overdueIssues: overdue,
      resolutionRate: wardIssues.length ? Math.round((resolved.length / wardIssues.length) * 100) : 100,
    };
  });

  const departmentMetrics = MUNICIPAL_DEPARTMENTS.map((d) => {
    const deptIssues = issues.filter((i) => i.departmentId === d.id || i.department?.toLowerCase() === d.name.toLowerCase());
    const open = deptIssues.filter((i) => i.status !== 'Resolved' && i.detailedStatus !== 'CLOSED');
    const resolved = deptIssues.filter((i) => i.status === 'Resolved' || i.detailedStatus === 'CLOSED');
    const inProgress = deptIssues.filter((i) => i.status === 'In Progress');
    const overdue = open.filter((i) => {
      const deadline = i.resolutionDeadline ? new Date(i.resolutionDeadline).getTime() : new Date(i.createdAt).getTime() + (i.slaHours || 48) * 3600_000;
      return Date.now() > deadline;
    }).length;

    const complianceRate = deptIssues.length ? Math.max(0, Math.round(((deptIssues.length - overdue) / deptIssues.length) * 100)) : 100;

    return {
      id: d.id,
      code: d.code,
      name: d.name,
      category: d.category,
      targetSlaH: d.slaHours,
      supervisor: d.supervisorName,
      contact: d.contactEmail,
      total: deptIssues.length,
      open: open.length,
      inProgress: inProgress.length,
      resolved: resolved.length,
      overdue,
      slaComplianceRate: complianceRate,
    };
  });

  const officers = [
    { id: 'demo-officer-roads', name: 'Officer Rajesh Kumar', department: 'Road Maintenance', ward: 'Indiranagar', status: 'Active', activeCases: 3, badge: 'OFF-BBMP-402' },
    { id: 'demo-officer-ananya', name: 'Officer Ananya Sen', department: 'Water Supply', ward: 'Koramangala', status: 'Active', activeCases: 2, badge: 'OFF-BWSSB-105' },
    { id: 'demo-officer-vikram', name: 'Officer Vikram Rao', department: 'Sanitation', ward: 'Whitefield', status: 'Active', activeCases: 4, badge: 'OFF-SWM-312' },
    { id: 'demo-officer-sneha', name: 'Officer Sneha Mehta', department: 'Electrical Department', ward: 'HSR Layout', status: 'On Duty', activeCases: 2, badge: 'OFF-BESCOM-214' },
    { id: 'demo-officer-pradeep', name: 'Officer Pradeep Patil', department: 'Drainage', ward: 'Jayanagar', status: 'Active', activeCases: 1, badge: 'OFF-SWD-508' },
  ];

  const fieldWorkers = [
    { id: 'demo-worker-ramesh', name: 'Ramesh Naidu', department: 'Road Maintenance', ward: 'Indiranagar', status: 'Dispatched', activeTask: 'WO-5211 (Pothole Patching)', badge: 'WRK-109' },
    { id: 'demo-worker-suresh', name: 'Suresh Gowda', department: 'Water Supply', ward: 'Koramangala', status: 'Reviewing', activeTask: 'WO-5212 (Pipe Clamping)', badge: 'WRK-224' },
    { id: 'demo-worker-manju', name: 'Manjunath', department: 'Drainage', ward: 'Jayanagar', status: 'Available', activeTask: 'None', badge: 'WRK-318' },
    { id: 'demo-worker-krishna', name: 'Krishna Murthy', department: 'Sanitation', ward: 'Whitefield', status: 'On Route', activeTask: 'Compactor Route B', badge: 'WRK-405' },
  ];

  return (
    <MunicipalAdminDashboardClient
      initialData={{
        kpis: {
          totalComplaints: issues.length,
          openComplaints: issues.filter((i) => i.status !== 'Resolved' && i.detailedStatus !== 'CLOSED').length,
          criticalComplaints: issues.filter((i) => i.severity === 'Critical' && i.status !== 'Resolved').length,
          overdueComplaints: stats.overdue || 0,
          resolvedComplaints: stats.resolved,
          activeWorkOrders: workOrders.filter((w) => w.status === 'In Progress' || w.status === 'Assigned').length,
          avgResolutionHours: stats.avgResolutionH,
        },
        wards: wardBreakdown,
        departments: departmentMetrics,
        officers,
        fieldWorkers,
        auditLogs: auditLogs.slice(0, 50),
      }}
      issues={issues}
      adminProfile={{
        name: profile.name,
        designation: profile.designation || 'Municipal Commissioner Office',
      }}
    />
  );
}

