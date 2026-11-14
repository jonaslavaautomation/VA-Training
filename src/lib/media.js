import { UPLOAD_RULES } from '@/config/constants'
import { formatFileSize } from '@/lib/format'

/** File signatures — the first bytes prove the real format, whatever the name says. */
async function sniff(file) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const ascii = (from, to) => String.fromCharCode(...bytes.slice(from, to))
  if (ascii(0, 5) === '%PDF-') return 'application/pdf'
  if (ascii(4, 8) === 'ftyp') return 'video/mp4'
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'video/webm'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (ascii(1, 4) === 'PNG') return 'image/png'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  return null
}

const extensionOf = (name) => (name.match(/\.[^.]+$/)?.[0] ?? '').toLowerCase()

/**
 * Validates type (extension + browser MIME + file signature) and size.
 * Returns an error message, or undefined when the file is acceptable.
 */
export async function validateUploadFile(file, kind, limitBytes) {
  const rule = UPLOAD_RULES[kind]
  if (!file) return 'Choose a file to upload.'
  const ext = extensionOf(file.name)
  if (!rule.extensions.includes(ext)) return `${rule.label}s must be ${rule.extensions.join(', ').toUpperCase()} files.`
  if (file.type && !rule.accept.includes(file.type)) return `This file type (${file.type}) isn’t allowed. Use ${rule.extensions.join(', ').toUpperCase()}.`
  if (file.size === 0) return 'This file is empty.'
  if (file.size > limitBytes) return `This file is ${formatFileSize(file.size)}. The maximum is ${formatFileSize(limitBytes)}.`
  const actual = await sniff(file)
  if (!actual || !rule.accept.includes(actual)) return 'The file’s contents don’t match its type. It may be damaged or renamed.'
  return undefined
}

/** MIME type to store, based on the verified signature (never trust file.type alone). */
export async function detectContentType(file) {
  return (await sniff(file)) ?? file.type
}

/** Storage-safe object name: keeps the readable base name, drops anything unusual. */
export function safeFileName(name) {
  const ext = extensionOf(name)
  const base = name.slice(0, name.length - ext.length)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80)
  return `${base || 'file'}${ext}`
}

/** Loads a local video file into a detached <video> element. Caller must call cleanup(). */
export function loadLocalVideo(file) {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.src = url
  const cleanup = () => { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url) }
  const ready = new Promise((resolve, reject) => {
    video.onloadeddata = () => resolve(video)
    video.onerror = () => reject(new Error('This video can’t be played in the browser. Use MP4 (H.264/AAC) or WebM.'))
  })
  return { video, ready, cleanup }
}

/** Seeks a loaded video and returns that frame as a JPEG Blob. */
export async function captureFrame(video, time, width = 960) {
  await new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01 && video.readyState >= 2) return resolve()
    video.onseeked = () => resolve()
    video.currentTime = time
  })
  const scale = Math.min(1, width / (video.videoWidth || width))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round((video.videoWidth || width) * scale)
  canvas.height = Math.round((video.videoHeight || width * 0.5625) * scale)
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
  return new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
}

/** Duration in whole seconds, or null when the file doesn't declare one (e.g. some WebM recordings). */
export function videoDuration(video) {
  return Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration) : null
}
