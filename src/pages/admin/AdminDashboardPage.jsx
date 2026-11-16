import { CheckCircle2, FileText, Library, Megaphone, PencilLine, PlayCircle, Upload, UserCheck, Users, UserX } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import Alert from '@/components/ui/Alert'
import SampleDataBadge from '@/components/ui/SampleDataBadge'
import { LinkButton } from '@/components/ui/Button'
import QuickActions from '@/components/admin/QuickActions'
import RecentUploadsTable from '@/components/admin/RecentUploadsTable'
import RecentMembersCard from '@/components/admin/RecentMembersCard'
import ActivityFeed from '@/components/admin/ActivityFeed'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { getAdminStats, getRecentUploads, listRecentAdminActions, listRecentRegistrations } from '@/services/adminService'
import { getLavaAdminStats } from '@/services/lavaService'
import { Link } from 'react-router-dom'

async function loadAdminDashboard() {
  const [stats, uploads, activity, registrations, lava] = await Promise.all([
    getAdminStats(),
    getRecentUploads(6),
    listRecentAdminActions(8),
    listRecentRegistrations(5),
    getLavaAdminStats().catch(() => null), // LAVA numbers never block the dashboard
  ])
  return { stats, uploads, activity, registrations, lava }
}

export default function AdminDashboardPage() {
  const { displayName } = useAuth()
  const { data, loading, error, reload } = useAsync(loadAdminDashboard)
  const s = data?.stats
  const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '0%')

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-navy-900 p-6 shadow-sm sm:p-8" aria-label="Admin overview">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-lava-500" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-lava-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-lava-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lava-400">Admin dashboard</p>
              <SampleDataBadge />
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Welcome back, {displayName}</h1>
            <p className="mt-1 text-sm text-navy-200">Here’s what’s happening in the academy today.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <LinkButton to="/admin/announcements?new=1" variant="onDark" aria-label="New announcement"><Megaphone className="h-4 w-4" /> <span className="hidden sm:inline">Announcement</span></LinkButton>
            <LinkButton to="/admin/members" variant="onDark" aria-label="Members"><Users className="h-4 w-4" /> <span className="hidden sm:inline">Members</span></LinkButton>
            <LinkButton to="/admin/upload"><Upload className="h-4 w-4" /> Upload</LinkButton>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10 sm:grid-cols-4">
          {[
            ['Active members', s?.activeMembers, '/admin/members'],
            ['Published resources', s?.publishedCount, '/admin/resources'],
            ['LAVA applicants', data?.lava?.applicants, '/admin/lava/applicants'],
            ['Pending requests', data?.lava?.pendingRequests, '/admin/lava/requests'],
          ].map(([label, value, to]) => (
            <Link key={label} to={to} className="group bg-navy-900/80 px-4 py-3 transition hover:bg-navy-800">
              <p className="text-[11px] font-medium uppercase tracking-wider text-navy-300 group-hover:text-lava-300">{label}</p>
              <p className="mt-0.5 text-2xl font-semibold text-white">{loading ? '–' : value ?? 0}</p>
            </Link>
          ))}
        </div>
      </section>

      {error && (
        <Alert type="error">
          Couldn’t load dashboard data.{' '}
          <button onClick={reload} className="font-semibold underline-offset-2 hover:underline">Try again</button>
        </Alert>
      )}

      {data?.lava?.pendingRequests > 0 && (
        <Alert type="info" title={`${data.lava.pendingRequests} LAVA simulator access request${data.lava.pendingRequests === 1 ? '' : 's'} waiting for review`}>
          <Link to="/admin/lava/requests" className="font-semibold underline-offset-2 hover:underline">Review requests</Link>
        </Alert>
      )}

      <section aria-label="Member statistics">
        <h2 className="sr-only">Members</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Total members" value={s?.totalMembers} icon={Users} tint="navy" loading={loading} hint="Registered member accounts" />
          <StatCard label="Active members" value={s?.activeMembers} icon={UserCheck} tint="mint" loading={loading} hint={s ? `${pct(s.activeMembers, s.totalMembers)} of members` : undefined} />
          <StatCard label="Inactive members" value={s?.inactiveMembers} icon={UserX} tint="amber" loading={loading} hint="Access revoked" />
          <StatCard label="Training resources" value={s?.resourceTotal} icon={Library} tint="red" loading={loading} hint="All uploads, incl. drafts" />
        </div>
      </section>
      <section aria-label="Resource statistics">
        <h2 className="sr-only">Resources</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Published" value={s?.publishedCount} icon={CheckCircle2} tint="mint" loading={loading} hint="Visible to members" />
          <StatCard label="Drafts" value={s?.draftCount} icon={PencilLine} tint="amber" loading={loading} hint="Admins only" />
          <StatCard label="PDF files" value={s?.pdfCount} icon={FileText} tint="navy" loading={loading} hint="Including drafts" />
          <StatCard label="Video files" value={s?.videoCount} icon={PlayCircle} tint="red" loading={loading} hint="Including drafts" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <RecentMembersCard members={data?.registrations ?? []} loading={loading} />
          <RecentUploadsTable uploads={data?.uploads ?? []} loading={loading} />
        </div>
        <div className="space-y-6">
          <QuickActions />
          <ActivityFeed items={data?.activity ?? []} loading={loading} />
        </div>
      </div>
    </div>
  )
}
