import { supabase, setRememberMe, authRedirect } from '@/lib/supabase'
import { isNetworkError, NETWORK_MESSAGE, userError } from '@/lib/errors'

/**
 * Auth data-access layer. Components never call supabase.auth directly;
 * they go through these functions (via AuthContext) so logic stays in one place.
 */

export const PROFILE_COLUMNS = 'id, first_name, last_name, email, phone, role, status, avatar_url, created_at, updated_at'

export async function signInWithPassword(email, password, remember = true) {
  setRememberMe(remember)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error) throw normalizeAuthError(error)
  return data
}

/**
 * Signs out everywhere (revokes all refresh tokens). If the server can't be
 * reached, the local session is still cleared so the user is never stuck.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: 'global' })
  if (error) await supabase.auth.signOut({ scope: 'local' })
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw normalizeAuthError(error)
  return data.session
}

/**
 * getSession() only reads local storage. This asks Supabase Auth whether the
 * stored session is still valid (user not deleted, token not revoked).
 * Returns null — and clears the local session — when it is not.
 * Network failures keep the session so a flaky connection doesn't sign anyone out.
 */
export async function validateSession(session) {
  if (!session) return null
  const { error } = await supabase.auth.getUser()
  if (!error) return session
  if (isNetworkError(error) || error.status >= 500) return session
  await supabase.auth.signOut({ scope: 'local' })
  return null
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange(callback)
  return () => data.subscription.unsubscribe()
}

const OTP_TYPES = ['invite', 'recovery', 'email', 'magiclink', 'signup', 'email_change']
let redirectPromise = null

/**
 * Completes an invite / password-reset link (see authRedirect in lib/supabase).
 * Runs once per page load. Returns null when the URL holds no auth link,
 * otherwise { type, error } where error is a user-facing message.
 */
export function completeAuthRedirect() {
  if (!redirectPromise) redirectPromise = handleAuthRedirect()
  return redirectPromise
}

async function handleAuthRedirect() {
  const r = authRedirect
  if (!r) return null
  // Let the client finish its own URL handling first (PKCE ?code= exchange).
  await supabase.auth.getSession()
  try {
    if (r.error) throw new Error(r.error)
    if (r.tokenHash) {
      if (!OTP_TYPES.includes(r.type)) throw new Error('Unsupported link type')
      const { error } = await supabase.auth.verifyOtp({ token_hash: r.tokenHash, type: r.type })
      if (error) throw error
    } else if (r.accessToken && r.refreshToken) {
      const { error } = await supabase.auth.setSession({ access_token: r.accessToken, refresh_token: r.refreshToken })
      if (error) throw error
    } else if (r.code) {
      const { data } = await supabase.auth.getSession()
      if (!data.session) throw new Error('Code exchange failed')
    }
    return { type: r.type ?? 'recovery', error: null }
  } catch (err) {
    console.warn('Auth link could not be completed', err)
    return {
      type: r.type,
      error: isNetworkError(err) ? NETWORK_MESSAGE : 'This link is invalid or has expired. Please request a new one.',
    }
  } finally {
    // Strip tokens from the address bar and browser history.
    window.history.replaceState(window.history.state, '', window.location.pathname)
  }
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw normalizeAuthError(error)
}

/** Sets a new password for the signed-in user (used after an invite/reset link). */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw normalizeAuthError(error)
}

/** Changes the password of a signed-in user after re-checking their current password. */
export async function changePassword(email, currentPassword, newPassword) {
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
  if (verifyError) {
    const err = normalizeAuthError(verifyError)
    if (err.code === 'invalid_credentials') throw userError('Your current password is incorrect.', { code: err.code })
    throw err
  }
  await updatePassword(newPassword)
}

/**
 * Loads the signed-in user's profile (role + status) from the protected
 * `profiles` table. RLS only returns the caller's own row (or all rows for admins).
 */
export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

/** Members may edit only their names and contact number (enforced by RLS + the protect_profile_fields trigger). */
export async function updateOwnProfile(userId, { firstName, lastName, phone }) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ first_name: firstName.trim(), last_name: lastName.trim(), ...(phone !== undefined ? { phone: phone.trim() || null } : {}) })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single()
  if (error) throw error
  return data
}

function normalizeAuthError(error) {
  const code = error?.code
  const msg = (error?.message || '').toLowerCase()
  let friendly = 'Something went wrong. Please try again.'
  let normalizedCode = code

  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    friendly = 'Incorrect email or password.'
    normalizedCode = 'invalid_credentials'
  } else if (code === 'user_banned' || msg.includes('banned')) {
    friendly = 'This account has been deactivated. Please contact your training administrator.'
  } else if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    friendly = 'Please accept your invitation email and set a password before signing in.'
  } else if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || msg.includes('rate limit') || error?.status === 429) {
    friendly = 'Too many attempts. Please wait a minute and try again.'
  } else if (code === 'weak_password' || msg.includes('password should be')) {
    friendly = 'Please choose a stronger password (at least 8 characters, including a letter and a number).'
  } else if (code === 'same_password' || msg.includes('same password') || msg.includes('should be different')) {
    friendly = 'New password must be different from your current password.'
  } else if (code === 'session_not_found' || code === 'session_expired' || msg.includes('auth session missing')) {
    friendly = 'Your session has expired. Please sign in again.'
  } else if (isNetworkError(error)) {
    friendly = NETWORK_MESSAGE
  }
  return userError(friendly, { code: normalizedCode, cause: error })
}
