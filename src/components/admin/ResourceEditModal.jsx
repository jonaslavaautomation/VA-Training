import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import CategorySelect from '@/components/upload/CategorySelect'
import { updateResource } from '@/services/resourceAdminService'
import { toUserMessage } from '@/lib/errors'

/** Edit title, description, category and visibility of an uploaded resource. */
export default function ResourceEditModal({ resource, categories, onCategoryCreated, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: resource.title,
    description: resource.description ?? '',
    categoryId: resource.category_id,
    status: resource.status,
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const next = {
      title: !form.title.trim() ? 'Title is required.' : form.title.trim().length > 200 ? 'Title must be 200 characters or fewer.' : undefined,
      description: form.description.length > 5000 ? 'Description must be 5,000 characters or fewer.' : undefined,
    }
    setErrors(next)
    if (next.title || next.description) return
    setSaving(true)
    setServerError('')
    try {
      onSaved(await updateResource(resource.id, form))
    } catch (err) {
      setServerError(toUserMessage(err, 'Couldn’t save changes. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title="Edit resource"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="resource-form" loading={saving}>Save changes</Button>
        </>
      }
    >
      {serverError && <Alert type="error" className="mb-4">{serverError}</Alert>}
      <form id="resource-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input label="Title" maxLength={200} value={form.title} onChange={set('title')} error={errors.title} />
        <div>
          <label htmlFor="edit-description" className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            id="edit-description"
            rows={4}
            maxLength={5000}
            value={form.description}
            onChange={set('description')}
            className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-4 focus:ring-navy-100"
          />
          {errors.description && <p className="mt-1.5 text-xs text-red-600">{errors.description}</p>}
        </div>
        <div>
          <label htmlFor="edit-category" className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
          <CategorySelect
            id="edit-category"
            categories={categories}
            value={form.categoryId}
            onChange={(categoryId) => setForm((f) => ({ ...f, categoryId }))}
            onCreated={onCategoryCreated}
          />
        </div>
        <div>
          <label htmlFor="edit-status" className="mb-1.5 block text-sm font-medium text-slate-700">Visibility</label>
          <select
            id="edit-status"
            value={form.status}
            onChange={set('status')}
            className="block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-navy-400 focus:outline-none focus:ring-4 focus:ring-navy-100"
          >
            <option value="draft">Draft — only admins</option>
            <option value="published">Published — all active members</option>
          </select>
        </div>
      </form>
    </Modal>
  )
}
