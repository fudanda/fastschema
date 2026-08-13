import { createFileRoute } from '@tanstack/react-router'
import { SchemasPage } from '../pages/schemas-pages'
import { m } from '../paraglide/messages.js'

export const Route = createFileRoute('/_authenticated/schemas/')({
  head: () => ({ meta: [{ title: m.meta_schemas() }] }),
  component: SchemasPage,
})
