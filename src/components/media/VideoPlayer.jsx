import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Maximize, Minimize, Pause, Play, RotateCcw, Volume1, Volume2, VolumeX } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
import { clock } from '@/lib/format'

const PROGRESS_INTERVAL = 15 // seconds of playback between progress saves (keeps DB writes low)

/**
 * Responsive video player for private files.
 * `getUrl()` returns a short-lived signed URL; if it expires mid-lesson the
 * player fetches a fresh one and resumes at the same position.
 *
 * `startAt` resumes a previous session. `onProgress({ position, duration,
 * watchedDelta, ended })` fires every 15 s of playback, on pause/end, when the
 * tab is hidden and when leaving the page. `watchedDelta` counts only seconds
 * actually played since the last report — seeking adds nothing.
 */
export default function VideoPlayer({ getUrl, poster, title, knownDuration, startAt = 0, onFirstPlay, onProgress }) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const resumeAt = useRef(startAt)
  const refreshes = useRef(0)
  const lastSaved = useRef(0)
  const started = useRef(false)
  const hideTimer = useRef(null)
  const position = useRef({ time: startAt, duration: knownDuration || 0 }) // survives unmount (the video ref doesn't)
  const watchedAcc = useRef(0)
  const lastTick = useRef(null)

  const [src, setSrc] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(startAt)
  const [duration, setDuration] = useState(knownDuration || 0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      setSrc(await getUrl())
    } catch (err) {
      setError(err.userMessage || 'This video couldn’t be loaded. Please try again.')
      setLoading(false)
    }
  }, [getUrl])

  useEffect(() => { load() }, [load])

  const knownDurationRef = useRef(knownDuration)
  knownDurationRef.current = knownDuration
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress
  const report = useCallback((ended = false) => {
    const { time, duration: reported } = position.current
    const d = Number.isFinite(reported) && reported > 0 ? reported : knownDurationRef.current
    if (!started.current || !d) return
    lastSaved.current = time
    const watchedDelta = watchedAcc.current
    watchedAcc.current = 0
    onProgressRef.current?.({ position: ended ? d : time, duration: d, watchedDelta, ended })
  }, [])
  // Save progress when leaving the page or hiding the tab mid-video.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && report()
    document.addEventListener('visibilitychange', onHide)
    return () => { document.removeEventListener('visibilitychange', onHide); report() }
  }, [report])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = useCallback(() => {
    const v = videoRef.current
    if (!v || error) return
    if (v.paused || v.ended) v.play().catch(() => {})
    else v.pause()
  }, [error])

  const seek = (t) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(t, v.duration || t))
    setCurrent(v.currentTime)
  }

  const changeVolume = (value) => {
    const v = videoRef.current
    v.volume = value
    v.muted = value === 0
  }

  const toggleMute = () => {
    const v = videoRef.current
    v.muted = !v.muted
    if (!v.muted && v.volume === 0) v.volume = 0.5
  }

  const toggleFullscreen = () => {
    const el = containerRef.current
    const v = videoRef.current
    if (document.fullscreenElement) document.exitFullscreen?.()
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
    else v?.webkitEnterFullscreen?.() // iOS Safari: native fullscreen player
  }

  const showControls = () => {
    setControlsVisible(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => !videoRef.current?.paused && setControlsVisible(false), 2500)
  }
  useEffect(() => () => clearTimeout(hideTimer.current), [])

  function onKeyDown(e) {
    const v = videoRef.current
    if (!v) return
    const keys = {
      ' ': toggle, k: toggle,
      ArrowRight: () => seek(v.currentTime + 5), ArrowLeft: () => seek(v.currentTime - 5),
      ArrowUp: () => changeVolume(Math.min(1, v.volume + 0.1)), ArrowDown: () => changeVolume(Math.max(0, v.volume - 0.1)),
      f: toggleFullscreen, m: toggleMute,
    }
    const action = keys[e.key]
    if (action && e.target.tagName !== 'INPUT') {
      e.preventDefault()
      action()
      showControls()
    }
  }

  async function onVideoError() {
    const v = videoRef.current
    // An expired signed URL surfaces as a network/source error: re-sign and resume (max twice).
    if (src && refreshes.current < 2) {
      refreshes.current += 1
      resumeAt.current = v?.currentTime || current
      const wasPlaying = playing
      try {
        const fresh = await getUrl()
        setSrc(fresh)
        if (wasPlaying) setTimeout(() => videoRef.current?.play().catch(() => {}), 0)
        return
      } catch { /* fall through to the error state */ }
    }
    setLoading(false)
    setPlaying(false)
    setError(
      v?.error?.code === 4
        ? 'This video format can’t be played in your browser. Please ask your trainer for an MP4 version.'
        : 'The video couldn’t be played. Check your connection and try again.',
    )
  }

  function retry() {
    refreshes.current = 0
    resumeAt.current = videoRef.current?.currentTime || current
    load()
  }

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const pct = duration ? (current / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className={`group relative overflow-hidden bg-black ${fullscreen ? 'h-full w-full' : 'aspect-video rounded-2xl shadow-sm'}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={showControls}
      onTouchStart={showControls}
      role="region"
      aria-label={`Video player: ${title}`}
    >
      {src && (
        <video
          ref={videoRef}
          src={src}
          poster={poster || undefined}
          className="h-full w-full object-contain"
          playsInline
          preload="metadata"
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          onClick={toggle}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget
            if (Number.isFinite(v.duration)) setDuration(v.duration)
            if (resumeAt.current) { v.currentTime = resumeAt.current; resumeAt.current = 0 }
            setLoading(false)
          }}
          onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => {
            const v = e.currentTarget
            const t = v.currentTime
            // Count real playback only: small forward steps while playing (a seek is a jump).
            if (!v.paused && !v.seeking && lastTick.current !== null) {
              const step = t - lastTick.current
              if (step > 0 && step < 1.5 * (v.playbackRate || 1)) watchedAcc.current += step
            }
            lastTick.current = t
            position.current = { time: t, duration: v.duration }
            setCurrent(t)
            if (Math.abs(t - lastSaved.current) >= PROGRESS_INTERVAL) report()
          }}
          onPlay={() => {
            setPlaying(true)
            if (!started.current) { started.current = true; onFirstPlay?.() }
            showControls()
          }}
          onPause={(e) => { setPlaying(false); setControlsVisible(true); if (!e.currentTarget.ended) report() }}
          onSeeking={(e) => { lastTick.current = e.currentTarget.currentTime }}
          onEnded={() => { setPlaying(false); setControlsVisible(true); report(true) }}
          onWaiting={() => setLoading(true)}
          onPlaying={() => { setLoading(false); refreshes.current = 0 }}
          onCanPlay={() => setLoading(false)}
          onVolumeChange={(e) => { setVolume(e.currentTarget.volume); setMuted(e.currentTarget.muted) }}
          onError={onVideoError}
        />
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" role="status" aria-label="Loading video">
          <Spinner className="h-10 w-10 text-white" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy-950/90 p-6 text-center text-white" role="alert">
          <AlertCircle className="h-8 w-8 text-red-300" />
          <p className="max-w-sm text-sm">{error}</p>
          <button onClick={retry} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-navy-900 hover:bg-slate-100">
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
        </div>
      )}

      {/* Big play button */}
      {!playing && !loading && !error && src && (
        <button onClick={toggle} className="absolute inset-0 flex items-center justify-center" aria-label="Play video">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-navy-900 shadow-lg transition group-hover:scale-105">
            <Play className="ml-1 h-7 w-7 fill-current" />
          </span>
        </button>
      )}

      {/* Control bar */}
      {src && !error && (
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 text-white transition-opacity sm:px-4 ${
            controlsVisible || !playing ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="any"
            value={Math.min(current, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            aria-valuetext={`${clock(current)} of ${clock(duration)}`}
            className="h-1.5 w-full cursor-pointer accent-mint-400"
            style={{ background: `linear-gradient(to right, #5ec29a ${pct}%, rgba(255,255,255,.3) ${pct}%)` }}
          />
          <div className="mt-1.5 flex items-center gap-2">
            <button onClick={toggle} className="rounded p-1.5 hover:bg-white/10" aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            <div className="flex items-center">
              <button onClick={toggleMute} className="rounded p-1.5 hover:bg-white/10" aria-label={muted ? 'Unmute' : 'Mute'}>
                <VolumeIcon className="h-5 w-5" />
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                aria-label="Volume"
                className="hidden w-20 cursor-pointer accent-mint-400 sm:block"
              />
            </div>
            <span className="ml-1 text-xs tabular-nums text-white/90" aria-live="off">
              {clock(current)} / {clock(duration)}
            </span>
            <button onClick={toggleFullscreen} className="ml-auto rounded p-1.5 hover:bg-white/10" aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
