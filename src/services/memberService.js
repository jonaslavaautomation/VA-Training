/*
 * Member management data-access layer (admin only).
 *
 * Reads go straight to Supabase — RLS returns every profile, progress row and
 * favorite only to active admins; sign-in times come from the admin-only
 * admin_member_auth_info() function. Every write goes through the
 * `admin-members` Edge Function, which re-checks the caller's admin role
 * server-side, is the only code that holds the service-role key, and writes
 * the audit log.
 */
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { supabase, isPreviewMode } from '@/lib/supabase'
import { NETWORK_MESSAGE, userError } from '@/lib/errors'
import { PROFILE_COLUMNS } from '@/services/authService'
import { previewAdmin } from '@/mocks/previewServices'

const PREVIEW_MESSAGE = 'Member management needs a connected Supabase project. Add your keys to .env.local to enable it.'
export const MEMBER_PAGE_SIZE = 20
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Letters, digits and a little punctuation only, so the term is safe inside a PostgREST or() filter. */
const sanitize = (q) => q.replace(/[^\p{L}\p{N}\s@._'+-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)

async function withAuthInfo(rows) {
  if (!rows.length) return rows
  const { data, error } = await supabase.rpc('admin_member_auth_info', { p_ids: rows.map((r) => r.id) })
  if (error || !Array.isArray(data)) {
    // Sign-in times are informational: the list still works without them (shown as "—").
    if (error) console.warn('Sign-in info unavailable', error)
    return rows.map((r) => ({ ...r, last_sign_in_at: undefined }))
  }
  const byId = new Map(data.map((a) => [a.id, a]))
  return rows.map((r) => ({
    ...r,
    last_sign_in_at: byId.get(r.id)?.last_sign_in_at ?? null,
    invited_at: byId.get(r.id)?.invited_at ?? null,
  }))
}

/**
 * Paged member directory.
 * Filters: q (name or email), status ('active'|'inactive'), role ('admin'|'member'), sort ('newest'|'oldest').
 * Returns { items, total, counts: { all, active, inactive } }. `page` is 0-based.
 */
export async function listMembersPage({ q = '', status = '', role = '', sort = 'newest', page = 0, pageSize = MEMBER_PAGE_SIZE } = {}) {
  if (isPreviewMode) throw userError(PREVIEW_MESSAGE, { code: 'preview' })
  const term = sanitize(q)
  const base = (columns, opts) => {
    let query = supabase.from('profiles').select(columns, opts)
    if (role) query = query.eq('role', role)
    if (term) {
      const words = term.split(' ').slice(0, 3)
      // Every word must match first name, last name or email ("maria santos" finds Maria Santos).
      for (const w of words) query = query.or(`first_name.ilike.%${w}%,last_name.ilike.%${w}%,email.ilike.%${w}%`)
    }
    return query
  }
  let pageQuery = base(PROFILE_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: sort === 'oldest' })
    .order('id', { ascending: true })
    .range(page * pageSize, page * pageSize + pageSize - 1)
  if (status) pageQuery = pageQuery.eq('status', status)
  const countFor = (s) => base('id', { count: 'exact', head: true }).eq('status', s)

  const [pageRes, active, inactive] = await Promise.all([pageQuery, countFor('active'), countFor('inactive')])
  for (const r of [pageRes, active, inactive]) if (r.error) throw r.error
  return {
    items: await withAuthInfo(pageRes.data),
    total: pageRes.count ?? pageRes.data.length,
    counts: { all: (active.count ?? 0) + (inactive.count ?? 0), active: active.count ?? 0, inactive: inactive.count ?? 0 },
  }
}

/** Everything an admin may see about one member. */
export async function getMemberDetails(id) {
  if (isPreviewMode) throw userError(PREVIEW_MESSAGE, { code: 'preview' })
  if (!UUID_RE.test(id)) return null
  const resourceCols = 'id, title, resource_type, status, category:categories(name)'
  const [profileRes, progressRes, favoritesRes, activityRes] = await Promise.all([
    supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle(),
    supabase
      .from('learning_progress')
      .select(`status, progress_percent, last_position_seconds, completed_at, updated_at, resource:training_resources(${resourceCols})`)
      .eq('user_id', id)
      .order('updated_at', { ascending: false }),
    supabase.from('favorites').select(`created_at, resource:training_resources(${resourceCols})`).eq('user_id', id).order('created_at', { ascending: false }),
    supabase
      .from('activity_logs')
      .select('id, activity_type, created_at, resource:training_resources(title)')
      .eq('user_id', id)
      .is('target_type', null)
      .order('created_at', { ascending: false })
      .limit(10),
  ])
  for (const r of [profileRes, progressRes, favoritesRes, activityRes]) if (r.error) throw r.error
  if (!profileRes.data) return null
  const [profile] = await withAuthInfo([profileRes.data])
  const progress = progressRes.data.filter((p) => p.resource)
  return {
    profile,
    started: progress.filter((p) => p.status !== 'completed'),
    completed: progress.filter((p) => p.status === 'completed'),
    favorites: favoritesRes.data.filter((f) => f.resource),
    activity: activityRes.data,
  }
}

/** Counts of member-role accounts. */
export async function getMemberStats() {
  if (isPreviewMode) return previewAdmin.getMemberStats()
  const count = (status) => {
    let q = supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'member')
    if (status) q = q.eq('status', status)
    return q
  }
  const [total, active, inactive] = await Promise.all([count(), count('active'), count('inactive')])
  for (const r of [total, active, inactive]) if (r.error) throw r.error
  return { totalMembers: total.count ?? 0, activeMembers: active.count ?? 0, inactiveMembers: inactive.count ?? 0 }
}

export async function listRecentRegistrations(limit = 5) {
  if (isPreviewMode) return previewAdmin.listRecentRegistrations(limit)
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('role', 'member')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

/** Creates the auth account + profile. Active accounts get an invitation email. Returns { member, invited }. */
export async function createMember({ firstName, lastName, email, phone, role = 'member', status = 'active' }) {
  return invoke('create', { first_name: firstName, last_name: lastName, email, phone: phone || null, role, status })
}

export async function updateMember(userId, { firstName, lastName, email, phone, role }) {
  const { member } = await invoke('update', { user_id: userId, first_name: firstName, last_name: lastName, email, phone: phone ?? undefined, role })
  return member
}

/** status: 'active' | 'inactive'. Deactivation also blocks sign-in server-side; progress is kept. */
export async function setMemberStatus(userId, status) {
  const { member } = await invoke('set_status', { user_id: userId, status })
  return member
}

/** Re-sends the invitation (never signed in) or a password reset. Returns 'invite' | 'recovery'. */
export async function sendAccessEmail(userId) {
  const { sent } = await invoke('send_access_email', { user_id: userId })
  return sent
}

async function invoke(action, params) {
  if (isPreviewMode) throw userError(PREVIEW_MESSAGE, { code: 'preview' })
  const { data, error } = await supabase.functions.invoke('admin-members', { body: { action, ...params } })
  if (!error) return data

  if (error instanceof FunctionsHttpError) {
    // The function only returns messages written for admins (no internals).
    let payload = null
    try { payload = await error.context.json() } catch { /* non-JSON response */ }
    const status = error.context?.status
    if (payload?.error?.message) throw userError(payload.error.message, { code: payload.error.code, cause: error })
    if (status === 401) throw userError('Your session has expired. Please sign in again.', { code: 'unauthorized', cause: error })
    if (status === 404) throw userError('Member management is not deployed yet (admin-members Edge Function not found).', { code: 'not_deployed', cause: error })
  }
  if (error instanceof FunctionsFetchError) throw userError(NETWORK_MESSAGE, { code: 'network', cause: error })
  console.error('admin-members failed', error)
  throw userError('Something went wrong. Please try again.', { cause: error })
}
