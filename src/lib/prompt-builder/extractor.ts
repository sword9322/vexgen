// ============================================================
// VoxPrompt – Transcript Extractor
// Heuristic (rule-based) analysis – no external API required.
// ============================================================
import type { ExtractedData } from '@/types';

// ────────────────────────────────────────────────────────────
// Vocabulary banks
// ────────────────────────────────────────────────────────────

const INTENT_VOCAB: Record<string, string[]> = {
  create: [
    'create', 'build', 'make', 'design', 'develop', 'generate', 'write', 'draft',
    'produce', 'compose', 'construct', 'implement', 'set up', 'set up', 'code', 'program',
  ],
  analyze: [
    'analyze', 'analyse', 'evaluate', 'assess', 'review', 'examine', 'investigate',
    'audit', 'inspect', 'measure', 'compare', 'benchmark',
  ],
  fix: [
    'fix', 'debug', 'repair', 'resolve', 'solve', 'troubleshoot', 'correct', 'patch',
    'address', 'handle', 'deal with',
  ],
  explain: [
    'explain', 'describe', 'clarify', 'summarize', 'summarise', 'outline', 'define',
    'document', 'illustrate', 'teach', 'show me',
  ],
  optimize: [
    'optimize', 'optimise', 'improve', 'enhance', 'refactor', 'refine', 'upgrade',
    'speed up', 'streamline', 'simplify', 'clean up',
  ],
  convert: [
    'convert', 'transform', 'translate', 'migrate', 'change', 'adapt', 'rewrite',
    'format', 'port', 'move',
  ],
  plan: [
    'plan', 'organize', 'organise', 'structure', 'schedule', 'arrange', 'prioritize',
    'prioritise', 'coordinate', 'roadmap',
  ],
  research: [
    'research', 'find', 'search', 'discover', 'explore', 'look up', 'gather',
    'collect', 'survey', 'identify',
  ],
};

const OUTPUT_VOCAB: Record<string, string[]> = {
  code: [
    'code', 'function', 'class', 'api', 'script', 'program', 'application', 'component',
    'module', 'library', 'algorithm', 'database', 'query', 'endpoint', 'microservice',
    'test', 'unit test',
  ],
  list: [
    'list', 'bullet', 'items', 'steps', 'tasks', 'checklist', 'enumeration',
    'points', 'action items',
  ],
  document: [
    'document', 'report', 'summary', 'outline', 'brief', 'overview', 'write-up',
    'article', 'essay', 'documentation', 'readme', 'spec',
  ],
  email: ['email', 'message', 'response', 'reply', 'letter', 'communication', 'newsletter'],
  analysis: [
    'analysis', 'evaluation', 'assessment', 'review', 'comparison', 'breakdown',
    'findings', 'insights',
  ],
  plan: ['plan', 'roadmap', 'strategy', 'approach', 'proposal', 'action items', 'next steps'],
  presentation: ['presentation', 'slides', 'deck', 'pitch', 'slideshow'],
};

const TOPIC_VOCAB: Record<string, string[]> = {
  technology: [
    'software', 'code', 'programming', 'tech', 'algorithm', 'database', 'api',
    'web', 'mobile', 'cloud', 'ai', 'machine learning', 'devops', 'kubernetes',
    'docker', 'microservice',
  ],
  business: [
    'business', 'company', 'revenue', 'profit', 'market', 'customer', 'client',
    'sales', 'product', 'strategy', 'startup', 'enterprise', 'b2b', 'b2c',
  ],
  marketing: [
    'marketing', 'campaign', 'brand', 'audience', 'content', 'social media', 'seo',
    'ads', 'promotion', 'engagement', 'conversion', 'funnel', 'lead',
  ],
  support: [
    'issue', 'problem', 'bug', 'error', 'ticket', 'complaint', 'support',
    'broken', 'not working', 'fails', 'crash', 'outage',
  ],
  research: [
    'research', 'study', 'findings', 'data', 'evidence', 'sources', 'literature',
    'hypothesis', 'experiment', 'survey', 'statistics',
  ],
  meeting: [
    'meeting', 'call', 'discussion', 'agenda', 'attendees', 'minutes', 'decisions',
    'action items', 'standup', 'sync', 'retrospective',
  ],
};

// Phrases that indicate ambiguity in the user's request
const AMBIGUITY_PATTERNS = [
  /\b(something|somehow|maybe|perhaps|probably|possibly|i think|i guess|not sure|kind of|sort of|a bit|kinda|sorta)\b/gi,
  /\b(etc\.?|and so on|and stuff|or whatever|things like that|you know|like)\b/gi,
  /\b(a thing|some thing|that thing|this thing|the thing|whatever)\b/gi,
  /\b(not sure|unclear|might|could be|possibly|maybe)\b/gi,
];

// Phrases that suggest a constraint is being expressed
const CONSTRAINT_PATTERNS = [
  /\b(?:must|should|need to|have to|required?|necessary|needs to)\b[^.!?\n]{3,80}/gi,
  /\b(?:without|except|excluding|not including|avoid|don'?t use|no)\b[^.!?\n]{3,60}/gi,
  /\b(?:within|less than|more than|at least|at most|maximum|minimum|max|min)\b[^.!?\n]{3,60}/gi,
  /\b(?:only|just|specifically|exclusively|strictly)\b[^.!?\n]{3,60}/gi,
  /\b(?:deadline|by|before|until|no later than)\b[^.!?\n]{3,60}/gi,
];

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────

/**
 * Extract semantic information from a raw transcript string.
 * All processing is deterministic and requires no external API.
 */
export function extractFromTranscript(transcript: string): ExtractedData {
  const lower = transcript.toLowerCase();
  const words = transcript.trim().split(/\s+/);

  return {
    primaryIntent: detectIntent(lower),
    outputType: detectOutputType(lower),
    topics: detectTopics(lower),
    constraints: extractConstraints(transcript),
    entities: extractEntities(transcript),
    ambiguityScore: calculateAmbiguity(transcript, words.length),
    wordCount: words.length,
  };
}

// ────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────

function detectIntent(lower: string): string {
  for (const [intent, vocab] of Object.entries(INTENT_VOCAB)) {
    if (vocab.some((v) => lower.includes(v))) {
      return intent;
    }
  }
  return 'general';
}

function detectOutputType(lower: string): string {
  for (const [type, vocab] of Object.entries(OUTPUT_VOCAB)) {
    if (vocab.some((v) => lower.includes(v))) {
      return type;
    }
  }
  return 'response';
}

function detectTopics(lower: string): string[] {
  return Object.entries(TOPIC_VOCAB)
    .filter(([, vocab]) => vocab.some((v) => lower.includes(v)))
    .map(([topic]) => topic);
}

function extractConstraints(transcript: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const pattern of CONSTRAINT_PATTERNS) {
    for (const match of Array.from(transcript.matchAll(pattern))) {
      const phrase = match[0].trim();
      // Normalise whitespace and keep only unique, reasonably-sized phrases
      const key = phrase.toLowerCase().replace(/\s+/g, ' ');
      if (!seen.has(key) && phrase.length < 200) {
        seen.add(key);
        results.push(phrase);
      }
    }
  }

  return results.slice(0, 6); // cap at 6 constraint phrases
}

function extractEntities(transcript: string): string[] {
  const entities = new Set<string>();

  // Capitalised sequences that are NOT at the very start of a sentence
  const capPattern = /(?<![.!?\n]\s{0,2})\b([A-Z][a-z]{1,}(?:\s+[A-Z][a-z]{1,}){0,3})\b/g;
  for (const match of Array.from(transcript.matchAll(capPattern))) {
    entities.add(match[1]);
  }

  // ALL-CAPS acronyms (≥ 2 letters)
  for (const match of Array.from(transcript.matchAll(/\b([A-Z]{2,})\b/g))) {
    entities.add(match[1]);
  }

  return Array.from(entities).slice(0, 10);
}

function calculateAmbiguity(transcript: string, wordCount: number): number {
  let score = 0;

  // Very short transcripts are inherently ambiguous
  if (wordCount < 15) score += 0.4;
  else if (wordCount < 30) score += 0.2;
  else if (wordCount < 50) score += 0.1;

  // Count ambiguity phrases
  let ambiguityHits = 0;
  for (const pattern of AMBIGUITY_PATTERNS) {
    const matches = transcript.match(pattern);
    if (matches) ambiguityHits += matches.length;
  }
  score += Math.min(ambiguityHits * 0.12, 0.45);

  // No recognisable intent → less clear what the user wants
  const lower = transcript.toLowerCase();
  const hasIntent = Object.values(INTENT_VOCAB).some((vocab) =>
    vocab.some((v) => lower.includes(v))
  );
  if (!hasIntent) score += 0.15;

  return Math.min(parseFloat(score.toFixed(2)), 1);
}
