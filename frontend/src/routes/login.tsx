import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginPage } from '../pages/auth-pages'

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  head: () => ({ meta: [{ title: 'Login · FastSchema' }] }),
  component: LoginRoute,
})

function LoginRoute() {
  const { redirect } = Route.useSearch()
  return <LoginPage redirect={redirect} />
}
