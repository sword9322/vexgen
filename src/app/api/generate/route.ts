// ============================================================
// POST /api/generate
// Converts a transcript + options into a structured prompt.
// Enforces a paywall: 2 free uses per identity, then $5.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { generateSchema } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { generatePrompt } from '@/lib/prompt-builder';
import { getServiceClient, getUserIdFromToken } from '@/lib/supabase/server';
import type { GeneratedPrompt, ApiError } from '@/types';

export const maxDuration = 30;

const RATE_LIMIT = parseInt(process.env.GENERATE_RATE_LIMIT ?? '20', 10);
const ANON_COOKIE = 'anon_id';
const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

export async function POST(request: NextRequest): Promise<NextResponse<GeneratedPrompt | ApiError>> {
  // ── Rate limiting ────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit(`generate:${ip}`, RATE_LIMIT, 60_000);

  if (!rl.success) {
    const retryAfterSec = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.', code: 'RATE_LIMITED', details: `Reset in ${retryAfterSec}s` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
    );
  }

  // ── Parse & validate JSON body ───────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.', code: 'BAD_REQUEST' }, { status: 400 });
  }

  const parsed = generateSchema.safeParse(rawBody);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const message = Object.entries(fieldErrors)
      .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
      .join('; ');
    return NextResponse.json(
      { error: `Validation failed. ${message}`, code: 'VALIDATION_ERROR', details: message },
      { status: 400 }
    );
  }

  // ── Paywall check ────────────────────────────────────────
  // newAnonId is set when we create a fresh cookie; we attach it to the response.
  let newAnonId: string | null = null;

  try {
    const supabase = getServiceClient();
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      // ── Authenticated path ──────────────────────────────
      const userId = await getUserIdFromToken(token);
      if (!userId) {
        return NextResponse.json(
          { error: 'Invalid authentication token.', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
      const { data: result } = await supabase.rpc('use_generation', { p_user_id: userId });
      if (result === 'denied') {
        return NextResponse.json(
          { error: 'Usage limit reached. Buy more uses to continue.', code: 'PAYWALL' },
          { status: 402 }
        );
      }
    } else {
      // ── Anonymous path ──────────────────────────────────
      const existingAnonId = request.cookies.get(ANON_COOKIE)?.value;
      const anonId = existingAnonId ?? crypto.randomUUID();
      if (!existingAnonId) newAnonId = anonId;

      const { data: allowed } = await supabase.rpc('use_anon_generation', { p_anon_id: anonId });
      if (!allowed) {
        const response = NextResponse.json(
          { error: 'Free usage limit reached. Sign up to continue.', code: 'PAYWALL_ANON' },
          { status: 402 }
        );
        if (newAnonId) attachCookie(response, newAnonId);
        return response;
      }
    }
  } catch (err) {
    // Fail open: if Supabase is unavailable, don't block users.
    console.error('[VoxPrompt] Paywall check error (failing open):', err);
  }

  // ── Generate prompt ───────────────────────────────────────
  try {
    const result = await generatePrompt(parsed.data);
    const response = NextResponse.json(result, {
      headers: {
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Limit': String(rl.limit),
        'X-Used-AI': result.metadata.usedAI ? '1' : '0',
      },
    });
    if (newAnonId) attachCookie(response, newAnonId);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Prompt generation failed.';
    return NextResponse.json({ error: message, code: 'GENERATION_ERROR' }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse<ApiError>> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}

// ── Helpers ───────────────────────────────────────────────────
function attachCookie(response: NextResponse, anonId: string): void {
  response.cookies.set(ANON_COOKIE, anonId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ANON_COOKIE_MAX_AGE,
  });
}
