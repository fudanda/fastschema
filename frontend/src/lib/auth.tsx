import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { apiRequest } from './api'
import type { AppConfig, User } from './types'

const TOKEN_KEY = 'fastschema.dashboard.token'

type LoginInput = { login: string; password: string }
type LoginResult = { token: string; expires?: string }
type AuthenticatedRequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

type AuthContextValue = {
  ready: boolean
  token: string | null
  user: User | null
  config: AppConfig | null
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
  refreshConfig: () => Promise<AppConfig>
  request: <T>(path: string, options?: AuthenticatedRequestOptions) => Promise<T>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [config, setConfig] = useState<AppConfig | null>(null)

  const loadSession = useCallback(async (sessionToken: string) => {
    const [currentUser, appConfig] = await Promise.all([
      apiRequest<User>('/auth/me', { token: sessionToken }),
      apiRequest<AppConfig>('/config', { token: sessionToken }),
    ])
    setUser(currentUser)
    setConfig(appConfig)
  }, [])

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY)
    if (!storedToken) {
      setReady(true)
      return
    }

    setToken(storedToken)
    loadSession(storedToken)
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
        setConfig(null)
      })
      .finally(() => setReady(true))
  }, [loadSession])

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await apiRequest<LoginResult>('/auth/local/login', {
        method: 'POST',
        body: input,
      })
      window.localStorage.setItem(TOKEN_KEY, result.token)
      setToken(result.token)
      await loadSession(result.token)
    },
    [loadSession],
  )

  const logout = useCallback(async () => {
    if (token) {
      await apiRequest('/auth/logout', { method: 'POST', token }).catch(() => undefined)
    }
    window.localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setConfig(null)
  }, [token])

  const refreshConfig = useCallback(async () => {
    if (!token) throw new Error('Authentication required')
    const nextConfig = await apiRequest<AppConfig>('/config', { token })
    setConfig(nextConfig)
    return nextConfig
  }, [token])

  const request = useCallback(
    async <T,>(path: string, options: AuthenticatedRequestOptions = {}) => {
      if (!token) throw new Error('Authentication required')
      return apiRequest<T>(path, { ...options, token })
    },
    [token],
  )

  const value = useMemo(
    () => ({
      ready,
      token,
      user,
      config,
      login,
      logout,
      refreshConfig,
      request,
    }),
    [ready, token, user, config, login, logout, refreshConfig, request],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
