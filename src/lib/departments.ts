import type { Department, IssueCategory, Severity } from './types';

// Maps each civic issue category to the municipal body responsible, with a
// realistic service-level target the agent uses to set citizen expectations.
export const DEPARTMENTS: Record<IssueCategory, Department> = {
  Pothole: {
    key: 'Pothole',
    name: 'Road Maintenance',
    code: 'DEPT-ROAD',
    slaHours: 72,
    contact: 'roads@city.gov',
    escalation: 'Chief Engineer (Roads)',
  },
  Streetlight: {
    key: 'Streetlight',
    name: 'Electrical Department',
    code: 'DEPT-ELEC',
    slaHours: 48,
    contact: 'electrical@city.gov',
    escalation: 'Executive Engineer (Electrical)',
  },
  'Water Leak': {
    key: 'Water Leak',
    name: 'Water Supply',
    code: 'DEPT-WATER',
    slaHours: 24,
    contact: 'water@city.gov',
    escalation: 'AEE (Water Distribution)',
  },
  Garbage: {
    key: 'Garbage',
    name: 'Sanitation',
    code: 'DEPT-SAN',
    slaHours: 12,
    contact: 'sanitation@city.gov',
    escalation: 'Chief Health Inspector (Ward)',
  },
  Drainage: {
    key: 'Drainage',
    name: 'Drainage',
    code: 'DEPT-DRAIN',
    slaHours: 48,
    contact: 'drainage@city.gov',
    escalation: 'AEE (Storm Water Drains)',
  },
  'Tree / Hazard': {
    key: 'Tree / Hazard',
    name: 'Public Works',
    code: 'DEPT-PWD',
    slaHours: 24,
    contact: 'pwd@city.gov',
    escalation: 'Ward Disaster Officer',
  },
  'Traffic Signal': {
    key: 'Traffic Signal',
    name: 'Electrical Department',
    code: 'DEPT-ELEC',
    slaHours: 24,
    contact: 'traffic.electrical@city.gov',
    escalation: 'Executive Engineer (Electrical)',
  },
  'Stray Animals': {
    key: 'Stray Animals',
    name: 'Sanitation',
    code: 'DEPT-SAN',
    slaHours: 72,
    contact: 'animals.sanitation@city.gov',
    escalation: 'Veterinary Health Inspector',
  },
  'Public Toilet': {
    key: 'Public Toilet',
    name: 'Sanitation',
    code: 'DEPT-SAN',
    slaHours: 24,
    contact: 'sanitation@city.gov',
    escalation: 'Sanitation Supervisor',
  },
  Encroachment: {
    key: 'Encroachment',
    name: 'Public Works',
    code: 'DEPT-PWD',
    slaHours: 168,
    contact: 'enforcement.pwd@city.gov',
    escalation: 'Superintending Engineer (PWD)',
  },
  Other: {
    key: 'Other',
    name: 'Municipal Control Desk',
    code: 'DEPT-CTRL',
    slaHours: 24,
    contact: 'controldesk@city.gov',
    escalation: 'Municipal Commissioner Office',
  },
};

export const CATEGORIES = Object.keys(DEPARTMENTS) as IssueCategory[];

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  Low: 25,
  Medium: 50,
  High: 75,
  Critical: 95,
};

/**
 * Deterministic priority score (0-100) the agent reports as its "assess_priority"
 * tool. Blends severity, how many neighbours reported the same thing (signal of
 * impact), the safety risk, and how urgent the responsible department's SLA is.
 */
export function computePriority(input: {
  severity: Severity;
  duplicateCount: number;
  slaHours: number;
  hasSafetyRisk: boolean;
}): number {
  const base = SEVERITY_WEIGHT[input.severity];
  const duplicateBoost = Math.min(input.duplicateCount * 6, 24);
  const urgency = input.slaHours <= 24 ? 8 : input.slaHours <= 72 ? 4 : 0;
  const safety = input.hasSafetyRisk ? 8 : 0;
  return Math.min(100, Math.round(base + duplicateBoost + urgency + safety));
}

/** Points a citizen earns for reporting an issue of a given severity. */
export function reportPoints(severity: Severity): number {
  return { Low: 10, Medium: 20, High: 35, Critical: 50 }[severity];
}
