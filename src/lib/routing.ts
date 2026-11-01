// Deterministic Municipal Department & Ward Routing Engine
import type { IssueCategory, Ward } from './types';

export interface MunicipalDepartment {
  id: string;
  code: string;
  name: string;
  category: IssueCategory | 'Other';
  slaHours: number;
  contactEmail: string;
  supervisorName: string;
}

export const MUNICIPAL_DEPARTMENTS: MunicipalDepartment[] = [
  {
    id: 'dept-road',
    code: 'DEPT-ROAD',
    name: 'Road Maintenance',
    category: 'Pothole',
    slaHours: 72,
    contactEmail: 'roads@city.gov',
    supervisorName: 'Chief Engineer (Roads)',
  },
  {
    id: 'dept-san',
    code: 'DEPT-SAN',
    name: 'Sanitation',
    category: 'Garbage',
    slaHours: 12,
    contactEmail: 'sanitation@city.gov',
    supervisorName: 'Chief Health Inspector',
  },
  {
    id: 'dept-water',
    code: 'DEPT-WATER',
    name: 'Water Supply',
    category: 'Water Leak',
    slaHours: 24,
    contactEmail: 'water@city.gov',
    supervisorName: 'AEE (Water Distribution)',
  },
  {
    id: 'dept-drain',
    code: 'DEPT-DRAIN',
    name: 'Drainage',
    category: 'Drainage',
    slaHours: 48,
    contactEmail: 'drainage@city.gov',
    supervisorName: 'AEE (Storm Water Drains)',
  },
  {
    id: 'dept-elec',
    code: 'DEPT-ELEC',
    name: 'Electrical Department',
    category: 'Streetlight',
    slaHours: 48,
    contactEmail: 'electrical@city.gov',
    supervisorName: 'Executive Engineer (Electrical)',
  },
  {
    id: 'dept-pwd',
    code: 'DEPT-PWD',
    name: 'Public Works',
    category: 'Tree / Hazard',
    slaHours: 120,
    contactEmail: 'pwd@city.gov',
    supervisorName: 'Superintending Engineer (PWD)',
  },
  {
    id: 'dept-ctrl',
    code: 'DEPT-CTRL',
    name: 'Municipal Control Desk',
    category: 'Other',
    slaHours: 24,
    contactEmail: 'controldesk@city.gov',
    supervisorName: 'Municipal Commissioner Office',
  },
];

export const MUNICIPAL_WARDS: Ward[] = [
  {
    id: 'ward-101',
    code: 'W-101',
    name: 'Indiranagar',
    zone: 'East Zone',
    lat: 12.9784,
    lng: 77.6408,
    population: 62000,
    headOfficerName: 'Officer Rajesh Kumar',
  },
  {
    id: 'ward-102',
    code: 'W-102',
    name: 'Koramangala',
    zone: 'South Zone',
    lat: 12.9352,
    lng: 77.6245,
    population: 71000,
    headOfficerName: 'Officer Ananya Sen',
  },
  {
    id: 'ward-103',
    code: 'W-103',
    name: 'Whitefield',
    zone: 'Mahadevapura Zone',
    lat: 12.9698,
    lng: 77.7500,
    population: 85000,
    headOfficerName: 'Officer Vikram Rao',
  },
  {
    id: 'ward-104',
    code: 'W-104',
    name: 'HSR Layout',
    zone: 'Bommanahalli Zone',
    lat: 12.9121,
    lng: 77.6446,
    population: 58000,
    headOfficerName: 'Officer Sneha Mehta',
  },
  {
    id: 'ward-105',
    code: 'W-105',
    name: 'Jayanagar',
    zone: 'South Zone',
    lat: 12.9308,
    lng: 77.5838,
    population: 64000,
    headOfficerName: 'Officer Pradeep Patil',
  },
  {
    id: 'ward-106',
    code: 'W-106',
    name: 'Malleshwaram',
    zone: 'West Zone',
    lat: 13.0031,
    lng: 77.5643,
    population: 52000,
    headOfficerName: 'Officer Kavita Sharma',
  },
];

/** Map category to official department */
const CATEGORY_TO_DEPT: Record<IssueCategory, string> = {
  Pothole: 'dept-road',
  Streetlight: 'dept-elec',
  'Water Leak': 'dept-water',
  Garbage: 'dept-san',
  Drainage: 'dept-drain',
  'Tree / Hazard': 'dept-pwd',
  'Traffic Signal': 'dept-elec',
  'Stray Animals': 'dept-san',
  'Public Toilet': 'dept-san',
  Encroachment: 'dept-pwd',
  Other: 'dept-ctrl',
};

/** Calculate distance between two lat/lng points in meters */
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Determine nearest ward from coordinates or text match */
export function resolveWard(geo?: { lat: number; lng: number }, locationText?: string): Ward {
  if (locationText) {
    const lower = locationText.toLowerCase();
    for (const w of MUNICIPAL_WARDS) {
      if (lower.includes(w.name.toLowerCase())) return w;
    }
  }

  if (geo && geo.lat && geo.lng) {
    let nearest = MUNICIPAL_WARDS[0];
    let minD = Infinity;
    for (const w of MUNICIPAL_WARDS) {
      const d = getDistanceMeters(geo.lat, geo.lng, w.lat, w.lng);
      if (d < minD) {
        minD = d;
        nearest = w;
      }
    }
    return nearest;
  }

  return MUNICIPAL_WARDS[0];
}

export interface RoutingVerdict {
  departmentId: string;
  departmentName: string;
  wardId: string;
  wardName: string;
  assignedOfficerName: string;
  slaHours: number;
  routedToControlDesk: boolean;
  routingConfidence: number;
  routingReason: string;
}

/**
 * Deterministic Routing Service:
 * Evaluates issue category, classification confidence, location coordinates, and ward jurisdiction.
 * If routing is ambiguous (< 0.65 confidence or category 'Other'), routes to Municipal Control Desk for manual triage.
 */
export function routeComplaint(input: {
  category: IssueCategory;
  confidence: number;
  geo?: { lat: number; lng: number };
  locationText?: string;
}): RoutingVerdict {
  const ward = resolveWard(input.geo, input.locationText);
  const confidence = Number(input.confidence) || 0.7;

  // Ambiguous classification check -> send to control desk
  if (confidence < 0.65 || input.category === 'Other') {
    const ctrlDept = MUNICIPAL_DEPARTMENTS.find((d) => d.id === 'dept-ctrl')!;
    return {
      departmentId: ctrlDept.id,
      departmentName: ctrlDept.name,
      wardId: ward.id,
      wardName: ward.name,
      assignedOfficerName: ward.headOfficerName || 'Central Control Officer',
      slaHours: ctrlDept.slaHours,
      routedToControlDesk: true,
      routingConfidence: confidence,
      routingReason: `AI classification confidence (${(confidence * 100).toFixed(0)}%) is uncertain or unclassified. Assigned to Municipal Control Desk for human officer triage in ${ward.name}.`,
    };
  }

  const deptId = CATEGORY_TO_DEPT[input.category] || 'dept-road';
  const dept = MUNICIPAL_DEPARTMENTS.find((d) => d.id === deptId) || MUNICIPAL_DEPARTMENTS[0];

  return {
    departmentId: dept.id,
    departmentName: dept.name,
    wardId: ward.id,
    wardName: ward.name,
    assignedOfficerName: ward.headOfficerName || 'Duty Officer',
    slaHours: dept.slaHours,
    routedToControlDesk: false,
    routingConfidence: confidence,
    routingReason: `Automated deterministic routing: category "${input.category}" mapped to ${dept.name} under ${ward.name} jurisdiction (${ward.zone}). SLA: ${dept.slaHours} hours.`,
  };
}

