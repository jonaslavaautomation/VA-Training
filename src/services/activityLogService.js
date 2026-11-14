/*
 * Activity log reader (admins see everything via RLS).
 * Admin-action rows are written only by database triggers and the
 * admin-members Edge Function; browsers can't create or alter them.
 */
import { supabase, isPreviewMode } from '@/lib/supabase'
import { fullName } from '@/lib/format'
import { ADMIN_ACTIVITY_TYPES, MEMBER_ACTIVITY_TYPES } from '@/config/activity'
import { previewAdmin } from '@/mocks/previewServices'

export const LOG_PAGE_SIZE = 25
const COLUMNS = 'id, activity_type, target_type, target_id, target_label, details, created_at, actor:profiles(first_name, last_name, email, role), resource:training_resources(title)'

const sanitize = (q) => q.replace(/[^\p{L}\p{N}\s@._'+-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)

function shape(row) {
  return {
    ...row,
    actor_name: row.actor ? fullName(row.actor) || row.actor.email : 'System',
    actor_email: row.actor?.email ?? null,
    target: row.target_label ?? row.resource?.title ?? null,
  }
}

/**
 * Filters: scope ('admin'|'member'|''), type (exact activity_type), q (affected record text),
 * from / to (YYYY-MM-DD, inclusive). Returns { items, total }.
 */
export async function listActivity({ scope = '', type = '', q = '', from = '', to = '', page = 0, pageSize = LOG_PAGE_SIZE } = {}) {
  let query = supabase
    .from('activity_logs')
    .select(COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(page * pageSize, page * pageSize + pageSize - 1)
  if (type) query = query.eq('activity_type', type)
  else if (scope === 'admin') query = query.in('activity_type', ADMIN_ACTIVITY_TYPES)
  else if (scope === 'member') query = query.in('activity_type', MEMBER_ACTIVITY_TYPES)
  const term = sanitize(q)
  if (term) query = query.ilike('target_label', `%${term}%`)
  if (from) query = query.gte('created_at', new Date(`${from}T00:00:00`).toISOString())
  if (to) query = query.lt('created_at', new Date(new Date(`${to}T00:00:00`).getTime() + 86400000).toISOString())
  const { data, error, count } = await query
  if (error) throw error
  return { items: data.map(shape), total: count ?? data.length }
}

/** Latest administrative actions for the admin dashboard. */
export async function listRecentAdminActions(limit = 8) {
  if (isPreviewMode) return previewAdmin.getRecentAdminActions(limit)
  const { data, error } = await supabase
    .from('activity_logs')
    .select(COLUMNS)
    .in('activity_type', ADMIN_ACTIVITY_TYPES)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data.map(shape)
}
