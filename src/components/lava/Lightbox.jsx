import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

/**
 * Full-screen photo viewer (stays inside the app — no new tab).
 * Esc closes; ← / → move between photos; clicking the dark area closes.
 */
export default function Lightbox({ photos, index, onIndex, onClose }) {
  const closeRef = useRef(null)
  const photo = photos[index]
  const many = photos.length > 1
  const go = (d) => onIndex((index + d + photos.length) % photos.length)

  useEffect(() => {
    const previous = document.activeElement
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow; previous?.focus?.() }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (many && e.key === 'ArrowRight') onIndex((index + 1) % photos.length)
      else if (many && e.key === 'ArrowLeft') onIndex((index - 1 + photos.length) % photos.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, many, photos.length, onIndex, onClose])

  if (!photo) return null
  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-navy-950/95 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Photo viewer" data-testid="lightbox">
      <div className="flex items-center justify-between px-4 py-3 text-sm text-navy-200">
        <span>{many ? `${index + 1} / ${photos.length}` : ''}</span>
        <button ref={closeRef} type="button" onClick={onClose} className="rounded-full p-2 text-white hover:bg-white/10" aria-label="Close photo">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 sm:px-16" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <img src={photo.src} alt={photo.caption || ''} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
        {many && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:left-4" aria-label="Previous photo"><ChevronLeft className="h-6 w-6" /></button>
            <button type="button" onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:right-4" aria-label="Next photo"><ChevronRight className="h-6 w-6" /></button>
          </>
        )}
      </div>
      {photo.caption && <p className="px-4 pb-5 text-center text-sm text-navy-100">{photo.caption}</p>}
    </div>,
    document.body,
  )
}
