import { useState } from 'react'
import { Mail, Phone, User } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { createMember, setMemberStatus, updateMember } from '@/services/memberService'
import { validateEmail, validateName, validatePhone } from '@/lib/validators'
import { toUserMessage } from '@/lib/errors'

const selectClass =
  'block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-navy-400 focus:outline-none focus:ring-4 focus:ring-navy-100 disabled:bg-slate-50 disabled:text-slate-500'

/**
 * Add a new member (sends an invitation when active) or edit an existing one.
 * `member` = null → create. `isSelf` locks role/status for the signed-in admin.
 * `canChangeEmail` is false when the admin-members Edge Function isn't deployed.
 */
export default function MemberFormModal({ open, member, isSelf = false, canChangeEmail = true, onClose, onSaved }) {
  const isEdit = Boolean(member)
  const [form, setForm] = useState(() => ({
    firstName: member?.first_name ?? '',
    lastName: member?.last_name ?? '',
    email: member?.email ?? '',
    phone: member?.phone ?? '',
    role: member?.role ?? 'member',
    status: member?.status ?? 'active',
  }))
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  const deactivating = isEdit && member.status === 'active' && form.status === 'inactive'
  const reactivating = isEdit && member.status === 'inactive' && form.status === 'active'

  async function handleSubmit(e) {
    e.preventDefault()
    const next = {
      firstName: validateName(form.firstName, 'First name'),
      lastName: validateName(form.lastName, 'Last name'),
      email: isEdit && !canChangeEmail ? undefined : validateEmail(form.email),
      phone: validatePhone(form.phone),
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    setSaving(true)
    setServerError('')
    const values = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      role: form.role,
    }
    try {
      if (!isEdit) {
        const { member: created, invited } = await createMember({ ...values, status: form.status })
        onSaved(created, { created: true, invited })
      } else {
        let saved = await updateMember(member.id, { ...values, role: isSelf ? undefined : values.role }, { previousEmail: member.email })
        if (!isSelf && form.status !== member.status) saved = await setMemberStatus(member.id, form.status)
        onSaved(saved, { created: false, statusChanged: form.status !== member.status })
      }
    } catch (err) {
      const message = toUserMessage(err)
      if (err.code === 'email_exists') setErrors((er) => ({ ...er, email: message }))
      else setServerError(message)
    } finally {
      setSaving(false)
    }
  }

  const submitLabel = !isEdit
    ? saving ? 'Creating account…' : form.status === 'active' ? 'Create & send invite' : 'Create account'
    : deactivating ? 'Save & deactivate' : reactivating ? 'Save & reactivate' : 'Save changes'

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={isEdit ? 'Edit member' : 'Add new member'}
      description={
        isEdit
          ? 'Update this account’s details, role or status.'
          : form.status === 'active'
            ? 'They’ll receive an email invitation to set their password.'
            : 'The account is created inactive — no email is sent until you reactivate it.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="member-form" variant={deactivating ? 'danger' : 'primary'} loading={saving}>{submitLabel}</Button>
        </>
      }
    >
      {serverError && <Alert type="error" className="mb-4">{serverError}</Alert>}
      <form id="member-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="First name" icon={User} autoComplete="off" maxLength={80} value={form.firstName} onChange={update('firstName')} error={errors.firstName} />
          <Input label="Last name" autoComplete="off" maxLength={80} value={form.lastName} onChange={update('lastName')} error={errors.lastName} />
        </div>
        <Input
          label="Email address"
          type="email"
          icon={Mail}
          autoComplete="off"
          maxLength={254}
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          disabled={isEdit && !canChangeEmail}
          hint={isEdit ? (canChangeEmail ? 'Changing the email changes the address this member signs in with.' : 'The email this member signs in with.') : undefined}
        />
        <Input label="Contact number (optional)" type="tel" icon={Phone} autoComplete="off" maxLength={32} value={form.phone} onChange={update('phone')} error={errors.phone} placeholder="+63 917 555 0101" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="member-role" className="mb-1.5 block text-sm font-medium text-slate-700">Account role</label>
            <select id="member-role" className={selectClass} value={form.role} onChange={update('role')} disabled={isSelf}>
              <option value="member">Member</option>
              <option value="admin">Administrator</option>
            </select>
            {isSelf && <p className="mt-1.5 text-xs text-slate-500">You can’t change your own role.</p>}
          </div>
          <div>
            <label htmlFor="member-status" className="mb-1.5 block text-sm font-medium text-slate-700">Account status</label>
            <select id="member-status" className={selectClass} value={form.status} onChange={update('status')} disabled={isSelf}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {isSelf && <p className="mt-1.5 text-xs text-slate-500">You can’t deactivate yourself.</p>}
          </div>
        </div>
        {form.role === 'admin' && (!isEdit || member.role !== 'admin') && (
          <Alert type="info">Administrators can manage members, training materials, categories and announcements.</Alert>
        )}
        {deactivating && (
          <Alert type="error">This member will be signed out and lose access to all training materials. Their progress and favorites are kept.</Alert>
        )}
      </form>
    </Modal>
  )
}
