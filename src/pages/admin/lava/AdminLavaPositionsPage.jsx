import { useState } from 'react'
import { Archive, Briefcase, CircleSlash, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { HiringBadge } from '@/components/lava/LavaUi'
import { ConfirmDelete, TextArea } from '@/components/lava/AdminFields'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { ARRANGEMENT_TEXT, deletePosition, listPositionsAdmin, savePosition, setPositionStatus } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

const DEFAULT_ARRANGEMENT = 'Onsite for the first 45 days (training), then work from home.'

function PositionModal({ position, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState(() => ({
    title: position?.title ?? '',
    niche: position?.niche ?? '',
    description: position?.description ?? '',
    responsibilities: (position?.responsibilities ?? []).join('\n'),
    required_skills: (position?.required_skills ?? []).join('\n'),
    qualifications: (position?.qualifications ?? []).join('\n'),
    compensation: position?.compensation ?? '',
    work_arrangement: position?.work_arrangement ?? DEFAULT_ARRANGEMENT,
    sort_order: position?.sort_order ?? 0,
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const remoteFromDayOne = /fully remote|remote from (day|the first day)|100% remote/i.test(form.work_arrangement) || !/45/.test(form.work_arrangement)

  async function save() {
    if (!form.title.trim()) { setError('A job title is required.'); return }
    setSaving(true); setError('')
    try { onSaved(await savePosition(position?.id, form, user.id), !position) } catch (err) { setError(toUserMessage(err)) } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={saving ? undefined : onClose} title={position ? 'Edit position' : 'Add position'} description={position ? undefined : 'New positions are saved as drafts. Publish them when the details are confirmed.'} footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} loading={saving}>Save</Button>
      </>
    }>
      <div className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        <Input label="Job title" maxLength={120} value={form.title} onChange={set('title')} placeholder="e.g. Insurance Virtual Assistant" />
        <Input label="Job niche" maxLength={80} value={form.niche} onChange={set('niche')} placeholder="e.g. Insurance agency support" />
        <TextArea label="Job description" rows={4} maxLength={5000} value={form.description} onChange={set('description')} />
        <TextArea label="Responsibilities" rows={4} value={form.responsibilities} onChange={set('responsibilities')} hint="One per line." />
        <TextArea label="Required skills" rows={3} value={form.required_skills} onChange={set('required_skills')} hint="One per line." />
        <TextArea label="Qualifications" rows={3} value={form.qualifications} onChange={set('qualifications')} hint="One per line." />
        <Input label="Salary / compensation (optional)" maxLength={200} value={form.compensation} onChange={set('compensation')} placeholder="Leave empty to show “To be announced”" hint="Only enter confirmed figures." />
        <TextArea label="Working arrangement" rows={2} maxLength={500} value={form.work_arrangement} onChange={set('work_arrangement')} hint={`Company policy: ${ARRANGEMENT_TEXT}`} />
        {remoteFromDayOne && <Alert type="error">This wording doesn’t mention the 45-day onsite training. LAVA roles must not be described as fully remote from day one.</Alert>}
        <Input label="Display order" type="number" value={form.sort_order} onChange={set('sort_order')} hint="Lower numbers are shown first." />
      </div>
    </Modal>
  )
}

/** /admin/lava/positions — add, edit, publish (open), close, archive, delete. */
export default function AdminLavaPositionsPage() {
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(listPositionsAdmin)
  const [editing, setEditing] = useState(null) // { position } | null
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(null)

  async function changeStatus(p, status, message) {
    setBusy(p.id)
    try {
      const saved = await setPositionStatus(p.id, status)
      setData((d) => d.map((x) => (x.id === saved.id ? saved : x)))
      toast.success(message)
    } catch (err) { toast.error(toUserMessage(err)) } finally { setBusy(null) }
  }

  if (error) return <Alert type="error">{toUserMessage(error, 'Couldn’t load positions.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
  if (loading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">Draft = admins only · Hiring = shown as “Now hiring” · Closed = shown as “Not currently hiring” · Archived = hidden.</p>
        <Button onClick={() => setEditing({ position: null })}><Plus className="h-4 w-4" /> Add position</Button>
      </div>
      {!data.length ? (
        <EmptyState icon={Briefcase} title="No positions yet" description="Add a position with confirmed details. Members see “No positions announced yet” until one is published." />
      ) : (
        <Card><ul className="divide-y divide-slate-100">
          {data.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center" data-testid="position-row">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-navy-900">{p.title}</p><HiringBadge status={p.status} /></div>
                <p className="mt-0.5 text-xs text-slate-500">{p.niche || 'No niche'} · {p.compensation || 'Compensation not announced'}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => setEditing({ position: p })} aria-label={`Edit ${p.title}`}><Pencil className="h-4 w-4" /> Edit</Button>
                {p.status !== 'open' && <Button size="sm" onClick={() => changeStatus(p, 'open', `${p.title} is published as hiring.`)} disabled={busy === p.id}><Send className="h-4 w-4" /> Publish (hiring)</Button>}
                {p.status === 'open' && <Button size="sm" variant="secondary" onClick={() => changeStatus(p, 'closed', `${p.title} is closed.`)} disabled={busy === p.id}><CircleSlash className="h-4 w-4" /> Close</Button>}
                {p.status !== 'archived' && p.status !== 'draft' && <Button size="sm" variant="ghost" onClick={() => changeStatus(p, 'archived', `${p.title} archived.`)} disabled={busy === p.id}><Archive className="h-4 w-4" /> Archive</Button>}
                <Button size="sm" variant="ghost" onClick={() => setDeleting(p)} aria-label={`Delete ${p.title}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
            </li>
          ))}
        </ul></Card>
      )}
      {editing && <PositionModal position={editing.position} onClose={() => setEditing(null)} onSaved={(saved, created) => {
        setData((d) => (created ? [...d, saved] : d.map((x) => (x.id === saved.id ? saved : x))))
        setEditing(null)
        toast.success(created ? 'Position saved as a draft.' : 'Position updated.')
      }} />}
      {deleting && <ConfirmDelete title="Delete position?" message={`“${deleting.title}” will be removed permanently. To hide it but keep a record, archive it instead.`} onClose={() => setDeleting(null)} onConfirm={async () => {
        try { await deletePosition(deleting.id); setData((d) => d.filter((x) => x.id !== deleting.id)); setDeleting(null); toast.success('Position deleted.') } catch (err) { toast.error(toUserMessage(err)) }
      }} />}
    </div>
  )
}
