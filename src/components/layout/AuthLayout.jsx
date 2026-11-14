import { Outlet } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import Logo from '@/components/ui/Logo'

const highlights = [
  'Step-by-step video lessons',
  'Downloadable PDF guides & templates',
  'Track your progress as you learn',
]

export default function AuthLayout() {
  return (
    <div className="grid grid-cols-1 min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-navy-900 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-mint-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-navy-500/30 blur-3xl" />
        <Logo inverted />
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Build the skills that make great virtual assistants.
          </h2>
          <p className="mt-4 text-navy-200">
            Your private learning space for training videos, guides and resources — available to approved members only.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-3 text-sm text-navy-100">
                <CheckCircle2 className="h-5 w-5 text-mint-400" /> {h}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-navy-300">© {new Date().getFullYear()} VA Training Academy. Private &amp; confidential.</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
