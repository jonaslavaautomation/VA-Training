import { useState } from 'react'
import { KeyRound, Phone, ShieldCheck, User } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Alert from '@/components/ui/Alert'
import Avatar from '@/components/ui/Avatar'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { validateName, validatePassword, validatePhone } from '@/lib/validators'
import { formatDate } from '@/lib/format'
import { toUserMessage } from '@/lib/errors'

function DetailsCard() {
  const { profile, user, displayName, isAdmin, isPreview, updateOwnProfile } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ firstName: profile?.first_name ?? '', lastName: profile?.last_name ?? '', phone: profile?.phone ?? '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const dirty =
    form.firstName.trim() !== (profile?.first_name ?? '') ||
    form.lastName.trim() !== (profile?.last_name ?? '') ||
    form.phone.trim() !== (profile?.phone ?? '')

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const next = { firstName: validateName(form.firstName, 'First name'), lastName: validateName(form.lastName, 'Last name'), phone: validatePhone(form.phone) }
    setErrors(next)
    if (next.firstName || next.lastName || next.phone) return
    setSaving(true)
    try {
      await updateOwnProfile(form)
      toast.success('Your profile has been updated.')
    } catch (err) {
      toast.error(toUserMessage(err, 'Couldn’t save your profile. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <Avatar name={displayName} src={profile?.avatar_url} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-navy-900">{displayName}</p>
          <p className="truncate text-sm text-slate-500">{user?.email}</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate-500">Account status</dt>
          <dd className="mt-1">{profile?.status === 'active' ? <Badge tone="mint">Active</Badge> : <Badge tone="red">Inactive</Badge>}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Role</dt>
          <dd className="mt-1">{isAdmin ? <Badge tone="navy" icon={ShieldCheck}>Administrator</Badge> : <Badge tone="gray">Member</Badge>}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Member since</dt>
          <dd className="mt-1 font-medium text-navy-900">{formatDate(profile?.created_at) || '—'}</dd>
        </div>
      </dl>

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="First name" icon={User} autoComplete="given-name" maxLength={80} value={form.firstName} onChange={update('firstName')} error={errors.firstName} disabled={isPreview} />
          <Input label="Last name" autoComplete="family-name" maxLength={80} value={form.lastName} onChange={update('lastName')} error={errors.lastName} disabled={isPreview} />
        </div>
        <Input label="Contact number (optional)" type="tel" icon={Phone} autoComplete="tel" maxLength={32} value={form.phone} onChange={update('phone')} error={errors.phone} disabled={isPreview} />
        <Input label="Email address" value={user?.email ?? ''} disabled hint="Contact your training administrator to change your email address." />
        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={!dirty || isPreview}>Save changes</Button>
        </div>
      </form>
    </Card>
  )
}

function PasswordCard() {
  const { changePassword, isPreview } = useAuth()
  const toast = useToast()
  const empty = { current: '', next: '', confirm: '' }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const next = {
      current: form.current ? undefined : 'Enter your current password.',
      next: validatePassword(form.next) || (form.next && form.next === form.current ? 'New password must be different from your current password.' : undefined),
      confirm: form.next !== form.confirm ? 'Passwords do not match.' : undefined,
    }
    setErrors(next)
    if (next.current || next.next || next.confirm) return
    setSaving(true)
    setServerError('')
    try {
      await changePassword(form.current, form.next)
      setForm(empty)
      toast.success('Your password has been changed.')
    } catch (err) {
      const message = toUserMessage(err)
      if (err.code === 'invalid_credentials') setErrors((er) => ({ ...er, current: message }))
      else setServerError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-slate-400" />
        <h2 className="text-base font-semibold text-navy-900">Change password</h2>
      </div>
      {serverError && <Alert type="error" className="mb-4">{serverError}</Alert>}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <PasswordInput label="Current password" autoComplete="current-password" value={form.current} onChange={update('current')} error={errors.current} disabled={isPreview} />
        <PasswordInput label="New password" autoComplete="new-password" value={form.next} onChange={update('next')} error={errors.next} hint="At least 8 characters, including a letter and a number." disabled={isPreview} />
        <PasswordInput label="Confirm new password" autoComplete="new-password" value={form.confirm} onChange={update('confirm')} error={errors.confirm} disabled={isPreview} />
        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={isPreview}>Update password</Button>
        </div>
      </form>
    </Card>
  )
}

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="My profile" description="Your account details and password." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DetailsCard />
        <PasswordCard />
      </div>
    </>
  )
}
