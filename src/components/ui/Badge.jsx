const tones = {
  navy: 'bg-navy-50 text-navy-700 ring-navy-100',
  mint: 'bg-mint-50 text-mint-700 ring-mint-200',
  gray: 'bg-slate-100 text-slate-600 ring-slate-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
}

export default function Badge({ tone = 'gray', icon: Icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tones[tone]} ${className}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  )
}
