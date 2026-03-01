// ============================================================
// VoxPrompt – Prompt Builder (public API)
// ============================================================
// Orchestrates extraction + formatting.
// When an OpenAI API key is available the caller can also pass
// the transcript to the GPT-enhanced route (handled in the
// API layer); this module is the deterministic fallback.
// ============================================================
import OpenAI from 'openai';
import type { GenerateOptions, GeneratedPrompt } from '@/types';
import { extractFromTranscript } from './extractor';
import { buildPrompt } from './formatter';
import { TEMPLATES, MODEL_INSTRUCTIONS, VERBOSITY_INSTRUCTIONS, LANGUAGE_INSTRUCTIONS } from './templates';
import { getOpenAIClient } from '../openai-client';

function getClient(userApiKey?: string): OpenAI | null {
  const key = userApiKey || process.env.OPENAI_API_KEY;
  if (!key || key === 'sk-...' || key.startsWith('sk-...')) return null;
  try {
    return userApiKey ? new OpenAI({ apiKey: userApiKey }) : getOpenAIClient();
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────
// Main generation function (tries AI, falls back to deterministic)
// ────────────────────────────────────────────────────────────

/**
 * Generate a high-quality structured prompt from a transcript.
 *
 * Strategy:
 * 1. Try GPT-4o-mini with a carefully crafted system prompt.
 * 2. On failure (or missing API key) → deterministic builder.
 *
 * @param userApiKey  Optional user-supplied OpenAI key (bypasses paywall).
 */
export async function generatePrompt(options: GenerateOptions, userApiKey?: string): Promise<GeneratedPrompt> {
  const client = getClient(userApiKey);

  if (client) {
    try {
      const prompt = await generateWithAI(client, options);
      return {
        prompt,
        metadata: {
          ...options,
          timestamp: new Date().toISOString(),
          usedAI: true,
        },
      };
    } catch (err) {
      // Log and fall through to deterministic builder
      console.warn('[prompt-builder] AI generation failed, using deterministic builder:', err);
    }
  }

  return generateDeterministic(options);
}

// ────────────────────────────────────────────────────────────
// GPT-enhanced path
// ────────────────────────────────────────────────────────────

async function generateWithAI(client: OpenAI, options: GenerateOptions): Promise<string> {
  const tpl = TEMPLATES[options.template];

  const systemPrompt = [
    'You are an expert prompt engineer specialising in crafting high-quality, structured prompts for AI assistants.',
    '',
    `TASK: ${tpl.systemContext}`,
    '',
    `OUTPUT MODEL: ${MODEL_INSTRUCTIONS[options.modelTarget]}`,
    '',
    `VERBOSITY: ${VERBOSITY_INSTRUCTIONS[options.verbosity]}`,
    '',
    `LANGUAGE: ${LANGUAGE_INSTRUCTIONS[options.language]}`,
    '',
    'FORMAT RULES:',
    '- Use Markdown with ## headings for each section',
    '- Be specific and actionable — avoid generic filler',
    '- Always end with a ## Clarifying Questions section IF there are genuinely ambiguous aspects',
    '- Do NOT add a preamble like "Here is your prompt:" — output ONLY the prompt itself',
  ].join('\n');

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Transform this voice transcript into a structured, high-quality prompt:\n\n"""\n${options.transcript}\n"""`,
      },
    ],
    temperature: 0.4,
    max_tokens: options.verbosity === 'short' ? 600 : options.verbosity === 'medium' ? 1200 : 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from AI');

  return content.trim();
}

// ────────────────────────────────────────────────────────────
// Deterministic path (always available, used in tests)
// ────────────────────────────────────────────────────────────

function generateDeterministic(options: GenerateOptions): GeneratedPrompt {
  const extracted = extractFromTranscript(options.transcript);
  const prompt = buildPrompt(options.transcript, extracted, options);

  return {
    prompt,
    metadata: {
      ...options,
      timestamp: new Date().toISOString(),
      usedAI: false,
    },
  };
}

// Re-export extractor for direct use in tests / the API layer
export { extractFromTranscript } from './extractor';
export { buildPrompt } from './formatter';
