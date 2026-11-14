import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { useAuth } from '@/hooks/useAuth'

/**
 * Query-string links (e.g. /library?type=VIDEO) are active when those params
 * match, even with extra ones like ?type=VIDEO&sort=az.
 */
export function isItemActive(item, location) {
  if (!item.to) return false
  const [path, query] = item.to.split('?')
  const params = new URLSearchParams(location.search)
  if (query) return location.pathname === path && [...new URLSearchParams(query)].every(([k, v]) => params.get(k) === v)
  if (item.end) return location.pathname === path
  if (location.pathname === path) return !params.get('type')
  return location.pathname.startsWith(`${path}/`)
}

/** Sidebar entry that performs an action instead of navigating (currently: log out). */
function ActionItem({ item, onNavigate }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const Icon = item.icon
  async function run() {
    setBusy(true)
    try {
      await signOut()
      onNavigate?.()
      navigate('/login', { replace: true })
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      onClick={run}
      disabled={busy}
      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-navy-200 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-60"
    >
      <Icon className="h-[18px] w-[18px] text-navy-300 group-hover:text-navy-100" />
      {busy ? 'Logging out…' : item.label}
    </button>
  )
}

function SidebarContent({ sections, subtitle, footer, onNavigate }) {
  const location = useLocation()
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5">
        <Logo inverted subtitle={subtitle} />
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Main">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-navy-300">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                if (item.action === 'logout') return <li key={item.label}><ActionItem item={item} onNavigate={onNavigate} /></li>
                const active = isItemActive(item, location)
                const Icon = item.icon
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active ? 'bg-white/10 text-white' : 'text-navy-200 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className={`h-[18px] w-[18px] ${active ? 'text-mint-400' : 'text-navy-300 group-hover:text-navy-100'}`} />
                      {item.label}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      {footer && <div className="p-3">{footer}</div>}
    </div>
  )
}

export default function Sidebar({ mobileOpen, onClose, ...contentProps }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-navy-900 lg:block">
        <SidebarContent {...contentProps} />
      </aside>

      {/* Mobile / tablet drawer */}
      <div className={`fixed inset-0 z-40 lg:hidden ${mobileOpen ? '' : 'pointer-events-none invisible'}`}>
        <div
          className={`absolute inset-0 bg-navy-950/50 backdrop-blur-sm transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-72 max-w-[85%] bg-navy-900 shadow-xl transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            onClick={onClose}
            className="absolute right-3 top-4 z-10 rounded-lg p-2 text-navy-200 hover:bg-white/10 hover:text-white"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
          <SidebarContent {...contentProps} onNavigate={onClose} />
        </aside>
      </div>
    </>
  )
}
