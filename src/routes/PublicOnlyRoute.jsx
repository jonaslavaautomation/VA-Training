import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import FullPageLoader from '@/components/ui/FullPageLoader'

/** For login/forgot-password: signed-in users are sent into the app. */
export default function PublicOnlyRoute() {
  const { user, loading, isRecovery, homePath } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (isRecovery) return <Navigate to="/reset-password" replace />
  if (user) return <Navigate to={location.state?.from?.pathname || homePath} replace />
  return <Outlet />
}
