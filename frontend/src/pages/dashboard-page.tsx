import { Database, FileBox, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'
import { useAuth } from '../lib/auth'

export function DashboardPage() {
  const { config, user } = useAuth()
  const contentSchemas = (config?.schemas || []).filter(
    (schema) => !schema.is_junction_schema && !['file', 'permission', 'role', 'user'].includes(schema.name),
  )

  return (
    <div className="dashboard-page">
      <section className="welcome-panel">
        <span className="welcome-icon"><Sparkles size={20} /></span>
        <div>
          <p className="eyebrow">FastSchema Dashboard</p>
          <h1>Welcome back, {user?.username || 'Admin'}.</h1>
          <p>Manage your content, schemas, media, users, and permissions from one place.</p>
        </div>
      </section>
      <section className="dashboard-grid" aria-label="Application overview">
        <article className="metric-card">
          <span><Database size={18} /></span>
          <div><strong>{contentSchemas.length}</strong><small>Content types</small></div>
        </article>
        <article className="metric-card">
          <span><FileBox size={18} /></span>
          <div><strong>Media</strong><small>Upload and organize files</small></div>
        </article>
        <article className="metric-card">
          <span><UsersRound size={18} /></span>
          <div><strong>Users</strong><small>Manage team access</small></div>
        </article>
        <article className="metric-card">
          <span><ShieldCheck size={18} /></span>
          <div><strong>{config?.version || '0.0.0'}</strong><small>FastSchema version</small></div>
        </article>
      </section>
    </div>
  )
}
