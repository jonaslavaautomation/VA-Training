// LAVA applicant portal security test (part of `npm run test:db`).
// Same in-memory Postgres setup as rls.test.mjs; exercises the Phase 7A
// tables, policies and functions as anon / members / admins.
import { supabaseLikeDb } from './pglite-supabase.mjs'

const db = await supabaseLikeDb(process.argv[2])

// ---- helpers --------------------------------------------------------------
let passed = 0
let failed = 0
const ok = (name) => { passed++; console.log('  ✓', name) }
const bad = (name, detail) => { failed++; console.log('  ✗', name, '→', detail) }

async function as(role, uid, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`)
  if (role !== 'postgres') await db.exec(`set role ${role}`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`) }
}
const q = async (sql, params) => (await db.query(sql, params)).rows

async function expectRows(name, sql, n, params) {
  try {
    const rows = await q(sql, params)
    rows.length === n ? ok(name) : bad(name, `expected ${n} rows, got ${rows.length}`)
  } catch (e) { bad(name, e.message) }
}
async function expectError(name, sql, pattern, params) {
  try {
    await q(sql, params)
    bad(name, 'expected an error but statement succeeded')
  } catch (e) {
    pattern.test(e.message) ? ok(`${name} (${e.message.slice(0, 70)})`) : bad(name, `unexpected error: ${e.message}`)
  }
}

// ---- fixtures ---------------------------------------------------------------
const user = async (email, first) => (await q(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, JSON.stringify({ first_name: first, last_name: 'Test' })]))[0].id
const A = await user('owner@example.com', 'Olive')
const A2 = await user('second-admin@example.com', 'Sam')
const M1 = await user('m1@example.com', 'Mia')
const M2 = await user('m2@example.com', 'Max')
const M3 = await user('m3@example.com', 'Ivy') // becomes inactive
await q(`update public.profiles set role = 'admin' where id in ($1, $2)`, [A, A2])
const member = (uid, fn) => as('authenticated', uid, fn)
const scalar = async (sql, params) => Object.values((await q(sql, params))[0] ?? {})[0]

console.log('\nstarter content (seed migration)')
await as('postgres', null, async () => {
  const courses = await scalar(`select count(*)::int from public.lava_courses where status = 'published'`)
  const lessons = await scalar(`select count(*)::int from public.lava_lessons`)
  const quizzes = await scalar(`select count(*)::int from public.lava_assessments where kind = 'quiz'`)
  const sims = await scalar(`select count(*)::int from public.lava_assessments where kind = 'simulator'`)
  const positions = await scalar(`select count(*)::int from public.lava_positions`)
  const drafts = (await q(`select key from public.lava_content where status = 'draft' order by key`)).map((r) => r.key).join()
  courses === 6 && lessons >= 36 ? ok(`6 preparation courses with ${lessons} lessons`) : bad('courses', `${courses}/${lessons}`)
  quizzes === 6 && sims === 3 ? ok('a quiz per course + 3 simulator activities') : bad('assessments', `${quizzes}/${sims}`)
  const order = (await q(`select slug from public.lava_courses order by sort_order`)).map((r) => r.slug).join()
  order === 'foundation-virtual-assistant,communication-skills,insurance-101,insurance-navigation-tools,acord-forms,insurance-terminology' ? ok('courses are in the required order') : bad('order', order)
  positions === 0 ? ok('no job positions or salaries are invented') : bad('positions', positions)
  drafts === 'clients,history,mission_vision,niches,overview,services' ? ok('company sections are drafts for admin review') : bad('drafts', drafts)
  const arr = await scalar(`select body from public.lava_content where key = 'work_arrangement' and status = 'published'`)
  arr?.includes('first 45 days') && arr.includes('work-from-home') ? ok('45-day onsite arrangement is published') : bad('arrangement', arr)
})

console.log('\nanonymous visitors')
for (const t of ['lava_content', 'lava_positions', 'lava_agreements', 'lava_courses', 'lava_lessons', 'lava_questions', 'lava_attempts', 'lava_simulator_requests']) {
  await as('anon', null, () => expectError(`anon cannot read ${t}`, `select * from public.${t}`, /permission denied/))
}
await as('anon', null, () => expectError('anon cannot submit an agreement', `select public.lava_submit_agreement(true, true, true)`, /permission denied/))

console.log('\ncompany content')
await member(M1, async () => {
  const keys = (await q(`select key from public.lava_content order by sort_order`)).map((r) => r.key).join()
  keys === 'work_arrangement,agreement_intro' ? ok('members see published sections only (drafts hidden)') : bad('member content', keys)
  await expectRows('members cannot edit content', `update public.lava_content set body = 'hacked' where key = 'work_arrangement' returning key`, 0)
  await expectError('members cannot add content', `insert into public.lava_content (key, title) values ('evil', 'x')`, /row-level security/)
})
await member(A, async () => {
  await expectRows('admins see every section', `select key from public.lava_content`, 8)
  await q(`update public.lava_content set body = 'LAVA Automation is a verified test company.', status = 'published' where key = 'overview'`)
  ok('admin edits and publishes a section')
})
await member(M1, () => expectRows('the published section is now visible to members', `select key from public.lava_content where key = 'overview'`, 1))
await as('postgres', null, async () => {
  const n = await scalar(`select count(*)::int from public.activity_logs where activity_type = 'lava_content_updated' and user_id = $1`, [A])
  n === 1 ? ok('content edit is in the audit log') : bad('content audit', n)
})

console.log('\nhiring opportunities')
let P
await member(A, async () => {
  P = await scalar(`insert into public.lava_positions (title, niche, compensation, responsibilities) values ('Insurance VA', 'Insurance', 'PHP 20,000 – 25,000 / month', '{"Process COIs"}') returning id`)
  P ? ok('admin adds a position (draft by default)') : bad('add position', P)
})
await member(M1, () => expectRows('members do not see draft positions', `select id from public.lava_positions`, 0))
await member(A, () => q(`update public.lava_positions set status = 'open' where id = $1`, [P]))
await member(M1, async () => {
  const [p] = await q(`select title, compensation, work_arrangement, status from public.lava_positions`)
  p?.status === 'open' && p.compensation.startsWith('PHP') && /45 days/.test(p.work_arrangement) ? ok('open position visible with admin-entered salary and 45-day arrangement') : bad('open position', JSON.stringify(p))
  await expectRows('members cannot edit positions', `update public.lava_positions set compensation = 'a lot' returning id`, 0)
  await expectError('members cannot add positions', `insert into public.lava_positions (title) values ('Fake job')`, /row-level security/)
})
await member(A, () => q(`update public.lava_positions set status = 'closed' where id = $1`, [P]))
await member(M1, () => expectRows('closed positions stay visible (marked not hiring)', `select id from public.lava_positions where status = 'closed'`, 1))
await member(A, () => q(`update public.lava_positions set status = 'archived' where id = $1`, [P]))
await member(M1, () => expectRows('archived positions are hidden', `select id from public.lava_positions`, 0))
await as('postgres', null, async () => {
  const types = (await q(`select activity_type, details from public.activity_logs where target_type = 'lava_position' order by created_at`)).map((r) => r.activity_type + (r.details?.to ? `:${r.details.to}` : '')).join()
  types === 'lava_position_created,lava_position_status_changed:open,lava_position_status_changed:closed,lava_position_status_changed:archived' ? ok('position changes are audited') : bad('position audit', types)
})

console.log('\napplicant agreement')
const L = await scalar(`select id from public.lava_lessons order by sort_order limit 1`)
const QUIZ = await scalar(`select id from public.lava_assessments where slug = 'foundation-virtual-assistant-quiz'`)
const SIM = await scalar(`select id from public.lava_assessments where kind = 'simulator' order by sort_order limit 1`)
await member(M1, async () => {
  await expectRows('lessons are locked before the agreement', `select id from public.lava_lessons`, 0)
  await expectError('members cannot write the agreement table directly', `insert into public.lava_agreements (user_id, onsite_training, wfh_transition, preparation) values ($1, true, true, true)`, /permission denied/, [M1])
  await expectError('all three questions must be answered', `select public.lava_submit_agreement(true, null, true)`, /answer all three/)
  const [r] = await q(`select public.lava_submit_agreement(true, false, true) as r`)
  r.r.agreed === false && !r.r.agreed_at ? ok('answering "No" to any question is saved but does not agree') : bad('no answer', JSON.stringify(r.r))
  await expectRows('…and lessons stay locked', `select id from public.lava_lessons`, 0)
  await expectError('…and progress cannot be recorded', `insert into public.lava_lesson_progress (user_id, lesson_id) values ($1, $2)`, /row-level security/, [M1, L])
  await expectError('…and assessments cannot be opened', `select public.lava_get_assessment($1)`, /agreement first/, [QUIZ])
  const [y] = await q(`select public.lava_submit_agreement(true, true, true) as r`)
  y.r.agreed === true && y.r.agreed_at && y.r.answered_at ? ok('agreeing to all three saves the answers with a timestamp') : bad('agree', JSON.stringify(y.r))
  const n = await scalar(`select count(*)::int from public.lava_lessons`)
  n >= 36 ? ok('lessons unlock after agreeing') : bad('unlock', n)
  await expectError('members cannot change their agreement directly', `update public.lava_agreements set preparation = false where user_id = $1`, /permission denied/, [M1])
})
await member(M2, async () => {
  await q(`select public.lava_submit_agreement(false, false, false)`)
  await expectRows('members cannot read another member’s agreement', `select * from public.lava_agreements where user_id = $1`, 0, [M1])
  await expectRows('members see only their own agreement', `select * from public.lava_agreements`, 1)
})
await member(A, async () => {
  await expectRows('admins see all agreements', `select * from public.lava_agreements`, 2)
  await expectError('admins cannot edit a member’s answers directly', `update public.lava_agreements set onsite_training = true where user_id = $1`, /permission denied/, [M2])
})
await as('postgres', null, async () => {
  const hired = await scalar(`select count(*)::int from public.profiles where id = $1 and role = 'member' and status = 'active'`, [M1])
  hired === 1 ? ok('agreeing does not change the member’s role or status (not hired/accepted)') : bad('role change', hired)
})

console.log('\npreparation progress')
await member(M1, async () => {
  await q(`insert into public.lava_lesson_progress (user_id, lesson_id) values ($1, $2)`, [M1, L])
  ok('member records lesson completion')
  await expectError('members cannot record progress for someone else', `insert into public.lava_lesson_progress (user_id, lesson_id) values ($1, $2)`, /row-level security/, [M2, L])
})
await member(M2, () => expectRows('members cannot see others’ progress', `select * from public.lava_lesson_progress`, 0))

console.log('\nassessments (graded on the server)')
await member(M1, async () => {
  await expectRows('members cannot read questions or answers directly', `select * from public.lava_questions`, 0)
  const [g] = await q(`select public.lava_get_assessment($1) as r`, [QUIZ])
  const qs = g.r.questions
  qs.length === 10 && qs.every((x) => !('answer' in x) && x.options.length === 4) ? ok('questions are delivered without correct answers') : bad('questions', JSON.stringify(qs[0]))
  await as('postgres', null, async () => {}) // keep role switching explicit below
})
{
  const key = await as('postgres', null, () => q(`select id, answer from public.lava_questions where assessment_id = $1 order by sort_order`, [QUIZ]))
  const right = Object.fromEntries(key.map((k) => [k.id, k.answer]))
  const half = Object.fromEntries(key.map((k, i) => [k.id, i < 5 ? k.answer : (k.answer + 1) % 4]))
  await member(M1, async () => {
    const [f] = await q(`select public.lava_submit_attempt($1, $2) as r`, [QUIZ, JSON.stringify(half)])
    f.r.score === 5 && f.r.percent === 50 && f.r.passed === false ? ok('a 5/10 attempt scores 50% and does not pass (70% needed)') : bad('half', JSON.stringify(f.r).slice(0, 200))
    f.r.results.every((x) => !('answer' in x)) ? ok('results show right/wrong and explanations, not the answer key') : bad('results leak', JSON.stringify(f.r.results[0]))
    const [p] = await q(`select public.lava_submit_attempt($1, $2) as r`, [QUIZ, JSON.stringify(right)])
    p.r.score === 10 && p.r.passed ? ok('a perfect attempt passes') : bad('pass', JSON.stringify(p.r).slice(0, 200))
    await expectRows('member sees own attempts', `select * from public.lava_attempts`, 2)
    await expectError('members cannot insert a fake score', `insert into public.lava_attempts (user_id, assessment_id, score, total, percent, passed) values ($1, $2, 10, 10, 100, true)`, /permission denied/, [M1, QUIZ])
  })
  await member(M2, () => expectRows('members cannot see others’ attempts', `select * from public.lava_attempts`, 0))
}

console.log('\nsimulator access')
await member(M1, async () => {
  await expectError('the simulator is locked without approval', `select public.lava_get_assessment($1)`, /not been approved/, [SIM])
  await expectError('simulator answers cannot be submitted without approval', `select public.lava_submit_attempt($1, '{}')`, /not been approved/, [SIM])
})
await member(M2, () => expectError('members who did not agree cannot request access', `select public.lava_request_simulator_access()`, /agreement first/))
let R
await member(M1, async () => {
  const [r] = await q(`select public.lava_request_simulator_access() as r`)
  R = r.r.id
  r.r.status === 'pending' ? ok('member requests access → Pending') : bad('request', JSON.stringify(r.r))
  const [again] = await q(`select public.lava_request_simulator_access() as r`)
  again.r.id === R ? ok('requesting twice keeps one request') : bad('duplicate', JSON.stringify(again.r))
  await expectError('members cannot approve their own request', `update public.lava_simulator_requests set status = 'approved'`, /permission denied/)
  await expectError('members cannot call the approval function', `select public.lava_decide_simulator_request($1, 'approved')`, /Only administrators/, [R])
  await expectError('members cannot insert an approved request', `insert into public.lava_simulator_requests (user_id, status) values ($1, 'approved')`, /permission denied/, [M1])
})
await member(A, async () => {
  const rows = await q(`select r.status, p.email from public.lava_simulator_requests r join public.profiles p on p.id = r.user_id`)
  rows.length === 1 && rows[0].email === 'm1@example.com' && rows[0].status === 'pending' ? ok('admin sees the pending request with the member’s email') : bad('admin view', JSON.stringify(rows))
  await expectError('invalid decision rejected', `select public.lava_decide_simulator_request($1, 'pending')`, /Invalid status/, [R])
  const [d] = await q(`select public.lava_decide_simulator_request($1, 'approved', 'Welcome aboard') as r`, [R])
  d.r.status === 'approved' && d.r.decided_by === A ? ok('admin approves access') : bad('approve', JSON.stringify(d.r))
})
await member(M1, async () => {
  const [g] = await q(`select public.lava_get_assessment($1) as r`, [SIM])
  g.r.questions.length === 6 && g.r.questions[0].context ? ok('approved member can open the simulator (with its screens)') : bad('sim open', JSON.stringify(g.r).slice(0, 120))
  const [s] = await q(`select public.lava_submit_attempt($1, '{}') as r`, [SIM])
  s.r.total === 6 ? ok('approved member can submit simulator work') : bad('sim submit', JSON.stringify(s.r).slice(0, 120))
})
await member(M2, () => expectError('other (unapproved) members still cannot open the simulator', `select public.lava_get_assessment($1)`, /agreement first|not been approved/, [SIM]))
await member(A, () => q(`select public.lava_decide_simulator_request($1, 'rejected', 'Please finish Insurance 101 first.')`, [R]))
await member(M1, async () => {
  const [r] = await q(`select status, admin_note from public.lava_simulator_requests`)
  r.status === 'rejected' && r.admin_note.includes('Insurance 101') ? ok('rejected member sees the status and the admin note') : bad('rejected view', JSON.stringify(r))
  await expectError('rejected member cannot open the simulator', `select public.lava_get_assessment($1)`, /not been approved/, [SIM])
  const [again] = await q(`select public.lava_request_simulator_access() as r`)
  again.r.status === 'pending' && again.r.admin_note === null ? ok('member can request again after a rejection') : bad('re-request', JSON.stringify(again.r))
})
// An admin's own request (e.g. testing as a member) can't be self-approved.
await as('postgres', null, () => q(`insert into public.lava_simulator_requests (user_id) values ($1)`, [A]))
await member(A, async () => {
  const own = await scalar(`select id from public.lava_simulator_requests where user_id = $1`, [A])
  await expectError('admins cannot decide their own request', `select public.lava_decide_simulator_request($1, 'approved')`, /your own request/, [own])
})
await as('postgres', null, async () => {
  const types = (await q(`select activity_type from public.activity_logs where target_type = 'simulator_request' order by created_at`)).map((r) => r.activity_type).join()
  types === 'simulator_access_approved,simulator_access_rejected' ? ok('approvals and rejections are audited') : bad('sim audit', types)
})

console.log('\nlesson videos & PDFs (Training Library storage, LAVA-only)')
{
  // Admin uploads a LAVA video and attaches it; a normal library PDF exists too.
  await as('postgres', null, () => q(`insert into storage.buckets (id, name) values ('training-videos', 'training-videos'), ('training-pdfs', 'training-pdfs') on conflict do nothing`))
  const V = await member(A, () => scalar(`insert into public.training_resources (title, resource_type, storage_path, status, audience) values ('LAVA welcome video', 'VIDEO', 'lava-v/intro.mp4', 'published', 'lava') returning id`))
  const LIB = await member(A, () => scalar(`insert into public.training_resources (title, resource_type, storage_path, status) values ('Library guide', 'PDF', 'lib/guide.pdf', 'published') returning id`))
  await as('postgres', null, () => q(`insert into storage.objects (bucket_id, name) values ('training-videos', 'lava-v/intro.mp4'), ('training-pdfs', 'lib/guide.pdf')`))
  await member(A, async () => {
    await q(`insert into public.lava_lesson_materials (lesson_id, resource_id, sort_order) values ($1, $2, 1), ($1, $3, 2)`, [L, V, LIB])
    ok('admin attaches an uploaded video (and a library PDF) to a lesson')
  })
  await member(M1, async () => {
    await expectRows('agreed member sees the lesson materials', `select * from public.lava_lesson_materials where lesson_id = $1`, 2, [L])
    await expectRows('agreed member can read the LAVA video record', `select id from public.training_resources where id = $1`, 1, [V])
    await expectRows('…and its file in storage', `select name from storage.objects where bucket_id = 'training-videos' and name = 'lava-v/intro.mp4'`, 1)
    await expectError('members cannot attach materials', `insert into public.lava_lesson_materials (lesson_id, resource_id) values ($1, $2)`, /row-level security/, [L, LIB])
  })
  await member(M2, async () => {
    await expectRows('member without agreement cannot see lesson materials', `select * from public.lava_lesson_materials`, 0)
    await expectRows('…cannot read the LAVA video record', `select id from public.training_resources where id = $1`, 0, [V])
    await expectRows('…cannot read the LAVA video file', `select name from storage.objects where name = 'lava-v/intro.mp4'`, 0)
    await expectRows('…but still reads normal library material', `select id from public.training_resources where id = $1`, 1, [LIB])
    await expectRows('…and its file', `select name from storage.objects where name = 'lib/guide.pdf'`, 1)
  })
  await as('postgres', null, async () => {
    const aud = await scalar(`select count(*)::int from public.training_resources where audience = 'library'`)
    aud >= 1 ? ok('existing resources default to the library audience') : bad('audience default', aud)
  })
  await member(A, () => expectError('audience must be library or lava', `insert into public.training_resources (title, resource_type, storage_path, status, audience) values ('x', 'PDF', 'x/y.pdf', 'draft', 'public')`, /audience_check/))
}

console.log('\npasted photos (lava-images bucket)')
await as('postgres', null, async () => {
  const [b] = await q(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'lava-images'`)
  b?.public === true && Number(b.file_size_limit) === 5242880 && b.allowed_mime_types.join() === 'image/jpeg,image/png,image/webp' ? ok('lava-images bucket: public company photos, 5 MB, JPEG/PNG/WebP only') : bad('bucket', JSON.stringify(b))
})
await member(A, async () => {
  await q(`insert into storage.objects (bucket_id, name) values ('lava-images', 'content/a.jpg')`)
  ok('admins can save photos')
  await expectRows('admins can remove photos', `delete from storage.objects where bucket_id = 'lava-images' and name = 'content/a.jpg' returning name`, 1)
})
await member(M1, async () => {
  await expectError('members cannot add photos', `insert into storage.objects (bucket_id, name) values ('lava-images', 'content/evil.jpg')`, /row-level security/)
})
await as('postgres', null, () => q(`insert into storage.objects (bucket_id, name) values ('lava-images', 'content/keep.jpg')`))
await member(M1, () => expectRows('members cannot delete photos', `delete from storage.objects where bucket_id = 'lava-images' returning name`, 0))
await as('anon', null, () => expectError('anonymous visitors cannot write to storage', `insert into storage.objects (bucket_id, name) values ('lava-images', 'x.jpg')`, /permission denied|row-level security/))

console.log('\ninactive accounts')
await member(M3, () => q(`select public.lava_submit_agreement(true, true, true)`))
await as('postgres', null, () => q(`update public.profiles set status = 'inactive' where id = $1`, [M3]))
await member(M3, async () => {
  await expectRows('deactivated member loses access to lessons', `select id from public.lava_lessons`, 0)
  await expectRows('deactivated member sees no content', `select key from public.lava_content`, 0)
  await expectError('deactivated member cannot request simulator access', `select public.lava_request_simulator_access()`, /not active/)
})

console.log('\nexisting data untouched')
await as('postgres', null, async () => {
  const n = await scalar(`select count(*)::int from public.profiles`)
  n === 5 ? ok('profiles intact') : bad('profiles', n)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
