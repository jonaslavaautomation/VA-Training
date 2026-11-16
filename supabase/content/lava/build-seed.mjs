// Builds supabase/migrations/20261122100100_lava_seed_content.sql from the
// content files in this folder (course-*.json + portal.mjs).
// Run: npm run build:lava-seed
//
// The seed only inserts what is missing (by key / slug), so running it again
// — or running it after an admin has edited the content — changes nothing.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { content, simulators } from './portal.mjs'

const DIR = new URL('.', import.meta.url).pathname
const OUT = new URL('../../migrations/20261122100100_lava_seed_content.sql', import.meta.url).pathname
const TAG = '$seed$'

const lit = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const json = (v) => (v === null || v === undefined ? 'null' : `${lit(JSON.stringify(v))}::jsonb`)

function checkQuestion(q, where) {
  if (!q.prompt || !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) throw new Error(`${where}: bad options`)
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) throw new Error(`${where}: bad answer index`)
}

// Deterministic option shuffle so the right answer's position doesn't follow a
// pattern (same output on every build). Options like "All of the above" stay put.
function shuffled(q, salt) {
  if (q.options.some((o) => /of the above|all of these|none of these/i.test(o))) return q
  let h = 2166136261
  for (const ch of salt + q.prompt) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  const order = q.options.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [order[i], order[j]] = [order[j], order[i]] }
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) }
}

function questionsSql(qs, where, shuffle = false) {
  return qs.map((q0, i) => {
    const q = shuffle ? shuffled(q0, where) : q0
    checkQuestion(q, `${where} #${i + 1}`)
    return `(a, ${lit(q.prompt)}, ${lit(q.scenario ?? null)}, ${json(q.context ?? null)}, ${json(q.options)}, ${q.answer}, ${lit(q.explanation ?? '')}, ${i + 1})`
  }).join(',\n      ')
}

const courses = readdirSync(DIR).filter((f) => /^course-\d+-.*\.json$/.test(f)).sort((a, b) => parseInt(a.slice(7)) - parseInt(b.slice(7)))
  .map((f) => JSON.parse(readFileSync(`${DIR}${f}`, 'utf8')))
if (courses.length !== 6) throw new Error(`expected 6 course files, found ${courses.length}`)

let sql = `-- =====================================================================
-- VA Training Academy — Phase 7A
-- 012 · LAVA portal starter content (generated — do not edit by hand)
-- =====================================================================
-- Source: supabase/content/lava/ (npm run build:lava-seed).
-- * Company sections are DRAFTS for administrator review (hidden from
--   members until published). Only the 45-day working arrangement and the
--   agreement introduction are published.
-- * ${courses.length} preparation courses with lessons and a quiz each, plus
--   ${simulators.length} simulator activities (fictional practice data).
-- * No job positions or salaries are created.
-- Inserts only what is missing: safe to run again; never overwrites edits.

`

sql += `insert into public.lava_content (key, title, body, status, sort_order) values\n  ${content
  .map((c) => `(${lit(c.key)}, ${lit(c.title)}, ${lit(c.body)}, ${lit(c.status)}, ${c.sort_order})`)
  .join(',\n  ')}\non conflict (key) do nothing;\n\n`

for (const c of courses) {
  if (!c.slug || !c.lessons?.length || !c.quiz?.questions?.length) throw new Error(`course ${c.slug}: incomplete`)
  sql += `do ${TAG}
declare c uuid; a uuid;
begin
  if not exists (select 1 from public.lava_courses where slug = ${lit(c.slug)}) then
    insert into public.lava_courses (slug, title, summary, status, sort_order)
      values (${lit(c.slug)}, ${lit(c.title)}, ${lit(c.summary)}, 'published', ${c.sort_order}) returning id into c;
    insert into public.lava_lessons (course_id, title, body, minutes, sort_order) values
      ${c.lessons.map((l, i) => `(c, ${lit(l.title)}, ${lit(l.body)}, ${Math.max(1, Math.min(240, Math.round(l.minutes || 5)))}, ${i + 1})`).join(',\n      ')};
  else
    select id into c from public.lava_courses where slug = ${lit(c.slug)};
  end if;
  if not exists (select 1 from public.lava_assessments where slug = ${lit(`${c.slug}-quiz`)}) then
    insert into public.lava_assessments (slug, course_id, kind, title, description, pass_percent, status, sort_order)
      values (${lit(`${c.slug}-quiz`)}, c, 'quiz', ${lit(c.quiz.title)}, ${lit(c.quiz.description ?? '')}, ${c.quiz.pass_percent ?? 70}, 'published', ${c.sort_order}) returning id into a;
    insert into public.lava_questions (assessment_id, prompt, scenario, context, options, answer, explanation, sort_order) values
      ${questionsSql(c.quiz.questions, c.slug, true)};
  end if;
end ${TAG};

`
}

for (const s of simulators) {
  sql += `do ${TAG}
declare a uuid;
begin
  if not exists (select 1 from public.lava_assessments where slug = ${lit(s.slug)}) then
    insert into public.lava_assessments (slug, kind, title, description, pass_percent, status, sort_order)
      values (${lit(s.slug)}, 'simulator', ${lit(s.title)}, ${lit(s.description)}, ${s.pass_percent}, 'published', ${s.sort_order}) returning id into a;
    insert into public.lava_questions (assessment_id, prompt, scenario, context, options, answer, explanation, sort_order) values
      ${questionsSql(s.questions, s.slug)};
  end if;
end ${TAG};

`
}

if (sql.split(TAG).length - 1 !== (courses.length + simulators.length) * 2) throw new Error(`content contains ${TAG}`)
writeFileSync(OUT, sql)
console.log('note: re-create supabase/setup/2_lava_portal.sql if you change the seed (see supabase/README.md)')
console.log(`wrote ${OUT.split('/').slice(-1)[0]}: ${courses.length} courses, ${courses.reduce((n, c) => n + c.lessons.length, 0)} lessons, ${courses.length + simulators.length} assessments`)
