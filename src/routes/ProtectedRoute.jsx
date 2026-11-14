import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import FullPageLoader from '@/components/ui/FullPageLoader'
import AccountInactivePage from '@/pages/auth/AccountInactivePage'
import AccountErrorPage from '@/pages/auth/AccountErrorPage'

/**
 * Requires a signed-in user with a loaded, active profile. Redirects to /login otherwise.
 * UX guard only — RLS independently denies data to signed-out and inactive users.
 */
export default function ProtectedRoute() {
  const { user, profile, loading, isActive } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader label="Checking your session…" />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (!profile) return <AccountErrorPage />
  if (!isActive) return <AccountInactivePage />
  return <Outlet />
}
