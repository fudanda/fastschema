import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SetupPage } from '../pages/auth-pages'
import { m } from '../paraglide/messages.js'

const setupSearchSchema = z.object({ token: z.string().optional() })

export const Route = createFileRoute('/setup')({
  validateSearch: setupSearchSchema,
  head: () => ({ meta: [{ title: m.meta_setup() }] }),
  component: SetupRoute,
})

function SetupRoute() {
  const { token } = Route.useSearch()
  return <SetupPage token={token} />
}
