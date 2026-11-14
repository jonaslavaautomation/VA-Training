import { useState } from 'react'
import { Search } from 'lucide-react'

/** Controlled-on-submit search box. Calls onSearch(term) on Enter. */
export default function SearchBar({ defaultValue = '', onSearch, placeholder = 'Search training resources…', size = 'md', className = '' }) {
  const [value, setValue] = useState(defaultValue)
  const height = size === 'lg' ? 'h-12 text-base' : 'h-10 text-sm'
  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault()
        onSearch?.(value.trim())
      }}
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={100}
        className={`w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-navy-300 focus:outline-none focus:ring-4 focus:ring-navy-100 ${height}`}
      />
    </form>
  )
}
