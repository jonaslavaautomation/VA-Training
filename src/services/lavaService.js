/*
 * LAVA Automation applicant portal — data access.
 *
 * Members read published content, their OWN agreement / progress / attempts /
 * simulator request (RLS). Agreements, graded attempts and access requests
 * are written only through database functions (lava_submit_agreement,
 * lava_submit_attempt, lava_request_simulator_access). Questions are fetched
 * without answers via lava_get_assessment; the simulator additionally needs
 * an approved request — all enforced in the database, not just in the UI.
 * Admin writes are plain table writes allowed by admin-only RLS policies,
 * plus lava_decide_simulator_request for approvals.
 */
import { supabase, isPreviewMode } from '@/lib/supabase'
import { userError } from '@/lib/errors'
import { detectContentType, validateUploadFile } from '@/lib/media'
import { effectiveLimitBytes, UPLOAD_RULES } from '@/config/constants'
import { beginFileUpload, saveResource } from '@/services/uploadService'

const PREVIEW_MESSAGE = 'The LAVA portal needs a connected Supabase project. Add your keys to .env.local to enable it.'
const SETUP_MESSAGE = 'The LAVA portal isn’t set up on the database yet. Run the Phase 7A migrations (see DEPLOYMENT_GUIDE.md).'

export const ARRANGEMENT_TEXT =
  'LAVA Automation requires newly hired Virtual Assistants to work onsite for their first 45 days for training purposes. After completing the 45-day onsite training period, Virtual Assistants will transition to a work-from-home arrangement.'

/** The three agreement questions (fixed: they define the conditions applicants accept). */
export const AGREEMENT_QUESTIONS = [
  {
    field: 'onsite_training',
    question: 'Are you willing to work onsite for the first 45 days for training purposes?',
    yes: 'Yes, I agree.',
    no: 'No, I do not agree.',
  },
  {
    field: 'wfh_transition',
    question: 'Do you understand that after completing the 45-day onsite training period, your work arrangement will transition to work from home?',
    yes: 'Yes, I understand and agree.',
    no: 'No, I do not agree.',
  },
  {
    field: 'preparation',
    question: 'Are you willing to undergo the required preparation courses, assessments, and training before proceeding with the LAVA application process?',
    yes: 'Yes, I am willing.',
    no: 'No, I am not willing.',
  },
]

const CONTENT_COLS = 'key, title, body, status, sort_order, updated_at'
const POSITION_COLS = 'id, title, niche, description, responsibilities, required_skills, qualifications, compensation, work_arrangement, status, sort_order, created_at, updated_at'
const COURSE_COLS = 'id, slug, title, summary, status, sort_order'
const LESSON_LIST_COLS = 'id, course_id, title, minutes, sort_order, resource_id'
const LESSON_COLS = 'id, course_id, title, body, minutes, sort_order, resource_id'
const ASSESSMENT_COLS = 'id, slug, course_id, kind, title, description, pass_percent, status, sort_order'
const ATTEMPT_COLS = 'id, user_id, assessment_id, score, total, percent, passed, created_at'
const REQUEST_COLS = 'id, user_id, status, admin_note, requested_at, decided_at, decided_by'

function guard() {
  if (isPreviewMode) throw userError(PREVIEW_MESSAGE, { code: 'preview' })
}

/** Turns database errors into messages written for people. */
function friendly(error) {
  if (!error) return error
  if (error.code === 'P0001' && error.message) return userError(error.message, { code: 'rejected', cause: error })
  if (error.code === '42501' && error.message && !/row-level security|permission denied/.test(error.message)) {
    return userError(error.message, { code: 'forbidden', cause: error })
  }
  if (error.code === 'PGRST202' || error.code === '42P01' || error.code === 'PGRST205') return userError(SETUP_MESSAGE, { code: 'not_deployed', cause: error })
  return error
}

async function run(query) {
  const { data, error } = await query
  if (error) throw friendly(error)
  return data
}

const rpc = (name, params) => run(supabase.rpc(name, params))
const byOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.title ?? '').localeCompare(String(b.title ?? ''))

/* ============================== members ============================== */

/** Agreement + simulator request for the signed-in member (either may be null). */
export async function getMyStatus(userId) {
  guard()
  const [agreement, request] = await Promise.all([
    run(supabase.from('lava_agreements').select('user_id, onsite_training, wfh_transition, preparation, agreed, answered_at, agreed_at').eq('user_id', userId)),
    run(supabase.from('lava_simulator_requests').select(REQUEST_COLS).eq('user_id', userId)),
  ])
  return { agreement: agreement[0] ?? null, request: request[0] ?? null }
}

/** Company sections (members: published only — RLS). Returned as a map by key plus an ordered list. */
export async function listContent() {
  guard()
  const rows = (await run(supabase.from('lava_content').select(CONTENT_COLS))).sort(byOrder)
  return { list: rows, byKey: Object.fromEntries(rows.map((r) => [r.key, r])) }
}

/** Positions visible to members: open first, then closed (RLS hides drafts and archived). */
export async function listPositions() {
  guard()
  const rows = await run(supabase.from('lava_positions').select(POSITION_COLS).in('status', ['open', 'closed']))
  return rows.sort((a, b) => (a.status === b.status ? byOrder(a, b) : a.status === 'open' ? -1 : 1))
}

export async function submitAgreement(answers) {
  guard()
  return rpc('lava_submit_agreement', {
    p_onsite_training: answers.onsite_training,
    p_wfh_transition: answers.wfh_transition,
    p_preparation: answers.preparation,
  })
}

async function myAttempts(userId) {
  return run(supabase.from('lava_attempts').select(ATTEMPT_COLS).eq('user_id', userId).order('created_at', { ascending: false }))
}

/** Best result per assessment: { [assessmentId]: { best, attempts, passed, last } }. */
function summarizeAttempts(attempts) {
  const out = {}
  for (const a of attempts) {
    const s = (out[a.assessment_id] ??= { best: 0, attempts: 0, passed: false, last: a.created_at })
    s.attempts++
    s.best = Math.max(s.best, a.percent)
    s.passed ||= a.passed
  }
  return out
}

/**
 * The Preparation Center: courses in order with lesson list, completion and
 * quiz result. Lessons come back empty until the member has agreed (RLS).
 */
export async function getPreparationOverview(userId) {
  guard()
  const [courses, lessons, progress, assessments, attempts] = await Promise.all([
    run(supabase.from('lava_courses').select(COURSE_COLS).eq('status', 'published')),
    run(supabase.from('lava_lessons').select(LESSON_LIST_COLS)),
    run(supabase.from('lava_lesson_progress').select('lesson_id, completed_at').eq('user_id', userId)),
    run(supabase.from('lava_assessments').select(ASSESSMENT_COLS).eq('status', 'published')),
    myAttempts(userId),
  ])
  const done = new Set(progress.map((p) => p.lesson_id))
  const results = summarizeAttempts(attempts)
  const list = courses.sort(byOrder).map((c) => {
    const ls = lessons.filter((l) => l.course_id === c.id).sort(byOrder).map((l) => ({ ...l, completed: done.has(l.id) }))
    const completed = ls.filter((l) => l.completed).length
    const quiz = assessments.find((a) => a.course_id === c.id && a.kind === 'quiz') ?? null
    return {
      ...c,
      lessons: ls,
      completed,
      total: ls.length,
      percent: ls.length ? Math.round((completed / ls.length) * 100) : 0,
      minutes: ls.reduce((n, l) => n + (l.minutes ?? 0), 0),
      quiz: quiz && { ...quiz, result: results[quiz.id] ?? null },
    }
  })
  const totalLessons = list.reduce((n, c) => n + c.total, 0)
  const completedLessons = list.reduce((n, c) => n + c.completed, 0)
  return {
    courses: list,
    totalLessons,
    completedLessons,
    percent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    assessments: assessments.sort(byOrder).map((a) => ({ ...a, result: results[a.id] ?? null })),
  }
}

/** One course with full lesson text (null if not found / not published). */
export async function getCourse(slug, userId) {
  guard()
  const [course] = await run(supabase.from('lava_courses').select(COURSE_COLS).eq('slug', slug))
  if (!course) return null
  const [lessons, progress, assessments, attempts] = await Promise.all([
    run(supabase.from('lava_lessons').select(LESSON_COLS).eq('course_id', course.id)),
    run(supabase.from('lava_lesson_progress').select('lesson_id, completed_at').eq('user_id', userId)),
    run(supabase.from('lava_assessments').select(ASSESSMENT_COLS).eq('course_id', course.id).eq('status', 'published')),
    myAttempts(userId),
  ])
  const done = new Set(progress.map((p) => p.lesson_id))
  const results = summarizeAttempts(attempts)
  const quiz = assessments.find((a) => a.kind === 'quiz') ?? null
  return {
    ...course,
    lessons: lessons.sort(byOrder).map((l) => ({ ...l, completed: done.has(l.id) })),
    quiz: quiz && { ...quiz, result: results[quiz.id] ?? null },
  }
}

export async function setLessonComplete(userId, lessonId, complete) {
  guard()
  if (complete) {
    const { error } = await supabase.from('lava_lesson_progress').insert({ user_id: userId, lesson_id: lessonId })
    if (error && error.code !== '23505') throw friendly(error) // already completed = fine
  } else {
    await run(supabase.from('lava_lesson_progress').delete().eq('user_id', userId).eq('lesson_id', lessonId))
  }
}

const MATERIAL_COLS = 'id, title, resource_type, storage_path, file_size, duration_seconds, page_count, status, audience'

/**
 * Videos and PDFs of one or more lessons, in order: { [lessonId]: resource[] }.
 * Members only receive these after agreeing (RLS on both tables and on the files).
 */
export async function getLessonMaterials(lessonIds) {
  guard()
  if (!lessonIds.length) return {}
  const links = await run(supabase.from('lava_lesson_materials').select('lesson_id, resource_id, sort_order').in('lesson_id', lessonIds))
  const ids = [...new Set(links.map((l) => l.resource_id))]
  const resources = ids.length ? await run(supabase.from('training_resources').select(MATERIAL_COLS).in('id', ids)) : []
  const byId = Object.fromEntries(resources.map((r) => [r.id, r]))
  const out = Object.fromEntries(lessonIds.map((id) => [id, []]))
  for (const l of links.sort((a, b) => a.sort_order - b.sort_order)) {
    if (byId[l.resource_id]) out[l.lesson_id].push({ ...byId[l.resource_id], sort_order: l.sort_order })
  }
  return out
}

export const materialKind = (file) =>
  /\.pdf$/i.test(file.name) || file.type === 'application/pdf' ? 'PDF' : /\.(mp4|webm)$/i.test(file.name) || file.type.startsWith('video/') ? 'VIDEO' : null

/**
 * Uploads a video or PDF for a lesson through the existing Training Library
 * pipeline (resumable upload into the private bucket, then a training_resources
 * row marked audience 'lava'), then attaches it to the lesson.
 * Returns { task, done } — done resolves to the saved resource.
 */
export function uploadLessonMaterial({ lessonId, file, title, sortOrder = 0, onProgress, onStatus }) {
  guard()
  const kind = materialKind(file)
  if (!kind) throw userError('Choose a PDF, MP4 or WebM file.')
  let started = null
  const done = (async () => {
    const problem = await validateUploadFile(file, kind, effectiveLimitBytes(UPLOAD_RULES[kind]))
    if (problem) throw userError(problem)
    const contentType = await detectContentType(file)
    started = beginFileUpload({ kind, file, contentType, onProgress, onStatus })
    const { path } = await started.task.done
    const { resource } = await saveResource({
      resourceId: started.resourceId,
      kind,
      path,
      file,
      title: (title || file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')).trim().slice(0, 200),
      description: '',
      categoryId: null,
      status: 'published',
      audience: 'lava',
    })
    await run(supabase.from('lava_lesson_materials').insert({ lesson_id: lessonId, resource_id: resource.id, sort_order: sortOrder }))
    return resource
  })()
  return { done, abort: () => started?.task.abort() }
}

/** Attach a file that already exists in the Training Library. */
export async function attachLessonMaterial(lessonId, resourceId, sortOrder = 0) {
  guard()
  const { error } = await supabase.from('lava_lesson_materials').insert({ lesson_id: lessonId, resource_id: resourceId, sort_order: sortOrder })
  if (error && error.code !== '23505') throw friendly(error)
}

/** Removes the file from the lesson (the file itself stays in Training Resources). */
export async function detachLessonMaterial(lessonId, resourceId) {
  guard()
  await run(supabase.from('lava_lesson_materials').delete().eq('lesson_id', lessonId).eq('resource_id', resourceId))
}

export async function setMaterialOrder(lessonId, resourceId, sortOrder) {
  guard()
  await run(supabase.from('lava_lesson_materials').update({ sort_order: sortOrder }).eq('lesson_id', lessonId).eq('resource_id', resourceId))
}

/** Questions without answers. Throws a friendly error when locked. */
export async function getAssessment(id) {
  guard()
  return rpc('lava_get_assessment', { p_assessment: id })
}

/** answers: { [questionId]: optionIndex } → { score, total, percent, passed, results[] } */
export async function submitAttempt(id, answers) {
  guard()
  return rpc('lava_submit_attempt', { p_assessment: id, p_answers: answers })
}

export async function requestSimulatorAccess() {
  guard()
  return rpc('lava_request_simulator_access', {})
}

/* =============================== admins =============================== */

export async function listContentAdmin() {
  guard()
  return (await run(supabase.from('lava_content').select(CONTENT_COLS))).sort(byOrder)
}

export async function saveContent(key, { title, body, status }, userId) {
  guard()
  const rows = await run(supabase.from('lava_content').update({ title: title.trim(), body, status, updated_by: userId }).eq('key', key).select(CONTENT_COLS))
  return rows[0]
}

/** Removes a company section (members stop seeing it immediately). */
export async function deleteContent(key) {
  guard()
  await run(supabase.from('lava_content').delete().eq('key', key))
}

/** Adds a removed company section back as an empty draft. */
export async function restoreContent(key, title, sortOrder) {
  guard()
  const rows = await run(supabase.from('lava_content').insert({ key, title, body: '', status: 'draft', sort_order: sortOrder }).select(CONTENT_COLS))
  return rows[0]
}

export async function listPositionsAdmin() {
  guard()
  return (await run(supabase.from('lava_positions').select(POSITION_COLS))).sort(byOrder)
}

const lines = (v) => (Array.isArray(v) ? v : String(v ?? '').split('\n')).map((s) => s.trim()).filter(Boolean).slice(0, 30)

export async function savePosition(id, values, userId) {
  guard()
  const row = {
    title: values.title.trim(),
    niche: values.niche?.trim() || null,
    description: values.description?.trim() ?? '',
    responsibilities: lines(values.responsibilities),
    required_skills: lines(values.required_skills),
    qualifications: lines(values.qualifications),
    compensation: values.compensation?.trim() || null,
    work_arrangement: values.work_arrangement?.trim() || ARRANGEMENT_TEXT,
    sort_order: Number(values.sort_order) || 0,
    ...(values.status ? { status: values.status } : {}),
  }
  const q = id
    ? supabase.from('lava_positions').update(row).eq('id', id)
    : supabase.from('lava_positions').insert({ ...row, created_by: userId })
  return (await run(q.select(POSITION_COLS)))[0]
}

export async function setPositionStatus(id, status) {
  guard()
  return (await run(supabase.from('lava_positions').update({ status }).eq('id', id).select(POSITION_COLS)))[0]
}

export async function deletePosition(id) {
  guard()
  await run(supabase.from('lava_positions').delete().eq('id', id))
}

export async function listCoursesAdmin() {
  guard()
  const [courses, lessons, assessments] = await Promise.all([
    run(supabase.from('lava_courses').select(COURSE_COLS)),
    run(supabase.from('lava_lessons').select(LESSON_LIST_COLS)),
    run(supabase.from('lava_assessments').select(ASSESSMENT_COLS)),
  ])
  return courses.sort(byOrder).map((c) => ({
    ...c,
    lessonCount: lessons.filter((l) => l.course_id === c.id).length,
    assessments: assessments.filter((a) => a.course_id === c.id),
  }))
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'course'

export async function saveCourse(id, { title, summary, status, sort_order }) {
  guard()
  const row = { title: title.trim(), summary: summary?.trim() ?? '', status, sort_order: Number(sort_order) || 0 }
  const q = id
    ? supabase.from('lava_courses').update(row).eq('id', id)
    : supabase.from('lava_courses').insert({ ...row, slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}` })
  return (await run(q.select(COURSE_COLS)))[0]
}

export async function deleteCourse(id) {
  guard()
  await run(supabase.from('lava_courses').delete().eq('id', id))
}

export async function getCourseAdmin(id) {
  guard()
  const [course] = await run(supabase.from('lava_courses').select(COURSE_COLS).eq('id', id))
  if (!course) return null
  const lessons = await run(supabase.from('lava_lessons').select(LESSON_COLS).eq('course_id', id))
  return { ...course, lessons: lessons.sort(byOrder) }
}

export async function saveLesson(id, courseId, { title, body, minutes, sort_order, resource_id }) {
  guard()
  const row = { title: title.trim(), body, minutes: Math.max(1, Math.min(240, Number(minutes) || 5)), sort_order: Number(sort_order) || 0, resource_id: resource_id || null }
  const q = id ? supabase.from('lava_lessons').update(row).eq('id', id) : supabase.from('lava_lessons').insert({ ...row, course_id: courseId })
  return (await run(q.select(LESSON_COLS)))[0]
}

export async function deleteLesson(id) {
  guard()
  await run(supabase.from('lava_lessons').delete().eq('id', id))
}

/** Swaps the order of two lessons (or any rows with sort_order) in a table. */
export async function swapOrder(table, a, b) {
  guard()
  await run(supabase.from(table).update({ sort_order: b.sort_order }).eq('id', a.id))
  await run(supabase.from(table).update({ sort_order: a.sort_order }).eq('id', b.id))
}

/** Training Library resources an admin can attach to a lesson (reuses existing uploads). */
export async function listAttachableResources() {
  guard()
  return run(supabase.from('training_resources').select('id, title, resource_type, status, audience, file_size').order('title'))
}

export async function listAssessmentsAdmin() {
  guard()
  const [assessments, questions, courses] = await Promise.all([
    run(supabase.from('lava_assessments').select(ASSESSMENT_COLS)),
    run(supabase.from('lava_questions').select('id, assessment_id')),
    run(supabase.from('lava_courses').select(COURSE_COLS)),
  ])
  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]))
  return {
    courses: courses.sort(byOrder),
    assessments: assessments.sort(byOrder).map((a) => ({
      ...a,
      course: courseById[a.course_id] ?? null,
      questionCount: questions.filter((q) => q.assessment_id === a.id).length,
    })),
  }
}

export async function saveAssessment(id, values) {
  guard()
  const row = {
    title: values.title.trim(),
    description: values.description?.trim() ?? '',
    kind: values.kind,
    course_id: values.course_id || null,
    pass_percent: Math.max(1, Math.min(100, Number(values.pass_percent) || 70)),
    status: values.status,
    sort_order: Number(values.sort_order) || 0,
  }
  const q = id
    ? supabase.from('lava_assessments').update(row).eq('id', id)
    : supabase.from('lava_assessments').insert({ ...row, slug: `${slugify(values.title)}-${Math.random().toString(36).slice(2, 6)}` })
  return (await run(q.select(ASSESSMENT_COLS)))[0]
}

export async function deleteAssessment(id) {
  guard()
  await run(supabase.from('lava_assessments').delete().eq('id', id))
}

export async function getAssessmentAdmin(id) {
  guard()
  const [assessment] = await run(supabase.from('lava_assessments').select(ASSESSMENT_COLS).eq('id', id))
  if (!assessment) return null
  const questions = await run(supabase.from('lava_questions').select('id, assessment_id, prompt, scenario, context, options, answer, explanation, sort_order').eq('assessment_id', id))
  return { ...assessment, questions: questions.sort(byOrder) }
}

export async function saveQuestion(id, assessmentId, values) {
  guard()
  const options = lines(values.options).slice(0, 6)
  if (options.length < 2) throw userError('Add at least two answer options (one per line).')
  const answer = Number(values.answer)
  if (!(answer >= 0 && answer < options.length)) throw userError('Choose which option is correct.')
  const row = {
    prompt: values.prompt.trim(),
    scenario: values.scenario?.trim() || null,
    context: values.context ?? null,
    options,
    answer,
    explanation: values.explanation?.trim() ?? '',
    sort_order: Number(values.sort_order) || 0,
  }
  const q = id ? supabase.from('lava_questions').update(row).eq('id', id) : supabase.from('lava_questions').insert({ ...row, assessment_id: assessmentId })
  return (await run(q.select('id')))[0]
}

export async function deleteQuestion(id) {
  guard()
  await run(supabase.from('lava_questions').delete().eq('id', id))
}

async function profilesById(ids) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return {}
  const rows = await run(supabase.from('profiles').select('id, first_name, last_name, email, status').in('id', unique))
  return Object.fromEntries(rows.map((p) => [p.id, p]))
}

/** Per-member preparation summary for admins: lessons completed and passed quizzes. */
async function progressByMember(ids) {
  if (!ids.length) return {}
  const [progress, attempts, lessonCount] = await Promise.all([
    run(supabase.from('lava_lesson_progress').select('user_id, lesson_id').in('user_id', ids)),
    run(supabase.from('lava_attempts').select('user_id, assessment_id, passed, percent').in('user_id', ids)),
    run(supabase.from('lava_lessons').select('id')),
  ])
  const out = {}
  for (const id of ids) {
    const passed = new Set(attempts.filter((a) => a.user_id === id && a.passed).map((a) => a.assessment_id))
    out[id] = {
      lessonsDone: progress.filter((p) => p.user_id === id).length,
      lessonsTotal: lessonCount.length,
      passedAssessments: passed.size,
      attempts: attempts.filter((a) => a.user_id === id).length,
    }
  }
  return out
}

/** Simulator requests, pending first, with the member's name, email and progress. */
export async function listSimulatorRequests() {
  guard()
  const requests = await run(supabase.from('lava_simulator_requests').select(REQUEST_COLS).order('requested_at', { ascending: false }))
  const [people, progress] = await Promise.all([
    profilesById(requests.flatMap((r) => [r.user_id, r.decided_by])),
    progressByMember(requests.map((r) => r.user_id)),
  ])
  const rank = { pending: 0, approved: 1, rejected: 2 }
  return requests
    .map((r) => ({ ...r, member: people[r.user_id] ?? null, decider: people[r.decided_by] ?? null, progress: progress[r.user_id] }))
    .sort((a, b) => rank[a.status] - rank[b.status])
}

export async function decideSimulatorRequest(id, status, note) {
  guard()
  return rpc('lava_decide_simulator_request', { p_request: id, p_status: status, p_note: note || null })
}

/** Every member who answered the agreement, newest first, with preparation progress. */
export async function listApplicants() {
  guard()
  const [agreements, requests] = await Promise.all([
    run(supabase.from('lava_agreements').select('user_id, onsite_training, wfh_transition, preparation, agreed, answered_at, agreed_at').order('answered_at', { ascending: false })),
    run(supabase.from('lava_simulator_requests').select('user_id, status')),
  ])
  const ids = agreements.map((a) => a.user_id)
  const [people, progress] = await Promise.all([profilesById(ids), progressByMember(ids)])
  const reqBy = Object.fromEntries(requests.map((r) => [r.user_id, r.status]))
  return agreements.map((a) => ({ ...a, member: people[a.user_id] ?? null, progress: progress[a.user_id], simulator: reqBy[a.user_id] ?? null }))
}

/** Numbers for the LAVA admin overview and the admin dashboard card. */
export async function getLavaAdminStats() {
  guard()
  const [agreements, requests, positions, content] = await Promise.all([
    run(supabase.from('lava_agreements').select('agreed')),
    run(supabase.from('lava_simulator_requests').select('status')),
    run(supabase.from('lava_positions').select('status')),
    run(supabase.from('lava_content').select('status')),
  ])
  return {
    applicants: agreements.length,
    agreed: agreements.filter((a) => a.agreed).length,
    pendingRequests: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    openPositions: positions.filter((p) => p.status === 'open').length,
    draftSections: content.filter((c) => c.status === 'draft').length,
  }
}
