/*
 * Resource data-access layer.
 * Supabase queries guarded by RLS: members only ever receive published
 * resources, and only their own favorites / progress. Return shapes match
 * Phase 1 so pages and components are unchanged.
 * In preview mode (no Supabase env vars) the sample-data versions are used.
 */
import { supabase, isPreviewMode } from '@/lib/supabase'
import { SESSION_MESSAGE, userError } from '@/lib/errors'
import { previewResources as preview } from '@/mocks/previewServices'
import { logActivity } from '@/services/activityService'
import { signUrl, signUrls } from '@/services/storageService'
import { LIBRARY_PAGE_SIZE, SIGNED_URL_TTL, UPLOAD_RULES, VIDEO_COMPLETION } from '@/config/constants'

const CATEGORY_COLUMNS = 'id, name, slug, icon, color'
const BASE_COLUMNS =
  'id, title, description, category_id, resource_type, storage_path, thumbnail_path, file_size, duration_seconds, page_count, status, created_at, updated_at'
const RESOURCE_COLUMNS = `${BASE_COLUMNS}, category:categories(${CATEGORY_COLUMNS})`
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function currentUserId() {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user?.id
  if (!id) throw userError(SESSION_MESSAGE, { code: 'unauthorized' })
  return id
}

const PROGRESS_COLUMNS = 'status, progress_percent, last_position_seconds, watched_seconds, completed_at, updated_at'

const toProgress = (p) => ({
  status: p.status,
  percent: p.progress_percent,
  position: p.last_position_seconds ?? 0,
  watched: p.watched_seconds ?? 0,
  completed_at: p.completed_at ?? null,
  updated_at: p.updated_at,
})

/** Adds is_favorite / progress for the signed-in user (filtered by user_id because admins can read everyone's). */
async function decorate(rows) {
  if (!rows.length) return []
  const uid = await currentUserId()
  const ids = rows.map((r) => r.id)
  const [favs, progress, thumbs] = await Promise.all([
    supabase.from('favorites').select('resource_id').eq('user_id', uid).in('resource_id', ids),
    supabase.from('learning_progress').select(`resource_id, ${PROGRESS_COLUMNS}`).eq('user_id', uid).in('resource_id', ids),
    // A thumbnail that can't be signed just falls back to the branded placeholder.
    signUrls(UPLOAD_RULES.THUMBNAIL.bucket, rows.map((r) => r.thumbnail_path), SIGNED_URL_TTL.THUMBNAIL).catch((err) => {
      console.warn('Could not sign thumbnails', err)
      return new Map()
    }),
  ])
  if (favs.error) throw favs.error
  if (progress.error) throw progress.error
  const favSet = new Set(favs.data.map((f) => f.resource_id))
  const progressById = new Map(progress.data.map((p) => [p.resource_id, toProgress(p)]))
  return rows.map((r) => ({
    ...r,
    thumbnail_url: r.thumbnail_path ? thumbs.get(r.thumbnail_path) ?? null : null,
    is_favorite: favSet.has(r.id),
    progress: progressById.get(r.id) ?? null,
  }))
}

/** Keeps letters, numbers and a little punctuation so the term is safe inside a PostgREST or() filter. */
function sanitizeTerm(q) {
  return q.replace(/[^\p{L}\p{N}\s'.&-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
}

export async function listCategories() {
  if (isPreviewMode) return preview.listCategories()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, icon, color, created_at, training_resources(count)')
    .eq('training_resources.status', 'published')
    .order('name')
  if (error) throw error
  return data.map(({ training_resources: counts, ...c }) => ({ ...c, resource_count: counts?.[0]?.count ?? 0 }))
}

export async function listResources({ q = '', type = '', category = '', limit } = {}) {
  if (isPreviewMode) return preview.listResources({ q, type, category, limit })
  const columns = category ? `${BASE_COLUMNS}, category:categories!inner(${CATEGORY_COLUMNS})` : RESOURCE_COLUMNS
  let query = supabase.from('training_resources').select(columns).eq('status', 'published').order('created_at', { ascending: false })
  if (type) query = query.eq('resource_type', type)
  if (category) query = query.eq('category.slug', category)
  const term = sanitizeTerm(q)
  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`)
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  if (error) throw error
  return decorate(data)
}

const SORTS = {
  newest: ['created_at', { ascending: false }],
  oldest: ['created_at', { ascending: true }],
  az: ['title', { ascending: true }],
}

/**
 * Training Library query: filters, sort and page-at-a-time loading.
 * Returns { items, total, hasMore }. `page` is 0-based.
 */
export async function searchLibrary({ q = '', type = '', category = '', sort = 'newest', page = 0, pageSize = LIBRARY_PAGE_SIZE } = {}) {
  if (isPreviewMode) {
    const all = await preview.listResources({ q, type, category })
    const sorted = sort === 'az' ? [...all].sort((a, b) => a.title.localeCompare(b.title)) : sort === 'oldest' ? [...all].reverse() : all
    const items = sorted.slice(page * pageSize, (page + 1) * pageSize)
    return { items, total: all.length, hasMore: (page + 1) * pageSize < all.length }
  }
  const columns = category ? `${BASE_COLUMNS}, category:categories!inner(${CATEGORY_COLUMNS})` : RESOURCE_COLUMNS
  const [column, order] = SORTS[sort] ?? SORTS.newest
  let query = supabase
    .from('training_resources')
    .select(columns, { count: 'exact' })
    .eq('status', 'published')
    .order(column, order)
    .order('id', { ascending: true }) // stable paging when titles/dates tie
    .range(page * pageSize, page * pageSize + pageSize - 1)
  if (type) query = query.eq('resource_type', type)
  if (category) query = query.eq('category.slug', category)
  const term = sanitizeTerm(q)
  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`)
  const { data, error, count } = await query
  if (error) throw error
  const total = count ?? data.length
  return { items: await decorate(data), total, hasMore: (page + 1) * pageSize < total }
}

/** RLS decides visibility: members get published resources only; admins can preview drafts. */
export async function getResource(id) {
  if (isPreviewMode) return preview.getResource(id)
  if (!UUID_RE.test(id)) return null
  const { data, error } = await supabase.from('training_resources').select(RESOURCE_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  return data ? (await decorate([data]))[0] : null
}

export async function listFavorites() {
  if (isPreviewMode) return preview.listFavorites()
  const uid = await currentUserId()
  const { data, error } = await supabase
    .from('favorites')
    .select(`created_at, resource:training_resources(${RESOURCE_COLUMNS})`)
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw error
  return decorate(data.map((f) => f.resource).filter((r) => r?.status === 'published'))
}

/** Returns the new favorite state. */
export async function toggleFavorite(id) {
  if (isPreviewMode) return preview.toggleFavorite(id)
  const uid = await currentUserId()
  const { data: existing, error } = await supabase.from('favorites').select('id').eq('user_id', uid).eq('resource_id', id).maybeSingle()
  if (error) throw error
  if (existing) {
    const { error: deleteError } = await supabase.from('favorites').delete().eq('id', existing.id)
    if (deleteError) throw deleteError
    return false
  }
  const { error: insertError } = await supabase.from('favorites').insert({ user_id: uid, resource_id: id })
  if (insertError && insertError.code !== '23505') throw insertError // 23505 = already a favorite
  logActivity('favorited', id)
  return true
}

export async function getLearningProgress() {
  if (isPreviewMode) return preview.getLearningProgress()
  const uid = await currentUserId()
  const [progressRes, countRes] = await Promise.all([
    supabase
      .from('learning_progress')
      .select(`updated_at, resource:training_resources(${RESOURCE_COLUMNS})`)
      .eq('user_id', uid)
      .order('updated_at', { ascending: false }),
    supabase.from('training_resources').select('id', { count: 'exact', head: true }).eq('status', 'published'),
  ])
  if (progressRes.error) throw progressRes.error
  if (countRes.error) throw countRes.error
  // Only published resources count — unpublished ones disappear from stats too.
  const items = await decorate(progressRes.data.map((p) => p.resource).filter((r) => r?.status === 'published'))
  return {
    inProgress: items.filter((i) => i.progress?.status === 'in_progress'),
    completed: items
      .filter((i) => i.progress?.status === 'completed')
      .sort((a, b) => new Date(b.progress.completed_at ?? 0) - new Date(a.progress.completed_at ?? 0)),
    started: items.length,
    totalPublished: countRes.count ?? 0,
  }
}

export async function markComplete(id) {
  if (isPreviewMode) return preview.markComplete(id)
  const uid = await currentUserId()
  const { data, error } = await supabase
    .from('learning_progress')
    .upsert(
      { user_id: uid, resource_id: id, status: 'completed', progress_percent: 100, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,resource_id' },
    )
    .select(PROGRESS_COLUMNS)
    .single()
  if (error) throw error
  logActivity('completed', id)
  return toProgress(data)
}

/** Undo a completion (e.g. a PDF marked complete by mistake). */
export async function markIncomplete(id) {
  const uid = await currentUserId()
  const { data, error } = await supabase
    .from('learning_progress')
    .update({ status: 'in_progress', completed_at: null })
    .eq('user_id', uid)
    .eq('resource_id', id)
    .select(PROGRESS_COLUMNS)
    .single()
  if (error) throw error
  return toProgress(data)
}

/**
 * Records that a member opened a PDF: creates an "in progress" entry the first
 * time (so it appears under My Learning → Continue) and refreshes its
 * last-opened time afterwards. Never changes a completed status.
 */
export async function recordPdfOpened(resource) {
  if (isPreviewMode) return null
  const uid = await currentUserId()
  const p = resource.progress
  const { data, error } = await supabase
    .from('learning_progress')
    .upsert(
      {
        user_id: uid,
        resource_id: resource.id,
        status: p?.status ?? 'in_progress',
        progress_percent: p?.percent ?? 0,
        completed_at: p?.completed_at ?? null,
      },
      { onConflict: 'user_id,resource_id' },
    )
    .select(PROGRESS_COLUMNS)
    .single()
  if (error) throw error
  return toProgress(data)
}

/**
 * Pure rule for the next video progress state (exported for clarity/testing).
 * report = { position, duration, watchedDelta, ended } from the player.
 *  - percent = furthest point reached (never decreases)
 *  - watched = seconds actually played (seeking doesn't add any)
 *  - completed when the furthest point ≥ VIDEO_COMPLETION.position of the video
 *    AND watched ≥ VIDEO_COMPLETION.watched of its length — so opening the
 *    video or jumping to the end never completes it
 * Returns null when nothing worth saving changed.
 */
export function nextVideoProgress(prev, { position, duration, watchedDelta = 0 }) {
  if (!duration || !Number.isFinite(duration)) return null
  const pos = Math.max(0, Math.min(Math.round(position), Math.round(duration)))
  const watched = Math.min(Math.round(duration), (prev?.watched ?? 0) + Math.max(0, Math.round(watchedDelta)))
  const reached = Math.max(prev?.percent ?? 0, Math.round((pos / duration) * 100))
  const alreadyDone = prev?.status === 'completed'
  const nowDone = !alreadyDone && reached >= VIDEO_COMPLETION.position * 100 && watched >= duration * VIDEO_COMPLETION.watched
  const status = alreadyDone || nowDone ? 'completed' : 'in_progress'
  const percent = status === 'completed' ? 100 : Math.min(reached, 99) // 100% only when truly completed
  const changed =
    !prev ||
    nowDone ||
    Math.abs(pos - (prev.position ?? 0)) >= 3 ||
    watched - (prev.watched ?? 0) >= 3 ||
    percent !== prev.percent
  if (!changed) return null
  return {
    status,
    progress_percent: percent,
    last_position_seconds: pos,
    watched_seconds: watched,
    completed_at: alreadyDone ? prev.completed_at : nowDone ? new Date().toISOString() : null,
    justCompleted: nowDone,
  }
}

/** Saves a player report. Returns the new progress, or null when nothing changed. */
export async function saveVideoProgress(resource, report) {
  if (isPreviewMode) return null
  const next = nextVideoProgress(resource.progress, report)
  if (!next) return null
  const { justCompleted, ...row } = next
  const uid = await currentUserId()
  const { data, error } = await supabase
    .from('learning_progress')
    .upsert({ user_id: uid, resource_id: resource.id, ...row }, { onConflict: 'user_id,resource_id' })
    .select(PROGRESS_COLUMNS)
    .single()
  if (error) throw error
  if (justCompleted) logActivity('completed', resource.id)
  return { ...toProgress(data), justCompleted }
}

/**
 * "Recommended for you": published resources the member hasn't started,
 * preferring categories they've been learning in or saved favorites from,
 * then newest first. Pure function over data already loaded for the dashboard.
 */
export function recommend(catalog, progress, favorites, limit = 3) {
  const startedIds = new Set([...progress.inProgress, ...progress.completed].map((r) => r.id))
  const weight = new Map()
  for (const r of [...progress.inProgress, ...progress.completed]) if (r.category_id) weight.set(r.category_id, (weight.get(r.category_id) ?? 0) + 2)
  for (const r of favorites) if (r.category_id) weight.set(r.category_id, (weight.get(r.category_id) ?? 0) + 1)
  const items = catalog
    .filter((r) => !startedIds.has(r.id))
    .map((r, i) => ({ r, score: weight.get(r.category_id) ?? 0, i }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.r)
  return { items, personalized: weight.size > 0 && items.some((r) => weight.has(r.category_id)) }
}

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */

/** Short-lived URL for playing a video / displaying a PDF inside the portal. */
export async function getViewUrl(resource) {
  if (!resource.storage_path) throw userError('This resource has no file attached yet.', { code: 'no_file' })
  const isVideo = resource.resource_type === 'VIDEO'
  return signUrl(UPLOAD_RULES[resource.resource_type].bucket, resource.storage_path, isVideo ? SIGNED_URL_TTL.VIDEO : SIGNED_URL_TTL.PDF)
}

/** Downloads through a one-minute signed URL that forces "Save as" with a friendly file name. */
export async function downloadResource(resource) {
  if (isPreviewMode) throw userError('Downloads need a connected Supabase project.', { code: 'preview' })
  const ext = resource.storage_path?.match(/\.[^.]+$/)?.[0] ?? (resource.resource_type === 'PDF' ? '.pdf' : '.mp4')
  const name = `${resource.title.replace(/[^\p{L}\p{N} ._-]+/gu, '').trim().slice(0, 100) || 'resource'}${ext}`
  const url = await signUrl(UPLOAD_RULES[resource.resource_type].bucket, resource.storage_path, SIGNED_URL_TTL.DOWNLOAD, { download: name })
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  logActivity('downloaded', resource.id)
}

export function recordView(resource) {
  logActivity(resource.resource_type === 'VIDEO' ? 'watched' : 'viewed', resource.id)
}
