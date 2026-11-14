import { Menu } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import UserMenu from './UserMenu'
import Logo from '@/components/ui/Logo'
import SearchBar from '@/components/ui/SearchBar'

export default function Topbar({ onMenuClick, searchPath, searchPlaceholder }) {
  const navigate = useNavigate()
  const location = useLocation()
  const currentQ = new URLSearchParams(location.search).get('q') ?? ''

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6">
      <button onClick={onMenuClick} className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </button>
      <div className="sm:hidden">
        <Logo compact />
      </div>
      {searchPath && (
        <SearchBar
          key={currentQ}
          defaultValue={currentQ}
          placeholder={searchPlaceholder}
          className="hidden max-w-md flex-1 sm:block"
          onSearch={(q) => navigate(q ? `${searchPath}?q=${encodeURIComponent(q)}` : searchPath)}
        />
      )}
      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  )
}
