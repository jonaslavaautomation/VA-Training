import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Eye, FileText, Pencil, PlayCircle, Plus, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import RichTextEditor from '@/components/lava/RichTextEditor'
import LessonMaterialsModal from '@/components/lava/LessonMaterialsModal'
import { ConfirmDelete } from '@/components/lava/AdminFields'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { deleteLesson, getCourseAdmin, getLessonMaterials, listAttachableResources, saveLesson, swapOrder, savePastedPhoto } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

function LessonModal({ lesson, courseId, nextOrder, onClose, onSaved }) {
  const [form, setForm] = useState({ title: lesson?.title ?? '', minutes: lesson?.minutes ?? 5, body: lesson?.body ?? '', resource_id: lesson?.resource_id ?? '', sort_order: lesson?.sort_order ?? nextOrder })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  async function save() {
    if (!form.title.trim()) { setError('A title is required.'); return }
    setSaving(true); setError('')
    try { onSaved(await saveLesson(lesson?.id, courseId, form), !lesson) } catch (err) { setError(toUserMessage(err)) } finally { setSaving(false) }
  }
  return (
    <Modal open size="xl" onClose={saving ? undefined : onClose} title={lesson ? 'Edit lesson' : 'New lesson'} footer={
      <><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={save} loading={saving}>Save lesson</Button></>
    }>
      <div className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_12rem]">
          <Input label="Lesson title" maxLength={160} value={form.title} onChange={set('title')} />
          <Input label="Reading time (minutes)" type="number" min={1} max={240} value={form.minutes} onChange={set('minutes')} />
        </div>
        <p className="text-xs text-slate-500">Add videos and PDFs with the <strong>Videos &amp; PDFs</strong> button on the lesson list.</p>
        <RichTextEditor label="Lesson text" rows={18} maxLength={40000} onPastePhoto={savePastedPhoto} embeds value={form.body} onChange={(body) => setForm((f) => ({ ...f, body }))} />
      </div>
    </Modal>
  )
}

/** /admin/lava/courses/:id — lessons of one course. */
export default function AdminLavaCourseDetailPage() {
  const { id } = useParams()
  const toast = useToast()
  const { data: course, loading, error, reload, setData } = useAsync(() => getCourseAdmin(id), [id])
  const [resources, setResources] = useState([])
  const [materials, setMaterials] = useState({}) // { [lessonId]: resource[] }
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [managing, setManaging] = useState(null) // lesson whose videos & PDFs are open

  useEffect(() => { listAttachableResources().then(setResources).catch(() => setResources([])) }, [])
  const lessonKey = course?.lessons.map((l) => l.id).join() ?? ''
  useEffect(() => {
    if (!lessonKey) return
    getLessonMaterials(lessonKey.split(',')).then(setMaterials).catch(() => setMaterials({}))
  }, [lessonKey])

  if (error) return <Alert type="error">{toUserMessage(error, 'Couldn’t load this course.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
  if (loading) return <Skeleton className="h-64" />
  if (!course) return <EmptyState title="Course not found"><Link to="/admin/lava/courses" className="text-sm font-medium text-navy-700">Back to courses</Link></EmptyState>

  const lessons = course.lessons
  async function move(i, dir) {
    const a = lessons[i], b = lessons[i + dir]
    // Equal sort orders can't be swapped; renumber first.
    const fixed = a.sort_order === b.sort_order ? { a: { ...a, sort_order: i }, b: { ...b, sort_order: i + dir } } : { a, b }
    try {
      await swapOrder('lava_lessons', fixed.a, fixed.b)
      setData((c) => {
        const ls = [...c.lessons]
        ls[i] = { ...b, sort_order: fixed.a.sort_order }
        ls[i + dir] = { ...a, sort_order: fixed.b.sort_order }
        return { ...c, lessons: ls }
      })
    } catch (err) { toast.error(toUserMessage(err)) }
  }

  return (
    <div className="space-y-4">
      <Link to="/admin/lava/courses" className="inline-flex min-h-6 items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900"><ArrowLeft className="h-4 w-4" /> All courses</Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-navy-900">{course.title}</h2>{course.status === 'published' ? <Badge tone="mint">Published</Badge> : <Badge tone="amber">Draft</Badge>}</div>
          <p className="text-sm text-slate-500">{lessons.length} lessons</p>
        </div>
        <Button onClick={() => setEditing({ lesson: null })}><Plus className="h-4 w-4" /> New lesson</Button>
      </div>
      <Card><ul className="divide-y divide-slate-100">
        {lessons.map((l, i) => (
          <li key={l.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center" data-testid="admin-lesson-row">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-navy-900">{i + 1}. {l.title}</p>
              <p className="text-xs text-slate-500">
                {l.minutes} min
                {(() => {
                  const ms = materials[l.id] ?? []
                  const v = ms.filter((m) => m.resource_type === 'VIDEO').length
                  const p = ms.length - v
                  return ms.length ? <> · {v > 0 && <><PlayCircle className="inline h-3 w-3" /> {v} video{v === 1 ? '' : 's'} </>}{p > 0 && <><FileText className="inline h-3 w-3" /> {p} PDF{p === 1 ? '' : 's'}</>}</> : ' · no videos or PDFs'
                })()}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${l.title} up`}><ArrowUp className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === lessons.length - 1} aria-label={`Move ${l.title} down`}><ArrowDown className="h-4 w-4" /></Button>
              <Button size="sm" variant="secondary" onClick={() => setManaging(l)} aria-label={`Videos and PDFs for ${l.title}`}><PlayCircle className="h-4 w-4" /> <span className="hidden sm:inline">Videos &amp; PDFs</span></Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing({ lesson: l })} aria-label={`Edit ${l.title}`}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleting(l)} aria-label={`Delete ${l.title}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
          </li>
        ))}
        {!lessons.length && <li className="p-5 text-sm text-slate-500">No lessons yet.</li>}
      </ul></Card>
      {editing && <LessonModal lesson={editing.lesson} courseId={course.id} nextOrder={(lessons.at(-1)?.sort_order ?? 0) + 1} onClose={() => setEditing(null)} onSaved={(saved, created) => {
        setData((c) => ({ ...c, lessons: created ? [...c.lessons, saved] : c.lessons.map((x) => (x.id === saved.id ? saved : x)) }))
        setEditing(null); toast.success('Lesson saved.')
      }} />}
      {managing && (
        <LessonMaterialsModal
          lesson={managing}
          materials={materials[managing.id] ?? []}
          libraryResources={resources}
          onChange={(list) => setMaterials((m) => ({ ...m, [managing.id]: list }))}
          onClose={() => { setManaging(null); listAttachableResources().then(setResources).catch(() => {}) }}
        />
      )}
      {deleting && <ConfirmDelete title="Delete lesson?" message={`“${deleting.title}” and members’ completion records for it will be deleted.`} onClose={() => setDeleting(null)} onConfirm={async () => {
        try { await deleteLesson(deleting.id); setData((c) => ({ ...c, lessons: c.lessons.filter((x) => x.id !== deleting.id) })); setDeleting(null); toast.success('Lesson deleted.') } catch (err) { toast.error(toUserMessage(err)) }
      }} />}
    </div>
  )
}
