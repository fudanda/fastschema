import { createFileRoute, redirect, useLocation, useNavigate } from '@tanstack/react-router'
import Banner from '@douyinfe/semi-ui/lib/es/banner'
import Button from '@douyinfe/semi-ui/lib/es/button'
import Spin from '@douyinfe/semi-ui/lib/es/spin'
import { useEffect, useRef } from 'react'
import { AppShell } from '../components/app-shell'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { sessionQueryOptions } from '../lib/queries'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    if (typeof window === 'undefined') return
    try {
      const session = await context.queryClient.ensureQueryData(sessionQueryOptions())
      if (!session) {
        throw redirect({
          to: '/login',
          search: { redirect: location.pathname.replace(/^\/dash/, '') || '/' },
        })
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw redirect({
          to: '/login',
          search: { redirect: location.pathname.replace(/^\/dash/, '') || '/' },
        })
      }
      if (!(error instanceof ApiError)) throw error
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { ready, authenticated, error, retrySession } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const redirectStarted = useRef(false)
  const requestedPath = useRef(
    (typeof window === 'undefined' ? location.pathname : window.location.pathname).replace(
      /^\/dash/,
      '',
    ) || '/',
  )

  useEffect(() => {
    if (!ready || authenticated || error || redirectStarted.current) return

    redirectStarted.current = true
    void navigate({
      to: '/login',
      search: { redirect: requestedPath.current },
      replace: true,
    })
  }, [authenticated, error, navigate, ready])

  if (!ready) {
    return (
      <main className="auth-page auth-loading" role="status">
        <Spin tip="Loading FastSchema…" size="large" />
      </main>
    )
  }

  if (error instanceof ApiError && error.status === 0) {
    return (
      <main className="auth-page auth-loading">
        <Banner
          type="danger"
          fullMode={false}
          title="API unavailable"
          description={error.message}
          closeIcon={null}
        >
          <Button theme="solid" type="primary" onClick={() => void retrySession()}>
            Try again
          </Button>
        </Banner>
      </main>
    )
  }

  if (!authenticated) {
    return (
      <main className="auth-page auth-loading" role="status">
        <Spin tip="Redirecting to login…" size="large" />
      </main>
    )
  }

  return <AppShell />
}
