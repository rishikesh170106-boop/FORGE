import {
  TrafficCone,
  Lightbulb,
  Droplets,
  Trash2,
  TreePine,
  Dog,
  Wrench,
  Building2,
  CircleAlert,
  ScanSearch,
  Layers,
  Gauge,
  FileCheck2,
  Bot,
  ShieldCheck,
  Scale,
  type LucideIcon,
} from 'lucide-react';
import type { IssueCategory, IssueStatus, Severity } from '@/lib/types';

// ----- Category icons ----------------------------------------------------------
const CATEGORY_ICON: Record<IssueCategory, LucideIcon> = {
  Pothole: TrafficCone,
  Streetlight: Lightbulb,
  'Water Leak': Droplets,
  Garbage: Trash2,
  Drainage: Droplets,
  'Tree / Hazard': TreePine,
  'Traffic Signal': TrafficCone,
  'Stray Animals': Dog,
  'Public Toilet': Wrench,
  Encroachment: Building2,
  Other: CircleAlert,
};

export function CategoryIcon({
  category,
  size = 18,
}: {
  category: IssueCategory;
  size?: number;
}) {
  const Icon = CATEGORY_ICON[category] ?? CircleAlert;
  return <Icon size={size} />;
}

// ----- Dynamic icon (for streamed agent steps) ---------------------------------
const DYN: Record<string, LucideIcon> = {
  ScanSearch,
  Layers,
  Building2,
  Gauge,
  FileCheck2,
  Bot,
  ShieldCheck,
  Scale,
};
export function DynIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = DYN[name] ?? Bot;
  return <Icon size={size} />;
}

// ----- Badges ------------------------------------------------------------------
export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge sev-${severity}`}>{severity}</span>;
}

export function statusClass(status: IssueStatus): string {
  return `st-${status.replace(/\s/g, '')}`;
}

export function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span className={`badge ${statusClass(status)}`}>
      <span className="dot" style={{ background: 'currentColor' }} />
      {status}
    </span>
  );
}

// ----- Colors ------------------------------------------------------------------
export const SEVERITY_COLOR: Record<Severity, string> = {
  Low: '#16a34a',
  Medium: '#d97706',
  High: '#ea580c',
  Critical: '#dc2626',
};

export function priorityColor(p: number): string {
  if (p >= 80) return '#dc2626';
  if (p >= 60) return '#ea580c';
  if (p >= 40) return '#d97706';
  return '#16a34a';
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
