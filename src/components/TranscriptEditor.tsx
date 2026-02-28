'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle } from './ui/Card';
import type { TranscriptSegment } from '@/types';

interface TranscriptEditorProps {
  transcript: string;
  segments?: TranscriptSegment[];
  language?: string;
  duration?: number;
  onChange: (value: string) => void;
}

export function TranscriptEditor({
  transcript,
  segments,
  language,
  duration,
  onChange,
}: TranscriptEditorProps) {
  const [showSegments, setShowSegments] = useState(false);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Card accent="indigo">
      <CardHeader>
        <span className="text-lg">📝</span>
        <CardTitle>Transcript</CardTitle>
        {/* Metadata chips */}
        <div className="ml-auto flex items-center gap-2">
          {language && (
            <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
              {language}
            </span>
          )}
          {duration !== undefined && (
            <span className="text-xs text-gray-400">{formatDuration(duration)}</span>
          )}
          {segments && segments.length > 0 && (
            <button
              onClick={() => setShowSegments((v) => !v)}
              className="text-xs text-indigo-600 hover:text-indigo-800 underline decoration-dotted"
            >
              {showSegments ? 'Hide timestamps' : 'Show timestamps'}
            </button>
          )}
        </div>
      </CardHeader>

      {/* Segments view */}
      {showSegments && segments && segments.length > 0 && (
        <div className="mb-4 max-h-36 overflow-y-auto rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-1.5">
          {segments.map((seg, i) => (
            <div key={i} className="flex gap-3 text-xs">
              <span className="shrink-0 font-mono text-gray-400">
                {formatTime(seg.start)} – {formatTime(seg.end)}
              </span>
              <span className="text-gray-700">{seg.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Editable textarea */}
      <div className="relative">
        <textarea
          value={transcript}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          placeholder="Transcript will appear here after processing…"
          className={[
            'w-full resize-y rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5',
            'text-sm text-gray-800 leading-relaxed',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            'placeholder:text-gray-400',
          ].join(' ')}
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-400 tabular-nums pointer-events-none">
          {transcript.length.toLocaleString()} chars
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        You can edit the transcript above before generating the prompt.
      </p>
    </Card>
  );
}
