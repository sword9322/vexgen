// ============================================================
// VoxPrompt – Shared TypeScript Types
// ============================================================

/** The six prompt transformation templates */
export type PromptTemplate =
  | 'general'
  | 'coding'
  | 'marketing'
  | 'meeting'
  | 'support'
  | 'research';

/** Target LLM model family */
export type ModelTarget = 'claude' | 'chatgpt' | 'universal';

/** How much detail to include in the generated prompt */
export type Verbosity = 'short' | 'medium' | 'detailed';

/** Language for the generated prompt */
export type Language = 'auto' | 'en' | 'pt' | 'ptbr' | 'es' | 'fr' | 'de' | 'it';

// ────────────────────────────────────────────────────────────
// Transcription
// ────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  start: number;  // seconds
  end: number;    // seconds
  text: string;
}

export interface TranscriptionResult {
  transcript: string;
  segments?: TranscriptSegment[];
  language?: string;
  duration?: number; // seconds
}

// ────────────────────────────────────────────────────────────
// Prompt generation
// ────────────────────────────────────────────────────────────

export interface GenerateOptions {
  transcript: string;
  template: PromptTemplate;
  modelTarget: ModelTarget;
  verbosity: Verbosity;
  language: Language;
}

export interface GeneratedPrompt {
  prompt: string;
  metadata: {
    template: PromptTemplate;
    modelTarget: ModelTarget;
    verbosity: Verbosity;
    language: Language;
    timestamp: string;
    /** true = GPT-enhanced, false = deterministic builder */
    usedAI: boolean;
  };
}

// ────────────────────────────────────────────────────────────
// Internal prompt builder types
// ────────────────────────────────────────────────────────────

export interface ExtractedData {
  /** Primary detected action intent (create/analyze/fix/explain/…) */
  primaryIntent: string;
  /** Expected output type (code/list/document/…) */
  outputType: string;
  /** Constraint phrases identified in the transcript */
  constraints: string[];
  /** Named entities found in the transcript */
  entities: string[];
  /** 0–1 score where 1 = very ambiguous */
  ambiguityScore: number;
  wordCount: number;
  /** Domain topics detected (technology/business/marketing/…) */
  topics: string[];
}

// ────────────────────────────────────────────────────────────
// API error shape
// ────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  code?: string;
  details?: string;
}
