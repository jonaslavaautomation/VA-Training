-- =====================================================================
-- VA Training Academy — Phase 2
-- 001 · Core schema: tables, constraints, indexes, timestamps
-- =====================================================================
-- Every table lives in `public` and is locked down with Row Level Security
-- in the RLS migration that follows. Nothing here grants access by itself.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles — one row per auth user. Source of truth for role + status.
-- Rows are created only by the on_auth_user_created trigger (next
-- migration); browsers can never insert them.
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  first_name  text not null default '' check (char_length(first_name) <= 80),
  last_name   text not null default '' check (char_length(last_name) <= 80),
  email       text not null check (email = lower(email) and char_length(email) <= 254),
  role        text not null default 'member' check (role in ('admin', 'member')),
  status      text not null default 'inactive' check (status in ('active', 'inactive')),
  avatar_url  text check (avatar_url is null or char_length(avatar_url) <= 2048),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on column public.profiles.role is 'Authorization role. Only changeable by service_role / SQL editor — never by browser sessions.';
comment on column public.profiles.status is 'inactive = access revoked (RLS denies all portal data; auth user is also banned by the admin-members Edge Function).';

create unique index profiles_email_key on public.profiles (email);
create index profiles_role_status_idx on public.profiles (role, status);
create index profiles_created_at_idx on public.profiles (created_at desc);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- categories
-- `slug` (derived from name) and `color` are used by the Phase 1 UI for
-- shareable library filter URLs and category tile colors.
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  slug        text generated always as (
                btrim(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), '-')
              ) stored,
  description text check (description is null or char_length(description) <= 500),
  icon        text check (icon is null or char_length(icon) <= 40),
  color       text check (color is null or color in ('navy', 'mint', 'sky', 'rose', 'amber', 'violet')),
  created_at  timestamptz not null default now()
);

create unique index categories_name_key on public.categories (lower(name));
create unique index categories_slug_key on public.categories (slug);

-- ---------------------------------------------------------------------
-- training_resources
-- file_size / duration_seconds / page_count are optional metadata the
-- Phase 1 cards already display; Phase 3 uploads will fill them in.
-- ---------------------------------------------------------------------
create table public.training_resources (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(btrim(title)) between 1 and 200),
  description      text check (description is null or char_length(description) <= 5000),
  category_id      uuid references public.categories (id) on delete set null,
  resource_type    text not null check (resource_type in ('PDF', 'VIDEO')),
  storage_path     text check (storage_path is null or char_length(storage_path) <= 1024),
  thumbnail_path   text check (thumbnail_path is null or char_length(thumbnail_path) <= 1024),
  file_size        bigint check (file_size is null or file_size >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  page_count       integer check (page_count is null or page_count >= 0),
  uploaded_by      uuid default auth.uid() references public.profiles (id) on delete set null,
  status           text not null default 'draft' check (status in ('draft', 'published')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index training_resources_status_created_idx on public.training_resources (status, created_at desc);
create index training_resources_category_idx on public.training_resources (category_id);
create index training_resources_type_idx on public.training_resources (resource_type);
create index training_resources_uploaded_by_idx on public.training_resources (uploaded_by);

create trigger training_resources_set_updated_at
  before update on public.training_resources
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------
create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  content     text not null check (char_length(content) <= 20000),
  created_by  uuid default auth.uid() references public.profiles (id) on delete set null,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index announcements_published_created_idx on public.announcements (published, created_at desc);
create index announcements_created_by_idx on public.announcements (created_by);

-- ---------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------
create table public.favorites (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  resource_id  uuid not null references public.training_resources (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (user_id, resource_id)
);

create index favorites_resource_idx on public.favorites (resource_id);

-- ---------------------------------------------------------------------
-- learning_progress
-- progress_percent drives the progress bars already in the Phase 1 UI.
-- ---------------------------------------------------------------------
create table public.learning_progress (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  resource_id       uuid not null references public.training_resources (id) on delete cascade,
  status            text not null default 'in_progress' check (status in ('not_started', 'in_progress', 'completed')),
  progress_percent  smallint not null default 0 check (progress_percent between 0 and 100),
  completed_at      timestamptz,
  updated_at        timestamptz not null default now(),
  unique (user_id, resource_id),
  check ((status = 'completed') = (completed_at is not null))
);

create index learning_progress_resource_idx on public.learning_progress (resource_id);
create index learning_progress_user_updated_idx on public.learning_progress (user_id, updated_at desc);

create trigger learning_progress_set_updated_at
  before update on public.learning_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- activity_logs — append-only audit trail of member activity
-- ---------------------------------------------------------------------
create table public.activity_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  activity_type  text not null check (activity_type in ('signed_in', 'viewed', 'watched', 'downloaded', 'completed', 'favorited')),
  resource_id    uuid references public.training_resources (id) on delete set null,
  created_at     timestamptz not null default now()
);

create index activity_logs_created_idx on public.activity_logs (created_at desc);
create index activity_logs_user_created_idx on public.activity_logs (user_id, created_at desc);
create index activity_logs_resource_idx on public.activity_logs (resource_id);
