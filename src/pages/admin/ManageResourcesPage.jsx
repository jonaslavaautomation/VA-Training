import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, FileUp, FolderOpen, Pencil, Search, Trash2, Upload } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button, { LinkButton } from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import ResourceTypeBadge from '@/components/resources/ResourceTypeBadge'
import ResourceThumbnail from '@/components/resources/ResourceThumbnail'
import ResourceEditModal from '@/components/admin/ResourceEditModal'
import ReplaceFileModal from '@/components/admin/ReplaceFileModal'
import Pagination from '@/components/ui/Pagination'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { listCategories } from '@/services/resourceService'
import { deleteResource, findOrphanedFiles, listResourcesPage, removeOrphanedFiles, RESOURCE_PAGE_SIZE, setResourceStatus } from '@/services/resourceAdminService'
import { formatDate, formatFileSize } from '@/lib/format'
import { toUserMessage } from '@/lib/errors'

const typeTabs = [{ value: '', label: 'All' }, { value: 'VIDEO', label: 'Videos' }, { value: 'PDF', label: 'PDFs' }]
const statusTabs = [{ value: '', label: 'Any status' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Drafts' }]

function Segmented({ options, value, onChange, label }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value || 'all'}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${value === o.value ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const StatusBadge = ({ status }) => (status === 'published' ? <Badge tone="mint">Published</Badge> : <Badge tone="amber">Draft</Badge>)

export default function ManageResourcesPage() {
  const { isPreview } = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const categories = useAsync(listCategories)
  const orphans = useAsync(() => findOrphanedFiles().catch(() => []))

  const [query, setQuery] = useState(params.get('q') ?? '')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState(null)
  const [replacing, setReplacing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [busy, setBusy] = useState(null)
  const [debounced, setDebounced] = useState(query)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])
  useEffect(() => setPage(0), [debounced, type, status, category])

  // Filtering, counting and paging happen in the database — only one page is ever loaded.
  const resources = useAsync(
    () => listResourcesPage({ q: debounced, type, status, category, page }),
    [debounced, type, status, category, page, reloadKey],
  )
  const visible = resources.data?.items ?? []
  const total = resources.data?.total ?? 0
  const filteredView = Boolean(debounced || type || status || category)

  const replace = (updated) => resources.setData((d) => (d ? { ...d, items: d.items.map((r) => (r.id === updated.id ? updated : r)) } : d))

  async function togglePublish(r) {
    const next = r.status === 'published' ? 'draft' : 'published'
    setBusy(`status:${r.id}`)
    try {
      replace(await setResourceStatus(r, next))
      toast.success(next === 'published' ? `“${r.title}” is now visible to members.` : `“${r.title}” is now a draft and hidden from members.`)
    } catch (err) {
      toast.error(toUserMessage(err, 'Couldn’t change the status. Please try again.'))
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    const r = confirmDelete
    setBusy(`delete:${r.id}`)
    try {
      const { filesRemoved } = await deleteResource(r)
      setReloadKey((k) => k + 1)
      setConfirmDelete(null)
      if (filesRemoved) toast.success(`“${r.title}” and its files were deleted.`)
      else {
        toast.error('The resource was deleted, but some files couldn’t be removed. They’ll appear under “Unused files” for cleanup.')
        orphans.reload()
      }
    } catch (err) {
      toast.error(toUserMessage(err, 'Couldn’t delete this resource. Please try again.'))
    } finally {
      setBusy(null)
    }
  }

  async function cleanOrphans() {
    setBusy('orphans')
    try {
      await removeOrphanedFiles(orphans.data)
      toast.success(`${orphans.data.length} unused file${orphans.data.length === 1 ? '' : 's'} removed.`)
      orphans.setData([])
    } catch (err) {
      toast.error(toUserMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const actions = (r) => (
    <div className="flex items-center justify-end gap-0.5">
      <Link to={`/library/${r.id}`} title="Open" aria-label={`Open ${r.title}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-900">
        <FolderOpen className="h-4 w-4" />
      </Link>
      <button onClick={() => setEditing(r)} title="Edit" aria-label={`Edit ${r.title}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-900">
        <Pencil className="h-4 w-4" />
      </button>
      <button onClick={() => setReplacing(r)} title="Replace file" aria-label={`Replace file of ${r.title}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-900">
        <FileUp className="h-4 w-4" />
      </button>
      <button
        onClick={() => togglePublish(r)}
        disabled={busy === `status:${r.id}` || (!r.storage_path && r.status === 'draft')}
        title={r.status === 'published' ? 'Unpublish' : 'Publish'}
        aria-label={`${r.status === 'published' ? 'Unpublish' : 'Publish'} ${r.title}`}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-900 disabled:opacity-40"
      >
        {r.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
      <button onClick={() => setConfirmDelete(r)} title="Delete" aria-label={`Delete ${r.title}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <>
      <PageHeader
        title="Training resources"
        description="Edit, replace, publish, unpublish and delete training materials."
        actions={<LinkButton to="/admin/upload"><Upload className="h-4 w-4" /> Upload</LinkButton>}
      />

      {orphans.data?.length > 0 && (
        <Alert type="info" className="mb-4">
          {orphans.data.length} unused file{orphans.data.length === 1 ? '' : 's'} found in storage (left over from interrupted uploads or failed deletions).{' '}
          <button onClick={cleanOrphans} disabled={busy === 'orphans'} className="font-semibold underline-offset-2 hover:underline">
            {busy === 'orphans' ? 'Removing…' : 'Remove them'}
          </button>
        </Alert>
      )}

      {resources.error ? (
        <Alert type={isPreview ? 'info' : 'error'}>
          {toUserMessage(resources.error, 'Couldn’t load resources.')}{' '}
          {!isPreview && <button onClick={resources.reload} className="font-semibold underline-offset-2 hover:underline">Try again</button>}
        </Alert>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative lg:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (params.get('q')) setParams({}, { replace: true })
                }}
                placeholder="Search resources…"
                aria-label="Search resources"
                maxLength={100}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm placeholder:text-slate-400 focus:border-navy-300 focus:outline-none focus:ring-4 focus:ring-navy-100"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Segmented options={typeTabs} value={type} onChange={setType} label="Resource type" />
              <Segmented options={statusTabs} value={status} onChange={setStatus} label="Status" />
              <select
                aria-label="Filter by category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-navy-300 focus:outline-none focus:ring-4 focus:ring-navy-100"
              >
                <option value="">All categories</option>
                {(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="none">Uncategorized</option>
              </select>
            </div>
          </div>

          {resources.loading && !visible.length ? (
            <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : !visible.length ? (
            <div className="p-4">
              {filteredView ? (
                <EmptyState icon={Search} title="No matching resources" description="Try a different search or filter." />
              ) : (
                <EmptyState icon={Upload} title="No training materials yet" description="Upload your first PDF or video to get started.">
                  <LinkButton to="/admin/upload"><Upload className="h-4 w-4" /> Upload</LinkButton>
                </EmptyState>
              )}
            </div>
          ) : (
            <>
              <table className="hidden w-full text-left text-sm lg:table">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Resource</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Uploaded</th>
                    <th className="px-3 py-2.5 font-medium">Last updated</th>
                    <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="max-w-sm px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-20 shrink-0 overflow-hidden rounded-lg"><ResourceThumbnail resource={r} showIcon={false} /></div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-navy-900">{r.title}</p>
                            <p className="truncate text-xs text-slate-500">{r.category?.name ?? 'No category'} · {formatFileSize(r.file_size) || '—'} · {r.uploaded_by_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3"><ResourceTypeBadge type={r.resource_type} /></td>
                      <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(r.created_at)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(r.updated_at)}</td>
                      <td className="px-5 py-2">{actions(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-slate-100 lg:hidden">
                {visible.map((r) => (
                  <li key={r.id} className="flex gap-3 px-4 py-3">
                    <div className="w-20 shrink-0 overflow-hidden rounded-lg"><ResourceThumbnail resource={r} showIcon={false} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy-900">{r.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <ResourceTypeBadge type={r.resource_type} /> <StatusBadge status={r.status} /> {r.category?.name ?? 'No category'} · Updated {formatDate(r.updated_at)}
                      </div>
                      {actions(r)}
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination page={page} pageSize={RESOURCE_PAGE_SIZE} total={total} onPageChange={setPage} label="resources" />
            </>
          )}
        </Card>
      )}

      {replacing && (
        <ReplaceFileModal
          resource={replacing}
          onClose={() => setReplacing(null)}
          onReplaced={({ resource: updated, oldRemoved }) => {
            replace(updated)
            setReplacing(null)
            toast.success(`File replaced for “${updated.title}”.`)
            if (!oldRemoved) {
              toast.error('The previous file couldn’t be removed. It will appear under “Unused files” for cleanup.')
              orphans.reload()
            }
          }}
        />
      )}

      {editing && (
        <ResourceEditModal
          resource={editing}
          categories={categories.data ?? []}
          onCategoryCreated={(c) => categories.setData((list) => [...(list ?? []), c].sort((a, b) => a.name.localeCompare(b.name)))}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            replace(updated)
            setEditing(null)
            toast.success('Resource updated.')
          }}
        />
      )}

      <Modal
        open={Boolean(confirmDelete)}
        onClose={busy ? undefined : () => setConfirmDelete(null)}
        size="sm"
        title="Delete resource?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={Boolean(busy)}>Cancel</Button>
            <Button variant="danger" loading={busy?.startsWith('delete:')} onClick={handleDelete}>Delete permanently</Button>
          </>
        }
      >
        {confirmDelete && (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-navy-900">“{confirmDelete.title}”</span> and its file{confirmDelete.thumbnail_path ? 's' : ''} will be removed from storage.
            Members’ favorites and progress for it are deleted too. This can’t be undone.
          </p>
        )}
      </Modal>
    </>
  )
}
