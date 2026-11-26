-- ============================================================
-- NANCYFLIX · one-paste database setup (free Supabase plan)
-- Supabase dashboard -> SQL Editor -> New query -> paste all -> Run
-- Safe to run twice: every statement is idempotent.
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  gender text,
  avatar text,
  settings jsonb default '{}'::jsonb,
  notifications jsonb default '[]'::jsonb,
  history jsonb default '[]'::jsonb,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.watchlists (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.announcements (
  id text primary key,
  title text,
  message text,
  ts bigint,
  "by" text
);

create table if not exists public.feedback (
  id text primary key,
  user_id uuid,
  email text,
  payload jsonb,
  ts bigint,
  read boolean default false
);

alter table public.profiles      enable row level security;
alter table public.watchlists    enable row level security;
alter table public.announcements enable row level security;
alter table public.feedback      enable row level security;

-- owner-only rows -------------------------------------------------
drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile write"  on public.profiles;
create policy "own profile read"  on public.profiles for select using (auth.uid() = id);
create policy "own profile write" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own watchlist" on public.watchlists;
create policy "own watchlist" on public.watchlists for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- announcements: everybody reads, owner accounts write --------
drop policy if exists "announcements read" on public.announcements;
create policy "announcements read" on public.announcements for select to authenticated using (true);

drop policy if exists "announcements admin write" on public.announcements;
create policy "announcements admin write" on public.announcements for all to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email','')) in ('bridah888@gmail.com','achiengnancy65@gmail.com'))
  with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('bridah888@gmail.com','achiengnancy65@gmail.com'));

-- feedback: a user writes their own, owners read everything ---
drop policy if exists "feedback insert own" on public.feedback;
create policy "feedback insert own" on public.feedback for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "feedback admin read" on public.feedback;
create policy "feedback admin read" on public.feedback for select to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email','')) in ('bridah888@gmail.com','achiengnancy65@gmail.com')
         or auth.uid() = user_id);

drop policy if exists "feedback admin write" on public.feedback;
create policy "feedback admin write" on public.feedback for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email','')) in ('bridah888@gmail.com','achiengnancy65@gmail.com'))
  with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('bridah888@gmail.com','achiengnancy65@gmail.com'));

-- owner accounts can read every profile (admin directory) -----
drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles admin read" on public.profiles for select to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email','')) in ('bridah888@gmail.com','achiengnancy65@gmail.com'));

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles      to authenticated;
grant select, insert, update on public.watchlists    to authenticated;
grant select, insert, update on public.announcements to authenticated;
grant select, insert, update on public.feedback      to authenticated;

-- keep an updated_at on watchlists
create or replace function public.nf_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists nf_touch_watchlists on public.watchlists;
create trigger nf_touch_watchlists before update on public.watchlists
  for each row execute function public.nf_touch();
