import { useId, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

const base = 'block w-full rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-400 focus:outline-none focus:ring-4 focus:ring-navy-100'

export function TextArea({ label, hint, error, rows = 4, className = '', ...props }) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <textarea id={id} rows={rows} className={`${base} px-3.5 py-2.5 leading-6`} aria-invalid={Boolean(error)} {...props} />
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

export function Select({ label, hint, options, className = '', ...props }) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <select id={id} className={`${base} h-11 px-3`} {...props}>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export const FORMAT_HINT = 'Formatting: blank line = new paragraph · "## " heading · "- " bullet · "1. " numbered · "> " tip · **bold**'

/** "Are you sure?" dialog for destructive admin actions. */
export function ConfirmDelete({ title, message, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      open
      size="sm"
      onClose={busy ? undefined : onClose}
      title={title}
      description={message}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={async () => { setBusy(true); try { await onConfirm() } finally { setBusy(false) } }}>Delete</Button>
        </>
      }
    />
  )
}
