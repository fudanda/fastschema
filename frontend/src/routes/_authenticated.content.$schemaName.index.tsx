import { createFileRoute } from '@tanstack/react-router'
import { ContentListPage } from '../pages/content-pages'

export const Route = createFileRoute('/_authenticated/content/$schemaName/')({
  component: ContentListRoute,
})

function ContentListRoute() {
  const { schemaName } = Route.useParams()
  return <ContentListPage schemaName={schemaName} />
}
