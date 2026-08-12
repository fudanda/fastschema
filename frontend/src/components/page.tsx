import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: { label: string; to: string }
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && (
        <Link className="button button-primary" to={action.to}>
          <Plus size={16} />
          {action.label}
        </Link>
      )}
    </header>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state-panel" role="status">
      <span className="spinner" />
      <p>{label}</p>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string
  description?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="empty-state">
      {icon && <span className="empty-state-icon">{icon}</span>}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  )
}

export function ErrorState({
  error,
  retry,
}: {
  error: unknown
  retry?: () => void
}) {
  const message = error instanceof Error ? error.message : 'Something went wrong'
  return (
    <div className="state-panel state-error" role="alert">
      <strong>Unable to load this page</strong>
      <p>{message}</p>
      {retry && (
        <button type="button" className="button button-outline" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  )
}
