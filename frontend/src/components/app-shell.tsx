import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import Avatar from '@douyinfe/semi-ui/lib/es/avatar'
import {
  Box,
  ChevronDown,
  ChevronRight,
  CircleGauge,
  Database,
  FileBox,
  LogOut,
  Menu,
  PanelLeftClose,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../lib/auth'
import { initials, titleCase } from '../lib/format'
import { m } from '../paraglide/messages.js'
import { Brand } from './brand'
import { LocaleSwitcher } from './locale-switcher'
import { ActionButton } from './semi-controls'

const excludedContentSchemas = new Set(['file', 'permission', 'role', 'user'])

function NavLink({
  to,
  label,
  icon,
  onNavigate,
}: {
  to: string
  label: string
  icon: React.ReactNode
  onNavigate?: () => void
}) {
  return (
    <Link
      to={to}
      className="nav-link"
      activeProps={{ className: 'nav-link nav-link-active' }}
      activeOptions={{ exact: to === '/' }}
      onClick={onNavigate}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}

function Breadcrumbs() {
  const { pathname, search } = useLocation()
  const parts = pathname
    .replace(/^\/dash\/?/, '')
    .split('/')
    .filter(Boolean)
  const items: Array<{ label: string; to: string }> = [{ label: m.nav_dashboard(), to: '/' }]
  const sectionLabels: Record<string, string> = {
    content: m.nav_content(),
    files: m.nav_files(),
    schemas: m.nav_schemas(),
    users: m.nav_users(),
    roles: m.nav_roles(),
  }

  if (parts.length) {
    let to = ''
    parts.forEach((part) => {
      to += `/${part}`
      let label = sectionLabels[part] || titleCase(part)
      if (part === 'edit' && typeof search === 'object' && search && 'schema' in search) {
        label = m.breadcrumb_edit_item({ item: titleCase(String(search.schema)) })
      }
      items.push({ label, to })
    })
  }

  return (
    <nav className="breadcrumbs" aria-label={m.breadcrumb_label()}>
      {items.map((item, index) => (
        <span key={`${item.to}-${item.label}`}>
          {index > 0 && <span className="breadcrumb-divider">/</span>}
          {index === items.length - 1 ? (
            <span aria-current="page">{item.label}</span>
          ) : (
            <Link to={item.to}>{item.label}</Link>
          )}
        </span>
      ))}
    </nav>
  )
}

export function AppShell() {
  const { config, user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [contentOpen, setContentOpen] = useState(location.pathname.includes('/content/'))
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const contentSchemas = useMemo(
    () =>
      (config?.schemas || [])
        .filter((schema) => !schema.is_junction_schema && !excludedContentSchemas.has(schema.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [config],
  )

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  const closeMobileSidebar = () => setSidebarOpen(false)

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {sidebarOpen && (
        <ActionButton
          type="button"
          className="sidebar-backdrop"
          aria-label={m.nav_close_sidebar()}
          onClick={closeMobileSidebar}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand-row">
          <Brand version={config?.version || '0.0.0'} compact={sidebarCollapsed} />
          <ActionButton
            type="button"
            className="icon-button sidebar-mobile-close"
            aria-label={m.nav_close_sidebar()}
            onClick={closeMobileSidebar}
          >
            <X size={18} />
          </ActionButton>
        </div>

        <div className="sidebar-scroll">
          <section className="nav-section">
            <p className="nav-label">{m.nav_management()}</p>
            <nav>
              <NavLink
                to="/"
                label={m.nav_dashboard()}
                icon={<CircleGauge size={17} />}
                onNavigate={closeMobileSidebar}
              />
              <ActionButton
                type="button"
                className={`nav-link nav-button ${location.pathname.includes('/content/') ? 'nav-link-active' : ''}`}
                onClick={() => setContentOpen((value) => !value)}
                aria-expanded={contentOpen}
              >
                <Database size={17} />
                <span>{m.nav_content()}</span>
                {contentOpen ? (
                  <ChevronDown className="nav-chevron" size={15} />
                ) : (
                  <ChevronRight className="nav-chevron" size={15} />
                )}
              </ActionButton>
              {contentOpen && !sidebarCollapsed && (
                <div className="nav-submenu">
                  {contentSchemas.map((schema) => (
                    <Link
                      key={schema.name}
                      to="/content/$schemaName"
                      params={{ schemaName: schema.name }}
                      className="nav-sublink"
                      activeProps={{ className: 'nav-sublink nav-sublink-active' }}
                      onClick={closeMobileSidebar}
                    >
                      {titleCase(schema.name)}
                    </Link>
                  ))}
                </div>
              )}
              <NavLink
                to="/files"
                label={m.nav_files()}
                icon={<FileBox size={17} />}
                onNavigate={closeMobileSidebar}
              />
            </nav>
          </section>

          <section className="nav-section">
            <p className="nav-label">{m.nav_settings()}</p>
            <nav>
              <NavLink
                to="/schemas"
                label={m.nav_schemas()}
                icon={<Box size={17} />}
                onNavigate={closeMobileSidebar}
              />
              <NavLink
                to="/users"
                label={m.nav_users()}
                icon={<UserRound size={17} />}
                onNavigate={closeMobileSidebar}
              />
              <NavLink
                to="/roles"
                label={m.nav_roles()}
                icon={<ShieldCheck size={17} />}
                onNavigate={closeMobileSidebar}
              />
            </nav>
          </section>
        </div>

        <div className="sidebar-footer">
          <a className="nav-link" href="https://fastschema.com" target="_blank" rel="noreferrer">
            <FileBox size={17} />
            <span>{m.nav_documentation()}</span>
          </a>
          <div className="user-menu-wrap" ref={menuRef}>
            {userMenuOpen && (
              <div className="user-popover">
                <div className="user-popover-meta">
                  <strong>{user?.username || m.common_user()}</strong>
                  <span>{user?.email}</span>
                </div>
                <ActionButton
                  type="button"
                  onClick={async () => {
                    await logout()
                    await navigate({ to: '/login' })
                  }}
                >
                  <LogOut size={16} />
                  {m.nav_logout()}
                </ActionButton>
              </div>
            )}
            <ActionButton
              type="button"
              className="user-button"
              onClick={() => setUserMenuOpen((value) => !value)}
              aria-expanded={userMenuOpen}
            >
              <Avatar className="avatar" size="small" color="orange">
                {initials(user?.username, user?.email)}
              </Avatar>
              {!sidebarCollapsed && (
                <span className="user-copy">
                  <strong>{user?.username || m.common_user()}</strong>
                  <small>{user?.email}</small>
                </span>
              )}
              {!sidebarCollapsed && <ChevronDown size={15} />}
            </ActionButton>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <ActionButton
            type="button"
            className="icon-button mobile-menu"
            aria-label={m.nav_open_sidebar()}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={19} />
          </ActionButton>
          <ActionButton
            type="button"
            className="icon-button desktop-collapse"
            aria-label={m.nav_toggle_sidebar()}
            onClick={() => setSidebarCollapsed((value) => !value)}
          >
            <PanelLeftClose size={18} />
          </ActionButton>
          <Breadcrumbs />
          <LocaleSwitcher className="topbar-locale" />
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
