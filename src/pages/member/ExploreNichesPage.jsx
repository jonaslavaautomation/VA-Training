import { Compass } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import { LinkButton } from '@/components/ui/Button'

/** /explore-niches — reserved for a future phase. */
export default function ExploreNichesPage() {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <EmptyState
        icon={Compass}
        title="Explore Different VA Niches: coming soon"
        description="We’re building a guide to different Virtual Assistant careers, industries and skills. Meanwhile, you can keep learning in the Training Library or explore opportunities at LAVA Automation."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <LinkButton to="/library" variant="secondary">Training Library</LinkButton>
          <LinkButton to="/lava-portal">Explore LAVA Opportunities</LinkButton>
        </div>
      </EmptyState>
    </div>
  )
}
