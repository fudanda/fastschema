import '@douyinfe/semi-ui/react19-adapter'
import '@douyinfe/semi-ui/lib/es/_base/base.css'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import Spin from '@douyinfe/semi-ui/lib/es/spin'
import { createDashboardQueryClient } from './lib/query-client'
import { routeTree } from './routeTree.gen'
import { m } from './paraglide/messages.js'

export type RouterContext = {
  queryClient: ReturnType<typeof createDashboardQueryClient>
}

export function getRouter() {
  const queryClient = createDashboardQueryClient()
  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    basepath: '/dash',
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: () => (
      <div className="route-loading" role="status" aria-live="polite" suppressHydrationWarning>
        <Spin tip={m.route_loading()} />
      </div>
    ),
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
