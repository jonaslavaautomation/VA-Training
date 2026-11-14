import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import ResourceThumbnail from './ResourceThumbnail'
import ResourceTypeBadge from './ResourceTypeBadge'
import FavoriteButton from './FavoriteButton'
import ProgressBar from '@/components/ui/ProgressBar'
import Skeleton from '@/components/ui/Skeleton'
import { clock, formatDate } from '@/lib/format'

export default function ResourceCard({ resource, onToggleFavorite }) {
  const progress = resource.progress
  return (
    <Link
      to={`/library/${resource.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative">
        <ResourceThumbnail resource={resource} />
        {onToggleFavorite && (
          <FavoriteButton active={resource.is_favorite} onToggle={() => onToggleFavorite(resource)} className="absolute right-2 top-2" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <ResourceTypeBadge type={resource.resource_type} />
          <span className="truncate text-xs text-slate-500">{resource.category?.name}</span>
        </div>
        <h3 className="line-clamp-2 font-semibold leading-snug text-navy-900 group-hover:text-navy-700">{resource.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{resource.description}</p>
        <div className="mt-auto space-y-2 pt-3">
          {progress?.status === 'completed' ? (
            <p className="flex items-center gap-1 text-xs font-medium text-mint-600"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</p>
          ) : progress ? (
            <div className="flex items-center gap-2">
              <ProgressBar value={progress.percent} />
              <span className="text-xs text-slate-500">{progress.percent}%</span>
            </div>
          ) : null}
          <p className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <span>Added {formatDate(resource.created_at)}</span>
            {progress?.status === 'in_progress' && (
              <span className="font-medium text-navy-700">
                {resource.resource_type === 'VIDEO' && progress.position > 5 ? `Resume at ${clock(progress.position)}` : 'Continue'}
              </span>
            )}
          </p>
        </div>
      </div>
    </Link>
  )
}

export function ResourceCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
      <Skeleton className="aspect-video rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}
