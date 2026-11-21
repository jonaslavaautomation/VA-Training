// Tests the copy-paste setup scripts in supabase/setup/ exactly as an admin
// would run them in the SQL Editor (part of `npm run test:db`).
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync, readdirSync } from 'node:fs'

const ROOT = new URL('../..', import.meta.url).pathname
const MIGRATIONS = readdirSync(`${ROOT}supabase/migrations`).filter((f) => f.endsWith('.sql')).sort()
const read = (p) => readFileSync(`${ROOT}${p}`, 'utf8')
const SCRIPT1 = read('supabase/setup/1_enable_create_account.sql')
const SCRIPT2 = read('supabase/setup/2_lava_portal.sql')
const SCRIPT3 = read('supabase/setup/3_lava_lesson_materials.sql')
const SCRIPT4 = read('supabase/setup/4_lava_company_photos.sql')
const SCRIPT5 = read('supabase/setup/5_lava_longer_content.sql')
const UP_TO_SCRIPT1 = MIGRATIONS.findIndex((f) => f.startsWith('20261122')) // migrations covered before the LAVA script
const UP_TO_SCRIPT2 = MIGRATIONS.findIndex((f) => f.startsWith('20261123')) // …and before the lesson-materials script
const UP_TO_SCRIPT3 = MIGRATIONS.findIndex((f) => f.startsWith('20261124')) // …and before the photos script
const UP_TO_SCRIPT4 = MIGRATIONS.findIndex((f) => f.startsWith('20261125')) // …and before the longer-content script

let passed = 0
let failed = 0
const ok = (n) => { passed++; console.log('  ✓', n) }
const bad = (n, d) => { failed++; console.log('  ✗', n, '→', d) }

async function freshDb(migrationCount) {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema extensions; create schema auth; create schema storage;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb default '{}',
      last_sign_in_at timestamptz, invited_at timestamptz, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid, created_at timestamptz default now(), user_agent text, ip text);
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, created_at timestamptz default now());
    alter table storage.objects enable row level security; alter table storage.buckets enable row level security;
    create schema vault;
    create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text, description text);
    create view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;
    create function vault.create_secret(new_secret text, new_name text default null, new_description text default '') returns uuid
      language sql as $$ insert into vault.secrets (name, secret, description) values (new_name, new_secret, new_description) returning id $$;
    create function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null) returns void
      language sql as $$ update vault.secrets set secret = coalesce(new_secret, secret) where id = secret_id $$;
    create schema net;
    create table net.calls (id bigserial primary key, url text, body jsonb, headers jsonb);
    create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
      returns bigint language sql as $$ insert into net.calls (url, body, headers) values (url, body, headers) returning id $$;
  `)
  for (const f of MIGRATIONS.slice(0, migrationCount)) await db.exec(read(`supabase/migrations/${f}`))
  return db
}
const run = async (db, sql) => { try { return { rows: (await db.exec(sql)).at(-1)?.rows ?? [] } } catch (e) { return { error: e.message } } }
console.log('\nSTEP 1 — 1_enable_create_account.sql')
{
  const db = await freshDb(6) // project set up through Phase 5, like a live project before these features
  await db.query(`insert into auth.users (email) values ('existing@example.com')`)
  const r1 = await run(db, SCRIPT1)
  r1.rows?.[0]?.result?.startsWith('All set') ? ok('runs on a project with the earlier setup') : bad('first run', r1.error ?? JSON.stringify(r1.rows))
  const r2 = await run(db, SCRIPT1)
  r2.rows?.[0]?.result ? ok('safe to run a second time') : bad('second run', r2.error)
  let later = null
  for (const f of MIGRATIONS.slice(6, UP_TO_SCRIPT1)) { const r = await run(db, read(`supabase/migrations/${f}`)); if (r.error) later = `${f}: ${r.error}` }
  later ? bad('a later `supabase db push` still works', later) : ok('a later `supabase db push` of the same migrations still works')
  await db.query(`insert into auth.users (email, raw_user_meta_data) values ('newbie@example.com', '{"first_name":"Nia","role":"admin"}')`)
  const [p] = (await db.query(`select role, status from public.profiles where email = 'newbie@example.com'`)).rows
  p.role === 'member' && p.status === 'active' ? ok('after STEP 1, a new account is an active member (can sign in right away)') : bad('new account', JSON.stringify(p))
  const [old] = (await db.query(`select role, status from public.profiles where email = 'existing@example.com'`)).rows
  old ? ok('existing accounts are untouched') : bad('existing account', 'missing')
}
{
  const db = await freshDb(0)
  const r = await run(db, SCRIPT1)
  r.error?.includes('earlier database setup is missing') ? ok('stops with a clear message if the earlier setup is missing') : bad('missing prerequisite', r.error ?? 'no error')
}

console.log('\nafter the script — no emails, admin controls work')
{
  const db = await freshDb(6)
  // Pretend an earlier version of this script stored Resend settings.
  await db.query(`insert into vault.secrets (name, secret) values ('resend_api_key', 're_old_1234567890'), ('login_alert_to', 'x@example.com')`)
  await run(db, SCRIPT1)
  const left = (await db.query(`select count(*)::int as n from vault.secrets where name like 'resend%' or name like 'login_alert%'`)).rows[0].n
  left === 0 ? ok('old alert-email settings are deleted') : bad('settings left', left)
  await db.query(`insert into auth.users (email, raw_user_meta_data) values ('maria@example.com', '{"first_name":"Maria","last_name":"Santos"}')`)
  await db.query(`update auth.users set last_sign_in_at = now() where email = 'maria@example.com'`)
  const logs = (await db.query(`select count(*)::int as n from public.activity_logs a join public.profiles p on p.id = a.user_id where p.email = 'maria@example.com' and a.activity_type = 'signed_in'`)).rows[0].n
  const mails = (await db.query(`select count(*)::int as n from net.calls`)).rows[0].n
  logs === 1 && mails === 0 ? ok('a new member signs in → logged in Activity Logs, no email sent') : bad('sign-in', `logs=${logs} mails=${mails}`)
  const fns = (await db.query(`select proname from pg_proc where pronamespace = 'public'::regnamespace and proname in ('admin_set_member_status', 'admin_update_member') order by 1`)).rows.map((r) => r.proname).join()
  fns === 'admin_set_member_status,admin_update_member' ? ok('admin activate/deactivate + edit functions are installed') : bad('functions', fns)
}

console.log('\nSTEP 2 — 2_lava_portal.sql')
{
  const db = await freshDb(6)
  await run(db, SCRIPT1)
  await db.query(`insert into auth.users (email) values ('member@example.com')`)
  const r1 = await run(db, SCRIPT2)
  r1.rows?.[0]?.result?.startsWith('LAVA portal ready') ? ok('runs on a project set up with STEP 1') : bad('first run', r1.error ?? JSON.stringify(r1.rows))
  await db.query(`update public.lava_content set body = 'Edited by admin', status = 'published' where key = 'overview'`)
  const r2 = await run(db, SCRIPT2)
  const [c] = (await db.query(`select body from public.lava_content where key = 'overview'`)).rows
  r2.rows?.[0]?.result && c.body === 'Edited by admin' ? ok('safe to run again; admin edits are kept') : bad('second run', r2.error ?? c.body)
  const counts = (await db.query(`select (select count(*)::int from public.lava_courses) c, (select count(*)::int from public.lava_assessments) a, (select count(*)::int from public.lava_positions) p`)).rows[0]
  counts.c === 6 && counts.a === 9 && counts.p === 0 ? ok('6 courses, 9 assessments, no positions (no duplicates after two runs)') : bad('counts', JSON.stringify(counts))
  let later = null
  for (const f of MIGRATIONS.slice(UP_TO_SCRIPT1, UP_TO_SCRIPT2)) { const r = await run(db, read(`supabase/migrations/${f}`)); if (r.error) later = `${f}: ${r.error}` }
  later ? bad('a later `supabase db push` still works', later) : ok('a later `supabase db push` of the same migrations still works')
  const [m] = (await db.query(`select count(*)::int n from public.profiles`)).rows
  m.n === 1 ? ok('existing accounts untouched') : bad('profiles', m.n)
}
{
  const db = await freshDb(0)
  const r = await run(db, SCRIPT2)
  r.error?.includes('earlier database setup is missing') ? ok('stops with a clear message if the earlier setup is missing') : bad('missing prerequisite', r.error ?? 'no error')
}

console.log('\nSTEP 3 — 3_lava_lesson_materials.sql')
{
  const db = await freshDb(6)
  await run(db, SCRIPT1)
  await run(db, SCRIPT2)
  await db.query(`insert into public.training_resources (title, resource_type, storage_path, status) values ('Old guide', 'PDF', 'old/guide.pdf', 'published')`)
  const r1 = await run(db, SCRIPT3)
  r1.rows?.[0]?.result?.startsWith('Lesson videos') ? ok('runs after STEP 2') : bad('first run', r1.error ?? JSON.stringify(r1.rows))
  const r2 = await run(db, SCRIPT3)
  r2.rows?.[0]?.result ? ok('safe to run again') : bad('second run', r2.error)
  const [old] = (await db.query(`select audience from public.training_resources where title = 'Old guide'`)).rows
  old?.audience === 'library' ? ok('existing library files stay in the library') : bad('existing file', JSON.stringify(old))
  let later = null
  for (const f of MIGRATIONS.slice(UP_TO_SCRIPT2, UP_TO_SCRIPT3)) { const r = await run(db, read(`supabase/migrations/${f}`)); if (r.error) later = `${f}: ${r.error}` }
  later ? bad('a later `supabase db push` still works', later) : ok('a later `supabase db push` of the same migration still works')
}
{
  const db = await freshDb(6)
  const r = await run(db, SCRIPT3)
  r.error?.includes('2_lava_portal.sql first') ? ok('stops with a clear message if STEP 2 is missing') : bad('missing prerequisite', r.error ?? 'no error')
}

console.log('\nSTEP 4 — 4_lava_company_photos.sql')
{
  const db = await freshDb(6)
  await run(db, SCRIPT1); await run(db, SCRIPT2); await run(db, SCRIPT3)
  const r1 = await run(db, SCRIPT4)
  r1.rows?.[0]?.result?.startsWith('Photos ready') ? ok('runs after STEP 3') : bad('first run', r1.error ?? JSON.stringify(r1.rows))
  const r2 = await run(db, SCRIPT4)
  r2.rows?.[0]?.result ? ok('safe to run again') : bad('second run', r2.error)
  let later = null
  for (const f of MIGRATIONS.slice(UP_TO_SCRIPT3, UP_TO_SCRIPT4)) { const r = await run(db, read(`supabase/migrations/${f}`)); if (r.error) later = `${f}: ${r.error}` }
  later ? bad('a later `supabase db push` still works', later) : ok('a later `supabase db push` of the same migration still works')
}
{
  const db = await freshDb(6)
  const r = await run(db, SCRIPT4)
  r.error?.includes('2_lava_portal.sql first') ? ok('stops with a clear message if STEP 2 is missing') : bad('missing prerequisite', r.error ?? 'no error')
}

console.log('\nSTEP 5 — 5_lava_longer_content.sql')
{
  const db = await freshDb(6)
  await run(db, SCRIPT1); await run(db, SCRIPT2); await run(db, SCRIPT3); await run(db, SCRIPT4)
  const r1 = await run(db, SCRIPT5)
  r1.rows?.[0]?.result?.startsWith('Longer content ready') ? ok('runs after STEP 4') : bad('first run', r1.error ?? JSON.stringify(r1.rows))
  const r2 = await run(db, SCRIPT5)
  r2.rows?.[0]?.result ? ok('safe to run again') : bad('second run', r2.error)
  const upd = await run(db, `update public.lava_content set body = repeat('x', 45000) where key = 'overview'; select 'ok' as result`)
  upd.rows?.[0]?.result === 'ok' ? ok('45,000-character section accepted') : bad('long section', upd.error)
  let later = null
  for (const f of MIGRATIONS.slice(UP_TO_SCRIPT4)) { const r = await run(db, read(`supabase/migrations/${f}`)); if (r.error) later = `${f}: ${r.error}` }
  later ? bad('a later `supabase db push` still works', later) : ok('a later `supabase db push` of the same migration still works')
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
