'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { AudioRecorder } from '@/components/AudioRecorder';
import { AudioUploader } from '@/components/AudioUploader';
import { TranscriptEditor } from '@/components/TranscriptEditor';
import { TemplateSelector } from '@/components/TemplateSelector';
import { PromptOptions } from '@/components/PromptOptions';
import { PromptOutput } from '@/components/PromptOutput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type {
  PromptTemplate,
  ModelTarget,
  Verbosity,
  Language,
  TranscriptionResult,
  GeneratedPrompt,
} from '@/types';

// ── Tab type for audio input ────────────────────────────────
type InputTab = 'record' | 'upload';

// ── Step tracking ───────────────────────────────────────────
type AppStep = 'input' | 'transcribing' | 'editing' | 'generating' | 'done';

export default function Home() {
  // Audio
  const [inputTab, setInputTab] = useState<InputTab>('record');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioMime, setAudioMime] = useState<string>('audio/webm');

  // Transcription
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  // Options
  const [template, setTemplate] = useState<PromptTemplate>('general');
  const [modelTarget, setModelTarget] = useState<ModelTarget>('universal');
  const [verbosity, setVerbosity] = useState<Verbosity>('medium');
  const [language, setLanguage] = useState<Language>('auto');

  // Output
  const [result, setResult] = useState<GeneratedPrompt | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Step
  const [step, setStep] = useState<AppStep>('input');

  // ── Handlers ─────────────────────────────────────────────

  const handleAudioReady = (blob: Blob, _url: string) => {
    setAudioBlob(blob);
    setAudioMime(blob.type || 'audio/webm');
    // Reset downstream state when new audio comes in
    setTranscription(null);
    setTranscript('');
    setResult(null);
    setTranscribeError(null);
    setGenerateError(null);
    setStep('input');
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setTranscribeError(null);
    setStep('transcribing');

    try {
      const form = new FormData();
      // Give the file a proper extension based on mime type
      const ext = mimeToExt(audioMime);
      form.append('audio', new File([audioBlob], `recording.${ext}`, { type: audioMime }));

      const res = await fetch('/api/transcribe', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      const tr = data as TranscriptionResult;
      setTranscription(tr);
      setTranscript(tr.transcript);
      setStep('editing');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transcription failed. Please try again.';
      setTranscribeError(msg);
      setStep('input');
    }
  };

  const handleGenerate = async () => {
    if (!transcript.trim()) return;
    setGenerateError(null);
    setStep('generating');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, template, modelTarget, verbosity, language }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      setResult(data as GeneratedPrompt);
      setStep('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed. Please try again.';
      setGenerateError(msg);
      setStep('editing');
    }
  };

  const handleReset = () => {
    setAudioBlob(null);
    setTranscription(null);
    setTranscript('');
    setResult(null);
    setTranscribeError(null);
    setGenerateError(null);
    setStep('input');
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-8 space-y-4 sm:space-y-6">

        {/* ── Hero ─────────────────────────────────────── */}
        <div className="text-center pb-1">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 tracking-tight leading-snug">
            Turn Your Voice Into a Perfect AI Prompt
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-gray-500 max-w-xl mx-auto">
            Record or upload a voice note. VoxPrompt transcribes it and transforms it into
            a structured prompt for ChatGPT, Claude, or any LLM.
          </p>
        </div>

        {/* ── Step 1: Audio Input ──────────────────────── */}
        <StepCard
          number={1}
          title="Audio Input"
          done={!!audioBlob && step !== 'input'}
        >
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4 w-fit mx-auto sm:mx-0">
            {(['record', 'upload'] as InputTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setInputTab(tab)}
                className={[
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                  inputTab === tab
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                {tab === 'record' ? '🎙 Record' : '📂 Upload'}
              </button>
            ))}
          </div>

          {inputTab === 'record' ? (
            <AudioRecorder onAudioReady={handleAudioReady} />
          ) : (
            <AudioUploader onAudioReady={handleAudioReady} />
          )}

          {/* Transcribe button */}
          {audioBlob && step === 'input' && (
            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={handleTranscribe}
                icon={<WaveformIcon />}
                size="lg"
              >
                Transcribe audio
              </Button>
              <span className="text-xs text-gray-400">
                Uses OpenAI Whisper · {(audioBlob.size / 1024).toFixed(0)} KB
              </span>
            </div>
          )}

          {/* Transcribing state */}
          {step === 'transcribing' && (
            <div className="mt-4 flex items-center gap-3 text-sm text-gray-600">
              <LoadingDots />
              Transcribing audio… this may take a few seconds
            </div>
          )}

          {/* Error */}
          {transcribeError && (
            <ErrorBanner message={transcribeError} />
          )}
        </StepCard>

        {/* ── Step 2: Transcript Editor ────────────────── */}
        {(step === 'editing' || step === 'generating' || step === 'done') && transcription && (
          <div className="animate-slide-up">
            <TranscriptEditor
              transcript={transcript}
              segments={transcription.segments}
              language={transcription.language}
              duration={transcription.duration}
              onChange={setTranscript}
            />
          </div>
        )}

        {/* ── Step 3: Options + Generate ───────────────── */}
        {(step === 'editing' || step === 'generating' || step === 'done') && (
          <div className="animate-slide-up">
            <StepCard number={2} title="Generate Options" done={step === 'done'}>
              <div className="space-y-5">
                <TemplateSelector value={template} onChange={setTemplate} />
                <PromptOptions
                  modelTarget={modelTarget}
                  verbosity={verbosity}
                  language={language}
                  onModelTargetChange={setModelTarget}
                  onVerbosityChange={setVerbosity}
                  onLanguageChange={setLanguage}
                />
                <div className="flex items-center gap-3 pt-1">
                  <Button
                    onClick={handleGenerate}
                    loading={step === 'generating'}
                    disabled={!transcript.trim() || step === 'generating'}
                    size="lg"
                    icon={<SparklesIcon />}
                  >
                    {step === 'generating' ? 'Generating…' : 'Generate Prompt'}
                  </Button>
                  {step === 'done' && (
                    <Button onClick={handleReset} variant="ghost" size="sm">
                      Start over
                    </Button>
                  )}
                </div>

                {generateError && <ErrorBanner message={generateError} />}
              </div>
            </StepCard>
          </div>
        )}

        {/* ── Step 4: Output ───────────────────────────── */}
        {result && step === 'done' && (
          <div className="animate-slide-up">
            <PromptOutput result={result} />
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white mt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex flex-col items-center sm:items-start gap-0.5">
            <span className="text-sm font-semibold text-gray-800">VoxPrompt</span>
            <span className="text-xs text-gray-400">Voice to AI prompt, in seconds</span>
          </div>

          {/* Tech stack */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {[
              { label: 'Next.js', href: 'https://nextjs.org' },
              { label: 'Whisper', href: 'https://openai.com/research/whisper' },
              { label: 'GPT-4o', href: 'https://openai.com/gpt-4o' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
              >
                {label}
              </a>
            ))}
          </div>

          {/* Copyright + contact + social */}
          <div className="flex flex-col items-center sm:items-end gap-1 text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <a href="mailto:hello@vox-prompt.com" className="hover:text-gray-600 transition-colors">
                hello@vox-prompt.com
              </a>
              <a
                href="https://x.com/PromptVox"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700 transition-colors"
                aria-label="Follow VoxPrompt on X"
              >
                <XIcon />
              </a>
            </div>
            <span>&copy; {new Date().getFullYear()} VoxPrompt</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Helper sub-components ─────────────────────────────────

function StepCard({
  number,
  title,
  done,
  children,
}: {
  number: number;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-4">
        <div
          className={[
            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
            done
              ? 'bg-emerald-500 text-white'
              : 'bg-indigo-600 text-white',
          ].join(' ')}
        >
          {done ? '✓' : number}
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function WaveformIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l.45 2.25M12 3v2m6.55-2L18 5.25M3 12H5m14 0h2M5.636 5.636l1.414 1.414m10.9-1.414-1.414 1.414M12 12l-3.5 3.5m3.5-3.5 3.5 3.5M12 12V7m0 5v5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// ── Utilities ─────────────────────────────────────────────

function mimeToExt(mime: string): string {
  const base = mime.split(';')[0].trim();
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'video/webm': 'webm',
    'audio/flac': 'flac',
  };
  return map[base] ?? 'webm';
}
