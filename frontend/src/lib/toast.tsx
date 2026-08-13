import Toast from '@douyinfe/semi-ui/lib/es/toast'
import { createContext, useCallback, useContext, useMemo } from 'react'

type ToastTone = 'success' | 'error' | 'info'
type ToastContextValue = {
  notify: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    Toast[tone]({ content: message, duration: 4.2, showClose: false })
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
