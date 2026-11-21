import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import DashboardShell from './DashboardShell'
import { memberNavigation, memberTabs, memberTopNav } from '@/config/navigation'
import MobileTabBar from './MobileTabBar'
import { useAuth } from '@/hooks/useAuth'

export default function MemberLayout() {
  const { isAdmin } = useAuth()
  const footer = isAdmin ? (
    <Link to="/admin" className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-sm font-medium text-navy-100 hover:bg-white/10">
      <ShieldCheck className="h-4 w-4 text-lava-400" /> Open admin console
    </Link>
  ) : (
    <div className="rounded-xl bg-white/5 p-4">
      <p className="text-xs font-semibold text-white">Need help?</p>
      <p className="mt-1 text-xs text-navy-200">Contact your training administrator for access issues.</p>
    </div>
  )

  return (
    <DashboardShell
      navigation={memberNavigation}
      topNav={memberTopNav}
      homeTo="/dashboard"
      switchLink={isAdmin ? { to: '/admin', label: 'Admin console', icon: ShieldCheck } : null}
      sidebarFooter={footer}
      searchPath="/library"
      searchPlaceholder="Search training resources…"
      bottomNav={<MobileTabBar items={memberTabs} />}
    />
  )
}
