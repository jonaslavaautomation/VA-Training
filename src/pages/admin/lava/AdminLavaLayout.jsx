import { NavLink, Outlet } from 'react-router-dom'
import PageHeader from '@/components/ui/PageHeader'
import { LinkButton } from '@/components/ui/Button'

const tabs = [
  { to: '/admin/lava', label: 'Overview', end: true },
  { to: '/admin/lava/requests', label: 'Simulator requests' },
  { to: '/admin/lava/applicants', label: 'Applicants' },
  { to: '/admin/lava/content', label: 'Company content' },
  { to: '/admin/lava/positions', label: 'Positions' },
  { to: '/admin/lava/courses', label: 'Courses' },
  { to: '/admin/lava/assessments', label: 'Assessments' },
]

/** /admin/lava/* — LAVA Applicant Management. */
export default function AdminLavaLayout() {
  return (
    <>
      <PageHeader
        title="LAVA Applicant Management"
        description="Company information, hiring opportunities, preparation courses, assessments and simulator access."
        actions={<LinkButton to="/lava-portal" variant="secondary">View member portal</LinkButton>}
      />
      <nav aria-label="LAVA management" className="-mx-1 mb-6 overflow-x-auto px-1 pb-1">
        <div className="flex w-max min-w-full gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'}`}>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <Outlet />
    </>
  )
}
