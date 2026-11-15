-- =====================================================================
-- VA Training Academy — turn on "Create account" + admin member controls
-- (copy-paste, one time)
-- =====================================================================
-- Run in: Supabase Dashboard → SQL Editor → New query → paste ALL of this → Run
--
-- What it does:
--   * Anyone can create an account and sign in right away (always as a
--     member, never an admin).
--   * You (admin) can activate / deactivate / edit members in Admin → Members.
--   * Every sign-in is listed in Admin → Activity Logs. No emails are sent.
-- Safe to run more than once (also if you ran an earlier version). Nothing
-- in your members' data is deleted.
--
-- (Technical: migrations 20261118100000 – 20261121100000 combined. Running
--  `npx supabase db push` later is fine.)
-- =====================================================================

do $$
begin
  if to_regclass('public.profiles') is null
     or not exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'activity_logs' and column_name = 'target_type') then
    raise exception 'The earlier database setup is missing. Run the migrations first (DEPLOYMENT_GUIDE.md step 3), then run this script again.';
  end if;
end $$;


-- ===================== 20261118100000_login_alerts.sql =====================
-- =====================================================================
-- VA Training Academy — login alerts
-- 007 · Trusted sign-in log + email alert for member sign-ins
-- =====================================================================
-- Every real sign-in (password, invitation link, password-reset link)
-- makes Supabase Auth update auth.users.last_sign_in_at. A trigger on that
-- column (auth.users triggers are supported by Supabase):
--   1. writes a "signed_in" entry to activity_logs   (all users), and
--   2. for MEMBERS, asks the `login-alert` Edge Function to email the admin.
--
-- Safety rules:
--   * The email request is asynchronous (pg_net) — sign-in is never delayed.
--   * Any error inside the trigger is caught and logged as a warning, so a
--     misconfigured alert can NEVER block anyone from signing in.
--   * The function URL and shared secret live in Supabase Vault (encrypted);
--     until they are added (supabase/setup/login_alerts.sql) only step 1 runs.
-- Additive only: no existing data is changed.

-- pg_net sends HTTP requests from the database. It is available on every
-- Supabase project; if it can't be enabled here, alerts are simply skipped.
do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net could not be enabled (%). Login emails stay off until it is enabled under Database → Extensions.', sqlerrm;
end
$$;

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
begin
  begin
    select id, email, first_name, last_name, role, status into p
    from public.profiles where id = new.id;
    if p.id is null then
      return new;
    end if;

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

    -- Best-effort device details from the newest session (may be unavailable).
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
        'user_agent', sess ->> 'user_agent',
        'ip', sess ->> 'ip'
      ),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-alert-secret', alert_secret),
      timeout_milliseconds := 5000
    );
  exception when others then
    -- Never block a sign-in because of logging/alerting.
    raise warning 'login alert skipped for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.handle_user_sign_in() from public, anon, authenticated;

drop trigger if exists on_auth_user_signed_in on auth.users;
create trigger on_auth_user_signed_in
  after update of last_sign_in_at on auth.users
  for each row
  when (new.last_sign_in_at is distinct from old.last_sign_in_at)
  execute function public.handle_user_sign_in();

-- Sign-ins are now recorded by the server, so browsers may no longer write
-- 'signed_in' entries themselves — every "Signed in" row in Activity Logs
-- is genuine. (Other learning activity is unchanged.)
drop policy if exists "activity_logs: active users add own member activity" on public.activity_logs;
create policy "activity_logs: active users add own member activity"
  on public.activity_logs for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_active_user())
    and activity_type in ('viewed', 'watched', 'downloaded', 'completed', 'favorited')
    and target_type is null and target_id is null and target_label is null and details is null
    and (resource_id is null or exists (select 1 from public.training_resources r where r.id = resource_id))
  );

-- ===================== 20261119100000_self_signup.sql =====================
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

-- ===================== 20261120100000_direct_login_alert_email.sql =====================
-- =====================================================================
-- VA Training Academy — simpler login alert emails
-- 009 · The database emails the admin directly through Resend
-- =====================================================================
-- Replaces the `login-alert` Edge Function: no function deploy, no shared
-- secret, no terminal. Setup = paste one SQL script with a Resend API key
-- (supabase/setup/2_login_alert_emails.sql).
--
-- Settings live in Supabase Vault (encrypted), read only by this function:
--   resend_api_key        (required) Resend API key, "re_…"
--   login_alert_to        (required) who receives alerts
--   login_alert_from      (optional) sender, default "VA Training Academy <onboarding@resend.dev>"
--   login_alert_timezone  (optional) e.g. Asia/Manila, default UTC
--   login_alert_site_url  (optional) your website, adds a "View member" link
--
-- Unchanged guarantees: every sign-in is logged; only MEMBER sign-ins are
-- emailed; the request is asynchronous (pg_net); and any error is caught,
-- so alerts can never block a sign-in.
-- Idempotent: safe to run again.

-- HTML-escape helper for email content.
create or replace function public.html_escape(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;

-- "Chrome on Windows" from a user-agent string (best effort).
create or replace function public.describe_device(ua text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when ua is null or ua = '' then 'Unknown device' else
    (case
       when ua ~ 'Edg/' then 'Edge'
       when ua ~ '(OPR/|Opera)' then 'Opera'
       when ua ~ 'Firefox/' then 'Firefox'
       when ua ~ 'Chrome/' then 'Chrome'
       when ua ~ 'Safari/' then 'Safari'
       else 'Browser' end)
    || ' on ' ||
    (case
       when ua ~ '(iPhone|iPad|iPod)' then 'iPhone/iPad'
       when ua ~ 'Android' then 'Android'
       when ua ~ 'Windows' then 'Windows'
       when ua ~ '(Mac OS X|Macintosh)' then 'Mac'
       when ua ~ 'Linux' then 'Linux'
       else 'unknown system' end)
  end;
$$;

create or replace function public.handle_user_sign_in()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  first_time boolean;
  api_key text;
  send_to text;
  send_from text;
  tz text;
  site text;
  sess jsonb;
  member_name text;
  kind text;
  headline text;
  action text;
  link text;
  when_text text;
  device text;
  ip text;
  rows_html text;
  body_text text;
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

    -- 2) Email alert — members only, and only once configured.
    if p.role <> 'member' then
      return new;
    end if;
    select decrypted_secret into api_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
    select decrypted_secret into send_to from vault.decrypted_secrets where name = 'login_alert_to' limit 1;
    if api_key is null or send_to is null then
      return new;
    end if;
    select decrypted_secret into send_from from vault.decrypted_secrets where name = 'login_alert_from' limit 1;
    select decrypted_secret into tz from vault.decrypted_secrets where name = 'login_alert_timezone' limit 1;
    select decrypted_secret into site from vault.decrypted_secrets where name = 'login_alert_site_url' limit 1;
    send_from := coalesce(nullif(send_from, ''), 'VA Training Academy <onboarding@resend.dev>');
    tz := coalesce(nullif(tz, ''), 'UTC');
    site := rtrim(coalesce(site, ''), '/');

    begin
      select to_jsonb(s) into sess from auth.sessions s where s.user_id = new.id order by s.created_at desc limit 1;
    exception when others then
      sess := null;
    end;

    member_name := coalesce(nullif(btrim(concat_ws(' ', nullif(p.first_name, ''), nullif(p.last_name, ''))), ''), p.email, 'A member');
    kind := case when p.status = 'inactive' then 'New account awaiting approval'
                 when first_time then 'New member joined'
                 else 'New sign-in' end;
    headline := case when p.status = 'inactive' then member_name || ' created an account and is waiting for your approval.'
                     when first_time then member_name || ' joined and signed in for the first time.'
                     else member_name || ' signed in.' end;
    action := case when p.status = 'inactive' then 'Review & activate' else 'View member' end;
    link := case when site like 'https://%' then site || '/admin/members/' || p.id else null end;
    when_text := to_char(coalesce(new.last_sign_in_at, now()) at time zone tz, 'Mon FMDD, YYYY, FMHH12:MI AM') || ' (' || tz || ')';
    device := public.describe_device(sess ->> 'user_agent');
    ip := sess ->> 'ip';

    rows_html :=
      '<tr><td style="padding:4px 16px 4px 0;color:#64748b">Member</td><td style="padding:4px 0">' || public.html_escape(member_name || ' (' || p.email || ')') || '</td></tr>' ||
      '<tr><td style="padding:4px 16px 4px 0;color:#64748b">When</td><td style="padding:4px 0">' || public.html_escape(when_text) || '</td></tr>' ||
      '<tr><td style="padding:4px 16px 4px 0;color:#64748b">Device</td><td style="padding:4px 0">' || public.html_escape(device) || '</td></tr>' ||
      case when ip is not null then '<tr><td style="padding:4px 16px 4px 0;color:#64748b">IP address</td><td style="padding:4px 0">' || public.html_escape(ip) || '</td></tr>' else '' end;

    body_text := headline || ' (' || p.email || ')' || E'\n\n' ||
      'When: ' || when_text || E'\n' ||
      'Device: ' || device || E'\n' ||
      case when ip is not null then 'IP address: ' || ip || E'\n' else '' end ||
      case when p.status = 'inactive' then E'\nActivate them in Admin → Members to give access.\n' else '' end ||
      case when link is not null then E'\n' || action || ': ' || link || E'\n' else '' end ||
      E'\nYou receive this because you are the VA Training Academy administrator.';

    perform net.http_post(
      url := 'https://api.resend.com/emails',
      body := jsonb_build_object(
        'from', send_from,
        'to', (select jsonb_agg(btrim(x)) from unnest(string_to_array(send_to, ',')) x where btrim(x) <> ''),
        'subject', left(kind || ' — ' || member_name, 150),
        'text', body_text,
        'html',
          '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f2747;max-width:520px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px">' ||
          '<div style="padding:18px 22px;border-bottom:1px solid #e2e8f0"><strong>VA Training Academy</strong><br><span style="font-size:13px;color:#64748b">' || public.html_escape(kind) || '</span></div>' ||
          '<div style="padding:18px 22px"><p style="margin:0 0 14px;font-size:15px">' || public.html_escape(headline) || '</p>' ||
          case when p.status = 'inactive' then '<p style="margin:0 0 14px;font-size:14px;color:#92400e;background:#fffbeb;padding:10px 12px;border-radius:8px">They can’t open any training until you activate them in Admin → Members.</p>' else '' end ||
          '<table style="font-size:14px" cellpadding="0" cellspacing="0">' || rows_html || '</table>' ||
          case when link is not null then '<p style="margin:18px 0 0"><a href="' || public.html_escape(link) || '" style="display:inline-block;background:#0f2747;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px">' || public.html_escape(action) || '</a></p>' else '' end ||
          '</div><div style="padding:12px 22px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">All sign-ins are also listed under Admin → Activity Logs.</div></div>'
      ),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || api_key),
      timeout_milliseconds := 5000
    );
  exception when others then
    -- Never block a sign-in because of logging/alerting.
    raise warning 'login alert skipped for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.handle_user_sign_in() from public, anon, authenticated;
revoke all on function public.describe_device(text) from public, anon;
revoke all on function public.html_escape(text) from public, anon;

-- ===================== 20261121100000_remove_alerts_admin_status.sql =====================
-- =====================================================================
-- VA Training Academy — remove login alert emails; admin member controls
-- 010 · No more alert emails. Activate / deactivate / edit members works
--       directly in the database (no Edge Function needed).
-- =====================================================================
-- * Sign-ins are still recorded in activity_logs (Admin → Activity Logs),
--   but nothing is emailed any more. Any stored Resend settings are deleted.
-- * New admin-only functions used by Admin → Members:
--     admin_set_member_status(user_id, 'active' | 'inactive')
--     admin_update_member(user_id, first_name, last_name, phone, role)
--   They check the caller is an active admin, protect the admin's own
--   account, keep at least one active admin, and write the audit log.
-- Idempotent: safe to run again.

-- ---------------------------------------------------------------------
-- 1. Sign-in trigger: log only (no email)
-- ---------------------------------------------------------------------
create or replace function public.handle_user_sign_in()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    if exists (select 1 from public.profiles where id = new.id) then
      insert into public.activity_logs (user_id, activity_type) values (new.id, 'signed_in');
    end if;
  exception when others then
    -- Never block a sign-in because of logging.
    raise warning 'sign-in not logged for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.handle_user_sign_in() from public, anon, authenticated;

-- Email helpers are no longer used.
drop function if exists public.describe_device(text);
drop function if exists public.html_escape(text);

-- Delete any stored alert-email settings (Resend key, recipient, …).
do $$
begin
  delete from vault.secrets where name in (
    'resend_api_key', 'login_alert_to', 'login_alert_from', 'login_alert_timezone',
    'login_alert_site_url', 'login_alert_url', 'login_alert_secret'
  );
exception when others then
  raise notice 'No alert settings removed (%).', sqlerrm;
end
$$;

-- ---------------------------------------------------------------------
-- 2. Admin: activate / deactivate a member
-- ---------------------------------------------------------------------
create or replace function public.admin_set_member_status(p_user_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change account status.' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('active', 'inactive') then
    raise exception 'Invalid status.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot change the status of your own account.';
  end if;

  select * into target from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Member not found.';
  end if;
  if target.status = p_status then
    return to_jsonb(target);
  end if;
  if target.role = 'admin' and target.status = 'active' and p_status = 'inactive'
     and (select count(*) from public.profiles where role = 'admin' and status = 'active') <= 1 then
    raise exception 'This is the last active administrator and cannot be deactivated.';
  end if;

  -- Inactive accounts can't read any portal data (RLS) and see "Account not active".
  update public.profiles set status = p_status where id = p_user_id returning * into target;

  -- Extra layer where permitted: also block new sign-ins at the auth level.
  begin
    update auth.users
      set banned_until = case when p_status = 'inactive' then now() + interval '100 years' else null end
      where id = p_user_id;
  exception when others then
    null; -- not permitted on this project: RLS above already blocks all access
  end;

  perform public.log_admin_action(
    case when p_status = 'active' then 'member_activated' else 'member_deactivated' end,
    'member', target.id,
    left(btrim(concat_ws(' ', nullif(target.first_name, ''), nullif(target.last_name, ''))) || ' <' || target.email || '>', 200)
  );
  return to_jsonb(target);
end;
$$;

revoke all on function public.admin_set_member_status(uuid, text) from public, anon;
grant execute on function public.admin_set_member_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Admin: edit a member's name, contact number and role
-- ---------------------------------------------------------------------
create or replace function public.admin_update_member(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text default null,
  p_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.profiles;
  v_first text := btrim(regexp_replace(coalesce(p_first_name, ''), '\s+', ' ', 'g'));
  v_last text := btrim(regexp_replace(coalesce(p_last_name, ''), '\s+', ' ', 'g'));
  v_phone text := nullif(btrim(regexp_replace(coalesce(p_phone, ''), '\s+', ' ', 'g')), '');
  new_role text;
  old_role text;
  fields text[] := '{}';
  label text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can edit members.' using errcode = '42501';
  end if;
  select * into target from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Member not found.';
  end if;
  new_role := coalesce(p_role, target.role);
  old_role := target.role;

  if v_first = '' or v_last = '' then
    raise exception 'First and last name are required.';
  end if;
  if char_length(v_first) > 80 or char_length(v_last) > 80 or v_first ~ '[<>]' or v_last ~ '[<>]' then
    raise exception 'Names must be 80 characters or fewer, without < or >.';
  end if;
  if v_phone is not null and (char_length(v_phone) > 32 or v_phone !~ '^[0-9+()\-. ]+$' or v_phone !~ '[0-9]') then
    raise exception 'Enter a valid contact number (digits, spaces, + ( ) - . only).';
  end if;
  if new_role not in ('admin', 'member') then
    raise exception 'Invalid role.';
  end if;
  if new_role <> target.role then
    if p_user_id = auth.uid() then
      raise exception 'You cannot change your own role.';
    end if;
    if target.role = 'admin' and target.status = 'active'
       and (select count(*) from public.profiles where role = 'admin' and status = 'active') <= 1 then
      raise exception 'This is the last active administrator and cannot be demoted.';
    end if;
  end if;

  if v_first is distinct from target.first_name then fields := array_append(fields, 'first_name'); end if;
  if v_last is distinct from target.last_name then fields := array_append(fields, 'last_name'); end if;
  if v_phone is distinct from target.phone then fields := array_append(fields, 'phone'); end if;

  update public.profiles
    set first_name = v_first,
        last_name = v_last,
        phone = v_phone,
        role = new_role
    where id = p_user_id
    returning * into target;

  label := left(btrim(concat_ws(' ', nullif(target.first_name, ''), nullif(target.last_name, ''))) || ' <' || target.email || '>', 200);
  if cardinality(fields) > 0 then
    perform public.log_admin_action('member_updated', 'member', target.id, label, jsonb_build_object('fields', to_jsonb(fields)));
  end if;
  if new_role <> old_role then
    perform public.log_admin_action('member_role_changed', 'member', target.id, label, jsonb_build_object('from', old_role, 'to', new_role));
  end if;
  return to_jsonb(target);
end;
$$;

revoke all on function public.admin_update_member(uuid, text, text, text, text) from public, anon;
grant execute on function public.admin_update_member(uuid, text, text, text, text) to authenticated;


-- Done.
select 'All set: anyone can create an account and sign in; you can activate/deactivate members in Admin → Members.' as result;
