// =====================================================================
// admin-members — server-side member management for administrators.
//
// The service-role key is used ONLY here (it is injected by Supabase as
// SUPABASE_SERVICE_ROLE_KEY and never reaches the browser). Every request:
//   1. must carry a valid user access token (verified with Supabase Auth),
//   2. must belong to a profile with role = 'admin' AND status = 'active'.
// Every successful change is written to activity_logs by this function
// (trusted, server-side) with the calling admin as the actor.
//
// POST body: { action, ...params }
//   create            { first_name, last_name, email, phone?, role?, status? }
//   update            { user_id, first_name?, last_name?, email?, phone?, role? }
//   set_status        { user_id, status: 'active' | 'inactive' }
//   send_access_email { user_id }   → invite (never signed in) or password reset
// =====================================================================
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { corsHeaders, isOriginAllowed } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const BAN_DURATION = '876000h' // ~100 years; lifted on reactivation
const PROFILE_COLUMNS = 'id, first_name, last_name, email, phone, role, status, avatar_url, created_at, updated_at'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PHONE_RE = /^[0-9+()\-. ]*$/
// Control characters and angle brackets have no place in a name.
// deno-lint-ignore no-control-regex
const UNSAFE_NAME_RE = /[\u0000-\u001f\u007f<>]/

type Body = Record<string, unknown>
type Role = 'admin' | 'member'
type Status = 'active' | 'inactive'
type Profile = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  role: Role
  status: Status
}

/** Errors whose message is safe to show to the admin. Anything else becomes a generic 500. */
class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

/* ------------------------------------------------------------------ */
/* Input validation                                                    */
/* ------------------------------------------------------------------ */
function cleanName(value: unknown, label: string): string {
  const v = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!v) throw new HttpError(400, 'validation_failed', `${label} is required.`)
  if (v.length > 80) throw new HttpError(400, 'validation_failed', `${label} must be 80 characters or fewer.`)
  if (UNSAFE_NAME_RE.test(v)) throw new HttpError(400, 'validation_failed', `${label} contains invalid characters.`)
  return v
}

function cleanEmail(value: unknown): string {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!v || v.length > 254 || !EMAIL_RE.test(v)) throw new HttpError(400, 'validation_failed', 'Enter a valid email address.')
  return v
}

function cleanPhone(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const v = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!v) return null
  if (v.length > 32 || !PHONE_RE.test(v) || !/\d/.test(v)) throw new HttpError(400, 'validation_failed', 'Enter a valid contact number (digits, spaces, + ( ) - . only).')
  return v
}

function cleanRole(value: unknown, fallback: Role): Role {
  if (value === undefined) return fallback
  if (value !== 'admin' && value !== 'member') throw new HttpError(400, 'validation_failed', 'Invalid role.')
  return value
}

function cleanStatus(value: unknown, fallback: Status): Status {
  if (value === undefined) return fallback
  if (value !== 'active' && value !== 'inactive') throw new HttpError(400, 'validation_failed', 'Invalid status.')
  return value
}

function cleanId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) throw new HttpError(400, 'validation_failed', 'Invalid member id.')
  return value
}

/* ------------------------------------------------------------------ */
/* Auth error helpers                                                  */
/* ------------------------------------------------------------------ */
type AuthLikeError = { code?: string; status?: number; message?: string }

function isDuplicateEmail(error: AuthLikeError): boolean {
  return (
    error.code === 'email_exists' ||
    error.code === 'user_already_exists' ||
    /already (been )?registered|already exists/i.test(error.message ?? '')
  )
}

function emailSendError(error: AuthLikeError): HttpError {
  if (error.status === 429 || error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
    return new HttpError(429, 'rate_limited', 'Too many emails were sent recently. Please wait a few minutes and try again.')
  }
  console.error('admin-members: email send failed', error)
  return new HttpError(502, 'email_failed', 'The email could not be sent. Check the project email (SMTP) settings and try again.')
}

/* ------------------------------------------------------------------ */
/* Data helpers                                                        */
/* ------------------------------------------------------------------ */
async function requireAdmin(req: Request, admin: SupabaseClient): Promise<User> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new HttpError(401, 'unauthorized', 'Please sign in again.')

  // getUser() asks Supabase Auth to validate the token — signature, expiry and that the user still exists.
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'unauthorized', 'Your session has expired. Please sign in again.')

  // Role comes from the protected profiles table — never from JWT/user metadata.
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role, status')
    .eq('id', data.user.id)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile || profile.role !== 'admin' || profile.status !== 'active') {
    throw new HttpError(403, 'forbidden', 'Only administrators can manage members.')
  }
  return data.user
}

async function getProfile(admin: SupabaseClient, id: string): Promise<Profile> {
  const { data, error } = await admin.from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw new HttpError(404, 'not_found', 'Member not found.')
  return data as Profile
}

async function emailTaken(admin: SupabaseClient, email: string, exceptId?: string): Promise<boolean> {
  let query = admin.from('profiles').select('id').eq('email', email)
  if (exceptId) query = query.neq('id', exceptId)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return Boolean(data)
}

async function activeAdminCount(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('status', 'active')
  if (error) throw error
  return count ?? 0
}

const label = (p: Pick<Profile, 'first_name' | 'last_name' | 'email'>) =>
  `${[p.first_name, p.last_name].filter(Boolean).join(' ')} <${p.email}>`.trim().slice(0, 200)

/** Audit entry. Never contains passwords, tokens or keys — only ids, names and changed field names. */
async function audit(admin: SupabaseClient, actor: User, type: string, target: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'email'>, details?: Record<string, unknown>) {
  const { error } = await admin.from('activity_logs').insert({
    user_id: actor.id,
    activity_type: type,
    target_type: 'member',
    target_id: target.id,
    target_label: label(target),
    details: details ?? null,
  })
  // A failed audit write must not undo a completed change; it is logged for the operator instead.
  if (error) console.error('admin-members: audit log write failed', type, error)
}

function siteUrl(req: Request): string | undefined {
  const url = (Deno.env.get('SITE_URL') ?? req.headers.get('Origin') ?? '').replace(/\/+$/, '')
  return url || undefined
}

function redirectTo(req: Request): string | undefined {
  const base = siteUrl(req)
  return base ? `${base}/reset-password` : undefined
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */
async function createMember(admin: SupabaseClient, body: Body, req: Request, caller: User) {
  const first_name = cleanName(body.first_name, 'First name')
  const last_name = cleanName(body.last_name, 'Last name')
  const email = cleanEmail(body.email)
  const phone = cleanPhone(body.phone)
  const role = cleanRole(body.role, 'member')
  const status = cleanStatus(body.status, 'active')

  if (await emailTaken(admin, email)) {
    throw new HttpError(409, 'email_exists', 'An account with this email address already exists.')
  }

  // Active → invitation email to set a password.
  // Inactive → account is created without any email and blocked from signing in
  //            until an admin reactivates it and sends the invitation.
  let userId: string
  if (status === 'active') {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { first_name, last_name },
      redirectTo: redirectTo(req),
    })
    if (inviteError || !invited?.user) {
      if (inviteError && isDuplicateEmail(inviteError)) {
        throw new HttpError(409, 'email_exists', 'An account with this email address already exists.')
      }
      // We verified no profile existed beforehand, so any profile with this email now is a leftover of this attempt.
      const { data: leftover } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
      if (leftover) await admin.auth.admin.deleteUser(leftover.id)
      throw emailSendError(inviteError ?? {})
    }
    userId = invited.user.id
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { first_name, last_name },
      ban_duration: BAN_DURATION,
    })
    if (createError || !created?.user) {
      if (createError && isDuplicateEmail(createError)) {
        throw new HttpError(409, 'email_exists', 'An account with this email address already exists.')
      }
      console.error('admin-members: createUser failed', createError)
      throw new HttpError(500, 'create_failed', 'The account could not be created. Please try again.')
    }
    userId = created.user.id
  }

  // The on_auth_user_created trigger inserted an inactive member profile; apply the chosen values.
  const { data: member, error: activateError } = await admin
    .from('profiles')
    .update({ first_name, last_name, phone, role, status })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .maybeSingle()

  if (activateError || !member) {
    // Roll back: deleting the auth user cascades to the profile, so nothing half-created remains.
    console.error('admin-members: profile setup failed, rolling back', activateError)
    const { error: rollbackError } = await admin.auth.admin.deleteUser(userId)
    if (rollbackError) console.error('admin-members: rollback failed for', userId, rollbackError)
    throw new HttpError(500, 'create_failed', 'The account could not be created. No changes were saved — please try again.')
  }

  await audit(admin, caller, 'member_created', member as Profile, { role, status, invited: status === 'active' })
  return { member, invited: status === 'active' }
}

async function updateMember(admin: SupabaseClient, body: Body, caller: User) {
  const id = cleanId(body.user_id)
  const target = await getProfile(admin, id)

  const changes: Partial<Profile> = {}
  if (body.first_name !== undefined) changes.first_name = cleanName(body.first_name, 'First name')
  if (body.last_name !== undefined) changes.last_name = cleanName(body.last_name, 'Last name')
  if (body.phone !== undefined) changes.phone = cleanPhone(body.phone)
  const role = cleanRole(body.role, target.role)

  if (role !== target.role) {
    if (id === caller.id) throw new HttpError(400, 'cannot_change_self', 'You cannot change your own role.')
    if (target.role === 'admin' && target.status === 'active' && (await activeAdminCount(admin)) <= 1) {
      throw new HttpError(400, 'last_admin', 'This is the last active administrator and cannot be demoted.')
    }
    changes.role = role
  }

  let emailChanged = false
  if (body.email !== undefined) {
    const email = cleanEmail(body.email)
    if (email !== target.email) {
      if (await emailTaken(admin, email, id)) {
        throw new HttpError(409, 'email_exists', 'Another account already uses this email address.')
      }
      // The on_auth_user_email_changed trigger copies the new address into profiles.
      const { error } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true })
      if (error) {
        if (isDuplicateEmail(error)) throw new HttpError(409, 'email_exists', 'Another account already uses this email address.')
        throw error
      }
      emailChanged = true
    }
  }

  const changedFields = Object.keys(changes).filter((k) => changes[k as keyof Profile] !== target[k as keyof Profile])
  if (changedFields.length) {
    const { error } = await admin.from('profiles').update(changes).eq('id', id)
    if (error) throw error
  }

  const member = await getProfile(admin, id)
  const fields = [...changedFields.filter((f) => f !== 'role'), ...(emailChanged ? ['email'] : [])]
  if (fields.length) await audit(admin, caller, 'member_updated', member, { fields })
  if (changedFields.includes('role')) await audit(admin, caller, 'member_role_changed', member, { from: target.role, to: role })
  return { member }
}

async function setStatus(admin: SupabaseClient, body: Body, caller: User) {
  const id = cleanId(body.user_id)
  const status = cleanStatus(body.status, 'active')
  if (body.status === undefined) throw new HttpError(400, 'validation_failed', 'Invalid status.')
  if (id === caller.id) throw new HttpError(400, 'cannot_change_self', 'You cannot change the status of your own account.')

  const target = await getProfile(admin, id)
  if (target.status === status) return { member: target }

  // 1) Profile status — RLS immediately stops (or restores) all portal data access.
  //    Learning progress, favorites and history are kept untouched.
  const { data: member, error } = await admin
    .from('profiles')
    .update({ status })
    .eq('id', id)
    .select(PROFILE_COLUMNS)
    .single()
  if (error) throw error

  // 2) Auth ban — blocks new sign-ins and refresh-token use, so existing sessions die at
  //    their next refresh (≤ JWT expiry, 1 hour by default).
  const { error: banError } = await admin.auth.admin.updateUserById(id, {
    ban_duration: status === 'inactive' ? BAN_DURATION : 'none',
  })
  if (banError) {
    console.error('admin-members: ban update failed, reverting status', banError)
    await admin.from('profiles').update({ status: target.status }).eq('id', id)
    throw new HttpError(500, 'status_failed', 'The account status could not be changed. Please try again.')
  }

  await audit(admin, caller, status === 'active' ? 'member_activated' : 'member_deactivated', member as Profile)
  return { member }
}

async function sendAccessEmail(admin: SupabaseClient, body: Body, req: Request, caller: User) {
  const id = cleanId(body.user_id)
  const target = await getProfile(admin, id)
  if (target.status !== 'active') {
    throw new HttpError(400, 'inactive_account', 'Reactivate this account before sending it an email.')
  }

  const { data, error } = await admin.auth.admin.getUserById(id)
  if (error || !data.user?.email) throw new HttpError(404, 'not_found', 'Member not found.')
  const { user } = data

  // Never signed in → resend the invitation. Supabase refuses to re-invite confirmed users,
  // in which case we fall through to a password reset.
  if (!user.last_sign_in_at) {
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(user.email!, { redirectTo: redirectTo(req) })
    if (!inviteError) {
      await audit(admin, caller, 'member_invite_sent', target)
      return { sent: 'invite' }
    }
    if (!isDuplicateEmail(inviteError)) throw emailSendError(inviteError)
  }

  const { error: resetError } = await admin.auth.resetPasswordForEmail(user.email!, { redirectTo: redirectTo(req) })
  if (resetError) throw emailSendError(resetError)
  await audit(admin, caller, 'member_password_reset_sent', target)
  return { sent: 'recovery' }
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */
Deno.serve(async (req) => {
  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' }
  const json = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status, headers })
  const fail = (status: number, code: string, message: string) => json(status, { error: { code, message } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Method not allowed.')
  if (!isOriginAllowed(req)) return fail(403, 'origin_not_allowed', 'Origin not allowed.')
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('admin-members: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not available')
    return fail(500, 'misconfigured', 'Member management is not configured on the server.')
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const caller = await requireAdmin(req, admin)

    let body: Body
    try {
      body = await req.json()
    } catch {
      throw new HttpError(400, 'bad_json', 'Invalid request body.')
    }

    switch (body?.action) {
      case 'create':
        return json(201, await createMember(admin, body, req, caller))
      case 'update':
        return json(200, await updateMember(admin, body, caller))
      case 'set_status':
        return json(200, await setStatus(admin, body, caller))
      case 'send_access_email':
        return json(200, await sendAccessEmail(admin, body, req, caller))
      default:
        throw new HttpError(400, 'unknown_action', 'Unknown action.')
    }
  } catch (err) {
    if (err instanceof HttpError) return fail(err.status, err.code, err.message)
    // Never leak database/auth internals to the client.
    console.error('admin-members: unexpected error', err)
    return fail(500, 'internal_error', 'Something went wrong. Please try again.')
  }
})
