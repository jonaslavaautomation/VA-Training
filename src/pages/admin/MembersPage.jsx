import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, Mail, Pencil, Search, UserCheck, UserPlus, Users, UserX } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Avatar from '@/components/ui/Avatar'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import MemberFormModal from '@/components/admin/MemberFormModal'
import { lastSignIn, MemberStatusBadge, RoleBadge } from '@/components/admin/MemberBadges'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { listMembersPage, MEMBER_PAGE_SIZE, sendAccessEmail, setMemberStatus } from '@/services/memberService'
import { formatDate, fullName } from '@/lib/format'
import { toUserMessage } from '@/lib/errors'

const statusTabs = [
  { value: '', label: 'All', key: 'all' },
  { value: 'active', label: 'Active', key: 'active' },
  { value: 'inactive', label: 'Inactive', key: 'inactive' },
]

const selectClass = 'h-10 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-navy-300 focus:outline-none focus:ring-4 focus:ring-navy-100'

function IconAction({ label, icon: Icon, onClick, disabled, tone = 'default', to }) {
  const color = tone === 'danger' ? 'hover:bg-red-50 hover:text-red-600' : tone === 'success' ? 'hover:bg-mint-50 hover:text-mint-700' : 'hover:bg-slate-100 hover:text-navy-900'
  const cls = `rounded-lg p-2 text-slate-500 transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${color}`
  if (to) return <Link to={to} title={label} aria-label={label} className={cls}><Icon className="h-4 w-4" /></Link>
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label} className={cls}>
      <Icon className="h-4 w-4" />
    </button>
  )
}

export default function MembersPage() {
  const { user, isPreview } = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState('')
  const [role, setRole] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(0)
  const [state, setState] = useState({ items: [], total: 0, counts: null, loading: true, error: null })
  const [reloadKey, setReloadKey] = useState(0)

  const [form, setForm] = useState(null) // { member: null | profile }
  const [confirm, setConfirm] = useState(null) // { member, status }
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])
  useEffect(() => setPage(0), [debounced, status, role, sort])

  useEffect(() => {
    let active = true
    setState((s) => ({ ...s, loading: true, error: null }))
    listMembersPage({ q: debounced, status, role, sort, page })
      .then((res) => active && setState({ ...res, loading: false, error: null }))
      .catch((error) => active && setState((s) => ({ ...s, loading: false, error })))
    return () => { active = false }
  }, [debounced, status, role, sort, page, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  // /admin/members?new=1 (dashboard quick action) opens the Add member dialog.
  useEffect(() => {
    if (params.get('new') !== '1') return
    setForm({ member: null })
    const next = new URLSearchParams(params)
    next.delete('new')
    setParams(next, { replace: true })
  }, [params, setParams])

  function handleSaved(member, { created, invited, statusChanged } = {}) {
    setForm(null)
    reload()
    if (created) toast.success(invited ? `Account created. An invitation was sent to ${member.email}.` : `Inactive account created for ${member.email}. No email was sent.`)
    else toast.success(statusChanged ? `Member updated and ${member.status === 'active' ? 'reactivated' : 'deactivated'}.` : 'Member details updated.')
  }

  async function handleStatusChange() {
    const { member, status: next } = confirm
    setBusy(`status:${member.id}`)
    try {
      await setMemberStatus(member.id, next)
      toast.success(next === 'inactive' ? `${fullName(member) || member.email} has been deactivated.` : `${fullName(member) || member.email} has been reactivated.`)
      setConfirm(null)
      reload()
    } catch (err) {
      toast.error(toUserMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function handleSendEmail(member) {
    setBusy(`email:${member.id}`)
    try {
      const sent = await sendAccessEmail(member.id)
      toast.success(sent === 'invite' ? `Invitation re-sent to ${member.email}.` : `Password reset email sent to ${member.email}.`)
    } catch (err) {
      toast.error(toUserMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const actionsFor = (m) => {
    const isSelf = m.id === user?.id
    return (
      <div className="flex items-center justify-end gap-0.5">
        <IconAction label={`View ${fullName(m) || m.email}`} icon={Eye} to={`/admin/members/${m.id}`} />
        <IconAction label={`Edit ${fullName(m) || m.email}`} icon={Pencil} onClick={() => setForm({ member: m })} />
        <IconAction
          label={m.status === 'active' ? 'Send invitation / password reset email' : 'Reactivate to send emails'}
          icon={Mail}
          onClick={() => handleSendEmail(m)}
          disabled={m.status !== 'active' || busy === `email:${m.id}`}
        />
        {m.status === 'active' ? (
          <IconAction label={isSelf ? 'You can’t deactivate yourself' : `Deactivate ${fullName(m) || m.email}`} icon={UserX} tone="danger" disabled={isSelf} onClick={() => setConfirm({ member: m, status: 'inactive' })} />
        ) : (
          <IconAction label={`Reactivate ${fullName(m) || m.email}`} icon={UserCheck} tone="success" onClick={() => setConfirm({ member: m, status: 'active' })} />
        )}
      </div>
    )
  }

  const nameCell = (m) => (
    <Link to={`/admin/members/${m.id}`} className="flex min-w-0 items-center gap-3">
      <Avatar name={fullName(m) || m.email} src={m.avatar_url} size="sm" />
      <span className="min-w-0">
        <span className="block truncate font-medium text-navy-900 hover:text-navy-700">
          {fullName(m) || <span className="text-slate-400">No name</span>}
          {m.id === user?.id && <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>}
        </span>
        <span className="block truncate text-xs text-slate-500">{m.email}</span>
      </span>
    </Link>
  )

  const filtered = Boolean(debounced || status || role)

  return (
    <>
      <PageHeader
        title="Members"
        description="Create accounts, manage access and review each member’s learning."
        actions={<Button onClick={() => setForm({ member: null })} disabled={isPreview}><UserPlus className="h-4 w-4" /> Add member</Button>}
      />

      {state.error && !state.items.length ? (
        <Alert type={isPreview ? 'info' : 'error'}>
          {toUserMessage(state.error, 'Couldn’t load members.')}{' '}
          {!isPreview && <button onClick={reload} className="font-semibold underline-offset-2 hover:underline">Try again</button>}
        </Alert>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative xl:w-80">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                aria-label="Search members by name or email"
                maxLength={100}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-300 focus:outline-none focus:ring-4 focus:ring-navy-100"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Filter by status">
                {statusTabs.map(({ value, label, key }) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={status === value}
                    onClick={() => setStatus(value)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${status === value ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'}`}
                  >
                    {label}
                    <span className="text-xs text-slate-400">{state.counts ? state.counts[key] : '–'}</span>
                  </button>
                ))}
              </div>
              <select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
                <option value="">All roles</option>
                <option value="member">Members</option>
                <option value="admin">Admins</option>
              </select>
              <select aria-label="Sort members" value={sort} onChange={(e) => setSort(e.target.value)} className={selectClass}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>

          {state.error && <Alert type="error" className="m-4">{toUserMessage(state.error, 'Couldn’t refresh the list.')}</Alert>}

          {state.loading && !state.items.length ? (
            <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !state.items.length ? (
            <div className="p-4">
              {filtered ? (
                <EmptyState icon={Search} title="No matching members" description="Try a different name, email, status or role." />
              ) : (
                <EmptyState icon={Users} title="No members yet" description="Add your first member to send them an invitation.">
                  <Button onClick={() => setForm({ member: null })}><UserPlus className="h-4 w-4" /> Add member</Button>
                </EmptyState>
              )}
            </div>
          ) : (
            <div className={state.loading ? 'opacity-60 transition-opacity' : ''} aria-busy={state.loading}>
              <table className="hidden w-full text-left text-sm lg:table">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Member</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Role</th>
                    <th className="px-3 py-2.5 font-medium">Created</th>
                    <th className="px-3 py-2.5 font-medium">Last sign-in</th>
                    <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.items.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60">
                      <td className="max-w-xs px-5 py-3">{nameCell(m)}</td>
                      <td className="px-3 py-3"><MemberStatusBadge status={m.status} /></td>
                      <td className="px-3 py-3"><RoleBadge role={m.role} /></td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(m.created_at)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{lastSignIn(m)}</td>
                      <td className="px-5 py-2">{actionsFor(m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-slate-100 lg:hidden">
                {state.items.map((m) => (
                  <li key={m.id} className="px-4 py-3">
                    {nameCell(m)}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <MemberStatusBadge status={m.status} /> <RoleBadge role={m.role} /> · Joined {formatDate(m.created_at)} · {lastSignIn(m)}
                      </div>
                      {actionsFor(m)}
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination page={page} pageSize={MEMBER_PAGE_SIZE} total={state.total} onPageChange={setPage} label="accounts" />
            </div>
          )}
        </Card>
      )}

      {form && (
        <MemberFormModal open member={form.member} isSelf={form.member?.id === user?.id} onClose={() => setForm(null)} onSaved={handleSaved} />
      )}

      <Modal
        open={Boolean(confirm)}
        onClose={busy ? undefined : () => setConfirm(null)}
        size="sm"
        title={confirm?.status === 'inactive' ? 'Deactivate account?' : 'Reactivate account?'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)} disabled={Boolean(busy)}>Cancel</Button>
            <Button variant={confirm?.status === 'inactive' ? 'danger' : 'primary'} loading={Boolean(busy)} onClick={handleStatusChange}>
              {confirm?.status === 'inactive' ? 'Deactivate' : 'Reactivate'}
            </Button>
          </>
        }
      >
        {confirm && (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-navy-900">{fullName(confirm.member) || confirm.member.email}</span>{' '}
            {confirm.status === 'inactive'
              ? 'will be signed out and won’t be able to sign in or open any training material. Their learning progress and favorites are kept.'
              : 'will be able to sign in again and continue where they left off.'}
          </p>
        )}
      </Modal>
    </>
  )
}
