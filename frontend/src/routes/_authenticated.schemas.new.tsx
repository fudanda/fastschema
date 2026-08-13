import { createFileRoute } from '@tanstack/react-router'
import { SchemaEditorPage } from '../pages/schemas-pages'
import { m } from '../paraglide/messages.js'

export const Route = createFileRoute('/_authenticated/schemas/new')({
  head: () => ({ meta: [{ title: m.meta_create_schema() }] }),
  component: SchemaEditorPage,
})
