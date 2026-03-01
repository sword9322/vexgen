'use client';

// ============================================================
// VoxPrompt – Supabase browser client helper
// ============================================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _browserClient: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client for browser use.
 * Returns null if the env vars are not configured (graceful degradation).
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!_browserClient) {
    _browserClient = createClient(url, key);
  }
  return _browserClient;
}
