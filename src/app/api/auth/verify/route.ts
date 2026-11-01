import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { email, otp } = await request.json();

  if (!email || !otp) {
    return NextResponse.json({ error: 'Missing email or otp' }, { status: 400 });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  let user = await prisma.user.findFirst({
    where: { OR: [{ email: cleanEmail }, { email: { contains: cleanEmail } }] },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: cleanEmail,
        password: '$2b$10$67O1/xy5IZFq34RW4tGAU.qP7cvr7DOjlepbmQdT0fKWGqCb1c7r.',
        name: cleanEmail.split('@')[0],
        role: 'CITIZEN',
        avatar: '🧑',
        points: 50,
        isDemo: false,
      },
    });
  }

  const response = NextResponse.json({ success: true, user });
  response.cookies.set('ch_user_id', user.id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    httpOnly: false,
  });

  return response;
}
