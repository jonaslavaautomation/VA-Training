import { Megaphone } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import AnnouncementCard from '@/components/member/AnnouncementCard'
import { useAsync } from '@/hooks/useAsync'
import { listLiveAnnouncements } from '@/services/announcementService'

export default function AnnouncementsPage() {
  const { data, loading, error, reload } = useAsync(() => listLiveAnnouncements())
  return (
    <>
      <PageHeader title="Announcements" description="Updates from your trainers." />
      {error ? (
        <Alert type="error">Couldn’t load announcements. <button onClick={reload} className="font-semibold underline-offset-2 hover:underline">Try again</button></Alert>
      ) : loading ? (
        <div className="space-y-4">{[0, 1].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      ) : !data.length ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description="When your trainers post updates, you’ll see them here and on your dashboard." />
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">{data.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}</div>
      )}
    </>
  )
}
