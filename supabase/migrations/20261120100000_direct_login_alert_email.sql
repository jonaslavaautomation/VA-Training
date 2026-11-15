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
