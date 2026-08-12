import { Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { DataTable } from '../components/data-table'
import { ErrorState, LoadingState, PageHeader } from '../components/page'
import { useAuth } from '../lib/auth'
import { formatDate } from '../lib/format'
import { useToast } from '../lib/toast'
import type { Permission, Role } from '../lib/types'

const roleSchema = z.object({
  name: z.string().trim().min(2, 'Role name must contain at least 2 characters'),
  description: z.string().optional(),
  root: z.boolean(),
  rule: z.string().optional(),
  permissions: z.array(z.object({ resource: z.string().min(1), value: z.string().min(1), modifier: z.record(z.string(), z.unknown()).nullable().optional() })),
})

export function RolesPage() {
  const { request } = useAuth()
  const { notify } = useToast()
  const [roles, setRoles] = useState<Array<Role>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>()

  const load = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      setRoles(await request<Array<Role>>('/role'))
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [request])

  useEffect(() => { void load() }, [load])

  const columns = useMemo<Array<ColumnDef<Role>>>(() => [
    {
      id: 'select',
      header: ({ table }) => <input type="checkbox" aria-label="Select all" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />,
      cell: ({ row }) => <input type="checkbox" aria-label="Select row" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />,
      enableSorting: false,
    },
    { accessorKey: 'id', header: 'Id', cell: ({ row }) => <Link className="table-link monospace-cell" to="/roles/edit" search={{ id: row.original.id }}>{row.original.id}</Link> },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <Link className="table-link" to="/roles/edit" search={{ id: row.original.id }}>{row.original.name}</Link> },
    { accessorKey: 'root', header: 'Root', cell: ({ getValue }) => <span className={`status-badge ${getValue() ? 'status-accent' : 'status-neutral'}`}>{getValue() ? 'Yes' : 'No'}</span> },
    { accessorKey: 'system', header: 'System', cell: ({ getValue }) => <span className="status-badge status-neutral">{getValue() ? 'Yes' : 'No'}</span> },
    { id: 'permissions', accessorFn: (row) => row.permissions?.length || 0, header: 'Permissions' },
    { id: 'users', accessorFn: (row) => row.users?.length || 0, header: 'Users' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => String(getValue() || '—') },
    { accessorKey: 'created_at', header: 'Created At', cell: ({ getValue }) => formatDate(getValue()) },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="row-actions">
          <Link className="icon-button" to="/roles/edit" search={{ id: row.original.id }} aria-label={`Edit ${row.original.name}`}><Pencil size={15} /></Link>
          <button
            type="button"
            className="icon-button danger-button"
            disabled={row.original.system || row.original.root}
            aria-label={`Delete ${row.original.name}`}
            onClick={async () => {
              if (!window.confirm(`Delete the ${row.original.name} role?`)) return
              try {
                await request(`/role/${encodeURIComponent(row.original.id)}`, { method: 'DELETE' })
                notify('Role deleted', 'success')
                await load()
              } catch (nextError) {
                notify(nextError instanceof Error ? nextError.message : 'Delete failed', 'error')
              }
            }}
          ><Trash2 size={15} /></button>
        </div>
      ),
    },
  ], [load, notify, request])

  return (
    <div>
      <PageHeader title="Role List" description="Manage your Role entries here." />
      {loading ? <LoadingState label="Loading roles…" /> : error ? <ErrorState error={error} retry={() => void load()} /> : <DataTable data={roles} columns={columns} createTo="/roles/create" searchPlaceholder="Search roles…" />}
    </div>
  )
}

function emptyPermission(): Permission {
  return { resource: 'api.content.*', value: 'allow', modifier: null }
}

export function RoleEditorPage({ id }: { id?: string }) {
  const { request } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(Boolean(id))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [root, setRoot] = useState(false)
  const [system, setSystem] = useState(false)
  const [rule, setRule] = useState('')
  const [permissions, setPermissions] = useState<Array<Permission>>([])

  useEffect(() => {
    if (!id) return
    request<Role>(`/role/${encodeURIComponent(id)}`)
      .then((record) => {
        setName(record.name)
        setDescription(record.description || '')
        setRoot(Boolean(record.root))
        setSystem(Boolean(record.system))
        setRule(record.rule || '')
        setPermissions(record.permissions || [])
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : 'Unable to load role'))
      .finally(() => setLoading(false))
  }, [id, request])

  if (loading) return <LoadingState label="Loading role…" />
  if (error && id && !name) return <ErrorState error={new Error(error)} />

  const title = id ? 'Edit Role' : 'Create Role'

  return (
    <div>
      <PageHeader title={title} description="Configure role identity and API permissions." />
      <form
        className="editor-card"
        onSubmit={async (event) => {
          event.preventDefault()
          setError('')
          const parsed = roleSchema.safeParse({ name, description, root, rule, permissions })
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message || 'Check the role')
            return
          }
          setSubmitting(true)
          try {
            await request(id ? `/role/${encodeURIComponent(id)}` : '/role', { method: id ? 'PUT' : 'POST', body: parsed.data })
            notify(`Role ${id ? 'updated' : 'created'}`, 'success')
            await navigate({ to: '/roles' })
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
          <div><strong>Role details</strong><span>Name and access level</span></div>
          <div className="form-actions"><button type="button" className="button button-outline" onClick={() => navigate({ to: '/roles' })}>Cancel</button><button type="submit" className="button button-primary" disabled={submitting}>{submitting && <span className="spinner spinner-light" />}{submitting ? 'Saving…' : 'Save'}</button></div>
        </div>
        <div className="profile-form-lead"><span className="profile-form-avatar"><ShieldCheck size={22} /></span><div><strong>{name || 'New Role'}</strong><span>{root ? 'Root access' : 'Custom permission set'}</span></div></div>
        <div className="form-grid form-grid-two">
          <label className="field"><span>Name <em>*</em></span><input value={name} onChange={(event) => setName(event.target.value)} disabled={system} /></label>
          <label className="field"><span>Rule</span><input value={rule} onChange={(event) => setRule(event.target.value)} placeholder="Optional role rule" /></label>
          <label className="field field-span-two"><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></label>
        </div>
        <label className="switch-field form-section-switch"><span><strong>Root access</strong><small>Allow every resource and action without individual permission checks.</small></span><input type="checkbox" checked={root} onChange={(event) => setRoot(event.target.checked)} disabled={system} /></label>

        {!root && (
          <section className="form-section permissions-editor">
            <header><div><h2>Permissions</h2><p>Use resource patterns such as api.content.post.*.</p></div><button type="button" className="button button-outline" onClick={() => setPermissions((current) => [...current, emptyPermission()])}><Plus size={15} />Add Permission</button></header>
            <div className="permission-table">
              <div className="permission-row permission-row-header"><span>Resource</span><span>Value</span><span /></div>
              {permissions.length ? permissions.map((permission, index) => (
                <div className="permission-row" key={`${permission.resource}-${index}`}>
                  <input value={permission.resource} onChange={(event) => setPermissions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, resource: event.target.value } : item))} aria-label={`Permission ${index + 1} resource`} />
                  <select value={permission.value} onChange={(event) => setPermissions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} aria-label={`Permission ${index + 1} value`}><option value="allow">Allow</option><option value="deny">Deny</option></select>
                  <button type="button" className="icon-button danger-button" aria-label={`Remove permission ${index + 1}`} onClick={() => setPermissions((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>
                </div>
              )) : <p className="permission-empty">No explicit permissions. Add one or enable root access.</p>}
            </div>
          </section>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </div>
  )
}
