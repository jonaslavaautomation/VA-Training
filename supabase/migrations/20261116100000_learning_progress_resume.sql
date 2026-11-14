-- =====================================================================
-- VA Training Academy — Phase 4
-- 005 · Learning progress: video resume + honest completion
-- =====================================================================
-- Additive only: existing rows get safe defaults (0), nothing is dropped.
--
--   last_position_seconds  where the member stopped → "Continue" resumes here
--   watched_seconds        seconds actually played (seeking doesn't count),
--                          so jumping to the end can't mark a video complete
--
-- progress_percent keeps its meaning (furthest point reached, 0–100).

alter table public.learning_progress
  add column if not exists last_position_seconds integer not null default 0
    check (last_position_seconds >= 0),
  add column if not exists watched_seconds integer not null default 0
    check (watched_seconds >= 0);

comment on column public.learning_progress.last_position_seconds is 'Video resume position (seconds). 0 for PDFs.';
comment on column public.learning_progress.watched_seconds is 'Approximate seconds of video actually played (excludes seeking). Used for the completion rule.';

-- ---------------------------------------------------------------------
-- Tighten the member UPDATE policy.
-- Before: WITH CHECK only required user_id = auth.uid(), so a member could
-- re-point their own progress row at a resource id they cannot see (e.g. a
-- draft). Now an updated row must still reference a resource visible to
-- them — the same rule the INSERT policy already enforces.
-- ---------------------------------------------------------------------
drop policy if exists "learning_progress: active users update own" on public.learning_progress;

create policy "learning_progress: active users update own"
  on public.learning_progress for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.training_resources r where r.id = resource_id)
  );
