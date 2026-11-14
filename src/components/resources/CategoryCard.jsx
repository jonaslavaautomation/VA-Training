import { Link } from 'react-router-dom'
import { getCategoryStyle } from './categoryStyles'

export default function CategoryCard({ category }) {
  const { Icon, soft } = getCategoryStyle(category)
  return (
    <Link
      to={`/library?category=${category.slug}`}
      className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${soft}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-navy-900">{category.name}</p>
        <p className="text-xs text-slate-500">{category.resource_count} resources</p>
      </div>
    </Link>
  )
}
