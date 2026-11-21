import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { isItemActive } from './Sidebar'

const linkBase = 'relative flex h-16 items-center gap-1.5 whitespace-nowrap px-3 text-sm font-medium transition-colors'
const Marker = () => <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-lava-500" aria-hidden="true" />

function Dropdown({ item }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const closeTimer = useRef(null)
  const active = item.items.some((i) => isItemActive(i, location))

  useEffect(() => setOpen(false), [location.pathname, location.search])
  useEffect(() => {
    if (!open) return
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const enter = () => { clearTimeout(closeTimer.current); setOpen(true) }
  const leave = () => { closeTimer.current = setTimeout(() => setOpen(false), 120) }

  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`${linkBase} ${active || open ? 'text-white' : 'text-navy-200 hover:text-white'}`}
      >
        {item.label}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
        {active && <Marker />}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 w-80 pt-2">
          <ul className="overflow-hidden rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200" aria-label={item.label}>
            {item.items.map((sub) => {
              const Icon = sub.icon
              const on = isItemActive(sub, location)
              return (
                <li key={sub.to}>
                  <NavLink
                    to={sub.to}
                    aria-current={on ? 'page' : undefined}
                    className={`group flex items-start gap-3 rounded-xl p-3 transition ${on ? 'bg-lava-50' : 'hover:bg-slate-50'}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-lava-500 text-white' : 'bg-navy-50 text-navy-700 group-hover:bg-lava-50 group-hover:text-lava-600'}`}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-navy-900">{sub.label}</span>
                      {sub.description && <span className="block text-xs text-slate-500">{sub.description}</span>}
                    </span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Horizontal website-style menu shown in the header on wide screens. */
export default function TopNav({ items, className = '' }) {
  const location = useLocation()
  return (
    <nav aria-label="Main" className={`items-stretch ${className}`}>
      {items.map((item) => {
        if (item.items) return <Dropdown key={item.label} item={item} />
        const active = isItemActive(item, location)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            aria-current={active ? 'page' : undefined}
            className={`${linkBase} ${active ? 'text-white' : 'text-navy-200 hover:text-white'}`}
          >
            {item.label}
            {active && <Marker />}
          </NavLink>
        )
      })}
    </nav>
  )
}
