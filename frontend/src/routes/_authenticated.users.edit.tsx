import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { UserEditorPage } from '../pages/users-pages'

export const Route = createFileRoute('/_authenticated/users/edit')({
  validateSearch: z.object({ id: z.string() }),
  component: UserEditRoute,
})

function UserEditRoute() {
  const { id } = Route.useSearch()
  return <UserEditorPage id={id} />
}
