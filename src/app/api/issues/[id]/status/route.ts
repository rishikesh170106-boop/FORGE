import { advanceStatus, setStatus } from '@/lib/data';
import { isAuthority } from '@/lib/auth';
import { supabaseEnabled } from '@/lib/config';
import type { IssueStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Authority action: set/advance an issue's lifecycle stage.
export async function POST(req: Request, ctx: RouteContext<'/api/issues/[id]/status'>) {
  const { id } = await ctx.params;

  if (supabaseEnabled() && !(await isAuthority())) {
    return Response.json({ error: 'Authority role required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as { status?: IssueStatus; note?: string }));
  const issue = body.status
    ? await setStatus(id, body.status, body.note, 'Authority')
    : await advanceStatus(id, body.note, 'Authority');

  if (!issue) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ issue });
}
