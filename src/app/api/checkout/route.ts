// ============================================================
// POST /api/checkout
// Creates a Stripe Checkout session for a $5 one-time payment.
// Requires an authenticated user (Bearer token).
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserIdFromToken } from '@/lib/supabase/server';
import type { ApiError } from '@/types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-02-25.clover',
});

export async function POST(request: NextRequest): Promise<NextResponse<{ url: string } | ApiError>> {
  // ── Authenticate ─────────────────────────────────────────
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Authentication required.', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const userId = await getUserIdFromToken(token);
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token.', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  // ── Create Stripe Checkout session ───────────────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_creation: 'always',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: 500, // $5.00
          product_data: {
            name: 'VoxPrompt — Unlimited Access',
            description: 'Unlimited AI prompt generations',
          },
        },
        quantity: 1,
      },
    ],
    metadata: { user_id: userId },
    success_url: `${siteUrl}/?payment=success`,
    cancel_url: `${siteUrl}/?payment=cancel`,
  });

  if (!session.url) {
    return NextResponse.json({ error: 'Failed to create checkout session.', code: 'STRIPE_ERROR' }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
