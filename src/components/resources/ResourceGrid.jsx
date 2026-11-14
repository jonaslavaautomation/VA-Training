import ResourceCard, { ResourceCardSkeleton } from './ResourceCard'
import EmptyState from '@/components/ui/EmptyState'
import { SearchX } from 'lucide-react'

export default function ResourceGrid({ resources, loading, onToggleFavorite, skeletons = 6, empty, columns = 'sm:grid-cols-2 xl:grid-cols-3' }) {
  if (loading) {
    return (
      <div className={`grid gap-5 ${columns}`}>
        {Array.from({ length: skeletons }, (_, i) => <ResourceCardSkeleton key={i} />)}
      </div>
    )
  }
  if (!resources?.length) {
    return empty ?? <EmptyState icon={SearchX} title="No resources found" description="Try a different search or category." />
  }
  return (
    <div className={`grid gap-5 ${columns}`}>
      {resources.map((r) => <ResourceCard key={r.id} resource={r} onToggleFavorite={onToggleFavorite} />)}
    </div>
  )
}
