import { Link } from 'react-router-dom'
import { FolderOpen, FolderTree, Megaphone, Upload, Users, Zap } from 'lucide-react'
import Card from '@/components/ui/Card'

const actions = [
  { to: '/admin/members', label: 'Manage members', icon: Users, tint: 'bg-navy-50 text-navy-700' },
  { to: '/admin/upload', label: 'Upload training material', icon: Upload, tint: 'bg-mint-50 text-mint-700' },
  { to: '/admin/resources', label: 'Manage resources', icon: FolderOpen, tint: 'bg-sky-50 text-sky-700' },
  { to: '/admin/categories', label: 'Manage categories', icon: FolderTree, tint: 'bg-violet-50 text-violet-700' },
  { to: '/admin/announcements?new=1', label: 'Create announcement', icon: Megaphone, tint: 'bg-amber-50 text-amber-700' },
]

export default function QuickActions() {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-4 w-4 text-slate-400" />
        <h2 className="text-base font-semibold text-navy-900">Quick actions</h2>
      </div>
      <ul className="space-y-1">
        {actions.map(({ to, label, icon: Icon, tint }) => (
          <li key={to}>
            <Link to={to} className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tint}`}><Icon className="h-4 w-4" /></span>
              <span className="text-sm font-medium text-navy-900 group-hover:text-navy-700">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
