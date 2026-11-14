import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import ProgressBar from '@/components/ui/ProgressBar'
import FileDropzone from '@/components/upload/FileDropzone'
import { effectiveLimitBytes, UPLOAD_RULES } from '@/config/constants'
import { detectContentType, loadLocalVideo, validateUploadFile, videoDuration } from '@/lib/media'
import { inspectPdf } from '@/lib/pdf'
import { formatFileSize } from '@/lib/format'
import { toUserMessage } from '@/lib/errors'
import { getBucketSettings } from '@/services/storageService'
import { replaceResourceFile } from '@/services/resourceAdminService'

/**
 * Replaces a resource's PDF/video with a new file of the same type.
 * The resource keeps working on the old file until the new one is fully
 * uploaded and saved; only then is the old file deleted.
 */
export default function ReplaceFileModal({ resource, onClose, onReplaced }) {
  const kind = resource.resource_type
  const rule = UPLOAD_RULES[kind]
  const [limit, setLimit] = useState(effectiveLimitBytes(rule))
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const [meta, setMeta] = useState({})
  const [phase, setPhase] = useState('pick') // pick | uploading | failed | saving
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState('')
  const jobRef = useRef(null)
  const busy = phase === 'uploading' || phase === 'saving'

  useEffect(() => {
    getBucketSettings(rule.bucket).then((b) => b && setLimit(effectiveLimitBytes(rule, b.fileSizeLimit))).catch(() => {})
  }, [rule])

  async function choose(next) {
    setFile(next)
    setMeta({})
    const problem = await validateUploadFile(next, kind, limit)
    setFileError(problem || '')
    if (problem) return
    try {
      if (kind === 'PDF') setMeta({ pageCount: (await inspectPdf(next)).pageCount })
      else {
        const { video, ready, cleanup } = loadLocalVideo(next)
        try { await ready; setMeta({ durationSeconds: videoDuration(video) }) } finally { cleanup() }
      }
    } catch {
      if (kind === 'PDF') setFileError('This PDF couldn’t be read. It may be damaged or password-protected.')
      // An undecodable video can still be uploaded; duration stays unknown.
    }
  }

  async function run(start) {
    setPhase('uploading')
    setError('')
    try {
      const uploaded = await start()
      setPhase('saving')
      setStatusText('Saving…')
      onReplaced(await jobRef.current.finish(uploaded))
    } catch (err) {
      setError(toUserMessage(err, 'The upload failed. Check your connection and retry.'))
      setPhase('failed')
    }
  }

  async function begin() {
    const contentType = await detectContentType(file)
    setProgress(0)
    setStatusText('Starting upload…')
    jobRef.current = replaceResourceFile(resource, {
      file,
      contentType,
      ...meta,
      onProgress: (pct) => { setProgress(pct); setStatusText(pct < 100 ? 'Uploading…' : 'Finishing upload…') },
      onStatus: setStatusText,
    })
    run(() => jobRef.current.task.done)
  }

  function cancel() {
    jobRef.current?.task.abort()
    onClose()
  }

  return (
    <Modal
      open
      onClose={busy ? undefined : cancel}
      title="Replace file"
      description={`“${resource.title}” keeps its title, category, thumbnail, status and member progress. Only the ${kind === 'PDF' ? 'PDF' : 'video'} changes.`}
      footer={
        phase === 'failed' ? (
          <>
            <Button variant="secondary" onClick={cancel}>Cancel</Button>
            <Button onClick={() => run(() => jobRef.current.task.retry())}><RotateCcw className="h-4 w-4" /> Retry upload</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={cancel} disabled={phase === 'saving'}>{phase === 'uploading' ? 'Cancel upload' : 'Cancel'}</Button>
            <Button onClick={begin} loading={busy} disabled={!file || Boolean(fileError) || busy}>{busy ? `Uploading ${progress}%` : 'Replace file'}</Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        <FileDropzone
          accept={[...rule.accept, ...rule.extensions].join(',')}
          file={file}
          onFile={choose}
          onClear={() => { setFile(null); setFileError('') }}
          disabled={busy || phase === 'failed'}
          error={fileError}
          hint={`${rule.extensions.join(', ').toUpperCase()} · up to ${formatFileSize(limit)}`}
        />
        {fileError && <p className="text-xs text-red-600" role="alert">{fileError}</p>}
        {phase !== 'pick' && (
          <div aria-live="polite">
            <div className="mb-2 flex justify-between text-sm"><span className="font-medium text-navy-900">{phase === 'failed' ? 'Upload stopped' : statusText}</span><span className="tabular-nums text-slate-500">{progress}%</span></div>
            <ProgressBar value={progress} />
          </div>
        )}
        {error && <Alert type="error">{error}</Alert>}
      </div>
    </Modal>
  )
}
