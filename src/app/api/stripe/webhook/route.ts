// ============================================================
// POST /api/stripe/webhook
// Verifies Stripe signature and marks user as paid on success.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-02-25.clover',
});

// Disable Next.js body parsing — we need the raw bytes for signature verification.
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[VoxPrompt] STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });
  }

  // Read raw body (must be done before any other body consumption)
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[VoxPrompt] Stripe webhook signature verification failed:', msg);
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 });
  }

  // ── Handle events ─────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;

    if (!userId) {
      console.error('[VoxPrompt] Webhook: checkout.session.completed missing user_id metadata');
      return NextResponse.json({ received: true });
    }

    try {
      const supabase = getServiceClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          stripe_customer_id: session.customer as string | null,
          stripe_payment_id: session.subscription as string | null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('[VoxPrompt] Webhook: failed to update profile:', error);
        // Return 500 so Stripe retries
        return NextResponse.json({ error: 'DB update failed.' }, { status: 500 });
      }

      console.log(`[VoxPrompt] Webhook: user ${userId} marked as paid`);
    } catch (err) {
      console.error('[VoxPrompt] Webhook: unexpected error:', err);
      return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
