import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'

import { AuthProvider } from '../lib/auth'
import { ToastProvider } from '../lib/toast'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
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
        content: 'FastSchema administration dashboard',
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
      <h1>Page not found</h1>
      <a className="button button-primary" href="/dash/">
        Back to Dashboard
      </a>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
        <Scripts />
      </body>
    </html>
  )
}
