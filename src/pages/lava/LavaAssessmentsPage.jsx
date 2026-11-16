import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, ClipboardCheck, MonitorPlay } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import { LockedPanel, QuizStatus, RequestBadge } from '@/components/lava/LavaUi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { getPreparationOverview } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

/** /lava-portal/assessments — course quizzes plus the simulator status. */
export default function LavaAssessmentsPage() {
  const { agreed, status } = useOutletContext()
  const { user, isAdmin } = useAuth()
  const unlocked = agreed || isAdmin
  const { data, loading, error, reload } = useAsync(() => (unlocked ? getPreparationOverview(user.id) : Promise.resolve(null)), [unlocked])

  if (!unlocked) return <LockedPanel />
  if (error) return <Alert type="error">{toUserMessage(error, 'Couldn’t load assessments.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
  if (loading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>

  const quizzes = data.assessments.filter((a) => a.kind === 'quiz')
  const sims = data.assessments.filter((a) => a.kind === 'simulator')
  const courseTitle = (cid) => data.courses.find((c) => c.id === cid)?.title
  const passed = quizzes.filter((q) => q.result?.passed).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-navy-900">Assessments</h2>
        <p className="text-sm text-slate-500">Knowledge checks for each preparation course, including practical scenarios, terminology and ACORD form exercises. {passed} of {quizzes.length} passed.</p>
      </div>

      <Card className="divide-y divide-slate-100">
        {quizzes.map((a) => (
          <Link key={a.id} to={`/lava-portal/assessments/${a.id}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-slate-50 sm:flex-row sm:items-center" data-testid="assessment-row">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><ClipboardCheck className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="font-medium text-navy-900">{a.title}</p>
                <p className="text-xs text-slate-500">{courseTitle(a.course_id) ? `${courseTitle(a.course_id)} · ` : ''}{a.pass_percent}% to pass{a.result ? ` · ${a.result.attempts} attempt${a.result.attempts === 1 ? '' : 's'}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 pl-12 sm:pl-0"><QuizStatus quiz={a} /><ArrowRight className="h-4 w-4 text-slate-300" /></div>
          </Link>
        ))}
        {!quizzes.length && <p className="p-5 text-sm text-slate-500">No assessments have been published yet.</p>}
      </Card>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><MonitorPlay className="h-5 w-5" /></div>
          <div>
            <p className="font-semibold text-navy-900">Simulator-based activities</p>
            <p className="text-sm text-slate-500">{sims.length} hands-on activities in a simulated agency workspace. Access is approved by an administrator.</p>
            <div className="mt-1.5"><RequestBadge status={status?.request?.status} /></div>
          </div>
        </div>
        <Link to="/lava-portal/simulator" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900">Open simulator <ArrowRight className="h-4 w-4" /></Link>
      </Card>
    </div>
  )
}
