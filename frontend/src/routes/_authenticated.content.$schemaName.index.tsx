import { createFileRoute } from '@tanstack/react-router'
import { ContentListPage } from '../pages/content-pages'
import { contentQueryOptions } from '../lib/queries'

export const Route = createFileRoute('/_authenticated/content/$schemaName/')({
  loader: ({ context, params }) =>
    typeof window === 'undefined'
      ? undefined
      : context.queryClient.ensureQueryData(contentQueryOptions(params.schemaName)),
  component: ContentListRoute,
})

function ContentListRoute() {
  const { schemaName } = Route.useParams()
  return <ContentListPage schemaName={schemaName} />
}
