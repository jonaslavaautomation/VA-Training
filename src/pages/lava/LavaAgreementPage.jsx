import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Button, { LinkButton } from '@/components/ui/Button'
import RichText from '@/components/lava/RichText'
import { ArrangementNotice } from '@/components/lava/LavaUi'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { AGREEMENT_QUESTIONS, listContent, submitAgreement } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

const DEFAULT_INTRO = 'Before you start the LAVA Preparation Center, please confirm that you understand and accept the working arrangement and the preparation requirements. This agreement is not a job offer and does not mean you have been accepted or hired.'
const formatWhen = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** /lava-portal/agreement — three required questions; all must be "yes" to unlock the courses. */
export default function LavaAgreementPage() {
  const { status, setStatus } = useOutletContext()
  const toast = useToast()
  const intro = useAsync(listContent)
  const saved = status?.agreement
  const [editing, setEditing] = useState(!saved?.agreed)
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(AGREEMENT_QUESTIONS.map((q) => [q.field, saved && !saved.agreed ? saved[q.field] : null])),
  )
  const [missing, setMissing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const allAnswered = AGREEMENT_QUESTIONS.every((q) => answers[q.field] !== null)
  const declined = saved && !saved.agreed && !editing

  async function handleSubmit(e) {
    e.preventDefault()
    if (!allAnswered) { setMissing(true); return }
    setSaving(true)
    setError('')
    try {
      const rec = await submitAgreement(answers)
      setStatus((s) => ({ ...s, agreement: rec }))
      setEditing(false)
      if (rec.agreed) toast.success('Thank you! The LAVA Preparation Center is now unlocked.')
    } catch (err) {
      setError(toUserMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (saved?.agreed && !editing) {
    return (
      <div className="space-y-6">
        <Card className="p-6 sm:p-8" data-testid="agreement-accepted">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mint-50 text-mint-600"><CheckCircle2 className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-navy-900">You’ve completed the applicant agreement</h2>
              <p className="mt-1 text-sm text-slate-500">Agreed on {formatWhen(saved.agreed_at ?? saved.answered_at)}. This confirms you understand the conditions. It is not a job offer or a hiring decision.</p>
              <ul className="mt-4 space-y-2">
                {AGREEMENT_QUESTIONS.map((q) => (
                  <li key={q.field} className="flex gap-2 text-sm text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-500" /><span>{q.question} <strong className="text-navy-900">{q.yes}</strong></span></li>
                ))}
              </ul>
              <LinkButton to="/lava-portal/courses" className="mt-5">Go to the Preparation Center</LinkButton>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ArrangementNotice compact />

      <Card className="p-5 sm:p-7">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><ShieldCheck className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-navy-900">{intro.data?.byKey.agreement_intro?.title ?? 'Applicant Agreement'}</h2>
            <RichText text={intro.data?.byKey.agreement_intro?.body ?? DEFAULT_INTRO} className="mt-1 text-sm leading-6" />
          </div>
        </div>

        {declined && (
          <Alert type="error" title="You can’t continue to the preparation courses yet" className="mb-5" >
            <span data-testid="agreement-declined">
              To continue with the LAVA application process, applicants must agree to all three conditions: the 45-day onsite training, the transition to work from home afterwards, and the required preparation courses and assessments. We understand this arrangement may not suit everyone. If your situation changes, you can update your answers at any time.
            </span>
          </Alert>
        )}

        {declined ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setEditing(true)}>Review my answers</Button>
            <LinkButton to="/dashboard" variant="secondary">Back to dashboard</LinkButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {AGREEMENT_QUESTIONS.map((q, i) => {
              const unanswered = missing && answers[q.field] === null
              return (
                <fieldset key={q.field} className={`rounded-xl p-4 ring-1 ring-inset ${unanswered ? 'bg-red-50/50 ring-red-200' : 'ring-slate-200'}`} aria-invalid={unanswered}>
                  <legend className="sr-only">Question {i + 1}</legend>
                  <p className="text-sm font-medium text-navy-900"><span className="mr-1 text-slate-400">{i + 1}.</span>{q.question}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[[true, q.yes], [false, q.no]].map(([value, label]) => (
                      <label key={label} className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm ring-1 ring-inset transition ${answers[q.field] === value ? (value ? 'bg-mint-50 ring-mint-300 text-navy-900' : 'bg-red-50 ring-red-200 text-navy-900') : 'ring-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                        <input
                          type="radio"
                          name={q.field}
                          checked={answers[q.field] === value}
                          onChange={() => { setAnswers((a) => ({ ...a, [q.field]: value })); setMissing(false) }}
                          className="h-4 w-4 accent-navy-900"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {unanswered && <p className="mt-2 text-xs text-red-600">Please answer this question.</p>}
                </fieldset>
              )
            })}
            {missing && <Alert type="error">Please answer all three questions before continuing.</Alert>}
            {error && <Alert type="error">{error}</Alert>}
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">Your answers and the time you submit them are saved to your account.</p>
              <Button type="submit" loading={saving}>Submit agreement</Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
