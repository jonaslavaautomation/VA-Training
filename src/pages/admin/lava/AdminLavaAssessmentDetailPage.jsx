import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import SimulatorScreen from '@/components/lava/SimulatorScreen'
import { ConfirmDelete, Select, TextArea } from '@/components/lava/AdminFields'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { deleteQuestion, getAssessmentAdmin, saveQuestion } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

const fieldsToText = (fields) => (fields ?? []).map(([k, v]) => `${k} | ${v}`).join('\n')
const textToFields = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf('|'); return i < 0 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim()] })

function QuestionModal({ question, assessment, nextOrder, onClose, onSaved }) {
  const isSim = assessment.kind === 'simulator'
  const ctx = question?.context ?? {}
  const [form, setForm] = useState({
    prompt: question?.prompt ?? '', scenario: question?.scenario ?? '', options: (question?.options ?? ['', '', '', '']).join('\n'),
    answer: question?.answer ?? 0, explanation: question?.explanation ?? '', sort_order: question?.sort_order ?? nextOrder,
    ctxKind: ctx.kind ?? 'email', ctxTitle: ctx.title ?? '', ctxFields: fieldsToText(ctx.fields), ctxBody: ctx.body ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const options = form.options.split('\n').map((s) => s.trim()).filter(Boolean)
  const context = isSim && (form.ctxTitle.trim() || form.ctxBody.trim() || form.ctxFields.trim())
    ? { kind: form.ctxKind, title: form.ctxTitle.trim(), fields: textToFields(form.ctxFields), body: form.ctxBody.trim() || undefined }
    : null

  async function save() {
    if (!form.prompt.trim()) { setError('The question is required.'); return }
    setSaving(true); setError('')
    try { await saveQuestion(question?.id, assessment.id, { ...form, context }); onSaved() } catch (err) { setError(toUserMessage(err)) } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={saving ? undefined : onClose} title={question ? 'Edit question' : 'New question'} footer={
      <><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>
    }>
      <div className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        {isSim && (
          <fieldset className="space-y-3 rounded-xl bg-slate-50 p-3">
            <legend className="px-1 text-sm font-semibold text-navy-900">Simulator screen</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select label="Screen type" value={form.ctxKind} onChange={set('ctxKind')} options={[['email', 'Email'], ['record', 'Agency system record'], ['form', 'Form'], ['note', 'Note / message']]} />
              <Input label="Screen title" value={form.ctxTitle} onChange={set('ctxTitle')} />
            </div>
            <TextArea label="Fields" rows={4} value={form.ctxFields} onChange={set('ctxFields')} hint="One per line: Label | value. Use fictional data only." />
            <TextArea label="Body text" rows={4} value={form.ctxBody} onChange={set('ctxBody')} />
            {context && <SimulatorScreen context={context} />}
          </fieldset>
        )}
        <TextArea label="Scenario (optional)" rows={2} maxLength={3000} value={form.scenario} onChange={set('scenario')} />
        <TextArea label="Question" rows={2} maxLength={1000} value={form.prompt} onChange={set('prompt')} />
        <TextArea label="Answer options" rows={4} value={form.options} onChange={set('options')} hint="One option per line (2–6)." />
        <Select label="Correct answer" value={form.answer} onChange={set('answer')} options={options.map((o, i) => [i, `${String.fromCharCode(65 + i)}. ${o.slice(0, 80)}`])} />
        <TextArea label="Explanation (shown after submitting)" rows={2} maxLength={2000} value={form.explanation} onChange={set('explanation')} />
        <Input label="Order" type="number" value={form.sort_order} onChange={set('sort_order')} />
      </div>
    </Modal>
  )
}

/** /admin/lava/assessments/:id — questions with the answer key (admins only). */
export default function AdminLavaAssessmentDetailPage() {
  const { id } = useParams()
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(() => getAssessmentAdmin(id), [id])
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  if (error) return <Alert type="error">{toUserMessage(error, 'Couldn’t load this assessment.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
  if (loading) return <Skeleton className="h-64" />
  if (!data) return <EmptyState title="Assessment not found"><Link to="/admin/lava/assessments" className="text-sm font-medium text-navy-700">Back</Link></EmptyState>

  return (
    <div className="space-y-4">
      <Link to="/admin/lava/assessments" className="inline-flex min-h-6 items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900"><ArrowLeft className="h-4 w-4" /> All assessments</Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-navy-900">{data.title}</h2><Badge tone={data.kind === 'simulator' ? 'navy' : 'gray'}>{data.kind === 'simulator' ? 'Simulator' : 'Quiz'}</Badge>{data.status === 'published' ? <Badge tone="mint">Published</Badge> : <Badge tone="amber">Draft</Badge>}</div>
          <p className="text-sm text-slate-500">{data.questions.length} questions · pass {data.pass_percent}%</p>
        </div>
        <Button onClick={() => setEditing({ question: null })}><Plus className="h-4 w-4" /> New question</Button>
      </div>
      <ol className="space-y-3">
        {data.questions.map((q, i) => (
          <li key={q.id}>
            <Card className="p-4" data-testid="admin-question">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  {q.context?.title && <p className="mb-1 text-xs text-slate-400">Screen: {q.context.title}</p>}
                  <p className="font-medium text-navy-900">{i + 1}. {q.prompt}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {q.options.map((o, j) => <li key={j} className={j === q.answer ? 'font-medium text-mint-700' : 'text-slate-600'}>{j === q.answer && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}{String.fromCharCode(65 + j)}. {o}</li>)}
                  </ul>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="secondary" onClick={() => setEditing({ question: q })} aria-label={`Edit question ${i + 1}`}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(q)} aria-label={`Delete question ${i + 1}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>
      {!data.questions.length && <p className="text-sm text-slate-500">No questions yet.</p>}
      {editing && <QuestionModal question={editing.question} assessment={data} nextOrder={(data.questions.at(-1)?.sort_order ?? 0) + 1} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); toast.success('Question saved.') }} />}
      {deleting && <ConfirmDelete title="Delete question?" message="This question will be removed. Past attempts keep their scores." onClose={() => setDeleting(null)} onConfirm={async () => {
        try { await deleteQuestion(deleting.id); setDeleting(null); reload(); toast.success('Question deleted.') } catch (err) { toast.error(toUserMessage(err)) }
      }} />}
    </div>
  )
}
