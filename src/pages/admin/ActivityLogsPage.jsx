import { useEffect, useState } from 'react'
import { Activity, Search } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import Avatar from '@/components/ui/Avatar'
import { useAuth } from '@/hooks/useAuth'
import { listActivity, LOG_PAGE_SIZE } from '@/services/activityLogService'
import { ACTIVITY_LABELS, activityTone, ADMIN_ACTIVITY_TYPES, describeDetails, MEMBER_ACTIVITY_TYPES } from '@/config/activity'
import { toUserMessage } from '@/lib/errors'

const scopes = [
  { value: 'admin', label: 'Admin actions' },
  { value: 'member', label: 'Member activity' },
  { value: '', label: 'Everything' },
]
const fieldClass = 'h-10 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-navy-300 focus:outline-none focus:ring-4 focus:ring-navy-100'
const when = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** Read-only audit trail. Rows are written by DB triggers / the admin-members function; no one can edit them. */
export default function ActivityLogsPage() {
  const { isPreview } = useAuth()
  const [scope, setScope] = useState('admin')
  const [type, setType] = useState('')
  const [query, setQuery] = useState('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [state, setState] = useState({ items: [], total: 0, loading: true, error: null })

  useEffect(() => {
    const t = setTimeout(() => setQ(query), 300)
    return () => clearTimeout(t)
  }, [query])
  useEffect(() => setPage(0), [scope, type, q, from, to])

  useEffect(() => {
    if (isPreview) {
      setState({ items: [], total: 0, loading: false, error: { userMessage: 'Activity logs need a connected Supabase project.' } })
      return
    }
    let active = true
    setState((s) => ({ ...s, loading: true, error: null }))
    listActivity({ scope, type, q, from, to, page })
      .then((res) => active && setState({ ...res, loading: false, error: null }))
      .catch((error) => active && setState((s) => ({ ...s, loading: false, error })))
    return () => { active = false }
  }, [scope, type, q, from, to, page, isPreview])

  const typeOptions = scope === 'member' ? MEMBER_ACTIVITY_TYPES : scope === 'admin' ? ADMIN_ACTIVITY_TYPES : Object.keys(ACTIVITY_LABELS)

  return (
    <>
      <PageHeader title="Activity logs" description="A read-only record of administrative actions and member learning activity." />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Log scope">
              {scopes.map((s) => (
                <button
                  key={s.value || 'all'}
                  role="tab"
                  aria-selected={scope === s.value}
                  onClick={() => { setScope(s.value); setType('') }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${scope === s.value ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <select aria-label="Filter by action" value={type} onChange={(e) => setType(e.target.value)} className={fieldClass}>
              <option value="">All actions</option>
              {typeOptions.map((t) => <option key={t} value={t}>{ACTIVITY_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search affected record…"
                aria-label="Search affected record"
                maxLength={100}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm placeholder:text-slate-400 focus:border-navy-300 focus:outline-none focus:ring-4 focus:ring-navy-100"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-500">From <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={fieldClass} aria-label="From date" /></label>
            <label className="flex items-center gap-2 text-sm text-slate-500">To <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={fieldClass} aria-label="To date" /></label>
            {(q || from || to || type) && (
              <button onClick={() => { setQuery(''); setFrom(''); setTo(''); setType('') }} className="text-sm font-medium text-navy-700 hover:text-navy-900">Clear filters</button>
            )}
          </div>
        </div>

        {state.error ? (
          <Alert type={isPreview ? 'info' : 'error'} className="m-4">{toUserMessage(state.error, 'Couldn’t load activity.')}</Alert>
        ) : state.loading && !state.items.length ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !state.items.length ? (
          <div className="p-4"><EmptyState icon={Activity} title="No activity found" description="Nothing matches these filters yet." /></div>
        ) : (
          <div className={state.loading ? 'opacity-60' : ''}>
            <table className="hidden w-full text-left text-sm lg:table">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Who</th>
                  <th className="px-3 py-2.5 font-medium">Action</th>
                  <th className="px-3 py-2.5 font-medium">Affected record</th>
                  <th className="px-3 py-2.5 font-medium">Details</th>
                  <th className="px-5 py-2.5 font-medium">Date &amp; time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.items.map((l) => (
                  <tr key={l.id} data-testid="log-row">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={l.actor_name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-navy-900">{l.actor_name}</p>
                          {l.actor_email && <p className="truncate text-xs text-slate-500">{l.actor_email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><Badge tone={activityTone(l.activity_type)}>{ACTIVITY_LABELS[l.activity_type] ?? l.activity_type}</Badge></td>
                    <td className="max-w-xs truncate px-3 py-3 text-slate-700" title={l.target ?? ''}>{l.target ?? '—'}</td>
                    <td className="max-w-xs px-3 py-3 text-xs text-slate-500">{describeDetails(l.details) || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-600">{when(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-slate-100 lg:hidden">
              {state.items.map((l) => (
                <li key={l.id} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={activityTone(l.activity_type)}>{ACTIVITY_LABELS[l.activity_type] ?? l.activity_type}</Badge>
                    <span className="text-xs text-slate-400">{when(l.created_at)}</span>
                  </div>
                  {l.target && <p className="mt-1 truncate font-medium text-navy-900">{l.target}</p>}
                  <p className="text-xs text-slate-500">by {l.actor_name}{describeDetails(l.details) && ` · ${describeDetails(l.details)}`}</p>
                </li>
              ))}
            </ul>
            <Pagination page={page} pageSize={LOG_PAGE_SIZE} total={state.total} onPageChange={setPage} label="entries" />
          </div>
        )}
      </Card>
    </>
  )
}
