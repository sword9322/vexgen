'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import type { GeneratedPrompt } from '@/types';

interface PromptOutputProps {
  result: GeneratedPrompt;
}

const TEMPLATE_LABELS: Record<string, string> = {
  general: 'General Assistant',
  coding: 'Coding Task',
  marketing: 'Marketing Copy',
  meeting: 'Meeting → Action Plan',
  support: 'Support → Troubleshooting',
  research: 'Research Brief',
};

export function PromptOutput({ result }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for non-secure contexts
      const el = document.createElement('textarea');
      el.value = result.prompt;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([result.prompt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voxprompt-${result.metadata.template}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const charCount = result.prompt.length;
  const wordCount = result.prompt.trim().split(/\s+/).length;

  return (
    <Card accent="green" className="animate-fade-in">
      <CardHeader>
        <span className="text-lg">🎯</span>
        <CardTitle>Generated Prompt</CardTitle>

        {/* Metadata */}
        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
            {TEMPLATE_LABELS[result.metadata.template] ?? result.metadata.template}
          </span>
          <span
            title={result.metadata.usedAI ? 'Enhanced with GPT-4o' : 'Deterministic builder (no AI API)'}
            className={[
              'text-xs px-2 py-0.5 rounded-full font-medium',
              result.metadata.usedAI
                ? 'bg-violet-50 text-violet-700'
                : 'bg-gray-100 text-gray-600',
            ].join(' ')}
          >
            {result.metadata.usedAI ? '✦ AI enhanced' : '⚡ Instant'}
          </span>
        </div>
      </CardHeader>

      {/* Action bar */}
      <div className="flex items-center gap-2 mb-3">
        <Button
          onClick={handleCopy}
          variant={copied ? 'secondary' : 'primary'}
          size="sm"
          icon={copied ? <CheckIcon /> : <CopyIcon />}
        >
          {copied ? 'Copied!' : 'Copy prompt'}
        </Button>
        <Button
          onClick={handleDownload}
          variant="secondary"
          size="sm"
          icon={<DownloadIcon />}
        >
          Download .txt
        </Button>
        <span className="ml-auto text-xs text-gray-400 tabular-nums">
          {wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars
        </span>
      </div>

      {/* Prompt content */}
      <div className="relative">
        <pre
          className={[
            'w-full overflow-x-auto rounded-lg bg-gray-950 text-gray-100',
            'p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words',
            'max-h-[36rem] overflow-y-auto',
          ].join(' ')}
        >
          {result.prompt}
        </pre>
      </div>

      {/* Footer meta */}
      <p className="mt-2 text-xs text-gray-400">
        Generated at {new Date(result.metadata.timestamp).toLocaleTimeString()} ·{' '}
        {result.metadata.modelTarget} · {result.metadata.verbosity} · {result.metadata.language}
      </p>
    </Card>
  );
}

// ── Icons ──────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
