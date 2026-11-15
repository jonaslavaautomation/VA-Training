// Database security test — run with `npm run test:db`.
// Applies supabase/migrations to an in-memory Postgres (PGlite) with a
// minimal Supabase-like auth schema and roles, then exercises RLS policies
// and triggers as anon / members / admins / service_role.
// No Supabase project or Docker needed.
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const migrationsDir = process.argv[2] ?? new URL('../migrations', import.meta.url).pathname
const db = new PGlite({ extensions: { pgcrypto } })

// ---- Supabase-like bootstrap --------------------------------------------
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema extensions;
  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb default '{}'::jsonb,
    last_sign_in_at timestamptz,
    invited_at timestamptz,
    email_confirmed_at timestamptz
  );
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

  -- Minimal stand-in for Supabase Storage's schema (RLS enabled, as in Supabase).
  create schema storage;
  grant usage on schema storage to anon, authenticated, service_role;
  create table storage.buckets (
    id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id),
    name text not null, owner uuid, created_at timestamptz default now(), unique (bucket_id, name)
  );
  alter table storage.buckets enable row level security;
  alter table storage.objects enable row level security;
  grant all on storage.buckets, storage.objects to anon, authenticated, service_role;

  -- Stand-ins for Supabase Vault, pg_net and auth.sessions (login alerts).
  create schema vault;
  create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text, description text);
  create view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;
  create function vault.create_secret(new_secret text, new_name text default null, new_description text default '') returns uuid
    language sql as $$ insert into vault.secrets (name, secret, description) values (new_name, new_secret, new_description) returning id $$;
  create function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null) returns void
    language sql as $$ update vault.secrets set secret = coalesce(new_secret, secret) where id = secret_id $$;
  create schema net;
  create table net.calls (id bigserial primary key, url text, body jsonb, headers jsonb);
  create table net.config (fail boolean default false);
  insert into net.config values (false);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
    returns bigint language plpgsql as $$
    declare new_id bigint;
    begin
      if (select fail from net.config limit 1) then raise exception 'simulated network failure'; end if;
      insert into net.calls (url, body, headers) values (url, body, headers) returning id into new_id;
      return new_id;
    end $$;
  create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid, created_at timestamptz default now(), user_agent text, ip text);
`)

for (const f of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(join(migrationsDir, f), 'utf8'))
  console.log('applied', f)
}

// ---- helpers --------------------------------------------------------------
let passed = 0
let failed = 0
const ok = (name) => { passed++; console.log('  ✓', name) }
const bad = (name, detail) => { failed++; console.log('  ✗', name, '→', detail) }

async function as(role, uid, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`)
  if (role !== 'postgres') await db.exec(`set role ${role}`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`) }
}
const q = async (sql, params) => (await db.query(sql, params)).rows

async function expectRows(name, sql, n, params) {
  try {
    const rows = await q(sql, params)
    rows.length === n ? ok(name) : bad(name, `expected ${n} rows, got ${rows.length}`)
  } catch (e) { bad(name, e.message) }
}
async function expectError(name, sql, pattern, params) {
  try {
    await q(sql, params)
    bad(name, 'expected an error but statement succeeded')
  } catch (e) {
    pattern.test(e.message) ? ok(`${name} (${e.message.slice(0, 70)})`) : bad(name, `unexpected error: ${e.message}`)
  }
}

// ---- fixtures ---------------------------------------------------------------
const [admin] = await q(`insert into auth.users (email, raw_user_meta_data) values ('Owner@Example.com', '{"first_name":"Olive","last_name":"Owner","role":"admin"}') returning id`)
const [m1] = await q(`insert into auth.users (email, raw_user_meta_data) values ('m1@example.com', '{"first_name":"Mia"}') returning id`)
const [m2] = await q(`insert into auth.users (email) values ('m2@example.com') returning id`)
const A = admin.id, M1 = m1.id, M2 = m2.id

console.log('\nprofile creation trigger')
{
  const rows = await q(`select email, role, status, first_name from public.profiles order by email`)
  rows.length === 3 ? ok('a profile is created for every auth user') : bad('profiles created', rows.length)
  rows.every((r) => r.role === 'member') ? ok('new accounts are always members — a "role: admin" in sign-up metadata is ignored') : bad('role defaults', JSON.stringify(rows))
  rows.every((r) => r.status === 'active') ? ok('self-registered accounts start active (portal_settings default)') : bad('status defaults', JSON.stringify(rows))
  rows.find((r) => r.email === 'owner@example.com') ? ok('email stored lower-cased') : bad('lowercase', JSON.stringify(rows))
}

console.log('\nadmin bootstrap')
await as('authenticated', M1, () => expectError('members cannot call bootstrap_first_admin', `select public.bootstrap_first_admin('m1@example.com')`, /permission denied/))
await as('anon', null, () => expectError('anon cannot call bootstrap_first_admin', `select public.bootstrap_first_admin('m1@example.com')`, /permission denied/))
await as('postgres', null, () => expectError('bootstrap rejects unknown email', `select public.bootstrap_first_admin('nobody@example.com')`, /No account found/))
await as('postgres', null, async () => {
  const [r] = await q(`select public.bootstrap_first_admin('OWNER@example.com') as msg`)
  r.msg.includes('administrator') ? ok('bootstrap promotes the first admin') : bad('bootstrap', r.msg)
})
await as('postgres', null, () => expectError('bootstrap refuses once an admin exists', `select public.bootstrap_first_admin('m1@example.com')`, /already exists/))

// Edge Function (service_role) activates the invited members
await as('service_role', null, () => q(`update public.profiles set status = 'active' where id in ($1, $2)`, [M1, M2]))

// Content fixtures (as postgres)
const [cat] = await q(`insert into public.categories (name, icon, color) values ('Email & Calendar', 'mail', 'mint') returning id, slug`)
cat.slug === 'email-calendar' ? ok(`category slug generated (${cat.slug})`) : bad('slug', cat.slug)
const [pub] = await q(`insert into public.training_resources (title, resource_type, status, category_id, storage_path, thumbnail_path) values ('Published PDF', 'PDF', 'published', $1, 'pub/guide.pdf', 'pub/cover.jpg') returning id`, [cat.id])
const [draft] = await q(`insert into public.training_resources (title, resource_type, status, storage_path, thumbnail_path) values ('Draft video', 'VIDEO', 'draft', 'draft/lesson.mp4', 'draft/poster.jpg') returning id`)
await q(`insert into public.announcements (title, content, status) values ('Hello', 'Published', 'published'), ('Draft', 'Hidden', 'draft')`)
await q(`insert into public.activity_logs (user_id, activity_type) values ($1, 'signed_in')`, [M2])

console.log('\nanonymous visitor')
await as('anon', null, async () => {
  for (const t of ['profiles', 'categories', 'training_resources', 'announcements', 'favorites', 'learning_progress', 'activity_logs']) {
    await expectError(`anon cannot read ${t}`, `select * from public.${t}`, /permission denied/)
  }
})

console.log('\nactive member (M1)')
await as('authenticated', M1, async () => {
  await expectRows('sees only own profile', `select * from public.profiles`, 1)
  await expectRows('cannot see other members’ profiles', `select * from public.profiles where id = $1`, 0, [M2])
  await expectRows('cannot see admin profile', `select * from public.profiles where id = $1`, 0, [A])
  await expectError('cannot make self admin', `update public.profiles set role = 'admin' where id = $1`, /not allowed/, [M1])
  await expectError('cannot change own status', `update public.profiles set status = 'inactive' where id = $1`, /not allowed/, [M1])
  await expectError('cannot change own email directly', `update public.profiles set email = 'x@example.com' where id = $1`, /not allowed/, [M1])
  await expectRows('can update own first/last name', `update public.profiles set first_name = 'Mia', last_name = 'Lopez' where id = $1 returning id`, 1, [M1])
  await expectRows('cannot update another member', `update public.profiles set first_name = 'Hacked' where id = $1 returning id`, 0, [M2])
  await expectRows('cannot update admin record', `update public.profiles set first_name = 'Hacked' where id = $1 returning id`, 0, [A])
  await expectError('cannot insert profiles', `insert into public.profiles (id, email, role, status) values (gen_random_uuid(), 'evil@example.com', 'admin', 'active')`, /permission denied/)
  await expectError('cannot delete profiles', `delete from public.profiles where id = $1`, /permission denied/, [M1])
  {
    const [r] = await q(`select public.is_admin() as a, public.is_active_user() as b`)
    !r.a && r.b ? ok('is_admin() = false, is_active_user() = true') : bad('helpers', JSON.stringify(r))
  }
  await expectRows('sees published resources only', `select * from public.training_resources`, 1)
  await expectRows('cannot see drafts by id', `select * from public.training_resources where id = $1`, 0, [draft.id])
  await expectRows('sees published announcements only', `select * from public.announcements`, 1)
  await expectRows('can read categories', `select * from public.categories`, 1)
  await expectError('cannot create resources', `insert into public.training_resources (title, resource_type) values ('x', 'PDF')`, /row-level security/)
  await expectRows('cannot update resources', `update public.training_resources set title = 'x' returning id`, 0)
  await expectRows('cannot delete resources', `delete from public.training_resources returning id`, 0)
  await expectError('cannot create categories', `insert into public.categories (name) values ('Hack')`, /row-level security/)
  await expectError('cannot create announcements', `insert into public.announcements (title, content) values ('x', 'y')`, /row-level security/)
  await expectRows('can favorite a published resource', `insert into public.favorites (resource_id) values ($1) returning id`, 1, [pub.id])
  await expectError('cannot favorite a draft', `insert into public.favorites (resource_id) values ($1)`, /row-level security/, [draft.id])
  await expectError('cannot add favorites for someone else', `insert into public.favorites (user_id, resource_id) values ($1, $2)`, /row-level security/, [M2, pub.id])
  await expectRows('can record own progress (upsert)', `insert into public.learning_progress (resource_id, status, progress_percent, completed_at) values ($1, 'completed', 100, now()) on conflict (user_id, resource_id) do update set status = excluded.status returning id`, 1, [pub.id])
  await expectRows('can log own activity', `insert into public.activity_logs (activity_type, resource_id) values ('completed', $1) returning id`, 1, [pub.id])
  await expectError('cannot log activity as someone else', `insert into public.activity_logs (user_id, activity_type) values ($1, 'signed_in')`, /row-level security/, [M2])
  await expectRows('cannot read others’ activity', `select * from public.activity_logs where user_id = $1`, 0, [M2])
  await expectError('cannot modify activity logs', `update public.activity_logs set activity_type = 'viewed'`, /permission denied/)
  await expectError('cannot delete activity logs', `delete from public.activity_logs`, /permission denied/)
})

console.log('\nadministrator')
await as('authenticated', A, async () => {
  await expectRows('admin sees all profiles', `select * from public.profiles`, 3)
  await expectRows('admin sees drafts', `select * from public.training_resources`, 2)
  await expectRows('admin sees all announcements', `select * from public.announcements`, 2)
  await expectRows('admin sees all member activity', `select * from public.activity_logs where target_type is null`, 2)
  await expectRows('admin can edit member names', `update public.profiles set last_name = 'Lopez-Diaz' where id = $1 returning id`, 1, [M1])
  await expectError('admin cannot change roles from the browser', `update public.profiles set role = 'admin' where id = $1`, /not allowed/, [M1])
  await expectError('admin cannot change status from the browser (Edge Function only)', `update public.profiles set status = 'inactive' where id = $1`, /not allowed/, [M1])
  await expectRows('admin can create categories', `insert into public.categories (name) values ('Customer Support') returning id`, 1)
  await expectError('duplicate category names rejected', `insert into public.categories (name) values ('customer support')`, /duplicate key/)
  await expectRows('admin can create resources (uploaded_by defaults to admin)', `insert into public.training_resources (title, resource_type) values ('New draft', 'PDF') returning uploaded_by`, 1)
  const [r] = await q(`select public.is_admin() as a`)
  r.a ? ok('is_admin() = true') : bad('is_admin', r.a)
})

console.log('\ndeactivated member (M1)')
await as('service_role', null, () => q(`update public.profiles set status = 'inactive' where id = $1`, [M1]))
await as('authenticated', M1, async () => {
  await expectRows('can still read own profile (to show "deactivated")', `select status from public.profiles`, 1)
  await expectRows('cannot read resources', `select * from public.training_resources`, 0)
  await expectRows('cannot read categories', `select * from public.categories`, 0)
  await expectRows('cannot read announcements', `select * from public.announcements`, 0)
  await expectRows('cannot read own favorites', `select * from public.favorites`, 0)
  await expectRows('cannot read own progress', `select * from public.learning_progress`, 0)
  await expectRows('cannot edit own profile', `update public.profiles set first_name = 'X' where id = $1 returning id`, 0, [M1])
  await expectError('cannot log activity', `insert into public.activity_logs (activity_type) values ('signed_in')`, /row-level security/)
  await expectRows('cannot reactivate self', `update public.profiles set status = 'active' where id = $1 returning id`, 0, [M1])
})

console.log('\ndeactivated admin')
await as('service_role', null, () => q(`update public.profiles set status = 'inactive' where id = $1`, [A]))
await as('authenticated', A, async () => {
  const [r] = await q(`select public.is_admin() as a`)
  !r.a ? ok('inactive admin loses admin rights') : bad('inactive admin', r.a)
  await expectRows('inactive admin cannot list profiles', `select * from public.profiles`, 1)
})
await as('service_role', null, () => q(`update public.profiles set status = 'active' where id = $1`, [A]))

console.log('\nauth sync + integrity')
await as('postgres', null, async () => {
  await q(`update auth.users set email = 'M2.new@example.com' where id = $1`, [M2])
  const [p] = await q(`select email from public.profiles where id = $1`, [M2])
  p.email === 'm2.new@example.com' ? ok('auth email change syncs to profile') : bad('email sync', p.email)
  await q(`delete from auth.users where id = $1`, [M2])
  const rows = await q(`select 1 from public.profiles where id = $1`, [M2])
  rows.length === 0 ? ok('deleting the auth user removes the profile (no orphans)') : bad('cascade', rows.length)
  await expectError('invalid role rejected by constraint', `update public.profiles set role = 'superuser' where id = $1`, /check constraint/, [M1])
  await expectError('invalid resource type rejected', `insert into public.training_resources (title, resource_type) values ('x', 'DOC')`, /check constraint/)
  await expectError('completed progress requires completed_at', `insert into public.learning_progress (user_id, resource_id, status) values ($1, $2, 'completed')`, /check constraint/, [A, pub.id])
})

// ---- Phase 3: private storage ----------------------------------------------
console.log('\nstorage buckets')
await as('postgres', null, async () => {
  const rows = await q(`select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id`)
  rows.length === 4 && rows.every((b) => b.public === false) ? ok('four private buckets (training ×3 + announcement images)') : bad('buckets', JSON.stringify(rows))
  const pdf = rows.find((b) => b.id === 'training-pdfs')
  pdf?.file_size_limit == 52428800 && pdf.allowed_mime_types.join() === 'application/pdf' ? ok('PDF bucket: 50 MB, application/pdf only') : bad('pdf bucket', JSON.stringify(pdf))
  const vid = rows.find((b) => b.id === 'training-videos')
  vid?.allowed_mime_types.join() === 'video/mp4,video/webm' ? ok('video bucket: mp4/webm only') : bad('video bucket', JSON.stringify(vid))
})

// Fresh active member + storage objects for every case
const [m3] = await q(`insert into auth.users (email) values ('m3@example.com') returning id`)
const M3 = m3.id
await as('service_role', null, () => q(`update public.profiles set status = 'active' where id = $1`, [M3]))
await q(`insert into storage.objects (bucket_id, name, created_at) values
  ('training-pdfs', 'pub/guide.pdf', now() - interval '2 hours'),
  ('resource-thumbnails', 'pub/cover.jpg', now() - interval '2 hours'),
  ('training-videos', 'draft/lesson.mp4', now() - interval '2 hours'),
  ('resource-thumbnails', 'draft/poster.jpg', now() - interval '2 hours'),
  ('training-videos', 'pub/guide.pdf', now() - interval '2 hours'),
  ('training-pdfs', 'old/orphan.pdf', now() - interval '3 hours'),
  ('training-pdfs', 'new/uploading.pdf', now())`)
const visible = (bucket, name) => q(`select 1 from storage.objects where bucket_id = $1 and name = $2`, [bucket, name])

console.log('\nstorage — active member')
await as('authenticated', M3, async () => {
  ;(await visible('training-pdfs', 'pub/guide.pdf')).length === 1 ? ok('can read published PDF file') : bad('read published pdf', 0)
  ;(await visible('resource-thumbnails', 'pub/cover.jpg')).length === 1 ? ok('can read published thumbnail') : bad('read published thumb', 0)
  ;(await visible('training-videos', 'draft/lesson.mp4')).length === 0 ? ok('cannot read draft video file') : bad('draft video visible', 1)
  ;(await visible('resource-thumbnails', 'draft/poster.jpg')).length === 0 ? ok('cannot read draft thumbnail') : bad('draft thumb visible', 1)
  ;(await visible('training-videos', 'pub/guide.pdf')).length === 0 ? ok('path only valid in the bucket matching the resource type') : bad('bucket mismatch visible', 1)
  ;(await visible('training-pdfs', 'old/orphan.pdf')).length === 0 ? ok('cannot read unreferenced files') : bad('orphan visible', 1)
  await expectError('cannot upload files', `insert into storage.objects (bucket_id, name) values ('training-pdfs', 'evil.pdf')`, /row-level security/)
  await expectRows('cannot replace files', `update storage.objects set name = 'x' where bucket_id = 'training-pdfs' returning id`, 0)
  await expectRows('cannot delete files', `delete from storage.objects returning id`, 0)
  await expectRows('cannot read bucket settings', `select * from storage.buckets`, 0)
  await expectError('cannot list orphaned files', `select * from public.find_orphaned_training_files()`, /Only administrators/)
})

console.log('\nstorage — inactive member & anon')
await as('authenticated', M1, () => expectRows('inactive member cannot read any training file', `select * from storage.objects`, 0))
await as('anon', null, () => expectRows('anon cannot read any training file', `select * from storage.objects`, 0))
await as('anon', null, () => expectError('anon cannot upload', `insert into storage.objects (bucket_id, name) values ('training-pdfs', 'x.pdf')`, /row-level security/))

console.log('\nstorage — administrator')
await as('authenticated', A, async () => {
  await expectRows('admin can read all training files (incl. drafts)', `select * from storage.objects`, 7)
  await expectRows('admin can upload', `insert into storage.objects (bucket_id, name) values ('training-videos', 'new/clip.mp4') returning id`, 1)
  await expectRows('admin can replace', `update storage.objects set owner = $1 where name = 'new/clip.mp4' returning id`, 1, [A])
  await expectRows('admin can delete', `delete from storage.objects where name = 'new/clip.mp4' returning id`, 1)
  await expectError('admin cannot upload outside training buckets', `insert into storage.objects (bucket_id, name) values ('avatars', 'x.png')`, /row-level security|foreign key/)
  await expectRows('admin can read bucket settings', `select * from storage.buckets`, 4)
  const orphans = (await q(`select bucket_id, name from public.find_orphaned_training_files()`)).map((o) => `${o.bucket_id}/${o.name}`).sort()
  orphans.join() === 'training-pdfs/old/orphan.pdf,training-videos/pub/guide.pdf'
    ? ok('orphan finder: old unreferenced files incl. wrong-bucket copies; skips fresh uploads and referenced files')
    : bad('orphan finder', JSON.stringify(orphans))
})

console.log('\nstorage — integrity')
await as('postgres', null, async () => {
  await expectError('cannot publish a resource without a file', `insert into public.training_resources (title, resource_type, status) values ('x', 'PDF', 'published')`, /published_has_file/)
  await expectError('one file cannot belong to two resources', `insert into public.training_resources (title, resource_type, storage_path) values ('dup', 'PDF', 'pub/guide.pdf')`, /duplicate key/)
  await q(`update public.training_resources set status = 'draft' where id = $1`, [pub.id])
})
await as('authenticated', M3, async () => {
  ;(await visible('training-pdfs', 'pub/guide.pdf')).length === 0 ? ok('unpublishing immediately revokes member file access') : bad('unpublished still visible', 1)
})

// ---- Phase 4: learning progress (resume) & favorites ------------------------
console.log('\nlearning progress & favorites (phase 4)')
const [lesson] = await q(`insert into public.training_resources (title, resource_type, status, storage_path) values ('Lesson video', 'VIDEO', 'published', 'p4/lesson.mp4') returning id`)
await as('postgres', null, async () => {
  const cols = (await q(`select column_name, column_default, is_nullable from information_schema.columns where table_name = 'learning_progress' and column_name in ('last_position_seconds', 'watched_seconds') order by column_name`))
  cols.length === 2 && cols.every((c) => c.is_nullable === 'NO' && c.column_default === '0') ? ok('resume columns exist, NOT NULL default 0 (existing rows safe)') : bad('columns', JSON.stringify(cols))
})
await as('authenticated', M3, async () => {
  await expectRows('member saves video progress with resume position', `insert into public.learning_progress (resource_id, status, progress_percent, last_position_seconds, watched_seconds) values ($1, 'in_progress', 40, 125, 118) returning id`, 1, [lesson.id])
  await expectRows('member updates own resume position', `update public.learning_progress set last_position_seconds = 200, watched_seconds = 190 where resource_id = $1 returning last_position_seconds`, 1, [lesson.id])
  await expectError('negative position rejected', `update public.learning_progress set last_position_seconds = -5 where resource_id = $1`, /check constraint/, [lesson.id])
  await expectError('cannot re-point own progress at a draft resource', `update public.learning_progress set resource_id = $1 where resource_id = $2`, /row-level security/, [draft.id, lesson.id])
  await expectRows('cannot read another member’s progress', `select * from public.learning_progress where user_id = $1`, 0, [M1])
  await expectRows('cannot update another member’s progress', `update public.learning_progress set progress_percent = 0 where user_id = $1 returning id`, 0, [M1])
  await expectError('cannot create progress for another member', `insert into public.learning_progress (user_id, resource_id) values ($1, $2)`, /row-level security/, [M1, lesson.id])
  await expectRows('can favorite', `insert into public.favorites (resource_id) values ($1) returning id`, 1, [lesson.id])
  await expectError('duplicate favorite rejected', `insert into public.favorites (resource_id) values ($1)`, /duplicate key/, [lesson.id])
  await expectRows('cannot delete another member’s favorites', `delete from public.favorites where user_id = $1 returning id`, 0, [M1])
  await expectRows('can remove own favorite', `delete from public.favorites where resource_id = $1 returning id`, 1, [lesson.id])
})
await as('authenticated', M1, async () => {
  await expectRows('inactive member cannot update own progress', `update public.learning_progress set last_position_seconds = 1 returning id`, 0)
  await expectError('inactive member cannot start progress', `insert into public.learning_progress (resource_id) values ($1)`, /row-level security/, [lesson.id])
})
await as('authenticated', A, () => expectRows('admin can read all progress (reporting)', `select * from public.learning_progress where resource_id = $1`, 1, [lesson.id]))

// ---- Phase 5: admin management ----------------------------------------------
console.log('\nphase 5 — profiles & categories')
await as('authenticated', M3, async () => {
  await expectRows('member can set own contact number', `update public.profiles set phone = '+63 917 555 0101' where id = $1 returning id`, 1, [M3])
  await expectError('invalid contact number rejected', `update public.profiles set phone = 'call me<script>' where id = $1`, /check constraint/, [M3])
  await expectRows('member cannot edit another member’s contact number', `update public.profiles set phone = '1' where id = $1 returning id`, 0, [M1])
})
const [hiddenCat] = await q(`insert into public.categories (name, is_visible) values ('Internal Notes', false) returning id`)
await as('authenticated', M3, async () => {
  const rows = await q(`select name from public.categories`)
  !rows.some((r) => r.name === 'Internal Notes') && rows.length > 0 ? ok('members don’t see hidden categories') : bad('hidden category visible', JSON.stringify(rows))
  await expectError('member cannot delete categories (RPC)', `select public.delete_category($1, null)`, /Only administrators/, [hiddenCat.id])
  await expectError('member cannot create categories', `insert into public.categories (name) values ('Nope')`, /row-level security/)
  await expectRows('member cannot hide/rename categories', `update public.categories set is_visible = false returning id`, 0)
})
await as('authenticated', A, async () => {
  await expectRows('admin sees hidden categories', `select * from public.categories where id = $1`, 1, [hiddenCat.id])
  const [temp] = await q(`insert into public.categories (name) values ('Temporary') returning id`)
  await q(`update public.training_resources set category_id = $1 where id = $2`, [temp.id, lesson.id])
  const [{ delete_category: moved }] = await q(`select public.delete_category($1, $2)`, [temp.id, cat.id])
  const [res] = await q(`select category_id from public.training_resources where id = $1`, [lesson.id])
  moved === 1 && res.category_id === cat.id ? ok('delete_category moves resources to the chosen category, then deletes') : bad('reassign', JSON.stringify({ moved, res }))
  await expectRows('category is gone', `select * from public.categories where id = $1`, 0, [temp.id])
  const [log] = await q(`select user_id, details from public.activity_logs where activity_type = 'category_deleted' and target_id = $1`, [temp.id])
  log?.user_id === A && log.details?.resources_moved_to === cat.id ? ok('category deletion logged with actor + reassignment target') : bad('category log', JSON.stringify(log))
  await expectError('cannot move resources into the category being deleted', `select public.delete_category($1, $1)`, /different category/, [cat.id])
})

console.log('\nphase 5 — announcements')
let annLive, annSched, annDraft, annArch
await as('authenticated', A, async () => {
  ;[annDraft] = await q(`insert into public.announcements (title, content) values ('Draft news', 'x') returning id, status`)
  ;[annLive] = await q(`insert into public.announcements (title, content, status, image_path) values ('Live news', 'Hello team', 'published', 'ann/live.jpg') returning id, published_at`)
  ;[annSched] = await q(`insert into public.announcements (title, content, status, publish_at, image_path) values ('Future news', 'Soon', 'published', now() + interval '1 day', 'ann/future.jpg') returning id, published_at, publish_at`)
  ;[annArch] = await q(`insert into public.announcements (title, content, status) values ('Old news', 'Past', 'published') returning id`)
  await q(`update public.announcements set status = 'archived' where id = $1`, [annArch.id])
  annLive.published_at ? ok('publishing stamps published_at') : bad('published_at', JSON.stringify(annLive))
  new Date(annSched.published_at).getTime() === new Date(annSched.publish_at).getTime() ? ok('scheduled announcement: published_at = scheduled time') : bad('schedule stamp', JSON.stringify(annSched))
  await expectRows('admin sees all announcements', `select * from public.announcements where title like '%news'`, 4)
})
await q(`insert into storage.objects (bucket_id, name) values ('announcement-images', 'ann/live.jpg'), ('announcement-images', 'ann/future.jpg'), ('announcement-images', 'ann/stale.jpg')`)
await q(`update storage.objects set created_at = now() - interval '2 hours' where name = 'ann/stale.jpg'`)
await as('authenticated', M3, async () => {
  const rows = await q(`select title from public.announcements where title like '%news'`)
  rows.length === 1 && rows[0].title === 'Live news' ? ok('members see only live announcements (not draft, scheduled or archived)') : bad('member announcements', JSON.stringify(rows))
  ;(await visible('announcement-images', 'ann/live.jpg')).length === 1 ? ok('member can read a live announcement’s image') : bad('live image', 0)
  ;(await visible('announcement-images', 'ann/future.jpg')).length === 0 ? ok('member cannot read a scheduled announcement’s image') : bad('scheduled image visible', 1)
  await expectError('member cannot create announcements', `insert into public.announcements (title, content) values ('x', 'y')`, /row-level security/)
  await expectRows('member cannot publish/edit announcements', `update public.announcements set status = 'published' returning id`, 0)
  await expectRows('member cannot delete announcements', `delete from public.announcements returning id`, 0)
  await expectError('member cannot upload announcement images', `insert into storage.objects (bucket_id, name) values ('announcement-images', 'x.jpg')`, /row-level security/)
})
await as('authenticated', M1, () => expectRows('inactive member sees no announcements', `select * from public.announcements`, 0))

console.log('\nphase 5 — audit log')
await as('authenticated', A, async () => {
  const [r] = await q(`insert into public.training_resources (title, resource_type, storage_path) values ('Audit me', 'PDF', 'audit/me.pdf') returning id`)
  await q(`update public.training_resources set status = 'published', title = 'Audit me v2' where id = $1`, [r.id])
  await q(`update public.training_resources set storage_path = 'audit/me-v2.pdf' where id = $1`, [r.id])
  await q(`delete from public.training_resources where id = $1`, [r.id])
  const types = (await q(`select activity_type, user_id, details from public.activity_logs where target_id = $1 order by created_at, activity_type`, [r.id]))
  const names = types.map((t) => t.activity_type).sort().join()
  names === 'resource_deleted,resource_file_replaced,resource_published,resource_updated,resource_uploaded' && types.every((t) => t.user_id === A)
    ? ok('resource upload / publish / edit / file replace / delete all logged with the admin as actor') : bad('resource audit', JSON.stringify(types))
  const upd = types.find((t) => t.activity_type === 'resource_updated')
  JSON.stringify(upd?.details?.fields) === '["title"]' ? ok('update entry records which fields changed (no content)') : bad('fields', JSON.stringify(upd))
  const ann = (await q(`select activity_type from public.activity_logs where target_id in ($1, $2) order by activity_type`, [annLive.id, annArch.id])).map((x) => x.activity_type).join()
  ann === 'announcement_archived,announcement_created,announcement_created' ? ok('announcement create / archive logged') : bad('announcement audit', ann)
  await expectError('admins cannot forge admin-action log entries from the browser', `insert into public.activity_logs (activity_type, target_type, target_label) values ('member_created', 'member', 'fake')`, /row-level security/)
  await expectError('log_admin_action is not callable through the API', `select public.log_admin_action('member_created', 'member', null, 'x')`, /permission denied/)
})
await as('authenticated', M3, async () => {
  await expectError('members cannot write admin-action entries', `insert into public.activity_logs (activity_type) values ('resource_deleted')`, /row-level security/)
  await expectError('members cannot attach details/targets to their entries', `insert into public.activity_logs (activity_type, details) values ('viewed', '{"x":1}')`, /row-level security/)
  await expectRows('members can still log their own learning activity', `insert into public.activity_logs (activity_type) values ('viewed') returning id`, 1)
  await expectRows('members cannot read admin log entries', `select * from public.activity_logs where target_type is not null`, 0)
  await expectError('members cannot delete logs', `delete from public.activity_logs`, /permission denied/)
})

console.log('\nphase 5 — admin helpers')
await q(`update auth.users set last_sign_in_at = now() - interval '1 day' where id = $1`, [M3])
await as('authenticated', M3, () => expectError('members cannot read sign-in info', `select * from public.admin_member_auth_info(array[$1::uuid])`, /Only administrators/, [M3]))
await as('authenticated', A, async () => {
  const rows = await q(`select id, last_sign_in_at from public.admin_member_auth_info(array[$1::uuid, $2::uuid])`, [M3, M1])
  rows.length === 2 && rows.find((x) => x.id === M3)?.last_sign_in_at ? ok('admins can read last sign-in times') : bad('auth info', JSON.stringify(rows))
  const orphans = (await q(`select bucket_id, name from public.find_orphaned_training_files()`)).map((o) => `${o.bucket_id}/${o.name}`)
  orphans.includes('announcement-images/ann/stale.jpg') && !orphans.includes('announcement-images/ann/live.jpg') ? ok('orphan finder covers unused announcement images') : bad('orphans', JSON.stringify(orphans))
})
await as('authenticated', M1, () => expectRows('deactivated member’s progress is preserved (not deleted)', `select 1`, 1))
await as('postgres', null, async () => {
  const rows = await q(`select count(*)::int as n from public.learning_progress where user_id = $1`, [M1])
  rows[0].n > 0 ? ok('deactivated member’s learning progress still stored for reactivation') : bad('progress lost', rows[0].n)
})

// ---- Phase 6: schema audit ---------------------------------------------------
console.log('\nschema audit (phase 6)')
await as('postgres', null, async () => {
  const tables = (await q(`select c.relname, c.relrowsecurity from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' order by 1`))
  const names = tables.map((t) => t.relname).join(',')
  names === 'activity_logs,announcements,categories,favorites,learning_progress,portal_settings,profiles,training_resources'
    ? ok('exactly the 8 expected tables exist (no duplicates)') : bad('tables', names)
  const noRls = tables.filter((t) => !t.relrowsecurity).map((t) => t.relname)
  noRls.length === 0 ? ok('Row Level Security is enabled on every table') : bad('RLS disabled on', noRls.join(','))
  const unindexed = await q(`
    select c.conrelid::regclass::text as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.connamespace = 'public'::regnamespace
      and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1])
    order by 1, 2`)
  // profiles.id is itself the primary key (indexed); report anything else
  const missing = unindexed.filter((u) => !(u.tbl === 'profiles' && u.col === 'id')).map((u) => `${u.tbl}.${u.col}`)
  missing.length === 0 ? ok('every foreign key has a supporting index') : bad('foreign keys without index', missing.join(', '))
  const fns = await q(`select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%') order by 1`)
  fns.length === 0 ? ok('every SECURITY DEFINER function pins search_path') : bad('definer functions without search_path', fns.map((f) => f.proname).join(','))
  const anonGrants = await q(`select table_name from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'`)
  anonGrants.length === 0 ? ok('anon role has no table privileges') : bad('anon grants', [...new Set(anonGrants.map((g) => g.table_name))].join(','))
})

// ---- Sign-in log (no emails) + admin member controls ---------------------------
console.log('\nsign-in log (no alert emails)')
const signIns = async (uid) => (await q(`select count(*)::int as n from public.activity_logs where user_id = $1 and activity_type = 'signed_in'`, [uid]))[0].n
const calls = async () => (await q(`select url, body, headers from net.calls order by id`))
await as('postgres', null, async () => {
  // Old alert settings left over from an earlier setup must not cause any email.
  await q(`insert into vault.secrets (name, secret) values ('resend_api_key', 're_old_key_123456'), ('login_alert_to', 'admin@example.com')`)
  const beforeM3 = await signIns(M3)
  await q(`update auth.users set last_sign_in_at = now() where id = $1`, [M3])
  ;(await signIns(M3)) === beforeM3 + 1 ? ok('member sign-in is recorded in Activity Logs') : bad('sign-in log', await signIns(M3))
  ;(await calls()).length === 0 ? ok('no email is sent on sign-in (alerts removed), even with an old key stored') : bad('email sent', JSON.stringify(await calls()))
  const beforeA = await signIns(A)
  await q(`update auth.users set last_sign_in_at = now() + interval '1 minute' where id = $1`, [A])
  ;(await signIns(A)) === beforeA + 1 ? ok('admin sign-in is recorded too') : bad('admin log', await signIns(A))
  const fnGone = (await q(`select count(*)::int as n from pg_proc where proname in ('describe_device', 'html_escape') and pronamespace = 'public'::regnamespace`))[0].n
  fnGone === 0 ? ok('email helper functions removed') : bad('helpers still exist', fnGone)
})
await as('authenticated', M3, async () => {
  await expectError('browsers cannot write fake "signed in" entries', `insert into public.activity_logs (activity_type) values ('signed_in')`, /row-level security/)
  await expectRows('other learning activity can still be logged', `insert into public.activity_logs (activity_type) values ('watched') returning id`, 1)
  await expectError('handle_user_sign_in is not callable through the API', `select public.handle_user_sign_in()`, /permission denied|trigger functions can only be called as triggers/)
})

console.log('\nadmin member controls (no Edge Function needed)')
await as('authenticated', M3, async () => {
  await expectError('members cannot deactivate anyone', `select public.admin_set_member_status($1, 'inactive')`, /Only administrators/, [A])
  await expectError('members cannot reactivate themselves', `select public.admin_set_member_status($1, 'active')`, /Only administrators/, [M3])
  await expectError('members cannot edit members or promote themselves', `select public.admin_update_member($1, 'X', 'Y', null, 'admin')`, /Only administrators/, [M3])
})
await as('anon', null, () => expectError('visitors cannot call admin controls', `select public.admin_set_member_status($1, 'inactive')`, /permission denied/, [M3]))
await as('authenticated', A, async () => {
  const [r1] = await q(`select public.admin_set_member_status($1, 'inactive') as m`, [M3])
  r1.m.status === 'inactive' && r1.m.id === M3 ? ok('admin deactivates a member (returns the updated profile)') : bad('deactivate', JSON.stringify(r1))
  await expectError('admin cannot deactivate their own account', `select public.admin_set_member_status($1, 'inactive')`, /own account/, [A])
  await expectError('invalid status rejected', `select public.admin_set_member_status($1, 'banned')`, /Invalid status/, [M3])
  await expectError('unknown member rejected', `select public.admin_set_member_status(gen_random_uuid(), 'active')`, /not found/)
})
await as('authenticated', M3, async () => {
  await expectRows('deactivated member is blocked from training', `select * from public.training_resources`, 0)
  await expectRows('…but still sees their own profile (shows "Account not active")', `select status from public.profiles`, 1)
})
await as('postgres', null, async () => {
  const kept = (await q(`select count(*)::int as n from public.learning_progress where user_id = $1`, [M3]))[0].n
  kept > 0 ? ok('deactivation keeps the member’s learning records') : bad('records lost', kept)
  const logged = (await q(`select user_id from public.activity_logs where activity_type = 'member_deactivated' and target_id = $1`, [M3]))
  logged.length === 1 && logged[0].user_id === A ? ok('deactivation recorded in the audit log with the admin as actor') : bad('audit', JSON.stringify(logged))
})
await as('authenticated', A, async () => {
  const [r2] = await q(`select public.admin_set_member_status($1, 'active') as m`, [M3])
  r2.m.status === 'active' ? ok('admin reactivates the member') : bad('reactivate', JSON.stringify(r2))
})
await as('authenticated', M3, () => expectRows('reactivated member can open training again', `select * from public.training_resources where status = 'published'`, 1))
await as('authenticated', A, async () => {
  const [u] = await q(`select public.admin_update_member($1, ' Mia ', 'Lopez  Cruz', '+63 917 000 1111', null) as m`, [M3])
  u.m.first_name === 'Mia' && u.m.last_name === 'Lopez Cruz' && u.m.phone === '+63 917 000 1111' ? ok('admin edits name and contact number (tidied)') : bad('edit', JSON.stringify(u))
  await expectError('names with < or > rejected', `select public.admin_update_member($1, '<script>', 'X', null, null)`, /without < or >/, [M3])
  await expectError('bad contact number rejected', `select public.admin_update_member($1, 'Mia', 'L', 'call me', null)`, /valid contact number/, [M3])
  const [pr] = await q(`select public.admin_update_member($1, 'Mia', 'Lopez Cruz', null, 'admin') as m`, [M3])
  pr.m.role === 'admin' ? ok('admin can promote a member to administrator') : bad('promote', JSON.stringify(pr))
  const [dm] = await q(`select public.admin_update_member($1, 'Mia', 'Lopez Cruz', null, 'member') as m`, [M3])
  dm.m.role === 'member' ? ok('…and demote them again') : bad('demote', JSON.stringify(dm))
  await expectError('admin cannot change their own role', `select public.admin_update_member($1, 'Olive', 'Owner', null, 'member')`, /own role/, [A])
  const roleLog = await q(`select details from public.activity_logs where activity_type = 'member_role_changed' and target_id = $1 order by created_at`, [M3])
  roleLog.length === 2 && roleLog[0].details.to === 'admin' ? ok('role changes recorded in the audit log (from → to)') : bad('role audit', JSON.stringify(roleLog))
})

// ---- Self sign-up -------------------------------------------------------------
console.log('\nself sign-up')
const profileOf = async (email) => (await q(`select role, status from public.profiles where email = $1`, [email]))[0]
await as('authenticated', M3, async () => {
  await expectError('members cannot read portal settings', `select * from public.portal_settings`, /permission denied/)
  await expectError('members cannot change portal settings', `update public.portal_settings set new_account_status = 'active'`, /permission denied/)
})
await as('anon', null, () => expectError('visitors cannot read portal settings', `select * from public.portal_settings`, /permission denied/))
await as('postgres', null, async () => {
  await q(`insert into auth.users (email, raw_user_meta_data) values ('selfie@example.com', '{"first_name":"Sam","role":"admin"}')`)
  const a = await profileOf('selfie@example.com')
  a.role === 'member' && a.status === 'active' ? ok('open mode: sign-up → active member, can learn immediately') : bad('open mode', JSON.stringify(a))

  await q(`update public.portal_settings set new_account_status = 'inactive'`)
  await q(`insert into auth.users (email) values ('waiting@example.com')`)
  const b = await profileOf('waiting@example.com')
  b.role === 'member' && b.status === 'inactive' ? ok('approval mode: sign-up → inactive until an admin activates it') : bad('approval mode', JSON.stringify(b))

  await q(`delete from public.portal_settings`)
  await q(`insert into auth.users (email) values ('nosetting@example.com')`)
  ;(await profileOf('nosetting@example.com')).status === 'inactive' ? ok('fails closed: no settings row → new accounts inactive') : bad('fail closed', 'active')
  await q(`insert into public.portal_settings (id, new_account_status) values (true, 'active')`)
  await expectError('only one settings row can exist', `insert into public.portal_settings (id) values (false)`, /check constraint/)

})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
