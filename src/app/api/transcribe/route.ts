// ============================================================
// POST /api/transcribe
// Accepts an audio file and returns a transcript via Whisper.
// ============================================================
import { NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/transcription';
import { validateAudioFile } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import type { TranscriptionResult, ApiError } from '@/types';

// Route-segment config – allow up to 60 s for long audio (Vercel)
export const maxDuration = 60;

const RATE_LIMIT = parseInt(process.env.TRANSCRIBE_RATE_LIMIT ?? '10', 10);

export async function POST(request: Request): Promise<NextResponse<TranscriptionResult | ApiError>> {
  // ── Rate limiting ────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit(`transcribe:${ip}`, RATE_LIMIT, 60_000);

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
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rl.resetAt),
        },
      }
    );
  }

  // ── Parse multipart form data ────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error('[VoxPrompt] Failed to parse form data:', err);
    return NextResponse.json(
      { error: 'Invalid request: expected multipart/form-data with an "audio" field.', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  const audioField = formData.get('audio');
  if (!audioField || !(audioField instanceof File)) {
    return NextResponse.json(
      { error: 'Missing "audio" file field in the form data.', code: 'MISSING_FIELD' },
      { status: 400 }
    );
  }

  const audioFile = audioField as File;

  // Log what we received (useful during development)
  console.log(
    `[VoxPrompt] Transcribe request: name="${audioFile.name}" type="${audioFile.type}" size=${(audioFile.size / 1024).toFixed(1)}KB`
  );

  // ── Validate MIME type and file size ─────────────────────
  const validationError = validateAudioFile(audioFile.type, audioFile.size);
  if (validationError) {
    return NextResponse.json(
      { error: validationError, code: 'INVALID_FILE' },
      { status: 400 }
    );
  }

  // ── Read the file into a Node Buffer ─────────────────────
  let audioBuffer: Buffer;
  try {
    const arrayBuffer = await audioFile.arrayBuffer();
    audioBuffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('[VoxPrompt] Failed to read audio file into buffer:', err);
    return NextResponse.json(
      { error: 'Failed to read the uploaded file.', code: 'READ_ERROR' },
      { status: 500 }
    );
  }

  // ── Transcribe ────────────────────────────────────────────
  const userKey = request.headers.get('X-OpenAI-Key') || undefined;

  try {
    const result = await transcribeAudio(
      audioBuffer,
      audioFile.name || 'recording.webm',
      audioFile.type,
      userKey
    );

    if (!result.transcript || result.transcript.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            'No speech detected in the audio. ' +
            'Please ensure the recording contains clear spoken words.',
          code: 'NO_SPEECH',
        },
        { status: 422 }
      );
    }

    console.log(
      `[VoxPrompt] Transcription OK: ${result.transcript.length} chars, lang=${result.language}`
    );

    return NextResponse.json(result, {
      headers: {
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Limit': String(rl.limit),
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : `Unexpected error: ${String(err)}`;

    console.error('[VoxPrompt] Transcription route caught error:', message);

    if (message.toLowerCase().includes('openai_api_key') || message.toLowerCase().includes('api key')) {
      return NextResponse.json(
        { error: message, code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: message, code: 'TRANSCRIPTION_ERROR' },
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
