import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Search, X } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import SearchBar from '@/components/ui/SearchBar'
import UserMenu from './UserMenu'
import TopNav from './TopNav'

/**
 * Website-style header: logo, main menu across the top (wide screens),
 * search and account on the right. Phones/tablets get the menu button,
 * which opens the navigation drawer.
 */
export default function SiteHeader({ topNav, homeTo, subtitle, switchLink, onMenuClick, searchPath, searchPlaceholder }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searching, setSearching] = useState(false)
  const currentQ = new URLSearchParams(location.search).get('q') ?? ''

  useEffect(() => setSearching(false), [location.pathname])

  return (
    <header className="sticky top-0 z-30 border-t-[3px] border-lava-500 bg-navy-900 shadow-lg shadow-navy-950/10">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        <button onClick={onMenuClick} className="-ml-1 rounded-lg p-2 text-navy-100 hover:bg-white/10 hover:text-white xl:hidden" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </button>
        <Link to={homeTo} className="mr-2 shrink-0 rounded-lg" aria-label="Home">
          <span className="hidden sm:block"><Logo inverted subtitle={subtitle} /></span>
          <span className="sm:hidden"><Logo inverted compact /></span>
        </Link>

        <TopNav items={topNav} className="hidden flex-1 xl:flex" />

        <div className="ml-auto flex items-center gap-1">
          {searchPath && (
            <button
              type="button"
              onClick={() => setSearching((s) => !s)}
              aria-expanded={searching}
              aria-label={searching ? 'Close search' : 'Search'}
              className="rounded-lg p-2 text-navy-100 hover:bg-white/10 hover:text-white"
            >
              {searching ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
          )}
          {switchLink && (
            <Link to={switchLink.to} className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-navy-100 ring-1 ring-inset ring-white/15 hover:bg-white/10 hover:text-white xl:inline-flex">
              <switchLink.icon className="h-4 w-4 text-lava-400" /> {switchLink.label}
            </Link>
          )}
          <UserMenu dark />
        </div>
      </div>

      {searching && searchPath && (
        <div className="border-t border-white/10 bg-navy-900">
          <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
            <SearchBar
              key={currentQ}
              defaultValue={currentQ}
              placeholder={searchPlaceholder}
              autoFocus
              onSearch={(q) => { setSearching(false); navigate(q ? `${searchPath}?q=${encodeURIComponent(q)}` : searchPath) }}
            />
          </div>
        </div>
      )}
    </header>
  )
}
