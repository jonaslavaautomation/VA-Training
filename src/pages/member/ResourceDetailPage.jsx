import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Download, EyeOff, Lock, RotateCcw } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import ProgressBar from '@/components/ui/ProgressBar'
import SampleDataBadge from '@/components/ui/SampleDataBadge'
import ResourceThumbnail from '@/components/resources/ResourceThumbnail'
import ResourceTypeBadge from '@/components/resources/ResourceTypeBadge'
import FavoriteButton from '@/components/resources/FavoriteButton'
import VideoPlayer from '@/components/media/VideoPlayer'
import PdfViewer from '@/components/media/PdfViewer'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle'
import { downloadResource, getResource, getViewUrl, markComplete, markIncomplete, recordPdfOpened, recordView, saveVideoProgress } from '@/services/resourceService'
import { clock, formatDate, formatDuration, formatFileSize } from '@/lib/format'
import { VIDEO_COMPLETION } from '@/config/constants'
import { toUserMessage } from '@/lib/errors'

export default function ResourceDetailPage() {
  const { id } = useParams()
  const { isAdmin, isPreview } = useAuth()
  const { data: resource, loading, error, setData } = useAsync(() => getResource(id), [id])
  const toggle = useFavoriteToggle(setData, { apply: (r, fn) => fn([r])[0] })
  const [completing, setCompleting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const toast = useToast()

  const [undoing, setUndoing] = useState(false)
  const [playerKey, setPlayerKey] = useState(0)
  const [startAt, setStartAt] = useState(null) // fixed per page visit so later saves don't move the player

  const resourceRef = useRef(resource)
  resourceRef.current = resource
  const progressRef = useRef(null)
  useEffect(() => { progressRef.current = resource?.progress ?? null }, [resource?.progress])

  // Resume point: last position, unless (almost) at the end.
  useEffect(() => {
    if (!resource || startAt !== null) return
    const p = resource.progress
    const d = resource.duration_seconds
    setStartAt(resource.resource_type === 'VIDEO' && p?.position > 5 && (!d || p.position < d * 0.95) ? p.position : 0)
  }, [resource, startAt])

  const getUrl = useCallback(() => getViewUrl(resourceRef.current), [resource?.id, resource?.storage_path]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyProgress = useCallback((progress) => {
    progressRef.current = progress
    setData((r) => (r ? { ...r, progress } : r))
  }, [setData])

  // PDFs: opening one starts it (shows under My Learning). Videos are logged on first play.
  const onPdfOpened = useCallback(async () => {
    const r = resourceRef.current
    if (!r) return
    recordView(r)
    try {
      const progress = await recordPdfOpened({ ...r, progress: progressRef.current })
      if (progress) applyProgress(progress)
    } catch (err) {
      console.warn('PDF open not recorded', err)
    }
  }, [applyProgress])
  const onFirstPlay = useCallback(() => resourceRef.current && recordView(resourceRef.current), [])

  // Video progress: saves are queued so each one builds on the previous result.
  const queue = useRef(Promise.resolve())
  const onProgress = useCallback((report) => {
    queue.current = queue.current
      .then(async () => {
        const r = resourceRef.current
        if (!r) return
        const progress = await saveVideoProgress({ ...r, progress: progressRef.current }, report)
        if (!progress) return
        applyProgress(progress)
        if (progress.justCompleted) toast.success('Lesson completed — nice work!')
      })
      .catch((err) => console.warn('Progress not saved', err))
  }, [applyProgress, toast])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="aspect-video lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    )
  }
  if (error) {
    return <EmptyState title="Couldn’t load this resource" description={toUserMessage(error)}><Link to="/library" className="text-sm font-medium text-navy-700">Back to library</Link></EmptyState>
  }
  if (!resource) {
    return <EmptyState title="Resource not found" description="It may have been removed or unpublished."><Link to="/library" className="text-sm font-medium text-navy-700">Back to library</Link></EmptyState>
  }

  const isVideo = resource.resource_type === 'VIDEO'
  const completed = resource.progress?.status === 'completed'
  const isDraft = resource.status === 'draft'
  const hasFile = Boolean(resource.storage_path) && !isPreview

  async function complete() {
    setCompleting(true)
    try {
      applyProgress(await markComplete(resource.id))
      toast.success('Marked as complete.')
    } catch (err) {
      toast.error(toUserMessage(err, 'Couldn’t save your progress. Please try again.'))
    } finally {
      setCompleting(false)
    }
  }

  async function undoComplete() {
    setUndoing(true)
    try {
      applyProgress(await markIncomplete(resource.id))
    } catch (err) {
      toast.error(toUserMessage(err, 'Couldn’t update your progress. Please try again.'))
    } finally {
      setUndoing(false)
    }
  }

  function startOver() {
    setStartAt(0)
    setPlayerKey((k) => k + 1)
  }

  async function download() {
    setDownloading(true)
    try {
      await downloadResource(resource)
    } catch (err) {
      toast.error(toUserMessage(err, 'The download couldn’t be started. Please try again.'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <Link to={isAdmin && isDraft ? '/admin/resources' : '/library'} className="mb-4 inline-flex min-h-6 items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> {isAdmin && isDraft ? 'Back to manage resources' : 'Back to library'}
      </Link>

      {isDraft && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
          <EyeOff className="h-4 w-4 shrink-0" /> Draft preview — members can’t see this resource until it’s published.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          {!hasFile ? (
            <div className="relative overflow-hidden rounded-2xl shadow-sm">
              <ResourceThumbnail resource={resource} showIcon={false} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy-950/60 p-4 text-center text-white backdrop-blur-[2px]">
                <Lock className="h-6 w-6 text-mint-300" />
                <p className="text-sm font-medium">{isPreview ? 'Files open once Supabase is connected' : 'No file attached yet'}</p>
              </div>
            </div>
          ) : isVideo ? (
            startAt !== null && (
              <>
                <VideoPlayer
                  key={playerKey}
                  getUrl={getUrl}
                  poster={resource.thumbnail_url}
                  title={resource.title}
                  knownDuration={resource.duration_seconds}
                  startAt={startAt}
                  onFirstPlay={onFirstPlay}
                  onProgress={onProgress}
                />
                {startAt > 0 && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-500" data-testid="resume-note">
                    Resuming from {clock(startAt)}
                    <button onClick={startOver} className="inline-flex items-center gap-1 font-medium text-navy-700 hover:text-navy-900">
                      <RotateCcw className="h-3.5 w-3.5" /> Start over
                    </button>
                  </p>
                )}
              </>
            )
          ) : (
            <PdfViewer getUrl={getUrl} title={resource.title} onDownload={download} downloading={downloading} onOpened={onPdfOpened} />
          )}
          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-2">
              <ResourceTypeBadge type={resource.resource_type} />
              {isDraft && <Badge tone="amber">Draft</Badge>}
              <span className="text-sm text-slate-500">{resource.category?.name}</span>
              <SampleDataBadge />
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy-900">{resource.title}</h1>
            {resource.description && <p className="mt-2 whitespace-pre-line text-slate-600">{resource.description}</p>}
          </div>
        </div>

        <Card className="h-fit space-y-5 p-5">
          <div className="flex gap-2">
            {isVideo ? (
              <div className="flex flex-1 items-center text-sm text-slate-500">
                {resource.duration_seconds ? `${formatDuration(resource.duration_seconds)} video lesson` : 'Video lesson'}
              </div>
            ) : (
              <Button className="flex-1" onClick={download} loading={downloading} disabled={!hasFile}>
                {!downloading && <Download className="h-4 w-4" />} Download PDF
              </Button>
            )}
            <FavoriteButton active={resource.is_favorite} onToggle={() => toggle(resource)} className="h-10 w-10 ring-1 ring-slate-200" />
          </div>

          <div data-testid="progress-panel">
            {completed ? (
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-mint-600">
                  <CheckCircle2 className="h-4 w-4" /> Completed{resource.progress.completed_at && <span className="font-normal text-slate-500"> · {formatDate(resource.progress.completed_at)}</span>}
                </p>
                <button onClick={undoComplete} disabled={undoing} className="text-xs font-medium text-slate-500 hover:text-navy-900 disabled:opacity-60">
                  {undoing ? 'Updating…' : 'Mark as not completed'}
                </button>
              </div>
            ) : isVideo ? (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <ProgressBar value={resource.progress?.percent ?? 0} />
                  <span className="text-xs text-slate-500">{resource.progress?.percent ?? 0}%</span>
                </div>
                <p className="text-xs text-slate-500">
                  {resource.progress ? 'Your place is saved automatically.' : 'Not started yet.'} The lesson completes once you’ve watched it through to the end ({Math.round(VIDEO_COMPLETION.position * 100)}%).
                </p>
              </>
            ) : (
              <>
                <p className="mb-3 text-xs text-slate-500">
                  {resource.progress ? `Opened ${formatDate(resource.progress.updated_at)}. ` : ''}Finished reading? Mark it complete to track your progress.
                </p>
                <Button variant="secondary" fullWidth loading={completing} onClick={complete}>
                  <CheckCircle2 className="h-4 w-4" /> Mark as complete
                </Button>
              </>
            )}
          </div>

          <dl className="space-y-2 border-t border-slate-100 pt-4 text-sm">
            {[
              ['Type', isVideo ? 'Video' : 'PDF document'],
              [isVideo ? 'Duration' : 'Pages', isVideo ? formatDuration(resource.duration_seconds) : resource.page_count],
              ['File size', formatFileSize(resource.file_size)],
              resource.uploaded_by_name && ['Uploaded by', resource.uploaded_by_name],
              ['Added', formatDate(resource.created_at)],
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium text-navy-900">{v || '—'}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  )
}
