import { Settings } from 'lucide-react'
import Logo from '@/components/ui/Logo'

/**
 * Shown by production builds that are missing VITE_SUPABASE_URL /
 * VITE_SUPABASE_ANON_KEY. Deliberately reveals nothing beyond "not configured".
 */
export default function ConfigErrorPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 text-center">
      <Logo />
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Settings className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-navy-900">The portal isn’t available right now</h1>
        <p className="mt-2 text-sm text-slate-500">This site hasn’t been fully configured yet. Please try again later or contact your training administrator.</p>
      </div>
    </div>
  )
}
