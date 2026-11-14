import Spinner from './Spinner'

export default function FullPageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-navy-900" role="status">
      <Spinner className="h-8 w-8 text-mint-500" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  )
}
