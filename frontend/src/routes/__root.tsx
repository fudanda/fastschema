import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'

import { AuthProvider } from '../lib/auth'
import { ToastProvider } from '../lib/toast'
import { ConfirmProvider } from '../lib/confirm'
import { LocaleDocumentSync } from '../components/locale-switcher'
import { m } from '../paraglide/messages.js'
import { getLocale } from '../paraglide/runtime.js'
import appCss from '../styles.css?url'
import type { RouterContext } from '../router'

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'FastSchema',
      },
      {
        name: 'description',
        content: m.app_description(),
      },
      {
        name: 'theme-color',
        content: '#ff7b14',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/dash/favicon.svg',
        type: 'image/svg+xml',
      },
    ],
  }),
  component: Outlet,
  notFoundComponent: () => (
    <main className="standalone-state">
      <span className="state-code">404</span>
      <h1>{m.not_found_title()}</h1>
      <a className="button button-primary" href="/dash/">
        {m.not_found_back()}
      </a>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext()
  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <LocaleDocumentSync />
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ConfirmProvider>
              <AuthProvider>{children}</AuthProvider>
            </ConfirmProvider>
          </ToastProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
