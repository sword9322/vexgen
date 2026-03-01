// ============================================================
// GET /api/profile
// Returns the current user's usage counters.
// Requires an authenticated user (Bearer token).
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, getUserIdFromToken } from '@/lib/supabase/server';
import type { ApiError } from '@/types';

export interface ProfileData {
  free_uses_remaining: number;
  paid_uses_remaining: number;
  total_uses_remaining: number;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ProfileData | ApiError>> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required.', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const userId = await getUserIdFromToken(token);
  if (!userId) {
    return NextResponse.json(
      { error: 'Invalid token.', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('free_uses_remaining, paid_uses_remaining')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Profile not found.', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    free_uses_remaining: data.free_uses_remaining,
    paid_uses_remaining: data.paid_uses_remaining,
    total_uses_remaining: data.free_uses_remaining + data.paid_uses_remaining,
  });
}
