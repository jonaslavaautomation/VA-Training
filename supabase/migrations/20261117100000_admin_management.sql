-- =====================================================================
-- VA Training Academy — Phase 5
-- 006 · Admin management: contact numbers, category visibility,
--       announcements workflow, trusted admin audit log, helpers
-- =====================================================================
-- Additive where possible. The only removal is announcements.published,
-- which nothing used yet; it is migrated into the new `status` column.

-- ---------------------------------------------------------------------
-- 1. Profiles: optional contact number
--    (Members may edit their own; protect_profile_fields still blocks
--    role / status / email changes from browser sessions.)
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists phone text
    check (phone is null or (char_length(phone) <= 32 and phone ~ '^[0-9+()\-. ]*$'));

-- ---------------------------------------------------------------------
-- 2. Categories: visibility + updated_at
-- ---------------------------------------------------------------------
alter table public.categories
  add column if not exists is_visible boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- Members see visible categories only; admins see all.
drop policy if exists "categories: active users read" on public.categories;
create policy "categories: active users read visible"
  on public.categories for select to authenticated
  using (is_visible and (select public.is_active_user()));
create policy "categories: admins read all"
  on public.categories for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 3. Announcements: draft → published (optionally scheduled) → archived
-- ---------------------------------------------------------------------
alter table public.announcements
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  add column if not exists image_path text check (image_path is null or char_length(image_path) <= 1024),
  add column if not exists publish_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Carry over any existing rows, then retire the boolean.
update public.announcements set status = 'published', published_at = coalesce(published_at, created_at) where published;
drop policy if exists "announcements: active users read published" on public.announcements;
alter table public.announcements drop column if exists published;

create index if not exists announcements_status_publish_idx on public.announcements (status, publish_at, created_at desc);
create unique index if not exists announcements_image_path_key on public.announcements (image_path) where image_path is not null;

-- Members see published announcements whose scheduled time has arrived.
-- Scheduling needs no background job: visibility is evaluated at read time.
create policy "announcements: active users read live"
  on public.announcements for select to authenticated
  using (
    status = 'published'
    and (publish_at is null or publish_at <= now())
    and (select public.is_active_user())
  );

create or replace function public.announcement_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published' or new.publish_at is distinct from old.publish_at) then
    new.published_at := coalesce(new.publish_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists announcements_lifecycle on public.announcements;
create trigger announcements_lifecycle
  before insert or update on public.announcements
  for each row execute function public.announcement_lifecycle();

-- Private bucket for announcement images (same rules as training files).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('announcement-images', 'announcement-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_read_announcement_image(p_name text)
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
        select 1 from public.announcements a
        where a.image_path = p_name
          and a.status = 'published'
          and (a.publish_at is null or a.publish_at <= now())
      )
    );
$$;
revoke all on function public.can_read_announcement_image(text) from public, anon;
grant execute on function public.can_read_announcement_image(text) to authenticated, service_role;

create policy "announcement images: read live (active users) or any (admins)"
  on storage.objects for select to authenticated
  using (bucket_id = 'announcement-images' and public.can_read_announcement_image(name));
create policy "announcement images: admins upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'announcement-images' and (select public.is_admin()));
create policy "announcement images: admins replace"
  on storage.objects for update to authenticated
  using (bucket_id = 'announcement-images' and (select public.is_admin()))
  with check (bucket_id = 'announcement-images' and (select public.is_admin()));
create policy "announcement images: admins delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'announcement-images' and (select public.is_admin()));

drop policy if exists "training buckets: admins read settings" on storage.buckets;
create policy "training buckets: admins read settings"
  on storage.buckets for select to authenticated
  using (
    id in ('training-pdfs', 'training-videos', 'resource-thumbnails', 'announcement-images')
    and (select public.is_admin())
  );

-- ---------------------------------------------------------------------
-- 4. Activity log: extended for admin actions (same table, no duplicate)
-- ---------------------------------------------------------------------
alter table public.activity_logs
  alter column user_id drop not null, -- null = system / SQL editor
  add column if not exists target_type text check (target_type is null or target_type in ('member', 'resource', 'category', 'announcement')),
  add column if not exists target_id uuid,
  add column if not exists target_label text check (target_label is null or char_length(target_label) <= 200),
  add column if not exists details jsonb check (details is null or pg_column_size(details) <= 4096);

alter table public.activity_logs drop constraint if exists activity_logs_activity_type_check;
alter table public.activity_logs add constraint activity_logs_activity_type_check check (activity_type in (
  -- member activity (written by members themselves)
  'signed_in', 'viewed', 'watched', 'downloaded', 'completed', 'favorited',
  -- admin actions (written only by triggers and the admin-members Edge Function)
  'member_created', 'member_updated', 'member_role_changed', 'member_activated', 'member_deactivated',
  'member_invite_sent', 'member_password_reset_sent',
  'resource_uploaded', 'resource_updated', 'resource_file_replaced', 'resource_published', 'resource_unpublished', 'resource_deleted',
  'category_created', 'category_updated', 'category_deleted',
  'announcement_created', 'announcement_updated', 'announcement_published', 'announcement_unpublished', 'announcement_archived', 'announcement_deleted'
));

create index if not exists activity_logs_type_created_idx on public.activity_logs (activity_type, created_at desc);
create index if not exists activity_logs_target_idx on public.activity_logs (target_type, target_id);

-- Browser sessions may only append their OWN member-activity rows — they can
-- never write an admin-action entry (no forged audit trail), not even admins.
drop policy if exists "activity_logs: active users add own" on public.activity_logs;
create policy "activity_logs: active users add own member activity"
  on public.activity_logs for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_active_user())
    and activity_type in ('signed_in', 'viewed', 'watched', 'downloaded', 'completed', 'favorited')
    and target_type is null and target_id is null and target_label is null and details is null
    and (resource_id is null or exists (select 1 from public.training_resources r where r.id = resource_id))
  );

-- Trusted writer used by the audit triggers below. Not callable via the API.
create or replace function public.log_admin_action(
  p_type text, p_target_type text, p_target_id uuid, p_label text, p_details jsonb default null, p_resource uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity_logs (user_id, activity_type, target_type, target_id, target_label, details, resource_id)
  values (auth.uid(), p_type, p_target_type, p_target_id, left(p_label, 200), p_details, p_resource);
end;
$$;
revoke all on function public.log_admin_action(text, text, uuid, text, jsonb, uuid) from public, anon, authenticated;

-- Resources: uploads, edits, file replacement, publish state, deletion.
create or replace function public.audit_training_resources()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed text[] := '{}';
begin
  if tg_op = 'INSERT' then
    perform public.log_admin_action('resource_uploaded', 'resource', new.id, new.title,
      jsonb_build_object('type', new.resource_type, 'status', new.status), new.id);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.log_admin_action('resource_deleted', 'resource', old.id, old.title,
      jsonb_build_object('type', old.resource_type), null);
    return old;
  end if;

  if new.status is distinct from old.status then
    perform public.log_admin_action(
      case when new.status = 'published' then 'resource_published' else 'resource_unpublished' end,
      'resource', new.id, new.title, null, new.id);
  end if;
  if new.storage_path is distinct from old.storage_path then
    perform public.log_admin_action('resource_file_replaced', 'resource', new.id, new.title, null, new.id);
  end if;
  if new.title is distinct from old.title then changed := array_append(changed, 'title'); end if;
  if new.description is distinct from old.description then changed := array_append(changed, 'description'); end if;
  if new.category_id is distinct from old.category_id then changed := array_append(changed, 'category'); end if;
  if new.thumbnail_path is distinct from old.thumbnail_path then changed := array_append(changed, 'thumbnail'); end if;
  if cardinality(changed) > 0 then
    perform public.log_admin_action('resource_updated', 'resource', new.id, new.title, jsonb_build_object('fields', to_jsonb(changed)), new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists training_resources_audit on public.training_resources;
create trigger training_resources_audit
  after insert or update or delete on public.training_resources
  for each row execute function public.audit_training_resources();

-- Categories
create or replace function public.audit_categories()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed text[] := '{}';
  moved_to text := nullif(current_setting('vata.category_moved_to', true), '');
begin
  if tg_op = 'INSERT' then
    perform public.log_admin_action('category_created', 'category', new.id, new.name, null, null);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.log_admin_action('category_deleted', 'category', old.id, old.name,
      case when moved_to is not null then jsonb_build_object('resources_moved_to', moved_to) end, null);
    return old;
  end if;
  if new.name is distinct from old.name then changed := array_append(changed, 'name'); end if;
  if new.description is distinct from old.description then changed := array_append(changed, 'description'); end if;
  if new.is_visible is distinct from old.is_visible then changed := array_append(changed, case when new.is_visible then 'shown' else 'hidden' end); end if;
  if new.icon is distinct from old.icon or new.color is distinct from old.color then changed := array_append(changed, 'appearance'); end if;
  if cardinality(changed) > 0 then
    perform public.log_admin_action('category_updated', 'category', new.id, new.name, jsonb_build_object('fields', to_jsonb(changed)), null);
  end if;
  return new;
end;
$$;

drop trigger if exists categories_audit on public.categories;
create trigger categories_audit
  after insert or update or delete on public.categories
  for each row execute function public.audit_categories();

-- Announcements
create or replace function public.audit_announcements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_admin_action('announcement_created', 'announcement', new.id, new.title,
      jsonb_build_object('status', new.status, 'scheduled_for', new.publish_at), null);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.log_admin_action('announcement_deleted', 'announcement', old.id, old.title, null, null);
    return old;
  end if;
  if new.status is distinct from old.status then
    perform public.log_admin_action(
      case new.status when 'published' then 'announcement_published' when 'archived' then 'announcement_archived' else 'announcement_unpublished' end,
      'announcement', new.id, new.title,
      case when new.status = 'published' and new.publish_at > now() then jsonb_build_object('scheduled_for', new.publish_at) end, null);
  elsif new.title is distinct from old.title or new.content is distinct from old.content
     or new.image_path is distinct from old.image_path or new.publish_at is distinct from old.publish_at then
    perform public.log_admin_action('announcement_updated', 'announcement', new.id, new.title, null, null);
  end if;
  return new;
end;
$$;

drop trigger if exists announcements_audit on public.announcements;
create trigger announcements_audit
  after insert or update or delete on public.announcements
  for each row execute function public.audit_announcements();

-- ---------------------------------------------------------------------
-- 5. Safe category deletion with reassignment (one transaction)
--    SECURITY INVOKER: the caller's RLS still applies (admins only).
-- ---------------------------------------------------------------------
create or replace function public.delete_category(p_category uuid, p_move_to uuid default null)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  moved integer;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can delete categories.' using errcode = '42501';
  end if;
  if p_move_to = p_category then
    raise exception 'Choose a different category to move resources into.';
  end if;
  if p_move_to is not null and not exists (select 1 from public.categories where id = p_move_to) then
    raise exception 'The category to move resources into no longer exists.';
  end if;
  perform set_config('vata.category_moved_to', coalesce(p_move_to::text, 'uncategorized'), true);
  update public.training_resources set category_id = p_move_to where category_id = p_category;
  get diagnostics moved = row_count;
  delete from public.categories where id = p_category;
  if not found then
    raise exception 'Category not found.';
  end if;
  return moved;
end;
$$;
revoke all on function public.delete_category(uuid, uuid) from public, anon;
grant execute on function public.delete_category(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Sign-in information for the admin member list / details
--    auth.users is not exposed to the API; this returns only harmless
--    timestamps, and only to active admins.
-- ---------------------------------------------------------------------
create or replace function public.admin_member_auth_info(p_ids uuid[])
returns table (id uuid, last_sign_in_at timestamptz, invited_at timestamptz, email_confirmed_at timestamptz)
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
    select u.id, u.last_sign_in_at, u.invited_at, u.email_confirmed_at
    from auth.users u
    where u.id = any(p_ids)
    limit 500;
end;
$$;
revoke all on function public.admin_member_auth_info(uuid[]) from public, anon;
grant execute on function public.admin_member_auth_info(uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Orphaned-file finder now also covers announcement images
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
    where o.bucket_id in ('training-pdfs', 'training-videos', 'resource-thumbnails', 'announcement-images')
      and o.created_at < now() - min_age
      and not exists (
        select 1 from public.training_resources r
        where (o.bucket_id = 'training-pdfs'       and r.resource_type = 'PDF'   and r.storage_path   = o.name)
           or (o.bucket_id = 'training-videos'     and r.resource_type = 'VIDEO' and r.storage_path   = o.name)
           or (o.bucket_id = 'resource-thumbnails'                               and r.thumbnail_path = o.name)
      )
      and not exists (
        select 1 from public.announcements a
        where o.bucket_id = 'announcement-images' and a.image_path = o.name
      )
    order by o.created_at;
end;
$$;
