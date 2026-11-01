import { disputeIssue } from '@/lib/data';
import { getUserId } from '@/lib/auth';
import { supabaseEnabled } from '@/lib/config';
import { clientIp, rateLimit, tooMany } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Community consensus — the counterweight to verification. Neighbours who
// believe a report is wrong or stale can dispute it; 3 disputes flag the issue
// for review, so spam can't crowd out real problems.
export async function POST(req: Request, ctx: RouteContext<'/api/issues/[id]/dispute'>) {
  const rl = rateLimit(`dispute:${clientIp(req)}`, 15, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const { id } = await ctx.params;

  if (supabaseEnabled()) {
    const userId = await getUserId();
    if (!userId) {
      return Response.json({ error: 'Sign in to dispute issues' }, { status: 401 });
    }
  }

  const issue = await disputeIssue(id);
  if (!issue) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ issue });
}
