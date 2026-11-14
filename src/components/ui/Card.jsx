export default function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 ${className}`} {...props}>
      {children}
    </div>
  )
}
