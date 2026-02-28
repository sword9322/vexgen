// ============================================================
// VoxPrompt – Input Validation (Zod schemas)
// ============================================================
import { z } from 'zod';

// ────────────────────────────────────────────────────────────
// POST /api/generate – request body schema
// ────────────────────────────────────────────────────────────

export const generateSchema = z.object({
  transcript: z
    .string({ required_error: 'Transcript is required' })
    .min(10, 'Transcript must be at least 10 characters')
    .max(10_000, 'Transcript must not exceed 10,000 characters')
    .transform((s) => s.trim()),

  template: z.enum(['general', 'coding', 'marketing', 'meeting', 'support', 'research'], {
    errorMap: () => ({ message: 'template must be one of: general, coding, marketing, meeting, support, research' }),
  }),

  modelTarget: z.enum(['claude', 'chatgpt', 'universal'], {
    errorMap: () => ({ message: 'modelTarget must be one of: claude, chatgpt, universal' }),
  }),

  verbosity: z.enum(['short', 'medium', 'detailed'], {
    errorMap: () => ({ message: 'verbosity must be one of: short, medium, detailed' }),
  }),

  language: z.enum(['auto', 'en', 'pt'], {
    errorMap: () => ({ message: 'language must be one of: auto, en, pt' }),
  }),
});

export type GenerateInput = z.infer<typeof generateSchema>;

// ────────────────────────────────────────────────────────────
// Allowed audio MIME types (Whisper-compatible)
// ────────────────────────────────────────────────────────────

export const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',        // .mp3
  'audio/mp3',         // .mp3 (alternate)
  'audio/wav',         // .wav
  'audio/x-wav',       // .wav (alternate)
  'audio/wave',        // .wav (alternate)
  'audio/m4a',         // .m4a
  'audio/mp4',         // .mp4 / .m4a
  'audio/x-m4a',       // .m4a (alternate)
  'audio/webm',        // .webm (browser MediaRecorder)
  'audio/ogg',         // .ogg
  'video/webm',        // .webm (some browsers include video track)
  'audio/flac',        // .flac
]);

/** Default 25 MB – matches Whisper API hard limit */
export const MAX_AUDIO_SIZE_BYTES: number = parseInt(
  process.env.MAX_AUDIO_SIZE ?? '26214400',
  10
);

/**
 * Validate an uploaded audio file.
 * Returns an error string or null if valid.
 */
export function validateAudioFile(
  mimeType: string,
  sizeBytes: number
): string | null {
  // Strip codec params: "audio/webm; codecs=opus" → "audio/webm"
  const baseMime = mimeType.split(';')[0].trim().toLowerCase();

  if (!ALLOWED_AUDIO_TYPES.has(baseMime)) {
    return `Unsupported audio format: ${baseMime}. Allowed: mp3, wav, m4a, webm, ogg, flac.`;
  }

  if (sizeBytes > MAX_AUDIO_SIZE_BYTES) {
    const maxMB = (MAX_AUDIO_SIZE_BYTES / 1_048_576).toFixed(0);
    const fileMB = (sizeBytes / 1_048_576).toFixed(1);
    return `File too large: ${fileMB} MB. Maximum allowed: ${maxMB} MB.`;
  }

  return null;
}
