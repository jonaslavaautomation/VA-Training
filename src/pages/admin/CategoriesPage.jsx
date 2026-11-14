import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, FolderTree, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import CategoryFormModal from '@/components/admin/CategoryFormModal'
import CategoryDeleteModal from '@/components/admin/CategoryDeleteModal'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { listCategoriesAdmin, updateCategory } from '@/services/categoryService'
import { formatDate } from '@/lib/format'
import { toUserMessage } from '@/lib/errors'

export default function CategoriesPage() {
  const { isPreview } = useAuth()
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(listCategoriesAdmin)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null) // { category: null | row }
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(null)

  const categories = useMemo(() => data?.categories ?? [], [data])
  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase()
    return categories.filter((c) => !t || `${c.name} ${c.description ?? ''}`.toLowerCase().includes(t))
  }, [categories, query])

  const replace = (row) =>
    setData((d) => ({ ...d, categories: d.categories.map((c) => (c.id === row.id ? { ...c, ...row } : c)) }))

  async function toggleVisible(c) {
    setBusy(c.id)
    try {
      replace(await updateCategory(c.id, { isVisible: !c.is_visible }))
      toast.success(c.is_visible ? `“${c.name}” is now hidden from members.` : `“${c.name}” is now visible to members.`)
    } catch (err) {
      toast.error(toUserMessage(err, 'Couldn’t change visibility.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organize training into categories. Changes show up in the member library immediately."
        actions={<Button onClick={() => setEditing({ category: null })} disabled={isPreview}><Plus className="h-4 w-4" /> New category</Button>}
      />

      {error ? (
        <Alert type={isPreview ? 'info' : 'error'}>
          {toUserMessage(error, 'Couldn’t load categories.')}{' '}
          {!isPreview && <button onClick={reload} className="font-semibold underline-offset-2 hover:underline">Try again</button>}
        </Alert>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories…"
                aria-label="Search categories"
                maxLength={100}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm placeholder:text-slate-400 focus:border-navy-300 focus:outline-none focus:ring-4 focus:ring-navy-100"
              />
            </div>
            {data && (
              <p className="text-sm text-slate-500">
                {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
                {data.uncategorized > 0 && <> · <Link to="/admin/resources" className="font-medium text-navy-700">{data.uncategorized} uncategorized resource{data.uncategorized === 1 ? '' : 's'}</Link></>}
              </p>
            )}
          </div>

          {loading ? (
            <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !filtered.length ? (
            <div className="p-4">
              {categories.length ? (
                <EmptyState icon={Search} title="No matching categories" description="Try a different search." />
              ) : (
                <EmptyState icon={FolderTree} title="No categories yet" description="Create your first category to organize training materials.">
                  <Button onClick={() => setEditing({ category: null })}><Plus className="h-4 w-4" /> New category</Button>
                </EmptyState>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <li key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center" data-testid="category-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-navy-900">{c.name}</p>
                      {c.is_visible ? <Badge tone="mint">Visible</Badge> : <Badge tone="gray" icon={EyeOff}>Hidden</Badge>}
                    </div>
                    {c.description && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{c.description}</p>}
                    <p className="mt-1 text-xs text-slate-400">Updated {formatDate(c.updated_at)}</p>
                  </div>
                  <p className="shrink-0 text-sm text-slate-600" data-testid="category-count">
                    <span className="font-semibold text-navy-900">{c.resource_total}</span> resource{c.resource_total === 1 ? '' : 's'}
                    <span className="text-slate-400"> · {c.resource_published} published</span>
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button onClick={() => toggleVisible(c)} disabled={busy === c.id} title={c.is_visible ? 'Hide from members' : 'Show to members'} aria-label={`${c.is_visible ? 'Hide' : 'Show'} ${c.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-900 disabled:opacity-40">
                      {c.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setEditing({ category: c })} title="Edit" aria-label={`Edit ${c.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-900">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleting(c)} title="Delete" aria-label={`Delete ${c.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {editing && (
        <CategoryFormModal
          category={editing.category}
          onClose={() => setEditing(null)}
          onSaved={(row, { created }) => {
            setEditing(null)
            if (created) setData((d) => ({ ...d, categories: [...d.categories, { ...row, resource_total: 0, resource_published: 0 }].sort((a, b) => a.name.localeCompare(b.name)) }))
            else replace(row)
            toast.success(created ? `Category “${row.name}” created.` : 'Category updated.')
          }}
        />
      )}

      {deleting && (
        <CategoryDeleteModal
          category={deleting}
          categories={categories}
          onClose={() => setDeleting(null)}
          onDeleted={({ moved, target }) => {
            toast.success(moved ? `“${deleting.name}” deleted. ${moved} resource${moved === 1 ? '' : 's'} moved to ${target ? `“${target.name}”` : 'uncategorized'}.` : `“${deleting.name}” deleted.`)
            setDeleting(null)
            reload()
          }}
        />
      )}
    </>
  )
}
