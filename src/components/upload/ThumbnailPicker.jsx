import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Camera, ImagePlus, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { captureFrame, loadLocalVideo, validateUploadFile, videoDuration } from '@/lib/media'
import { effectiveLimitBytes, UPLOAD_RULES } from '@/config/constants'

function useObjectUrl(blob) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!blob) return setUrl(null)
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

/**
 * Thumbnail chooser.
 *  - Video: scrub to any frame and use it, or upload an image. Also reports the
 *    video's duration and whether the browser can decode it (onMeta).
 *  - PDF: shows the auto-generated cover; an image can replace it.
 */
export default function ThumbnailPicker({ videoFile, value, onChange, onMeta, disabled }) {
  const videoRef = useRef(null)
  const imageInput = useRef(null)
  const [state, setState] = useState(videoFile ? 'loading' : 'ready') // loading | ready | unplayable
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [capturing, setCapturing] = useState(false)
  const [imageError, setImageError] = useState('')
  const preview = useObjectUrl(value?.blob)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onMetaRef = useRef(onMeta)
  onMetaRef.current = onMeta

  // Load the local video, report metadata and auto-pick a frame at 10%.
  useEffect(() => {
    if (!videoFile) return
    let cancelled = false
    const { video, ready, cleanup } = loadLocalVideo(videoFile)
    videoRef.current = video
    setState('loading')
    ready
      .then(async () => {
        if (cancelled) return
        const d = videoDuration(video)
        setDuration(d || 0)
        onMetaRef.current?.({ durationSeconds: d, playable: true })
        const t = d ? Math.min(d * 0.1, 30) : 0
        setTime(t)
        const blob = await captureFrame(video, t)
        if (!cancelled && blob) onChangeRef.current({ blob, source: 'frame' })
        if (!cancelled) setState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setState('unplayable')
        onMetaRef.current?.({ durationSeconds: null, playable: false })
      })
    return () => { cancelled = true; cleanup(); videoRef.current = null }
  }, [videoFile])

  async function pickFrame() {
    if (!videoRef.current) return
    setCapturing(true)
    try {
      const blob = await captureFrame(videoRef.current, time)
      if (blob) onChange({ blob, source: 'frame' })
    } finally {
      setCapturing(false)
    }
  }

  async function onImage(file) {
    if (!file) return
    const problem = await validateUploadFile(file, 'THUMBNAIL', effectiveLimitBytes(UPLOAD_RULES.THUMBNAIL))
    setImageError(problem || '')
    if (!problem) onChange({ blob: file, source: 'image' })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 sm:w-56">
          {preview ? (
            <img src={preview} alt="Selected thumbnail" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              {state === 'loading' ? <Spinner className="h-5 w-5 text-lava-500" /> : 'No thumbnail'}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {videoFile && state === 'ready' && duration > 0 && (
            <div>
              <label htmlFor="frame-time" className="text-xs font-medium text-slate-600">Choose a frame</label>
              <input
                id="frame-time"
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={time}
                disabled={disabled}
                onChange={(e) => setTime(Number(e.target.value))}
                className="mt-1 w-full accent-navy-900"
              />
              <Button size="sm" variant="secondary" onClick={pickFrame} loading={capturing} disabled={disabled}>
                <Camera className="h-4 w-4" /> Use frame at {Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, '0')}
              </Button>
            </div>
          )}
          {state === 'unplayable' && (
            <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              This browser can’t decode the video, so members’ browsers may not play it either. MP4 with H.264 video and AAC audio works everywhere. You can still upload an image thumbnail.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => imageInput.current?.click()} disabled={disabled}>
              <ImagePlus className="h-4 w-4" /> Upload image
            </Button>
            {value && (
              <Button size="sm" variant="ghost" onClick={() => onChange(null)} disabled={disabled}>
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
            <input
              ref={imageInput}
              type="file"
              accept={UPLOAD_RULES.THUMBNAIL.accept.join(',')}
              className="sr-only"
              tabIndex={-1}
              aria-label="Choose thumbnail image"
              onChange={(e) => { onImage(e.target.files?.[0]); e.target.value = '' }}
            />
          </div>
          <p className="text-xs text-slate-500">JPG, PNG or WebP · max {UPLOAD_RULES.THUMBNAIL.maxSizeMB} MB · 16:9 looks best.</p>
          {imageError && <p className="text-xs text-red-600">{imageError}</p>}
        </div>
      </div>
    </div>
  )
}
