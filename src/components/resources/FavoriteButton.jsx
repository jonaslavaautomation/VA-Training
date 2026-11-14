import { Heart } from 'lucide-react'

export default function FavoriteButton({ active, onToggle, className = '' }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle?.()
      }}
      aria-pressed={active}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 ${active ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'} ${className}`}
    >
      <Heart className={`h-4 w-4 ${active ? 'fill-current' : ''}`} />
    </button>
  )
}
