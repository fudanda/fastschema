import { createFileRoute } from '@tanstack/react-router'
import { RolesPage } from '../pages/roles-pages'

export const Route = createFileRoute('/_authenticated/roles/')({
  head: () => ({ meta: [{ title: 'Roles & Permissions · FastSchema' }] }),
  component: RolesPage,
})
