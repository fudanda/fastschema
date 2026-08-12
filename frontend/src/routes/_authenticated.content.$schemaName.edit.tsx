import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ContentEditorPage } from '../pages/content-pages'

export const Route = createFileRoute('/_authenticated/content/$schemaName/edit')({
  validateSearch: z.object({ id: z.string() }),
  component: ContentEditRoute,
})

function ContentEditRoute() {
  const { schemaName } = Route.useParams()
  const { id } = Route.useSearch()
  return <ContentEditorPage schemaName={schemaName} id={id} />
}
