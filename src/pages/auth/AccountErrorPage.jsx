import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { isNetworkError, NETWORK_MESSAGE } from '@/lib/errors'

/** Signed in, but the profile couldn't be loaded (offline, or no profile row exists). */
export default function AccountErrorPage() {
  const { user, profileError, refreshProfile, signOut } = useAuth()
  const [retrying, setRetrying] = useState(false)
  const offline = isNetworkError(profileError)

  async function retry() {
    setRetrying(true)
    try { await refreshProfile() } finally { setRetrying(false) }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-navy-900">{offline ? 'Connection problem' : 'Account not available'}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {offline
            ? NETWORK_MESSAGE
            : <>We couldn’t load the account for <span className="font-medium text-slate-700">{user?.email}</span>. Please try again, or contact your training administrator.</>}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={signOut}>Sign out</Button>
          <Button onClick={retry} loading={retrying}>Try again</Button>
        </div>
      </div>
    </div>
  )
}
