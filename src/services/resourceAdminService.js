/*
 * Basic resource management for administrators.
 * RLS restricts every write here to active admins; Storage RLS does the same for files.
 */
import { supabase, isPreviewMode } from '@/lib/supabase'
import { SIGNED_URL_TTL, UPLOAD_RULES } from '@/config/constants'
import { fullName } from '@/lib/format'
import { userError } from '@/lib/errors'
import { removeFiles, signUrls, uploadResumable } from '@/services/storageService'
import { createCategory as createCategoryRecord } from '@/services/categoryService'
import { safeFileName } from '@/lib/media'

export const ADMIN_RESOURCE_COLUMNS =
  'id, title, description, category_id, resource_type, storage_path, thumbnail_path, file_size, duration_seconds, page_count, status, created_at, updated_at, category:categories(id, name, slug, icon, color), uploader:profiles(first_name, last_name, email)'

const PREVIEW_MESSAGE = 'Uploading and managing files needs a connected Supabase project. Add your keys to .env.local to enable it.'

function shape(r, thumbs) {
  const { uploader, ...rest } = r
  return {
    ...rest,
    is_published: r.status === 'published',
    uploaded_by_name: fullName(uploader) || uploader?.email || '—',
    thumbnail_url: r.thumbnail_path ? thumbs?.get(r.thumbnail_path) ?? null : null,
  }
}

/** Adds signed thumbnail URLs to admin rows. Missing thumbnails never fail the whole list. */
export async function withThumbnails(rows) {
  let thumbs = new Map()
  try {
    thumbs = await signUrls(UPLOAD_RULES.THUMBNAIL.bucket, rows.map((r) => r.thumbnail_path), SIGNED_URL_TTL.THUMBNAIL)
  } catch (err) {
    console.warn('Could not sign thumbnails', err)
  }
  return rows.map((r) => shape(r, thumbs))
}

export const RESOURCE_PAGE_SIZE = 20
const sanitize = (q) => q.replace(/[^\p{L}\p{N}\s'.&-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)

/**
 * One page of resources (drafts included), filtered and counted in the database.
 * category: id, 'none' (uncategorized) or ''. Returns { items, total }.
 */
export async function listResourcesPage({ q = '', type = '', status = '', category = '', page = 0, pageSize = RESOURCE_PAGE_SIZE } = {}) {
  if (isPreviewMode) throw userError(PREVIEW_MESSAGE, { code: 'preview' })
  let query = supabase
    .from('training_resources')
    .select(ADMIN_RESOURCE_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(page * pageSize, page * pageSize + pageSize - 1)
  if (type) query = query.eq('resource_type', type)
  if (status) query = query.eq('status', status)
  if (category === 'none') query = query.is('category_id', null)
  else if (category) query = query.eq('category_id', category)
  const term = sanitize(q)
  if (term) query = query.ilike('title', `%${term}%`)
  const { data, error, count } = await query
  if (error) throw error
  return { items: await withThumbnails(data), total: count ?? data.length }
}

export async function updateResource(id, { title, description, categoryId, status }) {
  const { data, error } = await supabase
    .from('training_resources')
    .update({ title: title.trim(), description: description.trim() || null, category_id: categoryId || null, status })
    .eq('id', id)
    .select(ADMIN_RESOURCE_COLUMNS)
    .single()
  if (error) throw error
  return (await withThumbnails([data]))[0]
}

export async function setResourceStatus(resource, status) {
  return updateResource(resource.id, {
    title: resource.title,
    description: resource.description ?? '',
    categoryId: resource.category_id,
    status,
  })
}

/**
 * Deletes the record first (members lose access instantly), then its files.
 * If file removal fails, the record is still gone and the leftovers show up
 * under "Unused files" for cleanup. Returns { filesRemoved }.
 */
export async function deleteResource(resource) {
  const { data, error } = await supabase
    .from('training_resources')
    .delete()
    .eq('id', resource.id)
    .select('id, resource_type, storage_path, thumbnail_path')
  if (error) throw error
  if (!data?.length) throw userError('This resource no longer exists or you don’t have permission to delete it.')
  const [row] = data
  const [main, thumb] = await Promise.all([
    removeFiles(UPLOAD_RULES[row.resource_type].bucket, [row.storage_path]),
    removeFiles(UPLOAD_RULES.THUMBNAIL.bucket, [row.thumbnail_path]),
  ])
  return { filesRemoved: main && thumb }
}

/** Used by the inline "New category" option on the upload / edit forms. */
export function createCategory(name) {
  return createCategoryRecord({ name })
}

/**
 * Safely replaces a resource's file (same type):
 *   1. upload the new file to a NEW path (resumable, with progress)
 *   2. point the record at it (+ size / duration / pages)
 *   3. delete the old file
 * If step 2 fails the new file is removed, so the resource keeps working on
 * the old file. If step 3 fails the old file is reported as an unused file.
 * Returns { task, done } — task has abort()/retry(); done resolves to the updated resource.
 */
export function replaceResourceFile(resource, { file, contentType, durationSeconds, pageCount, onProgress, onStatus }) {
  const bucket = UPLOAD_RULES[resource.resource_type].bucket
  const task = uploadResumable({
    bucket,
    path: `${resource.id}/${crypto.randomUUID().slice(0, 8)}-${safeFileName(file.name)}`,
    file,
    contentType,
    onProgress,
    onStatus,
  })
  const finish = async ({ path }) => {
    const { data, error } = await supabase
      .from('training_resources')
      .update({
        storage_path: path,
        file_size: file.size,
        ...(resource.resource_type === 'VIDEO' ? { duration_seconds: durationSeconds ?? null } : { page_count: pageCount ?? null }),
      })
      .eq('id', resource.id)
      .select(ADMIN_RESOURCE_COLUMNS)
      .single()
    if (error) {
      await removeFiles(bucket, [path])
      throw userError('The new file uploaded, but the resource couldn’t be updated, so it still uses the previous file.', { cause: error })
    }
    const oldRemoved = resource.storage_path ? await removeFiles(bucket, [resource.storage_path]) : true
    return { resource: (await withThumbnails([data]))[0], oldRemoved }
  }
  return { task, finish }
}

/** Files in the training buckets that no resource uses (older than 1 hour). */
export async function findOrphanedFiles() {
  if (isPreviewMode) return []
  const { data, error } = await supabase.rpc('find_orphaned_training_files')
  if (error) throw error
  return data ?? []
}

export async function removeOrphanedFiles(files) {
  const byBucket = new Map()
  for (const f of files) byBucket.set(f.bucket_id, [...(byBucket.get(f.bucket_id) ?? []), f.name])
  const results = await Promise.all([...byBucket].map(([bucket, names]) => removeFiles(bucket, names)))
  if (results.includes(false)) throw userError('Some files couldn’t be removed. Please try again.')
}
