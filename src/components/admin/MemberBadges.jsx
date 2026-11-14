import { ShieldCheck } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { timeAgo } from '@/lib/format'

export const MemberStatusBadge = ({ status }) =>
  status === 'active' ? <Badge tone="mint">Active</Badge> : <Badge tone="red">Inactive</Badge>

export const RoleBadge = ({ role }) =>
  role === 'admin' ? <Badge tone="navy" icon={ShieldCheck}>Admin</Badge> : <Badge tone="gray">Member</Badge>

/** "3 days ago", "Invitation pending" (active, never signed in) or "Never". "—" when unavailable. */
export function lastSignIn(m) {
  if (m.last_sign_in_at === undefined) return '—'
  if (m.last_sign_in_at) return timeAgo(m.last_sign_in_at)
  return m.status === 'active' ? 'Invitation pending' : 'Never'
}
