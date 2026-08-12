import { createFileRoute, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { AppShell } from '../components/app-shell'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { ready, token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const redirectStarted = useRef(false)
  const requestedPath = useRef(
    (typeof window === 'undefined' ? location.pathname : window.location.pathname)
      .replace(/^\/dash/, '') || '/',
  )

  useEffect(() => {
    if (!ready || token || redirectStarted.current) return

    redirectStarted.current = true
    void navigate({
      to: '/login',
      search: { redirect: requestedPath.current },
      replace: true,
    })
  }, [navigate, ready, token])

  if (!ready) {
    return (
      <main className="auth-page auth-loading" role="status">
        <span className="spinner" />
        <p>Loading FastSchema…</p>
      </main>
    )
  }

  if (!token) {
    return (
      <main className="auth-page auth-loading" role="status">
        <span className="spinner" />
        <p>Redirecting to login…</p>
      </main>
    )
  }

  return <AppShell />
}
