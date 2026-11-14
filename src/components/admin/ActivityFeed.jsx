import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Skeleton from '@/components/ui/Skeleton'
import SectionHeader from '@/components/ui/SectionHeader'
import { ACTIVITY_LABELS } from '@/config/activity'
import { timeAgo } from '@/lib/format'

/** Compact feed of recent administrative actions (dashboard). */
export default function ActivityFeed({ items, loading, title = 'Recent admin activity' }) {
  return (
    <Card className="p-5">
      <SectionHeader title={title} to="/admin/activity" linkLabel="Activity logs" />
      {loading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : !items.length ? (
        <p className="py-6 text-center text-sm text-slate-500">No administrative activity yet.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((a) => (
            <li key={a.id} className="flex gap-3">
              <Avatar name={a.actor_name} size="sm" />
              <div className="min-w-0 text-sm">
                <p className="text-slate-600">
                  <span className="font-medium text-navy-900">{a.actor_name}</span> · {ACTIVITY_LABELS[a.activity_type] ?? a.activity_type}
                </p>
                {a.target && <p className="truncate text-xs text-slate-500">{a.target}</p>}
                <p className="text-xs text-slate-400">{timeAgo(a.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
