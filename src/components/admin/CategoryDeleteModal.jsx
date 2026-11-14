import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import { deleteCategory } from '@/services/categoryService'
import { toUserMessage } from '@/lib/errors'

const UNCATEGORIZED = '__none__'

/**
 * Safe deletion: when the category still holds resources, the admin must
 * choose where they go (another category or uncategorized) and confirm.
 * The move and the delete happen in one database transaction.
 */
export default function CategoryDeleteModal({ category, categories, onClose, onDeleted }) {
  const others = categories.filter((c) => c.id !== category.id)
  const hasResources = category.resource_total > 0
  const [target, setTarget] = useState(others[0]?.id ?? UNCATEGORIZED)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      const moved = await deleteCategory(category.id, hasResources && target !== UNCATEGORIZED ? target : null)
      onDeleted({ moved, target: hasResources ? others.find((c) => c.id === target) ?? null : null })
    } catch (err) {
      setError(toUserMessage(err, 'Couldn’t delete the category.'))
      setDeleting(false)
    }
  }

  return (
    <Modal
      open
      size="sm"
      onClose={deleting ? undefined : onClose}
      title={`Delete “${category.name}”?`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting} disabled={hasResources && !confirmed}>Delete category</Button>
        </>
      }
    >
      {hasResources ? (
        <div className="space-y-4 text-sm text-slate-600">
          <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-amber-800 ring-1 ring-inset ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            This category contains {category.resource_total} resource{category.resource_total === 1 ? '' : 's'} ({category.resource_published} published). They won’t be deleted — choose where they should go.
          </p>
          <div>
            <label htmlFor="move-to" className="mb-1.5 block font-medium text-slate-700">Move resources to</label>
            <select
              id="move-to"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-navy-400 focus:outline-none focus:ring-4 focus:ring-navy-100"
            >
              {others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value={UNCATEGORIZED}>No category (uncategorized)</option>
            </select>
          </div>
          <Checkbox label="I understand this category will be permanently deleted." checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        </div>
      ) : (
        <p className="text-sm text-slate-600">This category has no resources. It will be permanently deleted.</p>
      )}
      {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
    </Modal>
  )
}
