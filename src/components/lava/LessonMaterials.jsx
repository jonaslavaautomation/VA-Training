import { useCallback, useState } from 'react'
import { ChevronDown, FileText, PlayCircle } from 'lucide-react'
import VideoPlayer from '@/components/media/VideoPlayer'
import PdfViewer from '@/components/media/PdfViewer'
import { downloadResource, getViewUrl } from '@/services/resourceService'
import { useToast } from '@/hooks/useToast'
import { toUserMessage } from '@/lib/errors'

function VideoMaterial({ resource }) {
  const getUrl = useCallback(() => getViewUrl(resource), [resource])
  return (
    <figure className="overflow-hidden rounded-xl bg-black ring-1 ring-slate-200" data-testid="lesson-video">
      <VideoPlayer getUrl={getUrl} title={resource.title} knownDuration={resource.duration_seconds ?? 0} />
      <figcaption className="flex items-center gap-2 bg-white px-4 py-2.5 text-sm font-medium text-navy-900">
        <PlayCircle className="h-4 w-4 text-lava-500" /> {resource.title}
      </figcaption>
    </figure>
  )
}

function PdfMaterial({ resource }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const getUrl = useCallback(() => getViewUrl(resource), [resource])
  async function download() {
    setDownloading(true)
    try { await downloadResource(resource) } catch (err) { toast.error(toUserMessage(err, 'The download couldn’t start.')) } finally { setDownloading(false) }
  }
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200" data-testid="lesson-pdf">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 bg-white px-4 py-3 text-left hover:bg-slate-50">
        <FileText className="h-5 w-5 shrink-0 text-lava-500" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-navy-900">{resource.title}</span>
          <span className="text-xs text-slate-500">PDF{resource.page_count ? ` · ${resource.page_count} page${resource.page_count === 1 ? '' : 's'}` : ''} · {open ? 'Hide' : 'Open'} document</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-slate-100"><PdfViewer getUrl={getUrl} title={resource.title} onDownload={download} downloading={downloading} /></div>}
    </div>
  )
}

/** Lesson videos and PDFs (private files, opened with short-lived signed links). */
export default function LessonMaterials({ items }) {
  if (!items?.length) return null
  return (
    <section aria-label="Lesson videos and documents" className="space-y-3">
      {items.map((r) => (r.resource_type === 'VIDEO' ? <VideoMaterial key={r.id} resource={r} /> : <PdfMaterial key={r.id} resource={r} />))}
    </section>
  )
}
