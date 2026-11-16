import { NavLink, Outlet, Link } from 'react-router-dom'
import { ArrowLeft, Briefcase, ClipboardCheck, GraduationCap, Info, MonitorPlay, PenLine } from 'lucide-react'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { getMyStatus } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

const tabs = [
  { to: '/lava-portal', label: 'About LAVA', icon: Info, end: true },
  { to: '/lava-portal/careers', label: 'Careers', icon: Briefcase },
  { to: '/lava-portal/agreement', label: 'Agreement', icon: PenLine },
  { to: '/lava-portal/courses', label: 'Preparation', icon: GraduationCap },
  { to: '/lava-portal/assessments', label: 'Assessments', icon: ClipboardCheck },
  { to: '/lava-portal/simulator', label: 'Simulator', icon: MonitorPlay },
]

/**
 * Frame for every LAVA portal page: header, LAVA navigation, a way back to
 * the main dashboard, and the member's agreement / simulator status, shared
 * with child pages through the outlet context.
 */
export default function LavaPortalLayout() {
  const { user } = useAuth()
  const status = useAsync(() => getMyStatus(user.id), [user?.id])
  const agreed = Boolean(status.data?.agreement?.agreed)

  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="inline-flex min-h-6 items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> Back to VA Training Academy dashboard
      </Link>

      <header className="relative overflow-hidden rounded-2xl bg-navy-900 p-6 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-mint-400/15 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint-300">Applicant portal</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">LAVA Automation</h1>
          <p className="mt-2 max-w-2xl text-sm text-navy-200">Learn about the company, explore career opportunities, and prepare through the LAVA preparation program.</p>
          <ol className="mt-5 flex flex-wrap gap-2 text-xs" aria-label="Your progress">
            {[
              ['Learn about LAVA', true],
              ['Agreement', agreed],
              ['Preparation courses', agreed],
              ['Simulator', status.data?.request?.status === 'approved'],
            ].map(([label, done], i) => (
              <li key={label} className={`flex items-center gap-1.5 rounded-full px-3 py-1 ring-1 ${done ? 'bg-mint-400/15 text-mint-200 ring-mint-400/30' : 'bg-white/5 text-navy-200 ring-white/10'}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${done ? 'bg-mint-400 text-navy-900' : 'bg-white/10'}`}>{i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </div>
      </header>

      <nav aria-label="LAVA portal" className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex w-max min-w-full gap-1 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200/70">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900'}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {status.error ? (
        <Alert type="error">
          {toUserMessage(status.error, 'Couldn’t load the LAVA portal.')}{' '}
          <button onClick={status.reload} className="font-semibold underline-offset-2 hover:underline">Try again</button>
        </Alert>
      ) : status.loading && !status.data ? (
        <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>
      ) : (
        <Outlet context={{ status: status.data, agreed, reloadStatus: status.reload, setStatus: status.setData }} />
      )}
    </div>
  )
}
