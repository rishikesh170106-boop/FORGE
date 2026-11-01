import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import type { UserRole } from './types';

export interface SessionProfile {
  id: string;
  name: string;
  avatar: string;
  role: UserRole;
  email?: string;
  departmentId?: string;
  departmentName?: string;
  wardId?: string;
  wardName?: string;
  badgeNumber?: string;
  designation?: string;
  points: number;
  reportsCount?: number;
  verificationsCount?: number;
  resolvedImpact?: number;
  isDemo?: boolean;
}

export const DEMO_PROFILES: Record<string, SessionProfile> = {
  authority: {
    id: 'usr-officer-road',
    name: 'Engineer Ramesh Kumar',
    avatar: '👷‍♂️',
    role: 'DEPARTMENT_OFFICER',
    email: 'officer@city.gov',
    departmentId: 'dept-road',
    departmentName: 'Road Maintenance',
    wardId: 'ward-101',
    wardName: 'Indiranagar',
    badgeNumber: 'RO-504',
    designation: 'Executive Engineer (Road Maintenance)',
    points: 180,
    isDemo: true,
  },
  department_officer: {
    id: 'usr-officer-road',
    name: 'Engineer Ramesh Kumar',
    avatar: '👷‍♂️',
    role: 'DEPARTMENT_OFFICER',
    email: 'officer@city.gov',
    departmentId: 'dept-road',
    departmentName: 'Road Maintenance',
    wardId: 'ward-101',
    wardName: 'Indiranagar',
    badgeNumber: 'RO-504',
    designation: 'Executive Engineer (Road Maintenance)',
    points: 180,
    isDemo: true,
  },
  field_worker: {
    id: 'usr-worker-road',
    name: 'Anand Kumar (Road Repair Specialist)',
    avatar: '🔧',
    role: 'FIELD_WORKER',
    email: 'worker@city.gov',
    departmentId: 'dept-road',
    departmentName: 'Road Maintenance',
    wardId: 'ward-101',
    wardName: 'Indiranagar',
    badgeNumber: 'FW-901',
    designation: 'Senior Road Crew Lead',
    points: 95,
    isDemo: true,
  },
  municipal_admin: {
    id: 'usr-admin-municipal',
    name: 'Commissioner S. Sharma',
    avatar: '🏛️',
    role: 'MUNICIPAL_ADMIN',
    email: 'admin@city.gov',
    departmentId: 'dept-ctrl',
    departmentName: 'Municipal Control Desk',
    wardId: 'ward-101',
    wardName: 'Central Ward',
    badgeNumber: 'IAS-01',
    designation: 'Municipal Commissioner & Control Desk Chief',
    points: 500,
    isDemo: true,
  },
  citizen: {
    id: 'usr-citizen-shaik',
    name: 'shaiksameerbasha072',
    avatar: '🧑',
    role: 'CITIZEN',
    email: 'shaiksameerbasha072@gmail.com',
    wardId: 'ward-101',
    wardName: 'Indiranagar',
    points: 120,
    isDemo: false,
  },
};

function mapPrismaUserToProfile(user: any): SessionProfile {
  let mappedRole: UserRole = 'CITIZEN';
  const rawRole = (user.role || '').toUpperCase();
  if (rawRole === 'DEPARTMENT_OFFICER' || rawRole === 'AUTHORITY' || rawRole === 'OFFICER') {
    mappedRole = 'DEPARTMENT_OFFICER';
  } else if (rawRole === 'FIELD_WORKER' || rawRole === 'WORKER') {
    mappedRole = 'FIELD_WORKER';
  } else if (rawRole === 'MUNICIPAL_ADMIN' || rawRole === 'ADMIN') {
    mappedRole = 'MUNICIPAL_ADMIN';
  } else {
    mappedRole = 'CITIZEN';
  }

  return {
    id: user.id,
    name: user.name || user.email?.split('@')[0] || 'Citizen',
    avatar: user.avatar || '🧑',
    role: mappedRole,
    email: user.email,
    departmentId: user.departmentId ?? undefined,
    departmentName: user.department?.name ?? undefined,
    wardId: user.wardId ?? undefined,
    wardName: user.ward?.name ?? undefined,
    badgeNumber: user.badgeNumber ?? undefined,
    designation: user.designation ?? undefined,
    points: user.points ?? 0,
    reportsCount: user.reportsCount ?? 0,
    verificationsCount: user.verificationsCount ?? 0,
    resolvedImpact: user.resolvedImpact ?? 0,
    isDemo: Boolean(user.isDemo),
  };
}

// Current signed-in profile (server-side, local SQLite backed).
export async function getProfile(forceRealUser = false): Promise<SessionProfile | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('ch_user_id')?.value;
  const demoRole = cookieStore.get('ch_demo_role')?.value?.toLowerCase();

  // 1. If user has an explicit session cookie, load from SQLite
  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { department: true, ward: true },
      });
      if (user) {
        // If forceRealUser is requested or no demo role is set, return real user
        if (forceRealUser || !demoRole || user.role === 'MUNICIPAL_ADMIN' || user.role === 'DEPARTMENT_OFFICER' || user.role === 'FIELD_WORKER') {
          return mapPrismaUserToProfile(user);
        }
      }
    } catch (err) {
      console.error('Error fetching user by ch_user_id:', err);
    }
  }

  // 2. If forceRealUser is requested (e.g. on /profile page), prioritize the real citizen account
  if (forceRealUser) {
    try {
      const citizenUser = await prisma.user.findFirst({
        where: { email: 'shaiksameerbasha072@gmail.com' },
        include: { department: true, ward: true },
      });
      if (citizenUser) return mapPrismaUserToProfile(citizenUser);
    } catch {
      // fallback
    }
    return DEMO_PROFILES.citizen;
  }

  // 3. If demo mode is active via cookie (officer/worker/admin)
  if (demoRole) {
    let normalizedRole = 'CITIZEN';
    if (demoRole === 'authority' || demoRole === 'officer' || demoRole === 'department_officer') {
      normalizedRole = 'DEPARTMENT_OFFICER';
    } else if (demoRole === 'worker' || demoRole === 'field_worker') {
      normalizedRole = 'FIELD_WORKER';
    } else if (demoRole === 'admin' || demoRole === 'municipal_admin') {
      normalizedRole = 'MUNICIPAL_ADMIN';
    }

    try {
      const demoUser = await prisma.user.findFirst({
        where: { role: normalizedRole, isDemo: true },
        include: { department: true, ward: true },
      });
      if (demoUser) return mapPrismaUserToProfile(demoUser);
    } catch (err) {
      console.error('Error fetching demo user from SQLite:', err);
    }

    if (DEMO_PROFILES[demoRole]) {
      return DEMO_PROFILES[demoRole];
    }
  }

  // 4. Default signed-in user for local development: shaiksameerbasha072
  try {
    const defaultCitizen = await prisma.user.findFirst({
      where: { email: 'shaiksameerbasha072@gmail.com' },
      include: { department: true, ward: true },
    });
    if (defaultCitizen) return mapPrismaUserToProfile(defaultCitizen);
  } catch {
    // fallback
  }

  return DEMO_PROFILES.citizen;
}

export async function getUserId(): Promise<string | null> {
  const profile = await getProfile();
  return profile?.id ?? null;
}

export async function isAuthority(): Promise<boolean> {
  const role = (await getProfile())?.role;
  return role === 'authority' || role === 'DEPARTMENT_OFFICER' || role === 'MUNICIPAL_ADMIN';
}

export async function isOfficer(): Promise<boolean> {
  const role = (await getProfile())?.role;
  return role === 'DEPARTMENT_OFFICER' || role === 'authority';
}

export async function isWorker(): Promise<boolean> {
  const role = (await getProfile())?.role;
  return role === 'FIELD_WORKER';
}

export async function isAdmin(): Promise<boolean> {
  const role = (await getProfile())?.role;
  return role === 'MUNICIPAL_ADMIN';
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
