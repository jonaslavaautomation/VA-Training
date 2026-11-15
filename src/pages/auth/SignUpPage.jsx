import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck, Mail, User } from 'lucide-react'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import Button, { LinkButton } from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { validateEmail, validateName, validatePassword } from '@/lib/validators'
import { toUserMessage } from '@/lib/errors'

/**
 * Public "Create account". New accounts are always members (enforced by the
 * database). Depending on Supabase's "Confirm email" setting the person is
 * signed in right away, or asked to confirm their email first.
 */
export default function SignUpPage() {
  const { signUp } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState('')

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const next = {
      firstName: validateName(form.firstName, 'First name'),
      lastName: validateName(form.lastName, 'Last name'),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirm: form.password !== form.confirm ? 'Passwords do not match.' : undefined,
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    setSubmitting(true)
    setServerError('')
    try {
      const { needsConfirmation } = await signUp(form)
      if (needsConfirmation) {
        setCheckEmail(form.email.trim().toLowerCase())
      } else {
        // Signed in — the sign-in route sends them to their dashboard.
        toast.success(`Welcome to VA Training Academy, ${form.firstName.trim()}!`)
      }
    } catch (err) {
      setServerError(toUserMessage(err, 'Your account couldn’t be created. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (checkEmail) {
    return (
      <>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-mint-50 text-mint-600">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Check your email</h1>
        <p className="mt-2 text-sm text-slate-500">
          We sent a confirmation link to <span className="font-medium text-slate-700">{checkEmail}</span>. Click it to activate your account, then sign in.
        </p>
        <p className="mt-3 text-xs text-slate-500">No email after a few minutes? Check your spam folder. If you already have an account, just sign in or use “Forgot password?”.</p>
        <LinkButton to="/login" size="lg" fullWidth className="mt-6">Go to sign in</LinkButton>
      </>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Create your account</h1>
      <p className="mt-1.5 text-sm text-slate-500">Join VA Training Academy to access the training library.</p>

      {serverError && <Alert type="error" className="mt-6">{serverError}</Alert>}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="First name" icon={User} autoComplete="given-name" maxLength={80} value={form.firstName} onChange={update('firstName')} error={errors.firstName} autoFocus />
          <Input label="Last name" autoComplete="family-name" maxLength={80} value={form.lastName} onChange={update('lastName')} error={errors.lastName} />
        </div>
        <Input label="Email address" type="email" icon={Mail} autoComplete="email" placeholder="you@example.com" maxLength={254} value={form.email} onChange={update('email')} error={errors.email} />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          hint="At least 8 characters, including a letter and a number."
        />
        <PasswordInput label="Confirm password" autoComplete="new-password" value={form.confirm} onChange={update('confirm')} error={errors.confirm} />
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="inline-flex min-h-6 items-center font-medium text-navy-700 hover:text-navy-900">Sign in</Link>
      </p>
    </>
  )
}
