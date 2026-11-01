// Lightweight in-memory rate limiter (per running instance). Good enough to stop
// abuse / runaway Gemini cost on a hackathon deploy; swap for Redis/Upstash for
// multi-instance production.
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, retryAfter: 0 };
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'anon'
  );
}

export function tooMany(retryAfter: number, message = 'Too many requests — please slow down.') {
  return Response.json({ error: message }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
}
