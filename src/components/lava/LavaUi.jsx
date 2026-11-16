import { Building2, CalendarClock, CheckCircle2, Home, Lock } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { ARRANGEMENT_TEXT } from '@/services/lavaService'

/** The 45-day onsite → work-from-home disclosure. Shown on every LAVA opportunity page. */
export function ArrangementNotice({ compact = false }) {
  return (
    <section aria-label="LAVA working arrangement" data-testid="arrangement-notice" className="rounded-2xl bg-lava-50 p-5 ring-1 ring-inset ring-lava-200">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lava-500 text-white">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-lava-600">Important: working arrangement</p>
          <p className="mt-1 text-sm font-medium leading-6 text-navy-900">{ARRANGEMENT_TEXT}</p>
          {!compact && (
            <>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm text-navy-900 ring-1 ring-lava-200">
                  <Building2 className="h-4 w-4 shrink-0 text-lava-600" /> <span><strong>Days 1–45:</strong> onsite training</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm text-navy-900 ring-1 ring-lava-200">
                  <Home className="h-4 w-4 shrink-0 text-lava-600" /> <span><strong>After day 45:</strong> work from home</span>
                </div>
              </div>
              <p className="mt-3 text-xs font-medium text-lava-700">These roles are not fully remote from the first day. You’ll be asked to confirm this before starting the preparation courses.</p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

/** Shown in place of agreement-protected content. */
export function LockedPanel({ title = 'Complete the applicant agreement first', description = 'The LAVA Preparation Center unlocks after you confirm the working arrangement and preparation requirements.', to = '/lava-portal/agreement', action = 'Go to the agreement' }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200/70">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Lock className="h-6 w-6" /></div>
      <h2 className="mt-4 text-base font-semibold text-navy-900">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {to && <LinkButton to={to} className="mt-5">{action}</LinkButton>}
    </div>
  )
}

const requestTones = { pending: ['amber', 'Pending review'], approved: ['mint', 'Approved'], rejected: ['red', 'Not approved'] }
export function RequestBadge({ status }) {
  if (!status) return <Badge tone="gray">Not requested</Badge>
  const [tone, label] = requestTones[status]
  return <Badge tone={tone}>{label}</Badge>
}

export function HiringBadge({ status }) {
  if (status === 'open') return <Badge tone="red">Now hiring</Badge>
  if (status === 'closed') return <Badge tone="gray">Not currently hiring</Badge>
  if (status === 'archived') return <Badge tone="gray">Archived</Badge>
  return <Badge tone="amber">Draft</Badge>
}

/** Best result for a quiz or simulator activity. */
export function QuizStatus({ quiz, label = 'Quiz' }) {
  if (!quiz) return null
  if (quiz.result?.passed) return <Badge tone="mint" icon={CheckCircle2}>{label} passed · {quiz.result.best}%</Badge>
  if (quiz.result) return <Badge tone="amber">{label} best {quiz.result.best}% · {quiz.pass_percent}% to pass</Badge>
  return <Badge tone="gray">{label === 'Quiz' ? 'Quiz not taken' : 'Not started'}</Badge>
}
