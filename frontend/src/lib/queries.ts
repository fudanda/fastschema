import { queryOptions } from '@tanstack/react-query'
import { apiRequest, withQuery } from './api'
import type { AppConfig, ContentRecord, MediaFile, Pagination, Role, User } from './types'

export type SessionData = { user: User; config: AppConfig }
export type HealthStatus = { status: string; version: string }
export type SetupStatus = { needs_setup: boolean }

export const queryKeys = {
  session: ['session'] as const,
  health: ['health'] as const,
  setup: ['setup-status'] as const,
  files: ['files'] as const,
  users: ['users'] as const,
  roles: ['roles'] as const,
  content: (schemaName: string) => ['content', schemaName] as const,
  record: (schemaName: string, id: string) => ['content', schemaName, id] as const,
}

const browserEnabled = typeof window !== 'undefined'

export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.session,
    queryFn: async (): Promise<SessionData> => {
      const [user, config] = await Promise.all([
        apiRequest<User>('/auth/me', { skipUnauthorizedNotification: true }),
        apiRequest<AppConfig>('/config', { skipUnauthorizedNotification: true }),
      ])
      return { user, config }
    },
    enabled: browserEnabled,
    retry: false,
    staleTime: 60_000,
  })

export const healthQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.health,
    queryFn: () => apiRequest<HealthStatus>('/health', { skipAuthRecovery: true }),
    enabled: browserEnabled,
    retry: 1,
    refetchInterval: 30_000,
  })

export const setupStatusQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.setup,
    queryFn: () => apiRequest<SetupStatus>('/setup/status', { skipAuthRecovery: true }),
    enabled: browserEnabled,
    retry: 1,
  })

export const filesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.files,
    queryFn: async () => {
      const result = await apiRequest<Pagination<MediaFile>>(
        withQuery('/content/file', { limit: 100 }),
      )
      return result.items || []
    },
    enabled: browserEnabled,
  })

export const usersQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const result = await apiRequest<Pagination<User>>(withQuery('/content/user', { limit: 100 }))
      return result.items || []
    },
    enabled: browserEnabled,
  })

export const rolesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.roles,
    queryFn: () => apiRequest<Array<Role>>('/role'),
    enabled: browserEnabled,
  })

export const contentQueryOptions = (schemaName: string) =>
  queryOptions({
    queryKey: queryKeys.content(schemaName),
    queryFn: async () => {
      const result = await apiRequest<Pagination<ContentRecord>>(
        withQuery(`/content/${encodeURIComponent(schemaName)}`, { limit: 100 }),
      )
      return result.items || []
    },
    enabled: browserEnabled && Boolean(schemaName),
  })

export const recordQueryOptions = (schemaName: string, id: string) =>
  queryOptions({
    queryKey: queryKeys.record(schemaName, id),
    queryFn: () =>
      apiRequest<ContentRecord>(
        `/content/${encodeURIComponent(schemaName)}/${encodeURIComponent(id)}`,
      ),
    enabled: browserEnabled && Boolean(schemaName && id),
  })
