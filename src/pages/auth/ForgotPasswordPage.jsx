import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { useAuth } from '@/hooks/useAuth'
import { validateEmail } from '@/lib/validators'

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [serverError, setServerError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validateEmail(email)
    setError(v || '')
    if (v) return
    setSubmitting(true)
    setServerError('')
    try {
      await sendPasswordReset(email)
      setSent(true)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Link to="/login" className="mb-6 inline-flex min-h-6 items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Reset your password</h1>
      <p className="mt-1.5 text-sm text-slate-500">Enter your account email and we’ll send you a reset link.</p>

      {sent ? (
        // Same message whether or not the account exists (prevents email enumeration).
        <Alert type="success" title="Check your inbox" className="mt-6">
          If an account exists for {email.trim()}, a password reset link is on its way.
        </Alert>
      ) : (
        <>
          {serverError && <Alert type="error" className="mt-6">{serverError}</Alert>}
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <Input
              label="Email address"
              type="email"
              icon={Mail}
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              error={error}
              autoFocus
            />
            <Button type="submit" size="lg" fullWidth loading={submitting}>Send reset link</Button>
          </form>
        </>
      )}
    </>
  )
}
