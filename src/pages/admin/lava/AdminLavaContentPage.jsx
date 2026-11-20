import { useState } from 'react'
import { Pencil } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import RichTextEditor from '@/components/lava/RichTextEditor'
import { Select } from '@/components/lava/AdminFields'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { listContentAdmin, saveContent } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

const WHERE = {
  overview: 'About LAVA page', history: 'About LAVA page', mission_vision: 'About LAVA page', services: 'About LAVA page',
  niches: 'About LAVA page', clients: 'About LAVA page', work_arrangement: 'Reference text (the 45-day notice is also built into every LAVA page)', agreement_intro: 'Agreement page introduction',
}
const hasPlaceholders = (body) => /\[[^\]]+\]|DRAFT FOR ADMINISTRATOR REVIEW/.test(body)

function ContentModal({ row, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState({ title: row.title, body: row.body, status: row.status })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const publishingPlaceholders = form.status === 'published' && hasPlaceholders(form.body)

  async function save() {
    if (!form.title.trim()) { setError('A title is required.'); return }
    setSaving(true)
    setError('')
    try { onSaved(await saveContent(row.key, form, user.id)) } catch (err) { setError(toUserMessage(err)) } finally { setSaving(false) }
  }

  return (
    <Modal open size="xl" onClose={saving ? undefined : onClose} title={`Edit: ${row.title}`} description={WHERE[row.key]} footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} loading={saving}>Save</Button>
      </>
    }>
      <div className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        <Input label="Title" maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <RichTextEditor label="Content" rows={16} maxLength={20000} value={form.body} onChange={(body) => setForm((f) => ({ ...f, body }))} />
        <Select label="Visibility" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[['draft', 'Draft: only admins can see it'], ['published', 'Published: visible to members']]} />
        {publishingPlaceholders && <Alert type="error">This text still contains [placeholders] or the draft note. Replace them with verified information before publishing.</Alert>}
      </div>
    </Modal>
  )
}

/** /admin/lava/content — company information shown in the LAVA portal. */
export default function AdminLavaContentPage() {
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(listContentAdmin)
  const [editing, setEditing] = useState(null)

  if (error) return <Alert type="error">{toUserMessage(error, 'Couldn’t load content.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
  if (loading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      <Alert type="info">No verified company information was available when these sections were set up, so the company sections start as <strong>drafts</strong> with [placeholders]. Members only see a section after you publish it.</Alert>
      <Card><ul className="divide-y divide-slate-100">
        {data.map((row) => (
          <li key={row.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center" data-testid="content-row">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-navy-900">{row.title}</p>
                {row.status === 'published' ? <Badge tone="mint">Published</Badge> : <Badge tone="amber">Draft</Badge>}
                {hasPlaceholders(row.body) && <Badge tone="red">Needs review</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{WHERE[row.key] ?? 'Portal'} · updated {new Date(row.updated_at).toLocaleDateString()}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setEditing(row)} aria-label={`Edit ${row.title}`}><Pencil className="h-4 w-4" /> Edit</Button>
          </li>
        ))}
      </ul></Card>
      {editing && <ContentModal row={editing} onClose={() => setEditing(null)} onSaved={(saved) => { setData((d) => d.map((r) => (r.key === saved.key ? saved : r))); setEditing(null); toast.success('Section saved.') }} />}
    </div>
  )
}
