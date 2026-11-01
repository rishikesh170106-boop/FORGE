import { GoogleGenAI } from '@google/genai';

// Single Gemini client. The key is read server-side only and never reaches the
// browser. Google AI Studio injects GEMINI_API_KEY at deploy time.
// gemini-2.0-flash is the fastest multimodal model with generous limits.
export const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

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
    m.includes('503') ||
    m.includes('unavailable') ||
    m.includes('overloaded') ||
    m.includes('high demand')
  );
};

/** Run any promise with a strict maximum timeout in ms */
export async function withTimeout<T>(promise: Promise<T>, ms = 7000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
}

/** generateContent with timeout protection and fast single retry to prevent UI hanging. */
export async function genContent(params: GenParams, retries = 1, timeoutMs = 7000): Promise<GenResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      const call = gemini().models.generateContent(params);
      return await withTimeout(call, timeoutMs);
    } catch (err) {
      if (!isRateLimit(err) || attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 1200));
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
