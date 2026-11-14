import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Archive, ArchiveRestore, Eye, EyeOff, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import AnnouncementFormModal from '@/components/admin/AnnouncementFormModal'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { deleteAnnouncement, displayStatus, listAnnouncementsAdmin, setAnnouncementStatus } from '@/services/announcementService'
import { formatDate, fullName } from '@/lib/format'
import { toUserMessage } from '@/lib/errors'

const tabs = [
  { value: '', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Drafts' },
  { value: 'archived', label: 'Archived' },
]

function StatusBadge({ a }) {
  const s = displayStatus(a)
  if (s === 'published') return <Badge tone="mint">Published</Badge>
  if (s === 'scheduled') return <Badge tone="navy">Scheduled · {new Date(a.publish_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</Badge>
  if (s === 'archived') return <Badge tone="gray">Archived</Badge>
  return <Badge tone="amber">Draft</Badge>
}

export default function AnnouncementsPage() {
  const { isPreview } = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const { data, loading, error, reload, setData } = useAsync(listAnnouncementsAdmin)
  const [tab, setTab] = useState('')
  const [editing, setEditing] = useState(null) // { announcement: null | row }
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (params.get('new') !== '1') return
    setEditing({ announcement: null })
    setParams({}, { replace: true })
  }, [params, setParams])

  const counts = useMemo(() => {
    const c = { '': 0, published: 0, scheduled: 0, draft: 0, archived: 0 }
    for (const a of data ?? []) { c[''] += 1; c[displayStatus(a)] += 1 }
    return c
  }, [data])
  const shown = (data ?? []).filter((a) => !tab || displayStatus(a) === tab)

  const upsert = (row) => setData((list) => {
    const l = list ?? []
    return l.some((a) => a.id === row.id) ? l.map((a) => (a.id === row.id ? row : a)) : [row, ...l]
  })

  async function changeStatus(a, status, message) {
    setBusy(a.id)
    try {
      upsert(await setAnnouncementStatus(a, status))
      toast.success(message)
    } catch (err) {
      toast.error(toUserMessage(err, 'Couldn’t update the announcement.'))
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    const a = confirmDelete
    setBusy(a.id)
    try {
      await deleteAnnouncement(a)
      setData((list) => list.filter((x) => x.id !== a.id))
      setConfirmDelete(null)
      toast.success(`“${a.title}” deleted.`)
    } catch (err) {
      toast.error(toUserMessage(err, 'Couldn’t delete the announcement.'))
    } finally {
      setBusy(null)
    }
  }

  const iconBtn = 'rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-900 disabled:opacity-40'

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Share updates with members. Published announcements appear on every member’s dashboard."
        actions={<Button onClick={() => setEditing({ announcement: null })} disabled={isPreview}><Plus className="h-4 w-4" /> New announcement</Button>}
      />

      {error ? (
        <Alert type={isPreview ? 'info' : 'error'}>
          {toUserMessage(error, 'Couldn’t load announcements.')}{' '}
          {!isPreview && <button onClick={reload} className="font-semibold underline-offset-2 hover:underline">Try again</button>}
        </Alert>
      ) : (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Announcement status">
              {tabs.map((t) => (
                <button
                  key={t.value || 'all'}
                  role="tab"
                  aria-selected={tab === t.value}
                  onClick={() => setTab(t.value)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t.value ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'}`}
                >
                  {t.label} <span className="text-xs text-slate-400">{loading ? '–' : counts[t.value]}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
          ) : !shown.length ? (
            <EmptyState icon={Megaphone} title={data?.length ? 'Nothing here' : 'No announcements yet'} description={data?.length ? 'No announcements with this status.' : 'Create your first announcement to keep members informed.'}>
              {!data?.length && <Button onClick={() => setEditing({ announcement: null })}><Plus className="h-4 w-4" /> New announcement</Button>}
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {shown.map((a) => {
                const s = displayStatus(a)
                return (
                  <li key={a.id}>
                    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                      {a.image_url && <img src={a.image_url} alt="" className="h-24 w-full shrink-0 rounded-xl object-cover sm:w-40" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-navy-900">{a.title}</h3>
                          <StatusBadge a={a} />
                        </div>
                        <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-slate-600">{a.content}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          Created {formatDate(a.created_at)}
                          {a.published_at && s !== 'scheduled' && <> · Published {formatDate(a.published_at)}</>}
                          {a.author && <> · by {fullName(a.author) || a.author.email}</>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-start gap-0.5 sm:flex-col sm:items-end">
                        <div className="flex gap-0.5">
                          <button onClick={() => setEditing({ announcement: a })} className={iconBtn} title="Edit" aria-label={`Edit ${a.title}`}><Pencil className="h-4 w-4" /></button>
                          {s === 'published' || s === 'scheduled' ? (
                            <button onClick={() => changeStatus(a, 'draft', `“${a.title}” unpublished.`)} disabled={busy === a.id} className={iconBtn} title="Unpublish" aria-label={`Unpublish ${a.title}`}><EyeOff className="h-4 w-4" /></button>
                          ) : (
                            <button onClick={() => changeStatus(a, 'published', `“${a.title}” is now live for members.`)} disabled={busy === a.id} className={iconBtn} title="Publish now" aria-label={`Publish ${a.title}`}><Eye className="h-4 w-4" /></button>
                          )}
                          {s === 'archived' ? (
                            <button onClick={() => changeStatus(a, 'draft', `“${a.title}” restored as a draft.`)} disabled={busy === a.id} className={iconBtn} title="Restore as draft" aria-label={`Restore ${a.title}`}><ArchiveRestore className="h-4 w-4" /></button>
                          ) : (
                            <button onClick={() => changeStatus(a, 'archived', `“${a.title}” archived.`)} disabled={busy === a.id} className={iconBtn} title="Archive" aria-label={`Archive ${a.title}`}><Archive className="h-4 w-4" /></button>
                          )}
                          <button onClick={() => setConfirmDelete(a)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Delete" aria-label={`Delete ${a.title}`}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {editing && (
        <AnnouncementFormModal
          announcement={editing.announcement}
          onClose={() => setEditing(null)}
          onSaved={(row, { created }) => {
            setEditing(null)
            upsert(row)
            const s = displayStatus(row)
            toast.success(s === 'published' ? `“${row.title}” is live for members.` : s === 'scheduled' ? `“${row.title}” scheduled.` : created ? 'Draft saved.' : 'Announcement updated.')
          }}
        />
      )}

      <Modal
        open={Boolean(confirmDelete)}
        size="sm"
        onClose={busy ? undefined : () => setConfirmDelete(null)}
        title="Delete announcement?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={Boolean(busy)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={Boolean(busy)}>Delete permanently</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">“{confirmDelete?.title}” will be permanently deleted. To hide it but keep a record, archive it instead.</p>
      </Modal>
    </>
  )
}
