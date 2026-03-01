-- ============================================================
-- Migration 003: Add email column to profiles
-- Stores email on signup for easy mailing list access.
-- ============================================================

-- Add email column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill existing users from auth.users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id;

-- Update trigger so new signups automatically store their email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;
