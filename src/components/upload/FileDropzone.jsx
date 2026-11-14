import { useRef, useState } from 'react'
import { FileText, PlayCircle, UploadCloud, X } from 'lucide-react'
import { formatFileSize } from '@/lib/format'

/** Drag-and-drop area with a Browse button. Accepts one file. */
export default function FileDropzone({ accept, file, onFile, onClear, hint, error, disabled }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const pick = (files) => {
    if (disabled || !files?.length) return
    onFile(files[0])
  }

  if (file) {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm)$/i.test(file.name)
    const Icon = isVideo ? PlayCircle : FileText
    return (
      <div className={`flex items-center gap-3 rounded-xl border p-3 ${error ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white'}`}>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${isVideo ? 'bg-navy-50 text-navy-700' : 'bg-mint-50 text-mint-700'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-navy-900">{file.name}</p>
          <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
        </div>
        {!disabled && (
          <button type="button" onClick={onClear} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Remove file">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files) }}
      className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
        dragging ? 'border-mint-400 bg-mint-50/60' : error ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-slate-50/50'
      }`}
      data-testid="dropzone"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-mint-600 shadow-sm ring-1 ring-slate-200">
        <UploadCloud className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-navy-900">Drag and drop your file here</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="mt-4 inline-flex h-9 items-center rounded-lg bg-white px-4 text-sm font-medium text-navy-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
      >
        Browse files
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose file to upload"
        onChange={(e) => { pick(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}
