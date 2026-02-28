// ============================================================
// VoxPrompt – Unit Tests: Prompt Builder
// Run with: npm test
// ============================================================
import { extractFromTranscript } from '../lib/prompt-builder/extractor';
import { buildPrompt } from '../lib/prompt-builder/formatter';
import { validateAudioFile, generateSchema } from '../lib/validation';
import { rateLimit } from '../lib/rate-limit';
import type { GenerateOptions } from '../types';

// ────────────────────────────────────────────────────────────
// 1. Extractor tests
// ────────────────────────────────────────────────────────────

describe('extractFromTranscript', () => {
  test('detects "create" intent from a coding transcript', () => {
    const transcript =
      'I need you to build a REST API in Node.js that accepts POST requests and stores data in MongoDB.';
    const result = extractFromTranscript(transcript);
    expect(result.primaryIntent).toBe('create');
  });

  test('detects "fix" intent from a debugging transcript', () => {
    const transcript =
      'I have a bug in my React component where the state is not updating correctly when the user clicks the button.';
    const result = extractFromTranscript(transcript);
    expect(result.primaryIntent).toBe('fix');
  });

  test('detects "analyze" intent from an analysis request', () => {
    const transcript =
      'Please analyze the performance of our e-commerce funnel and evaluate the conversion rates at each step.';
    const result = extractFromTranscript(transcript);
    expect(result.primaryIntent).toBe('analyze');
  });

  test('detects "explain" intent', () => {
    const transcript = 'Can you explain how HTTPS certificates work and describe the handshake process?';
    const result = extractFromTranscript(transcript);
    expect(result.primaryIntent).toBe('explain');
  });

  test('returns "general" intent for vague transcripts', () => {
    const transcript = 'I just want something about the thing we discussed.';
    const result = extractFromTranscript(transcript);
    expect(result.primaryIntent).toBe('general');
  });

  test('detects code output type', () => {
    const transcript = 'Write a Python function that sorts a list of dictionaries by a given key.';
    const result = extractFromTranscript(transcript);
    expect(result.outputType).toBe('code');
  });

  test('detects list output type', () => {
    const transcript = 'Give me a list of steps to deploy a Docker container to AWS.';
    const result = extractFromTranscript(transcript);
    expect(result.outputType).toBe('list');
  });

  test('detects email output type', () => {
    const transcript = 'I need to write a follow-up email to our client about the project delay.';
    const result = extractFromTranscript(transcript);
    expect(result.outputType).toBe('email');
  });

  test('detects technology topic', () => {
    const transcript = 'We need to set up a Kubernetes cluster for our microservice architecture.';
    const result = extractFromTranscript(transcript);
    expect(result.topics).toContain('technology');
  });

  test('detects marketing topic', () => {
    const transcript = 'Create a social media marketing campaign to promote our new product launch.';
    const result = extractFromTranscript(transcript);
    expect(result.topics).toContain('marketing');
  });

  test('extracts constraints from transcript', () => {
    const transcript =
      'Build a login page. It must use JWT authentication. Without using any third-party libraries.';
    const result = extractFromTranscript(transcript);
    expect(result.constraints.length).toBeGreaterThan(0);
  });

  test('gives high ambiguity score to vague short transcript', () => {
    const transcript = 'Something about the data thing.';
    const result = extractFromTranscript(transcript);
    expect(result.ambiguityScore).toBeGreaterThan(0.4);
  });

  test('gives low ambiguity score to clear, detailed transcript', () => {
    const transcript =
      'I need to create a React component that renders a paginated table. ' +
      'It should accept data as props, support sorting by column, and include ' +
      'a search input that filters rows in real time. Use TypeScript and Tailwind CSS.';
    const result = extractFromTranscript(transcript);
    expect(result.ambiguityScore).toBeLessThan(0.4);
  });

  test('wordCount is accurate', () => {
    const transcript = 'One two three four five';
    const result = extractFromTranscript(transcript);
    expect(result.wordCount).toBe(5);
  });

  test('extracts named entities', () => {
    const transcript =
      'We are migrating from AWS to Google Cloud using Terraform.';
    const result = extractFromTranscript(transcript);
    // Should detect "AWS", "Google Cloud", or "Terraform" as entities
    expect(result.entities.length).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────────────────────
// 2. Formatter / buildPrompt tests
// ────────────────────────────────────────────────────────────

describe('buildPrompt', () => {
  const baseOptions: GenerateOptions = {
    transcript: 'I need to build a REST API with authentication using Node.js and Express.',
    template: 'coding',
    modelTarget: 'universal',
    verbosity: 'medium',
    language: 'en',
  };

  test('returns a non-empty string', () => {
    const extracted = extractFromTranscript(baseOptions.transcript);
    const prompt = buildPrompt(baseOptions.transcript, extracted, baseOptions);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  test('includes the template name in the output', () => {
    const extracted = extractFromTranscript(baseOptions.transcript);
    const prompt = buildPrompt(baseOptions.transcript, extracted, baseOptions);
    expect(prompt.toLowerCase()).toContain('coding');
  });

  test('includes a Goal section for coding template', () => {
    const extracted = extractFromTranscript(baseOptions.transcript);
    const prompt = buildPrompt(baseOptions.transcript, extracted, baseOptions);
    expect(prompt).toContain('## Goal');
  });

  test('generates clarifying questions for ambiguous transcript', () => {
    const ambiguousTranscript = 'I need something for work.';
    const opts: GenerateOptions = { ...baseOptions, transcript: ambiguousTranscript };
    const extracted = extractFromTranscript(ambiguousTranscript);
    const prompt = buildPrompt(ambiguousTranscript, extracted, opts);
    expect(prompt).toContain('Clarifying Questions');
  });

  test('does NOT add clarifying questions for clear transcript', () => {
    const clearTranscript =
      'Build a TypeScript function called parseCSV that takes a string input of comma-separated ' +
      'values with a header row and returns an array of objects where each key is the header name. ' +
      'It must handle quoted fields, empty cells, and return an empty array on blank input.';
    const extracted = extractFromTranscript(clearTranscript);

    // Ambiguity score should be low enough to skip clarifying questions
    expect(extracted.ambiguityScore).toBeLessThan(0.3);
  });

  test('general template includes Expected Output section', () => {
    const opts: GenerateOptions = { ...baseOptions, template: 'general' };
    const extracted = extractFromTranscript(opts.transcript);
    const prompt = buildPrompt(opts.transcript, extracted, opts);
    expect(prompt).toContain('## Expected Output');
  });

  test('marketing template includes Campaign Goal section', () => {
    const marketingTranscript =
      'I want to launch a social media marketing campaign for our new SaaS product targeting startup founders.';
    const opts: GenerateOptions = {
      ...baseOptions,
      transcript: marketingTranscript,
      template: 'marketing',
    };
    const extracted = extractFromTranscript(marketingTranscript);
    const prompt = buildPrompt(marketingTranscript, extracted, opts);
    expect(prompt).toContain('## Campaign Goal');
  });

  test('meeting template includes Action Items section', () => {
    const meetingTranscript =
      'We discussed the Q2 roadmap. Alice will handle the authentication feature by March. ' +
      'Bob will fix the performance issues. We decided to skip the mobile app for now.';
    const opts: GenerateOptions = {
      ...baseOptions,
      transcript: meetingTranscript,
      template: 'meeting',
    };
    const extracted = extractFromTranscript(meetingTranscript);
    const prompt = buildPrompt(meetingTranscript, extracted, opts);
    expect(prompt).toContain('## Action Items');
  });

  test('support template includes Issue Description section', () => {
    const supportTranscript =
      'Our payment service is returning 500 errors when users try to checkout. ' +
      'This started after the latest deployment. The error log shows a database timeout.';
    const opts: GenerateOptions = {
      ...baseOptions,
      transcript: supportTranscript,
      template: 'support',
    };
    const extracted = extractFromTranscript(supportTranscript);
    const prompt = buildPrompt(supportTranscript, extracted, opts);
    expect(prompt).toContain('## Issue Description');
  });

  test('research template includes Research Question section', () => {
    const researchTranscript =
      'I need to research the impact of remote work on employee productivity in the tech sector.';
    const opts: GenerateOptions = {
      ...baseOptions,
      transcript: researchTranscript,
      template: 'research',
    };
    const extracted = extractFromTranscript(researchTranscript);
    const prompt = buildPrompt(researchTranscript, extracted, opts);
    expect(prompt).toContain('## Research Question');
  });

  test('detailed verbosity includes Success Criteria', () => {
    const opts: GenerateOptions = { ...baseOptions, verbosity: 'detailed' };
    const extracted = extractFromTranscript(opts.transcript);
    const prompt = buildPrompt(opts.transcript, extracted, opts);
    expect(prompt).toContain('## Success Criteria');
  });

  test('short verbosity produces a shorter prompt than detailed', () => {
    const extracted = extractFromTranscript(baseOptions.transcript);
    const shortPrompt = buildPrompt(baseOptions.transcript, extracted, {
      ...baseOptions,
      verbosity: 'short',
    });
    const detailedPrompt = buildPrompt(baseOptions.transcript, extracted, {
      ...baseOptions,
      verbosity: 'detailed',
    });
    expect(shortPrompt.length).toBeLessThan(detailedPrompt.length);
  });

  test('output is valid Markdown (contains ## headings)', () => {
    const extracted = extractFromTranscript(baseOptions.transcript);
    const prompt = buildPrompt(baseOptions.transcript, extracted, baseOptions);
    expect(prompt).toMatch(/^##\s.+/m);
  });
});

// ────────────────────────────────────────────────────────────
// 3. Validation tests
// ────────────────────────────────────────────────────────────

describe('validateAudioFile', () => {
  test('accepts audio/webm', () => {
    expect(validateAudioFile('audio/webm', 1024 * 1024)).toBeNull();
  });

  test('accepts audio/mpeg (mp3)', () => {
    expect(validateAudioFile('audio/mpeg', 1024 * 1024)).toBeNull();
  });

  test('accepts audio/webm with codec params', () => {
    expect(validateAudioFile('audio/webm;codecs=opus', 1024 * 1024)).toBeNull();
  });

  test('rejects video/mp4', () => {
    const err = validateAudioFile('video/mp4', 1024 * 1024);
    expect(err).not.toBeNull();
    expect(err).toContain('Unsupported');
  });

  test('rejects image/jpeg', () => {
    expect(validateAudioFile('image/jpeg', 1024)).not.toBeNull();
  });

  test('rejects files over 25 MB', () => {
    const tooBig = 26 * 1024 * 1024;
    const err = validateAudioFile('audio/mpeg', tooBig);
    expect(err).not.toBeNull();
    expect(err).toContain('too large');
  });

  test('accepts file exactly at 25 MB boundary', () => {
    const exactly25MB = 25 * 1024 * 1024;
    expect(validateAudioFile('audio/wav', exactly25MB)).toBeNull();
  });
});

describe('generateSchema', () => {
  const validInput = {
    transcript: 'Build me a REST API for a todo app with authentication.',
    template: 'coding',
    modelTarget: 'universal',
    verbosity: 'medium',
    language: 'en',
  };

  test('accepts valid input', () => {
    const result = generateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  test('trims whitespace from transcript', () => {
    const result = generateSchema.safeParse({ ...validInput, transcript: '  hello world  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transcript).toBe('hello world');
    }
  });

  test('rejects transcript shorter than 10 chars', () => {
    const result = generateSchema.safeParse({ ...validInput, transcript: 'short' });
    expect(result.success).toBe(false);
  });

  test('rejects invalid template value', () => {
    const result = generateSchema.safeParse({ ...validInput, template: 'invalid_template' });
    expect(result.success).toBe(false);
  });

  test('rejects invalid modelTarget', () => {
    const result = generateSchema.safeParse({ ...validInput, modelTarget: 'gpt-5' });
    expect(result.success).toBe(false);
  });

  test('rejects missing transcript', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { transcript: _transcript, ...rest } = validInput;
    const result = generateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test('accepts all valid templates', () => {
    const templates = ['general', 'coding', 'marketing', 'meeting', 'support', 'research'];
    for (const template of templates) {
      const result = generateSchema.safeParse({ ...validInput, template });
      expect(result.success).toBe(true);
    }
  });
});

// ────────────────────────────────────────────────────────────
// 4. Rate limiter tests
// ────────────────────────────────────────────────────────────

describe('rateLimit', () => {
  test('allows requests within the limit', () => {
    const id = `test-${Date.now()}-a`;
    const result = rateLimit(id, 5, 60_000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
  });

  test('blocks requests over the limit', () => {
    const id = `test-${Date.now()}-b`;
    for (let i = 0; i < 3; i++) rateLimit(id, 3, 60_000);
    const result = rateLimit(id, 3, 60_000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test('different identifiers are tracked independently', () => {
    const id1 = `test-${Date.now()}-c1`;
    const id2 = `test-${Date.now()}-c2`;
    for (let i = 0; i < 3; i++) rateLimit(id1, 3, 60_000);
    // id1 is exhausted, id2 is fresh
    const r1 = rateLimit(id1, 3, 60_000);
    const r2 = rateLimit(id2, 3, 60_000);
    expect(r1.success).toBe(false);
    expect(r2.success).toBe(true);
  });

  test('resetAt is in the future', () => {
    const id = `test-${Date.now()}-d`;
    const result = rateLimit(id, 5, 60_000);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});
