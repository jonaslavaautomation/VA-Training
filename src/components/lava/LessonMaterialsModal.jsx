import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, FileText, Paperclip, PlayCircle, Trash2, Upload, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import ProgressBar from '@/components/ui/ProgressBar'
import { Select } from '@/components/lava/AdminFields'
import { useToast } from '@/hooks/useToast'
import { attachLessonMaterial, detachLessonMaterial, materialKind, setMaterialOrder, uploadLessonMaterial } from '@/services/lavaService'
import { effectiveLimitBytes, UPLOAD_RULES } from '@/config/constants'
import { formatFileSize } from '@/lib/format'
import { toUserMessage } from '@/lib/errors'

const titleFrom = (name) => name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 200)

/**
 * Videos & PDFs for one lesson. Uploads use the same resumable upload and
 * private storage as Upload Materials; files are marked as LAVA material so
 * they stay out of the member Training Library.
 */
export default function LessonMaterialsModal({ lesson, materials, libraryResources, onChange, onClose }) {
  const toast = useToast()
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const [queue, setQueue] = useState([]) // [{ id, file, title, progress, status: 'waiting'|'uploading'|'done'|'failed', error }]
  const [busy, setBusy] = useState(false)
  const [attachId, setAttachId] = useState('')
  const [error, setError] = useState('')

  const nextOrder = () => (materials.at(-1)?.sort_order ?? 0) + 1
  const update = (id, patch) => setQueue((q) => q.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  function choose(files) {
    setError('')
    const added = []
    for (const file of files) {
      const kind = materialKind(file)
      if (!kind) { setError(`“${file.name}” isn’t a PDF, MP4 or WebM file.`); continue }
      if (file.size > effectiveLimitBytes(UPLOAD_RULES[kind])) { setError(`“${file.name}” is larger than the ${formatFileSize(effectiveLimitBytes(UPLOAD_RULES[kind]))} limit.`); continue }
      added.push({ id: crypto.randomUUID(), file, kind, title: titleFrom(file.name), progress: 0, status: 'waiting' })
    }
    setQueue((q) => [...q.filter((x) => x.status !== 'done'), ...added])
  }

  async function startUploads() {
    setBusy(true)
    let order = nextOrder()
    let current = materials
    for (const item of queue.filter((x) => x.status === 'waiting' || x.status === 'failed')) {
      update(item.id, { status: 'uploading', progress: 0, error: '' })
      try {
        const upload = uploadLessonMaterial({
          lessonId: lesson.id,
          file: item.file,
          title: item.title,
          sortOrder: order,
          onProgress: (pct) => update(item.id, { progress: pct }),
        })
        abortRef.current = upload.abort
        const resource = await upload.done
        current = [...current, { ...resource, sort_order: order }]
        onChange(current)
        order++
        update(item.id, { status: 'done', progress: 100 })
      } catch (err) {
        update(item.id, { status: 'failed', error: toUserMessage(err, 'The upload failed. Check your connection and try again.') })
      }
    }
    abortRef.current = null
    setBusy(false)
  }

  async function attach() {
    if (!attachId) return
    try {
      await attachLessonMaterial(lesson.id, attachId, nextOrder())
      const r = libraryResources.find((x) => x.id === attachId)
      onChange([...materials, { ...r, sort_order: nextOrder() }])
      setAttachId('')
      toast.success('File attached to the lesson.')
    } catch (err) { setError(toUserMessage(err)) }
  }

  async function remove(m) {
    try {
      await detachLessonMaterial(lesson.id, m.id)
      onChange(materials.filter((x) => x.id !== m.id))
      toast.success(`“${m.title}” removed from this lesson. The file is still listed in Training Resources.`)
    } catch (err) { setError(toUserMessage(err)) }
  }

  async function move(i, dir) {
    const a = materials[i], b = materials[i + dir]
    const oa = a.sort_order === b.sort_order ? i : a.sort_order
    const ob = a.sort_order === b.sort_order ? i + dir : b.sort_order
    try {
      await setMaterialOrder(lesson.id, a.id, ob)
      await setMaterialOrder(lesson.id, b.id, oa)
      const next = [...materials]
      next[i] = { ...b, sort_order: oa }
      next[i + dir] = { ...a, sort_order: ob }
      onChange(next)
    } catch (err) { setError(toUserMessage(err)) }
  }

  const attachable = libraryResources.filter((r) => !materials.some((m) => m.id === r.id))
  const pending = queue.filter((x) => x.status === 'waiting' || x.status === 'failed').length

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title="Videos & PDFs"
      description={lesson.title}
      footer={<Button variant="secondary" onClick={onClose} disabled={busy}>Done</Button>}
    >
      <div className="space-y-5">
        {error && <Alert type="error">{error}</Alert>}

        <section aria-label="Attached files">
          <h3 className="mb-2 text-sm font-semibold text-navy-900">In this lesson ({materials.length})</h3>
          {materials.length ? (
            <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200" data-testid="lesson-materials">
              {materials.map((m, i) => (
                <li key={m.id} className="flex items-center gap-2 px-3 py-2.5">
                  {m.resource_type === 'VIDEO' ? <PlayCircle className="h-4 w-4 shrink-0 text-navy-700" /> : <FileText className="h-4 w-4 shrink-0 text-navy-700" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-navy-900">{m.title}</span>
                    <span className="text-xs text-slate-500">{m.resource_type === 'VIDEO' ? 'Video' : 'PDF'}{m.file_size ? ` · ${formatFileSize(m.file_size)}` : ''}{m.audience === 'library' ? ' · from Training Library' : ''}{m.status !== 'published' ? ' · unpublished (members can’t open it)' : ''}</span>
                  </span>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-slate-400 hover:text-navy-900 disabled:opacity-30" aria-label={`Move ${m.title} up`}><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === materials.length - 1} className="rounded p-1 text-slate-400 hover:text-navy-900 disabled:opacity-30" aria-label={`Move ${m.title} down`}><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => remove(m)} className="rounded p-1 text-slate-400 hover:text-red-600" aria-label={`Remove ${m.title}`}><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          ) : <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No videos or PDFs yet.</p>}
        </section>

        <section aria-label="Upload files" className="space-y-3">
          <h3 className="text-sm font-semibold text-navy-900">Upload new files</h3>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (!busy) choose([...e.dataTransfer.files]) }}
            disabled={busy}
            className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-200 px-4 py-6 text-center transition hover:border-navy-300 hover:bg-slate-50 disabled:opacity-60"
          >
            <Upload className="h-6 w-6 text-slate-400" />
            <span className="text-sm font-medium text-navy-900">Choose or drop videos and PDFs</span>
            <span className="text-xs text-slate-500">PDF up to {formatFileSize(effectiveLimitBytes(UPLOAD_RULES.PDF))} · MP4/WebM up to {formatFileSize(effectiveLimitBytes(UPLOAD_RULES.VIDEO))}. Several files at once is fine.</span>
          </button>
          <input ref={inputRef} type="file" multiple accept=".pdf,.mp4,.webm,application/pdf,video/mp4,video/webm" className="sr-only" aria-label="Choose lesson files to upload" onChange={(e) => { choose([...e.target.files]); e.target.value = '' }} />

          {queue.length > 0 && (
            <ul className="space-y-2">
              {queue.map((item) => (
                <li key={item.id} className="rounded-xl bg-slate-50 p-3" data-testid="upload-item">
                  <div className="flex items-center gap-2">
                    {item.kind === 'VIDEO' ? <PlayCircle className="h-4 w-4 shrink-0 text-slate-500" /> : <FileText className="h-4 w-4 shrink-0 text-slate-500" />}
                    <input
                      value={item.title}
                      onChange={(e) => update(item.id, { title: e.target.value })}
                      disabled={item.status === 'uploading' || item.status === 'done'}
                      maxLength={200}
                      aria-label={`Title for ${item.file.name}`}
                      className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm disabled:bg-transparent disabled:border-transparent"
                    />
                    <span className="shrink-0 text-xs text-slate-500">{formatFileSize(item.file.size)}</span>
                    {item.status === 'waiting' && <button type="button" onClick={() => setQueue((q) => q.filter((x) => x.id !== item.id))} className="rounded p-1 text-slate-400 hover:text-red-600" aria-label={`Remove ${item.file.name} from the list`}><X className="h-4 w-4" /></button>}
                  </div>
                  {item.status === 'uploading' && <ProgressBar value={item.progress} className="mt-2" />}
                  {item.status === 'done' && <p className="mt-1 text-xs font-medium text-mint-700">Uploaded and added to the lesson</p>}
                  {item.status === 'failed' && <p className="mt-1 text-xs text-red-600">{item.error}</p>}
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Button onClick={startUploads} loading={busy} disabled={!pending}><Upload className="h-4 w-4" /> {busy ? 'Uploading…' : `Upload ${pending || ''} file${pending === 1 ? '' : 's'}`.replace('  ', ' ')}</Button>
            {busy && <Button variant="secondary" onClick={() => abortRef.current?.()}>Cancel current</Button>}
          </div>
        </section>

        {attachable.length > 0 && (
          <section aria-label="Attach from Training Library" className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-navy-900">Or attach a file already uploaded</h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Select
                className="flex-1"
                label="Training Library file"
                value={attachId}
                onChange={(e) => setAttachId(e.target.value)}
                options={[['', 'Choose a file…'], ...attachable.map((r) => [r.id, `${r.resource_type === 'VIDEO' ? 'Video' : 'PDF'}: ${r.title}${r.status !== 'published' ? ' (unpublished)' : ''}`])]}
              />
              <Button variant="secondary" onClick={attach} disabled={!attachId}><Paperclip className="h-4 w-4" /> Attach</Button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  )
}
