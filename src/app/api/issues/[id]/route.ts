import { getIssue } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: RouteContext<'/api/issues/[id]'>) {
  const { id } = await ctx.params;
  const issue = await getIssue(id);
  if (!issue) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ issue });
}
