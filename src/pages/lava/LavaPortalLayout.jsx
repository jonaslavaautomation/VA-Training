import { NavLink, Outlet, Link } from 'react-router-dom'
import { ArrowLeft, Briefcase, ClipboardCheck, GraduationCap, Info, MonitorPlay, PenLine } from 'lucide-react'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { getMyStatus } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'
import lavaLogo from '@/assets/lava/lava-logo-white.png'
import '@/components/lava/lavaFonts'

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
    <div className="theme-lava space-y-6">
      <Link to="/dashboard" className="inline-flex min-h-6 items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> Back to VA Training Academy dashboard
      </Link>

      <header className="relative overflow-hidden rounded-2xl bg-navy-900 shadow-sm">
        <div className="h-1 bg-lava-500" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-lava-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-lava-500/10 blur-3xl" />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="m-0">
              <img src={lavaLogo} alt="LAVA Automation" width={424} height={134} className="h-10 w-auto sm:h-12" />
            </h1>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white ring-1 ring-white/15">Applicant portal</span>
          </div>
          <p className="mt-5 max-w-2xl text-xl font-semibold leading-snug text-white sm:text-2xl">Your path to a career at <span className="text-lava-400">LAVA Automation</span></p>
          <p className="mt-2 max-w-2xl text-sm text-navy-200">Learn about the company, explore career opportunities, and prepare through the LAVA preparation program.</p>
          <ol className="mt-6 flex flex-wrap gap-2 text-xs" aria-label="Your progress">
            {[
              ['Learn about LAVA', true],
              ['Agreement', agreed],
              ['Preparation courses', agreed],
              ['Simulator', status.data?.request?.status === 'approved'],
            ].map(([label, done], i) => (
              <li key={label} className={`flex items-center gap-1.5 rounded-full px-3 py-1 ring-1 ${done ? 'bg-lava-500/15 text-white ring-lava-500/40' : 'bg-white/5 text-navy-200 ring-white/10'}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${done ? 'bg-lava-500 text-white' : 'bg-white/10'}`}>{i + 1}</span>
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
              className={({ isActive }) => `flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-lava-500 text-white shadow-sm' : 'text-slate-600 hover:bg-lava-50 hover:text-lava-700'}`}
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
