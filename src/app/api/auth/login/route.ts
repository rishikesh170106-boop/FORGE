import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password, code } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanEmail }, { email: { contains: cleanEmail } }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: `User with email "${cleanEmail}" not found. Please register or select a demo account.` },
        { status: 404 },
      );
    }

    // If password provided, check bcrypt hash
    if (password) {
      if (user.password) {
        const valid = await verifyPassword(password, user.password);
        if (!valid) {
          return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
        }
      }
    }

    const cookieStore = await cookies();
    cookieStore.set('ch_user_id', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
      httpOnly: false,
    });
    cookieStore.delete('ch_demo_role');

    let redirectUrl = '/dashboard';
    const roleUpper = user.role.toUpperCase();
    if (roleUpper === 'DEPARTMENT_OFFICER' || roleUpper === 'AUTHORITY') {
      redirectUrl = '/authority';
    } else if (roleUpper === 'FIELD_WORKER' || roleUpper === 'WORKER') {
      redirectUrl = '/worker';
    } else if (roleUpper === 'MUNICIPAL_ADMIN' || roleUpper === 'ADMIN') {
      redirectUrl = '/admin';
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        points: user.points,
      },
      redirectUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Login failed' },
      { status: 500 },
    );
  }
}

