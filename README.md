# VoxPrompt

**Turn your voice into a high-quality AI prompt in seconds.**

Record or upload a short voice note → Whisper transcribes it → GPT-4o transforms it into a
structured, polished prompt optimised for ChatGPT, Claude, or any LLM.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Environment Variables](#environment-variables)
5. [API Reference](#api-reference)
6. [Running Tests](#running-tests)
7. [Production Build](#production-build)
8. [Project Structure](#project-structure)

---

## Features

| Feature | Detail |
|---|---|
| **Record audio** | Browser MediaRecorder with live waveform canvas |
| **Upload audio** | Drag & drop or file picker — mp3, wav, m4a, webm, ogg, flac |
| **Transcription** | OpenAI Whisper-1 with optional timestamped segments |
| **6 prompt templates** | General · Coding · Marketing · Meeting · Support · Research |
| **Model targets** | Universal · Claude (XML tags) · ChatGPT (numbered headings) |
| **3 verbosity levels** | Short · Medium · Detailed |
| **Language** | Auto-detect · English · Portuguese (pt-PT) |
| **Editable transcript** | Edit before generating |
| **Copy & Download** | One-click copy or `.txt` download |
| **Deterministic fallback** | Works without AI key using rule-based builder |
| **Rate limiting** | Sliding-window per IP (configurable) |
| **Input validation** | Zod schemas, MIME allowlist, size limits |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js React)                                    │
│                                                             │
│  AudioRecorder ──┐                                          │
│  AudioUploader ──┼──► POST /api/transcribe ──► Whisper-1   │
│                  │         ▼                                │
│  TranscriptEditor◄── transcript + segments                  │
│                  │                                          │
│  TemplateSelector┐                                          │
│  PromptOptions ──┼──► POST /api/generate ──► GPT-4o-mini   │
│                  │         │                  (or fallback) │
│  PromptOutput ◄──┘         ▼                                │
│                      generatePrompt()                       │
│                       ├── extractor.ts   (heuristics)       │
│                       ├── formatter.ts   (deterministic)    │
│                       └── templates.ts   (config)           │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Module | Role |
|---|---|
| `src/lib/prompt-builder/extractor.ts` | Heuristic analysis of transcript: intent, output type, topics, entities, ambiguity score |
| `src/lib/prompt-builder/formatter.ts` | Deterministic markdown generator — 6 templates, no external API needed |
| `src/lib/prompt-builder/templates.ts` | Template configs, model instructions, verbosity/language directives |
| `src/lib/prompt-builder/index.ts` | Orchestrator — tries GPT-4o-mini, falls back to deterministic |
| `src/lib/transcription.ts` | Whisper-1 wrapper with error normalisation |
| `src/lib/validation.ts` | Zod schema + audio file validation |
| `src/lib/rate-limit.ts` | In-memory sliding-window rate limiter |
| `src/app/api/transcribe/route.ts` | `POST /api/transcribe` handler |
| `src/app/api/generate/route.ts` | `POST /api/generate` handler |
| `src/components/AudioRecorder.tsx` | MediaRecorder + AnalyserNode waveform |
| `src/components/AudioUploader.tsx` | Drag & drop file upload |
| `src/app/page.tsx` | Single-page app — orchestrates all state |

### Prompt Generation Strategy

1. **Extract** — `extractor.ts` scans the transcript with regex/vocab banks to find:
   - Primary intent (`create`, `fix`, `analyze`, `explain`, …)
   - Output type (`code`, `list`, `document`, `email`, …)
   - Domain topics (`technology`, `marketing`, `support`, …)
   - Named entities (capitalized sequences, acronyms)
   - Ambiguity score (0–1)
   - Constraint phrases

2. **Format** — `formatter.ts` builds section-by-section markdown using the
   extracted data + selected template. Each template (6 total) has template-specific
   section headings. Clarifying questions are appended automatically when
   `ambiguityScore > 0.3` or `wordCount < 25`.

3. **Enhance** — `index.ts` sends the transcript + a crafted system prompt to
   GPT-4o-mini. The system prompt encodes the template's purpose, model-specific
   formatting rules, verbosity, and language. Falls back to step 2 if the API call fails.

---

## Quick Start

### Prerequisites

- Node.js ≥ 18.17
- npm ≥ 9 (or pnpm / yarn)
- An [OpenAI API key](https://platform.openai.com/api-keys) with access to Whisper and GPT-4o

### 1. Install dependencies

```bash
cd voxprompt
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY
```

### 3. Start the dev server

```bash
npm run dev
# Open http://localhost:3000
```

> **Note:** The app works without an API key using the deterministic prompt builder.
> Transcription will fail without a key — you can paste text directly into the transcript editor.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes* | — | OpenAI API key for Whisper + GPT-4o |
| `TRANSCRIBE_RATE_LIMIT` | No | `10` | Max transcription requests/minute/IP |
| `GENERATE_RATE_LIMIT` | No | `20` | Max generation requests/minute/IP |
| `MAX_AUDIO_SIZE` | No | `26214400` | Max audio file size in bytes (25 MB) |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | App URL (for CORS headers) |

*Without an API key, transcription fails gracefully. Prompt generation uses the deterministic fallback.

---

## API Reference

### `POST /api/transcribe`

Transcribes an audio file using OpenAI Whisper-1.

**Request** — `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `audio` | File | Yes | mp3, wav, m4a, webm, ogg, flac — max 25 MB |

**Example (curl)**

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@my-recording.webm"
```

**Success Response** `200 OK`

```json
{
  "transcript": "I need to build a REST API with JWT authentication using Node.js and Express.",
  "language": "en",
  "duration": 8.5,
  "segments": [
    { "start": 0.0, "end": 4.2, "text": "I need to build a REST API with JWT authentication" },
    { "start": 4.2, "end": 8.5, "text": "using Node.js and Express." }
  ]
}
```

**Error Responses**

| Status | Code | Cause |
|---|---|---|
| `400` | `MISSING_FIELD` | No `audio` field in form data |
| `400` | `INVALID_FILE` | Wrong MIME type or file too large |
| `422` | `NO_SPEECH` | Whisper detected no speech |
| `429` | `RATE_LIMITED` | Too many requests |
| `500` | `TRANSCRIPTION_ERROR` | Whisper API failure |
| `500` | `CONFIG_ERROR` | Missing `OPENAI_API_KEY` |

---

### `POST /api/generate`

Transforms a transcript + options into a structured AI prompt.

**Request** — `application/json`

```json
{
  "transcript": "I need to build a REST API with JWT authentication using Node.js and Express.",
  "template": "coding",
  "modelTarget": "claude",
  "verbosity": "detailed",
  "language": "en"
}
```

| Field | Type | Values |
|---|---|---|
| `transcript` | string | 10–10 000 characters |
| `template` | string | `general` `coding` `marketing` `meeting` `support` `research` |
| `modelTarget` | string | `universal` `claude` `chatgpt` |
| `verbosity` | string | `short` `medium` `detailed` |
| `language` | string | `auto` `en` `pt` |

**Success Response** `200 OK`

```json
{
  "prompt": "# Coding Task Prompt\n\nYou are an expert software engineer...\n\n## Goal\n...",
  "metadata": {
    "template": "coding",
    "modelTarget": "claude",
    "verbosity": "detailed",
    "language": "en",
    "timestamp": "2026-02-24T10:30:00.000Z",
    "usedAI": true
  }
}
```

**Error Responses**

| Status | Code | Cause |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid or missing fields |
| `400` | `BAD_REQUEST` | Non-JSON body |
| `429` | `RATE_LIMITED` | Too many requests |
| `500` | `GENERATION_ERROR` | Unexpected server error |

---

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-runs on file change)
npm run test:watch

# With coverage report
npm run test:coverage
```

Tests cover:

- `extractFromTranscript` — intent, output type, topics, entities, ambiguity, constraints
- `buildPrompt` — all 6 templates, verbosity levels, clarifying questions trigger
- `validateAudioFile` — MIME allowlist, size limits
- `generateSchema` — Zod validation edge cases
- `rateLimit` — sliding-window logic

---

## Production Build

```bash
# Type-check + build
npm run build

# Start production server
npm start
```

For deployment to **Vercel**:

```bash
vercel --prod
# Add OPENAI_API_KEY in the Vercel dashboard under Environment Variables
```

For **Docker**:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Add `output: 'standalone'` to `next.config.js` for the Docker build.

---

## Project Structure

```
voxprompt/
├── .env.example              # Environment variable template
├── .eslintrc.json            # ESLint config
├── .prettierrc               # Prettier config
├── jest.config.ts            # Jest config
├── next.config.js            # Next.js config (body size, headers)
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── src/
    ├── app/
    │   ├── globals.css       # Tailwind + animation utilities
    │   ├── layout.tsx        # Root layout (metadata, fonts)
    │   ├── page.tsx          # Main single-page app
    │   └── api/
    │       ├── transcribe/route.ts  # POST /api/transcribe
    │       └── generate/route.ts   # POST /api/generate
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx    # Reusable button (variants, loading state)
    │   │   ├── Card.tsx      # Card wrapper with optional accent border
    │   │   └── Select.tsx    # Styled native select
    │   ├── AudioRecorder.tsx # MediaRecorder + canvas waveform
    │   ├── AudioUploader.tsx # Drag & drop file upload
    │   ├── Header.tsx        # App header
    │   ├── PromptOptions.tsx # Model, verbosity, language selectors
    │   ├── PromptOutput.tsx  # Output panel with copy/download
    │   ├── TemplateSelector.tsx # 6-template grid selector
    │   └── TranscriptEditor.tsx # Editable transcript + segments
    ├── lib/
    │   ├── prompt-builder/
    │   │   ├── extractor.ts  # Heuristic transcript analysis
    │   │   ├── formatter.ts  # Deterministic markdown builder
    │   │   ├── index.ts      # Orchestrator (AI + fallback)
    │   │   └── templates.ts  # Template & model configs
    │   ├── rate-limit.ts     # In-memory sliding-window limiter
    │   ├── transcription.ts  # Whisper API wrapper
    │   └── validation.ts     # Zod schemas + audio validation
    ├── types/
    │   └── index.ts          # Shared TypeScript types
    └── __tests__/
        └── prompt-builder.test.ts  # Unit tests (45+ test cases)
```

---

## Limitations & Next Steps

- **Rate limiter is process-local** — use Redis/Upstash for multi-instance deployments
- **No auth** — add NextAuth or Clerk for user accounts
- **No storage** — generated prompts exist only in-browser; add a database to save history
- **Streaming** — pipe GPT responses as a stream for better UX on long detailed prompts
- **Mobile** — MediaRecorder works on iOS Safari 14.5+ (may need polyfill for older devices)
