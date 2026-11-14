-- =====================================================================
-- VA Training Academy — Phase 2
-- 002 · Authorization helpers, profile triggers, admin bootstrap
-- =====================================================================

-- ---------------------------------------------------------------------
-- Authorization helpers
-- SECURITY DEFINER so they read `profiles` without going through its RLS
-- policies — this is what prevents "infinite recursion detected in
-- policy" errors when profiles policies need to ask "is caller admin?".
-- They only ever answer questions about the *calling* user.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_active_user() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_active_user() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- New auth user → profile
-- Runs in the same transaction as the auth.users insert, so a failure
-- here aborts the whole account creation (no orphaned records).
--
-- Role is ALWAYS 'member' and status ALWAYS 'inactive'. Metadata is only
-- used for display names — never for authorization. The admin-members
-- Edge Function activates the profile after a successful invite; anyone
-- who slips in another way (e.g. public sign-ups accidentally left on)
-- lands inactive and can see nothing.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role, status)
  values (
    new.id,
    lower(new.email),
    left(btrim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), 80),
    left(btrim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), 80),
    'member',
    'inactive'
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: auth users created before this migration get the same safe
-- default (inactive member), e.g. an admin user added before running migrations.
insert into public.profiles (id, email, first_name, last_name, role, status)
select
  u.id,
  lower(u.email),
  left(btrim(coalesce(u.raw_user_meta_data ->> 'first_name', '')), 80),
  left(btrim(coalesce(u.raw_user_meta_data ->> 'last_name', '')), 80),
  'member',
  'inactive'
from auth.users u
where u.email is not null
on conflict (id) do nothing;

-- Keep profiles.email in sync when the auth email changes.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end;
$$;

revoke all on function public.handle_user_email_change() from public, anon, authenticated;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------
-- Privilege-escalation guard
-- RLS decides WHICH rows a browser session may update; this trigger
-- decides WHICH COLUMNS. Browser sessions (roles anon/authenticated) —
-- admins included — can never change id, email, role, status or
-- created_at. Those changes go through the admin-members Edge Function
-- (service_role, after verifying the caller is an active admin) or the
-- SQL editor.
-- ---------------------------------------------------------------------
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.id is distinct from old.id
       or new.email is distinct from old.email
       or new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.created_at is distinct from old.created_at then
      raise exception 'You are not allowed to change this profile field.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------
-- One-time administrator bootstrap
-- Usage (Supabase Dashboard → SQL Editor, which runs as `postgres`):
--   1. Authentication → Users → Add user → Create new user
--      (your email + a strong password, "Auto Confirm User" ticked)
--   2. select public.bootstrap_first_admin('you@example.com');
-- Refuses to run once any administrator exists, and cannot be called
-- through the API by anon/authenticated users.
-- ---------------------------------------------------------------------
create or replace function public.bootstrap_first_admin(admin_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'An administrator already exists. Bootstrap is disabled; promote additional admins with an explicit UPDATE in the SQL editor.';
  end if;

  select id into target_id from public.profiles where email = lower(btrim(admin_email));
  if target_id is null then
    raise exception 'No account found for %. Create the user under Authentication → Users first.', admin_email;
  end if;

  update public.profiles set role = 'admin', status = 'active' where id = target_id;
  return format('%s is now an active administrator.', lower(btrim(admin_email)));
end;
$$;

revoke all on function public.bootstrap_first_admin(text) from public, anon, authenticated;
