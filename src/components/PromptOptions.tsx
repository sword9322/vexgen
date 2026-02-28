'use client';

import { Select } from './ui/Select';
import type { ModelTarget, Verbosity, Language } from '@/types';

interface PromptOptionsProps {
  modelTarget: ModelTarget;
  verbosity: Verbosity;
  language: Language;
  onModelTargetChange: (v: ModelTarget) => void;
  onVerbosityChange: (v: Verbosity) => void;
  onLanguageChange: (v: Language) => void;
}

const MODEL_OPTIONS = [
  { value: 'universal', label: '🌐 Universal (any LLM)',   description: 'Works well with any AI assistant' },
  { value: 'claude',    label: '🟣 Claude (Anthropic)',     description: 'Optimised for Claude — uses XML tags for structure' },
  { value: 'chatgpt',  label: '🟢 ChatGPT (OpenAI)',       description: 'Optimised for ChatGPT — numbered lists and headers' },
];

const VERBOSITY_OPTIONS = [
  { value: 'short',    label: '⚡ Short — essentials only',          description: 'Minimal, scannable prompt' },
  { value: 'medium',   label: '⚖️  Medium — balanced detail',        description: 'Good balance of context and brevity' },
  { value: 'detailed', label: '🔍 Detailed — comprehensive',          description: 'Full context, examples, and criteria' },
];

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: '🌍 Auto — match transcript', description: 'Output language matches the transcript language' },
  { value: 'en',   label: '🇬🇧 English',                description: 'Always output in English' },
  { value: 'pt',   label: '🇵🇹 Portuguese (pt-PT)',      description: 'Always output in European Portuguese' },
];

export function PromptOptions({
  modelTarget,
  verbosity,
  language,
  onModelTargetChange,
  onVerbosityChange,
  onLanguageChange,
}: PromptOptionsProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-gray-700">Generation Options</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          id="model-target"
          label="Target Model"
          options={MODEL_OPTIONS}
          value={modelTarget}
          onChange={(e) => onModelTargetChange(e.target.value as ModelTarget)}
        />
        <Select
          id="verbosity"
          label="Verbosity"
          options={VERBOSITY_OPTIONS}
          value={verbosity}
          onChange={(e) => onVerbosityChange(e.target.value as Verbosity)}
        />
        <Select
          id="language"
          label="Output Language"
          options={LANGUAGE_OPTIONS}
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as Language)}
        />
      </div>
    </div>
  );
}
