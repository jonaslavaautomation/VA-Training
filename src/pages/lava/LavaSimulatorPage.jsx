import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock, MonitorPlay, XCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import { LockedPanel, QuizStatus, RequestBadge } from '@/components/lava/LavaUi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { getPreparationOverview, requestSimulatorAccess } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

const formatWhen = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** /lava-portal/simulator — request access; approved members see the activities. */
export default function LavaSimulatorPage() {
  const { agreed, status, setStatus } = useOutletContext()
  const { user, isAdmin } = useAuth()
  const toast = useToast()
  const request = status?.request
  const approved = isAdmin || request?.status === 'approved'
  const overview = useAsync(() => (agreed || isAdmin ? getPreparationOverview(user.id) : Promise.resolve(null)), [agreed])
  const [busy, setBusy] = useState(false)

  if (!agreed && !isAdmin) return <LockedPanel />

  async function ask() {
    setBusy(true)
    try {
      const rec = await requestSimulatorAccess()
      setStatus((s) => ({ ...s, request: rec }))
      toast.success('Request sent. An administrator will review it.')
    } catch (err) {
      toast.error(toUserMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const sims = overview.data?.assessments.filter((a) => a.kind === 'simulator') ?? []

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6" data-testid="simulator-access">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><MonitorPlay className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-navy-900">Agency Simulator</h2>
              <p className="mt-1 max-w-xl text-sm text-slate-500">Practice real insurance-agency tasks (certificate requests, system navigation and policy service) in a simulated workspace with fictional data. Access is approved by an administrator. We recommend finishing the preparation courses first.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <RequestBadge status={isAdmin && !request ? 'approved' : request?.status} />
                {request?.requested_at && <span>Requested {formatWhen(request.requested_at)}</span>}
                {request?.decided_at && <span>· Reviewed {formatWhen(request.decided_at)}</span>}
              </div>
            </div>
          </div>
          {!isAdmin && (!request || request.status === 'rejected') && (
            <Button onClick={ask} loading={busy}>{request ? 'Request access again' : 'Request Simulator Access'}</Button>
          )}
        </div>

        {request?.status === 'pending' && (
          <Alert type="info" className="mt-4"><span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> Your request is pending. You’ll be able to start as soon as an administrator approves it.</span></Alert>
        )}
        {request?.status === 'rejected' && (
          <Alert type="error" title="Your request was not approved" className="mt-4">
            {request.admin_note ? <>Note from the administrator: “{request.admin_note}”</> : 'No note was added. You can contact your administrator or request access again.'}
          </Alert>
        )}
        {request?.status === 'approved' && request.admin_note && (
          <Alert type="success" className="mt-4">Note from the administrator: “{request.admin_note}”</Alert>
        )}
        {isAdmin && <p className="mt-4 text-xs text-slate-400">You’re viewing as an administrator, so the simulator is always available to you.</p>}
      </Card>

      {approved && (
        overview.loading ? <Skeleton className="h-40" /> : overview.error ? (
          <Alert type="error">{toUserMessage(overview.error)}</Alert>
        ) : (
          <section className="space-y-3" aria-label="Simulator activities">
            {sims.map((a) => (
              <Link key={a.id} to={`/lava-portal/simulator/${a.id}`} className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md" data-testid="simulator-activity">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  {a.result?.passed ? <CheckCircle2 className="h-5 w-5" /> : a.result ? <XCircle className="h-5 w-5" /> : <MonitorPlay className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900">{a.title}</p>
                  <p className="line-clamp-2 text-sm text-slate-500">{a.description}</p>
                  <div className="mt-1.5"><QuizStatus quiz={a} label="Simulation" /></div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-navy-700" />
              </Link>
            ))}
            {!sims.length && <p className="text-sm text-slate-500">No simulator activities have been published yet.</p>}
          </section>
        )
      )}
    </div>
  )
}
