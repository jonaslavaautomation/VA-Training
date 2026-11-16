// In-memory Postgres (PGlite) that looks enough like Supabase to run every
// migration in supabase/migrations: auth / storage / vault / pg_net stand-ins
// and the anon / authenticated / service_role roles. Used by lava.test.mjs and
// by the browser tests' fake Supabase (tests/e2e/fake-supabase.mjs).
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS = new URL('../migrations', import.meta.url).pathname

export async function supabaseLikeDb(migrationsDir = MIGRATIONS) {
  const db = new PGlite({ extensions: { pgcrypto } })
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
  }
  return db
}
