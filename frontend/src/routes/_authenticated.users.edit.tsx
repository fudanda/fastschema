import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { UserEditorPage } from '../pages/users-pages'
import { recordQueryOptions, rolesQueryOptions } from '../lib/queries'

export const Route = createFileRoute('/_authenticated/users/edit')({
  validateSearch: z.object({ id: z.string() }),
  loaderDeps: ({ search }) => ({ id: search.id }),
  loader: ({ context, deps }) =>
    typeof window === 'undefined'
      ? undefined
      : Promise.all([
          context.queryClient.ensureQueryData(rolesQueryOptions()),
          context.queryClient.ensureQueryData(recordQueryOptions('user', deps.id)),
        ]),
  component: UserEditRoute,
})

function UserEditRoute() {
  const { id } = Route.useSearch()
  return <UserEditorPage id={id} />
}
