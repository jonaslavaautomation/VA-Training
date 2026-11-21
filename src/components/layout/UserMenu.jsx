import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, GraduationCap, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { useAuth } from '@/hooks/useAuth'

export default function UserMenu({ dark = false }) {
  const { user, displayName, isAdmin, isPreview, profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-lg p-1 pr-2 ${dark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar name={displayName} src={profile?.avatar_url} size="sm" />
        <span className={`hidden max-w-[10rem] truncate text-sm font-medium sm:block ${dark ? 'text-white' : 'text-slate-700'}`}>{displayName}</span>
        <ChevronDown className={`hidden h-4 w-4 sm:block ${dark ? 'text-navy-300' : 'text-slate-400'}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-navy-900">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isAdmin ? 'bg-navy-100 text-navy-800' : 'bg-lava-50 text-lava-700'
              }`}
            >
              {isAdmin && <ShieldCheck className="h-3 w-3" />}
              {isAdmin ? 'Administrator' : 'Member'}
            </span>
          </div>
          <div className="border-b border-slate-100 py-1">
            <Link role="menuitem" to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <UserRound className="h-4 w-4" /> My profile
            </Link>
          </div>
          {isAdmin && (
            <div className="border-b border-slate-100 py-1">
              <Link role="menuitem" to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <ShieldCheck className="h-4 w-4" /> Admin console
              </Link>
              <Link role="menuitem" to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <GraduationCap className="h-4 w-4" /> Member portal
              </Link>
            </div>
          )}
          <button
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? 'Signing out…' : isPreview ? 'Exit preview' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
