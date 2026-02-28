// ============================================================
// POST /api/generate
// Converts a transcript + options into a structured prompt.
// ============================================================
import { NextResponse } from 'next/server';
import { generateSchema } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { generatePrompt } from '@/lib/prompt-builder';
import type { GeneratedPrompt, ApiError } from '@/types';

export const maxDuration = 30; // seconds

const RATE_LIMIT = parseInt(process.env.GENERATE_RATE_LIMIT ?? '20', 10);

export async function POST(request: Request): Promise<NextResponse<GeneratedPrompt | ApiError>> {
  // ── Rate limiting ────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit(`generate:${ip}`, RATE_LIMIT, 60_000);

  if (!rl.success) {
    const retryAfterSec = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: 'Too many requests. Please wait before trying again.',
        code: 'RATE_LIMITED',
        details: `Reset in ${retryAfterSec}s`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSec) },
      }
    );
  }

  // ── Parse & validate JSON body ───────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.', code: 'BAD_REQUEST' },
      { status: 400 }
    );
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

  // ── Generate prompt ───────────────────────────────────────
  try {
    const result = await generatePrompt(parsed.data);
    return NextResponse.json(result, {
      headers: {
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Limit': String(rl.limit),
        'X-Used-AI': result.metadata.usedAI ? '1' : '0',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Prompt generation failed.';
    return NextResponse.json(
      { error: message, code: 'GENERATION_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse<ApiError>> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}
