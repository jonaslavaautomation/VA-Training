-- =====================================================================
-- VA Training Academy — Paste photos into LAVA content (copy-paste, one time)
-- =====================================================================
-- Run in: Supabase Dashboard → SQL Editor → New query → paste ALL of this → Run
-- (Run 2_lava_portal.sql first.)
--
-- What it adds: a photo storage area so you can copy a photo and paste it
-- (⌘V / Ctrl+V) straight into Company content and lessons. Photos are
-- public company photos; only admins can add or remove them.
-- Nothing existing changes. Safe to run more than once.
--
-- (Technical: migration 20261124100000. `npx supabase db push` later is fine.)
-- =====================================================================

do $$
begin
  if to_regclass('public.lava_content') is null then
    raise exception 'Run supabase/setup/2_lava_portal.sql first, then run this script again.';
  end if;
end $$;

-- =====================================================================
-- VA Training Academy — Phase 7A (continued)
-- 014 · Pasted photos in LAVA company content and lessons
-- =====================================================================
-- Admins paste (⌘V / Ctrl+V) or drop photos straight into the content
-- editor. The app saves each pasted photo automatically to a dedicated
-- storage bucket, `lava-images`, and inserts it into the text:
--   * PUBLIC read — these are company marketing photos (the same kind of
--     images shown on lavaautomation.com), served by plain URL so the
--     editor preview and member pages show them without signed links.
--     Never paste private or personal documents.
--   * Only administrators can add, replace or delete photos.
--   * JPEG / PNG / WebP only, 5 MB per photo (large photos are shrunk
--     in the browser before saving).
-- Training videos/PDFs stay in the existing PRIVATE buckets.
-- Additive only; nothing existing changes. Idempotent: safe to run again.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lava-images', 'lava-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lava images: admins read" on storage.objects;
create policy "lava images: admins read"
  on storage.objects for select to authenticated
  using (bucket_id = 'lava-images' and (select public.is_admin()));
drop policy if exists "lava images: admins upload" on storage.objects;
create policy "lava images: admins upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'lava-images' and (select public.is_admin()));
drop policy if exists "lava images: admins replace" on storage.objects;
create policy "lava images: admins replace"
  on storage.objects for update to authenticated
  using (bucket_id = 'lava-images' and (select public.is_admin()))
  with check (bucket_id = 'lava-images' and (select public.is_admin()));
drop policy if exists "lava images: admins delete" on storage.objects;
create policy "lava images: admins delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'lava-images' and (select public.is_admin()));

-- Done.
select 'Photos ready: copy a photo and paste it into Admin → LAVA Applicants → Company content.' as result;
