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
