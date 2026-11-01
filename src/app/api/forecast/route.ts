import { Type } from '@google/genai';
import { genContent, hasGemini, MODEL, parseJson } from '@/lib/gemini';
import { getHotspots, listIssues } from '@/lib/data';

export const dynamic = 'force-dynamic';

interface Forecast {
  area: string;
  predictedCategory: string;
  riskScore: number;
  reason: string;
  timeframe: string;
}

const SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      area: { type: Type.STRING },
      predictedCategory: { type: Type.STRING },
      riskScore: { type: Type.INTEGER },
      reason: { type: Type.STRING },
      timeframe: { type: Type.STRING },
    },
    required: ['area', 'predictedCategory', 'riskScore', 'reason', 'timeframe'],
  },
};

// 60s in-process cache so the dashboard's realtime refreshes don't burn quota.
let cache: { at: number; data: { ai: boolean; forecast: Forecast[] } } | null = null;

interface AreaSummary {
  area: string;
  recent: number;
  open: number;
  critical: number;
  total: number;
  topCategory: string;
}

export async function GET() {
  if (cache && Date.now() - cache.at < 60_000) return Response.json(cache.data);

  const [issues, hotspots] = await Promise.all([listIssues(), getHotspots()]);
  const now = Date.now();
  const areas = new Map<string, { recent: number; open: number; critical: number; total: number; cats: Record<string, number> }>();
  for (const i of issues) {
    const a = i.location.split(',')[0].trim() || 'Unknown';
    const e = areas.get(a) ?? { recent: 0, open: 0, critical: 0, total: 0, cats: {} };
    e.total += 1;
    if (now - new Date(i.createdAt).getTime() < 48 * 3.6e6) e.recent += 1;
    if (i.status !== 'Resolved') e.open += 1;
    if (i.severity === 'Critical') e.critical += 1;
    e.cats[i.category] = (e.cats[i.category] ?? 0) + 1;
    areas.set(a, e);
  }
  const summary: AreaSummary[] = [...areas.entries()].map(([area, e]) => ({
    area,
    recent: e.recent,
    open: e.open,
    critical: e.critical,
    total: e.total,
    topCategory: Object.entries(e.cats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Pothole',
  }));

  let data: { ai: boolean; forecast: Forecast[] } | null = null;
  if (hasGemini() && summary.length) {
    try {
      const prompt = `You are a city operations forecaster. From the area history below, predict the 4 areas most likely to see NEW or worsening civic issues next, and why. Reference the numbers. riskScore is 0-100. timeframe like "next 3 days" / "this week". predictedCategory must be a real civic category.
AREAS: ${JSON.stringify(summary)}
HOTSPOTS: ${JSON.stringify(hotspots.slice(0, 6))}`;
      const res = await genContent({
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.5 },
      });
      const fc = parseJson<Forecast[]>(res.text ?? '', []);
      if (fc.length) data = { ai: true, forecast: fc.slice(0, 5).map((f) => ({ ...f, riskScore: clamp(f.riskScore) })) };
    } catch (err) {
      console.error('forecast generation failed', err);
    }
  }
  if (!data) data = { ai: false, forecast: fallback(summary) };

  cache = { at: Date.now(), data };
  return Response.json(data);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}

function fallback(summary: AreaSummary[]): Forecast[] {
  return summary
    .map((s) => ({
      area: s.area,
      predictedCategory: s.topCategory,
      riskScore: clamp(s.recent * 20 + s.open * 8 + s.critical * 15 + 15),
      reason: `${s.open} open, ${s.recent} reported in 48h${s.critical ? `, ${s.critical} critical` : ''} — momentum suggests continued ${s.topCategory.toLowerCase()} reports.`,
      timeframe: 'this week',
    }))
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5);
}
