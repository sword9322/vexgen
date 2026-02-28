'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { Button } from './ui/Button';

interface AudioUploaderProps {
  onAudioReady: (blob: Blob, url: string) => void;
}

const ACCEPTED_EXTENSIONS = '.mp3,.wav,.m4a,.webm,.ogg,.flac';
const MAX_MB = 25;

export function AudioUploader({ onAudioReady }: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setError(null);

    // Check size
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_MB} MB (file is ${(f.size / 1048576).toFixed(1)} MB).`);
      return;
    }

    // Accept any audio/* or video/webm (browser recordings)
    const mime = f.type.split(';')[0].toLowerCase();
    if (!mime.startsWith('audio/') && mime !== 'video/webm') {
      setError(`Unsupported file type: ${f.type || 'unknown'}. Please upload an mp3, wav, m4a, webm, ogg, or flac file.`);
      return;
    }

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(f);
    setFile(f);
    setAudioUrl(url);
    onAudioReady(f, url);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const reset = () => {
    setFile(null);
    setError(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-4">
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={[
            'flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer',
            'transition-colors duration-150',
            isDragging
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/40',
          ].join(' ')}
        >
          <UploadIcon isDragging={isDragging} />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {isDragging ? 'Drop it here!' : 'Drag & drop an audio file'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              or click to browse — mp3, wav, m4a, webm, ogg, flac · max {MAX_MB} MB
            </p>
          </div>
          <Button variant="secondary" size="sm" type="button" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
            Choose file
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={handleChange}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <AudioFileIcon />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1048576).toFixed(2)} MB</p>
            </div>
            <button
              onClick={reset}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Remove file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full h-9" />
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}

function UploadIcon({ isDragging }: { isDragging: boolean }) {
  return (
    <div className={[
      'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
      isDragging ? 'bg-indigo-100' : 'bg-gray-100',
    ].join(' ')}>
      <svg
        className={['w-6 h-6', isDragging ? 'text-indigo-600' : 'text-gray-400'].join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    </div>
  );
}

function AudioFileIcon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
      </svg>
    </div>
  );
}
