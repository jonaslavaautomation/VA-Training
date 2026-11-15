import { ShieldOff } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export default function AccountInactivePage() {
  const { signOut, user } = useAuth()
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldOff className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-navy-900">Account not active</h1>
        <p className="mt-2 text-sm text-slate-500">
          The account <span className="font-medium text-slate-700">{user?.email}</span> is not active yet or has been deactivated.
          New accounts may need approval from your training administrator — please contact them if you need access.
        </p>
        <Button variant="secondary" className="mt-6" onClick={signOut}>Sign out</Button>
      </div>
    </div>
  )
}
