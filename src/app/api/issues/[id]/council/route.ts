import { runCouncil, type WorkloadContext } from '@/lib/council';
import { applyCouncilVerdict, getIssue, listIssues } from '@/lib/data';
import { clientIp, rateLimit, tooMany } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Convenes the AI Council on an issue and streams the three-agent debate as
// NDJSON: turn → turn → turn → verdict. The verdict is applied to the issue
// with an "AI Council" timeline entry, so the negotiation is fully auditable.
export async function POST(req: Request, ctx: RouteContext<'/api/issues/[id]/council'>) {
  const rl = rateLimit(`council:${clientIp(req)}`, 4, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, 'The council is deliberating — please wait a moment.');

  const { id } = await ctx.params;
  const issue = await getIssue(id);
  if (!issue) return Response.json({ error: 'Not found' }, { status: 404 });

  // Live workload snapshot the Resource Allocator argues from.
  const open = (await listIssues()).filter((i) => i.status !== 'Resolved');
  const deptOpen = open.filter((i) => i.department === issue.department);
  const workload: WorkloadContext = {
    departmentOpen: deptOpen.length,
    departmentEscalated: deptOpen.filter((i) => i.escalated).length,
    cityOpen: open.length,
    cityCritical: open.filter((i) => i.severity === 'Critical').length,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runCouncil(issue, workload)) {
          if (event.type === 'verdict') {
            const { finalPriority, finalSlaHours, ruling } = event.verdict;
            const changed =
              finalPriority !== issue.priority || finalSlaHours !== issue.slaHours;
            if (changed && issue.status !== 'Resolved') {
              await applyCouncilVerdict(
                issue.id,
                finalPriority,
                finalSlaHours,
                `AI Council verdict: priority ${issue.priority} → ${finalPriority}/100, SLA ${issue.slaHours}h → ${finalSlaHours}h. ${ruling}`,
              );
            }
            controller.enqueue(
              encoder.encode(JSON.stringify({ ...event, applied: changed && issue.status !== 'Resolved' }) + '\n'),
            );
          } else {
            controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'error', message: String(err) }) + '\n'),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
