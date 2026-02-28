// ============================================================
// VoxPrompt – Whisper Transcription (direct fetch)
// ============================================================
// Uses native fetch + FormData instead of the OpenAI SDK to
// avoid node-fetch / undici stream-lock issues on Vercel.
// ============================================================
import type { TranscriptionResult } from '@/types';

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

/**
 * Strip codec params and normalise MIME type aliases.
 * "audio/webm;codecs=opus" → "audio/webm"
 */
function sanitiseMime(raw: string): string {
  const base = raw.split(';')[0].trim().toLowerCase();
  if (base === 'audio/x-wav' || base === 'audio/wave') return 'audio/wav';
  if (base === 'audio/x-m4a') return 'audio/mp4';
  if (base === 'video/webm') return 'audio/webm';
  return base || 'audio/webm';
}

/**
 * Transcribe an audio buffer using OpenAI Whisper-1.
 *
 * @param audioBuffer  Raw audio bytes (Node.js Buffer)
 * @param filename     Original filename — extension tells Whisper the format
 * @param mimeType     MIME type (codec params are stripped automatically)
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set.\n' +
        'Open .env.local and add your real OpenAI API key:\n' +
        '  OPENAI_API_KEY=sk-proj-...'
    );
  }
  if (apiKey === 'sk-...' || apiKey.startsWith('sk-...')) {
    throw new Error(
      'OPENAI_API_KEY is still set to the placeholder value.\n' +
        'Replace it with your real key from https://platform.openai.com/api-keys'
    );
  }

  const cleanMime = sanitiseMime(mimeType);

  // Convert Node Buffer → plain ArrayBuffer (avoids SharedArrayBuffer issues)
  const arrayBuf = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength
  ) as ArrayBuffer;

  const blob = new Blob([arrayBuf], { type: cleanMime });
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');

  // ── Send request ──────────────────────────────────────────
  let response: Response;
  try {
    response = await fetch(WHISPER_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });
  } catch (err) {
    console.error('[VoxPrompt] Whisper fetch error:', err);

    const cause = (err as { cause?: { code?: string } }).cause;
    const errno = cause?.code ?? '';

    if (
      errno === 'ECONNRESET' ||
      errno === 'ECONNREFUSED' ||
      errno === 'ETIMEDOUT' ||
      errno === 'ENOTFOUND'
    ) {
      throw new Error(
        `Cannot reach api.openai.com (${errno}). ` +
          `This is usually a corporate firewall or proxy issue.\n\n` +
          `How to fix:\n` +
          `  1. Add your corporate proxy to .env.local:\n` +
          `       HTTPS_PROXY=http://your-proxy-server:port\n` +
          `     then restart npm run dev.\n` +
          `  2. Use a personal network (phone hotspot, home Wi-Fi).\n` +
          `  3. Ask IT to whitelist api.openai.com on port 443.`
      );
    }

    throw new Error(
      `OpenAI connection failed: ${(err as Error).message}. ` +
        `Check your internet connection and try again.`
    );
  }

  // ── Handle HTTP errors ────────────────────────────────────
  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch { /* ignore */ }

    switch (response.status) {
      case 400:
        throw new Error(
          `Audio could not be processed (Whisper 400). ` +
            `Check the file format. Detail: ${detail}`
        );
      case 401:
        throw new Error(
          'Invalid OpenAI API key (401). ' +
            'Open .env.local and set OPENAI_API_KEY to your real key.\n' +
            'Get one at https://platform.openai.com/api-keys'
        );
      case 413:
        throw new Error('The audio file exceeds the 25 MB limit accepted by Whisper.');
      case 429:
        throw new Error('OpenAI rate limit reached. Please wait a moment and try again.');
      case 500:
      case 503:
        throw new Error('Whisper service is temporarily unavailable. Please try again.');
      default:
        throw new Error(`Whisper API error ${response.status}: ${detail}`);
    }
  }

  // ── Parse response ────────────────────────────────────────
  const raw = (await response.json()) as {
    text?: string;
    language?: string;
    duration?: number;
    segments?: Array<{ start: number; end: number; text: string }>;
  };

  // Guard: very old API versions may return plain text
  if (typeof raw === 'string') {
    return { transcript: (raw as string).trim() };
  }

  return {
    transcript: (raw.text ?? '').trim(),
    language: raw.language,
    duration: raw.duration,
    segments: raw.segments?.map((seg) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
    })),
  };
}
