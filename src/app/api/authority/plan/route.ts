import { Type } from '@google/genai';
import { genContent, hasGemini, MODEL, parseJson } from '@/lib/gemini';
import { listIssues } from '@/lib/data';
import { isAuthority } from '@/lib/auth';
import { supabaseEnabled } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PlanItem {
  ref: string;
  title: string;
  action: string;
  rationale: string;
  order: number;
}

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    plan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ref: { type: Type.STRING },
          title: { type: Type.STRING },
          action: { type: Type.STRING },
          rationale: { type: Type.STRING },
          order: { type: Type.INTEGER },
        },
        required: ['ref', 'title', 'action', 'rationale', 'order'],
      },
    },
  },
  required: ['summary', 'plan'],
};

// The "Civic Ops Co-pilot" — an agent that plans a city-wide dispatch order
// across ALL open issues (agentic reasoning over the whole dataset).
export async function POST() {
  if (supabaseEnabled() && !(await isAuthority())) {
    return Response.json({ error: 'Authority role required' }, { status: 403 });
  }

  const open = (await listIssues())
    .filter((i) => i.status !== 'Resolved')
    .slice(0, 20);

  if (!hasGemini() || open.length === 0) {
    return Response.json({ ai: false, ...fallback(open) });
  }

  const compact = open.map((i) => ({
    ref: i.ref ?? i.id,
    title: i.title,
    category: i.category,
    severity: i.severity,
    priority: i.priority,
    location: i.location,
    department: i.department,
    slaHours: i.slaHours,
    ageHours: Math.round((Date.now() - new Date(i.createdAt).getTime()) / 3.6e6),
    status: i.status,
  }));

  const prompt = `You are the city's Operations Chief. From the OPEN issues below, produce an actionable dispatch plan for today's crews.
Rules:
- Put SLA breaches and Critical/High safety risks first.
- Where issues are in the same area, batch them for one crew run and say so.
- Keep the plan to the 8 most important items.
- "action" = the concrete next step (e.g., "Dispatch road crew + barricade", "Send BWSSB valve team").
- "rationale" = one short sentence referencing priority/SLA/area.
- "order" = 1..n execution order.
Also give a 1-2 sentence "summary" for the ops lead.

OPEN ISSUES: ${JSON.stringify(compact)}`;

  try {
    const res = await genContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.4 },
    });
    const data = parseJson<{ summary: string; plan: PlanItem[] }>(res.text ?? '', { summary: '', plan: [] });
    if (!data.plan?.length) throw new Error('empty plan');
    return Response.json({ ai: true, summary: data.summary, plan: data.plan.slice(0, 8) });
  } catch (err) {
    console.error('ops plan failed', err);
    return Response.json({ ai: false, ...fallback(open) });
  }
}

function fallback(open: Awaited<ReturnType<typeof listIssues>>) {
  return {
    summary: 'Prioritised by AI priority score and SLA urgency.',
    plan: open.slice(0, 8).map((i, idx) => ({
      ref: i.ref ?? i.id,
      title: i.title,
      action: `Dispatch ${i.department}`,
      rationale: `Priority ${i.priority}/100 · ${i.severity}`,
      order: idx + 1,
    })),
  };
}
