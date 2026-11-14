import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as authService from '@/services/authService'
import { logActivity } from '@/services/activityService'
import { isPreviewMode, isSupabaseConfigured } from '@/lib/supabase'
import { fullName } from '@/lib/format'

export const AuthContext = createContext(null)
export { isPreviewMode }

/*
 * PREVIEW MODE
 * When Supabase env vars are missing, the app runs in a clearly labelled
 * preview so the UI can be reviewed with sample data. Preview mode is NOT
 * authentication: it protects nothing and is switched off automatically as
 * soon as Supabase is configured.
 */
const PREVIEW_KEY = 'vata-preview-role'

function readPreviewRole() {
  if (!isPreviewMode) return null
  try { return sessionStorage.getItem(PREVIEW_KEY) } catch { return null }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [initializing, setInitializing] = useState(isSupabaseConfigured)
  const [isRecovery, setIsRecovery] = useState(false)
  const [authLink, setAuthLink] = useState(null) // { type: 'invite' | 'recovery', error } from an email link
  const [sessionExpired, setSessionExpired] = useState(false)
  const [previewRole, setPreviewRole] = useState(readPreviewRole)
  const signingOut = useRef(false)

  // 1) Complete email links, restore + validate the stored session, subscribe to auth changes.
  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true

    // Keep this callback synchronous — profile is loaded in the effect below.
    const unsubscribe = authService.onAuthStateChange((event, s) => {
      // The stored session is set below, only after it has been validated with the server.
      if (event === 'INITIAL_SESSION') return
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
      if (event === 'SIGNED_OUT') {
        setIsRecovery(false)
        // Not triggered by our Sign out button → refresh token expired/revoked or account banned.
        if (!signingOut.current) setSessionExpired(true)
      }
      if (event === 'SIGNED_IN') setSessionExpired(false)
      setSession(s)
    })

    ;(async () => {
      const link = await authService.completeAuthRedirect()
      let s = null
      try {
        s = await authService.validateSession(await authService.getSession())
      } catch {
        s = null
      }
      if (!active) return
      if (link) {
        setAuthLink(link)
        if (!link.error) setIsRecovery(true)
      }
      setSession(s)
      setInitializing(false)
    })()

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  // 2) Load the profile whenever the signed-in user changes.
  const userId = session?.user?.id
  const loadProfile = useCallback(async (id, { silent = false } = {}) => {
    if (!silent) {
      setProfile(null)
      setProfileError(null)
    }
    try {
      const p = await authService.fetchProfile(id)
      setProfile(p)
      setProfileError(p ? null : new Error('missing_profile'))
    } catch (err) {
      console.error('Failed to load profile', err)
      // A silent refresh that fails (e.g. offline) keeps the profile we already have.
      if (!silent) setProfileError(err)
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfileError(null)
      return
    }
    loadProfile(userId)
  }, [userId, loadProfile])

  // 3) Re-check role/status when the tab regains focus, so a deactivation
  //    (or role change) takes effect without a page reload.
  useEffect(() => {
    if (!userId) return
    const onVisible = () => document.visibilityState === 'visible' && loadProfile(userId, { silent: true })
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId, loadProfile])

  const refreshProfile = useCallback(() => (userId ? loadProfile(userId) : Promise.resolve()), [userId, loadProfile])

  const signIn = useCallback(async (email, password, remember) => {
    if (isPreviewMode) {
      throw new Error('Sign-in needs a connected Supabase project. Add your keys to .env.local, or use the preview buttons below to explore the interface.')
    }
    setSessionExpired(false)
    const data = await authService.signInWithPassword(email, password, remember)
    logActivity('signed_in')
    return data
  }, [])

  const signOut = useCallback(async () => {
    if (isPreviewMode) {
      try { sessionStorage.removeItem(PREVIEW_KEY) } catch { /* ignore */ }
      setPreviewRole(null)
      return
    }
    signingOut.current = true
    try {
      await authService.signOut()
    } finally {
      signingOut.current = false
      setSessionExpired(false)
      setProfile(null)
      setAuthLink(null)
    }
  }, [])

  /** Sets the password after an invite / reset link and leaves recovery mode. */
  const completePasswordSetup = useCallback(async (password) => {
    await authService.updatePassword(password)
    setIsRecovery(false)
    setAuthLink(null)
  }, [])

  const changePassword = useCallback(
    (currentPassword, newPassword) => authService.changePassword(session?.user?.email, currentPassword, newPassword),
    [session],
  )

  const updateOwnProfile = useCallback(
    async (values) => {
      const p = await authService.updateOwnProfile(userId, values)
      setProfile(p)
      return p
    },
    [userId],
  )

  const startPreview = useCallback((role) => {
    if (!isPreviewMode) return
    try { sessionStorage.setItem(PREVIEW_KEY, role) } catch { /* ignore */ }
    setPreviewRole(role)
  }, [])

  const value = useMemo(() => {
    let user = session?.user ?? null
    let activeProfile = profile

    if (isPreviewMode && previewRole) {
      user = { id: 'preview-user', email: `${previewRole}.preview@example.com` }
      activeProfile = {
        id: 'preview-user',
        first_name: 'Preview',
        last_name: previewRole === 'admin' ? 'Admin' : 'Member',
        email: user.email,
        role: previewRole,
        status: 'active',
        created_at: new Date().toISOString(),
      }
    }

    // `role` only controls what the UI shows. Real enforcement happens in
    // Postgres RLS policies and the admin-members Edge Function.
    const role = activeProfile?.role ?? 'member'
    return {
      session,
      user,
      profile: activeProfile,
      profileError,
      role,
      isAdmin: role === 'admin',
      isActive: activeProfile?.status === 'active',
      displayName: fullName(activeProfile) || user?.email?.split('@')[0] || 'Member',
      homePath: role === 'admin' ? '/admin' : '/dashboard',
      // Signed in but profile not loaded yet (and no error) counts as loading.
      loading: initializing || Boolean(user && !activeProfile && !profileError),
      isRecovery,
      authLink,
      sessionExpired,
      isPreview: isPreviewMode,
      signIn,
      signOut,
      startPreview,
      refreshProfile,
      updateOwnProfile,
      changePassword,
      completePasswordSetup,
      sendPasswordReset: authService.sendPasswordReset,
    }
  }, [session, profile, profileError, previewRole, initializing, isRecovery, authLink, sessionExpired, signIn, signOut, startPreview, refreshProfile, updateOwnProfile, changePassword, completePasswordSetup])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
