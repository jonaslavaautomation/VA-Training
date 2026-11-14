import { Megaphone } from 'lucide-react'
import Card from '@/components/ui/Card'
import { formatDate } from '@/lib/format'

/** One announcement as members see it. Content is plain text (rendered safely, line breaks kept). */
export default function AnnouncementCard({ announcement: a, compact = false }) {
  return (
    <Card className="overflow-hidden" data-testid="announcement">
      {a.image_url && <img src={a.image_url} alt="" loading="lazy" decoding="async" className={`w-full object-cover ${compact ? 'h-32' : 'max-h-72'}`} />}
      <div className="p-4 sm:p-5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-mint-600">
          <Megaphone className="h-3.5 w-3.5" /> {formatDate(a.published_at ?? a.created_at)}
        </p>
        <h3 className="mt-1 font-semibold text-navy-900">{a.title}</h3>
        <p className={`mt-1 whitespace-pre-line text-sm text-slate-600 ${compact ? 'line-clamp-3' : ''}`}>{a.content}</p>
      </div>
    </Card>
  )
}
