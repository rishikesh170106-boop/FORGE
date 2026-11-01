import { createIssue, getIssue } from '@/lib/data';
import { addIssue } from '@/lib/store';
import type { Issue } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Issue;
    if (!body || !body.id) {
      return Response.json({ error: 'Invalid issue payload' }, { status: 400 });
    }

    // Check if issue already exists
    const existing = await getIssue(body.id);
    if (existing) {
      return Response.json({ success: true, issue: existing });
    }

    // Sync to in-memory store
    try {
      addIssue(body);
    } catch {}

    return Response.json({ success: true, issue: body });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

