import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'

type ToastTone = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; tone: ToastTone }

type ToastContextValue = {
  notify: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<Toast>>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current, { id, message, tone }])
      window.setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <section className="toast-region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => {
          const Icon =
            toast.tone === 'success'
              ? CheckCircle2
              : toast.tone === 'error'
                ? CircleAlert
                : Info
          return (
            <div className={`toast toast-${toast.tone}`} key={toast.id}>
              <Icon size={17} />
              <span>{toast.message}</span>
              <button
                type="button"
                className="icon-button toast-close"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
              >
                <X size={15} />
              </button>
            </div>
          )
        })}
      </section>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
