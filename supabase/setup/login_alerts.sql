-- =====================================================================
-- VA Training Academy — turn on login alert emails (one time)
-- =====================================================================
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- BEFORE running:
--   * Migration 20261118100000_login_alerts.sql is applied (npx supabase db push)
--   * Replace YOUR-PROJECT-REF below with your project ref
--     (the "xxxx" in https://xxxx.supabase.co).
--
-- It stores the alert function's address and a random shared secret in
-- Supabase Vault (encrypted). The last line shows the secret — copy it into
-- the function secret LOGIN_ALERT_SECRET (see DEPLOYMENT_GUIDE.md §4b).
-- Safe to run again: the existing secret is kept.
-- =====================================================================

do $$
declare
  project_ref text := 'YOUR-PROJECT-REF';   -- ← change this
  fn_url text;
  existing uuid;
begin
  if project_ref like '%YOUR-PROJECT-REF%' or project_ref !~ '^[a-z0-9]{10,40}$' then
    raise exception 'Edit the script first: replace YOUR-PROJECT-REF with your project ref (letters and numbers from https://<ref>.supabase.co).';
  end if;
  if to_regprocedure('public.handle_user_sign_in()') is null then
    raise exception 'The login-alerts migration is not applied yet. Run: npx supabase db push';
  end if;
  fn_url := format('https://%s.supabase.co/functions/v1/login-alert', project_ref);

  select id into existing from vault.secrets where name = 'login_alert_url';
  if existing is null then
    perform vault.create_secret(fn_url, 'login_alert_url', 'Login alert Edge Function URL');
  else
    perform vault.update_secret(existing, fn_url);
  end if;

  if not exists (select 1 from vault.secrets where name = 'login_alert_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'login_alert_secret',
      'Shared secret between the database and the login-alert function'
    );
  end if;
end $$;

-- Copy the value below → npx supabase secrets set LOGIN_ALERT_SECRET=<value>
select decrypted_secret as login_alert_secret
from vault.decrypted_secrets
where name = 'login_alert_secret';

-- To turn alerts OFF later (sign-ins are still logged in Activity Logs):
--   delete from vault.secrets where name in ('login_alert_url', 'login_alert_secret');
