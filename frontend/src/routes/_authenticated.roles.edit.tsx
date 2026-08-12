import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { RoleEditorPage } from '../pages/roles-pages'

export const Route = createFileRoute('/_authenticated/roles/edit')({
  validateSearch: z.object({ id: z.string() }),
  component: RoleEditRoute,
})

function RoleEditRoute() {
  const { id } = Route.useSearch()
  return <RoleEditorPage id={id} />
}
