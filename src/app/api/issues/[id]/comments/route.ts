import { addComment, getComments } from '@/lib/repo';
import { getProfile } from '@/lib/auth';
import { supabaseEnabled } from '@/lib/config';
import { clientIp, rateLimit, tooMany } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: RouteContext<'/api/issues/[id]/comments'>) {
  const { id } = await ctx.params;
  if (!supabaseEnabled()) return Response.json({ comments: [] });
  return Response.json({ comments: await getComments(id) });
}

export async function POST(req: Request, ctx: RouteContext<'/api/issues/[id]/comments'>) {
  const rl = rateLimit(`comment:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const { id } = await ctx.params;
  if (!supabaseEnabled()) return Response.json({ error: 'Unavailable' }, { status: 400 });

  const profile = await getProfile();
  if (!profile) return Response.json({ error: 'Sign in to comment' }, { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const body = String(payload?.body ?? '').trim();
  if (!body) return Response.json({ error: 'Empty comment' }, { status: 400 });

  const comment = await addComment(id, profile.id, profile.name, body.slice(0, 1000));
  if (!comment) return Response.json({ error: 'Could not post comment' }, { status: 500 });
  return Response.json({ comment });
}
