import { useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import ProgressBar from '@/components/ui/ProgressBar'
import Button, { LinkButton } from '@/components/ui/Button'
import SimulatorScreen from '@/components/lava/SimulatorScreen'
import { LockedPanel } from '@/components/lava/LavaUi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { getAssessment, submitAttempt } from '@/services/lavaService'
import { toUserMessage } from '@/lib/errors'

function Options({ q, value, onChange, result }) {
  return (
    <div className="mt-3 space-y-2" role="radiogroup" aria-label={q.prompt}>
      {q.options.map((opt, i) => {
        const chosen = value === i
        const tone = result && chosen ? (result.correct ? 'bg-mint-50 ring-mint-300' : 'bg-red-50 ring-red-200') : chosen ? 'bg-navy-50 ring-navy-300' : 'ring-slate-200 hover:bg-slate-50'
        return (
          <label key={i} className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-sm ring-1 ring-inset transition ${tone} ${result ? 'cursor-default' : ''}`}>
            <input type="radio" name={q.id} checked={chosen} disabled={Boolean(result)} onChange={() => onChange(i)} className="mt-0.5 h-4 w-4 accent-navy-900" />
            <span className="text-slate-800">{opt}</span>
          </label>
        )
      })}
      {result && (
        <div className={`flex gap-2 rounded-lg p-3 text-sm ${result.correct ? 'bg-mint-50 text-mint-800' : 'bg-red-50 text-red-800'}`}>
          {result.correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span><strong>{result.correct ? 'Correct.' : result.chosen === null ? 'Not answered.' : 'Not quite.'}</strong> {result.explanation}</span>
        </div>
      )}
    </div>
  )
}

/**
 * /lava-portal/assessments/:id and /lava-portal/simulator/:id.
 * Questions arrive without answers; grading happens in the database.
 * Quizzes show every question; simulator activities go task by task with a work screen.
 */
export default function LavaAssessmentRunPage({ simulator = false }) {
  const { id } = useParams()
  const { agreed, status } = useOutletContext()
  const { isAdmin } = useAuth()
  const allowed = isAdmin || (agreed && (!simulator || status?.request?.status === 'approved'))
  const { data, loading, error, reload } = useAsync(() => (allowed ? getAssessment(id) : Promise.resolve(null)), [id, allowed])
  const [answers, setAnswers] = useState({})
  const [step, setStep] = useState(0)
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const back = simulator ? '/lava-portal/simulator' : '/lava-portal/assessments'
  if (!agreed && !isAdmin) return <LockedPanel />
  if (simulator && !allowed) return <LockedPanel title="Simulator access required" description="The simulator opens once an administrator approves your access request." to="/lava-portal/simulator" action="Request simulator access" />
  if (error) return <Alert type="error">{toUserMessage(error, 'Couldn’t open this assessment.')} <button onClick={reload} className="font-semibold underline">Try again</button></Alert>
  if (loading) return <Skeleton className="h-96" />

  const { assessment, questions } = data
  const isSim = assessment.kind === 'simulator'
  const answered = questions.filter((q) => answers[q.id] !== undefined).length
  const resultFor = (qid) => result?.results.find((r) => r.question_id === qid)

  async function submit() {
    setSubmitting(true)
    setSubmitError('')
    try {
      setResult(await submitAttempt(assessment.id, answers))
      window.scrollTo?.(0, 0)
    } catch (err) {
      setSubmitError(toUserMessage(err))
    } finally {
      setSubmitting(false)
    }
  }
  function restart() { setAnswers({}); setResult(null); setStep(0); window.scrollTo?.(0, 0) }

  const header = (
    <Card className="p-5 sm:p-6">
      <Link to={back} className="inline-flex min-h-6 items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900"><ArrowLeft className="h-4 w-4" /> {simulator ? 'Simulator' : 'Assessments'}</Link>
      <h2 className="mt-2 text-xl font-semibold text-navy-900">{assessment.title}</h2>
      {assessment.description && <p className="mt-1 text-sm text-slate-500">{assessment.description}</p>}
      <p className="mt-2 text-xs text-slate-400">{questions.length} {isSim ? 'tasks' : 'questions'} · {assessment.pass_percent}% to pass</p>
    </Card>
  )

  const summary = result && (
    <Card className={`p-5 sm:p-6 ring-2 ${result.passed ? 'ring-mint-300' : 'ring-amber-200'}`} data-testid="assessment-result">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Your score</p>
          <p className="text-3xl font-semibold text-navy-900">{result.percent}% <span className="text-base font-normal text-slate-500">({result.score} of {result.total})</span></p>
          <p className={`mt-1 text-sm font-medium ${result.passed ? 'text-mint-700' : 'text-amber-700'}`}>{result.passed ? 'Passed. Well done!' : `Not passed yet. ${result.pass_percent}% is needed. Review the explanations and try again.`}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={restart}><RotateCcw className="h-4 w-4" /> Try again</Button>
          <LinkButton to={back}>Done</LinkButton>
        </div>
      </div>
    </Card>
  )

  if (!questions.length) return <div className="space-y-5">{header}<Alert type="info">Questions for this assessment haven’t been added yet.</Alert></div>

  // ------- simulator: one task at a time
  if (isSim && !result) {
    const q = questions[step]
    return (
      <div className="space-y-5">
        {header}
        <div className="flex items-center gap-3">
          <ProgressBar value={Math.round(((step + 1) / questions.length) * 100)} className="flex-1" />
          <span className="text-sm text-slate-500">Task {step + 1} of {questions.length}</span>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SimulatorScreen context={q.context} />
          <Card className="p-5">
            {q.scenario && <p className="mb-2 text-sm text-slate-600">{q.scenario}</p>}
            <p className="font-medium text-navy-900">{q.prompt}</p>
            <Options q={q} value={answers[q.id]} onChange={(i) => setAnswers((a) => ({ ...a, [q.id]: i }))} />
            {submitError && <Alert type="error" className="mt-3">{submitError}</Alert>}
            <div className="mt-5 flex justify-between gap-2">
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={step === 0}><ArrowLeft className="h-4 w-4" /> Back</Button>
              {step < questions.length - 1
                ? <Button onClick={() => setStep((s) => s + 1)} disabled={answers[q.id] === undefined}>Next task <ArrowRight className="h-4 w-4" /></Button>
                : <Button onClick={submit} loading={submitting} disabled={answered < questions.length}>Submit simulation</Button>}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // ------- quiz (and simulator review after submitting)
  return (
    <div className="space-y-5">
      {header}
      {summary}
      <ol className="space-y-4">
        {questions.map((q, i) => (
          <li key={q.id}>
            <Card className="p-5">
              {q.context && <div className="mb-4"><SimulatorScreen context={q.context} /></div>}
              {q.scenario && <p className="mb-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><span className="font-semibold text-navy-900">Scenario: </span>{q.scenario}</p>}
              <p className="font-medium text-navy-900"><span className="mr-1 text-slate-400">{i + 1}.</span>{q.prompt}</p>
              <Options q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} result={resultFor(q.id)} />
            </Card>
          </li>
        ))}
      </ol>
      {!result && (
        <Card className="sticky bottom-20 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
          <p className="text-sm text-slate-600">{answered} of {questions.length} answered</p>
          {submitError && <Alert type="error">{submitError}</Alert>}
          <Button onClick={submit} loading={submitting} disabled={answered < questions.length}>Submit answers</Button>
        </Card>
      )}
    </div>
  )
}
