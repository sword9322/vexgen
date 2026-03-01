-- ============================================================
-- VoxPrompt – Initial Schema
-- Run this in your Supabase project via the SQL editor or CLI.
-- ============================================================

-- ── Profiles (one row per authenticated user) ────────────────
create table if not exists public.profiles (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  free_uses_remaining     int not null default 2,
  is_paid                 boolean not null default false,
  paid_at                 timestamptz,
  stripe_customer_id      text,
  stripe_payment_id       text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Anonymous usage tracking ─────────────────────────────────
-- Keyed by httpOnly cookie "anon_id" (UUID set server-side).
create table if not exists public.anon_usage (
  anon_id    uuid primary key,
  uses       int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── RLS: profiles ────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Users may read their own profile (e.g. to show is_paid status)
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

-- All writes go through security-definer RPCs — no direct UPDATE policy needed.
-- The service role (used in API routes) bypasses RLS entirely.

-- ── RLS: anon_usage ──────────────────────────────────────────
-- No user-facing policies: only service-definer functions + service role can write.
alter table public.anon_usage enable row level security;

-- ── RPC: atomic decrement for authenticated users ────────────
-- Returns TRUE if the generation is allowed (paid or had remaining uses).
-- Returns FALSE if the user has exhausted their free quota.
create or replace function public.use_free_generation(p_user_id uuid)
returns boolean language plpgsql security definer as $$
declare
  v_is_paid boolean;
  rows_updated int;
begin
  select is_paid into v_is_paid
  from public.profiles
  where user_id = p_user_id;

  -- Paid users always pass
  if v_is_paid = true then
    return true;
  end if;

  -- Atomically decrement only if remaining > 0
  update public.profiles
  set free_uses_remaining = free_uses_remaining - 1,
      updated_at = now()
  where user_id = p_user_id
    and free_uses_remaining > 0
    and is_paid = false;

  get diagnostics rows_updated = row_count;
  return rows_updated > 0;
end;
$$;

-- ── RPC: atomic increment for anonymous users (max 2) ────────
-- Returns TRUE if the generation is allowed (uses was < 2 before this call).
-- Returns FALSE if already at limit.
create or replace function public.use_anon_generation(p_anon_id uuid)
returns boolean language plpgsql security definer as $$
declare
  rows_affected int;
begin
  -- INSERT on first visit; UPDATE only while uses < 2.
  -- ON CONFLICT DO UPDATE WHERE: if condition is false, no row is touched → ROW_COUNT = 0.
  insert into public.anon_usage (anon_id, uses)
  values (p_anon_id, 1)
  on conflict (anon_id) do update
    set uses       = anon_usage.uses + 1,
        updated_at = now()
    where anon_usage.uses < 2;

  get diagnostics rows_affected = row_count;
  return rows_affected > 0;
end;
$$;
