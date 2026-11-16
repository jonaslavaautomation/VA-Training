import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { ConfirmDelete, Select, TextArea } from '@/components/lava/AdminFields'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { deleteCourse, listCoursesAdmin, saveCourse } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

function CourseModal({ course, nextOrder = 0, onClose, onSaved }) {
  const [form, setForm] = useState({ title: course?.title ?? '', summary: course?.summary ?? '', status: course?.status ?? 'draft', sort_order: course?.sort_order ?? nextOrder })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  async function save() {
    if (!form.title.trim()) { setError('A title is required.'); return }
    setSaving(true); setError('')
    try { onSaved(await saveCourse(course?.id, form), !course) } catch (err) { setError(toUserMessage(err)) } finally { setSaving(false) }
  }
  return (
    <Modal open onClose={saving ? undefined : onClose} title={course ? 'Edit course' : 'New course'} footer={
      <><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>
    }>
      <div className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        <Input label="Course title" maxLength={120} value={form.title} onChange={set('title')} />
        <TextArea label="Summary" rows={3} maxLength={1000} value={form.summary} onChange={set('summary')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Visibility" value={form.status} onChange={set('status')} options={[['draft', 'Draft (admins only)'], ['published', 'Published']]} />
          <Input label="Order in the program" type="number" value={form.sort_order} onChange={set('sort_order')} />
        </div>
      </div>
    </Modal>
  )
}

/** /admin/lava/courses — the preparation program. */
export default function AdminLavaCoursesPage() {
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(listCoursesAdmin)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  if (error) return <Alert type="error">{toUserMessage(error, 'Couldn’t load courses.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
  if (loading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">Members take the courses in this order. Lessons can include a video or PDF from the Training Library.</p>
        <Button onClick={() => setEditing({ course: null })}><Plus className="h-4 w-4" /> New course</Button>
      </div>
      <Card><ul className="divide-y divide-slate-100">
        {data.map((c, i) => (
          <li key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center" data-testid="admin-course-row">
            <Link to={`/admin/lava/courses/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-sm font-semibold text-navy-700">{i + 1}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-navy-900">{c.title}</p>{c.status === 'published' ? <Badge tone="mint">Published</Badge> : <Badge tone="amber">Draft</Badge>}</div>
                <p className="text-xs text-slate-500"><BookOpen className="mr-1 inline h-3.5 w-3.5" />{c.lessonCount} lessons · {c.assessments.length} assessment{c.assessments.length === 1 ? '' : 's'}</p>
              </div>
            </Link>
            <div className="flex gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => setEditing({ course: c })} aria-label={`Edit ${c.title}`}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleting(c)} aria-label={`Delete ${c.title}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              <Link to={`/admin/lava/courses/${c.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-sm font-medium text-navy-700 hover:bg-slate-100">Lessons <ChevronRight className="h-4 w-4" /></Link>
            </div>
          </li>
        ))}
        {!data.length && <li className="p-5 text-sm text-slate-500">No courses yet.</li>}
      </ul></Card>
      {editing && <CourseModal course={editing.course} nextOrder={(data.at(-1)?.sort_order ?? 0) + 1} onClose={() => setEditing(null)} onSaved={(saved, created) => {
        setData((d) => (created ? [...d, { ...saved, lessonCount: 0, assessments: [] }] : d.map((x) => (x.id === saved.id ? { ...x, ...saved } : x))).sort((a, b) => a.sort_order - b.sort_order))
        setEditing(null); toast.success('Course saved.')
      }} />}
      {deleting && <ConfirmDelete title="Delete course?" message={`“${deleting.title}” and its ${deleting.lessonCount} lessons will be deleted, including members’ completion records for them. Its quiz is kept but detached. Consider setting it to Draft instead.`} onClose={() => setDeleting(null)} onConfirm={async () => {
        try { await deleteCourse(deleting.id); setData((d) => d.filter((x) => x.id !== deleting.id)); setDeleting(null); toast.success('Course deleted.') } catch (err) { toast.error(toUserMessage(err)) }
      }} />}
    </div>
  )
}
