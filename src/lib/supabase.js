import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// The legacy "anon" key and the newer "publishable" key are both public, browser-safe keys.
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** Refuses to boot with a key that bypasses Row Level Security. */
function isSecretKey(key) {
  if (key.startsWith('sb_secret_')) return true
  try {
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.role === 'service_role'
  } catch {
    return false
  }
}

if (supabaseAnonKey && isSecretKey(supabaseAnonKey)) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY contains a service-role/secret key. Never expose it in the browser — use the anon (publishable) key.',
  )
}

/** True when both public Supabase env vars are present. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * PREVIEW MODE — no Supabase env vars, so the UI runs on clearly labelled
 * sample data with no authentication. Only available in local development
 * (`npm run dev`) or when VITE_ENABLE_PREVIEW=true is set explicitly, so a
 * production deploy that is missing its env vars can never look like an
 * open portal — it shows a configuration error instead (isMisconfigured).
 */
export const isPreviewMode = !isSupabaseConfigured && (import.meta.env.DEV || import.meta.env.VITE_ENABLE_PREVIEW === 'true')
export const isMisconfigured = !isSupabaseConfigured && !isPreviewMode

/* ------------------------------------------------------------------ */
/* "Remember me" storage                                               */
/* Remembered → session in localStorage (survives browser restarts).   */
/* Not remembered → sessionStorage (cleared when the browser closes).  */
/* ------------------------------------------------------------------ */
const REMEMBER_KEY = 'vata-remember-me'

export function setRememberMe(remember) {
  try { localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0') } catch { /* storage blocked */ }
}

export function getRememberMe() {
  try { return localStorage.getItem(REMEMBER_KEY) !== '0' } catch { return true }
}

const authStorage = {
  getItem(key) {
    try { return localStorage.getItem(key) ?? sessionStorage.getItem(key) } catch { return null }
  },
  setItem(key, value) {
    try {
      // PKCE verifiers must survive opening the reset-password email in a new tab.
      const persistent = getRememberMe() || key.endsWith('-code-verifier')
      ;(persistent ? localStorage : sessionStorage).setItem(key, value)
      ;(persistent ? sessionStorage : localStorage).removeItem(key)
    } catch { /* storage blocked */ }
  },
  removeItem(key) {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key) } catch { /* storage blocked */ }
  },
}

/* ------------------------------------------------------------------ */
/* Invite / password-reset link parameters                             */
/* Captured before the client is created so nothing strips them first. */
/* Supported link styles:                                              */
/*  - ?token_hash=…&type=invite|recovery  (recommended email templates) */
/*  - #access_token=…&refresh_token=…&type=…  (default admin invites)   */
/*  - ?code=…  (PKCE reset requested from this browser — auto-handled)  */
/* ------------------------------------------------------------------ */
function readAuthRedirect() {
  if (typeof window === 'undefined') return null
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const get = (k) => query.get(k) ?? hash.get(k)
  const redirect = {
    type: get('type'),
    tokenHash: query.get('token_hash'),
    accessToken: hash.get('access_token'),
    refreshToken: hash.get('refresh_token'),
    code: query.get('code'),
    error: get('error_description') || get('error_code') || get('error'),
  }
  return redirect.tokenHash || redirect.accessToken || redirect.code || redirect.error ? redirect : null
}

export const authRedirect = isSupabaseConfigured ? readAuthRedirect() : null

/**
 * Single shared Supabase client for the browser.
 * Uses ONLY the public anon key — authorization is enforced by
 * Postgres Row Level Security and the admin-members Edge Function.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // exchanges ?code= from password-recovery links
        flowType: 'pkce',
      },
    })
  : null
