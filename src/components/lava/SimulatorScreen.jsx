import { ClipboardList, Database, FileSpreadsheet, Mail } from 'lucide-react'

const looks = {
  email: { icon: Mail, label: 'Email', bar: 'bg-sky-600' },
  record: { icon: Database, label: 'Agency system', bar: 'bg-navy-800' },
  form: { icon: FileSpreadsheet, label: 'Form', bar: 'bg-violet-600' },
  note: { icon: ClipboardList, label: 'Note', bar: 'bg-amber-500' },
}

/** A simulated work screen for a simulator task (fictional practice data). */
export default function SimulatorScreen({ context }) {
  if (!context) return null
  const look = looks[context.kind] ?? looks.note
  const Icon = look.icon
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" data-testid="simulator-screen">
      <div className={`flex items-center gap-2 px-4 py-2.5 text-white ${look.bar}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{look.label}</span>
        <span className="min-w-0 truncate text-sm font-medium">{context.title}</span>
      </div>
      {Array.isArray(context.fields) && context.fields.length > 0 && (
        <dl className="divide-y divide-slate-100 text-sm">
          {context.fields.map(([label, value], i) => (
            <div key={i} className="grid grid-cols-1 gap-0.5 px-4 py-2 sm:grid-cols-[9rem_1fr] sm:gap-3">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 sm:pt-0.5">{label}</dt>
              <dd className="break-words font-mono text-[13px] text-navy-900">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {context.body && <p className="whitespace-pre-line border-t border-slate-100 px-4 py-3 text-sm leading-6 text-slate-700">{context.body}</p>}
      <p className="border-t border-slate-100 bg-slate-50 px-4 py-1.5 text-[11px] text-slate-400">Practice data · all names and numbers are fictional</p>
    </div>
  )
}
