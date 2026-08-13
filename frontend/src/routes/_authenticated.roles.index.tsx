import { createFileRoute } from '@tanstack/react-router'
import { RolesPage } from '../pages/roles-pages'
import { m } from '../paraglide/messages.js'
import { rolesQueryOptions } from '../lib/queries'

export const Route = createFileRoute('/_authenticated/roles/')({
  loader: ({ context }) =>
    typeof window === 'undefined'
      ? undefined
      : context.queryClient.ensureQueryData(rolesQueryOptions()),
  head: () => ({ meta: [{ title: m.meta_roles() }] }),
  component: RolesPage,
})
