import { CheckCircle2, FileText, Library, Megaphone, PencilLine, PlayCircle, Upload, UserCheck, Users, UserX } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
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

async function loadAdminDashboard() {
  const [stats, uploads, activity, registrations] = await Promise.all([
    getAdminStats(),
    getRecentUploads(6),
    listRecentAdminActions(8),
    listRecentRegistrations(5),
  ])
  return { stats, uploads, activity, registrations }
}

export default function AdminDashboardPage() {
  const { displayName } = useAuth()
  const { data, loading, error, reload } = useAsync(loadAdminDashboard)
  const s = data?.stats
  const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '0%')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin dashboard"
        badge={<SampleDataBadge />}
        description={`Welcome back, ${displayName}. Here’s what’s happening in the academy.`}
        actions={
          <>
            <LinkButton to="/admin/announcements?new=1" variant="secondary" aria-label="New announcement"><Megaphone className="h-4 w-4" /> <span className="hidden sm:inline">Announcement</span></LinkButton>
            <LinkButton to="/admin/members" variant="secondary" aria-label="Members"><Users className="h-4 w-4" /> <span className="hidden sm:inline">Members</span></LinkButton>
            <LinkButton to="/admin/upload"><Upload className="h-4 w-4" /> Upload</LinkButton>
          </>
        }
      />

      {error && (
        <Alert type="error">
          Couldn’t load dashboard data.{' '}
          <button onClick={reload} className="font-semibold underline-offset-2 hover:underline">Try again</button>
        </Alert>
      )}

      <section aria-label="Member statistics">
        <h2 className="sr-only">Members</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Total members" value={s?.totalMembers} icon={Users} tint="navy" loading={loading} hint="Registered member accounts" />
          <StatCard label="Active members" value={s?.activeMembers} icon={UserCheck} tint="mint" loading={loading} hint={s ? `${pct(s.activeMembers, s.totalMembers)} of members` : undefined} />
          <StatCard label="Inactive members" value={s?.inactiveMembers} icon={UserX} tint="amber" loading={loading} hint="Access revoked" />
          <StatCard label="Training resources" value={s?.resourceTotal} icon={Library} tint="sky" loading={loading} hint="All uploads, incl. drafts" />
        </div>
      </section>
      <section aria-label="Resource statistics">
        <h2 className="sr-only">Resources</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Published" value={s?.publishedCount} icon={CheckCircle2} tint="mint" loading={loading} hint="Visible to members" />
          <StatCard label="Drafts" value={s?.draftCount} icon={PencilLine} tint="amber" loading={loading} hint="Admins only" />
          <StatCard label="PDF files" value={s?.pdfCount} icon={FileText} tint="navy" loading={loading} hint="Including drafts" />
          <StatCard label="Video files" value={s?.videoCount} icon={PlayCircle} tint="sky" loading={loading} hint="Including drafts" />
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
