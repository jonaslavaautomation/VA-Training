import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function SectionHeader({ title, description, to, linkLabel = 'View all', children }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-navy-900">{title}</h2>
          {children}
        </div>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      {to && (
        <Link to={to} className="inline-flex min-h-6 shrink-0 items-center gap-1 text-sm font-medium text-navy-700 hover:text-navy-900">
          {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}
