import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, CheckCircle2, Clock, Compass } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import SampleDataBadge from '@/components/ui/SampleDataBadge'
import EmptyState from '@/components/ui/EmptyState'
import Alert from '@/components/ui/Alert'
import { LinkButton } from '@/components/ui/Button'
import ResourceGrid from '@/components/resources/ResourceGrid'
import { useAsync } from '@/hooks/useAsync'
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle'
import { getLearningProgress } from '@/services/resourceService'

const tabs = [
  { value: 'in-progress', label: 'In progress', key: 'inProgress' },
  { value: 'completed', label: 'Completed', key: 'completed' },
]

/** The member's own progress (RLS returns only their rows). Tab lives in the URL. */
export default function MyLearningPage() {
  const { data, loading, error, reload, setData } = useAsync(getLearningProgress)
  const [params, setParams] = useSearchParams()
  const tab = tabs.find((t) => t.value === params.get('tab')) ?? tabs[0]
  const pct = data?.totalPublished ? Math.round((data.completed.length / data.totalPublished) * 100) : 0

  const toggle = useFavoriteToggle(setData, {
    apply: useCallback((d, fn) => ({ ...d, inProgress: fn(d.inProgress), completed: fn(d.completed) }), []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="My Learning" description="Pick up where you left off and track what you’ve finished." badge={<SampleDataBadge />} />

      {error && (
        <Alert type="error">
          Couldn’t load your progress.{' '}
          <button onClick={reload} className="font-semibold underline-offset-2 hover:underline">Try again</button>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="In progress" value={data?.inProgress.length} icon={Clock} tint="red" loading={loading} />
        <StatCard label="Completed" value={data?.completed.length} icon={CheckCircle2} tint="mint" loading={loading} />
        <StatCard label="Overall progress" value={`${pct}%`} icon={BookOpen} tint="navy" loading={loading} hint={data && `${data.completed.length} of ${data.totalPublished} resources`} />
      </div>

      <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Learning status">
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab.value === t.value}
            onClick={() => setParams(t.value === 'in-progress' ? {} : { tab: t.value }, { replace: true })}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab.value === t.value ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'
            }`}
          >
            {t.label}
            <span className="text-xs text-slate-400">{loading ? '–' : data?.[t.key].length ?? 0}</span>
          </button>
        ))}
      </div>

      {!error && (
        <ResourceGrid
          resources={data?.[tab.key]}
          loading={loading}
          skeletons={3}
          onToggleFavorite={toggle}
          empty={
            tab.key === 'inProgress' ? (
              <EmptyState
                icon={Compass}
                title={data?.completed.length ? 'Nothing in progress right now' : 'You haven’t started any training yet'}
                description="Open a video or PDF from the library — your progress will be saved here automatically."
              >
                <LinkButton to="/library">Explore the library</LinkButton>
              </EmptyState>
            ) : (
              <EmptyState icon={CheckCircle2} title="No completed resources yet" description="Videos complete when you watch them through; PDFs when you mark them complete." />
            )
          }
        />
      )}
    </div>
  )
}
