'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Landmark,
  ShieldCheck,
  Building2,
  HardHat,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  MapPin,
  TrendingUp,
  FileText,
  Zap,
  Activity,
  Layers,
  Search,
  ExternalLink,
} from 'lucide-react';
import type { Issue } from '@/lib/types';
import EscalateButton from './EscalateButton';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="panel center-text" style={{ height: 340 }}>Loading Ward Heatmap...</div>,
});

interface Props {
  initialData: {
    kpis: {
      totalComplaints: number;
      openComplaints: number;
      criticalComplaints: number;
      overdueComplaints: number;
      resolvedComplaints: number;
      activeWorkOrders: number;
      avgResolutionHours: number;
    };
    wards: any[];
    departments: any[];
    officers: any[];
    fieldWorkers: any[];
    auditLogs: any[];
  };
  issues: Issue[];
  adminProfile: {
    name: string;
    designation?: string;
  };
}

export default function MunicipalAdminDashboardClient({ initialData, issues, adminProfile }: Props) {
  const [activeTab, setActiveTab] = useState<'wards' | 'departments' | 'personnel' | 'overdue' | 'audit'>('wards');
  const [data, setData] = useState(initialData);

  const kpis = data.kpis;
  const overdueIssues = issues.filter((i) => {
    if (i.status === 'Resolved' || i.detailedStatus === 'CLOSED') return false;
    const deadline = i.resolutionDeadline
      ? new Date(i.resolutionDeadline).getTime()
      : new Date(i.createdAt).getTime() + (i.slaHours || 48) * 3600_000;
    return Date.now() > deadline;
  });

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      {/* City Command Center Header */}
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: '1.75rem' }}>
        <div className="flex items-center gap-3">
          <span className="logo-badge" style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg, #b91c1c, #4338ca)' }}>
            <Landmark size={24} style={{ color: '#fff' }} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 style={{ fontSize: '1.85rem', margin: 0 }}>Municipal Administration Command</h1>
              <span className="badge" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626', fontWeight: 800 }}>
                CITY LEVEL
              </span>
            </div>
            <p className="muted small" style={{ margin: 0 }}>
              Administrator: <strong>{adminProfile.name}</strong> · {adminProfile.designation || 'Municipal Commissioner Office'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EscalateButton />
        </div>
      </div>

      {/* Top Strategic KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <div className="panel center-text" style={{ padding: '0.85rem' }}>
          <div className="tiny muted font-bold uppercase">City Complaints</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--foreground)' }}>{kpis.totalComplaints}</div>
          <div className="tiny muted">All registered</div>
        </div>

        <div className="panel center-text" style={{ padding: '0.85rem' }}>
          <div className="tiny muted font-bold uppercase">Open Workload</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#2563eb' }}>{kpis.openComplaints}</div>
          <div className="tiny muted">Across all wards</div>
        </div>

        <div className="panel center-text" style={{ padding: '0.85rem' }}>
          <div className="tiny muted font-bold uppercase">Critical Hazards</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#dc2626' }}>{kpis.criticalComplaints}</div>
          <div className="tiny muted">Immediate response</div>
        </div>

        <div className="panel center-text" style={{ padding: '0.85rem', background: kpis.overdueComplaints > 0 ? 'rgba(220,38,38,0.06)' : undefined, borderColor: kpis.overdueComplaints > 0 ? 'rgba(220,38,38,0.3)' : undefined }}>
          <div className="tiny font-bold uppercase" style={{ color: kpis.overdueComplaints > 0 ? '#dc2626' : 'var(--muted)' }}>Overdue Cases</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: kpis.overdueComplaints > 0 ? '#dc2626' : 'var(--foreground)' }}>{kpis.overdueComplaints}</div>
          <div className="tiny muted">Breached SLA</div>
        </div>

        <div className="panel center-text" style={{ padding: '0.85rem' }}>
          <div className="tiny muted font-bold uppercase">Active Work Orders</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#d97706' }}>{kpis.activeWorkOrders}</div>
          <div className="tiny muted">Crews on duty</div>
        </div>

        <div className="panel center-text" style={{ padding: '0.85rem' }}>
          <div className="tiny muted font-bold uppercase">Resolved Total</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#16a34a' }}>{kpis.resolvedComplaints}</div>
          <div className="tiny muted">Verified fixes</div>
        </div>

        <div className="panel center-text" style={{ padding: '0.85rem' }}>
          <div className="tiny muted font-bold uppercase">Avg Turnaround</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--foreground)' }}>{kpis.avgResolutionHours}h</div>
          <div className="tiny muted">City benchmark</div>
        </div>
      </div>

      {/* Ward-wise Complaint Heatmap */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.75rem' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Ward-wise Spatial Complaint Distribution</h2>
            <div className="tiny muted">Live geolocated incidents across Indiranagar, Koramangala, Whitefield, HSR, Jayanagar</div>
          </div>
        </div>
        <MapView issues={issues} height="360px" />
      </div>

      {/* Administrative Sub-tabs */}
      <div className="flex gap-2 flex-wrap" style={{ marginBottom: '1.25rem' }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'wards' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('wards')}
        >
          <MapPin size={14} /> Ward Jurisdiction ({data.wards.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'departments' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('departments')}
        >
          <Building2 size={14} /> Department Performance ({data.departments.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'personnel' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('personnel')}
        >
          <Users size={14} /> Personnel Roster ({data.officers.length + data.fieldWorkers.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'overdue' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('overdue')}
          style={{ position: 'relative' }}
        >
          <AlertTriangle size={14} /> Overdue Escalation Desk ({overdueIssues.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('audit')}
        >
          <FileText size={14} /> Audit Trail ({data.auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Wards Management */}
      {activeTab === 'wards' && (
        <div className="glass-card" style={{ padding: '0.5rem' }}>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Ward Code &amp; Name</th>
                  <th>Zone</th>
                  <th>Population</th>
                  <th>Head Officer</th>
                  <th>Open / Critical</th>
                  <th>Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.wards.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="badge" style={{ fontWeight: 800 }}>{w.code}</span>
                        <span style={{ fontWeight: 600 }}>{w.name}</span>
                      </div>
                    </td>
                    <td className="tiny muted">{w.zone}</td>
                    <td className="tiny">{w.population ? w.population.toLocaleString() : '50,000'}</td>
                    <td className="tiny font-bold">{w.headOfficer}</td>
                    <td>
                      <span style={{ color: w.openIssues > 0 ? '#2563eb' : 'inherit', fontWeight: 700 }}>{w.openIssues} open</span>
                      {w.criticalIssues > 0 && (
                        <span className="badge" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626', marginLeft: 6, fontSize: '0.65rem' }}>
                          {w.criticalIssues} critical
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                          <div style={{ width: `${w.resolutionRate}%`, height: '100%', background: w.resolutionRate >= 70 ? '#16a34a' : '#d97706' }} />
                        </div>
                        <span className="tiny font-bold">{w.resolutionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Department Performance */}
      {activeTab === 'departments' && (
        <div className="glass-card" style={{ padding: '0.5rem' }}>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Target SLA</th>
                  <th>Active Cases</th>
                  <th>Overdue Breaches</th>
                  <th>SLA Compliance</th>
                  <th>Supervisor</th>
                </tr>
              </thead>
              <tbody>
                {data.departments.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      <div className="tiny muted">{d.code} · {d.contact}</div>
                    </td>
                    <td className="tiny">{d.targetSlaH} hours</td>
                    <td>
                      <span className="font-bold">{d.open} open</span>
                      <span className="tiny muted"> ({d.inProgress} in progress)</span>
                    </td>
                    <td>
                      {d.overdue > 0 ? (
                        <span className="badge" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626', fontWeight: 800 }}>
                          {d.overdue} breached
                        </span>
                      ) : (
                        <span className="tiny muted">0 breaches</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                          <div style={{ width: `${d.slaComplianceRate}%`, height: '100%', background: d.slaComplianceRate >= 80 ? '#16a34a' : '#dc2626' }} />
                        </div>
                        <span className="tiny font-bold">{d.slaComplianceRate}%</span>
                      </div>
                    </td>
                    <td className="tiny font-bold">{d.supervisor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Personnel Roster */}
      {activeTab === 'personnel' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {/* Officers */}
          <div className="glass-card" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={16} /> Authorized Department Officers
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {data.officers.map((o) => (
                <div key={o.id} className="panel" style={{ padding: '0.75rem' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ fontWeight: 700 }}>{o.name}</div>
                      <div className="tiny muted">{o.department} · {o.ward}</div>
                    </div>
                    <div className="center-text">
                      <span className="badge" style={{ background: 'var(--primary-tint)', color: 'var(--primary-600)', fontSize: '0.7rem' }}>
                        {o.activeCases} Active Cases
                      </span>
                      <div className="tiny muted" style={{ marginTop: 2 }}>{o.badge}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Field Workers */}
          <div className="glass-card" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <HardHat size={16} /> Registered Field Workers &amp; Crews
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {data.fieldWorkers.map((w) => (
                <div key={w.id} className="panel" style={{ padding: '0.75rem' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ fontWeight: 700 }}>{w.name}</div>
                      <div className="tiny muted">{w.department} · {w.ward}</div>
                      <div className="tiny" style={{ color: 'var(--primary)', marginTop: 2 }}>{w.activeTask}</div>
                    </div>
                    <div>
                      <span className="badge" style={{ background: w.status === 'Dispatched' ? 'rgba(217,119,6,0.15)' : 'rgba(22,163,74,0.15)', color: w.status === 'Dispatched' ? '#b45309' : '#16a34a' }}>
                        {w.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Overdue Escalation Desk */}
      {activeTab === 'overdue' && (
        <div className="glass-card" style={{ padding: '0.5rem' }}>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Complaint</th>
                  <th>Jurisdiction</th>
                  <th>SLA Overdue</th>
                  <th>Priority</th>
                  <th>Assigned Officer</th>
                </tr>
              </thead>
              <tbody>
                {overdueIssues.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <span className="badge" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626', fontWeight: 800 }}>
                        {i.ref || i.id}
                      </span>
                      <div style={{ fontWeight: 600, marginTop: 2 }}>{i.title}</div>
                      <div className="tiny muted">{i.category} · {i.location}</div>
                    </td>
                    <td className="tiny">
                      <div><strong>{i.wardName || 'Ward'}</strong></div>
                      <div className="muted">{i.department}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626', fontWeight: 800 }}>
                        <AlertTriangle size={12} /> Overdue Breached
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#dc2626' }}>{i.priority}</span>
                    </td>
                    <td className="tiny">{i.assignedOfficerName || 'Jurisdictional Head'}</td>
                  </tr>
                ))}
                {overdueIssues.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted center-text" style={{ padding: '2.5rem' }}>
                      🎉 Zero overdue complaints across all municipal wards!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Complete Audit Logs */}
      {activeTab === 'audit' && (
        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.auditLogs.map((log) => (
              <div key={log.id} className="panel" style={{ padding: '0.85rem' }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="badge font-bold" style={{ fontSize: '0.7rem' }}>
                      {log.action}
                    </span>
                    <span className="tiny font-bold">{log.actorName} ({log.actorRole})</span>
                    {log.complaintId && (
                      <span className="tiny muted">Target: {log.complaintId}</span>
                    )}
                  </div>
                  <span className="tiny muted">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <pre className="mono tiny muted" style={{ marginTop: '0.5rem', background: 'rgba(0,0,0,0.03)', padding: '0.5rem', borderRadius: 4, overflowX: 'auto' }}>
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

