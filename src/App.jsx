import AppRoutes from '@/routes/AppRoutes'
import OfflineBanner from '@/components/layout/OfflineBanner'

export default function App() {
  return (
    <>
      <OfflineBanner />
      <AppRoutes />
    </>
  )
}
