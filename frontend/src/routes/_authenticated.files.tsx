import { createFileRoute } from '@tanstack/react-router'
import { FilesPage } from '../pages/files-page'
import { m } from '../paraglide/messages.js'
import { filesQueryOptions } from '../lib/queries'

export const Route = createFileRoute('/_authenticated/files')({
  loader: ({ context }) =>
    typeof window === 'undefined'
      ? undefined
      : context.queryClient.ensureQueryData(filesQueryOptions()),
  head: () => ({ meta: [{ title: m.meta_files() }] }),
  component: FilesPage,
})
