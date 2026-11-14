import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Checkbox from '@/components/ui/Checkbox'
import { createCategory, updateCategory } from '@/services/categoryService'
import { toUserMessage } from '@/lib/errors'

/** Create (category = null) or edit a category. */
export default function CategoryFormModal({ category, onClose, onSaved }) {
  const isEdit = Boolean(category)
  const [form, setForm] = useState({ name: category?.name ?? '', description: category?.description ?? '', isVisible: category?.is_visible ?? true })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const next = {
      name: !form.name.trim() ? 'Name is required.' : form.name.trim().length > 80 ? 'Name must be 80 characters or fewer.' : undefined,
      description: form.description.length > 500 ? 'Description must be 500 characters or fewer.' : undefined,
    }
    setErrors(next)
    if (next.name || next.description) return
    setSaving(true)
    setServerError('')
    try {
      onSaved(isEdit ? await updateCategory(category.id, form) : await createCategory(form), { created: !isEdit })
    } catch (err) {
      const message = toUserMessage(err, 'Couldn’t save the category.')
      if (err.code === 'duplicate') setErrors((er) => ({ ...er, name: message }))
      else setServerError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={isEdit ? 'Edit category' : 'New category'}
      description={isEdit ? 'Changes appear in the member Training Library right away.' : 'Group related training so members can find it faster.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="category-form" loading={saving}>{isEdit ? 'Save changes' : 'Create category'}</Button>
        </>
      }
    >
      {serverError && <Alert type="error" className="mb-4">{serverError}</Alert>}
      <form id="category-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input label="Name" maxLength={80} value={form.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((er) => ({ ...er, name: undefined })) }} error={errors.name} />
        <div>
          <label htmlFor="category-description" className="mb-1.5 block text-sm font-medium text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span></label>
          <textarea
            id="category-description"
            rows={3}
            maxLength={500}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-4 focus:ring-navy-100"
          />
          {errors.description && <p className="mt-1.5 text-xs text-red-600">{errors.description}</p>}
        </div>
        <Checkbox label="Visible to members (shown as a filter in the Training Library)" checked={form.isVisible} onChange={(e) => setForm((f) => ({ ...f, isVisible: e.target.checked }))} />
      </form>
    </Modal>
  )
}
