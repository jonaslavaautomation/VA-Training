/*
 * Private Storage access. Buckets are private; files are reached only via
 * short-lived signed URLs, which Supabase issues only when the Storage RLS
 * policies allow the caller to read the file. Uploads/deletes are admin-only
 * (enforced by Storage RLS, not by this code).
 */
import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase'
import { TUS_CHUNK_SIZE } from '@/config/constants'
import { userError, NETWORK_MESSAGE, SESSION_MESSAGE } from '@/lib/errors'

/* ------------------------------------------------------------------ */
/* Bucket settings                                                     */
/* ------------------------------------------------------------------ */
const bucketCache = new Map()

/** Real bucket limits from Supabase (admins only — RLS). Null when unavailable. */
export async function getBucketSettings(bucket) {
  if (!bucketCache.has(bucket)) {
    bucketCache.set(
      bucket,
      supabase.storage.getBucket(bucket).then(({ data, error }) => {
        if (error || !data) {
          bucketCache.delete(bucket)
          return null
        }
        return { fileSizeLimit: data.file_size_limit ?? null, allowedMimeTypes: data.allowed_mime_types ?? null, isPublic: data.public }
      }),
    )
  }
  return bucketCache.get(bucket)
}

/* ------------------------------------------------------------------ */
/* Uploads                                                             */
/* ------------------------------------------------------------------ */
function uploadErrorMessage(status, body = '') {
  const text = body.toLowerCase()
  if (status === 413 || text.includes('maximum allowed size') || text.includes('payload too large'))
    return 'This file is larger than the storage limit allows. See “Storage limits” in the setup guide.'
  if (text.includes('mime type') || text.includes('invalid_mime_type')) return 'Storage rejected this file type.'
  if (status === 401 || text.includes('jwt') || text.includes('unauthorized')) return SESSION_MESSAGE
  if (status === 403 || text.includes('row-level security')) return 'You don’t have permission to upload files.'
  if (status === 409 || text.includes('already exists')) return 'A file with this name already exists. Please try again.'
  if (status === 429) return 'Too many uploads right now. Please wait a moment and retry.'
  return 'The upload failed. Check your connection and retry.'
}

/**
 * Resumable (TUS) upload with progress, automatic retries and manual retry.
 * The access token is refreshed before every request, so multi-hour uploads
 * don't fail when the session token rotates.
 *
 * Returns { done: Promise<{ path }>, abort(), retry() }.
 * After a page reload, re-selecting the same file resumes where it stopped
 * (Supabase keeps unfinished uploads for 24 hours).
 */
export function uploadResumable({ bucket, path, file, contentType, onProgress, onStatus }) {
  let resolveDone
  let rejectDone
  const done = new Promise((resolve, reject) => {
    resolveDone = resolve
    rejectDone = reject
  })
  let objectName = path
  let upload = null
  let aborted = false

  // tus-js-client is loaded only when an upload actually starts (keeps it out of the member bundle).
  const create = (Upload) => new Upload(file, {
    endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
    chunkSize: TUS_CHUNK_SIZE,
    retryDelays: [0, 2000, 5000, 10000, 20000],
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    headers: { apikey: supabaseAnonKey, 'x-upsert': 'false' },
    metadata: { bucketName: bucket, objectName: path, contentType, cacheControl: '3600' },
    async onBeforeRequest(req) {
      const { data } = await supabase.auth.getSession()
      if (data.session) req.setHeader('Authorization', `Bearer ${data.session.access_token}`)
    },
    onProgress: (sent, total) => onProgress?.(total ? Math.min(100, Math.round((sent / total) * 100)) : 0, sent, total),
    onShouldRetry(err, retryAttempt, options) {
      const status = err?.originalResponse?.getStatus?.()
      if (status && status >= 400 && status < 500 && ![408, 409, 423, 429].includes(status)) return false
      onStatus?.(`Connection problem — retrying (${retryAttempt + 1}/${options.retryDelays.length})…`)
      return true
    },
    onSuccess: () => resolveDone({ path: objectName }),
    onError(err) {
      const res = err?.originalResponse
      const status = res?.getStatus?.()
      const message = !status && !navigator.onLine ? NETWORK_MESSAGE : uploadErrorMessage(status, res?.getBody?.() ?? '')
      console.error('Upload failed', err)
      rejectDone(userError(message, { code: status ? `upload_${status}` : 'upload_failed', cause: err }))
    },
  })

  const start = async () => {
    try {
      const { Upload } = await import('tus-js-client')
      if (aborted) return
      upload = create(Upload)
    } catch (err) {
      rejectDone(userError(NETWORK_MESSAGE, { code: 'upload_failed', cause: err }))
      return
    }
    // Resume an unfinished upload of this exact file into the same bucket, keeping its object name.
    const previous = (await upload.findPreviousUploads()).find((p) => p.metadata?.bucketName === bucket)
    if (previous) {
      objectName = previous.metadata.objectName
      upload.options.metadata.objectName = objectName
      upload.resumeFromPreviousUpload(previous)
      onStatus?.('Resuming previous upload…')
    }
    upload.start()
  }
  start()

  return {
    get done() { return done },
    abort: () => {
      aborted = true
      return upload?.abort(true).catch(() => {})
    },
    /** Continues a failed upload from the last confirmed byte. */
    retry() {
      const next = new Promise((resolve, reject) => {
        resolveDone = resolve
        rejectDone = reject
      })
      if (upload) upload.start()
      else start()
      return next
    },
  }
}

/** Plain upload for small files (thumbnails). */
export async function uploadSmall({ bucket, path, blob, contentType }) {
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: false, cacheControl: '3600' })
  if (error) throw userError(uploadErrorMessage(Number(error.statusCode) || error.status, error.message), { cause: error })
  return { path }
}

/** Best effort: returns false (and logs) instead of throwing, so callers can report partial failures. */
export async function removeFiles(bucket, paths) {
  const list = paths.filter(Boolean)
  if (!list.length) return true
  const { error } = await supabase.storage.from(bucket).remove(list)
  if (error) {
    console.error(`Could not delete files from ${bucket}`, error)
    return false
  }
  return true
}

/* ------------------------------------------------------------------ */
/* Signed URLs                                                         */
/* ------------------------------------------------------------------ */
const urlCache = new Map() // `${bucket}/${path}` → { url, expiresAt }
const fresh = (entry, ttl) => entry && entry.expiresAt - Date.now() > Math.min(ttl * 250, 5 * 60 * 1000) // >25% or 5 min left

/** Signs many paths in one request (e.g. thumbnails on a grid). Returns Map path → url. */
export async function signUrls(bucket, paths, ttl) {
  const result = new Map()
  const missing = []
  for (const p of new Set(paths.filter(Boolean))) {
    const hit = urlCache.get(`${bucket}/${p}`)
    if (fresh(hit, ttl)) result.set(p, hit.url)
    else missing.push(p)
  }
  if (missing.length) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(missing, ttl)
    if (error) throw error
    const expiresAt = Date.now() + ttl * 1000
    for (const item of data ?? []) {
      if (item.error || !item.signedUrl) continue // not readable by this user (e.g. unpublished)
      urlCache.set(`${bucket}/${item.path}`, { url: item.signedUrl, expiresAt })
      result.set(item.path, item.signedUrl)
    }
  }
  return result
}

/** Signs one path. `download` = filename → the browser downloads instead of displaying. Not cached. */
export async function signUrl(bucket, path, ttl, { download } = {}) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttl, download ? { download } : undefined)
  if (error || !data?.signedUrl) {
    throw userError('This file isn’t available. It may have been unpublished or removed.', { code: 'file_unavailable', cause: error })
  }
  return data.signedUrl
}
