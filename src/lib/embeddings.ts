import { gemini, hasGemini, withTimeout } from './gemini';

// Gemini text embeddings — used for semantic duplicate detection (matching
// reports by meaning, not just GPS distance or category).
const EMBED_MODEL = 'gemini-embedding-001';

export async function embedMany(
  texts: string[],
  dims?: number,
): Promise<(number[] | null)[]> {
  if (!hasGemini() || texts.length === 0) return texts.map(() => null);
  try {
    const call = gemini().models.embedContent({
      model: EMBED_MODEL,
      contents: texts,
      config: {
        taskType: 'SEMANTIC_SIMILARITY',
        ...(dims ? { outputDimensionality: dims } : {}),
      },
    });
    const res = await withTimeout(call, 3000);
    return texts.map((_, i) => res.embeddings?.[i]?.values ?? null);
  } catch (err) {
    // Non-blocking fallback: geo-proximity matching handles duplicate detection seamlessly
    return texts.map(() => null);
  }
}

/** Dimensionality stored in the DB (see supabase/migrations/0005). */
export const DB_EMBED_DIMS = 768;

/** Single 768-dim embedding for DB storage / pgvector matching. */
export async function embedForDb(text: string): Promise<number[] | null> {
  const [v] = await embedMany([text], DB_EMBED_DIMS);
  return v;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}
