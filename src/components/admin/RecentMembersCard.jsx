import { Users } from 'lucide-react'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import SectionHeader from '@/components/ui/SectionHeader'
import { LinkButton } from '@/components/ui/Button'
import { formatDate, fullName } from '@/lib/format'

export default function RecentMembersCard({ members, loading }) {
  return (
    <Card className="p-5">
      <SectionHeader title="Recent registrations" to="/admin/members" linkLabel="All members" />
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : !members.length ? (
        <div className="flex flex-col items-center py-6 text-center">
          <p className="text-sm text-slate-500">No members yet.</p>
          <LinkButton to="/admin/members" size="sm" variant="secondary" className="mt-3"><Users className="h-4 w-4" /> Open members</LinkButton>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <Avatar name={fullName(m) || m.email} src={m.avatar_url} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-navy-900">{fullName(m) || m.email}</p>
                <p className="truncate text-xs text-slate-500">{m.email}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {m.status === 'active' ? <Badge tone="mint">Active</Badge> : <Badge tone="red">Inactive</Badge>}
                <span className="text-[11px] text-slate-400">{formatDate(m.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
