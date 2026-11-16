-- =====================================================================
-- VA Training Academy — Phase 7A
-- 011 · LAVA Automation applicant portal
-- =====================================================================
-- Additive only: new tables, functions and policies. Existing tables,
-- records and policies are unchanged, except that the activity log's
-- allowed values are extended (nothing is removed from them).
--
--   lava_content            company information sections (admin-edited)
--   lava_positions          hiring opportunities
--   lava_agreements         one applicant agreement per member
--   lava_courses / lava_lessons / lava_lesson_progress
--                           preparation courses, lessons, completion
--   lava_assessments / lava_questions / lava_attempts
--                           quizzes and simulator activities, graded
--                           on the server (answers never reach members)
--   lava_simulator_requests simulator access, approved by admins
--
-- Members only ever read published content, their OWN agreement, progress,
-- attempts and request. Agreements, attempts and access requests are
-- written only through the functions below (never directly), and only
-- administrators can approve or reject simulator access.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Company information
-- ---------------------------------------------------------------------
create table if not exists public.lava_content (
  key text primary key check (key ~ '^[a-z_]{2,40}$'),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null default '' check (char_length(body) <= 20000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order integer not null default 0,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.lava_content is 'LAVA portal company information. Members see published sections only.';

-- ---------------------------------------------------------------------
-- 2. Hiring opportunities
-- ---------------------------------------------------------------------
create table if not exists public.lava_positions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  niche text check (niche is null or char_length(niche) <= 80),
  description text not null default '' check (char_length(description) <= 5000),
  responsibilities text[] not null default '{}' check (cardinality(responsibilities) <= 30),
  required_skills text[] not null default '{}' check (cardinality(required_skills) <= 30),
  qualifications text[] not null default '{}' check (cardinality(qualifications) <= 30),
  compensation text check (compensation is null or char_length(compensation) <= 200), -- null = not announced
  work_arrangement text not null default 'Onsite for the first 45 days (training), then work from home.'
    check (char_length(work_arrangement) <= 500),
  -- draft (admins only) → open (hiring) → closed (shown, not hiring) → archived (hidden)
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'archived')),
  sort_order integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lava_positions_status_idx on public.lava_positions (status, sort_order);

-- ---------------------------------------------------------------------
-- 3. Applicant agreements (one row per member)
-- ---------------------------------------------------------------------
create table if not exists public.lava_agreements (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  onsite_training boolean not null,   -- Q1: onsite for the first 45 days
  wfh_transition boolean not null,    -- Q2: then work from home
  preparation boolean not null,       -- Q3: courses, assessments, training
  agreed boolean generated always as (onsite_training and wfh_transition and preparation) stored,
  answered_at timestamptz not null default now(),
  agreed_at timestamptz,              -- first time all three were "yes"
  created_at timestamptz not null default now()
);
comment on table public.lava_agreements is
  'Applicant confirmation of the LAVA preparation and working conditions. Not an offer, acceptance or hiring decision.';

-- ---------------------------------------------------------------------
-- 4. Preparation courses
-- ---------------------------------------------------------------------
create table if not exists public.lava_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  summary text not null default '' check (char_length(summary) <= 1000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lava_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.lava_courses (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  body text not null default '' check (char_length(body) <= 40000),
  minutes integer not null default 5 check (minutes between 1 and 240),
  -- optional video/PDF from the existing Training Library (no second storage system)
  resource_id uuid references public.training_resources (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lava_lessons_course_idx on public.lava_lessons (course_id, sort_order);
create index if not exists lava_lessons_resource_idx on public.lava_lessons (resource_id) where resource_id is not null;

create table if not exists public.lava_lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lava_lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index if not exists lava_lesson_progress_lesson_idx on public.lava_lesson_progress (lesson_id);

-- ---------------------------------------------------------------------
-- 5. Assessments and simulator activities
-- ---------------------------------------------------------------------
create table if not exists public.lava_assessments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  course_id uuid references public.lava_courses (id) on delete set null,
  kind text not null default 'quiz' check (kind in ('quiz', 'simulator')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  pass_percent integer not null default 70 check (pass_percent between 1 and 100),
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lava_assessments_course_idx on public.lava_assessments (course_id);

create table if not exists public.lava_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.lava_assessments (id) on delete cascade,
  prompt text not null check (char_length(btrim(prompt)) between 1 and 1000),
  scenario text check (scenario is null or char_length(scenario) <= 3000),
  -- simulator "screen": { kind: email|record|form|note, title, fields: [[label, value]], body }
  context jsonb check (context is null or (jsonb_typeof(context) = 'object' and pg_column_size(context) <= 8192)),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  answer integer not null check (answer >= 0),
  explanation text not null default '' check (char_length(explanation) <= 2000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (answer < jsonb_array_length(options))
);
create index if not exists lava_questions_assessment_idx on public.lava_questions (assessment_id, sort_order);

create table if not exists public.lava_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  assessment_id uuid not null references public.lava_assessments (id) on delete cascade,
  score integer not null,
  total integer not null,
  percent integer not null,
  passed boolean not null,
  answers jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists lava_attempts_user_idx on public.lava_attempts (user_id, assessment_id, created_at desc);
create index if not exists lava_attempts_assessment_idx on public.lava_attempts (assessment_id);

-- ---------------------------------------------------------------------
-- 6. Simulator access requests (one per member)
-- ---------------------------------------------------------------------
create table if not exists public.lava_simulator_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 1000),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists lava_simulator_requests_status_idx on public.lava_simulator_requests (status, requested_at);
create index if not exists lava_simulator_requests_decided_by_idx on public.lava_simulator_requests (decided_by) where decided_by is not null;
create index if not exists lava_content_updated_by_idx on public.lava_content (updated_by) where updated_by is not null;
create index if not exists lava_positions_created_by_idx on public.lava_positions (created_by) where created_by is not null;

-- updated_at bookkeeping (existing helper)
do $$
declare t text;
begin
  foreach t in array array['lava_content', 'lava_positions', 'lava_courses', 'lava_lessons', 'lava_assessments', 'lava_questions', 'lava_simulator_requests'] loop
    execute format('drop trigger if exists %1$s_set_updated_at on public.%1$s', t);
    execute format('create trigger %1$s_set_updated_at before update on public.%1$s for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 7. Helpers (SECURITY DEFINER, fixed search_path; read the caller only)
-- ---------------------------------------------------------------------
create or replace function public.lava_has_agreed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user()
    and exists (select 1 from public.lava_agreements where user_id = auth.uid() and agreed);
$$;

create or replace function public.lava_has_simulator_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
    or (public.lava_has_agreed()
        and exists (select 1 from public.lava_simulator_requests where user_id = auth.uid() and status = 'approved'));
$$;

revoke all on function public.lava_has_agreed() from public, anon;
revoke all on function public.lava_has_simulator_access() from public, anon;
grant execute on function public.lava_has_agreed() to authenticated;
grant execute on function public.lava_has_simulator_access() to authenticated;

-- ---------------------------------------------------------------------
-- 8. Row Level Security
-- ---------------------------------------------------------------------
alter table public.lava_content            enable row level security;
alter table public.lava_positions          enable row level security;
alter table public.lava_agreements         enable row level security;
alter table public.lava_courses            enable row level security;
alter table public.lava_lessons            enable row level security;
alter table public.lava_lesson_progress    enable row level security;
alter table public.lava_assessments        enable row level security;
alter table public.lava_questions          enable row level security;
alter table public.lava_attempts           enable row level security;
alter table public.lava_simulator_requests enable row level security;

revoke all on public.lava_content, public.lava_positions, public.lava_agreements, public.lava_courses,
  public.lava_lessons, public.lava_lesson_progress, public.lava_assessments, public.lava_questions,
  public.lava_attempts, public.lava_simulator_requests from anon;
-- Written only through the functions below (timestamps and grading are server-side).
revoke insert, update, delete, truncate on public.lava_agreements, public.lava_attempts, public.lava_simulator_requests from authenticated;
revoke update, truncate on public.lava_lesson_progress from authenticated;

-- Admin-managed content: members read what is published; admins manage everything.
drop policy if exists "lava_content: read published" on public.lava_content;
create policy "lava_content: read published" on public.lava_content for select to authenticated
  using ((status = 'published' and (select public.is_active_user())) or (select public.is_admin()));
drop policy if exists "lava_content: admins manage" on public.lava_content;
create policy "lava_content: admins manage" on public.lava_content for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "lava_positions: read open and closed" on public.lava_positions;
create policy "lava_positions: read open and closed" on public.lava_positions for select to authenticated
  using ((status in ('open', 'closed') and (select public.is_active_user())) or (select public.is_admin()));
drop policy if exists "lava_positions: admins manage" on public.lava_positions;
create policy "lava_positions: admins manage" on public.lava_positions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "lava_courses: read published" on public.lava_courses;
create policy "lava_courses: read published" on public.lava_courses for select to authenticated
  using ((status = 'published' and (select public.is_active_user())) or (select public.is_admin()));
drop policy if exists "lava_courses: admins manage" on public.lava_courses;
create policy "lava_courses: admins manage" on public.lava_courses for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Lessons unlock only after the member has agreed to all three conditions.
drop policy if exists "lava_lessons: read after agreement" on public.lava_lessons;
create policy "lava_lessons: read after agreement" on public.lava_lessons for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.lava_has_agreed())
        and exists (select 1 from public.lava_courses c where c.id = course_id and c.status = 'published'))
  );
drop policy if exists "lava_lessons: admins manage" on public.lava_lessons;
create policy "lava_lessons: admins manage" on public.lava_lessons for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "lava_lesson_progress: read own" on public.lava_lesson_progress;
create policy "lava_lesson_progress: read own" on public.lava_lesson_progress for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "lava_lesson_progress: add own" on public.lava_lesson_progress;
create policy "lava_lesson_progress: add own" on public.lava_lesson_progress for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.lava_has_agreed())
    and exists (
      select 1 from public.lava_lessons l join public.lava_courses c on c.id = l.course_id
      where l.id = lesson_id and c.status = 'published'
    )
  );
drop policy if exists "lava_lesson_progress: remove own" on public.lava_lesson_progress;
create policy "lava_lesson_progress: remove own" on public.lava_lesson_progress for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));

-- Assessment titles are listed for active members; questions (with answers) are admin-only.
drop policy if exists "lava_assessments: read published" on public.lava_assessments;
create policy "lava_assessments: read published" on public.lava_assessments for select to authenticated
  using ((status = 'published' and (select public.is_active_user())) or (select public.is_admin()));
drop policy if exists "lava_assessments: admins manage" on public.lava_assessments;
create policy "lava_assessments: admins manage" on public.lava_assessments for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "lava_questions: admins only" on public.lava_questions;
create policy "lava_questions: admins only" on public.lava_questions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Personal records: own row (members), every row (admins). No direct writes.
drop policy if exists "lava_agreements: read own" on public.lava_agreements;
create policy "lava_agreements: read own" on public.lava_agreements for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "lava_attempts: read own" on public.lava_attempts;
create policy "lava_attempts: read own" on public.lava_attempts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "lava_simulator_requests: read own" on public.lava_simulator_requests;
create policy "lava_simulator_requests: read own" on public.lava_simulator_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------
-- 9. Activity log: LAVA admin actions (values only added)
-- ---------------------------------------------------------------------
alter table public.activity_logs drop constraint if exists activity_logs_target_type_check;
alter table public.activity_logs add constraint activity_logs_target_type_check check (target_type is null or target_type in (
  'member', 'resource', 'category', 'announcement', 'lava_content', 'lava_position', 'simulator_request'
));
alter table public.activity_logs drop constraint if exists activity_logs_activity_type_check;
alter table public.activity_logs add constraint activity_logs_activity_type_check check (activity_type in (
  'signed_in', 'viewed', 'watched', 'downloaded', 'completed', 'favorited',
  'member_created', 'member_updated', 'member_role_changed', 'member_activated', 'member_deactivated',
  'member_invite_sent', 'member_password_reset_sent',
  'resource_uploaded', 'resource_updated', 'resource_file_replaced', 'resource_published', 'resource_unpublished', 'resource_deleted',
  'category_created', 'category_updated', 'category_deleted',
  'announcement_created', 'announcement_updated', 'announcement_published', 'announcement_unpublished', 'announcement_archived', 'announcement_deleted',
  'lava_content_updated', 'lava_position_created', 'lava_position_status_changed', 'lava_position_deleted',
  'simulator_access_approved', 'simulator_access_rejected'
));

create or replace function public.audit_lava_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then return new; end if; -- migrations / SQL editor
  if new.body is distinct from old.body or new.title is distinct from old.title or new.status is distinct from old.status then
    perform public.log_admin_action('lava_content_updated', 'lava_content', null, new.title,
      case when new.status is distinct from old.status then jsonb_build_object('from', old.status, 'to', new.status) end);
  end if;
  return new;
end;
$$;
drop trigger if exists lava_content_audit on public.lava_content;
create trigger lava_content_audit after update on public.lava_content
  for each row execute function public.audit_lava_content();

create or replace function public.audit_lava_positions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  if tg_op = 'INSERT' then
    perform public.log_admin_action('lava_position_created', 'lava_position', new.id, new.title, jsonb_build_object('status', new.status));
  elsif tg_op = 'DELETE' then
    perform public.log_admin_action('lava_position_deleted', 'lava_position', old.id, old.title);
    return old;
  elsif new.status is distinct from old.status then
    perform public.log_admin_action('lava_position_status_changed', 'lava_position', new.id, new.title, jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;
drop trigger if exists lava_positions_audit on public.lava_positions;
create trigger lava_positions_audit after insert or update or delete on public.lava_positions
  for each row execute function public.audit_lava_positions();

revoke all on function public.audit_lava_content() from public, anon, authenticated;
revoke all on function public.audit_lava_positions() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 10. Member functions
-- ---------------------------------------------------------------------

-- Saves the caller's answers to the three agreement questions.
create or replace function public.lava_submit_agreement(p_onsite_training boolean, p_wfh_transition boolean, p_preparation boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec public.lava_agreements;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Your account is not active.' using errcode = '42501';
  end if;
  if p_onsite_training is null or p_wfh_transition is null or p_preparation is null then
    raise exception 'Please answer all three questions.';
  end if;

  insert into public.lava_agreements as a (user_id, onsite_training, wfh_transition, preparation, answered_at, agreed_at)
  values (auth.uid(), p_onsite_training, p_wfh_transition, p_preparation, now(),
          case when p_onsite_training and p_wfh_transition and p_preparation then now() end)
  on conflict (user_id) do update
    set onsite_training = excluded.onsite_training,
        wfh_transition = excluded.wfh_transition,
        preparation = excluded.preparation,
        answered_at = now(),
        agreed_at = case
          when excluded.onsite_training and excluded.wfh_transition and excluded.preparation then coalesce(a.agreed_at, now())
          else a.agreed_at end
  returning * into rec;
  return to_jsonb(rec);
end;
$$;

-- Questions for one assessment, WITHOUT the correct answers.
create or replace function public.lava_get_assessment(p_assessment uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  a public.lava_assessments;
begin
  select * into a from public.lava_assessments where id = p_assessment;
  if not found or (a.status <> 'published' and not public.is_admin()) then
    raise exception 'Assessment not found.';
  end if;
  if not (public.is_admin() or public.lava_has_agreed()) then
    raise exception 'Complete the applicant agreement first.' using errcode = '42501';
  end if;
  if a.kind = 'simulator' and not public.lava_has_simulator_access() then
    raise exception 'Simulator access has not been approved for your account.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'assessment', jsonb_build_object('id', a.id, 'slug', a.slug, 'kind', a.kind, 'title', a.title,
                                     'description', a.description, 'pass_percent', a.pass_percent, 'course_id', a.course_id),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'prompt', q.prompt, 'scenario', q.scenario,
                                          'context', q.context, 'options', q.options) order by q.sort_order, q.created_at)
      from public.lava_questions q where q.assessment_id = a.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Grades an attempt on the server and records it. p_answers = { "<question id>": <option index>, … }
create or replace function public.lava_submit_attempt(p_assessment uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.lava_assessments;
  q record;
  chosen integer;
  correct_count integer := 0;
  total integer := 0;
  pct integer;
  results jsonb := '[]'::jsonb;
  attempt_id uuid;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Your account is not active.' using errcode = '42501';
  end if;
  select * into a from public.lava_assessments where id = p_assessment;
  if not found or (a.status <> 'published' and not public.is_admin()) then
    raise exception 'Assessment not found.';
  end if;
  if not (public.is_admin() or public.lava_has_agreed()) then
    raise exception 'Complete the applicant agreement first.' using errcode = '42501';
  end if;
  if a.kind = 'simulator' and not public.lava_has_simulator_access() then
    raise exception 'Simulator access has not been approved for your account.' using errcode = '42501';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or pg_column_size(p_answers) > 16384 then
    raise exception 'Invalid answers.';
  end if;

  for q in select id, answer, explanation from public.lava_questions where assessment_id = a.id order by sort_order, created_at loop
    total := total + 1;
    chosen := case when jsonb_typeof(p_answers -> q.id::text) = 'number' then (p_answers ->> q.id::text)::integer end;
    if chosen is not distinct from q.answer then correct_count := correct_count + 1; end if;
    results := results || jsonb_build_object('question_id', q.id, 'chosen', chosen,
                                             'correct', chosen is not distinct from q.answer, 'explanation', q.explanation);
  end loop;
  if total = 0 then
    raise exception 'This assessment has no questions yet.';
  end if;

  pct := round(correct_count * 100.0 / total);
  insert into public.lava_attempts (user_id, assessment_id, score, total, percent, passed, answers)
  values (auth.uid(), a.id, correct_count, total, pct, pct >= a.pass_percent,
          (select coalesce(jsonb_object_agg(r ->> 'question_id', r -> 'chosen'), '{}'::jsonb) from jsonb_array_elements(results) r))
  returning id into attempt_id;

  -- Correctness and explanations are returned; the right option is not.
  return jsonb_build_object('attempt_id', attempt_id, 'score', correct_count, 'total', total, 'percent', pct,
                            'passed', pct >= a.pass_percent, 'pass_percent', a.pass_percent, 'results', results);
end;
$$;

-- Creates (or re-opens after a rejection) the caller's simulator access request.
create or replace function public.lava_request_simulator_access()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec public.lava_simulator_requests;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Your account is not active.' using errcode = '42501';
  end if;
  if not public.lava_has_agreed() then
    raise exception 'Complete the applicant agreement first.' using errcode = '42501';
  end if;

  select * into rec from public.lava_simulator_requests where user_id = auth.uid();
  if found and rec.status in ('pending', 'approved') then
    return to_jsonb(rec); -- nothing to do
  end if;

  insert into public.lava_simulator_requests as r (user_id, status, requested_at)
  values (auth.uid(), 'pending', now())
  on conflict (user_id) do update
    set status = 'pending', requested_at = now(), decided_at = null, decided_by = null, admin_note = null
  returning * into rec;
  return to_jsonb(rec);
end;
$$;

-- ---------------------------------------------------------------------
-- 11. Admin function: approve / reject simulator access
-- ---------------------------------------------------------------------
create or replace function public.lava_decide_simulator_request(p_request uuid, p_status text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec public.lava_simulator_requests;
  member public.profiles;
  note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Only administrators can approve or reject simulator access.' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('approved', 'rejected') then
    raise exception 'Invalid status.';
  end if;
  if note is not null and char_length(note) > 1000 then
    raise exception 'The note must be 1000 characters or fewer.';
  end if;
  select * into rec from public.lava_simulator_requests where id = p_request;
  if not found then
    raise exception 'Request not found.';
  end if;
  if rec.user_id = auth.uid() then
    raise exception 'You cannot decide your own request.';
  end if;

  update public.lava_simulator_requests
    set status = p_status, admin_note = note, decided_at = now(), decided_by = auth.uid()
    where id = p_request
    returning * into rec;

  select * into member from public.profiles where id = rec.user_id;
  perform public.log_admin_action(
    case when p_status = 'approved' then 'simulator_access_approved' else 'simulator_access_rejected' end,
    'simulator_request', rec.id,
    left(btrim(concat_ws(' ', nullif(member.first_name, ''), nullif(member.last_name, ''))) || ' <' || member.email || '>', 200)
  );
  return to_jsonb(rec);
end;
$$;

revoke all on function public.lava_submit_agreement(boolean, boolean, boolean) from public, anon;
revoke all on function public.lava_get_assessment(uuid) from public, anon;
revoke all on function public.lava_submit_attempt(uuid, jsonb) from public, anon;
revoke all on function public.lava_request_simulator_access() from public, anon;
revoke all on function public.lava_decide_simulator_request(uuid, text, text) from public, anon;
grant execute on function public.lava_submit_agreement(boolean, boolean, boolean) to authenticated;
grant execute on function public.lava_get_assessment(uuid) to authenticated;
grant execute on function public.lava_submit_attempt(uuid, jsonb) to authenticated;
grant execute on function public.lava_request_simulator_access() to authenticated;
grant execute on function public.lava_decide_simulator_request(uuid, text, text) to authenticated;
