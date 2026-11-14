/*
 * Admin data-access layer.
 * Supabase queries that RLS restricts to active administrators.
 * In preview mode (no Supabase env vars) the sample-data versions are used.
 */
import { supabase, isPreviewMode } from '@/lib/supabase'
import { fullName } from '@/lib/format'
import { previewAdmin as preview } from '@/mocks/previewServices'
import { getMemberStats } from '@/services/memberService'

export { listRecentRegistrations } from '@/services/memberService'

async function getResourceCounts() {
  if (isPreviewMode) return preview.getResourceCounts()
  const count = (column, value) => supabase.from('training_resources').select('id', { count: 'exact', head: true }).eq(column, value)
  const results = await Promise.all([count('resource_type', 'PDF'), count('resource_type', 'VIDEO'), count('status', 'published'), count('status', 'draft')])
  for (const r of results) if (r.error) throw r.error
  const [pdf, video, published, draft] = results.map((r) => r.count ?? 0)
  return { pdfCount: pdf, videoCount: video, publishedCount: published, draftCount: draft, resourceTotal: pdf + video }
}

export async function getAdminStats() {
  const [members, resources] = await Promise.all([getMemberStats(), getResourceCounts()])
  return { ...members, ...resources }
}

/** Includes drafts — admins see everything. */
export async function getRecentUploads(limit = 6) {
  if (isPreviewMode) return preview.getRecentUploads(limit)
  const { data, error } = await supabase
    .from('training_resources')
    .select('id, title, resource_type, status, created_at, category:categories(id, name), uploader:profiles(first_name, last_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data.map(({ uploader, ...r }) => ({
    ...r,
    is_published: r.status === 'published',
    uploaded_by_name: fullName(uploader) || uploader?.email || '—',
  }))
}

export { listRecentAdminActions } from '@/services/activityLogService'
