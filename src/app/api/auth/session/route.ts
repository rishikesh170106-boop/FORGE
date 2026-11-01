import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const profile = await getProfile();
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to retrieve session' },
      { status: 500 },
    );
  }
}

