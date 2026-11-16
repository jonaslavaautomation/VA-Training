import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Button, { LinkButton } from '@/components/ui/Button'
import RichText from '@/components/lava/RichText'
import LessonMaterials from '@/components/lava/LessonMaterials'
import { LockedPanel } from '@/components/lava/LavaUi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { getCourse, getLessonMaterials, setLessonComplete } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

/** /lava-portal/courses/:slug/lessons/:lessonId — reading view with "mark complete". */
export default function LavaLessonPage() {
  const { slug, lessonId } = useParams()
  const { agreed } = useOutletContext()
  const { user, isAdmin } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const unlocked = agreed || isAdmin
  const { data: course, loading, error, reload, setData } = useAsync(() => (unlocked ? getCourse(slug, user.id) : Promise.resolve(null)), [slug, unlocked])
  const [saving, setSaving] = useState(false)
  const [materials, setMaterials] = useState(null)

  const index = course?.lessons.findIndex((l) => l.id === lessonId) ?? -1
  const lesson = index >= 0 ? course.lessons[index] : null
  const prev = index > 0 ? course.lessons[index - 1] : null
  const next = index >= 0 ? course.lessons[index + 1] : null

  useEffect(() => { window.scrollTo?.(0, 0) }, [lessonId])
  useEffect(() => {
    setMaterials(null)
    if (!lesson?.id) return
    let active = true
    getLessonMaterials([lesson.id]).then((m) => active && setMaterials(m[lesson.id] ?? [])).catch(() => active && setMaterials([]))
    return () => { active = false }
  }, [lesson?.id])

  if (!unlocked) return <LockedPanel />
  if (error) return <Alert type="error">{toUserMessage(error, 'Couldn’t load this lesson.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
  if (loading) return <Skeleton className="h-[28rem]" />
  if (!lesson) return <EmptyState title="Lesson not found"><Link to={`/lava-portal/courses/${slug}`} className="text-sm font-medium text-navy-700">Back to the course</Link></EmptyState>

  async function toggle(complete, goNext) {
    setSaving(true)
    try {
      await setLessonComplete(user.id, lesson.id, complete)
      setData((c) => ({ ...c, lessons: c.lessons.map((l) => (l.id === lesson.id ? { ...l, completed: complete } : l)) }))
      if (complete && goNext) {
        if (next) navigate(`/lava-portal/courses/${slug}/lessons/${next.id}`)
        else { toast.success('Course lessons completed! Take the quiz to check your understanding.'); navigate(`/lava-portal/courses/${slug}`) }
      }
    } catch (err) {
      toast.error(toUserMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to={`/lava-portal/courses/${slug}`} className="inline-flex min-h-6 items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900"><ArrowLeft className="h-4 w-4" /> {course.title}</Link>
      <Card className="p-5 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Lesson {index + 1} of {course.lessons.length} · {lesson.minutes} min read</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-navy-900">{lesson.title}</h2>
        {lesson.completed && <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-mint-700"><CheckCircle2 className="h-4 w-4" /> Completed</p>}
        {materials?.length > 0 && <div className="mt-6"><LessonMaterials items={materials} /></div>}
        <RichText text={lesson.body} className="mt-6" />
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {prev ? <LinkButton variant="secondary" to={`/lava-portal/courses/${slug}/lessons/${prev.id}`}><ArrowLeft className="h-4 w-4" /> Previous</LinkButton> : <span />}
        <div className="flex flex-col gap-2 sm:flex-row">
          {lesson.completed ? (
            <>
              <Button variant="ghost" onClick={() => toggle(false)} loading={saving}>Mark as not completed</Button>
              {next ? <LinkButton to={`/lava-portal/courses/${slug}/lessons/${next.id}`}>Next lesson <ArrowRight className="h-4 w-4" /></LinkButton>
                : course.quiz ? <LinkButton to={`/lava-portal/assessments/${course.quiz.id}`}>Take the quiz <ArrowRight className="h-4 w-4" /></LinkButton> : null}
            </>
          ) : (
            <Button onClick={() => toggle(true, true)} loading={saving}><CheckCircle2 className="h-4 w-4" /> {next ? 'Mark complete & continue' : 'Mark complete & finish'}</Button>
          )}
        </div>
      </div>
    </div>
  )
}
