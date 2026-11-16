import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ClipboardCheck, MonitorPlay, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { deleteAssessment, listAssessmentsAdmin, saveAssessment } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

function AssessmentModal({ assessment, courses, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: assessment?.title ?? '', description: assessment?.description ?? '', kind: assessment?.kind ?? 'quiz',
    course_id: assessment?.course_id ?? '', pass_percent: assessment?.pass_percent ?? 70, status: assessment?.status ?? 'draft', sort_order: assessment?.sort_order ?? 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  async function save() {
    if (!form.title.trim()) { setError('A title is required.'); return }
    setSaving(true); setError('')
    try { onSaved(await saveAssessment(assessment?.id, form), !assessment) } catch (err) { setError(toUserMessage(err)) } finally { setSaving(false) }
  }
  return (
    <Modal open onClose={saving ? undefined : onClose} title={assessment ? 'Edit assessment' : 'New assessment'} footer={
      <><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>
    }>
      <div className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        <Input label="Title" maxLength={120} value={form.title} onChange={set('title')} />
        <TextArea label="Description" rows={2} maxLength={2000} value={form.description} onChange={set('description')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Type" value={form.kind} onChange={set('kind')} options={[['quiz', 'Quiz / knowledge check'], ['simulator', 'Simulator activity (approval required)']]} />
          <Select label="Course" value={form.course_id ?? ''} onChange={set('course_id')} options={[['', 'None'], ...courses.map((c) => [c.id, c.title])]} />
          <Input label="Pass mark (%)" type="number" min={1} max={100} value={form.pass_percent} onChange={set('pass_percent')} />
          <Select label="Visibility" value={form.status} onChange={set('status')} options={[['draft', 'Draft (admins only)'], ['published', 'Published']]} />
        </div>
      </div>
    </Modal>
  )
}

/** /admin/lava/assessments — quizzes and simulator activities. */
export default function AdminLavaAssessmentsPage() {
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(listAssessmentsAdmin)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  if (error) return <Alert type="error">{toUserMessage(error, 'Couldn’t load assessments.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
  if (loading) return <Skeleton className="h-64" />

  const groups = [['quiz', 'Quizzes & knowledge checks', ClipboardCheck], ['simulator', 'Simulator activities (approved members only)', MonitorPlay]]
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">Answers are graded in the database; members never receive the answer key.</p>
        <Button onClick={() => setEditing({ assessment: null })}><Plus className="h-4 w-4" /> New assessment</Button>
      </div>
      {groups.map(([kind, title, Icon]) => (
        <section key={kind} className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900"><Icon className="h-4 w-4 text-slate-400" /> {title}</h3>
          <Card><ul className="divide-y divide-slate-100">
            {data.assessments.filter((a) => a.kind === kind).map((a) => (
              <li key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center" data-testid="admin-assessment-row">
                <Link to={`/admin/lava/assessments/${a.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-navy-900">{a.title}</p>{a.status === 'published' ? <Badge tone="mint">Published</Badge> : <Badge tone="amber">Draft</Badge>}</div>
                  <p className="text-xs text-slate-500">{a.questionCount} {kind === 'simulator' ? 'tasks' : 'questions'} · pass {a.pass_percent}%{a.course ? ` · ${a.course.title}` : ''}</p>
                </Link>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => setEditing({ assessment: a })} aria-label={`Edit ${a.title}`}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(a)} aria-label={`Delete ${a.title}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  <Link to={`/admin/lava/assessments/${a.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-sm font-medium text-navy-700 hover:bg-slate-100">Questions <ChevronRight className="h-4 w-4" /></Link>
                </div>
              </li>
            ))}
            {!data.assessments.some((a) => a.kind === kind) && <li className="p-4 text-sm text-slate-500">None yet.</li>}
          </ul></Card>
        </section>
      ))}
      {editing && <AssessmentModal assessment={editing.assessment} courses={data.courses} onClose={() => setEditing(null)} onSaved={(saved, created) => {
        const course = data.courses.find((c) => c.id === saved.course_id) ?? null
        setData((d) => ({ ...d, assessments: created ? [...d.assessments, { ...saved, course, questionCount: 0 }] : d.assessments.map((x) => (x.id === saved.id ? { ...x, ...saved, course } : x)) }))
        setEditing(null); toast.success('Assessment saved.')
      }} />}
      {deleting && <ConfirmDelete title="Delete assessment?" message={`“${deleting.title}”, its questions and all members’ attempts will be deleted. Consider setting it to Draft instead.`} onClose={() => setDeleting(null)} onConfirm={async () => {
        try { await deleteAssessment(deleting.id); setData((d) => ({ ...d, assessments: d.assessments.filter((x) => x.id !== deleting.id) })); setDeleting(null); toast.success('Assessment deleted.') } catch (err) { toast.error(toUserMessage(err)) }
      }} />}
    </div>
  )
}
