import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

/** "/" → admin console for admins, member dashboard for members. */
export default function HomeRedirect() {
  const { homePath } = useAuth()
  return <Navigate to={homePath} replace />
}
