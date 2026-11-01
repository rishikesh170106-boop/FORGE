import { Type } from '@google/genai';
import { genContent, hasGemini, MODEL, parseJson } from '@/lib/gemini';
import { getHotspots, getStats } from '@/lib/data';
import type { Hotspot, Stats } from '@/lib/analytics';
import type { Insight } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        enum: ['hotspot', 'prediction', 'recommendation', 'trend'],
      },
      title: { type: Type.STRING },
      detail: { type: Type.STRING },
      severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
      area: { type: Type.STRING },
    },
    required: ['type', 'title', 'detail', 'severity'],
  },
};

export async function GET() {
  const [stats, hotspots] = await Promise.all([getStats(), getHotspots()]);

  if (!hasGemini()) {
    return Response.json({ insights: fallbackInsights(stats, hotspots), ai: false });
  }

  const prompt = `You are a city operations analyst. From this live civic-issue data, produce 4 concise, decision-ready insights for city officials.
Mix of types: at least one "hotspot", one "prediction" (what is likely to worsen and why), one "recommendation" (a concrete action), and one "trend".
Be specific and reference real numbers/areas from the data. Keep each detail to 1-2 sentences.

STATS: ${JSON.stringify(stats)}
HOTSPOTS: ${JSON.stringify(hotspots)}`;

  try {
    const res = await genContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        temperature: 0.5,
      },
    });
    const insights = parseJson<Insight[]>(res.text ?? '', []);
    if (!insights.length) throw new Error('empty');
    return Response.json({ insights: insights.slice(0, 5), ai: true });
  } catch (err) {
    console.error('insights generation failed', err);
    return Response.json({ insights: fallbackInsights(stats, hotspots), ai: false });
  }
}

function fallbackInsights(stats: Stats, hotspots: Hotspot[]): Insight[] {
  const top = hotspots[0];
  const topCat =
    Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Pothole';
  return [
    top && {
      type: 'hotspot' as const,
      title: `${top.area} is the top hotspot`,
      detail: `${top.area} has ${top.count} reports (${top.openCount} open), led by ${top.topCategory}. Prioritise a focused ward sweep here.`,
      severity: top.maxSeverity,
      area: top.area,
    },
    {
      type: 'prediction' as const,
      title: `${topCat} reports likely to rise`,
      detail: `${topCat} is the most reported category (${stats.byCategory[topCat as keyof typeof stats.byCategory]} cases). Without intervention, expect more reports in adjacent wards within a week.`,
      severity: 'High' as const,
    },
    {
      type: 'recommendation' as const,
      title: 'Clear the critical backlog first',
      detail: `${stats.critical} critical issues are open. Routing crews to these first maximises safety impact per rupee spent.`,
      severity: 'Critical' as const,
    },
    {
      type: 'trend' as const,
      title: 'Resolution throughput',
      detail: `${stats.resolved} resolved with an average turnaround of ${stats.avgResolutionH}h. Community verifications stand at ${stats.verifications}.`,
      severity: 'Medium' as const,
    },
  ].filter(Boolean) as Insight[];
}
