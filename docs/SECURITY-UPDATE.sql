-- NANCYFLIX v8.6.0. Run AFTER SUPABASE-SYNC.sql.
-- Back up the database first. This replaces policies on these four app tables.
begin;
create or replace function public.nfx_verified_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u where u.id=auth.uid()
    and u.email_confirmed_at is not null
    and lower(u.email) in ('bridah888@gmail.com','achiengnancy65@gmail.com'));
$$;
revoke all on function public.nfx_verified_admin() from public;
grant execute on function public.nfx_verified_admin() to authenticated;

create or replace function public.nfx_protect_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
declare verified_email text;
begin
  if auth.uid() is not null then
    select lower(email) into verified_email from auth.users
      where id=auth.uid() and email_confirmed_at is not null;
    if new.id <> auth.uid() then raise exception 'Profile owner mismatch'; end if;
    new.email := verified_email;
    new.is_admin := coalesce(verified_email in ('bridah888@gmail.com','achiengnancy65@gmail.com'),false);
  end if;
  return new;
end; $$;
revoke all on function public.nfx_protect_profile_role() from public;
drop trigger if exists nfx_protect_profile_role on public.profiles;
create trigger nfx_protect_profile_role before insert or update on public.profiles
for each row execute function public.nfx_protect_profile_role();
update public.profiles p set is_admin = exists(select 1 from auth.users u
 where u.id=p.id and u.email_confirmed_at is not null
 and lower(u.email) in ('bridah888@gmail.com','achiengnancy65@gmail.com'));

do $$ declare p record; begin
 for p in select schemaname,tablename,policyname from pg_policies
 where schemaname='public' and tablename in ('profiles','watchlists','announcements','feedback')
 loop execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop;
end $$;
create policy "profile read" on public.profiles for select to authenticated
 using (auth.uid()=id or public.nfx_verified_admin());
create policy "profile insert" on public.profiles for insert to authenticated with check(auth.uid()=id);
create policy "profile update" on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);
create policy "watchlist own" on public.watchlists for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "announcements read" on public.announcements for select to authenticated using(true);
create policy "announcements admin" on public.announcements for all to authenticated using(public.nfx_verified_admin()) with check(public.nfx_verified_admin());
create policy "feedback insert" on public.feedback for insert to authenticated with check(auth.uid()=user_id);
create policy "feedback read" on public.feedback for select to authenticated using(auth.uid()=user_id or public.nfx_verified_admin());
create policy "feedback admin update" on public.feedback for update to authenticated using(public.nfx_verified_admin()) with check(public.nfx_verified_admin());

create table if not exists public.entitlements (
 email text primary key, plan text, status text, customer text, session text,
 expires timestamptz, updated_at timestamptz default now()
);
alter table public.entitlements enable row level security;
-- No browser may directly read/write membership rows, regardless of old policies.
revoke all on public.entitlements from anon, authenticated;
grant all on public.entitlements to service_role;
commit;
