import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, MonitorPlay, X } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import { RequestBadge } from '@/components/lava/LavaUi'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { decideSimulatorRequest, listSimulatorRequests } from '@/services/lavaService'
import { fullName } from '@/lib/format'
import { toUserMessage } from '@/lib/errors'

const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—')
const filters = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['', 'All']]

function RequestRow({ r, onDecided }) {
  const toast = useToast()
  const [note, setNote] = useState(r.admin_note ?? '')
  const [busy, setBusy] = useState(null)
  const name = fullName(r.member ?? {}) || r.member?.email || 'Unknown member'

  async function decide(status) {
    setBusy(status)
    try {
      const updated = await decideSimulatorRequest(r.id, status, note)
      toast.success(status === 'approved' ? `Simulator access approved for ${name}.` : `Request from ${name} rejected.`)
      onDecided({ ...r, ...updated })
    } catch (err) {
      toast.error(toUserMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <li className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start" data-testid="request-row">
      <div className="min-w-0">
        <Link to={`/admin/members/${r.user_id}`} className="block truncate font-medium text-navy-900 hover:text-navy-700">{name}</Link>
        <p className="truncate text-sm text-slate-500">{r.member?.email}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <RequestBadge status={r.status} />
          {r.member?.status === 'inactive' && <span className="text-red-600">Account inactive</span>}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-slate-500">Requested</dt><dd className="text-navy-900">{when(r.requested_at)}</dd>
        <dt className="text-slate-500">Lessons done</dt><dd className="text-navy-900">{r.progress ? `${r.progress.lessonsDone} / ${r.progress.lessonsTotal}` : '—'}</dd>
        <dt className="text-slate-500">Assessments passed</dt><dd className="text-navy-900">{r.progress?.passedAssessments ?? 0}</dd>
        {r.decided_at && <><dt className="text-slate-500">Reviewed</dt><dd className="text-navy-900">{when(r.decided_at)}{r.decider ? ` by ${fullName(r.decider) || r.decider.email}` : ''}</dd></>}
      </dl>
      <div className="space-y-2">
        <label className="sr-only" htmlFor={`note-${r.id}`}>Admin note for {name}</label>
        <textarea
          id={`note-${r.id}`}
          rows={2}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note to the member (shown to them)"
          className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-navy-400 focus:outline-none focus:ring-4 focus:ring-navy-100"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => decide('approved')} loading={busy === 'approved'} disabled={Boolean(busy)} aria-label={`Approve ${name}`}>
            <Check className="h-4 w-4" /> {r.status === 'approved' ? 'Save note' : 'Approve'}
          </Button>
          <Button size="sm" variant={r.status === 'approved' ? 'danger' : 'secondary'} onClick={() => decide('rejected')} loading={busy === 'rejected'} disabled={Boolean(busy)} aria-label={`Reject ${name}`}>
            <X className="h-4 w-4" /> {r.status === 'approved' ? 'Revoke access' : r.status === 'rejected' ? 'Save note' : 'Reject'}
          </Button>
        </div>
      </div>
    </li>
  )
}

/** /admin/lava/requests — simulator access approvals. */
export default function AdminLavaRequestsPage() {
  const { data, loading, error, reload, setData } = useAsync(listSimulatorRequests)
  const [filter, setFilter] = useState('pending')
  const rows = (data ?? []).filter((r) => !filter || r.status === filter)
  const count = (s) => (data ?? []).filter((r) => r.status === s).length

  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200/70" role="tablist" aria-label="Filter requests">
        {filters.map(([value, label]) => (
          <button key={label} role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === value ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-navy-900'}`}>
            {label} {value && <span className="ml-1 text-xs opacity-70">{data ? count(value) : '–'}</span>}
          </button>
        ))}
      </div>
      {error ? (
        <Alert type="error">{toUserMessage(error, 'Couldn’t load requests.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
      ) : loading ? (
        <Skeleton className="h-48" />
      ) : !rows.length ? (
        <EmptyState icon={MonitorPlay} title={filter === 'pending' ? 'No pending requests' : 'No requests here'} description="Members request simulator access from the LAVA portal after completing the applicant agreement." />
      ) : (
        <Card><ul className="divide-y divide-slate-100">{rows.map((r) => <RequestRow key={r.id} r={r} onDecided={(u) => setData((d) => d.map((x) => (x.id === u.id ? u : x)))} />)}</ul></Card>
      )}
    </div>
  )
}
