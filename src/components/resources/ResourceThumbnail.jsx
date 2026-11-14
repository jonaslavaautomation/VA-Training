import { FileText, Play } from 'lucide-react'
import { getCategoryStyle } from './categoryStyles'
import { formatDuration } from '@/lib/format'

/** Uses the uploaded thumbnail when present; otherwise a branded placeholder. */
export default function ResourceThumbnail({ resource, showIcon = true, className = '' }) {
  const { Icon, gradient } = getCategoryStyle(resource.category)
  const isVideo = resource.resource_type === 'VIDEO'
  const meta = isVideo ? formatDuration(resource.duration_seconds) : resource.page_count ? `${resource.page_count} pages` : ''

  return (
    <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${gradient} ${className}`}>
      {resource.thumbnail_url ? (
        <img src={resource.thumbnail_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <>
          <Icon className="absolute -bottom-4 -right-4 h-28 w-28 text-white/10" />
          {showIcon && <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-navy-900 shadow-lg">
              {isVideo ? <Play className="ml-0.5 h-5 w-5 fill-current" /> : <FileText className="h-5 w-5" />}
            </div>
          </div>}
        </>
      )}
      {meta && (
        <span className="absolute bottom-2 right-2 rounded-md bg-navy-950/75 px-1.5 py-0.5 text-[11px] font-medium text-white">{meta}</span>
      )}
    </div>
  )
}
