import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import DashboardShell from './DashboardShell'
import { adminNavigation } from '@/config/navigation'

export default function AdminLayout() {
  return (
    <DashboardShell
      navigation={adminNavigation}
      subtitle="Admin Console"
      sidebarFooter={
        <Link to="/dashboard" className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-sm font-medium text-navy-100 hover:bg-white/10">
          <GraduationCap className="h-4 w-4 text-lava-400" /> View member portal
        </Link>
      }
      searchPath="/admin/resources"
      searchPlaceholder="Search resources to manage…"
    />
  )
}
