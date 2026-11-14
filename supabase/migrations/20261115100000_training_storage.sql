-- =====================================================================
-- VA Training Academy — Phase 3
-- 004 · Private training storage: buckets, Storage RLS, file integrity
-- =====================================================================
-- Files live in three PRIVATE buckets. The database stores only object
-- paths (training_resources.storage_path / thumbnail_path) — never URLs.
-- Browsers get access through short-lived signed URLs, and Supabase only
-- signs a URL when the SELECT policy below allows the caller to read it.

-- ---------------------------------------------------------------------
-- Buckets (private; size + MIME limits are enforced by Storage itself)
--   training-pdfs        50 MB   application/pdf
--   training-videos       2 GB   video/mp4, video/webm
--   resource-thumbnails   5 MB   image/jpeg, image/png, image/webp
-- NOTE: the project-wide upload limit (Dashboard → Storage → Settings)
-- also applies and wins if lower: 50 MB on the Free plan. See
-- supabase/README.md → "Storage limits".
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('training-pdfs',       'training-pdfs',       false, 52428800,   array['application/pdf']),
  ('training-videos',     'training-videos',     false, 2147483648, array['video/mp4', 'video/webm']),
  ('resource-thumbnails', 'resource-thumbnails', false, 5242880,    array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- Database integrity for files
-- ---------------------------------------------------------------------
-- One file belongs to exactly one resource, so deleting a resource can
-- never remove a file another resource still uses.
create unique index training_resources_storage_path_key
  on public.training_resources (storage_path) where storage_path is not null;
create unique index training_resources_thumbnail_path_key
  on public.training_resources (thumbnail_path) where thumbnail_path is not null;

-- A resource cannot be published without its file.
alter table public.training_resources
  add constraint training_resources_published_has_file
  check (status = 'draft' or storage_path is not null);

-- ---------------------------------------------------------------------
-- Read check used by the Storage SELECT policy.
-- SECURITY DEFINER: evaluates training_resources without the caller's
-- table RLS so the logic is explicit and in one place:
--   * active admins → every training file (drafts included)
--   * active users  → only files attached to a PUBLISHED resource,
--                     in the bucket that matches the resource type
--   * inactive users / anon → nothing
-- ---------------------------------------------------------------------
create or replace function public.can_read_training_file(p_bucket text, p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
    or (
      public.is_active_user()
      and exists (
        select 1
        from public.training_resources r
        where r.status = 'published'
          and (
               (p_bucket = 'training-pdfs'       and r.resource_type = 'PDF'   and r.storage_path   = p_name)
            or (p_bucket = 'training-videos'     and r.resource_type = 'VIDEO' and r.storage_path   = p_name)
            or (p_bucket = 'resource-thumbnails'                               and r.thumbnail_path = p_name)
          )
      )
    );
$$;

revoke all on function public.can_read_training_file(text, text) from public, anon;
grant execute on function public.can_read_training_file(text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Storage RLS (storage.objects already has RLS enabled by Supabase)
-- ---------------------------------------------------------------------
create policy "training files: read published (active users) or any (admins)"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('training-pdfs', 'training-videos', 'resource-thumbnails')
    and public.can_read_training_file(bucket_id, name)
  );

create policy "training files: admins upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('training-pdfs', 'training-videos', 'resource-thumbnails')
    and (select public.is_admin())
  );

create policy "training files: admins replace"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('training-pdfs', 'training-videos', 'resource-thumbnails')
    and (select public.is_admin())
  )
  with check (
    bucket_id in ('training-pdfs', 'training-videos', 'resource-thumbnails')
    and (select public.is_admin())
  );

create policy "training files: admins delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('training-pdfs', 'training-videos', 'resource-thumbnails')
    and (select public.is_admin())
  );

-- Lets the upload screen read the real bucket limits instead of guessing.
create policy "training buckets: admins read settings"
  on storage.buckets for select to authenticated
  using (
    id in ('training-pdfs', 'training-videos', 'resource-thumbnails')
    and (select public.is_admin())
  );

-- ---------------------------------------------------------------------
-- Orphaned files: objects in the training buckets that no resource row
-- references (e.g. the browser closed after an upload but before the
-- record was saved, or a storage delete failed after a record delete).
-- The Manage Resources page lists them and removes them through the
-- Storage API. `min_age` protects uploads that are still being saved.
-- ---------------------------------------------------------------------
create or replace function public.find_orphaned_training_files(min_age interval default interval '1 hour')
returns table (bucket_id text, name text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can do this.' using errcode = '42501';
  end if;

  return query
    select o.bucket_id::text, o.name::text, o.created_at
    from storage.objects o
    where o.bucket_id in ('training-pdfs', 'training-videos', 'resource-thumbnails')
      and o.created_at < now() - min_age
      and not exists (
        select 1 from public.training_resources r
        where (o.bucket_id = 'training-pdfs'       and r.resource_type = 'PDF'   and r.storage_path   = o.name)
           or (o.bucket_id = 'training-videos'     and r.resource_type = 'VIDEO' and r.storage_path   = o.name)
           or (o.bucket_id = 'resource-thumbnails'                               and r.thumbnail_path = o.name)
      )
    order by o.created_at;
end;
$$;

revoke all on function public.find_orphaned_training_files(interval) from public, anon;
grant execute on function public.find_orphaned_training_files(interval) to authenticated;
