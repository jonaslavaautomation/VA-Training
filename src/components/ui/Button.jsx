import { Link } from 'react-router-dom'
import Spinner from './Spinner'

const variants = {
  // Themed areas (e.g. the LAVA portal) can recolor primary buttons with --btn-primary / --btn-primary-hover.
  primary: 'bg-[var(--btn-primary,var(--color-navy-900))] text-white hover:bg-[var(--btn-primary-hover,var(--color-navy-800))] disabled:opacity-60',
  accent: 'bg-mint-400 text-navy-900 hover:bg-mint-300 disabled:bg-mint-400/60',
  secondary: 'bg-white text-navy-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-navy-900',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60',
}
const sizes = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
}

function classes({ variant = 'primary', size = 'md', fullWidth, className = '' }) {
  return `inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`
}

export default function Button({ variant, size, loading = false, fullWidth, className, children, disabled, type = 'button', ...props }) {
  return (
    <button type={type} disabled={disabled || loading} className={classes({ variant, size, fullWidth, className })} {...props}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}

/** Router link styled as a button (avoids nesting <button> inside <a>). */
export function LinkButton({ variant, size, fullWidth, className, children, ...props }) {
  return (
    <Link className={classes({ variant, size, fullWidth, className })} {...props}>
      {children}
    </Link>
  )
}
