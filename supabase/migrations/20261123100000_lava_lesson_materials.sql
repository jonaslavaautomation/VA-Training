-- =====================================================================
-- VA Training Academy — Phase 7A (continued)
-- 013 · LAVA lesson videos & PDFs
-- =====================================================================
-- Admins upload videos and PDFs for each LAVA lesson. Files reuse the
-- existing Training Library storage (training_resources + the private
-- training-pdfs / training-videos buckets) — no second storage system.
--
--   * training_resources.audience: 'library' (default, every existing row)
--     or 'lava' (LAVA preparation material). LAVA materials are hidden
--     from the general Training Library and are readable — row AND file —
--     only by members who completed the LAVA applicant agreement.
--   * lava_lesson_materials: any number of videos/PDFs per lesson, ordered.
--     Existing single attachments (lava_lessons.resource_id) are copied in.
--
-- Existing rows keep audience = 'library', so nothing changes for the
-- current library. The member read rule is only made stricter for LAVA
-- material; no existing record is changed or deleted.
-- Idempotent: safe to run again.

alter table public.training_resources
  add column if not exists audience text not null default 'library';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'training_resources_audience_check') then
    alter table public.training_resources
      add constraint training_resources_audience_check check (audience in ('library', 'lava'));
  end if;
end $$;
create index if not exists training_resources_audience_idx on public.training_resources (audience, status, created_at desc);

-- Members: published library material as before; LAVA material only after the agreement.
drop policy if exists "training_resources: active users read published" on public.training_resources;
drop policy if exists "training_resources: active users read published (LAVA after agreement)" on public.training_resources;
create policy "training_resources: active users read published (LAVA after agreement)"
  on public.training_resources for select to authenticated
  using (
    status = 'published'
    and (select public.is_active_user())
    and (audience = 'library' or (select public.lava_has_agreed()))
  );

-- Same rule for the files themselves (signed URLs come from Storage RLS).
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
          and (r.audience = 'library' or public.lava_has_agreed())
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

-- Videos & PDFs per lesson
create table if not exists public.lava_lesson_materials (
  lesson_id uuid not null references public.lava_lessons (id) on delete cascade,
  resource_id uuid not null references public.training_resources (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (lesson_id, resource_id)
);
create index if not exists lava_lesson_materials_resource_idx on public.lava_lesson_materials (resource_id);

insert into public.lava_lesson_materials (lesson_id, resource_id, sort_order)
select id, resource_id, 0 from public.lava_lessons where resource_id is not null
on conflict do nothing;
comment on column public.lava_lessons.resource_id is 'Superseded by lava_lesson_materials (kept for compatibility).';

alter table public.lava_lesson_materials enable row level security;
revoke all on public.lava_lesson_materials from anon;

drop policy if exists "lava_lesson_materials: read after agreement" on public.lava_lesson_materials;
create policy "lava_lesson_materials: read after agreement" on public.lava_lesson_materials for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.lava_has_agreed())
        and exists (
          select 1 from public.lava_lessons l join public.lava_courses c on c.id = l.course_id
          where l.id = lesson_id and c.status = 'published'
        ))
  );
drop policy if exists "lava_lesson_materials: admins manage" on public.lava_lesson_materials;
create policy "lava_lesson_materials: admins manage" on public.lava_lesson_materials for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
