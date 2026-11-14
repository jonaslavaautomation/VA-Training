import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, CheckCircle2, Clock, Heart, Mail, Pencil, UserCheck, UserX } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Alert from '@/components/ui/Alert'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import StatCard from '@/components/ui/StatCard'
import ProgressBar from '@/components/ui/ProgressBar'
import Modal from '@/components/ui/Modal'
import ResourceTypeBadge from '@/components/resources/ResourceTypeBadge'
import MemberFormModal from '@/components/admin/MemberFormModal'
import { lastSignIn, MemberStatusBadge, RoleBadge } from '@/components/admin/MemberBadges'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { getMemberDetails, sendAccessEmail, setMemberStatus } from '@/services/memberService'
import { ACTIVITY_LABELS } from '@/config/activity'
import { formatDate, fullName, timeAgo } from '@/lib/format'
import { toUserMessage } from '@/lib/errors'

function ResourceRows({ items, empty, showProgress }) {
  if (!items.length) return <p className="px-5 pb-5 text-sm text-slate-500">{empty}</p>
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((p) => (
        <li key={p.resource.id} className="flex items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            <Link to={`/library/${p.resource.id}`} className="block truncate py-0.5 text-sm font-medium leading-5 text-navy-900 hover:text-navy-700">{p.resource.title}</Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <ResourceTypeBadge type={p.resource.resource_type} />
              {p.resource.category?.name && <span>{p.resource.category.name}</span>}
              {p.resource.status === 'draft' && <span className="text-amber-700">Unpublished</span>}
            </div>
          </div>
          {showProgress ? (
            <div className="flex w-32 items-center gap-2">
              <ProgressBar value={p.progress_percent} />
              <span className="w-9 text-right text-xs text-slate-500">{p.progress_percent}%</span>
            </div>
          ) : (
            <span className="shrink-0 text-xs text-slate-500">{p.completed_at ? formatDate(p.completed_at) : p.created_at ? `Saved ${formatDate(p.created_at)}` : ''}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function MemberDetailsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(() => getMemberDetails(id), [id])
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(null)

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    )
  }
  if (error) {
    return <Alert type="error">{toUserMessage(error, 'Couldn’t load this member.')} <button onClick={reload} className="font-semibold underline-offset-2 hover:underline">Try again</button></Alert>
  }
  if (!data) {
    return <EmptyState title="Member not found" description="The account may have been removed."><Link to="/admin/members" className="text-sm font-medium text-navy-700">Back to members</Link></EmptyState>
  }

  const { profile: m, started, completed, favorites, activity } = data
  const isSelf = m.id === user?.id
  const name = fullName(m) || m.email

  async function changeStatus() {
    setBusy('status')
    try {
      const updated = await setMemberStatus(m.id, confirm)
      setData((d) => ({ ...d, profile: { ...d.profile, ...updated } }))
      toast.success(confirm === 'inactive' ? `${name} has been deactivated. Their progress is kept.` : `${name} has been reactivated.`)
      setConfirm(null)
    } catch (err) {
      toast.error(toUserMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function email() {
    setBusy('email')
    try {
      const sent = await sendAccessEmail(m.id)
      toast.success(sent === 'invite' ? `Invitation re-sent to ${m.email}.` : `Password reset email sent to ${m.email}.`)
    } catch (err) {
      toast.error(toUserMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/admin/members" className="inline-flex min-h-6 items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> Back to members
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={name} src={m.avatar_url} />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-navy-900">{name}{isSelf && <span className="ml-2 text-sm font-normal text-slate-400">(you)</span>}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2"><MemberStatusBadge status={m.status} /><RoleBadge role={m.role} /></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>
            <Button variant="secondary" size="sm" onClick={email} loading={busy === 'email'} disabled={m.status !== 'active'}><Mail className="h-4 w-4" /> Send access email</Button>
            {!isSelf && (m.status === 'active' ? (
              <Button variant="danger" size="sm" onClick={() => setConfirm('inactive')}><UserX className="h-4 w-4" /> Deactivate</Button>
            ) : (
              <Button size="sm" onClick={() => setConfirm('active')}><UserCheck className="h-4 w-4" /> Reactivate</Button>
            ))}
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Email', m.email],
            ['Contact number', m.phone || '—'],
            ['Registered', formatDate(m.created_at)],
            ['Last sign-in', m.last_sign_in_at ? `${formatDate(m.last_sign_in_at)} (${lastSignIn(m)})` : lastSignIn(m)],
            ['Profile updated', formatDate(m.updated_at)],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="mt-0.5 truncate font-medium text-navy-900" title={v}>{v}</dd>
            </div>
          ))}
        </dl>
        {m.status === 'inactive' && (
          <Alert type="info" className="mt-4">This account is deactivated: the member can’t sign in or open training materials. Their progress and favorites below are kept and return when reactivated.</Alert>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="In progress" value={started.length} icon={Clock} tint="sky" />
        <StatCard label="Completed" value={completed.length} icon={CheckCircle2} tint="mint" />
        <StatCard label="Favorites" value={favorites.length} icon={Heart} tint="navy" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <h2 className="px-5 pb-3 pt-5 text-base font-semibold text-navy-900">Started training</h2>
          <ResourceRows items={started} empty="Hasn’t started anything yet." showProgress />
        </Card>
        <Card className="overflow-hidden">
          <h2 className="px-5 pb-3 pt-5 text-base font-semibold text-navy-900">Completed training</h2>
          <ResourceRows items={completed} empty="No completed resources yet." />
        </Card>
        <Card className="overflow-hidden">
          <h2 className="px-5 pb-3 pt-5 text-base font-semibold text-navy-900">Favorites</h2>
          <ResourceRows items={favorites} empty="No saved resources." />
        </Card>
        <Card className="overflow-hidden">
          <h2 className="px-5 pb-3 pt-5 text-base font-semibold text-navy-900">Recent learning activity</h2>
          {activity.length ? (
            <ul className="divide-y divide-slate-100">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <span className="min-w-0 truncate text-slate-600">
                    <BookOpen className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />
                    {ACTIVITY_LABELS[a.activity_type] ?? a.activity_type}
                    {a.resource?.title && <span className="font-medium text-navy-900"> {a.resource.title}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-sm text-slate-500">No activity recorded yet.</p>
          )}
        </Card>
      </div>

      {editing && (
        <MemberFormModal
          open
          member={m}
          isSelf={isSelf}
          onClose={() => setEditing(false)}
          onSaved={(saved, { statusChanged } = {}) => {
            setEditing(false)
            setData((d) => ({ ...d, profile: { ...d.profile, ...saved } }))
            toast.success(statusChanged ? `Member updated and ${saved.status === 'active' ? 'reactivated' : 'deactivated'}.` : 'Member details updated.')
          }}
        />
      )}

      <Modal
        open={Boolean(confirm)}
        onClose={busy ? undefined : () => setConfirm(null)}
        size="sm"
        title={confirm === 'inactive' ? 'Deactivate account?' : 'Reactivate account?'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)} disabled={Boolean(busy)}>Cancel</Button>
            <Button variant={confirm === 'inactive' ? 'danger' : 'primary'} loading={busy === 'status'} onClick={changeStatus}>
              {confirm === 'inactive' ? 'Deactivate' : 'Reactivate'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {confirm === 'inactive'
            ? `${name} will be signed out and lose access to all training materials. Their learning progress and favorites are kept.`
            : `${name} will be able to sign in again and continue their previous progress.`}
        </p>
      </Modal>
    </div>
  )
}
