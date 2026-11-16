import { Link, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Circle, ClipboardCheck } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import ProgressBar from '@/components/ui/ProgressBar'
import EmptyState from '@/components/ui/EmptyState'
import { LinkButton } from '@/components/ui/Button'
import { LockedPanel, QuizStatus } from '@/components/lava/LavaUi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { getCourse } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

/** /lava-portal/courses/:slug — lessons of one course, in order, with completion. */
export default function LavaCoursePage() {
  const { slug } = useParams()
  const { agreed } = useOutletContext()
  const { user, isAdmin } = useAuth()
  const unlocked = agreed || isAdmin
  const { data: course, loading, error, reload } = useAsync(() => (unlocked ? getCourse(slug, user.id) : Promise.resolve(null)), [slug, unlocked])

  if (!unlocked) return <LockedPanel />
  if (error) return <Alert type="error">{toUserMessage(error, 'Couldn’t load this course.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
  if (loading) return <Skeleton className="h-96" />
  if (!course) return <EmptyState title="Course not found"><Link to="/lava-portal/courses" className="text-sm font-medium text-navy-700">Back to the Preparation Center</Link></EmptyState>

  const done = course.lessons.filter((l) => l.completed).length
  const pct = course.lessons.length ? Math.round((done / course.lessons.length) * 100) : 0
  const next = course.lessons.find((l) => !l.completed) ?? course.lessons[0]

  return (
    <div className="space-y-5">
      <Link to="/lava-portal/courses" className="inline-flex min-h-6 items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900"><ArrowLeft className="h-4 w-4" /> All courses</Link>
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-navy-900">{course.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">{course.summary}</p>
          </div>
          {next && <LinkButton to={`/lava-portal/courses/${course.slug}/lessons/${next.id}`}>{done === 0 ? 'Start course' : done === course.lessons.length ? 'Review lessons' : 'Continue'}</LinkButton>}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <ProgressBar value={pct} className="flex-1" />
          <span className="text-sm font-medium text-navy-900" data-testid="course-progress">{done}/{course.lessons.length} · {pct}%</span>
        </div>
      </Card>

      <Card className="divide-y divide-slate-100">
        {course.lessons.map((l, i) => (
          <Link key={l.id} to={`/lava-portal/courses/${course.slug}/lessons/${l.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
            {l.completed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-mint-500" aria-label="Completed" /> : <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-label="Not completed" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-navy-900">{i + 1}. {l.title}</span>
              <span className="text-xs text-slate-500">{l.minutes} min read</span>
            </span>
          </Link>
        ))}
        {!course.lessons.length && <p className="p-5 text-sm text-slate-500">Lessons will be added soon.</p>}
      </Card>

      {course.quiz && (
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><ClipboardCheck className="h-5 w-5" /></div>
            <div>
              <p className="font-semibold text-navy-900">{course.quiz.title}</p>
              <p className="text-sm text-slate-500">{course.quiz.pass_percent}% needed to pass.</p>
              <div className="mt-1.5"><QuizStatus quiz={course.quiz} /></div>
            </div>
          </div>
          <LinkButton to={`/lava-portal/assessments/${course.quiz.id}`} variant={done === course.lessons.length ? 'primary' : 'secondary'}>
            {course.quiz.result ? 'Retake quiz' : 'Take the quiz'}
          </LinkButton>
        </Card>
      )}
    </div>
  )
}
