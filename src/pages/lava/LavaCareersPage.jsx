import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Briefcase, ChevronDown, MapPin, Wallet } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { LinkButton } from '@/components/ui/Button'
import { ArrangementNotice, HiringBadge } from '@/components/lava/LavaUi'
import RichText from '@/components/lava/RichText'
import { useAsync } from '@/hooks/useAsync'
import { listPositions } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

function List({ title, items }) {
  if (!items?.length) return null
  return (
    <div>
      <h4 className="text-sm font-semibold text-navy-900">{title}</h4>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-slate-600 marker:text-lava-500">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  )
}

function PositionCard({ p }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="overflow-hidden" data-testid="position-card">
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-navy-900">{p.title}</h3>
            {p.niche && <p className="mt-0.5 text-sm text-slate-500">{p.niche}</p>}
          </div>
          <HiringBadge status={p.status} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span><span className="block text-xs text-slate-500">Compensation</span><span className="font-medium text-navy-900" data-testid="compensation">{p.compensation || 'To be announced'}</span></span>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-lava-50 px-3 py-2 text-sm ring-1 ring-inset ring-lava-200">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-lava-600" />
            <span><span className="block text-xs text-lava-700">Working arrangement</span><span className="font-medium text-navy-900">{p.work_arrangement}</span></span>
          </div>
        </div>
        {p.description && <RichText text={p.description} className="mt-4 text-sm leading-6" />}
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-3 text-sm font-medium text-navy-700 hover:bg-slate-50"
      >
        {open ? 'Hide details' : 'Responsibilities, skills and qualifications'}
        <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-5 border-t border-slate-100 bg-slate-50/50 p-5 md:grid-cols-3">
          <List title="Responsibilities" items={p.responsibilities} />
          <List title="Required skills" items={p.required_skills} />
          <List title="Qualifications" items={p.qualifications} />
          {!p.responsibilities?.length && !p.required_skills?.length && !p.qualifications?.length && <p className="text-sm text-slate-500">More details will be added soon.</p>}
        </div>
      )}
    </Card>
  )
}

/** /lava-portal/careers — positions maintained by administrators (nothing is invented here). */
export default function LavaCareersPage() {
  const { agreed } = useOutletContext()
  const { data, loading, error, reload } = useAsync(listPositions)
  const open = data?.filter((p) => p.status === 'open') ?? []
  const closed = data?.filter((p) => p.status === 'closed') ?? []

  return (
    <div className="space-y-6">
      <ArrangementNotice />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">Career opportunities</h2>
          <p className="text-sm text-slate-500">Positions, compensation and hiring status are provided by LAVA Automation’s administrators.</p>
        </div>
        {!loading && data?.length > 0 && <Badge tone={open.length ? 'red' : 'gray'}>{open.length} open position{open.length === 1 ? '' : 's'}</Badge>}
      </div>

      {error ? (
        <Alert type="error">{toUserMessage(error, 'Couldn’t load positions.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
      ) : loading ? (
        <div className="space-y-4">{[0, 1].map((i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : !data.length ? (
        <EmptyState icon={Briefcase} title="No positions have been announced yet" description="Open roles will be listed here once LAVA Automation announces them. You can start preparing now so you’re ready.">
          <LinkButton to={agreed ? '/lava-portal/courses' : '/lava-portal/agreement'}>{agreed ? 'Go to the Preparation Center' : 'Start preparing'}</LinkButton>
        </EmptyState>
      ) : (
        <>
          {open.length > 0 && <div className="space-y-4">{open.map((p) => <PositionCard key={p.id} p={p} />)}</div>}
          {closed.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Not currently hiring</h3>
              {closed.map((p) => <PositionCard key={p.id} p={p} />)}
            </section>
          )}
          <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">Interested? The next step is the applicant agreement, followed by the LAVA preparation courses.</p>
            <LinkButton to={agreed ? '/lava-portal/courses' : '/lava-portal/agreement'}>{agreed ? 'Continue preparing' : 'Continue to the agreement'}</LinkButton>
          </Card>
        </>
      )}
    </div>
  )
}
