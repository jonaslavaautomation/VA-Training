import Card from './Card'
import Skeleton from './Skeleton'

const tints = {
  navy: 'bg-navy-50 text-navy-700',
  mint: 'bg-mint-50 text-mint-700',
  sky: 'bg-sky-50 text-sky-700',
  red: 'bg-lava-50 text-lava-600',
  amber: 'bg-amber-50 text-amber-700',
}

export default function StatCard({ label, value, icon: Icon, tint = 'navy', hint, loading }) {
  return (
    <Card className="group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-lava-500 opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && (
          <div className={`hidden h-10 w-10 shrink-0 items-center sm:flex justify-center rounded-xl ${tints[tint]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : (
        <p className="mt-1 text-3xl font-semibold tracking-tight text-navy-900">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  )
}
