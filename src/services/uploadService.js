/*
 * Upload pipeline for new training resources (admin only).
 *
 *   1. beginFileUpload  → resumable upload of the PDF/video into its private bucket
 *   2. saveResource     → thumbnail upload + training_resources row
 *
 * Order matters for integrity: the database row is written only after the
 * file is safely stored, and if writing the row fails the uploaded files
 * are deleted again — so there are no records pointing at missing files.
 * (If the browser closes between steps, the leftover file is reported by
 * "Unused files" on the Manage Resources page.)
 */
import { supabase } from '@/lib/supabase'
import { UPLOAD_RULES } from '@/config/constants'
import { safeFileName } from '@/lib/media'
import { userError } from '@/lib/errors'
import { removeFiles, uploadResumable, uploadSmall } from '@/services/storageService'
import { ADMIN_RESOURCE_COLUMNS } from '@/services/resourceAdminService'

const THUMB_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/** Starts the resumable upload. Returns { resourceId, task } — task has done / abort() / retry(). */
export function beginFileUpload({ kind, file, contentType, onProgress, onStatus }) {
  const resourceId = crypto.randomUUID()
  const task = uploadResumable({
    bucket: UPLOAD_RULES[kind].bucket,
    path: `${resourceId}/${safeFileName(file.name)}`,
    file,
    contentType,
    onProgress,
    onStatus,
  })
  return { resourceId, task }
}

/**
 * Creates the database record for an uploaded file.
 * A failed thumbnail upload doesn't block the resource (thumbnailFailed = true);
 * a failed record insert removes every uploaded file and throws.
 */
export async function saveResource({ resourceId, kind, path, file, title, description, categoryId, status, thumbnail, durationSeconds, pageCount, audience = 'library' }) {
  let thumbnailPath = null
  let thumbnailFailed = false
  if (thumbnail) {
    try {
      const type = thumbnail.type || 'image/jpeg'
      const res = await uploadSmall({
        bucket: UPLOAD_RULES.THUMBNAIL.bucket,
        path: `${resourceId}/thumbnail-${Date.now()}.${THUMB_EXT[type] ?? 'jpg'}`,
        blob: thumbnail,
        contentType: type,
      })
      thumbnailPath = res.path
    } catch (err) {
      console.error('Thumbnail upload failed', err)
      thumbnailFailed = true
    }
  }

  const { data, error } = await supabase
    .from('training_resources')
    .insert({
      id: resourceId,
      title: title.trim(),
      description: description?.trim() || null,
      category_id: categoryId || null,
      resource_type: kind,
      storage_path: path,
      thumbnail_path: thumbnailPath,
      file_size: file.size,
      duration_seconds: durationSeconds ?? null,
      page_count: pageCount ?? null,
      status,
      audience,
    })
    .select(ADMIN_RESOURCE_COLUMNS)
    .single()

  if (error) {
    console.error('Saving resource failed — removing uploaded files', error)
    await removeFiles(UPLOAD_RULES[kind].bucket, [path])
    if (thumbnailPath) await removeFiles(UPLOAD_RULES.THUMBNAIL.bucket, [thumbnailPath])
    throw userError('The file uploaded, but the resource couldn’t be saved, so the upload was discarded. Please try again.', { cause: error })
  }
  return { resource: data, thumbnailFailed }
}
