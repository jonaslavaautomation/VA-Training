import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import FullPageLoader from '@/components/ui/FullPageLoader'

/**
 * Hides admin screens from non-admins. This is a UX guard only —
 * the database (RLS) and the admin-members Edge Function independently
 * reject admin actions from members.
 */
export default function AdminRoute() {
  const { isAdmin, loading } = useAuth()
  const toast = useToast()
  const denied = !loading && !isAdmin

  useEffect(() => {
    if (denied) toast.error('That page is only available to administrators.')
  }, [denied, toast])

  if (loading) return <FullPageLoader />
  if (denied) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
