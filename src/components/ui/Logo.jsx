import { GraduationCap } from 'lucide-react'

export default function Logo({ inverted = false, compact = false, subtitle = 'Learning Portal' }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lava-500 text-white shadow-sm shadow-lava-500/30">
        <GraduationCap className="h-5 w-5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className={`text-sm font-semibold ${inverted ? 'text-white' : 'text-navy-900'}`}>VA Training Academy</p>
          <p className={`text-xs ${inverted ? 'text-navy-200' : 'text-slate-500'}`}>{subtitle}</p>
        </div>
      )}
    </div>
  )
}
