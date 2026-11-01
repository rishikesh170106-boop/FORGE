import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { DEMO_PROFILES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let role = 'authority';
  try {
    const body = await req.json();
    if (body?.role) role = String(body.role).toLowerCase();
  } catch {
    // default to authority
  }

  // Normalize role
  if (role === 'officer' || role === 'department_officer') role = 'authority';
  if (role === 'worker') role = 'field_worker';
  if (role === 'admin') role = 'municipal_admin';

  let targetRolePrisma = 'DEPARTMENT_OFFICER';
  let redirectUrl = '/authority';
  let defaultUserId = 'usr-officer-road';

  if (role === 'field_worker') {
    targetRolePrisma = 'FIELD_WORKER';
    redirectUrl = '/worker';
    defaultUserId = 'usr-worker-road';
  } else if (role === 'municipal_admin') {
    targetRolePrisma = 'MUNICIPAL_ADMIN';
    redirectUrl = '/admin';
    defaultUserId = 'usr-admin-municipal';
  } else if (role === 'citizen') {
    targetRolePrisma = 'CITIZEN';
    redirectUrl = '/dashboard';
    defaultUserId = 'usr-citizen-shaik';
  }

  // Lookup existing user in SQLite
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { role: targetRolePrisma, isDemo: true },
        { id: defaultUserId },
      ],
    },
  });

  const cookieStore = await cookies();
  if (role === 'citizen') {
    cookieStore.delete('ch_demo_role');
  } else {
    cookieStore.set('ch_demo_role', role, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      httpOnly: false,
    });
  }

  if (user) {
    cookieStore.set('ch_user_id', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      httpOnly: false,
    });
  } else {
    cookieStore.set('ch_user_id', defaultUserId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      httpOnly: false,
    });
  }

  return Response.json({
    success: true,
    email: user?.email || (role === 'citizen' ? 'shaiksameerbasha072@gmail.com' : `${role}@city.gov`),
    role,
    redirectUrl,
    otp: '123456',
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('ch_demo_role');
  cookieStore.delete('ch_user_id');
  cookieStore.delete('ch_session');
  return Response.json({ success: true });
}
