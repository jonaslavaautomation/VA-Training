// LAVA applicant portal journey test — run with `npm run test:lava` (needs Google Chrome).
// Production build served like Vercel, against the fake Supabase whose LAVA
// tables/functions run the REAL migrations in an in-memory Postgres
// (fake-lava.mjs), so the permission checks below hit the real RLS rules.
// Nothing touches your real Supabase project.
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { addUser, start } from './fake-supabase.mjs'
import { lavaSql } from './fake-lava.mjs'
import { startHostingSim } from './hosting-sim.mjs'

const APP = process.argv[2] ?? new URL('../..', import.meta.url).pathname.replace(/\/$/, '')
const API_PORT = 54396
const WEB_PORT = 5196
const API = `http://127.0.0.1:${API_PORT}`
const BASE = `http://127.0.0.1:${WEB_PORT}`
const OUT = new URL('./.out/', import.meta.url).pathname
const DIST = `${OUT}dist-lava`
mkdirSync(OUT, { recursive: true })

const build = spawnSync(`${APP}/node_modules/.bin/vite`, ['build', '--outDir', DIST, '--emptyOutDir'], {
  cwd: APP, env: { ...process.env, VITE_SUPABASE_URL: API, VITE_SUPABASE_ANON_KEY: 'public-anon-test-key', NODE_ENV: 'production' }, encoding: 'utf8',
})
if (build.status !== 0) { console.error(build.stderr || build.stdout); process.exit(1) }
console.log('production build ok')

await start(API_PORT)
await startHostingSim({ dist: DIST, config: `${APP}/vercel.json`, port: WEB_PORT, apiOrigin: API })
await lavaSql('select 1') // load the in-memory database (migrations + course content) up front

addUser('admin@academy.test', 'Admin123!', { role: 'admin', first: 'Olive', last: 'Owner' })
const mariaId = addUser('maria@example.com', 'Learning123', { first: 'Maria', last: 'Santos' })
const danId = addUser('dan@example.com', 'Learning123', { first: 'Dan', last: 'Reyes' })
addUser('una@example.com', 'Learning123', { first: 'Una', last: 'Cruz' })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
const errors = []
async function step(id, name, fn) {
  try { await fn(); results.push({ id, name, result: 'PASS' }); console.log(`  PASS  ${id}. ${name}`) } catch (e) { results.push({ id, name, result: 'FAIL', error: e.message.split('\n')[0].slice(0, 300) }); console.log(`  FAIL  ${id}. ${name} → ${e.message.split('\n')[0].slice(0, 300)}`) }
}
const text = (page, t, timeout = 15000) => page.getByText(t, { exact: false }).first().waitFor({ timeout })
const url = (page, p) => page.waitForURL((u) => new URL(u).pathname === p, { timeout: 15000 })
const assert = (c, m) => { if (!c) throw new Error(m) }
async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport: viewport ?? { width: 1366, height: 900 } })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(e.message))
  return page
}
async function login(page, email, pw) {
  await page.goto(`${BASE}/login`)
  await page.getByLabel('Email address').fill(email)
  await page.locator('input[type=password]').fill(pw)
  await page.getByRole('button', { name: 'Sign in' }).click()
}
/** Calls the API from inside the page with the member's own session (like a curious user with devtools). */
const api = (page, path, init = {}) => page.evaluate(async ({ api, path, init }) => {
  const key = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'))
  const tok = JSON.parse(localStorage.getItem(key)).access_token
  const res = await fetch(`${api}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}`, apikey: 'k', ...(init.headers ?? {}) } })
  return { status: res.status, body: await res.json().catch(() => null) }
}, { api: API, path, init })

const courses = await lavaSql(`select id, slug, title from public.lava_courses order by sort_order`)
const lessonCount = Object.fromEntries((await lavaSql(`select course_id, count(*)::int as n from public.lava_lessons group by course_id`)).map((r) => [r.course_id, r.n]))
const quizzes = await lavaSql(`select a.id, a.title, a.course_id from public.lava_assessments a where kind = 'quiz'`)
const [sim] = await lavaSql(`select id, title from public.lava_assessments where kind = 'simulator' order by sort_order limit 1`)
const answerKey = async (aid) => lavaSql(`select id, answer from public.lava_questions where assessment_id = $1 order by sort_order, created_at`, [aid])

async function takeAssessment(page, aid, { correct = true, simulator = false } = {}) {
  await page.goto(`${BASE}/lava-portal/${simulator ? 'simulator' : 'assessments'}/${aid}`)
  const key = await answerKey(aid)
  await page.locator(`input[name="${key[0].id}"]`).first().waitFor({ timeout: 15000 })
  for (const [i, q] of key.entries()) {
    const pick = correct ? q.answer : (q.answer + 1) % (await page.locator(`input[name="${q.id}"]`).count())
    await page.locator(`input[name="${q.id}"]`).nth(pick).check()
    if (simulator && i < key.length - 1) await page.getByRole('button', { name: 'Next task' }).click()
  }
  await page.getByRole('button', { name: simulator ? 'Submit simulation' : 'Submit answers' }).click()
  await page.getByTestId('assessment-result').waitFor({ timeout: 15000 })
}

async function completeCourse(page, course) {
  await page.goto(`${BASE}/lava-portal/courses/${course.slug}`)
  await page.getByRole('link', { name: 'Start course' }).click()
  const n = lessonCount[course.id]
  for (let i = 0; i < n; i++) {
    await text(page, `Lesson ${i + 1} of ${n}`)
    await page.getByRole('button', { name: /Mark complete & (continue|finish)/ }).click()
  }
  await url(page, `/lava-portal/courses/${course.slug}`)
  await text(page, `${n}/${n} · 100%`)
  const quiz = quizzes.find((q) => q.course_id === course.id)
  await takeAssessment(page, quiz.id)
  await text(page, 'Passed. Well done!')
}

try {
  const admin = await newPage()
  const maria = await newPage()

  console.log('\nadmin prepares company information and positions')
  await step('A1', 'Admin logs in and opens LAVA Applicant Management', async () => {
    await login(admin, 'admin@academy.test', 'Admin123!'); await url(admin, '/admin')
    await admin.getByRole('link', { name: 'Applicant Management' }).first().click()
    await url(admin, '/admin/lava'); await text(admin, 'LAVA Applicant Management')
    await text(admin, '6 company sections are still a draft')
  })
  await step('A2', 'Admin replaces a draft company section and publishes it (no code changes)', async () => {
    await admin.goto(`${BASE}/admin/lava/content`)
    await admin.getByRole('button', { name: 'Edit What is LAVA Automation?' }).click()
    await admin.getByLabel('Content').fill('LAVA Automation (test copy) helps insurance agencies with trained Virtual Assistants.')
    await admin.getByLabel('Visibility').selectOption('published')
    await admin.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
    await text(admin, 'Section saved.')
    const [row] = await lavaSql(`select status, body from public.lava_content where key = 'overview'`)
    assert(row.status === 'published' && row.body.includes('test copy'), JSON.stringify(row))
  })
  await step('A3', 'Admin adds a position with confirmed salary and publishes it as hiring', async () => {
    await admin.goto(`${BASE}/admin/lava/positions`)
    await admin.getByRole('button', { name: 'Add position' }).click()
    await admin.getByLabel('Job title').fill('Insurance Virtual Assistant')
    await admin.getByLabel('Job niche').fill('Insurance agency support')
    await admin.getByLabel('Job description').fill('Support licensed agents with service requests and certificates.')
    await admin.getByLabel('Responsibilities').fill('Prepare certificate drafts\nUpdate customer records')
    await admin.getByLabel('Required skills').fill('Clear written English\nAttention to detail')
    await admin.getByLabel('Qualifications').fill('Completed LAVA preparation courses')
    await admin.getByLabel('Salary / compensation (optional)').fill('PHP 22,000 – 28,000 per month')
    await admin.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
    await text(admin, 'Position saved as a draft.')
    await admin.getByTestId('position-row').filter({ hasText: 'Insurance Virtual Assistant' }).getByRole('button', { name: 'Publish (hiring)' }).click()
    await text(admin, 'is published as hiring')
  })
  await step('A4', 'Admin adds a second position without salary, publishes then closes it', async () => {
    await admin.getByRole('button', { name: 'Add position' }).click()
    await admin.getByLabel('Job title').fill('Commercial Lines Assistant')
    await admin.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
    await text(admin, 'Position saved as a draft.')
    const row = admin.getByTestId('position-row').filter({ hasText: 'Commercial Lines Assistant' })
    await row.getByRole('button', { name: 'Publish (hiring)' }).click()
    await row.getByRole('button', { name: 'Close' }).click()
    await text(admin, 'is closed')
  })

  console.log('\nmember journey')
  await step(1, 'Member logs in', async () => { await login(maria, 'maria@example.com', 'Learning123'); await url(maria, '/dashboard') })
  await step(2, 'Member sees the two dashboard choices', async () => {
    await text(maria, 'I Want to Apply to LAVA Automation')
    await text(maria, 'I Want to Explore Different Niches')
    assert(await maria.getByTestId('path-card').count() === 2, 'expected two path cards')
    await text(maria, 'Coming soon')
  })
  await step('2b', '"Explore VA Niches" opens the future-development placeholder', async () => {
    await maria.getByRole('link', { name: /Explore VA Niches/ }).first().click()
    await url(maria, '/explore-niches'); await text(maria, 'coming soon')
    await maria.goto(`${BASE}/dashboard`)
  })
  await step(3, 'Member selects "I Want to Apply to LAVA Automation"', async () => {
    await maria.getByRole('link', { name: /Explore LAVA Opportunities/ }).first().click()
    await url(maria, '/lava-portal')
  })
  await step(4, 'Member reads the LAVA introduction (published section only; drafts hidden)', async () => {
    await text(maria, 'test copy')
    assert(!(await maria.getByText('DRAFT FOR ADMINISTRATOR REVIEW').count()), 'draft text visible to member')
    assert(!(await maria.getByTestId('lava-section-history').count()), 'draft history section visible')
    await text(maria, 'Back to VA Training Academy dashboard')
  })
  await step(5, 'Member explores the hiring opportunities', async () => {
    await maria.getByRole('link', { name: 'Careers' }).click()
    await url(maria, '/lava-portal/careers')
    await text(maria, 'Insurance Virtual Assistant'); await text(maria, 'Now hiring')
    await text(maria, 'Commercial Lines Assistant'); await text(maria, 'Not currently hiring')
    await maria.getByRole('button', { name: 'Responsibilities, skills and qualifications' }).first().click()
    await text(maria, 'Prepare certificate drafts')
  })
  await step(6, 'Member sees salary only where the admin entered it', async () => {
    const comps = await maria.getByTestId('compensation').allTextContents()
    assert(comps.includes('PHP 22,000 – 28,000 per month') && comps.includes('To be announced'), comps.join(' | '))
  })
  await step(7, 'The 45-day onsite → work-from-home arrangement is clearly shown', async () => {
    const notice = await maria.getByTestId('arrangement-notice').textContent()
    assert(/first 45 days/.test(notice) && /work-from-home/.test(notice) && /not fully remote/.test(notice), notice)
    await maria.goto(`${BASE}/lava-portal/agreement`)
    await maria.getByTestId('arrangement-notice').waitFor()
  })
  await step('8a', 'Preparation courses are locked before the agreement', async () => {
    await maria.goto(`${BASE}/lava-portal/courses`); await text(maria, 'Complete the applicant agreement first')
    const r = await api(maria, '/rest/v1/lava_lessons?select=id')
    assert(r.status === 200 && r.body.length === 0, `lessons readable: ${JSON.stringify(r).slice(0, 120)}`)
  })
  await step('8b', 'All three questions must be answered', async () => {
    await maria.goto(`${BASE}/lava-portal/agreement`)
    await maria.getByLabel('Yes, I agree.').check()
    await maria.getByRole('button', { name: 'Submit agreement' }).click()
    await text(maria, 'Please answer all three questions')
    const rows = await lavaSql(`select 1 from public.lava_agreements where user_id = $1`, [mariaId])
    assert(!rows.length, 'saved a partial agreement')
  })
  await step(9, 'Member who agrees to all three unlocks the Preparation Center (answers + timestamp saved)', async () => {
    await maria.getByLabel('Yes, I understand and agree.').check()
    await maria.getByLabel('Yes, I am willing.').check()
    await maria.getByRole('button', { name: 'Submit agreement' }).click()
    await maria.getByTestId('agreement-accepted').waitFor({ timeout: 15000 })
    const [a] = await lavaSql(`select onsite_training, wfh_transition, preparation, agreed, agreed_at, answered_at from public.lava_agreements where user_id = $1`, [mariaId])
    assert(a?.agreed && a.agreed_at && a.answered_at, JSON.stringify(a))
    const [p] = await lavaSql(`select role, status from public.profiles where id = $1`, [mariaId])
    assert(p.role === 'member', 'role changed')
    await maria.getByRole('link', { name: 'Go to the Preparation Center' }).click()
    await url(maria, '/lava-portal/courses'); await text(maria, 'LAVA Preparation Center')
    assert(await maria.getByTestId('course-card').count() === 6, 'expected 6 courses')
  })

  const dan = await newPage()
  await step(10, 'Member who disagrees with any condition cannot proceed', async () => {
    await login(dan, 'dan@example.com', 'Learning123'); await url(dan, '/dashboard')
    await dan.goto(`${BASE}/lava-portal/agreement`)
    await dan.getByLabel('No, I do not agree.').first().check()
    await dan.getByLabel('Yes, I understand and agree.').check()
    await dan.getByLabel('Yes, I am willing.').check()
    await dan.getByRole('button', { name: 'Submit agreement' }).click()
    await dan.getByTestId('agreement-declined').waitFor({ timeout: 15000 })
    await text(dan, 'must agree to all three conditions')
    await dan.goto(`${BASE}/lava-portal/courses`); await text(dan, 'Complete the applicant agreement first')
    const r = await api(dan, `/rest/v1/rpc/lava_get_assessment`, { method: 'POST', body: JSON.stringify({ p_assessment: quizzes[0].id }) })
    assert(r.status >= 400 && /agreement first/.test(r.body?.message), JSON.stringify(r))
    const [a] = await lavaSql(`select agreed, onsite_training from public.lava_agreements where user_id = $1`, [danId])
    assert(a && a.agreed === false && a.onsite_training === false, JSON.stringify(a))
  })

  await step(11, 'Member completes the Foundation course (lessons + quiz)', () => completeCourse(maria, courses[0]))
  await step(12, 'Member completes Communication Skills', () => completeCourse(maria, courses[1]))
  await step(13, 'Member completes Insurance 101', () => completeCourse(maria, courses[2]))
  await step('13b', 'A failing quiz attempt is graded as not passed and can be retried', async () => {
    await takeAssessment(maria, quizzes.find((q) => q.course_id === courses[3].id).id, { correct: false })
    await text(maria, 'Not passed yet')
  })
  await step(14, 'Member completes the remaining preparation courses', async () => {
    for (const c of courses.slice(3)) await completeCourse(maria, c)
    await maria.goto(`${BASE}/lava-portal/courses`)
    const pct = await maria.getByTestId('prep-progress').textContent()
    assert(pct === '100%', `progress ${pct}`)
  })
  await step(15, 'Member has completed all available assessments', async () => {
    await maria.goto(`${BASE}/lava-portal/assessments`)
    await text(maria, '6 of 6 passed')
  })
  await step('16a', 'Simulator is locked before approval (page and API)', async () => {
    await maria.goto(`${BASE}/lava-portal/simulator/${sim.id}`); await text(maria, 'Simulator access required')
    const r = await api(maria, `/rest/v1/rpc/lava_get_assessment`, { method: 'POST', body: JSON.stringify({ p_assessment: sim.id }) })
    assert(r.status >= 400 && /not been approved/.test(r.body?.message), JSON.stringify(r))
  })
  await step(16, 'Member requests simulator access → Pending', async () => {
    await maria.goto(`${BASE}/lava-portal/simulator`)
    await maria.getByRole('button', { name: 'Request Simulator Access' }).click()
    await text(maria, 'Request sent'); await text(maria, 'Pending review')
    const [r] = await lavaSql(`select status from public.lava_simulator_requests where user_id = $1`, [mariaId])
    assert(r?.status === 'pending', JSON.stringify(r))
  })
  await step('16b', 'Member cannot approve their own request (API)', async () => {
    const patch = await api(maria, `/rest/v1/lava_simulator_requests?user_id=eq.${mariaId}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) })
    assert(patch.status >= 400, `PATCH allowed: ${JSON.stringify(patch)}`)
    const [req] = await lavaSql(`select id, status from public.lava_simulator_requests where user_id = $1`, [mariaId])
    const rpc = await api(maria, `/rest/v1/rpc/lava_decide_simulator_request`, { method: 'POST', body: JSON.stringify({ p_request: req.id, p_status: 'approved' }) })
    assert(rpc.status >= 400 && /Only administrators/.test(rpc.body?.message), JSON.stringify(rpc))
    assert((await lavaSql(`select status from public.lava_simulator_requests where id = $1`, [req.id]))[0].status === 'pending', 'status changed')
  })
  await step(17, 'Admin sees the request (dashboard alert + requests list with name, email, date, status)', async () => {
    await admin.goto(`${BASE}/admin`)
    await text(admin, '1 LAVA simulator access request waiting for review')
    await admin.getByRole('link', { name: 'Review requests' }).click()
    await url(admin, '/admin/lava/requests')
    const row = admin.getByTestId('request-row').filter({ hasText: 'maria@example.com' })
    await row.waitFor()
    const t = await row.textContent()
    assert(/Maria Santos/.test(t) && /Pending review/.test(t) && /Requested/.test(t) && /54 \/ 54|\d+ \/ \d+/.test(t), t)
  })
  await step(18, 'Admin approves the request with a note', async () => {
    const row = admin.getByTestId('request-row').filter({ hasText: 'maria@example.com' })
    await row.getByLabel(/Admin note for/).fill('Approved. Good luck!')
    await row.getByRole('button', { name: 'Approve Maria Santos' }).click()
    await text(admin, 'Simulator access approved for Maria Santos')
    const [r] = await lavaSql(`select status, admin_note, decided_by from public.lava_simulator_requests where user_id = $1`, [mariaId])
    assert(r.status === 'approved' && r.admin_note === 'Approved. Good luck!' && r.decided_by, JSON.stringify(r))
  })
  await step(19, 'Approved member can access and complete the simulator', async () => {
    await maria.goto(`${BASE}/lava-portal/simulator`)
    await text(maria, 'Approved. Good luck!')
    assert(await maria.getByTestId('simulator-activity').count() === 3, 'expected 3 activities')
    await maria.getByTestId('simulator-activity').first().click()
    await maria.getByTestId('simulator-screen').waitFor()
    await takeAssessment(maria, sim.id, { simulator: true })
    await text(maria, 'Passed. Well done!')
  })

  const una = await newPage()
  await step(20, 'Unapproved members cannot access the simulator (agreed but pending, and never agreed)', async () => {
    await login(una, 'una@example.com', 'Learning123'); await url(una, '/dashboard')
    await una.goto(`${BASE}/lava-portal/agreement`)
    await una.getByLabel('Yes, I agree.').check(); await una.getByLabel('Yes, I understand and agree.').check(); await una.getByLabel('Yes, I am willing.').check()
    await una.getByRole('button', { name: 'Submit agreement' }).click()
    await una.getByTestId('agreement-accepted').waitFor({ timeout: 15000 })
    await una.goto(`${BASE}/lava-portal/simulator`)
    await una.getByRole('button', { name: 'Request Simulator Access' }).click()
    await text(una, 'Pending review')
    assert(!(await una.getByTestId('simulator-activity').count()), 'activities listed while pending')
    await una.goto(`${BASE}/lava-portal/simulator/${sim.id}`); await text(una, 'Simulator access required')
    const r = await api(una, `/rest/v1/rpc/lava_submit_attempt`, { method: 'POST', body: JSON.stringify({ p_assessment: sim.id, p_answers: {} }) })
    assert(r.status >= 400 && /not been approved/.test(r.body?.message), JSON.stringify(r))
    const d = await api(dan, `/rest/v1/rpc/lava_get_assessment`, { method: 'POST', body: JSON.stringify({ p_assessment: sim.id }) })
    assert(d.status >= 400, JSON.stringify(d))
  })
  await step('20b', 'Admin rejects a request with a note; the member sees status and note', async () => {
    await admin.goto(`${BASE}/admin/lava/requests`)
    const row = admin.getByTestId('request-row').filter({ hasText: 'una@example.com' })
    await row.getByLabel(/Admin note for/).fill('Please finish the preparation courses first.')
    await row.getByRole('button', { name: 'Reject Una Cruz' }).click()
    await text(admin, 'rejected')
    await una.goto(`${BASE}/lava-portal/simulator`)
    await text(una, 'Your request was not approved'); await text(una, 'Please finish the preparation courses first.')
    assert(!(await una.getByTestId('simulator-activity').count()), 'activities listed after rejection')
  })

  console.log('\nmember vs admin permissions')
  await step('P1', 'Members cannot read the answer key, others’ agreements or attempts', async () => {
    const qs = await api(maria, '/rest/v1/lava_questions?select=id,answer')
    assert(qs.status === 200 && qs.body.length === 0, `questions: ${JSON.stringify(qs).slice(0, 100)}`)
    const ag = await api(maria, '/rest/v1/lava_agreements?select=user_id')
    assert(ag.body.length === 1 && ag.body[0].user_id === mariaId, `agreements: ${JSON.stringify(ag.body)}`)
    const at = await api(dan, '/rest/v1/lava_attempts?select=id')
    assert(at.body.length === 0, 'dan sees attempts')
    const g = await api(maria, `/rest/v1/rpc/lava_get_assessment`, { method: 'POST', body: JSON.stringify({ p_assessment: quizzes[0].id }) })
    assert(g.status === 200 && g.body.questions.every((q) => !('answer' in q)), 'answers leaked')
  })
  await step('P2', 'Members cannot edit an agreement or fake a score through the API', async () => {
    const up = await api(dan, `/rest/v1/lava_agreements?user_id=eq.${danId}`, { method: 'PATCH', body: JSON.stringify({ onsite_training: true, wfh_transition: true, preparation: true }) })
    assert(up.status >= 400, `agreement edit allowed: ${JSON.stringify(up)}`)
    const ins = await api(dan, '/rest/v1/lava_attempts', { method: 'POST', body: JSON.stringify({ user_id: danId, assessment_id: quizzes[0].id, score: 10, total: 10, percent: 100, passed: true }) })
    assert(ins.status >= 400, `fake score allowed: ${JSON.stringify(ins)}`)
    const other = await api(dan, `/rest/v1/lava_agreements?user_id=eq.${mariaId}`, { method: 'PATCH', body: JSON.stringify({ preparation: false }) })
    assert(other.status >= 400, 'edited another member')
    assert((await lavaSql(`select agreed from public.lava_agreements where user_id = $1`, [mariaId]))[0].agreed, 'maria changed')
  })
  await step('P3', 'Members cannot manage LAVA content or positions; admin console is blocked', async () => {
    const c = await api(maria, `/rest/v1/lava_content?key=eq.overview`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ body: 'hacked' }) })
    assert(c.status === 200 && c.body.length === 0, `content edited: ${JSON.stringify(c).slice(0, 120)}`)
    const p = await api(maria, '/rest/v1/lava_positions', { method: 'POST', body: JSON.stringify({ title: 'Fake job', status: 'open' }) })
    assert(p.status >= 400, 'position created')
    await maria.goto(`${BASE}/admin/lava/requests`)
    await maria.waitForURL((u) => !new URL(u).pathname.startsWith('/admin'), { timeout: 15000 })
  })
  await step('P4', 'Admin sees applicants with agreement answers and progress', async () => {
    await admin.goto(`${BASE}/admin/lava/applicants`)
    const maRow = admin.getByTestId('applicant-row').filter({ hasText: 'maria@example.com' })
    await maRow.waitFor()
    assert(/Agreed/.test(await maRow.textContent()), 'maria not agreed')
    assert(/Did not agree/.test(await admin.getByTestId('applicant-row').filter({ hasText: 'dan@example.com' }).textContent()), 'dan row')
  })
  await step('P5', 'Admin edits a lesson in the course manager', async () => {
    await admin.goto(`${BASE}/admin/lava/courses`)
    await admin.getByTestId('admin-course-row').first().getByRole('link', { name: /Lessons/ }).click()
    await admin.getByTestId('admin-lesson-row').first().waitFor()
    await admin.getByTestId('admin-lesson-row').first().getByRole('button', { name: /^Edit / }).click()
    await admin.getByLabel('Reading time (minutes)').fill('12')
    await admin.getByRole('dialog').getByRole('button', { name: 'Save lesson' }).click()
    await text(admin, 'Lesson saved.')
  })
  await step('P6', 'Deactivated member loses LAVA access', async () => {
    const r = await (async () => {
      const { state } = await import('./fake-supabase.mjs')
      state.profiles.get(danId).status = 'inactive'
      return api(dan, '/rest/v1/lava_content?select=key')
    })()
    assert(r.status === 200 && r.body.length === 0, JSON.stringify(r).slice(0, 120))
  })

  console.log('\nlayout')
  await step('R1', 'LAVA pages fit a 390px phone screen without sideways scrolling', async () => {
    const phone = await newPage({ width: 390, height: 844 })
    await login(phone, 'maria@example.com', 'Learning123'); await url(phone, '/dashboard')
    for (const p of ['/dashboard', '/lava-portal', '/lava-portal/careers', '/lava-portal/agreement', '/lava-portal/courses', `/lava-portal/courses/${courses[4].slug}`, '/lava-portal/assessments', '/lava-portal/simulator', `/lava-portal/simulator/${sim.id}`]) {
      await phone.goto(`${BASE}${p}`)
      await phone.waitForLoadState('networkidle')
      const over = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      assert(over <= 0, `${p} overflows by ${over}px`)
    }
    await phone.screenshot({ path: `${OUT}lava-390-simulator.png`, fullPage: false })
  })

  const relevant = errors.filter((e) => !/Failed to load resource|status of 4\d\d/.test(e))
  await step('E1', 'No unexpected console errors', async () => assert(!relevant.length, relevant.slice(0, 3).join(' | ')))
} finally {
  await browser.close()
  writeFileSync(`${OUT}lava-results.json`, JSON.stringify(results, null, 2))
  const pass = results.filter((r) => r.result === 'PASS').length
  console.log(`\n${pass} passed, ${results.length - pass} failed`)
  process.exit(results.length - pass ? 1 : 0)
}
