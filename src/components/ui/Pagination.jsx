import { ChevronLeft, ChevronRight } from 'lucide-react'

/** "Showing 21–40 of 132" with previous / next buttons. `page` is 0-based. */
export default function Pagination({ page, pageSize, total, onPageChange, label = 'results' }) {
  if (!total) return null
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  const btn = 'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <nav className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row" aria-label="Pagination">
      <p data-testid="pagination-summary">Showing {from}–{to} of {total} {label}</p>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button className={btn} onClick={() => onPageChange(page - 1)} disabled={page === 0} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="tabular-nums">Page {page + 1} of {pages}</span>
          <button className={btn} onClick={() => onPageChange(page + 1)} disabled={page >= pages - 1} aria-label="Next page">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </nav>
  )
}
