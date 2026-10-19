type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();
const LIMIT = 20;
const WINDOW = 60_000;
// Keep this isolate-local fallback bounded. Cloudflare may run multiple isolates,
// so this is defense-in-depth rather than a globally shared rate limiter.
const MAX_KEYS = 10_000;
let callsSinceSweep = 0;

function sweepExpired(now: number) {
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export function rateLimit(key: string, limit = LIMIT, windowMs = WINDOW) {
  const now = Date.now();

  // Avoid scanning the full map on every request while still reclaiming expired keys.
  callsSinceSweep++;
  if (callsSinceSweep >= 64) {
    sweepExpired(now);
    callsSinceSweep = 0;
  }

  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    // Prevent unbounded memory growth if an attacker rotates source keys.
    if (store.size >= MAX_KEYS) {
      const oldestKey = store.keys().next().value;
      if (oldestKey !== undefined) store.delete(oldestKey);
    }
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  current.count++;
  if (current.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}
