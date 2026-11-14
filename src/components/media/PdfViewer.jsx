import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Download, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
import { openPdf } from '@/lib/pdf'

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2]

/** One page, rendered only when it scrolls near the viewport (keeps long PDFs fast on phones). */
function PdfPage({ doc, number, width, ratio, root, onSeen }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const [near, setNear] = useState(number <= 2)
  const [height, setHeight] = useState(width * ratio)

  useEffect(() => {
    const el = wrapRef.current
    const lazy = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { root, rootMargin: '800px 0px' })
    const current = new IntersectionObserver(([e]) => e.isIntersecting && onSeen(number), { root, threshold: 0.5 })
    lazy.observe(el)
    current.observe(el)
    return () => { lazy.disconnect(); current.disconnect() }
  }, [root, number, onSeen])

  useEffect(() => {
    if (!near || !width) return
    let task
    let cancelled = false
    doc.getPage(number).then((page) => {
      if (cancelled) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: (width / base.width) * dpr })
      const canvas = canvasRef.current
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      setHeight(viewport.height / dpr)
      task = page.render({ canvasContext: canvas.getContext('2d'), viewport })
      task.promise.catch(() => { /* cancelled on zoom / unmount */ })
    })
    return () => { cancelled = true; task?.cancel() }
  }, [doc, number, width, near])

  return (
    <div ref={wrapRef} className="mx-auto bg-white shadow-sm ring-1 ring-slate-200" style={{ width, height }} data-page={number}>
      <canvas ref={canvasRef} className="block h-full w-full" aria-label={`Page ${number}`} />
    </div>
  )
}

/**
 * In-portal PDF viewer. `getUrl()` returns a short-lived signed URL; the whole
 * document is fetched immediately, so the URL may expire right after.
 */
export default function PdfViewer({ getUrl, title, onDownload, downloading, onOpened }) {
  const scrollRef = useRef(null)
  const [scrollEl, setScrollEl] = useState(null)
  const [doc, setDoc] = useState(null)
  const [ratio, setRatio] = useState(1.294) // A4/Letter-ish until the first page is known
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [containerWidth, setContainerWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [page, setPage] = useState(1)
  const onOpenedRef = useRef(onOpened)
  onOpenedRef.current = onOpened

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const pdf = await openPdf(await getUrl())
      const first = (await pdf.getPage(1)).getViewport({ scale: 1 })
      setRatio(first.height / first.width)
      setDoc(pdf) // the previous document is destroyed by the cleanup effect below
      onOpenedRef.current?.()
    } catch (err) {
      console.error('PDF failed to load', err)
      setError(err.userMessage || 'This document couldn’t be opened. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [getUrl])

  useEffect(() => { load() }, [load])
  useEffect(() => () => doc?.destroy(), [doc])

  useEffect(() => {
    const el = scrollRef.current
    setScrollEl(el)
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pageWidth = Math.max(200, Math.floor((containerWidth - 32) * zoom))
  const zoomIndex = ZOOMS.indexOf(zoom)

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-100 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-navy-900" title={title}>{title}</p>
        {doc && <span className="hidden text-xs tabular-nums text-slate-500 sm:inline">Page {page} of {doc.numPages}</span>}
        <div className="flex items-center">
          <button onClick={() => setZoom(ZOOMS[zoomIndex - 1])} disabled={!doc || zoomIndex <= 0} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-11 text-center text-xs tabular-nums text-slate-500">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(ZOOMS[zoomIndex + 1])} disabled={!doc || zoomIndex >= ZOOMS.length - 1} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
        {onDownload && (
          <button onClick={onDownload} disabled={downloading} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-700 hover:bg-slate-100 disabled:opacity-60" aria-label="Download PDF">
            {downloading ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            <span className="hidden sm:inline">Download</span>
          </button>
        )}
      </div>

      <div ref={scrollRef} className="relative h-[70dvh] min-h-[360px] overflow-auto p-4" tabIndex={0} aria-label={`Document: ${title}`}>
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" role="status">
            <Spinner className="h-8 w-8 text-mint-500" />
            <p className="text-sm text-slate-500">Opening document…</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="max-w-sm text-sm text-slate-600">{error}</p>
            <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-navy-900 ring-1 ring-slate-200 hover:bg-slate-50">
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
          </div>
        )}
        {doc && containerWidth > 0 && (
          <div className="space-y-4">
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage key={i} doc={doc} number={i + 1} width={pageWidth} ratio={ratio} root={scrollEl} onSeen={setPage} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
