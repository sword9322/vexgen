// ============================================================
// VoxPrompt – Shared OpenAI Client Factory
// ============================================================
// Creates a singleton OpenAI instance with optional HTTPS proxy
// support (HTTPS_PROXY / HTTP_PROXY env vars) for environments
// where direct outbound connections to api.openai.com are blocked
// by a corporate firewall or SSL-inspection appliance.
// ============================================================
import OpenAI from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';

let _client: OpenAI | null = null;

/**
 * Return the shared OpenAI client, creating it on first call.
 * Throws a human-readable Error if the API key is missing or still
 * contains the placeholder value from .env.example.
 */
export function getOpenAIClient(): OpenAI {
  if (_client) return _client;

  // ── Validate API key ──────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set.\n' +
        'Open .env.local and add your real OpenAI API key:\n' +
        '  OPENAI_API_KEY=sk-proj-...'
    );
  }
  // Detect the placeholder value from .env.example
  if (apiKey === 'sk-...' || apiKey.startsWith('sk-...')) {
    throw new Error(
      'OPENAI_API_KEY is still set to the placeholder value "sk-...".\n' +
        'Open .env.local and replace it with your real API key from\n' +
        'https://platform.openai.com/api-keys'
    );
  }

  // ── Optional: HTTP/HTTPS proxy (corporate networks) ───────
  // Set HTTPS_PROXY or HTTP_PROXY in .env.local to route OpenAI
  // requests through your corporate proxy server, e.g.:
  //   HTTPS_PROXY=http://proxy.corp.example.com:8080
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy;

  // Undici (Node.js 18+ native fetch) requires `duplex:'half'` on requests
  // that send a body. The OpenAI SDK doesn't add it when a custom fetch is
  // provided, so we wrap it here. This also avoids the ECONNRESET caused by
  // the bundled node-fetch on Vercel/AWS Lambda.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nativeFetch: typeof fetch | undefined = typeof (globalThis as any).fetch === 'function'
    ? (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const options = init?.body !== undefined
          ? { ...init, duplex: 'half' } as unknown as RequestInit
          : init;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (globalThis as any).fetch(url, options) as Promise<Response>;
      }
    : undefined;

  const clientOptions: ConstructorParameters<typeof OpenAI>[0] = {
    apiKey,
    timeout: 90_000, // 90 seconds – enough for long Whisper jobs
    maxRetries: 1,   // one automatic retry on transient errors
    ...(nativeFetch ? { fetch: nativeFetch } : {}),
  };

  if (proxyUrl) {
    console.log(`[VoxPrompt] Routing OpenAI requests through proxy: ${proxyUrl}`);
    clientOptions.httpAgent = new HttpsProxyAgent(proxyUrl);
  }

  _client = new OpenAI(clientOptions);
  return _client;
}

/** Reset the singleton (useful in tests). */
export function resetOpenAIClient(): void {
  _client = null;
}
