import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '../pages/users-pages'
import { m } from '../paraglide/messages.js'
import { usersQueryOptions } from '../lib/queries'

export const Route = createFileRoute('/_authenticated/users/')({
  loader: ({ context }) =>
    typeof window === 'undefined'
      ? undefined
      : context.queryClient.ensureQueryData(usersQueryOptions()),
  head: () => ({ meta: [{ title: m.meta_users() }] }),
  component: UsersPage,
})
