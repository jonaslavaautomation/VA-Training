import { LinkButton } from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold text-lava-500">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-navy-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">The page you’re looking for doesn’t exist or has moved.</p>
      <LinkButton to="/" className="mt-6">Back to dashboard</LinkButton>
    </div>
  )
}
