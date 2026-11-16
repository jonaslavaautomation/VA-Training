import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Briefcase, CheckCircle2, Compass, GraduationCap, Heart, Library, PlayCircle, Sparkles } from 'lucide-react'
import Card from '@/components/ui/Card'
import SearchBar from '@/components/ui/SearchBar'
import SectionHeader from '@/components/ui/SectionHeader'
import Skeleton from '@/components/ui/Skeleton'
import SampleDataBadge from '@/components/ui/SampleDataBadge'
import ProgressBar from '@/components/ui/ProgressBar'
import StatCard from '@/components/ui/StatCard'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { LinkButton } from '@/components/ui/Button'
import CategoryCard from '@/components/resources/CategoryCard'
import ResourceGrid from '@/components/resources/ResourceGrid'
import ResourceListItem from '@/components/resources/ResourceListItem'
import AnnouncementCard from '@/components/member/AnnouncementCard'
import { listLiveAnnouncements } from '@/services/announcementService'
import { useAuth } from '@/hooks/useAuth'
import { useAsync } from '@/hooks/useAsync'
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle'
import * as resources from '@/services/resourceService'
import lavaLogo from '@/assets/lava/lava-logo-white.png'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

/**
 * Loads every dashboard section in parallel. All numbers come from Supabase:
 * totals from a count of published resources, started/completed from the
 * member's own learning_progress rows (published resources only).
 */
async function loadDashboard() {
  const [categories, catalog, progress, favorites, announcements] = await Promise.all([
    resources.listCategories(),
    resources.listResources({ limit: 24 }), // newest 24 published: "Recently added" + recommendation pool (thumbnails signed in one request)
    resources.getLearningProgress(),
    resources.listFavorites(),
    listLiveAnnouncements({ limit: 3 }).catch(() => []), // announcements never block the dashboard
  ])
  return { categories, catalog, progress, favorites, announcements }
}

/** The two career paths at the top of the dashboard (Phase 7A: only LAVA is built). */
function PathCard({ to, icon: Icon, eyebrow, title, description, action, accent, soon, logo }) {
  return (
    <Link to={to} data-testid="path-card" className={`group relative flex flex-col overflow-hidden rounded-2xl p-6 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${accent ? 'bg-[#22212a] ring-[#22212a]' : 'bg-white ring-slate-200/70'}`}>
      {accent && <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-lava-500" />}
      {accent && <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lava-500/25 blur-3xl" />}
      <div className="relative flex items-start justify-between gap-3">
        {logo ? <img src={logo} alt="LAVA Automation" width={424} height={134} className="h-9 w-auto" /> : <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Icon className="h-6 w-6" /></div>}
        {soon ? <Badge tone="gray">Coming soon</Badge> : <Badge tone="red">Now open</Badge>}
      </div>
      <p className={`relative mt-4 text-xs font-semibold uppercase tracking-wider ${accent ? 'text-lava-400' : 'text-slate-400'}`}>{eyebrow}</p>
      <h2 className={`relative mt-1 text-lg font-semibold ${accent ? 'text-white' : 'text-navy-900'}`}>{title}</h2>
      <p className={`relative mt-2 flex-1 text-sm leading-6 ${accent ? 'text-slate-300' : 'text-slate-500'}`}>{description}</p>
      <span className={`relative mt-5 inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg px-4 text-sm font-medium transition ${accent ? 'bg-lava-500 text-white group-hover:bg-lava-600' : 'bg-white text-navy-900 ring-1 ring-inset ring-slate-200 group-hover:bg-slate-50'}`}>
        {action} <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  )
}

function QuickLink({ to, icon: Icon, title, detail, tint }) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-lava-200">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-navy-900">{title}</p>
        <p className="truncate text-xs text-slate-500">{detail}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-lava-500" />
    </Link>
  )
}

export default function MemberDashboardPage() {
  const { displayName, user, profile } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, setData, reload } = useAsync(loadDashboard)

  // Hearts update every card list on the page, then refresh the saved count.
  const apply = useCallback((d, fn) => ({
    ...d,
    catalog: fn(d.catalog),
    progress: { ...d.progress, inProgress: fn(d.progress.inProgress), completed: fn(d.progress.completed) },
  }), [])
  const toggle = useFavoriteToggle(setData, {
    apply,
    onChanged: useCallback(() => {
      resources.listFavorites().then((favorites) => setData((d) => ({ ...d, favorites }))).catch(() => {})
    }, [setData]),
  })

  const progress = data?.progress
  const total = progress?.totalPublished ?? 0
  const completedCount = progress?.completed.length ?? 0
  const completedPct = total ? Math.round((completedCount / total) * 100) : 0
  const noMaterials = !loading && !error && total === 0
  const rec = data ? resources.recommend(data.catalog, data.progress, data.favorites, 3) : { items: [], personalized: false }
  const firstName = profile?.first_name || displayName

  return (
    <div className="space-y-8">
      {/* Welcome + search */}
      <section className="relative overflow-hidden rounded-2xl bg-navy-900 p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-lava-500" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-lava-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-lava-500/10 blur-3xl" />
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm font-medium text-lava-400">{greeting()},</p>
            <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">Welcome back, {firstName}</h1>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-sm text-navy-200">
              <span className="min-w-0 max-w-full truncate">{user?.email}</span>
              {profile?.status === 'active' ? <Badge tone="mint">Active account</Badge> : <Badge tone="red">Inactive account</Badge>}
            </div>
            <SearchBar size="lg" className="mt-5 max-w-xl" onSearch={(q) => navigate(q ? `/library?q=${encodeURIComponent(q)}` : '/library')} />
          </div>
          <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10 lg:w-64">
            <p className="text-xs font-medium uppercase tracking-wider text-navy-300">Overall progress</p>
            {loading ? <Skeleton className="mt-2 h-8 w-20 bg-white/10" /> : (
              <>
                <p className="mt-1 text-3xl font-semibold text-white" data-testid="overall-progress">{completedPct}%</p>
                <ProgressBar value={completedPct} className="mt-2 bg-white/10" />
                <p className="mt-2 text-xs text-navy-200">{completedCount} of {total} resources completed</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Career paths */}
      <section aria-label="Choose your path">
        <SectionHeader title="Where would you like to go next?" description="Choose a path. You can always come back to the main dashboard." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PathCard
            to="/lava-portal"
            icon={Briefcase}
            eyebrow="Option 1"
            title="I Want to Apply to LAVA Automation"
            description="Interested in becoming part of LAVA Automation? Discover our company, explore our career opportunities, and prepare yourself through our specialized training program."
            action="Explore LAVA Opportunities"
            accent
            logo={lavaLogo}
          />
          <PathCard
            to="/explore-niches"
            icon={Compass}
            eyebrow="Option 2"
            title="I Want to Explore Different Niches"
            description="Discover different Virtual Assistant careers, explore various industries, and develop new skills."
            action="Explore VA Niches"
            soon
          />
        </div>
      </section>

      {error && (
        <Alert type="error">
          Couldn’t load your dashboard.{' '}
          <button onClick={reload} className="font-semibold underline-offset-2 hover:underline">Try again</button>
        </Alert>
      )}

      {/* Announcements from trainers */}
      {data?.announcements?.length > 0 && (
        <section>
          <SectionHeader title="Announcements" to="/announcements" linkLabel="View all" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.announcements.map((a) => <AnnouncementCard key={a.id} announcement={a} compact />)}
          </div>
        </section>
      )}

      {/* Stats — every number comes from the database */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4" data-testid="dashboard-stats">
        <StatCard label="Available resources" value={total} icon={Library} tint="navy" loading={loading} hint="Published videos and PDFs" />
        <StatCard label="Started" value={progress?.started} icon={PlayCircle} tint="red" loading={loading} hint={progress ? `${progress.inProgress.length} in progress` : undefined} />
        <StatCard label="Completed" value={completedCount} icon={CheckCircle2} tint="mint" loading={loading} hint={total ? `${completedPct}% of the library` : undefined} />
      </div>

      {/* Quick access */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <QuickLink to="/library" icon={Library} title="Training Library" detail={loading ? 'Loading…' : `${total} resource${total === 1 ? '' : 's'}`} tint="bg-navy-50 text-navy-700" />
        <QuickLink to="/my-learning" icon={GraduationCap} title="My Learning" detail={loading ? 'Loading…' : `${progress?.inProgress.length ?? 0} in progress · ${completedCount} completed`} tint="bg-lava-50 text-lava-600" />
        <QuickLink to="/favorites" icon={Heart} title="Favorites" detail={loading ? 'Loading…' : `${data?.favorites.length ?? 0} saved`} tint="bg-lava-50 text-lava-600" />
      </div>

      {noMaterials ? (
        <EmptyState
          icon={BookOpen}
          title="No training materials available yet."
          description="New videos and PDF guides will appear here as soon as your trainers publish them."
        />
      ) : (
        <>
          {/* Continue learning */}
          <section>
            <SectionHeader title="Continue learning" to="/my-learning" linkLabel="My Learning" />
            <ResourceGrid
              resources={progress?.inProgress.slice(0, 3)}
              loading={loading}
              skeletons={3}
              onToggleFavorite={toggle}
              empty={
                <EmptyState icon={Compass} title="You haven’t started any training yet" description="Pick a video or guide from the library — your progress will show up here.">
                  <LinkButton to="/library">Explore the library</LinkButton>
                </EmptyState>
              }
            />
          </section>

          {/* Recommended */}
          {(loading || rec.items.length > 0) && (
            <section>
              <SectionHeader
                title={rec.personalized ? 'Recommended for you' : 'Start here'}
                description={rec.personalized ? 'Based on what you’ve been learning and saving.' : 'The newest training you haven’t started yet.'}
                to="/library"
                linkLabel="Browse all"
              >
                <Sparkles className="h-4 w-4 text-lava-500" />
              </SectionHeader>
              <ResourceGrid resources={rec.items} loading={loading} skeletons={3} onToggleFavorite={toggle} />
            </section>
          )}

          {/* Recently added + categories */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section>
              <SectionHeader title="Recently added" to="/library" />
              <Card className="p-2">
                {loading ? (
                  <div className="space-y-2 p-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : (
                  <ul>{data.catalog.slice(0, 5).map((r) => <ResourceListItem key={r.id} resource={r} />)}</ul>
                )}
              </Card>
            </section>
            <section className="lg:col-span-2">
              <SectionHeader title="Training categories" to="/library" linkLabel="Browse library"><SampleDataBadge /></SectionHeader>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {loading
                  ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[76px] rounded-2xl" />)
                  : data.categories.filter((c) => c.resource_count > 0).map((c) => <CategoryCard key={c.id} category={c} />)}
              </div>
              {!loading && !data.categories.some((c) => c.resource_count > 0) && (
                <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200/70">Resources haven’t been sorted into categories yet.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
