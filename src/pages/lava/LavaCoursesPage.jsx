import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, Clock } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import ProgressBar from '@/components/ui/ProgressBar'
import EmptyState from '@/components/ui/EmptyState'
import { LockedPanel, QuizStatus } from '@/components/lava/LavaUi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { getPreparationOverview } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

/** /lava-portal/courses — the LAVA Preparation Center (unlocked by the agreement). */
export default function LavaCoursesPage() {
  const { agreed } = useOutletContext()
  const { user, isAdmin } = useAuth()
  const { data, loading, error, reload } = useAsync(() => (agreed || isAdmin ? getPreparationOverview(user.id) : Promise.resolve(null)), [agreed, user?.id])

  if (!agreed && !isAdmin) return <LockedPanel />
  if (error) return <Alert type="error">{toUserMessage(error, 'Couldn’t load the courses.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
  if (loading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
  if (!data.courses.length) return <EmptyState icon={BookOpen} title="No preparation courses yet" description="Courses will appear here once they are published." />

  const next = data.courses.find((c) => c.completed < c.total || (c.quiz && !c.quiz.result?.passed))

  return (
    <div className="space-y-6">
      <Card className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">LAVA Preparation Center</h2>
          <p className="mt-1 text-sm text-slate-500">Complete the courses in order. Each course ends with a short quiz.</p>
          {next && (
            <Link to={`/lava-portal/courses/${next.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900">
              Recommended next: {next.title} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <div className="rounded-xl bg-slate-50 p-4 sm:w-60">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Overall progress</p>
          <p className="mt-1 text-2xl font-semibold text-navy-900" data-testid="prep-progress">{data.percent}%</p>
          <ProgressBar value={data.percent} className="mt-2" />
          <p className="mt-2 text-xs text-slate-500">{data.completedLessons} of {data.totalLessons} lessons completed</p>
        </div>
      </Card>

      <ol className="space-y-3">
        {data.courses.map((c, i) => {
          const done = c.total > 0 && c.completed === c.total && (!c.quiz || c.quiz.result?.passed)
          return (
            <li key={c.id}>
              <Link to={`/lava-portal/courses/${c.slug}`} className="group flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center" data-testid="course-card">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${done ? 'bg-mint-400 text-navy-900' : 'bg-navy-50 text-navy-700'}`}>
                  {done ? <CheckCircle2 className="h-5 w-5" /> : `0${i + 1}`.slice(-2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Course {i + 1}</p>
                  <h3 className="font-semibold text-navy-900">{c.title}</h3>
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{c.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {c.total} lessons</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> about {Math.max(1, Math.round(c.minutes / 5) * 5)} min</span>
                    {c.quiz && <span className="inline-flex items-center gap-1"><ClipboardCheck className="h-3.5 w-3.5" /> quiz</span>}
                    <QuizStatus quiz={c.quiz} />
                  </div>
                </div>
                <div className="sm:w-44">
                  <div className="flex items-center justify-between text-xs text-slate-500"><span>{c.completed}/{c.total} lessons</span><span>{c.percent}%</span></div>
                  <ProgressBar value={c.percent} className="mt-1.5" />
                </div>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
