import { createFileRoute } from '@tanstack/react-router'
import { SchemasPage } from '../pages/schemas-pages'

export const Route = createFileRoute('/_authenticated/schemas/')({
  head: () => ({ meta: [{ title: 'Schemas Settings · FastSchema' }] }),
  component: SchemasPage,
})
