import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, Briefcase, Building2, Compass, Globe2, History, Layers, Target } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import RichText from '@/components/lava/RichText'
import { ArrangementNotice } from '@/components/lava/LavaUi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { listContent } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

const SECTIONS = [
  { key: 'overview', icon: Building2 },
  { key: 'history', icon: History },
  { key: 'mission_vision', icon: Target },
  { key: 'services', icon: Layers },
  { key: 'niches', icon: Compass },
  { key: 'clients', icon: Globe2 },
]

/** /lava-portal — "What is LAVA Automation?" Company sections come from the database (admin-edited). */
export default function LavaOverviewPage() {
  const { isAdmin } = useAuth()
  const { agreed } = useOutletContext()
  const { data, loading, error, reload } = useAsync(listContent)
  const sections = SECTIONS.map((s) => ({ ...s, row: data?.byKey[s.key] })).filter((s) => s.row && (s.row.status === 'published' || isAdmin))
  const drafts = sections.filter((s) => s.row.status !== 'published').length

  return (
    <div className="space-y-6">
      <ArrangementNotice />

      {isAdmin && drafts > 0 && (
        <Alert type="info" title={`${drafts} company section${drafts === 1 ? ' is a draft' : 's are drafts'} (only admins can see ${drafts === 1 ? 'it' : 'them'})`}>
          Replace the placeholders with verified company information and publish in <Link to="/admin/lava/content" className="font-semibold underline">Admin → LAVA Applicants → Company content</Link>.
        </Alert>
      )}

      {error ? (
        <Alert type="error">{toUserMessage(error, 'Couldn’t load company information.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : sections.length === 0 ? (
        <Card className="p-6 text-center">
          <h2 className="text-base font-semibold text-navy-900">Company information is being prepared</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Details about LAVA Automation’s history, mission and services will appear here soon. In the meantime, you can explore career opportunities and start preparing.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sections.map(({ key, icon: Icon, row }) => (
            <Card key={key} className={`p-5 sm:p-6 ${key === 'overview' ? 'lg:col-span-2' : ''}`} data-testid={`lava-section-${key}`}>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><Icon className="h-5 w-5" /></div>
                <h2 className="min-w-0 text-lg font-semibold text-navy-900">{row.title}</h2>
                {row.status !== 'published' && <Badge tone="amber">Draft · admins only</Badge>}
              </div>
              <RichText text={row.body} />
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Link to="/lava-portal/careers" className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint-50 text-mint-700"><Briefcase className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-navy-900">Explore career opportunities</p>
            <p className="text-sm text-slate-500">Positions, requirements and compensation.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-navy-700" />
        </Link>
        <div className="flex flex-col justify-center gap-3 rounded-2xl bg-navy-50 p-5 ring-1 ring-navy-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-navy-900">{agreed ? 'You’re in the Preparation Center' : 'Ready to prepare?'}</p>
            <p className="text-sm text-slate-600">{agreed ? 'Continue your LAVA preparation courses.' : 'Confirm the applicant agreement to unlock the courses.'}</p>
          </div>
          <LinkButton to={agreed ? '/lava-portal/courses' : '/lava-portal/agreement'}>{agreed ? 'Continue preparing' : 'Start the agreement'}</LinkButton>
        </div>
      </div>
    </div>
  )
}
