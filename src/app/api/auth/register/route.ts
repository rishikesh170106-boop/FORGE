import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { name, email, password, role = 'CITIZEN' } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const displayName = name ? String(name).trim() : cleanEmail.split('@')[0];

    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        name: displayName,
        role: role.toUpperCase(),
        avatar: role.toUpperCase() === 'CITIZEN' ? '🧑' : '👷',
        points: 25, // initial bonus points for signing up
        isDemo: false,
      },
    });

    const cookieStore = await cookies();
    cookieStore.set('ch_user_id', newUser.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      httpOnly: false,
    });
    cookieStore.delete('ch_demo_role');

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
        points: newUser.points,
      },
      redirectUrl: '/dashboard',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Registration failed' },
      { status: 500 },
    );
  }
}

