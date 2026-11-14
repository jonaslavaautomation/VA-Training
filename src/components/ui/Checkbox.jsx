import { useId } from 'react'

export default function Checkbox({ label, className = '', ...props }) {
  const id = useId()
  return (
    <label htmlFor={id} className={`inline-flex cursor-pointer select-none items-center gap-2 text-sm text-slate-600 ${className}`}>
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 accent-navy-900"
        {...props}
      />
      {label}
    </label>
  )
}
