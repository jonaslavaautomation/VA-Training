import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

const styles = {
  error: { box: 'bg-red-50 text-red-800 ring-red-200', Icon: AlertCircle },
  success: { box: 'bg-mint-50 text-mint-700 ring-mint-200', Icon: CheckCircle2 },
  info: { box: 'bg-navy-50 text-navy-800 ring-navy-100', Icon: Info },
}

export default function Alert({ type = 'info', title, children, className = '' }) {
  const { box, Icon } = styles[type]
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-lg p-3.5 text-sm ring-1 ring-inset ${box} ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
    </div>
  )
}
