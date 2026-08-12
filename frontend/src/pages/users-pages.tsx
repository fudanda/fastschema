import { Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, UserRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { DataTable } from '../components/data-table'
import { ErrorState, LoadingState, PageHeader } from '../components/page'
import { withQuery } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDate } from '../lib/format'
import { useToast } from '../lib/toast'
import type { Pagination, Role, User } from '../lib/types'

const userSchema = z.object({
  username: z.string().trim().min(2, 'Username must contain at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  bio: z.string().optional(),
  active: z.boolean(),
  roles: z.array(z.string()),
})

export function UsersPage() {
  const { request, user: currentUser } = useAuth()
  const { notify } = useToast()
  const [users, setUsers] = useState<Array<User>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>()

  const load = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const result = await request<Pagination<User>>(withQuery('/content/user', { limit: 100 }))
      setUsers(result.items || [])
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [request])

  useEffect(() => { void load() }, [load])

  const columns = useMemo<Array<ColumnDef<User>>>(() => [
    {
      id: 'select',
      header: ({ table }) => <input type="checkbox" aria-label="Select all" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />,
      cell: ({ row }) => <input type="checkbox" aria-label="Select row" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />,
      enableSorting: false,
    },
    { accessorKey: 'id', header: 'Id', cell: ({ row }) => <Link className="table-link monospace-cell" to="/users/edit" search={{ id: row.original.id }}>{row.original.id}</Link> },
    { accessorKey: 'username', header: 'Username', cell: ({ row }) => <Link className="table-link" to="/users/edit" search={{ id: row.original.id }}>{row.original.username || '—'}</Link> },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'active', header: 'Active', cell: ({ getValue }) => <span className={`status-badge ${getValue() ? 'status-success' : 'status-neutral'}`}>{getValue() ? 'Active' : 'Inactive'}</span> },
    { id: 'roles', header: 'Roles', accessorFn: (row) => row.roles?.map((role) => role.name).join(', ') || '', cell: ({ row }) => <div className="badge-list">{row.original.roles?.map((role) => <span className="status-badge status-neutral" key={role.id}>{role.name}</span>) || '—'}</div> },
    { accessorKey: 'created_at', header: 'Created At', cell: ({ getValue }) => formatDate(getValue()) },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="row-actions">
          <Link className="icon-button" to="/users/edit" search={{ id: row.original.id }} aria-label={`Edit ${row.original.username}`}><Pencil size={15} /></Link>
          <button
            type="button"
            className="icon-button danger-button"
            disabled={row.original.id === currentUser?.id}
            aria-label={`Delete ${row.original.username}`}
            onClick={async () => {
              if (!window.confirm(`Delete ${row.original.username || row.original.email}?`)) return
              try {
                await request(`/content/user/${encodeURIComponent(row.original.id)}`, { method: 'DELETE' })
                notify('User deleted', 'success')
                await load()
              } catch (nextError) {
                notify(nextError instanceof Error ? nextError.message : 'Delete failed', 'error')
              }
            }}
          ><Trash2 size={15} /></button>
        </div>
      ),
    },
  ], [currentUser?.id, load, notify, request])

  return (
    <div>
      <PageHeader title="User List" description="Manage your User entries here." />
      {loading ? <LoadingState label="Loading users…" /> : error ? <ErrorState error={error} retry={() => void load()} /> : <DataTable data={users} columns={columns} createTo="/users/create" searchPlaceholder="Search users…" />}
    </div>
  )
}

export function UserEditorPage({ id }: { id?: string }) {
  const { request } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [roles, setRoles] = useState<Array<Role>>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [bio, setBio] = useState('')
  const [active, setActive] = useState(true)
  const [roleIds, setRoleIds] = useState<Array<string>>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      request<Array<Role>>('/role'),
      id ? request<User>(`/content/user/${encodeURIComponent(id)}`) : Promise.resolve(null),
    ])
      .then(([availableRoles, record]) => {
        setRoles(availableRoles)
        if (record) {
          setUsername(record.username || '')
          setEmail(record.email || '')
          setFirstName(record.first_name || '')
          setLastName(record.last_name || '')
          setBio(record.bio || '')
          setActive(record.active !== false)
          setRoleIds(record.roles?.map((role) => role.id) || [])
        }
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : 'Unable to load user'))
      .finally(() => setLoading(false))
  }, [id, request])

  if (loading) return <LoadingState label="Loading user…" />
  if (error && id) return <ErrorState error={new Error(error)} />

  const title = id ? 'Edit User' : 'Create User'

  return (
    <div>
      <PageHeader title={title} description={`${id ? 'Update' : 'Create'} a FastSchema user account.`} />
      <form
        className="editor-card"
        onSubmit={async (event) => {
          event.preventDefault()
          setError('')
          const parsed = userSchema.safeParse({ username, email, password, first_name: firstName, last_name: lastName, bio, active, roles: roleIds })
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message || 'Check the form')
            return
          }
          if (!id && password.length < 8) {
            setError('Password must contain at least 8 characters')
            return
          }
          setSubmitting(true)
          try {
            const payload: Record<string, unknown> = {
              username: parsed.data.username,
              email: parsed.data.email,
              first_name: parsed.data.first_name,
              last_name: parsed.data.last_name,
              bio: parsed.data.bio,
              active: parsed.data.active,
              provider: 'local',
              roles: parsed.data.roles.map((roleId) => ({ id: roleId })),
            }
            if (password) payload.password = password
            await request(id ? `/content/user/${encodeURIComponent(id)}` : '/content/user', { method: id ? 'PUT' : 'POST', body: payload })
            notify(`User ${id ? 'updated' : 'created'}`, 'success')
            await navigate({ to: '/users' })
          } catch (nextError) {
            const message = nextError instanceof Error ? nextError.message : 'Save failed'
            setError(message)
            notify(message, 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <div className="editor-card-header">
          <div><strong>Account details</strong><span>Identity, profile, and access settings</span></div>
          <div className="form-actions"><button type="button" className="button button-outline" onClick={() => navigate({ to: '/users' })}>Cancel</button><button type="submit" className="button button-primary" disabled={submitting}>{submitting && <span className="spinner spinner-light" />}{submitting ? 'Saving…' : 'Save'}</button></div>
        </div>
        <div className="profile-form-lead"><span className="profile-form-avatar"><UserRound size={22} /></span><div><strong>{username || 'New User'}</strong><span>{email || 'Add account information below'}</span></div></div>
        <div className="form-grid form-grid-two">
          <label className="field"><span>Username <em>*</em></span><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label>
          <label className="field"><span>Email <em>*</em></span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
          <label className="field"><span>First Name</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
          <label className="field"><span>Last Name</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
          <label className="field field-span-two"><span>Password {!id && <em>*</em>}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder={id ? 'Leave blank to keep the current password' : 'At least 8 characters'} /></label>
          <label className="field field-span-two"><span>Bio</span><textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={4} /></label>
        </div>
        <section className="form-section"><h2>Roles</h2><p>Assign one or more roles to control this user's permissions.</p><div className="choice-grid">{roles.map((role) => <label key={role.id} className={`choice-card ${roleIds.includes(role.id) ? 'choice-card-selected' : ''}`}><input type="checkbox" checked={roleIds.includes(role.id)} onChange={(event) => setRoleIds((current) => event.target.checked ? [...current, role.id] : current.filter((roleId) => roleId !== role.id))} /><span><strong>{role.name}</strong><small>{role.description || (role.root ? 'Full system access' : 'Standard role')}</small></span></label>)}</div></section>
        <label className="switch-field form-section-switch"><span><strong>Active account</strong><small>Inactive users cannot log in.</small></span><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </div>
  )
}
