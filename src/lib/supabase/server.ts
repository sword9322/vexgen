// ============================================================
// VoxPrompt – Supabase server-side helpers
// NEVER import this in client components.
// ============================================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _serviceClient: SupabaseClient | null = null;

/**
 * Service-role client: bypasses RLS.
 * Use only in API routes (server-side).
 */
export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
    }
    _serviceClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _serviceClient;
}

/**
 * Verify a user's JWT (sent as Bearer token from the browser).
 * Returns the user_id string, or null if the token is invalid.
 */
export async function getUserIdFromToken(token: string): Promise<string | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
