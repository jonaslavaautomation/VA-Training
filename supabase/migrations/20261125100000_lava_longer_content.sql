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
