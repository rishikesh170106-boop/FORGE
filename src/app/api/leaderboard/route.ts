import { getLeaderboard } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ citizens: await getLeaderboard() });
}
