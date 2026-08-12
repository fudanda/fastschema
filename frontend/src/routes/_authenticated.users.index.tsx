import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '../pages/users-pages'

export const Route = createFileRoute('/_authenticated/users/')({
  head: () => ({ meta: [{ title: 'Users · FastSchema' }] }),
  component: UsersPage,
})
