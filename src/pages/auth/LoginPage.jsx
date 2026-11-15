import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, GraduationCap, Mail, ShieldCheck } from 'lucide-react'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import Checkbox from '@/components/ui/Checkbox'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { useAuth } from '@/hooks/useAuth'
import { validateEmail } from '@/lib/validators'
import { getRememberMe } from '@/lib/supabase'

export default function LoginPage() {
  const { signIn, isPreview, startPreview, sessionExpired, authLink } = useAuth()
  const confirmLink = authLink && ['signup', 'email'].includes(authLink.type) ? authLink : null
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '', remember: getRememberMe() })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const next = {
      email: validateEmail(form.email),
      password: form.password ? undefined : 'Password is required.',
    }
    setErrors(next)
    if (next.email || next.password) return

    setSubmitting(true)
    setServerError('')
    try {
      await signIn(form.email, form.password, form.remember)
      // PublicOnlyRoute redirects to the right home (admin or member) once the profile loads.
      if (location.state?.from?.pathname) navigate(location.state.from.pathname, { replace: true })
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function preview(role) {
    startPreview(role)
    navigate(role === 'admin' ? '/admin' : '/dashboard', { replace: true })
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900">Welcome back</h1>
      <p className="mt-1.5 text-sm text-slate-500">Sign in to your VA Training Academy account.</p>

      {serverError ? (
        <Alert type="error" className="mt-6">{serverError}</Alert>
      ) : confirmLink?.error ? (
        // Supabase confirms the email before redirecting, so signing in usually works even if
        // the link was opened on another device or browser.
        <Alert type="info" className="mt-6">Your email is confirmed. Please sign in with your email and password.</Alert>
      ) : sessionExpired ? (
        <Alert type="info" className="mt-6">Your session has ended. Please sign in again.</Alert>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Input
          label="Email address"
          type="email"
          icon={Mail}
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          autoFocus
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
        />
        <div className="flex items-center justify-between">
          <Checkbox label="Remember me" checked={form.remember} onChange={update('remember')} />
          <Link to="/forgot-password" className="inline-flex min-h-6 items-center text-sm font-medium text-navy-700 hover:text-navy-900">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {isPreview && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
            <Eye className="h-4 w-4" /> Design preview
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Supabase isn’t connected (no keys in .env.local), so sign-in is disabled. Explore the interface
            with sample data — this is not a login and protects nothing.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => preview('admin')}>
              <ShieldCheck className="h-4 w-4" /> Admin view
            </Button>
            <Button variant="secondary" size="sm" onClick={() => preview('member')}>
              <GraduationCap className="h-4 w-4" /> Member view
            </Button>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        New to VA Training Academy?{' '}
        <Link to="/signup" className="inline-flex min-h-6 items-center font-medium text-navy-700 hover:text-navy-900">Create an account</Link>
      </p>
    </>
  )
}
