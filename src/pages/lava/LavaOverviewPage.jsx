import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, Briefcase, GraduationCap } from 'lucide-react'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import RichText, { extractPhotos, PhotoShowcase } from '@/components/lava/RichText'
import { ArrangementNotice } from '@/components/lava/LavaUi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { listContent } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

const SECTIONS = [
  { key: 'overview', eyebrow: 'Who we are' },
  { key: 'history', eyebrow: 'Our story' },
  { key: 'mission_vision', eyebrow: 'What drives us' },
  { key: 'services', eyebrow: 'What we do' },
  { key: 'niches', eyebrow: 'Where we specialize' },
  { key: 'clients', eyebrow: 'Who we serve' },
]

// Full-width bands that bleed to the edges of the content area (website look, no cards).
const BAND = '-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8'

/**
 * One company section laid out like a website section: big heading and
 * readable text, with the section's photos beside it (alternating sides).
 * Sections without photos use a heading-left / text-right layout.
 */
function CompanySection({ index, eyebrow, row, isAdmin }) {
  const headingId = `lava-h-${row.key}`
  const { text, photos } = extractPhotos(row.body)
  const flip = index % 2 === 1
  const heading = (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lava-500">
        <span className="mr-2 text-navy-300">{String(index + 1).padStart(2, '0')}</span>{eyebrow}
      </p>
      <h2 id={headingId} className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-navy-900 sm:text-3xl lg:text-[2.1rem]">{row.title}</h2>
      <span className="mt-4 block h-1 w-12 rounded-full bg-lava-500" aria-hidden="true" />
      {isAdmin && row.status !== 'published' && <Badge tone="amber" className="mt-3">Draft · admins only</Badge>}
    </div>
  )
  const body = text ? <RichText text={text} className="text-base leading-8 text-slate-600 sm:text-[17px]" /> : null

  return (
    <section
      data-testid={`lava-section-${row.key}`}
      aria-labelledby={headingId}
      className={`${BAND} py-12 sm:py-16 ${flip ? 'bg-white' : ''}`}
    >
      <div className="mx-auto max-w-6xl">
        {photos.length > 0 ? (
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className={flip ? 'lg:order-2' : ''}>
              {heading}
              {body && <div className="mt-6">{body}</div>}
            </div>
            <div className={flip ? 'lg:order-1' : ''}><PhotoShowcase photos={photos} /></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">{heading}</div>
            <div className="lg:col-span-8">{body}</div>
          </div>
        )}
      </div>
    </section>
  )
}

/** /lava-portal — "What is LAVA Automation?" Company sections come from the database (admin-edited). */
export default function LavaOverviewPage() {
  const { isAdmin } = useAuth()
  const { agreed } = useOutletContext()
  const { data, loading, error, reload } = useAsync(listContent)
  const sections = SECTIONS.map((s) => ({ ...s, row: data?.byKey[s.key] })).filter((s) => s.row && (s.row.status === 'published' || isAdmin))
  const drafts = sections.filter((s) => s.row.status !== 'published').length

  return (
    <div>
      <ArrangementNotice />

      {isAdmin && drafts > 0 && (
        <Alert type="info" className="mt-6" title={`${drafts} company section${drafts === 1 ? ' is a draft' : 's are drafts'} (only admins can see ${drafts === 1 ? 'it' : 'them'})`}>
          Replace the placeholders with verified company information and publish in <Link to="/admin/lava/content" className="font-semibold underline">Admin → LAVA Applicants → Company content</Link>.
        </Alert>
      )}

      {error ? (
        <Alert type="error" className="mt-6">{toUserMessage(error, 'Couldn’t load company information.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
      ) : loading ? (
        <div className="mt-10 space-y-10">{[0, 1].map((i) => <div key={i} className="grid gap-8 lg:grid-cols-2"><div className="space-y-3"><Skeleton className="h-6 w-40" /><Skeleton className="h-10 w-3/4" /><Skeleton className="h-32" /></div><Skeleton className="h-72 rounded-3xl" /></div>)}</div>
      ) : sections.length === 0 ? (
        <section className="py-16 text-center">
          <h2 className="text-2xl font-semibold text-navy-900">Company information is being prepared</h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-500">Details about LAVA Automation’s history, mission and services will appear here soon. In the meantime, you can explore career opportunities and start preparing.</p>
        </section>
      ) : (
        <div className="mt-4">
          {sections.map(({ key, eyebrow, row }, i) => <CompanySection key={key} index={i} eyebrow={eyebrow} row={row} isAdmin={isAdmin} />)}
        </div>
      )}

      {/* Call to action band */}
      <section className="relative mt-4 overflow-hidden rounded-3xl bg-navy-900 px-6 py-12 sm:px-10 sm:py-14" aria-label="Next steps">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-lava-500" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-lava-500/25 blur-3xl" />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lava-400">Your next step</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {agreed ? 'Keep going in the Preparation Center' : 'Ready to start your LAVA journey?'}
            </h2>
            <p className="mt-3 text-navy-200">
              {agreed ? 'Continue your preparation courses and assessments.' : 'Explore open positions, then confirm the applicant agreement to unlock the preparation courses.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/lava-portal/careers" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white/10 px-5 text-sm font-medium text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/15">
              <Briefcase className="h-4 w-4" /> Explore career opportunities
            </Link>
            <LinkButton to={agreed ? '/lava-portal/courses' : '/lava-portal/agreement'} size="lg">
              <GraduationCap className="h-4 w-4" /> {agreed ? 'Continue preparing' : 'Start the agreement'} <ArrowRight className="h-4 w-4" />
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  )
}
