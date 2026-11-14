-- =====================================================================
-- VA Training Academy — Phase 2
-- 003 · Row Level Security
-- =====================================================================
-- Principles
--  * Deny by default: RLS on every table, nothing for `anon`.
--  * "Active" means profiles.status = 'active'. Inactive users can read
--    only their own profile row (so the app can say "account deactivated").
--  * Admin checks use public.is_admin() (SECURITY DEFINER → no recursion).
--  * auth.uid() / helpers are wrapped in (select …) so Postgres evaluates
--    them once per statement instead of once per row.
-- =====================================================================

alter table public.profiles           enable row level security;
alter table public.categories         enable row level security;
alter table public.training_resources enable row level security;
alter table public.announcements      enable row level security;
alter table public.favorites          enable row level security;
alter table public.learning_progress  enable row level security;
alter table public.activity_logs      enable row level security;

-- Defense in depth: signed-out visitors get no table privileges at all.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- Browser sessions never insert or delete profiles (trigger + Edge Function do).
revoke insert, delete, truncate on public.profiles from authenticated;
-- Activity logs are append-only for browser sessions.
revoke update, delete, truncate on public.activity_logs from authenticated;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy "profiles: read own row"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: admins read all"
  on public.profiles for select to authenticated
  using ((select public.is_admin()));

-- Active users may edit their own row; protect_profile_fields() limits
-- them to first_name, last_name and avatar_url.
create policy "profiles: active users update own row"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and (select public.is_active_user()))
  with check (id = (select auth.uid()));

-- Admins may edit names/avatars of any profile. Role, status and email
-- still require the admin-members Edge Function (see trigger).
create policy "profiles: admins update any row"
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create policy "categories: active users read"
  on public.categories for select to authenticated
  using ((select public.is_active_user()));

create policy "categories: admins insert"
  on public.categories for insert to authenticated
  with check ((select public.is_admin()));

create policy "categories: admins update"
  on public.categories for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "categories: admins delete"
  on public.categories for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- training_resources — members see published only; admins see drafts too
-- ---------------------------------------------------------------------
create policy "training_resources: active users read published"
  on public.training_resources for select to authenticated
  using (status = 'published' and (select public.is_active_user()));

create policy "training_resources: admins read all"
  on public.training_resources for select to authenticated
  using ((select public.is_admin()));

create policy "training_resources: admins insert"
  on public.training_resources for insert to authenticated
  with check ((select public.is_admin()));

create policy "training_resources: admins update"
  on public.training_resources for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "training_resources: admins delete"
  on public.training_resources for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- announcements — members see published only
-- ---------------------------------------------------------------------
create policy "announcements: active users read published"
  on public.announcements for select to authenticated
  using (published and (select public.is_active_user()));

create policy "announcements: admins read all"
  on public.announcements for select to authenticated
  using ((select public.is_admin()));

create policy "announcements: admins insert"
  on public.announcements for insert to authenticated
  with check ((select public.is_admin()));

create policy "announcements: admins update"
  on public.announcements for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "announcements: admins delete"
  on public.announcements for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- favorites — private to each active user
-- The resource subquery runs under training_resources RLS, so members
-- can only favorite resources they are allowed to see (published).
-- ---------------------------------------------------------------------
create policy "favorites: active users read own"
  on public.favorites for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));

create policy "favorites: admins read all"
  on public.favorites for select to authenticated
  using ((select public.is_admin()));

create policy "favorites: active users add own"
  on public.favorites for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_active_user())
    and exists (select 1 from public.training_resources r where r.id = resource_id)
  );

create policy "favorites: active users remove own"
  on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));

-- ---------------------------------------------------------------------
-- learning_progress — private to each active user
-- ---------------------------------------------------------------------
create policy "learning_progress: active users read own"
  on public.learning_progress for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));

create policy "learning_progress: admins read all"
  on public.learning_progress for select to authenticated
  using ((select public.is_admin()));

create policy "learning_progress: active users add own"
  on public.learning_progress for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_active_user())
    and exists (select 1 from public.training_resources r where r.id = resource_id)
  );

create policy "learning_progress: active users update own"
  on public.learning_progress for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- activity_logs — users append their own entries; admins read everything.
-- No UPDATE/DELETE policies (and privileges revoked above): nobody can
-- alter anyone's history from the browser.
-- ---------------------------------------------------------------------
create policy "activity_logs: active users read own"
  on public.activity_logs for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));

create policy "activity_logs: admins read all"
  on public.activity_logs for select to authenticated
  using ((select public.is_admin()));

create policy "activity_logs: active users add own"
  on public.activity_logs for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_active_user())
    and (resource_id is null or exists (select 1 from public.training_resources r where r.id = resource_id))
  );
