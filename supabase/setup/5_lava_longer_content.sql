-- =====================================================================
-- VA Training Academy — Allow longer LAVA content (copy-paste, one time)
-- =====================================================================
-- Run in: Supabase Dashboard → SQL Editor → New query → paste ALL of this → Run
-- (Run 2_lava_portal.sql first.)
--
-- What it does: company sections and lessons can now hold up to 50,000
-- characters (enough for large custom-code embeds). No data is changed.
-- Safe to run more than once.
--
-- (Technical: migration 20261125100000. `npx supabase db push` later is fine.)
-- =====================================================================

do $$
begin
  if to_regclass('public.lava_content') is null or to_regclass('public.lava_lessons') is null then
    raise exception 'Run supabase/setup/2_lava_portal.sql first, then run this script again.';
  end if;
end $$;

-- =====================================================================
-- VA Training Academy — Phase 7A (continued)
-- 015 · Longer LAVA content (custom code, long sections)
-- =====================================================================
-- Raises the maximum length of company sections (was 20,000 characters)
-- and lessons (was 40,000) to 50,000 characters each, so large custom-code
-- embeds fit. Only the length rule changes; no data is modified.
-- Idempotent: safe to run again.

alter table public.lava_content drop constraint if exists lava_content_body_check;
alter table public.lava_content add constraint lava_content_body_check check (char_length(body) <= 50000);

alter table public.lava_lessons drop constraint if exists lava_lessons_body_check;
alter table public.lava_lessons add constraint lava_lessons_body_check check (char_length(body) <= 50000);

-- Done.
select 'Longer content ready: sections and lessons now allow up to 50,000 characters.' as result;
