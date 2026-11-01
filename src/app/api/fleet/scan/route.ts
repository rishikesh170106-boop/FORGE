import { Type } from '@google/genai';
import { genContent, hasGemini, MODEL, parseJson } from '@/lib/gemini';
import { CATEGORIES, DEPARTMENTS, computePriority } from '@/lib/departments';
import { createIssue, findNearbyDuplicates } from '@/lib/data';
import { nearestLocality } from '@/lib/geo';
import { clientIp, rateLimit, tooMany } from '@/lib/rateLimit';
import type { IssueCategory, Severity } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Fleet Watch — passive crowdsourcing via dashcams. Partner fleet vehicles
// (delivery bikes, garbage trucks) stream road frames here; Gemini Vision scans
// each frame and confident detections are auto-filed as geo-tagged reports.
// No citizen action required: the city inspects itself while traffic moves.

const SEVERITIES: Severity[] = ['Low', 'Medium', 'High', 'Critical'];

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isCivicIssue: { type: Type.BOOLEAN },
    category: { type: Type.STRING, enum: CATEGORIES as string[] },
    severity: { type: Type.STRING, enum: SEVERITIES as string[] },
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    safetyRisk: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
  },
  required: ['isCivicIssue', 'category', 'severity', 'title', 'description', 'safetyRisk', 'confidence'],
};

const MIN_CONFIDENCE = 0.55;

export async function POST(req: Request) {
  const rl = rateLimit(`fleet:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, 'Fleet scanner is rate-limited — slow down a little.');

  if (!hasGemini()) {
    return Response.json({
      detected: false,
      reason: 'Fleet Watch needs Gemini Vision — set GEMINI_API_KEY to scan dashcam frames.',
    });
  }

  let body: {
    imageBase64?: string;
    mimeType?: string;
    lat?: number;
    lng?: number;
    vehicle?: string;
    autoFile?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Expected JSON body' }, { status: 400 });
  }
  if (!body.imageBase64 || !Number.isFinite(body.lat) || !Number.isFinite(body.lng)) {
    return Response.json({ error: 'imageBase64, lat and lng are required' }, { status: 400 });
  }
  const geo = { lat: body.lat as number, lng: body.lng as number };
  const vehicle = (body.vehicle || 'Fleet Dashcam #07').slice(0, 40);

  // 1) Gemini Vision scans the frame like a roving municipal inspector.
  let det: {
    isCivicIssue: boolean;
    category: IssueCategory;
    severity: Severity;
    title: string;
    description: string;
    safetyRisk: string;
    confidence: number;
  };
  try {
    const res = await genContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                `You are an edge-AI municipal road inspector analysing a single dashcam frame from a moving fleet vehicle. ` +
                `Frames may have motion blur, glare or windshield reflections. ` +
                `Flag isCivicIssue=true ONLY if the frame clearly shows a public infrastructure problem (pothole, garbage pile/overflow, water leak/flooding, fallen tree or branch, broken streetlight, blocked drain, stray cattle on the road, illegal dumping). ` +
                `Ordinary traffic, parked vehicles, pedestrians, shadows and wet-but-intact roads are NOT issues. ` +
                `Be conservative: prefer isCivicIssue=false when unsure. ` +
                `confidence is 0..1 for the detection. title is a crisp 4-7 word headline; description is 1-2 factual sentences; safetyRisk is one short sentence (or "No immediate safety risk").`,
            },
            { inlineData: { data: body.imageBase64, mimeType: body.mimeType || 'image/jpeg' } },
          ],
        },
      ],
      config: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.1 },
    });
    const p = parseJson<Partial<typeof det>>(res.text ?? '', {});
    det = {
      isCivicIssue: p.isCivicIssue ?? false,
      category: (CATEGORIES as string[]).includes(p.category as string) ? (p.category as IssueCategory) : 'Other',
      severity: SEVERITIES.includes(p.severity as Severity) ? (p.severity as Severity) : 'Medium',
      title: (p.title ?? 'Road issue detected').slice(0, 80),
      description: p.description ?? 'Detected from a fleet dashcam frame.',
      safetyRisk: p.safetyRisk ?? 'Pending field confirmation.',
      confidence: typeof p.confidence === 'number' ? Math.max(0, Math.min(1, p.confidence)) : 0,
    };
  } catch (err) {
    console.error('fleet scan failed', err);
    return Response.json({ detected: false, reason: 'Vision scan failed — frame skipped.' });
  }

  if (!det.isCivicIssue || det.confidence < MIN_CONFIDENCE) {
    return Response.json({ detected: false, confidence: det.confidence });
  }

  // 2) Geo dedup — a fleet pass shouldn't refile what neighbours already reported.
  const dups = await findNearbyDuplicates(det.category, geo, 150);
  if (dups.length) {
    const nearest = dups[0];
    return Response.json({
      detected: true,
      filed: false,
      linkedTo: { id: nearest.issue.id, ref: nearest.issue.ref ?? nearest.issue.id, title: nearest.issue.title },
      category: det.category,
      severity: det.severity,
      title: det.title,
      confidence: det.confidence,
      note: `Matches an open report ${Math.round(nearest.distanceM)}m away — signal strengthened instead of duplicated.`,
    });
  }

  // 3) Auto-file the work order (default on — that's the moonshot).
  if (body.autoFile === false) {
    return Response.json({
      detected: true,
      filed: false,
      category: det.category,
      severity: det.severity,
      title: det.title,
      confidence: det.confidence,
    });
  }

  const dept = DEPARTMENTS[det.category];
  const hasRisk = !/no (immediate )?(safety )?risk/i.test(det.safetyRisk);
  const priority = computePriority({
    severity: det.severity,
    duplicateCount: 0,
    slaHours: dept.slaHours,
    hasSafetyRisk: hasRisk,
  });
  const location = `${nearestLocality(geo).name}, Bengaluru`;

  const issue = await createIssue({
    title: det.title,
    description: `${det.description} (Detected autonomously by ${vehicle} during a fleet pass.)`,
    category: det.category,
    severity: det.severity,
    status: 'Reported',
    priority,
    confidence: det.confidence,
    safetyRisk: det.safetyRisk,
    tags: ['fleet', 'dashcam', det.category.toLowerCase().split(' ')[0]],
    location,
    geo,
    department: dept.name,
    slaHours: dept.slaHours,
    advisory: `Detected automatically by a partner fleet dashcam and routed to ${dept.name}. Target resolution within ${dept.slaHours}h.`,
    imageUrl: `data:${body.mimeType || 'image/jpeg'};base64,${body.imageBase64}`,
    reporter: vehicle,
    reporterId: null,
    recommendedAction:
      det.severity === 'Critical' || det.severity === 'High'
        ? 'Dispatch a field crew on priority.'
        : 'Schedule inspection within the SLA window.',
  });

  return Response.json({
    detected: true,
    filed: true,
    issue: { id: issue.id, ref: issue.ref ?? issue.id, title: issue.title },
    category: det.category,
    severity: det.severity,
    title: det.title,
    confidence: det.confidence,
    priority,
  });
}
