// ============================================================
// VoxPrompt – In-Memory Rate Limiter (sliding window)
// ============================================================
// NOTE: This is process-local and resets on restart.
// For multi-instance production deployments, replace the
// `store` with a Redis/Upstash adapter.

interface WindowEntry {
  timestamps: number[]; // sorted list of request timestamps
}

const store = new Map<string, WindowEntry>();

// Periodic cleanup to prevent memory leaks in long-running processes
const CLEANUP_INTERVAL_MS = 5 * 60_000; // every 5 minutes
let cleanupTimer: ReturnType<typeof setInterval> | undefined;

function scheduleCleanup(windowMs: number) {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - windowMs * 2;
    for (const [key, entry] of Array.from(store.entries())) {
      const recent = entry.timestamps.filter((t: number) => t > cutoff);
      if (recent.length === 0) {
        store.delete(key);
      } else {
        entry.timestamps = recent;
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't keep the process alive just for cleanup
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    (cleanupTimer as NodeJS.Timeout).unref();
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number; // Unix ms timestamp
  limit: number;
}

/**
 * Check and record a rate-limited request.
 *
 * @param identifier  Unique key, e.g. IP address + route
 * @param limit       Max requests allowed in the window
 * @param windowMs    Window duration in milliseconds
 */
export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60_000
): RateLimitResult {
  scheduleCleanup(windowMs);

  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= limit) {
    // Return the time when the oldest request will expire
    const resetAt = entry.timestamps[0] + windowMs;
    return { success: false, remaining: 0, resetAt, limit };
  }

  entry.timestamps.push(now);
  const remaining = limit - entry.timestamps.length;
  const resetAt = entry.timestamps[0] + windowMs;

  return { success: true, remaining, resetAt, limit };
}

/**
 * Extract the best-effort client IP from a Next.js Request.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') || // Cloudflare
    'unknown'
  );
}
