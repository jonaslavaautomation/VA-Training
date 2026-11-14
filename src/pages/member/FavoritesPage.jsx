import { useCallback, useState } from 'react'
import { Heart, SearchX } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import SampleDataBadge from '@/components/ui/SampleDataBadge'
import EmptyState from '@/components/ui/EmptyState'
import Alert from '@/components/ui/Alert'
import { LinkButton } from '@/components/ui/Button'
import ResourceGrid from '@/components/resources/ResourceGrid'
import { useAsync } from '@/hooks/useAsync'
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle'
import { listFavorites } from '@/services/resourceService'

const typeTabs = [
  { value: '', label: 'All' },
  { value: 'VIDEO', label: 'Videos' },
  { value: 'PDF', label: 'PDFs' },
]

export default function FavoritesPage() {
  const { data, loading, error, reload, setData } = useAsync(listFavorites)
  const [type, setType] = useState('')
  // Un-favoriting removes the card immediately (restored if the request fails).
  const toggle = useFavoriteToggle(setData, {
    apply: useCallback((list, fn) => fn(list ?? []).filter((r) => r.is_favorite), []),
  })
  const shown = (data ?? []).filter((r) => !type || r.resource_type === type)
  const count = data?.length ?? 0

  return (
    <>
      <PageHeader
        title="Favorites"
        description={loading ? 'Resources you’ve saved for quick access.' : `${count} saved resource${count === 1 ? '' : 's'} for quick access.`}
        badge={<SampleDataBadge />}
      />

      {count > 0 && (
        <div className="mb-6 inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Resource type">
          {typeTabs.map((t) => (
            <button
              key={t.label}
              role="tab"
              aria-selected={type === t.value}
              onClick={() => setType(t.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${type === t.value ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <Alert type="error">
          Couldn’t load your favorites.{' '}
          <button onClick={reload} className="font-semibold underline-offset-2 hover:underline">Try again</button>
        </Alert>
      ) : (
        <ResourceGrid
          resources={shown}
          loading={loading}
          onToggleFavorite={toggle}
          empty={
            count ? (
              <EmptyState icon={SearchX} title={`No saved ${type === 'VIDEO' ? 'videos' : 'PDFs'}`} description="Try another filter." />
            ) : (
              <EmptyState icon={Heart} title="No favorites yet" description="Tap the heart on any video or PDF to save it here for quick access.">
                <LinkButton to="/library">Browse library</LinkButton>
              </EmptyState>
            )
          }
        />
      )}
    </>
  )
}
