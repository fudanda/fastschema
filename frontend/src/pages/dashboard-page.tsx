import { Database, FileBox, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { m } from '../paraglide/messages.js'

export function DashboardPage() {
  const { config, user } = useAuth()
  const contentSchemas = (config?.schemas || []).filter(
    (schema) =>
      !schema.is_junction_schema && !['file', 'permission', 'role', 'user'].includes(schema.name),
  )

  return (
    <div className="dashboard-page">
      <section className="welcome-panel">
        <span className="welcome-icon">
          <Sparkles size={20} />
        </span>
        <div>
          <p className="eyebrow">{m.dashboard_eyebrow()}</p>
          <h1>{m.dashboard_welcome({ name: user?.username || m.common_admin() })}</h1>
          <p>{m.dashboard_intro()}</p>
        </div>
      </section>
      <section className="dashboard-grid" aria-label={m.dashboard_overview()}>
        <article className="metric-card">
          <span>
            <Database size={18} />
          </span>
          <div>
            <strong>{contentSchemas.length}</strong>
            <small>{m.dashboard_content_types()}</small>
          </div>
        </article>
        <article className="metric-card">
          <span>
            <FileBox size={18} />
          </span>
          <div>
            <strong>{m.dashboard_media()}</strong>
            <small>{m.dashboard_media_help()}</small>
          </div>
        </article>
        <article className="metric-card">
          <span>
            <UsersRound size={18} />
          </span>
          <div>
            <strong>{m.dashboard_users()}</strong>
            <small>{m.dashboard_users_help()}</small>
          </div>
        </article>
        <article className="metric-card">
          <span>
            <ShieldCheck size={18} />
          </span>
          <div>
            <strong>{config?.version || '0.0.0'}</strong>
            <small>{m.dashboard_version()}</small>
          </div>
        </article>
      </section>
    </div>
  )
}
