-- =====================================================================
-- NANCYFLIX — Supabase schema, Row Level Security & admin provisioning
-- Dev Brian Studios. Run this in the Supabase SQL editor.
-- NOTHING here is secret; secrets (service-role key, email key) stay in
-- Edge Function environment variables, never in index.html.
-- =====================================================================

-- 1) PROFILES --------------------------------------------------------
-- One row per auth user. `is_admin` is the ONLY source of truth for the
-- admin role. Normal users can read/update their own row but CANNOT set
-- is_admin (enforced by the policy + trigger below).
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  name        text,
  gender      text,
  avatar      text,                 -- data URL or storage path
  is_admin    boolean not null default false,
  settings    jsonb   not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  last_login  timestamptz
);
alter table public.profiles enable row level security;

create policy "profiles: read own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);
-- Admins may read every profile (user directory):
create policy "profiles: admin read all" on public.profiles for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Prevent users from escalating their own role. Only the service role
-- (server side) can flip is_admin.
create or replace function public.lock_admin_flag() returns trigger as $$
begin
  if auth.role() <> 'service_role' then
    new.is_admin := old.is_admin;  -- ignore any client attempt to change it
  end if;
  return new;
end; $$ language plpgsql security definer;
create trigger trg_lock_admin before update on public.profiles
  for each row execute function public.lock_admin_flag();

-- Auto-create a profile when a new auth user signs up.
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, name, is_admin)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'name',''),
    -- initial provisioning of the two designated admin accounts:
    new.email in ('bridah888@gmail.com','agollanancy@gmail.com')
  )
  on conflict (id) do nothing;
  return new;
end; $$ language plpgsql security definer;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) WATCHLISTS ------------------------------------------------------
create table if not exists public.watchlists (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items   jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.watchlists enable row level security;
create policy "watchlist: owner all" on public.watchlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) FEEDBACK / RATINGS / REPORTS (admin inbox) ----------------------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('feedback','rating','report')),
  rating int, topic text, message text,
  from_email text, from_name text,
  read boolean not null default false,
  ts timestamptz not null default now()
);
alter table public.feedback enable row level security;
-- Anyone signed in (or anon, if you allow) can insert; only admins can read.
create policy "feedback: insert any auth" on public.feedback for insert with check (true);
create policy "feedback: admin read"  on public.feedback for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "feedback: admin update" on public.feedback for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- 4) ANNOUNCEMENTS (admin -> users' notifications) -------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text, message text not null,
  by_email text, ts timestamptz not null default now()
);
alter table public.announcements enable row level security;
-- Every signed-in user may READ announcements (they appear in notifications).
create policy "announce: read all auth" on public.announcements for select using (auth.role() = 'authenticated');
-- Only admins may publish.
create policy "announce: admin insert" on public.announcements for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- 5) AUDIT LOG -------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null, actor text, meta text,
  ts timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy "audit: insert auth" on public.audit_log for insert with check (true);
create policy "audit: admin read" on public.audit_log for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- 6) MANUAL ADMIN PROVISIONING (run once, service role / SQL editor) --
-- If an admin registered before the trigger existed:
-- update public.profiles set is_admin = true
--   where email in ('bridah888@gmail.com','agollanancy@gmail.com');
