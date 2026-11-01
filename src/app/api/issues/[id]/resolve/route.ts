import fs from 'node:fs';
import path from 'node:path';
import { Type } from '@google/genai';
import { getIssue, resolveWithProof } from '@/lib/data';
import { isAuthority } from '@/lib/auth';
import { genContent, hasGemini, MODEL, parseJson } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Inline { mimeType: string; data: string }

async function urlToInline(url: string): Promise<Inline | null> {
  try {
    if (url.startsWith('data:')) {
      const m = url.match(/^data:(.*?);base64,(.*)$/);
      return m ? { mimeType: m[1], data: m[2] } : null;
    }
    const r = await fetch(url);
    const buf = Buffer.from(await r.arrayBuffer());
    return { mimeType: r.headers.get('content-type') || 'image/jpeg', data: buf.toString('base64') };
  } catch {
    return null;
  }
}

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    resolved: { type: Type.BOOLEAN },
    confidence: { type: Type.NUMBER },
    note: { type: Type.STRING },
  },
  required: ['resolved', 'confidence', 'note'],
};

export async function POST(req: Request, ctx: RouteContext<'/api/issues/[id]/resolve'>) {
  const { id } = await ctx.params;
  const issue = await getIssue(id);
  if (!issue) return Response.json({ error: 'Not found' }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'Expected multipart form data' }, { status: 400 });
  }
  const after = form.get('image') as File | null;
  if (!after) return Response.json({ error: 'An "after" photo is required' }, { status: 400 });

  const buf = Buffer.from(await after.arrayBuffer());
  const mimeType = after.type || 'image/jpeg';
  const afterB64 = buf.toString('base64');

  // Save after photo locally to public/uploads/resolutions/
  let afterUrl: string | undefined;
  try {
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const filename = `after-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resolutions');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buf);
    afterUrl = `/uploads/resolutions/${filename}`;
  } catch (err) {
    console.error('after-photo local save failed, falling back to data URL:', err);
    afterUrl = `data:${mimeType};base64,${afterB64}`;
  }

  // Gemini Vision: compare before vs after to confirm a genuine fix.
  let verified = true;
  let confidence = 0.6;
  let note = 'Resolution recorded.';
  if (hasGemini()) {
    try {
      const before = issue.imageDataUrl ? await urlToInline(issue.imageDataUrl) : null;
      const prompt = before
        ? `You verify civic-issue resolution. The ORIGINAL image is the reported problem ("${issue.title}", category ${issue.category}). The AFTER image is the crew's photo. Has the issue been genuinely fixed? Be strict: if the AFTER photo does not clearly show the same problem resolved, set resolved=false. confidence 0..1. note = one short sentence.`
        : `You verify civic-issue resolution for "${issue.title}" (category ${issue.category}). The image is the crew's AFTER photo. Does it show the area clean/fixed with no visible problem? resolved boolean, confidence 0..1, note one sentence.`;
      const parts: Array<{ text?: string; inlineData?: Inline }> = [{ text: prompt }];
      if (before) {
        parts.push({ text: 'ORIGINAL:' }, { inlineData: before });
      }
      parts.push({ text: 'AFTER:' }, { inlineData: { mimeType, data: afterB64 } });

      const res = await genContent({
        model: MODEL,
        contents: [{ role: 'user', parts }],
        config: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.2 },
      });
      const v = parseJson<{ resolved: boolean; confidence: number; note: string }>(res.text ?? '', {
        resolved: true,
        confidence: 0.6,
        note,
      });
      verified = Boolean(v.resolved);
      confidence = Math.max(0, Math.min(1, Number(v.confidence) || 0.6));
      note = v.note || note;
    } catch (err) {
      console.error('resolution verification failed', err);
    }
  }

  const updated = await resolveWithProof(id, { afterImageUrl: afterUrl, verified, confidence, note });
  return Response.json({ issue: updated, verified, confidence, note });
}
