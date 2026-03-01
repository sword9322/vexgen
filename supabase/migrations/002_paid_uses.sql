-- ============================================================
-- Migration 002: paid_uses_remaining + unified use_generation
-- ============================================================
-- Each $5 payment grants 15 uses. Free tier = 2 uses.
-- use_generation() replaces use_free_generation().
-- add_paid_uses() is called by the Stripe webhook.
-- ============================================================

-- Add paid uses column (0 by default until they pay)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS paid_uses_remaining integer NOT NULL DEFAULT 0;

-- ── Unified generation gate ───────────────────────────────
-- Tries free uses first, then paid uses.
-- Returns: 'free' | 'paid' | 'denied'
CREATE OR REPLACE FUNCTION use_generation(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Try free uses first
  UPDATE profiles
  SET free_uses_remaining = free_uses_remaining - 1,
      updated_at = now()
  WHERE user_id = p_user_id
    AND free_uses_remaining > 0;

  IF FOUND THEN RETURN 'free'; END IF;

  -- Try paid uses
  UPDATE profiles
  SET paid_uses_remaining = paid_uses_remaining - 1,
      updated_at = now()
  WHERE user_id = p_user_id
    AND paid_uses_remaining > 0;

  IF FOUND THEN RETURN 'paid'; END IF;

  RETURN 'denied';
END;
$$;

-- ── Grant paid uses (called by Stripe webhook) ────────────
CREATE OR REPLACE FUNCTION add_paid_uses(p_user_id uuid, p_count integer DEFAULT 15)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET paid_uses_remaining = paid_uses_remaining + p_count,
      is_paid = true,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;
