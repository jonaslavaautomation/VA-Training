import { NavLink, useLocation } from 'react-router-dom'
import { isItemActive } from './Sidebar'

/** Bottom tab bar for phones/tablets (hidden on desktop, where the sidebar is always visible). */
export default function MobileTabBar({ items }) {
  const location = useLocation()
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = isItemActive(item, location)
          const Icon = item.icon
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? 'text-navy-900' : 'text-slate-500 hover:text-navy-900'}`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-mint-500' : ''}`} />
                {item.label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
