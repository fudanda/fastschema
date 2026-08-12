import { createFileRoute } from '@tanstack/react-router'
import { UserEditorPage } from '../pages/users-pages'

export const Route = createFileRoute('/_authenticated/users/create')({
  component: UserEditorPage,
})
