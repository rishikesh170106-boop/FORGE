import { verifyIssue } from '@/lib/data';
import { getUserId } from '@/lib/auth';
import { supabaseEnabled } from '@/lib/config';
import { clientIp, rateLimit, tooMany } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: RouteContext<'/api/issues/[id]/verify'>) {
  const rl = rateLimit(`verify:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const { id } = await ctx.params;

  let userId: string | undefined;
  if (supabaseEnabled()) {
    userId = (await getUserId()) ?? undefined;
    if (!userId) {
      return Response.json({ error: 'Sign in to verify issues' }, { status: 401 });
    }
  }

  const issue = await verifyIssue(id, userId);
  if (!issue) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ issue });
}
