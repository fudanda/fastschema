import { createFileRoute } from '@tanstack/react-router'
import { RoleEditorPage } from '../pages/roles-pages'

export const Route = createFileRoute('/_authenticated/roles/create')({
  component: RoleEditorPage,
})
