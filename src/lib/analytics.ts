import type { GeoPoint, Issue, IssueCategory, Severity } from './types';

// Pure analytics over a list of issues — shared by the in-memory store and the
// Supabase repository so the numbers are computed identically either way.

function countBy<T, K extends string>(arr: T[], key: (t: T) => K): Record<K, number> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {} as Record<K, number>);
}

export interface Stats {
  total: number;
  open: number;
  critical: number;
  pending: number;
  inProgress: number;
  resolved: number;
  overdue: number;
  verifications: number;
  avgResolutionH: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  trend: { day: string; count: number }[];
}

export function computeStats(issues: Issue[]): Stats {
  const byStatus = countBy(issues, (i) => i.status);
  const bySeverity = countBy(issues, (i) => i.severity);
  const byCategory = countBy(issues, (i) => i.category);

  const resolved = issues.filter((i) => i.status === 'Resolved');
  const avgResolutionH = resolved.length
    ? Math.round(
        resolved.reduce(
          (s, i) =>
            s +
            (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime()) /
              3600_000,
          0,
        ) / resolved.length,
      )
    : 0;

  const trend: { day: string; count: number }[] = [];
  for (let d = 6; d >= 0; d--) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - d);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const count = issues.filter((i) => {
      const t = new Date(i.createdAt).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
    trend.push({ day: start.toLocaleDateString('en-US', { weekday: 'short' }), count });
  }

  const now = Date.now();
  const overdue = issues.filter(
    (i) => i.status !== 'Resolved' && now > new Date(i.createdAt).getTime() + i.slaHours * 3600_000,
  ).length;

  return {
    total: issues.length,
    open: issues.filter((i) => i.status !== 'Resolved').length,
    critical: issues.filter((i) => i.severity === 'Critical').length,
    pending: (byStatus['Reported'] ?? 0) + (byStatus['Acknowledged'] ?? 0),
    inProgress: byStatus['In Progress'] ?? 0,
    resolved: resolved.length,
    overdue,
    verifications: issues.reduce((s, i) => s + i.verifications, 0),
    avgResolutionH,
    byStatus,
    bySeverity,
    byCategory,
    trend,
  };
}

export interface DeptScore {
  department: string;
  total: number;
  resolved: number;
  open: number;
  resolvedPct: number;
  avgResolutionH: number;
  slaCompliancePct: number;
  critical: number;
  verifications: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

export function computeScorecards(issues: Issue[]): DeptScore[] {
  const groups = new Map<string, Issue[]>();
  for (const i of issues) {
    const arr = groups.get(i.department) ?? [];
    arr.push(i);
    groups.set(i.department, arr);
  }
  const hours = (i: Issue) =>
    (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime()) / 3600_000;

  return [...groups.entries()]
    .map(([department, arr]) => {
      const resolved = arr.filter((i) => i.status === 'Resolved');
      const avgResolutionH = resolved.length
        ? Math.round(resolved.reduce((s, i) => s + hours(i), 0) / resolved.length)
        : 0;
      const withinSla = resolved.filter((i) => hours(i) <= i.slaHours).length;
      const resolvedPct = Math.round((resolved.length / arr.length) * 100);
      const slaCompliancePct = resolved.length ? Math.round((withinSla / resolved.length) * 100) : 0;
      const score = resolvedPct * 0.5 + slaCompliancePct * 0.5;
      const grade: DeptScore['grade'] = score >= 75 ? 'A' : score >= 50 ? 'B' : score >= 25 ? 'C' : 'D';
      return {
        department,
        total: arr.length,
        resolved: resolved.length,
        open: arr.length - resolved.length,
        resolvedPct,
        avgResolutionH,
        slaCompliancePct,
        critical: arr.filter((i) => i.severity === 'Critical').length,
        verifications: arr.reduce((s, i) => s + i.verifications, 0),
        grade,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export interface Hotspot {
  area: string;
  count: number;
  topCategory: IssueCategory;
  maxSeverity: Severity;
  openCount: number;
  geo: GeoPoint;
}

export function computeHotspots(issues: Issue[]): Hotspot[] {
  const groups = new Map<string, Issue[]>();
  for (const i of issues) {
    const area = i.location.split(',')[0].trim() || 'Unknown';
    const arr = groups.get(area) ?? [];
    arr.push(i);
    groups.set(area, arr);
  }
  const sevRank: Record<Severity, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };
  return [...groups.entries()]
    .map(([area, arr]) => {
      const cat = countBy(arr, (i) => i.category);
      const topCategory = Object.entries(cat).sort((a, b) => b[1] - a[1])[0][0] as IssueCategory;
      const maxSeverity = arr.map((i) => i.severity).sort((a, b) => sevRank[b] - sevRank[a])[0];
      return {
        area,
        count: arr.length,
        topCategory,
        maxSeverity,
        openCount: arr.filter((i) => i.status !== 'Resolved').length,
        geo: arr[0].geo,
      };
    })
    .sort((a, b) => b.count - a.count);
}
