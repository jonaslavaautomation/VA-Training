import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import SectionHeader from '@/components/ui/SectionHeader'
import ResourceTypeBadge from '@/components/resources/ResourceTypeBadge'
import { formatDate } from '@/lib/format'

const StatusBadge = ({ published }) =>
  published ? <Badge tone="mint">Published</Badge> : <Badge tone="amber">Draft</Badge>

export default function RecentUploadsTable({ uploads, loading }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-5">
        <SectionHeader title="Recent uploads" to="/admin/resources" linkLabel="Manage" />
      </div>
      {loading ? (
        <div className="space-y-2 p-5 pt-0">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11" />)}</div>
      ) : !uploads.length ? (
        <p className="px-5 pb-8 pt-4 text-center text-sm text-slate-500">No training materials uploaded yet.</p>
      ) : (
        <>
          {/* Desktop table */}
          <table className="hidden w-full text-left text-sm lg:table">
            <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Title</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Uploaded by</th>
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {uploads.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="max-w-xs px-5 py-3">
                    <p className="truncate font-medium text-navy-900">{r.title}</p>
                    <p className="truncate text-xs text-slate-500">{r.category?.name}</p>
                  </td>
                  <td className="px-3 py-3"><ResourceTypeBadge type={r.resource_type} /></td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{r.uploaded_by_name}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(r.created_at)}</td>
                  <td className="px-5 py-3"><StatusBadge published={r.is_published} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile list */}
          <ul className="divide-y divide-slate-100 border-t border-slate-100 lg:hidden">
            {uploads.map((r) => (
              <li key={r.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-navy-900">{r.title}</p>
                  <StatusBadge published={r.is_published} />
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                  <ResourceTypeBadge type={r.resource_type} /> {r.uploaded_by_name} · {formatDate(r.created_at)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}
