import { Link } from '@tanstack/react-router'
import { m } from '../paraglide/messages.js'

export function Brand({ version, compact = false }: { version?: string; compact?: boolean }) {
  return (
    <Link
      to="/"
      className={`brand ${compact ? 'brand-compact' : ''}`}
      aria-label={m.app_dashboard()}
    >
      <span className="brand-mark" aria-hidden="true">
        <span>{'{'}</span>
        <svg viewBox="0 0 24 24" role="presentation">
          <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
        </svg>
        <span>{'}'}</span>
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>FastSchema</strong>
          {version && <small>{version}</small>}
        </span>
      )}
    </Link>
  )
}
