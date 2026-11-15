-- =====================================================================
-- VA Training Academy — public "Create account"
-- 008 · Self-registration setting + first-sign-in alerts
-- =====================================================================
-- Visitors can now create their own account on the sign-in page
-- (Supabase Auth → "Allow new users to sign up" must be ON).
--
-- * Self-registered accounts are ALWAYS role 'member' (metadata is never
--   used for roles), so nobody can sign themselves up as an admin.
-- * Their status comes from portal_settings.new_account_status:
--     'active'   → can sign in and learn immediately   (default)
--     'inactive' → must be activated by an admin first (approval mode)
--   Switch with one line in the SQL Editor (see supabase/README.md).
-- * Accounts created by admins (admin-members function) still get the
--   role/status the admin chose — the function sets them explicitly.
-- * The login alert now tells the admin when it's a member's FIRST sign-in.
-- Additive only: no existing data is changed.

-- ---------------------------------------------------------------------
-- 1. Portal settings (single row; changed via the SQL Editor only)
-- ---------------------------------------------------------------------
create table if not exists public.portal_settings (
  id boolean primary key default true check (id),            -- exactly one row
  new_account_status text not null default 'active'
    check (new_account_status in ('active', 'inactive')),
  updated_at timestamptz not null default now()
);
insert into public.portal_settings (id) values (true) on conflict (id) do nothing;

comment on table public.portal_settings is
  'Portal-wide settings. new_account_status = status given to self-registered accounts (active | inactive = approval required).';

alter table public.portal_settings enable row level security;
-- No policies and no grants: browsers can neither read nor change settings.
revoke all on public.portal_settings from anon, authenticated;

drop trigger if exists portal_settings_set_updated_at on public.portal_settings;
create trigger portal_settings_set_updated_at
  before update on public.portal_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. New accounts: role always 'member'; status from the setting.
--    Fails closed (inactive) if the setting row were ever missing.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  initial_status text := coalesce(
    (select new_account_status from public.portal_settings where id limit 1),
    'inactive'
  );
begin
  insert into public.profiles (id, email, first_name, last_name, role, status)
  values (
    new.id,
    lower(new.email),
    left(btrim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), 80),
    left(btrim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), 80),
    'member',
    initial_status
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Login alert: flag a member's first-ever sign-in ("New member joined")
-- ---------------------------------------------------------------------
create or replace function public.handle_user_sign_in()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  alert_url text;
  alert_secret text;
  sess jsonb;
  first_time boolean;
begin
  begin
    select id, email, first_name, last_name, role, status into p
    from public.profiles where id = new.id;
    if p.id is null then
      return new;
    end if;

    first_time := not exists (
      select 1 from public.activity_logs where user_id = new.id and activity_type = 'signed_in'
    );

    -- 1) Trusted sign-in record (cannot be skipped or forged from the browser).
    insert into public.activity_logs (user_id, activity_type) values (new.id, 'signed_in');

    -- 2) Email alert — members only.
    if p.role <> 'member' then
      return new;
    end if;

    select decrypted_secret into alert_url from vault.decrypted_secrets where name = 'login_alert_url' limit 1;
    select decrypted_secret into alert_secret from vault.decrypted_secrets where name = 'login_alert_secret' limit 1;
    if alert_url is null or alert_secret is null then
      return new; -- alerts not configured yet
    end if;

    begin
      select to_jsonb(s) into sess from auth.sessions s where s.user_id = new.id order by s.created_at desc limit 1;
    exception when others then
      sess := null;
    end;

    perform net.http_post(
      url := alert_url,
      body := jsonb_build_object(
        'user_id', p.id,
        'email', p.email,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'signed_in_at', new.last_sign_in_at,
        'first_sign_in', first_time,
        'account_status', p.status,
        'user_agent', sess ->> 'user_agent',
        'ip', sess ->> 'ip'
      ),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-alert-secret', alert_secret),
      timeout_milliseconds := 5000
    );
  exception when others then
    raise warning 'login alert skipped for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.handle_user_sign_in() from public, anon, authenticated;
