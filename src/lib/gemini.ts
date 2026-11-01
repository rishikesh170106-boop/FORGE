import { GoogleGenAI } from '@google/genai';

// Single Gemini client. The key is read server-side only and never reaches the
// browser. Google AI Studio injects GEMINI_API_KEY at deploy time.
// flash-lite has the most generous free-tier limits and supports vision, tools
// and structured output — ideal for the multi-call agent on a free key.
export const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

let client: GoogleGenAI | null = null;

export function gemini(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export function hasGemini(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

type GenParams = Parameters<ReturnType<typeof gemini>['models']['generateContent']>[0];
type GenResult = Awaited<ReturnType<ReturnType<typeof gemini>['models']['generateContent']>>;

const isRateLimit = (err: unknown): boolean => {
  const m = String((err as { message?: string })?.message ?? err).toLowerCase();
  return (
    m.includes('429') ||
    m.includes('resource_exhausted') ||
    m.includes('quota') ||
    // transient upstream overload — retry these too
    m.includes('503') ||
    m.includes('unavailable') ||
    m.includes('overloaded') ||
    m.includes('high demand')
  );
};

/** generateContent with automatic backoff on free-tier 429s and transient 503s. */
export async function genContent(params: GenParams, retries = 2): Promise<GenResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await gemini().models.generateContent(params);
    } catch (err) {
      if (!isRateLimit(err) || attempt >= retries) throw err;
      const msg = String((err as { message?: string })?.message ?? err);
      const m = msg.match(/retry in ([\d.]+)s/i);
      const waitMs = Math.min(15000, m ? Math.ceil(parseFloat(m[1]) * 1000) + 600 : 8000);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

/** Strip markdown fences and parse JSON, tolerating chatty model output. */
export function parseJson<T>(text: string, fallback: T): T {
  try {
    const clean = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const start = clean.indexOf('{');
    const startArr = clean.indexOf('[');
    const from =
      startArr !== -1 && (startArr < start || start === -1) ? startArr : start;
    return JSON.parse(from > 0 ? clean.slice(from) : clean) as T;
  } catch {
    return fallback;
  }
}
