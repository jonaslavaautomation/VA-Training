import { Link } from 'react-router-dom'
import { FileText, PlayCircle } from 'lucide-react'
import ProgressBar from '@/components/ui/ProgressBar'
import { timeAgo } from '@/lib/format'

/** Compact row used in dashboard side lists. */
export default function ResourceListItem({ resource, showProgress = false }) {
  const isVideo = resource.resource_type === 'VIDEO'
  const Icon = isVideo ? PlayCircle : FileText
  return (
    <li>
      <Link to={`/library/${resource.id}`} className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-slate-50">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isVideo ? 'bg-navy-50 text-navy-700' : 'bg-mint-50 text-mint-700'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-navy-900">{resource.title}</p>
          {showProgress && resource.progress ? (
            <div className="mt-1.5 flex items-center gap-2">
              <ProgressBar value={resource.progress.percent} />
              <span className="w-8 text-right text-xs text-slate-500">{resource.progress.percent}%</span>
            </div>
          ) : (
            <p className="truncate text-xs text-slate-500">{resource.category?.name} · {timeAgo(resource.created_at)}</p>
          )}
        </div>
      </Link>
    </li>
  )
}
