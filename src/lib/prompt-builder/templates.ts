// ============================================================
// VoxPrompt – Template Definitions
// ============================================================
import type { PromptTemplate, ModelTarget, Verbosity } from '@/types';

export interface TemplateConfig {
  id: PromptTemplate;
  name: string;
  description: string;
  icon: string;
  /** High-level instruction injected into GPT system prompt */
  systemContext: string;
  /** Role preamble placed at the top of deterministic output */
  rolePreamble: string;
}

export const TEMPLATES: Record<PromptTemplate, TemplateConfig> = {
  general: {
    id: 'general',
    name: 'General Assistant',
    description: 'Clear, structured prompt for any general task',
    icon: '✨',
    systemContext:
      'Transform this voice transcript into a clear, actionable prompt for a general-purpose AI assistant. ' +
      'Structure it with Goal, Context, Constraints, Expected Output, and Success Criteria.',
    rolePreamble: 'You are a helpful AI assistant. Please complete the following task carefully and thoroughly:',
  },
  coding: {
    id: 'coding',
    name: 'Coding Task',
    description: 'Optimised for code generation, review & debugging',
    icon: '💻',
    systemContext:
      'Transform this voice transcript into a precise technical prompt for a coding AI assistant. ' +
      'Include Goal, Technical Context (languages/frameworks), Requirements & Constraints, ' +
      'Input/Output Specification, Code Style, and Success Criteria.',
    rolePreamble:
      'You are an expert software engineer. Please help with the following technical task:',
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing Copy',
    description: 'Craft compelling marketing & copywriting prompts',
    icon: '📣',
    systemContext:
      'Transform this voice transcript into an effective prompt for generating marketing copy. ' +
      'Include Campaign Goal, Target Audience, Brand Voice, Key Messages, Format & Constraints, ' +
      'and Success Metrics.',
    rolePreamble:
      'You are a creative marketing copywriter and brand strategist. Please produce the following:',
  },
  meeting: {
    id: 'meeting',
    name: 'Meeting → Action Plan',
    description: 'Convert meeting notes into structured action plans',
    icon: '📋',
    systemContext:
      'Transform this voice transcript of meeting notes into a structured prompt that will produce ' +
      'a clear action plan. Include Meeting Summary, Key Decisions, Action Items with owners, ' +
      'Follow-ups, and Next Steps.',
    rolePreamble:
      'You are a skilled project manager. Please process the following meeting notes into an action plan:',
  },
  support: {
    id: 'support',
    name: 'Support → Troubleshooting',
    description: 'Turn support tickets into troubleshooting guides',
    icon: '🔧',
    systemContext:
      'Transform this voice transcript of a support issue into a structured troubleshooting prompt. ' +
      'Include Issue Description, Environment, Steps Already Tried, Expected vs Actual Behaviour, ' +
      'Urgency & Impact, and Desired Resolution.',
    rolePreamble:
      'You are a senior technical support specialist. Please diagnose and help resolve the following issue:',
  },
  research: {
    id: 'research',
    name: 'Research Brief',
    description: 'Structure research questions into comprehensive briefs',
    icon: '🔬',
    systemContext:
      'Transform this voice transcript into a comprehensive research brief prompt. ' +
      'Include Research Question, Background, Scope & Boundaries, Methodology, ' +
      'Expected Deliverables, and Timeline.',
    rolePreamble:
      'You are a thorough research analyst. Please conduct the following research and deliver a comprehensive response:',
  },
};

// ────────────────────────────────────────────────────────────
// Model-specific instructions appended to system prompts
// ────────────────────────────────────────────────────────────

export const MODEL_INSTRUCTIONS: Record<ModelTarget, string> = {
  claude:
    'Format the output for Claude (Anthropic). ' +
    'Use XML tags (e.g. <goal>, <context>) for structured sections where helpful. ' +
    'Be explicit about the task, include all constraints, and end with a clear call-to-action.',
  chatgpt:
    'Format the output for ChatGPT (OpenAI). ' +
    'Use clear Markdown headings (##), numbered lists, and explicit step-by-step instructions. ' +
    'Keep phrasing direct and action-oriented.',
  universal:
    'Format the output for universal compatibility across modern AI assistants. ' +
    'Use clean Markdown with ## headings and bullet lists. ' +
    'Focus on clarity: any well-aligned LLM should be able to follow this prompt precisely.',
};

// ────────────────────────────────────────────────────────────
// Verbosity instructions
// ────────────────────────────────────────────────────────────

export const VERBOSITY_INSTRUCTIONS: Record<Verbosity, string> = {
  short:
    'Be concise. Keep the prompt to the essentials only — avoid extra context or explanation. ' +
    'The output should be scannable in under 30 seconds.',
  medium:
    'Balance completeness with brevity. Include all key sections but avoid repetition or padding. ' +
    'Aim for a prompt that a professional would consider thorough but not bloated.',
  detailed:
    'Be comprehensive. Include all relevant sections, examples where useful, edge cases, ' +
    'and explicit success criteria. Err on the side of providing more context rather than less.',
};

// ────────────────────────────────────────────────────────────
// Language instructions
// ────────────────────────────────────────────────────────────

export const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  auto: 'Match the language used in the transcript. If it is in Portuguese, output in Portuguese; if in English, output in English.',
  en: 'Output the prompt entirely in English, regardless of the transcript language.',
  pt: 'Output the prompt entirely in European Portuguese (pt-PT), regardless of the transcript language.',
};
