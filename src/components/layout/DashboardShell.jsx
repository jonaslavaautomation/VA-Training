import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import PreviewBanner from './PreviewBanner'
import Spinner from '@/components/ui/Spinner'

/** Shared frame (sidebar + topbar + content) used by AdminLayout and MemberLayout. */
export default function DashboardShell({ navigation, subtitle, sidebarFooter, searchPath, searchPlaceholder, bottomNav }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setMobileOpen(false), [location.pathname, location.search])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <div className="min-h-dvh">
      <Sidebar
        sections={navigation}
        subtitle={subtitle}
        footer={sidebarFooter}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setMobileOpen(true)} searchPath={searchPath} searchPlaceholder={searchPlaceholder} />
        <PreviewBanner />
        <main className={`mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 ${bottomNav ? 'pb-24 lg:pb-8' : ''}`}>
          <Suspense
            fallback={
              <div className="flex min-h-[40dvh] items-center justify-center" role="status" aria-label="Loading page">
                <Spinner className="h-7 w-7 text-lava-500" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
        {bottomNav}
      </div>
    </div>
  )
}
