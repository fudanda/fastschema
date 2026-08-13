import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

export function createDashboardQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Server-side QueryClient instances must not create GC timers. A
        // finite timer keeps the TanStack Start prerender process alive.
        gcTime: typeof window === 'undefined' ? Infinity : 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false
          }
          return failureCount < 2
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export type DashboardQueryClient = ReturnType<typeof createDashboardQueryClient>
