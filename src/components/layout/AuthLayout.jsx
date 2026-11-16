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
      <div className="relative hidden overflow-hidden border-t-4 border-lava-500 bg-navy-900 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-lava-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-lava-500/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="relative"><Logo inverted /></div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Build the skills that make <span className="text-lava-400">great virtual assistants</span>.
          </h2>
          <p className="mt-4 text-navy-200">
            Your private learning space for training videos, guides and resources — for VA Training Academy members.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-3 text-sm text-navy-100">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lava-500/15"><CheckCircle2 className="h-4 w-4 text-lava-400" /></span> {h}
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
