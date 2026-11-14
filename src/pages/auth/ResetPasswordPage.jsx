import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import PasswordInput from '@/components/ui/PasswordInput'
import Button, { LinkButton } from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import FullPageLoader from '@/components/ui/FullPageLoader'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { validatePassword } from '@/lib/validators'
import { toUserMessage } from '@/lib/errors'

/**
 * Landing page for invitation and password-reset emails.
 * The link signs the user in (see completeAuthRedirect); here they choose a password.
 */
export default function ResetPasswordPage() {
  const { user, loading, isRecovery, authLink, completePasswordSetup } = useAuth()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (loading) return <FullPageLoader />
  // Checked before the recovery guard below, which would otherwise send the user to /profile.
  if (done) return <Navigate to="/" replace />

  if (authLink?.error || !user) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Link expired</h1>
        <Alert type="error" className="mt-6">
          {authLink?.error || 'This link is invalid or has expired. Please request a new one.'}
        </Alert>
        <LinkButton to="/forgot-password" size="lg" fullWidth className="mt-6">Request new link</LinkButton>
        <p className="mt-4 text-center text-xs text-slate-500">
          Invitation expired? Ask your training administrator to send a new one.
        </p>
      </>
    )
  }

  // Signed-in users who didn't arrive from an email link change their password
  // on the profile page, which asks for the current password first.
  if (!isRecovery) return <Navigate to="/profile" replace />

  const isInvite = authLink?.type === 'invite'

  async function handleSubmit(e) {
    e.preventDefault()
    const next = {
      password: validatePassword(password),
      confirm: password !== confirm ? 'Passwords do not match.' : undefined,
    }
    setErrors(next)
    if (next.password || next.confirm) return
    setSubmitting(true)
    setServerError('')
    try {
      await completePasswordSetup(password)
      toast.success(isInvite ? 'Welcome! Your password has been set.' : 'Your password has been updated.')
      setDone(true)
    } catch (err) {
      setServerError(toUserMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900">
        {isInvite ? 'Set your password' : 'Choose a new password'}
      </h1>
      <p className="mt-1.5 text-sm text-slate-500">
        {isInvite ? <>Welcome to VA Training Academy. Create a password for {user.email}.</> : <>For {user.email}</>}
      </p>
      {serverError && <Alert type="error" className="mt-6">{serverError}</Alert>}
      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="At least 8 characters, including a letter and a number."
          autoFocus
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {isInvite ? 'Set password & continue' : 'Update password'}
        </Button>
      </form>
    </>
  )
}
