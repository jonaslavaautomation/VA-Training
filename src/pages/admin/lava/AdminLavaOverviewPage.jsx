import { Link } from 'react-router-dom'
import { ArrowRight, Briefcase, ClipboardCheck, FileText, GraduationCap, MonitorPlay, UserCheck, Users } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import Alert from '@/components/ui/Alert'
import { useAsync } from '@/hooks/useAsync'
import { getLavaAdminStats } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

const links = [
  { to: '/admin/lava/requests', icon: MonitorPlay, title: 'Simulator access requests', detail: 'Approve or reject requests, add notes' },
  { to: '/admin/lava/applicants', icon: Users, title: 'Applicants', detail: 'Agreements, course progress, assessment results' },
  { to: '/admin/lava/content', icon: FileText, title: 'Company content', detail: 'About LAVA, history, mission, niches, clients, working arrangement, agreement text' },
  { to: '/admin/lava/positions', icon: Briefcase, title: 'Hiring opportunities', detail: 'Positions, salaries, qualifications, hiring status' },
  { to: '/admin/lava/courses', icon: GraduationCap, title: 'Preparation courses', detail: 'Courses, lessons and attached library materials' },
  { to: '/admin/lava/assessments', icon: ClipboardCheck, title: 'Assessments & simulator', detail: 'Quizzes, questions and simulator activities' },
]

export default function AdminLavaOverviewPage() {
  const { data, loading, error, reload } = useAsync(getLavaAdminStats)
  return (
    <div className="space-y-6">
      {error && <Alert type="error">{toUserMessage(error, 'Couldn’t load LAVA numbers.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>}
      {data?.pendingRequests > 0 && (
        <Alert type="info" title={`${data.pendingRequests} simulator access request${data.pendingRequests === 1 ? '' : 's'} waiting for review`}>
          <Link to="/admin/lava/requests" className="font-semibold underline">Review requests</Link>
        </Alert>
      )}
      {data?.draftSections > 0 && (
        <Alert type="info" title={`${data.draftSections} company section${data.draftSections === 1 ? ' is' : 's are'} still a draft`}>
          Members don’t see draft sections. Replace the placeholders with verified information and publish them in <Link to="/admin/lava/content" className="font-semibold underline">Company content</Link>.
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Applicants" value={data?.applicants} icon={Users} tint="navy" loading={loading} hint="Answered the agreement" />
        <StatCard label="Agreed to all terms" value={data?.agreed} icon={UserCheck} tint="mint" loading={loading} hint="Preparation unlocked" />
        <StatCard label="Pending requests" value={data?.pendingRequests} icon={MonitorPlay} tint="amber" loading={loading} hint={data ? `${data.approved} approved` : undefined} />
        <StatCard label="Open positions" value={data?.openPositions} icon={Briefcase} tint="sky" loading={loading} hint="Shown as hiring" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {links.map(({ to, icon: Icon, title, detail }) => (
          <Link key={to} to={to} className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition hover:shadow-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><Icon className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-navy-900">{title}</p><p className="text-xs text-slate-500">{detail}</p></div>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-navy-700" />
          </Link>
        ))}
      </div>
    </div>
  )
}
