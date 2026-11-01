import { escalateOverdue } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function POST() {
  const escalated = await escalateOverdue();
  return Response.json({ escalated });
}
