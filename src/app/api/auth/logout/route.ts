import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('ch_user_id');
  cookieStore.delete('ch_demo_role');

  return NextResponse.json({ success: true });
}

