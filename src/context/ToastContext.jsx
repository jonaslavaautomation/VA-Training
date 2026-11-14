import { createContext, useCallback, useMemo, useRef, useState } from 'react'
import Toaster from '@/components/ui/Toaster'

export const ToastContext = createContext(null)

/** App-wide success / error / info notifications. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const show = useCallback(
    (type, message, { duration = type === 'error' ? 7000 : 4500 } = {}) => {
      const id = ++nextId.current
      // Keep at most 4 on screen; identical messages replace each other.
      setToasts((list) => [...list.filter((t) => t.message !== message).slice(-3), { id, type, message }])
      if (duration) setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({
      success: (message, opts) => show('success', message, opts),
      error: (message, opts) => show('error', message, opts),
      info: (message, opts) => show('info', message, opts),
      dismiss,
    }),
    [show, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}
