import { createFileRoute } from '@tanstack/react-router'
import { SchemaEditorPage } from '../pages/schemas-pages'

export const Route = createFileRoute('/_authenticated/schemas/new')({
  head: () => ({ meta: [{ title: 'Create Schema · FastSchema' }] }),
  component: SchemaEditorPage,
})
