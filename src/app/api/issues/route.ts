import { listIssues } from '@/lib/data';
import type { IssueCategory, IssueStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const issues = await listIssues({
    category: (searchParams.get('category') as IssueCategory) || 'all',
    status: (searchParams.get('status') as IssueStatus) || 'all',
    q: searchParams.get('q') || undefined,
  });
  return Response.json({ issues });
}
