import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, FileText, LayoutGrid, PlayCircle, SearchX } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import SearchBar from '@/components/ui/SearchBar'
import SampleDataBadge from '@/components/ui/SampleDataBadge'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import ResourceGrid from '@/components/resources/ResourceGrid'
import { useAsync } from '@/hooks/useAsync'
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle'
import { listCategories, searchLibrary } from '@/services/resourceService'
import { toUserMessage } from '@/lib/errors'

const typeTabs = [
  { value: '', label: 'All', icon: LayoutGrid },
  { value: 'VIDEO', label: 'Videos', icon: PlayCircle },
  { value: 'PDF', label: 'PDFs', icon: FileText },
]

const sorts = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'az', label: 'A–Z' },
]

const titles = {
  '': ['Training Library', 'All published videos and PDF guides.'],
  VIDEO: ['Video Library', 'Every published training video.'],
  PDF: ['PDF Library', 'Guides, checklists and templates to read or download.'],
}

const initial = { items: [], total: 0, hasMore: false, page: 0, loading: true, loadingMore: false, error: null }

/** Filters live in the URL (?q=&type=&category=&sort=) so links and Back work. */
export default function LibraryPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const type = ['VIDEO', 'PDF'].includes(params.get('type')) ? params.get('type') : ''
  const category = params.get('category') ?? ''
  const sort = sorts.some((s) => s.value === params.get('sort')) ? params.get('sort') : 'newest'
  const filtered = Boolean(q || type || category)

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  const categories = useAsync(listCategories)
  const [state, setState] = useState(initial)
  const [reloadKey, setReloadKey] = useState(0)

  // First page whenever filters change.
  useEffect(() => {
    let active = true
    setState((s) => ({ ...initial, items: s.items, loading: true }))
    searchLibrary({ q, type, category, sort, page: 0 })
      .then((res) => active && setState({ ...initial, ...res, loading: false }))
      .catch((error) => active && setState({ ...initial, loading: false, error }))
    return () => { active = false }
  }, [q, type, category, sort, reloadKey])

  async function loadMore() {
    const page = state.page + 1
    setState((s) => ({ ...s, loadingMore: true }))
    try {
      const res = await searchLibrary({ q, type, category, sort, page })
      setState((s) => {
        const seen = new Set(s.items.map((r) => r.id))
        return { ...s, items: [...s.items, ...res.items.filter((r) => !seen.has(r.id))], total: res.total, hasMore: res.hasMore, page, loadingMore: false }
      })
    } catch (error) {
      setState((s) => ({ ...s, loadingMore: false, moreError: toUserMessage(error, 'Couldn’t load more resources.') }))
    }
  }

  const setItems = useCallback((updater) => setState((s) => ({ ...s, items: typeof updater === 'function' ? updater(s.items) : updater })), [])
  const toggle = useFavoriteToggle(setItems)

  const chip = (active) =>
    `whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
      active ? 'bg-navy-900 text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
    }`

  const [title, description] = titles[type]

  return (
    <>
      <PageHeader title={title} description={description} badge={<SampleDataBadge />} />

      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchBar key={q} defaultValue={q} className="md:max-w-sm md:flex-1" onSearch={(v) => setParam('q', v)} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Resource type">
              {typeTabs.map(({ value, label, icon: Icon }) => (
                <button
                  key={label}
                  role="tab"
                  aria-selected={type === value}
                  onClick={() => setParam('type', value)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    type === value ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
            <select
              aria-label="Sort resources"
              value={sort}
              onChange={(e) => setParam('sort', e.target.value === 'newest' ? '' : e.target.value)}
              className="h-10 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-navy-300 focus:outline-none focus:ring-4 focus:ring-navy-100"
            >
              {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        {categories.data?.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Category">
            <button className={chip(!category)} onClick={() => setParam('category', '')}>All categories</button>
            {categories.data.map((c) => (
              <button key={c.id} className={chip(category === c.slug)} onClick={() => setParam('category', c.slug)} aria-pressed={category === c.slug}>
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {!state.loading && !state.error && state.total > 0 && (
        <p className="mb-4 text-sm text-slate-500" data-testid="result-count">
          Showing {state.items.length} of {state.total} resource{state.total === 1 ? '' : 's'}
          {q && <> for “<span className="font-medium text-navy-900">{q}</span>”</>}
        </p>
      )}

      {state.error ? (
        <Alert type="error">
          {toUserMessage(state.error, 'Couldn’t load resources.')}{' '}
          <button onClick={() => setReloadKey((k) => k + 1)} className="font-semibold underline-offset-2 hover:underline">Try again</button>
        </Alert>
      ) : (
        <>
          <ResourceGrid
            resources={state.items}
            loading={state.loading}
            onToggleFavorite={toggle}
            empty={
              filtered ? (
                <EmptyState icon={SearchX} title="No matching resources" description="Try a different search, type or category.">
                  <Button variant="secondary" onClick={() => setParams({})}>Clear filters</Button>
                </EmptyState>
              ) : (
                <EmptyState icon={BookOpen} title="No training materials available yet." description="New videos and PDF guides will appear here as soon as your trainers publish them." />
              )
            }
          />
          {state.hasMore && !state.loading && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <Button variant="secondary" onClick={loadMore} loading={state.loadingMore}>Load more</Button>
              {state.moreError && <p className="text-sm text-red-600">{state.moreError}</p>}
            </div>
          )}
        </>
      )}
    </>
  )
}
