import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '../pages/dashboard-page'
import { m } from '../paraglide/messages.js'

export const Route = createFileRoute('/_authenticated/')({
  head: () => ({ meta: [{ title: m.meta_dashboard() }] }),
  component: DashboardPage,
})
