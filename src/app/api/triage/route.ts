import fs from 'node:fs';
import path from 'node:path';
import { runTriageAgent, type TriageInput } from '@/lib/agent';
import { nearestLocality, resolveLocation } from '@/lib/geo';
import { getProfile } from '@/lib/auth';
import { clientIp, rateLimit, tooMany } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Streams the Civic Triage Agent's work as newline-delimited JSON so the client
// can render each reasoning/tool step live, then a final result event.
export async function POST(req: Request) {
  const rl = rateLimit(`triage:${clientIp(req)}`, 8, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, "You're reporting very fast — please wait a moment and try again.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const image = form.get('image') as File | null;
  const locationText = ((form.get('location') as string) || '').trim();
  const notes = ((form.get('notes') as string) || '').trim();
  const language = ((form.get('language') as string) || 'English').trim();
  const lat = parseFloat(form.get('lat') as string);
  const lng = parseFloat(form.get('lng') as string);

  if (!image) {
    return Response.json({ error: 'An image is required' }, { status: 400 });
  }

  // Identify the reporter (if signed in).
  const formReporter = ((form.get('reporter') as string) || '').trim();
  const formReporterId = ((form.get('reporterId') as string) || '').trim();
  const profile = await getProfile();
  const reporter =
    formReporter || profile?.name || 'shaiksameerbasha072';
  const reporterId = formReporterId || profile?.id || null;

  // Resolve a coordinate + human-readable location.
  let geo;
  let location = locationText;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    geo = { lat, lng };
    if (!location) location = `${nearestLocality(geo).name}, Bengaluru`;
  } else {
    const resolved = resolveLocation(locationText);
    geo = resolved.geo;
    location = resolved.name.includes(',') ? resolved.name : `${resolved.name}, Bengaluru`;
  }

  const arrayBuffer = await image.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  const mimeType = image.type || 'image/jpeg';

  // Save photo locally in development, use data URL in serverless (e.g. Vercel)
  let imageUrl: string | undefined;
  if (!process.env.VERCEL) {
    try {
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const filename = `complaint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'complaints');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);
      imageUrl = `/uploads/complaints/${filename}`;
    } catch {
      imageUrl = `data:${mimeType};base64,${base64}`;
    }
  } else {
    imageUrl = `data:${mimeType};base64,${base64}`;
  }

  const input: TriageInput = {
    imageBase64: base64,
    mimeType,
    imageDataUrl: `data:${mimeType};base64,${base64}`,
    imageUrl,
    location,
    geo,
    notes,
    reporter,
    reporterId,
    language,
    appeal: form.get('appeal') === '1',
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runTriageAgent(input)) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
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
