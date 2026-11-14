import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, FileText, PlayCircle, RotateCcw, Upload, X } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button, { LinkButton } from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import ProgressBar from '@/components/ui/ProgressBar'
import FileDropzone from '@/components/upload/FileDropzone'
import ThumbnailPicker from '@/components/upload/ThumbnailPicker'
import CategorySelect from '@/components/upload/CategorySelect'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { effectiveLimitBytes, PROJECT_UPLOAD_LIMIT_MB, UPLOAD_RULES } from '@/config/constants'
import { detectContentType, validateUploadFile } from '@/lib/media'
import { inspectPdf } from '@/lib/pdf'
import { formatFileSize } from '@/lib/format'
import { toUserMessage } from '@/lib/errors'
import { listCategories } from '@/services/resourceService'
import { getBucketSettings } from '@/services/storageService'
import { beginFileUpload, saveResource } from '@/services/uploadService'

const kindFromFile = (file) => (/\.pdf$/i.test(file.name) || file.type === 'application/pdf' ? 'PDF' : /\.(mp4|webm)$/i.test(file.name) || file.type.startsWith('video/') ? 'VIDEO' : null)

const typeTabs = [
  { value: 'PDF', label: 'PDF document', icon: FileText },
  { value: 'VIDEO', label: 'Video', icon: PlayCircle },
]

async function loadLimits() {
  const [pdf, video] = await Promise.all([getBucketSettings(UPLOAD_RULES.PDF.bucket), getBucketSettings(UPLOAD_RULES.VIDEO.bucket)])
  return {
    PDF: effectiveLimitBytes(UPLOAD_RULES.PDF, pdf?.fileSizeLimit),
    VIDEO: effectiveLimitBytes(UPLOAD_RULES.VIDEO, video?.fileSizeLimit),
    bucketsFound: Boolean(pdf && video),
    privateBuckets: pdf?.isPublic === false && video?.isPublic === false,
  }
}

const emptyForm = (kind) => ({ kind, title: '', description: '', categoryId: null, status: 'draft' })

export default function UploadPage() {
  const { isPreview } = useAuth()
  const toast = useToast()
  const [params] = useSearchParams()
  const initialKind = params.get('type') === 'VIDEO' ? 'VIDEO' : 'PDF'

  const categories = useAsync(listCategories)
  const limits = useAsync(() => (isPreview ? Promise.resolve(null) : loadLimits()))

  const [form, setForm] = useState(() => emptyForm(initialKind))
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const [errors, setErrors] = useState({})
  const [thumbnail, setThumbnail] = useState(null) // { blob, source }
  const [meta, setMeta] = useState({}) // { durationSeconds, pageCount, playable }
  const [phase, setPhase] = useState('form') // form | uploading | failed | saving | done
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [failure, setFailure] = useState('')
  const [created, setCreated] = useState(null)
  const uploadRef = useRef(null) // { resourceId, task, contentType }

  const busy = phase === 'uploading' || phase === 'saving'
  const limit = limits.data?.[form.kind] ?? effectiveLimitBytes(UPLOAD_RULES[form.kind])
  const rule = UPLOAD_RULES[form.kind]

  // Warn before closing the tab mid-upload.
  useEffect(() => {
    if (!busy) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  function clearFile() {
    setFile(null)
    setFileError('')
    setThumbnail(null)
    setMeta({})
  }

  async function chooseFile(next) {
    const kind = kindFromFile(next) ?? form.kind
    const kindLimit = limits.data?.[kind] ?? effectiveLimitBytes(UPLOAD_RULES[kind])
    setForm((f) => ({ ...f, kind, title: f.title || next.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 200) }))
    setFile(next)
    setThumbnail(null)
    setMeta({})
    const problem = await validateUploadFile(next, kind, kindLimit)
    setFileError(problem || '')
    if (problem || kind !== 'PDF') return
    // PDFs: page count + cover image from page 1 (the cover becomes the default thumbnail).
    try {
      const { pageCount, cover } = await inspectPdf(next)
      setMeta({ pageCount })
      if (cover) setThumbnail((t) => t ?? { blob: cover, source: 'cover' })
    } catch {
      setFileError('This PDF couldn’t be read. It may be damaged or password-protected.')
    }
  }

  function switchKind(kind) {
    if (kind === form.kind || busy) return
    setForm((f) => ({ ...f, kind }))
    if (file && kindFromFile(file) !== kind) clearFile()
  }

  async function finish(path) {
    setPhase('saving')
    setStatusText('Saving resource…')
    try {
      const { resource, thumbnailFailed } = await saveResource({
        resourceId: uploadRef.current.resourceId,
        kind: form.kind,
        path,
        file,
        title: form.title,
        description: form.description,
        categoryId: form.categoryId,
        status: form.status,
        thumbnail: thumbnail?.blob,
        durationSeconds: meta.durationSeconds,
        pageCount: meta.pageCount,
      })
      setCreated(resource)
      setPhase('done')
      toast.success(`“${resource.title}” uploaded${resource.status === 'published' ? ' and published' : ' as a draft'}.`)
      if (thumbnailFailed) toast.error('The thumbnail couldn’t be uploaded. You can add one later.')
    } catch (err) {
      setFailure(toUserMessage(err))
      setPhase('form') // the uploaded file was discarded; the admin can submit again
    }
  }

  async function runUpload(start) {
    setPhase('uploading')
    setFailure('')
    try {
      const { path } = await start()
      await finish(path)
    } catch (err) {
      if (err?.code === 'aborted') return
      setFailure(toUserMessage(err, 'The upload failed. Check your connection and retry.'))
      setPhase('failed')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const next = {
      title: !form.title.trim() ? 'Title is required.' : form.title.trim().length > 200 ? 'Title must be 200 characters or fewer.' : undefined,
      description: form.description.length > 5000 ? 'Description must be 5,000 characters or fewer.' : undefined,
    }
    setErrors(next)
    const problem = file ? await validateUploadFile(file, form.kind, limit) : 'Choose a file to upload.'
    setFileError(problem || '')
    if (next.title || next.description || problem) return

    const contentType = await detectContentType(file)
    setProgress(0)
    setStatusText('Starting upload…')
    const { resourceId, task } = beginFileUpload({
      kind: form.kind,
      file,
      contentType,
      onProgress: (pct) => { setProgress(pct); setStatusText(pct < 100 ? 'Uploading…' : 'Finishing upload…') },
      onStatus: setStatusText,
    })
    uploadRef.current = { resourceId, task }
    runUpload(() => task.done)
  }

  function retry() {
    setStatusText('Resuming upload…')
    runUpload(() => uploadRef.current.task.retry())
  }

  function cancel() {
    uploadRef.current?.task.abort()
    uploadRef.current = null
    setPhase('form')
    setProgress(0)
    setFailure('')
    toast.info('Upload cancelled.')
  }

  function reset() {
    setForm(emptyForm(form.kind))
    clearFile()
    setCreated(null)
    setProgress(0)
    setFailure('')
    setPhase('form')
    uploadRef.current = null
  }

  if (isPreview) {
    return (
      <>
        <PageHeader title="Upload training" description="Add new PDF and video resources." />
        <Alert type="info">Uploading needs a connected Supabase project. Add your keys to .env.local to enable it.</Alert>
      </>
    )
  }

  if (phase === 'done' && created) {
    return (
      <>
        <PageHeader title="Upload training" description="Add new PDF and video resources." />
        <Card className="mx-auto max-w-lg p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-mint-50 text-mint-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-navy-900">Upload complete</h2>
          <p className="mt-1 text-sm text-slate-500">
            “{created.title}” was saved as {created.status === 'published' ? 'published — members can see it now' : 'a draft — only admins can see it'}.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <LinkButton to={`/library/${created.id}`} variant="secondary">View resource</LinkButton>
            <LinkButton to="/admin/resources" variant="secondary">Manage resources</LinkButton>
            <Button onClick={reset}><Upload className="h-4 w-4" /> Upload another</Button>
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Upload training" description="Add a PDF guide or a training video. Files are stored privately." />

      {limits.data && !limits.data.bucketsFound && (
        <Alert type="error" className="mb-6">
          The training storage buckets weren’t found. Run the Phase 3 database migration (see supabase/README.md) before uploading.
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-4 p-5 sm:p-6">
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Resource type</p>
              <div className="inline-flex rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Resource type">
                {typeTabs.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={form.kind === value}
                    onClick={() => switchKind(value)}
                    disabled={busy}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      form.kind === value ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <FileDropzone
              accept={[...UPLOAD_RULES.PDF.accept, ...UPLOAD_RULES.VIDEO.accept, ...UPLOAD_RULES.PDF.extensions, ...UPLOAD_RULES.VIDEO.extensions].join(',')}
              file={file}
              onFile={chooseFile}
              onClear={clearFile}
              disabled={busy}
              error={fileError}
              hint={`${rule.extensions.join(', ').toUpperCase()} · up to ${formatFileSize(limit)}`}
            />
            {fileError && <p className="text-xs text-red-600" role="alert">{fileError}</p>}
            {form.kind === 'VIDEO' && (
              <p className="text-xs text-slate-500">
                MP4 (H.264 + AAC) plays in every browser; WebM doesn’t play on older iPhones. Large videos upload in resumable 6 MB chunks — if the connection drops, retry continues where it stopped.
              </p>
            )}

            {(phase === 'uploading' || phase === 'saving' || phase === 'failed') && (
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200" aria-live="polite">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-navy-900">{phase === 'failed' ? 'Upload stopped' : statusText}</span>
                  <span className="tabular-nums text-slate-500" data-testid="upload-progress">{progress}%</span>
                </div>
                <ProgressBar value={progress} />
                {phase === 'failed' && (
                  <>
                    <Alert type="error" className="mt-3">{failure}</Alert>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={retry}><RotateCcw className="h-4 w-4" /> Retry upload</Button>
                      <Button size="sm" variant="ghost" onClick={cancel}><X className="h-4 w-4" /> Cancel</Button>
                    </div>
                  </>
                )}
                {phase === 'uploading' && (
                  <Button size="sm" variant="ghost" className="mt-3" onClick={cancel}><X className="h-4 w-4" /> Cancel upload</Button>
                )}
              </div>
            )}
            {phase === 'form' && failure && <Alert type="error">{failure}</Alert>}
          </Card>

          <Card className="space-y-4 p-5 sm:p-6">
            <Input label="Title" maxLength={200} value={form.title} onChange={set('title')} error={errors.title} disabled={busy} />
            <div>
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                id="description"
                rows={4}
                maxLength={5000}
                value={form.description}
                onChange={set('description')}
                disabled={busy}
                placeholder="What will members learn from this resource?"
                className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-400 focus:outline-none focus:ring-4 focus:ring-navy-100"
              />
              {errors.description && <p className="mt-1.5 text-xs text-red-600">{errors.description}</p>}
            </div>
            <div>
              <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
              <CategorySelect
                id="category"
                categories={categories.data ?? []}
                value={form.categoryId}
                onChange={(categoryId) => setForm((f) => ({ ...f, categoryId }))}
                onCreated={(c) => categories.setData((list) => [...(list ?? []), { ...c, resource_count: 0 }].sort((a, b) => a.name.localeCompare(b.name)))}
                disabled={busy}
              />
            </div>
          </Card>

          {file && !fileError && (
            <Card className="p-5 sm:p-6">
              <h2 className="mb-3 text-sm font-semibold text-navy-900">{form.kind === 'VIDEO' ? 'Video thumbnail' : 'Cover image'}</h2>
              <ThumbnailPicker
                key={file.name + file.size + file.lastModified}
                videoFile={form.kind === 'VIDEO' ? file : null}
                value={thumbnail}
                onChange={setThumbnail}
                onMeta={(m) => setMeta((x) => ({ ...x, ...m }))}
                disabled={busy}
              />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="space-y-4 p-5">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Visibility</p>
              {[
                { value: 'draft', label: 'Draft', hint: 'Only admins can see it.' },
                { value: 'published', label: 'Published', hint: 'Visible to all active members.' },
              ].map((o) => (
                <label key={o.value} className={`mb-2 flex cursor-pointer gap-3 rounded-xl p-3 ring-1 ring-inset ${form.status === o.value ? 'bg-navy-50/60 ring-navy-300' : 'ring-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="status" value={o.value} checked={form.status === o.value} onChange={set('status')} disabled={busy} className="mt-0.5 accent-navy-900" />
                  <span>
                    <span className="block text-sm font-medium text-navy-900">{o.label}</span>
                    <span className="block text-xs text-slate-500">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <Button type="submit" size="lg" fullWidth loading={busy} disabled={busy || phase === 'failed' || (limits.data && !limits.data.bucketsFound)}>
              {!busy && <Upload className="h-4 w-4" />} {busy ? (phase === 'saving' ? 'Saving…' : `Uploading ${progress}%`) : 'Upload'}
            </Button>
          </Card>

          <Card className="p-5 text-xs text-slate-500">
            <p className="font-semibold text-navy-900">Upload limits</p>
            <ul className="mt-2 space-y-1">
              <li>PDF: up to {formatFileSize(limits.data?.PDF ?? effectiveLimitBytes(UPLOAD_RULES.PDF))}</li>
              <li>Video (MP4, WebM): up to {formatFileSize(limits.data?.VIDEO ?? effectiveLimitBytes(UPLOAD_RULES.VIDEO))}</li>
              <li>Thumbnail: JPG, PNG, WebP up to {UPLOAD_RULES.THUMBNAIL.maxSizeMB} MB</li>
            </ul>
            <p className="mt-2">
              Limited by the bucket settings and the project upload limit ({PROJECT_UPLOAD_LIMIT_MB} MB configured). <Link to="/admin/resources" className="inline-flex min-h-6 items-center font-medium text-navy-700">Manage resources →</Link>
            </p>
          </Card>
        </div>
      </form>
    </>
  )
}
