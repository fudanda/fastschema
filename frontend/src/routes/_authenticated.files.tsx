import { createFileRoute } from '@tanstack/react-router'
import { FilesPage } from '../pages/files-page'

export const Route = createFileRoute('/_authenticated/files')({
  head: () => ({ meta: [{ title: 'Files List · FastSchema' }] }),
  component: FilesPage,
})
