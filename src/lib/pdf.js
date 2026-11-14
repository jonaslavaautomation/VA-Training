/**
 * Lazy-loaded PDF.js (legacy build for older mobile browsers). Only pages
 * that preview or upload PDFs download it, keeping the main bundle small.
 */
let pdfjsPromise = null

export function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    })
  }
  return pdfjsPromise
}

/** Opens a PDF from a URL or bytes. Whole-file download (no range requests) so short-lived URLs suffice. */
export async function openPdf(source) {
  const pdfjs = await loadPdfjs()
  const params = typeof source === 'string' ? { url: source } : { data: source }
  return pdfjs.getDocument({ ...params, disableRange: true, disableStream: true, isEvalSupported: false }).promise
}

/** Page count + first-page cover image (JPEG Blob) for an uploaded PDF File. */
export async function inspectPdf(file, coverWidth = 640) {
  const doc = await openPdf(new Uint8Array(await file.arrayBuffer()))
  try {
    const page = await doc.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: coverWidth / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(Math.min(viewport.height, viewport.width * 0.75)) // 4:3 crop from the top
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    const cover = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
    return { pageCount: doc.numPages, cover }
  } finally {
    doc.destroy()
  }
}
