import { escalateOverdue, getHotspots, getStats } from '@/lib/data';

export const dynamic = 'force-dynamic';

// Throttle opportunistic escalation so frequent dashboard refreshes don't hammer it.
let lastEscalate = 0;

export async function GET() {
  if (Date.now() - lastEscalate > 30_000) {
    lastEscalate = Date.now();
    await escalateOverdue().catch(() => {});
  }
  const [stats, hotspots] = await Promise.all([getStats(), getHotspots()]);
  return Response.json({ stats, hotspots });
}
