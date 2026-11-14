/*
 * Announcements.
 * Admins: full CRUD (RLS). Members: only published announcements whose
 * scheduled time has arrived (RLS evaluates this at read time — no cron).
 * Images live in the private `announcement-images` bucket and are shown via
 * short-lived signed URLs. Status changes are audited by a database trigger.
 */
import { supabase, isPreviewMode } from '@/lib/supabase'
import { SIGNED_URL_TTL, UPLOAD_RULES } from '@/config/constants'
import { userError } from '@/lib/errors'
import { removeFiles, signUrls, uploadSmall } from '@/services/storageService'

export const ANNOUNCEMENT_BUCKET = 'announcement-images'
const COLUMNS = 'id, title, content, status, image_path, publish_at, published_at, created_at, updated_at, author:profiles(first_name, last_name, email)'
const MEMBER_COLUMNS = 'id, title, content, image_path, publish_at, published_at, created_at'
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/** 'scheduled' is a derived state: published with a future publish_at. */
export function displayStatus(a) {
  if (a.status === 'published' && a.publish_at && new Date(a.publish_at) > new Date()) return 'scheduled'
  return a.status
}

async function withImages(rows) {
  const paths = rows.map((r) => r.image_path).filter(Boolean)
  if (!paths.length) return rows.map((r) => ({ ...r, image_url: null }))
  let urls = new Map()
  try {
    urls = await signUrls(ANNOUNCEMENT_BUCKET, paths, SIGNED_URL_TTL.THUMBNAIL)
  } catch (err) {
    console.warn('Could not sign announcement images', err)
  }
  return rows.map((r) => ({ ...r, image_url: r.image_path ? urls.get(r.image_path) ?? null : null }))
}

/* ------------------------------ members ------------------------------ */

/** Live announcements for members, newest first. */
export async function listLiveAnnouncements({ limit } = {}) {
  if (isPreviewMode) return []
  let query = supabase.from('announcements').select(MEMBER_COLUMNS).eq('status', 'published').order('published_at', { ascending: false, nullsFirst: false })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  if (error) throw error
  // RLS already hides scheduled rows from members; this also hides them for admins browsing the member portal.
  return withImages(data.filter((a) => !a.publish_at || new Date(a.publish_at) <= new Date()))
}

/* ------------------------------- admins ------------------------------ */

export async function listAnnouncementsAdmin() {
  if (isPreviewMode) throw userError('Announcements need a connected Supabase project.', { code: 'preview' })
  const { data, error } = await supabase.from('announcements').select(COLUMNS).order('created_at', { ascending: false })
  if (error) throw error
  return withImages(data)
}

async function uploadImage(file) {
  const type = file.type in EXT ? file.type : 'image/jpeg'
  const { path } = await uploadSmall({ bucket: ANNOUNCEMENT_BUCKET, path: `${crypto.randomUUID()}/image.${EXT[type]}`, blob: file, contentType: type })
  return path
}

/**
 * Create or update. `image`: File to set a new image, null to remove it, undefined to keep it.
 * The image is uploaded first; if saving the row fails the new image is removed again.
 * The replaced/removed image is deleted after a successful save.
 */
export async function saveAnnouncement(existing, { title, content, status, publishAt, image }) {
  let newPath
  if (image instanceof Blob) {
    if (image.size > UPLOAD_RULES.THUMBNAIL.maxSizeMB * 1024 * 1024) throw userError(`Images must be ${UPLOAD_RULES.THUMBNAIL.maxSizeMB} MB or smaller.`)
    newPath = await uploadImage(image)
  }
  const row = {
    title: title.trim(),
    content: content.trim(),
    status,
    publish_at: status === 'published' && publishAt ? new Date(publishAt).toISOString() : null,
    ...(image !== undefined ? { image_path: newPath ?? null } : {}),
  }
  const query = existing
    ? supabase.from('announcements').update(row).eq('id', existing.id)
    : supabase.from('announcements').insert(row)
  const { data, error } = await query.select(COLUMNS).single()
  if (error) {
    if (newPath) await removeFiles(ANNOUNCEMENT_BUCKET, [newPath])
    throw error
  }
  if (existing?.image_path && image !== undefined && existing.image_path !== data.image_path) {
    await removeFiles(ANNOUNCEMENT_BUCKET, [existing.image_path])
  }
  return (await withImages([data]))[0]
}

/** Publish now / unpublish (back to draft) / archive. */
export async function setAnnouncementStatus(announcement, status) {
  const patch = { status }
  // Publishing from the list means "now" — a past or future schedule is cleared.
  if (status === 'published') patch.publish_at = null
  const { data, error } = await supabase.from('announcements').update(patch).eq('id', announcement.id).select(COLUMNS).single()
  if (error) throw error
  return (await withImages([data]))[0]
}

export async function deleteAnnouncement(announcement) {
  const { data, error } = await supabase.from('announcements').delete().eq('id', announcement.id).select('id, image_path')
  if (error) throw error
  if (!data?.length) throw userError('This announcement no longer exists or you don’t have permission to delete it.')
  if (data[0].image_path) await removeFiles(ANNOUNCEMENT_BUCKET, [data[0].image_path]) // leftovers appear under "unused files"
}
