import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/** Persistent notice while the device is offline; disappears automatically when the connection returns. */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && navigator.onLine === false)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (!offline) return null
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 bg-navy-900 px-4 py-2 text-xs font-medium text-white">
      <WifiOff className="h-3.5 w-3.5 text-amber-300" /> You’re offline. Changes and videos will continue when your connection returns.
    </div>
  )
}
