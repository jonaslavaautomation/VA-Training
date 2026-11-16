import { Link } from 'react-router-dom'
import { Check, Users, X } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import ProgressBar from '@/components/ui/ProgressBar'
import { RequestBadge } from '@/components/lava/LavaUi'
import { useAsync } from '@/hooks/useAsync'
import { listApplicants } from '@/services/lavaService'
import { fullName } from '@/lib/format'
import { toUserMessage } from '@/lib/errors'

const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—')
const Answer = ({ yes, label }) => (
  <span className={`inline-flex items-center gap-1 text-xs ${yes ? 'text-mint-700' : 'text-red-600'}`} title={label}>
    {yes ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} {label}
  </span>
)

/** /admin/lava/applicants — agreement answers (read-only), preparation progress, simulator status. */
export default function AdminLavaApplicantsPage() {
  const { data, loading, error, reload } = useAsync(listApplicants)
  if (error) return <Alert type="error">{toUserMessage(error, 'Couldn’t load applicants.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
  if (loading) return <Skeleton className="h-48" />
  if (!data.length) return <EmptyState icon={Users} title="No applicants yet" description="Members appear here after they answer the LAVA applicant agreement." />

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Agreement answers are recorded by each member and can’t be edited here. Agreeing is not an offer or a hiring decision.</p>
      <Card><ul className="divide-y divide-slate-100">
        {data.map((a) => {
          const pct = a.progress?.lessonsTotal ? Math.round((a.progress.lessonsDone / a.progress.lessonsTotal) * 100) : 0
          return (
            <li key={a.user_id} className="grid grid-cols-1 gap-3 p-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)] md:items-center" data-testid="applicant-row">
              <div className="min-w-0">
                <Link to={`/admin/members/${a.user_id}`} className="block truncate font-medium text-navy-900 hover:text-navy-700">{fullName(a.member ?? {}) || a.member?.email}</Link>
                <p className="truncate text-sm text-slate-500">{a.member?.email}</p>
                <div className="mt-1.5">{a.agreed ? <Badge tone="mint">Agreed {when(a.agreed_at)}</Badge> : <Badge tone="red">Did not agree · {when(a.answered_at)}</Badge>}</div>
              </div>
              <div className="flex flex-col gap-1">
                <Answer yes={a.onsite_training} label="45 days onsite training" />
                <Answer yes={a.wfh_transition} label="Then work from home" />
                <Answer yes={a.preparation} label="Preparation courses & assessments" />
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                <div className="flex justify-between"><span>Lessons {a.progress?.lessonsDone ?? 0}/{a.progress?.lessonsTotal ?? 0}</span><span>{pct}%</span></div>
                <ProgressBar value={pct} />
                <div className="flex flex-wrap items-center gap-2"><span>{a.progress?.passedAssessments ?? 0} assessments passed</span><RequestBadge status={a.simulator} /></div>
              </div>
            </li>
          )
        })}
      </ul></Card>
    </div>
  )
}
