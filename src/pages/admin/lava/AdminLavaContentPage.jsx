import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import RichTextEditor from '@/components/lava/RichTextEditor'
import { ConfirmDelete, Select } from '@/components/lava/AdminFields'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { deleteContent, listContentAdmin, restoreContent, saveContent, savePastedPhoto } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

const WHERE = {
  overview: 'About LAVA page', history: 'About LAVA page', mission_vision: 'About LAVA page', services: 'About LAVA page',
  niches: 'About LAVA page', clients: 'About LAVA page', work_arrangement: 'Reference text (the 45-day notice is also built into every LAVA page)', agreement_intro: 'Agreement page introduction',
}
// [placeholder] text left from the drafts — but not [link text](https://…).
const hasPlaceholders = (body) => /\[[^\]\n]+\](?!\()|DRAFT FOR ADMINISTRATOR REVIEW/.test(body.replace(/^\s*:::(html|code)\s*$[\s\S]*?^\s*:::\s*$/gim, ''))

// The six company sections shown on the About LAVA page (they can be deleted and added back).
const COMPANY_SECTIONS = [
  ['overview', 'What is LAVA Automation?', 1],
  ['history', 'Company Origin and History', 2],
  ['mission_vision', 'Mission and Vision', 3],
  ['services', 'What Does LAVA Do?', 4],
  ['niches', "The Company's Niches", 5],
  ['clients', 'Clients and Industries We Serve', 6],
]
// Used by the applicant flow — edit or unpublish them, but don't delete.
const PROTECTED = { work_arrangement: 'Needed for the 45-day working arrangement', agreement_intro: 'Needed for the applicant agreement page' }

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
        <RichTextEditor label="Content" rows={16} maxLength={50000} onPastePhoto={savePastedPhoto} embeds value={form.body} onChange={(body) => setForm((f) => ({ ...f, body }))} />
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
  const [deleting, setDeleting] = useState(null)
  const [restoring, setRestoring] = useState(null)

  async function restore([key, title, order]) {
    setRestoring(key)
    try {
      const row = await restoreContent(key, title, order)
      setData((d) => [...d, row].sort((a, b) => a.sort_order - b.sort_order))
      toast.success(`“${title}” added back as an empty draft.`)
    } catch (err) { toast.error(toUserMessage(err)) } finally { setRestoring(null) }
  }

  if (error) return <Alert type="error">{toUserMessage(error, 'Couldn’t load content.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
  if (loading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      {(() => {
        const exposed = data.filter((r) => r.status === 'published' && hasPlaceholders(r.body))
        return exposed.length > 0 ? (
          <Alert type="error" title={`${exposed.length} published section${exposed.length === 1 ? ' still contains' : 's still contain'} [placeholders] that members can see`}>
            {exposed.map((r) => r.title).join(', ')}. Replace the placeholder text, set it back to Draft, or delete sections you don’t need.
          </Alert>
        ) : (
          <Alert type="info">Members only see published sections. Edit a section to add verified company information, or delete sections you don’t need (you can add them back later).</Alert>
        )
      })()}
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
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(row)} aria-label={`Edit ${row.title}`}><Pencil className="h-4 w-4" /> Edit</Button>
              {PROTECTED[row.key] ? (
                <span title={`${PROTECTED[row.key]}. You can edit or unpublish it instead.`} className="inline-flex h-8 cursor-not-allowed items-center rounded-lg px-2.5 text-slate-300" aria-label={`${row.title} can't be deleted`}><Trash2 className="h-4 w-4" /></span>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setDeleting(row)} aria-label={`Delete ${row.title}`} className="text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Delete</span></Button>
              )}
            </div>
          </li>
        ))}
      </ul></Card>
      {(() => {
        const missing = COMPANY_SECTIONS.filter(([key]) => !data.some((r) => r.key === key))
        if (!missing.length) return null
        return (
          <Card className="p-4">
            <p className="text-sm font-medium text-navy-900">Removed sections</p>
            <p className="mt-0.5 text-xs text-slate-500">Members don’t see these. Add one back if you need it later (it starts as an empty draft).</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {missing.map((m) => (
                <Button key={m[0]} size="sm" variant="secondary" onClick={() => restore(m)} loading={restoring === m[0]} aria-label={`Add back ${m[1]}`}><Plus className="h-4 w-4" /> {m[1]}</Button>
              ))}
            </div>
          </Card>
        )
      })()}
      {deleting && (
        <ConfirmDelete
          title="Delete this section?"
          message={`“${deleting.title}” will be removed from the About LAVA page right away. You can add it back later as an empty draft, but its current text will be lost.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteContent(deleting.key)
              setData((d) => d.filter((r) => r.key !== deleting.key))
              toast.success(`“${deleting.title}” deleted.`)
              setDeleting(null)
            } catch (err) { toast.error(toUserMessage(err)) }
          }}
        />
      )}
      {editing && <ContentModal row={editing} onClose={() => setEditing(null)} onSaved={(saved) => { setData((d) => d.map((r) => (r.key === saved.key ? saved : r))); setEditing(null); toast.success('Section saved.') }} />}
    </div>
  )
}
