import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ContentEditorPage } from '../pages/content-pages'
import { recordQueryOptions } from '../lib/queries'

export const Route = createFileRoute('/_authenticated/content/$schemaName/edit')({
  validateSearch: z.object({ id: z.string() }),
  loaderDeps: ({ search }) => ({ id: search.id }),
  loader: ({ context, params, deps }) =>
    typeof window === 'undefined'
      ? undefined
      : context.queryClient.ensureQueryData(recordQueryOptions(params.schemaName, deps.id)),
  component: ContentEditRoute,
})

function ContentEditRoute() {
  const { schemaName } = Route.useParams()
  const { id } = Route.useSearch()
  return <ContentEditorPage schemaName={schemaName} id={id} />
}
