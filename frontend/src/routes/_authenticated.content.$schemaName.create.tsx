import { createFileRoute } from '@tanstack/react-router'
import { ContentEditorPage } from '../pages/content-pages'

export const Route = createFileRoute('/_authenticated/content/$schemaName/create')({
  component: ContentCreateRoute,
})

function ContentCreateRoute() {
  const { schemaName } = Route.useParams()
  return <ContentEditorPage schemaName={schemaName} />
}
