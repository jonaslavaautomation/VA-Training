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
