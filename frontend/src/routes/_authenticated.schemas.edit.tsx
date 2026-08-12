import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SchemaEditorPage } from '../pages/schemas-pages'

export const Route = createFileRoute('/_authenticated/schemas/edit')({
  validateSearch: z.object({ schema: z.string() }),
  component: SchemaEditRoute,
})

function SchemaEditRoute() {
  const { schema } = Route.useSearch()
  return <SchemaEditorPage key={schema} schemaName={schema} />
}
