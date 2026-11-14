import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

/** Persistent notice that the app is running without authentication. */
export default function PreviewBanner() {
  const { isPreview, isAdmin, startPreview, signOut } = useAuth()
  if (!isPreview) return null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-amber-50 px-4 py-2 text-xs text-amber-900 ring-1 ring-amber-200 sm:px-6">
      <span className="flex items-center gap-1.5 font-medium">
        <Eye className="h-3.5 w-3.5" /> Preview mode — sample data, no authentication. Add Supabase keys to .env.local to enable real sign-in.
      </span>
      <span className="flex gap-3 sm:ml-auto">
        <Link
          to={isAdmin ? '/dashboard' : '/admin'}
          onClick={() => startPreview(isAdmin ? 'member' : 'admin')}
          className="font-semibold underline-offset-2 hover:underline"
        >
          Switch to {isAdmin ? 'member' : 'admin'} view
        </Link>
        <button onClick={signOut} className="font-semibold underline-offset-2 hover:underline">Exit preview</button>
      </span>
    </div>
  )
}
