import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { saveAnnouncement } from '@/services/announcementService'
import { validateUploadFile } from '@/lib/media'
import { effectiveLimitBytes, UPLOAD_RULES } from '@/config/constants'
import { toUserMessage } from '@/lib/errors'

/** datetime-local value (local time) ↔ ISO */
const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function initialMode(a) {
  if (!a) return 'draft'
  if (a.status === 'published') return a.publish_at && new Date(a.publish_at) > new Date() ? 'schedule' : 'publish'
  return a.status // draft | archived
}

const modes = [
  { value: 'draft', label: 'Draft', hint: 'Only admins can see it.' },
  { value: 'publish', label: 'Publish now', hint: 'Shown on every member’s dashboard.' },
  { value: 'schedule', label: 'Schedule', hint: 'Goes live automatically at the chosen time.' },
]

export default function AnnouncementFormModal({ announcement, onClose, onSaved }) {
  const isEdit = Boolean(announcement)
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    title: announcement?.title ?? '',
    content: announcement?.content ?? '',
    mode: initialMode(announcement),
    publishAt: toLocalInput(announcement?.publish_at),
  })
  const [image, setImage] = useState(undefined) // File = new, null = remove, undefined = keep
  const [preview, setPreview] = useState(announcement?.image_url ?? null)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!(image instanceof Blob)) return
    const url = URL.createObjectURL(image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  async function pickImage(file) {
    if (!file) return
    const problem = await validateUploadFile(file, 'THUMBNAIL', effectiveLimitBytes(UPLOAD_RULES.THUMBNAIL))
    setErrors((er) => ({ ...er, image: problem }))
    if (!problem) setImage(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const next = {
      title: !form.title.trim() ? 'Title is required.' : form.title.trim().length > 200 ? 'Title must be 200 characters or fewer.' : undefined,
      content: !form.content.trim() ? 'Write the announcement text.' : form.content.length > 20000 ? 'Content is too long (20,000 characters max).' : undefined,
      publishAt: form.mode === 'schedule' && (!form.publishAt || new Date(form.publishAt) <= new Date()) ? 'Choose a future date and time.' : undefined,
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    setSaving(true)
    setServerError('')
    try {
      const status = form.mode === 'publish' || form.mode === 'schedule' ? 'published' : form.mode
      const saved = await saveAnnouncement(announcement, {
        title: form.title,
        content: form.content,
        status,
        publishAt: form.mode === 'schedule' ? form.publishAt : null,
        image,
      })
      onSaved(saved, { created: !isEdit })
    } catch (err) {
      setServerError(toUserMessage(err, 'Couldn’t save the announcement.'))
    } finally {
      setSaving(false)
    }
  }

  const submitLabel = form.mode === 'publish' ? (isEdit ? 'Save & publish' : 'Publish') : form.mode === 'schedule' ? 'Schedule' : isEdit ? 'Save changes' : 'Save draft'

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={isEdit ? 'Edit announcement' : 'New announcement'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="announcement-form" loading={saving}>{submitLabel}</Button>
        </>
      }
    >
      {serverError && <Alert type="error" className="mb-4">{serverError}</Alert>}
      <form id="announcement-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input label="Title" maxLength={200} value={form.title} onChange={set('title')} error={errors.title} />
        <div>
          <label htmlFor="announcement-content" className="mb-1.5 block text-sm font-medium text-slate-700">Content</label>
          <textarea
            id="announcement-content"
            rows={6}
            maxLength={20000}
            value={form.content}
            onChange={set('content')}
            placeholder="What would you like members to know?"
            className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-4 focus:ring-navy-100"
          />
          {errors.content && <p className="mt-1.5 text-xs text-red-600">{errors.content}</p>}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Image <span className="font-normal text-slate-400">(optional)</span></p>
          {preview && image !== null ? (
            <div className="flex items-start gap-3">
              <img src={preview} alt="Announcement image preview" className="h-20 w-32 rounded-lg object-cover ring-1 ring-slate-200" />
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}><ImagePlus className="h-4 w-4" /> Replace</Button>
                <Button size="sm" variant="ghost" onClick={() => { setImage(null); setPreview(null) }}><Trash2 className="h-4 w-4" /> Remove</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}><ImagePlus className="h-4 w-4" /> Add image</Button>
          )}
          <input ref={fileRef} type="file" accept={UPLOAD_RULES.THUMBNAIL.accept.join(',')} className="sr-only" tabIndex={-1} aria-label="Choose announcement image" onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = '' }} />
          <p className="mt-1.5 text-xs text-slate-500">JPG, PNG or WebP · max {UPLOAD_RULES.THUMBNAIL.maxSizeMB} MB. Stored privately.</p>
          {errors.image && <p className="mt-1 text-xs text-red-600">{errors.image}</p>}
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-slate-700">Publication</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(announcement?.status === 'archived' ? [...modes, { value: 'archived', label: 'Archived', hint: 'Hidden from members.' }] : modes).map((m) => (
              <label key={m.value} className={`flex cursor-pointer gap-2 rounded-xl p-3 ring-1 ring-inset ${form.mode === m.value ? 'bg-navy-50/60 ring-navy-300' : 'ring-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="mode" value={m.value} checked={form.mode === m.value} onChange={set('mode')} className="mt-0.5 accent-navy-900" />
                <span>
                  <span className="block text-sm font-medium text-navy-900">{m.label}</span>
                  <span className="block text-xs text-slate-500">{m.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {form.mode === 'schedule' && (
            <div className="mt-3">
              <Input label="Publish on" type="datetime-local" value={form.publishAt} onChange={set('publishAt')} error={errors.publishAt} min={toLocalInput(new Date().toISOString())} />
            </div>
          )}
        </fieldset>
      </form>
    </Modal>
  )
}
