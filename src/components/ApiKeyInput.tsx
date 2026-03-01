'use client';

import { useState } from 'react';

const STORAGE_KEY = 'voxprompt_openai_key';

interface ApiKeyInputProps {
  apiKey: string;
  onChange: (key: string) => void;
}

export function ApiKeyInput({ apiKey, onChange }: ApiKeyInputProps) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed.startsWith('sk-')) {
      setError('Key must start with sk-');
      return;
    }
    localStorage.setItem(STORAGE_KEY, trimmed);
    onChange(trimmed);
    setDraft('');
    setExpanded(false);
    setError('');
  };

  const handleRemove = () => {
    localStorage.removeItem(STORAGE_KEY);
    onChange('');
    setExpanded(false);
    setDraft('');
    setError('');
  };

  // Key is set — show compact badge
  if (apiKey) {
    return (
      <div className="flex items-center justify-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Using your OpenAI key — unlimited & free
        </span>
        <button
          onClick={handleRemove}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          Remove
        </button>
      </div>
    );
  }

  // Key not set
  return (
    <div className="flex flex-col items-center gap-2 text-xs">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
        >
          Have your own OpenAI API key? Use it for free
        </button>
      ) : (
        <div className="w-full max-w-sm flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="password"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="sk-..."
              autoFocus
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition font-mono"
            />
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => { setExpanded(false); setDraft(''); setError(''); }}
              className="text-gray-400 hover:text-gray-600 transition-colors px-1"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <p className="text-gray-400 text-xs text-center">
            Key is stored only in your browser. Never sent to our servers, only to OpenAI.
          </p>
        </div>
      )}
    </div>
  );
}

export function loadApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) ?? '';
}
