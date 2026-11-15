-- =====================================================================
-- VA Training Academy — one-time administrator setup
-- =====================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- BEFORE running it:
--   1. The database migrations are applied (DEPLOYMENT_GUIDE.md step 3).
--   2. Both accounts exist: Authentication → Users → Add user → Create new user
--      (enter the email + a password, and TICK "Auto Confirm User").
--
-- What it does: makes both accounts active administrators.
-- It is safe to run more than once. If anything is missing it changes
-- nothing and tells you exactly what to fix.
-- =====================================================================

do $$
declare
  admin_emails text[] := array[
    'jonasrosauro122@gmail.com',   -- administrator
    'jonas@lavaautomation.com'     -- co-administrator
  ];
  e text;
  uid uuid;
  confirmed timestamptz;
  missing text[] := '{}';
  unconfirmed text[] := '{}';
begin
  if to_regclass('public.profiles') is null then
    raise exception 'The portal''s database tables don''t exist yet. Run the migrations first (DEPLOYMENT_GUIDE.md step 3: npx supabase db push).';
  end if;

  foreach e in array admin_emails loop
    select id, email_confirmed_at into uid, confirmed from auth.users where lower(email) = lower(e);
    if uid is null then
      missing := missing || e;
      continue;
    end if;
    if confirmed is null then
      unconfirmed := unconfirmed || e;
    end if;
    -- The profile normally exists already (created automatically with the account).
    insert into public.profiles (id, email, role, status)
    values (uid, lower(e), 'admin', 'active')
    on conflict (id) do update set role = 'admin', status = 'active';
  end loop;

  if cardinality(missing) > 0 then
    raise exception 'Not done yet — these accounts don''t exist: %. Create them under Authentication → Users → Add user → Create new user (tick "Auto Confirm User"), then run this script again.',
      array_to_string(missing, ', ');
  end if;

  if cardinality(unconfirmed) > 0 then
    -- Unconfirmed accounts can't sign in. Nothing above is kept (the whole script is undone).
    raise exception 'Not done yet — these accounts aren''t confirmed: %. In Authentication → Users, delete them and add them again with "Auto Confirm User" ticked (or click the invitation email link), then run this script again.',
      array_to_string(unconfirmed, ', ');
  end if;
end $$;

-- Result: both rows should show role = admin, status = active.
select email, role, status, created_at
from public.profiles
where email in ('jonasrosauro122@gmail.com', 'jonas@lavaautomation.com')
order by email;
