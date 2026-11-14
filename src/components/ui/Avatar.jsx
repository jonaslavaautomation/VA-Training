export default function Avatar({ name = '', src, size = 'md' }) {
  const dims = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm'
  const initials = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
  if (src) return <img src={src} alt="" className={`${dims} rounded-full object-cover`} />
  return (
    <div className={`${dims} flex items-center justify-center rounded-full bg-navy-100 font-semibold text-navy-800`}>
      {initials || '?'}
    </div>
  )
}
