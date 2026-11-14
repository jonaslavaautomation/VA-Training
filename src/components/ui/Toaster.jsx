import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

const styles = {
  success: { Icon: CheckCircle2, icon: 'text-mint-500' },
  error: { Icon: AlertCircle, icon: 'text-red-500' },
  info: { Icon: Info, icon: 'text-navy-500' },
}

export default function Toaster({ toasts, onDismiss }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-20 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end lg:bottom-6"
    >
      {toasts.map(({ id, type, message }) => {
        const { Icon, icon } = styles[type]
        return (
          <div
            key={id}
            role={type === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-white p-3.5 text-sm text-slate-700 shadow-lg ring-1 ring-slate-200"
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${icon}`} />
            <p className="flex-1">{message}</p>
            <button onClick={() => onDismiss(id)} className="-m-1 rounded-md p-1 text-slate-400 hover:text-slate-600" aria-label="Dismiss notification">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
