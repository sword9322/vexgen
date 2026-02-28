'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from './ui/Button';

interface AudioRecorderProps {
  onAudioReady: (blob: Blob, url: string) => void;
}

type RecorderState = 'idle' | 'requesting' | 'recording' | 'stopped';

const MIME_PREFERENCE = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
];

function getSupportedMime(): string {
  for (const mime of MIME_PREFERENCE) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

export function AudioRecorder({ onAudioReady }: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      cancelAnimationFrame(animFrameRef.current ?? 0);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Waveform animation ────────────────────────────────────
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buffer);

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#f5f3ff';
    ctx.fillRect(0, 0, width, height);

    // Waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#6366f1';
    ctx.beginPath();

    const sliceWidth = width / buffer.length;
    let x = 0;
    for (let i = 0; i < buffer.length; i++) {
      const v = buffer[i] / 128.0;
      const y = (v * height) / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    animFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopWaveform = () => {
    cancelAnimationFrame(animFrameRef.current ?? 0);
    animFrameRef.current = null;
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
  };

  // ── Start recording ───────────────────────────────────────
  const startRecording = async () => {
    setError(null);
    setState('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      // Set up analyser for waveform
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mime = getSupportedMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onAudioReady(blob, url);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250); // collect data every 250ms
      setState('recording');

      // Timer
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);

      // Waveform animation
      drawWaveform();
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access was denied. Please allow microphone access and try again.'
          : err instanceof DOMException && err.name === 'NotFoundError'
          ? 'No microphone found. Please connect a microphone and try again.'
          : 'Could not access microphone. Please check your browser settings.';
      setError(msg);
      setState('idle');
    }
  };

  // ── Stop recording ────────────────────────────────────────
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    stopTimer();
    stopWaveform();
    setState('stopped');
  };

  // ── Restart ───────────────────────────────────────────────
  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSeconds(0);
    setError(null);
    setState('idle');
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4">

      {/* ── Idle: centered mic prompt ─────────────────── */}
      {state === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-5">
          <div className="w-16 h-16 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.5A6.5 6.5 0 005.5 12V9a6.5 6.5 0 0113 0v3a6.5 6.5 0 01-6.5 6.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.5V22M8 22h8" />
            </svg>
          </div>
          <Button onClick={startRecording} icon={<MicIcon />} size="lg">
            Record My Prompt
          </Button>
          <p className="text-xs text-gray-400">Speak clearly · 10–60 seconds works best</p>
        </div>
      )}

      {/* ── Requesting mic permission ─────────────────── */}
      {state === 'requesting' && (
        <div className="flex justify-center py-5">
          <Button loading size="lg">Requesting microphone…</Button>
        </div>
      )}

      {/* ── Recording: waveform + timer + stop ────────── */}
      {state === 'recording' && (
        <div className="flex flex-col gap-3">
          <canvas
            ref={canvasRef}
            width={600}
            height={80}
            className="w-full rounded-lg bg-violet-50"
            style={{ imageRendering: 'crisp-edges' }}
          />
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-red-600">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              {formatTime(seconds)}
            </span>
            <Button onClick={stopRecording} variant="danger" icon={<StopIcon />} size="lg">
              Stop
            </Button>
          </div>
        </div>
      )}

      {/* ── Stopped: playback + re-record ─────────────── */}
      {state === 'stopped' && audioUrl && (
        <div className="flex flex-col gap-3">
          <audio controls src={audioUrl} className="w-full h-10" />
          <Button onClick={reset} variant="secondary" size="sm">
            Re-record
          </Button>
        </div>
      )}

      {/* ── Error ────────────────────────────────────── */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Tiny icon components ──────────────────────────────────

function MicIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.5A6.5 6.5 0 005.5 12V9a6.5 6.5 0 0113 0v3a6.5 6.5 0 01-6.5 6.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.5V22M8 22h8" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}
