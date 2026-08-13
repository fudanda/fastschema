import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { apiRequest } from './api'
import { queryKeys, sessionQueryOptions } from './queries'
import type { SessionData } from './queries'
import type { AppConfig, User } from './types'

type LoginInput = { login: string; password: string }
type AuthenticatedRequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

type AuthContextValue = {
  ready: boolean
  authenticated: boolean
  user: User | null
  config: AppConfig | null
  error: unknown
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
  refreshConfig: () => Promise<AppConfig>
  retrySession: () => Promise<void>
  request: <T>(path: string, options?: AuthenticatedRequestOptions) => Promise<T>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const session = useQuery(sessionQueryOptions())
  const refetchSession = session.refetch

  useEffect(() => {
    const clearSession = () => {
      queryClient.setQueryData<SessionData | null>(queryKeys.session, null)
    }
    window.addEventListener('fastschema:unauthorized', clearSession)
    return () => window.removeEventListener('fastschema:unauthorized', clearSession)
  }, [queryClient])

  const login = useCallback(
    async (input: LoginInput) => {
      await apiRequest('/auth/local/login', {
        method: 'POST',
        body: input,
        skipAuthRecovery: true,
        skipUnauthorizedNotification: true,
      })
      await queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 })
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    await apiRequest('/auth/logout', {
      method: 'POST',
      body: {},
      skipAuthRecovery: true,
    }).catch(() => undefined)
    queryClient.clear()
  }, [queryClient])

  const refreshConfig = useCallback(async () => {
    const config = await apiRequest<AppConfig>('/config')
    queryClient.setQueryData(queryKeys.session, (current: SessionData | undefined) =>
      current ? { ...current, config } : current,
    )
    return config
  }, [queryClient])

  const retrySession = useCallback(async () => {
    await refetchSession()
  }, [refetchSession])

  const request = useCallback(
    async <T,>(path: string, options: AuthenticatedRequestOptions = {}) =>
      apiRequest<T>(path, options),
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      ready: !session.isPending,
      authenticated: Boolean(session.data),
      user: session.data?.user || null,
      config: session.data?.config || null,
      error: session.error,
      login,
      logout,
      refreshConfig,
      retrySession,
      request,
    }),
    [
      session.isPending,
      session.data,
      session.error,
      login,
      logout,
      refreshConfig,
      retrySession,
      request,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
