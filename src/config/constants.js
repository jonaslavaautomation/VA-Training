export const APP_NAME = 'VA Training Academy'

export const RESOURCE_TYPES = { PDF: 'PDF', VIDEO: 'VIDEO' }

const MB = 1024 * 1024

/**
 * Project-wide Supabase upload limit (Dashboard → Storage → Settings).
 * Free plan: 50 MB maximum. Paid plans: raise it there, then set
 * VITE_MAX_UPLOAD_MB to the same value so the UI validates correctly.
 */
export const PROJECT_UPLOAD_LIMIT_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 50

/**
 * Upload rules — mirrored by the bucket settings in
 * supabase/migrations/20261115100000_training_storage.sql (Storage enforces them too).
 * `maxSizeMB` is the bucket limit; the effective limit is the lower of that
 * and PROJECT_UPLOAD_LIMIT_MB (see effectiveLimitBytes).
 */
export const UPLOAD_RULES = {
  PDF: { label: 'PDF document', bucket: 'training-pdfs', accept: ['application/pdf'], extensions: ['.pdf'], maxSizeMB: 50 },
  VIDEO: { label: 'Training video', bucket: 'training-videos', accept: ['video/mp4', 'video/webm'], extensions: ['.mp4', '.webm'], maxSizeMB: 2048 },
  THUMBNAIL: { label: 'Thumbnail image', bucket: 'resource-thumbnails', accept: ['image/jpeg', 'image/png', 'image/webp'], extensions: ['.jpg', '.jpeg', '.png', '.webp'], maxSizeMB: 5 },
}

export function effectiveLimitBytes(rule, bucketLimitBytes) {
  const bucket = bucketLimitBytes || rule.maxSizeMB * MB
  return Math.min(bucket, PROJECT_UPLOAD_LIMIT_MB * MB)
}

/** Lifetimes (seconds) of signed URLs. Short on purpose; players refresh them when needed. */
export const SIGNED_URL_TTL = {
  THUMBNAIL: 60 * 60, // list views; cached client-side until shortly before expiry
  VIDEO: 60 * 60, // the player silently re-signs and resumes if it expires mid-lesson
  PDF: 5 * 60, // the viewer downloads the whole document right away
  DOWNLOAD: 60, // used immediately by the browser
}

/** PDFs and videos upload through resumable TUS in chunks of exactly 6 MB — the size Supabase requires. */
export const TUS_CHUNK_SIZE = 6 * MB

/** Video completion rule: furthest point ≥ 90% of the video AND ≥ 70% of its length actually played. */
export const VIDEO_COMPLETION = { position: 0.9, watched: 0.7 }

/** Training Library page size ("Load more" fetches the next page). */
export const LIBRARY_PAGE_SIZE = 12
