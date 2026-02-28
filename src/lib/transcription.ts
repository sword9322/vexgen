// ============================================================
// VoxPrompt – Whisper Transcription via OpenAI API
// ============================================================
import OpenAI from 'openai';
import { getOpenAIClient } from './openai-client';
import type { TranscriptionResult } from '@/types';

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
  const client = getOpenAIClient();
  const cleanMime = sanitiseMime(mimeType);

  // Convert Node Buffer → plain ArrayBuffer (avoids SharedArrayBuffer issues)
  const arrayBuf = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength
  ) as ArrayBuffer;

  const file = new File([arrayBuf], filename, { type: cleanMime });

  try {
    // verbose_json gives language + segment timestamps.
    // timestamp_granularities is omitted – segment data is included by default.
    const response = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'verbose_json',
    });

    // The SDK types the response as Transcription ({text:string}), but
    // verbose_json embeds additional fields in the raw JSON at runtime.
    const raw = response as unknown as {
      text?: string;
      language?: string;
      duration?: number;
      segments?: Array<{ start: number; end: number; text: string }>;
    };

    // Guard: very old SDK versions may return the raw JSON as a string
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
  } catch (err) {
    // Always log the full error to the dev-server terminal
    console.error('[VoxPrompt] Whisper error:', err);

    if (err instanceof OpenAI.APIError) {
      // ── Connection / network errors (no HTTP status) ──────
      if (!err.status) {
        const cause = (err as { cause?: { code?: string } }).cause;
        const errno = cause?.code ?? '';

        if (errno === 'ECONNRESET' || errno === 'ECONNREFUSED' || errno === 'ETIMEDOUT' || errno === 'ENOTFOUND') {
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
          `OpenAI connection failed: ${err.message}. ` +
            `Check your internet connection and try again.`
        );
      }

      // ── HTTP errors ───────────────────────────────────────
      switch (err.status) {
        case 400:
          throw new Error(
            `Audio could not be processed (Whisper 400). ` +
              `Check the file format. Detail: ${err.message}`
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
          throw new Error(`Whisper API error ${err.status}: ${err.message}`);
      }
    }

    if (err instanceof Error) throw err;
    throw new Error(`Unexpected transcription error: ${String(err)}`);
  }
}
