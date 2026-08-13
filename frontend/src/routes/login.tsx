import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginPage } from '../pages/auth-pages'
import { m } from '../paraglide/messages.js'

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  head: () => ({ meta: [{ title: m.meta_login() }] }),
  component: LoginRoute,
})

function LoginRoute() {
  const { redirect } = Route.useSearch()
  return <LoginPage redirect={redirect} />
}
