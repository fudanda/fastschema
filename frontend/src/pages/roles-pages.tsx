import { Link, useNavigate } from '@tanstack/react-router'
import Button from '@douyinfe/semi-ui/lib/es/button'
import Tag from '@douyinfe/semi-ui/lib/es/tag'
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { DataTable, type DataColumn } from '../components/data-table'
import { ErrorState, LoadingState, PageHeader } from '../components/page'
import {
  ActionButton,
  SelectInput,
  TextAreaInput,
  TextInput,
  Toggle,
} from '../components/semi-controls'
import { useAuth } from '../lib/auth'
import { confirmDanger } from '../lib/confirm'
import { formatDate } from '../lib/format'
import { queryKeys, rolesQueryOptions } from '../lib/queries'
import { useToast } from '../lib/toast'
import { m } from '../paraglide/messages.js'
import type { Permission, Role } from '../lib/types'

const roleSchema = z.object({
  name: z.string().trim().min(2, m.role_name_min()),
  description: z.string().optional(),
  root: z.boolean(),
  rule: z.string().optional(),
  permissions: z.array(
    z.object({
      resource: z.string().min(1),
      value: z.string().min(1),
      modifier: z.record(z.string(), z.unknown()).nullable().optional(),
    }),
  ),
})

export function RolesPage() {
  const { request } = useAuth()
  const queryClient = useQueryClient()
  const rolesQuery = useQuery(rolesQueryOptions())
  const { notify } = useToast()
  const roles = rolesQuery.data || []

  const columns = useMemo<Array<DataColumn<Role>>>(
    () => [
      {
        dataIndex: 'id',
        title: m.common_id(),
        sorter: (left, right) => left.id.localeCompare(right.id),
        render: (_value, record) => (
          <Link className="table-link monospace-cell" to="/roles/edit" search={{ id: record.id }}>
            {record.id}
          </Link>
        ),
      },
      {
        dataIndex: 'name',
        title: m.common_name(),
        sorter: (left, right) => left.name.localeCompare(right.name),
        render: (_value, record) => (
          <Link className="table-link" to="/roles/edit" search={{ id: record.id }}>
            {record.name}
          </Link>
        ),
      },
      {
        dataIndex: 'root',
        title: m.field_root(),
        render: (value) => (
          <Tag color={value ? 'orange' : 'grey'}>{value ? m.common_yes() : m.common_no()}</Tag>
        ),
      },
      {
        dataIndex: 'system',
        title: m.field_system(),
        render: (value) => <Tag color="grey">{value ? m.common_yes() : m.common_no()}</Tag>,
      },
      {
        key: 'permissions',
        title: m.field_permissions(),
        render: (_value, record) => record.permissions?.length || 0,
      },
      { key: 'users', title: m.nav_users(), render: (_value, record) => record.users?.length || 0 },
      {
        dataIndex: 'description',
        title: m.common_description(),
        render: (value) => String(value || '—'),
      },
      {
        dataIndex: 'created_at',
        title: m.field_created_at(),
        render: (value) => formatDate(value),
      },
      {
        key: 'actions',
        title: m.common_actions(),
        width: 112,
        render: (_value, record) => (
          <div className="row-actions">
            <Link
              to="/roles/edit"
              search={{ id: record.id }}
              aria-label={m.role_edit_label({ name: record.name })}
            >
              <Button theme="borderless" icon={<Pencil size={15} />} />
            </Link>
            <Button
              theme="borderless"
              type="danger"
              icon={<Trash2 size={15} />}
              disabled={record.system || record.root}
              aria-label={m.role_delete_label({ name: record.name })}
              onClick={async () => {
                if (!(await confirmDanger(m.role_delete_confirm({ name: record.name })))) return
                try {
                  await request(`/role/${encodeURIComponent(record.id)}`, {
                    method: 'DELETE',
                  })
                  notify(m.role_deleted(), 'success')
                  await queryClient.invalidateQueries({ queryKey: queryKeys.roles })
                } catch (nextError) {
                  notify(
                    nextError instanceof Error ? nextError.message : m.common_delete_failed(),
                    'error',
                  )
                }
              }}
            />
          </div>
        ),
      },
    ],
    [notify, queryClient, request],
  )

  return (
    <div>
      <PageHeader title={m.role_list_title()} description={m.role_list_description()} />
      {rolesQuery.isPending ? (
        <LoadingState label={m.role_loading_list()} />
      ) : rolesQuery.error ? (
        <ErrorState error={rolesQuery.error} retry={() => void rolesQuery.refetch()} />
      ) : (
        <DataTable
          data={roles}
          columns={columns}
          createTo="/roles/create"
          searchPlaceholder={m.role_search()}
        />
      )}
    </div>
  )
}

function emptyPermission(): Permission {
  return { resource: 'api.content.*', value: 'allow', modifier: null }
}

export function RoleEditorPage({ id }: { id?: string }) {
  const { request } = useAuth()
  const queryClient = useQueryClient()
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
      .catch((nextError) =>
        setError(nextError instanceof Error ? nextError.message : m.role_load_failed()),
      )
      .finally(() => setLoading(false))
  }, [id, request])

  if (loading) return <LoadingState label={m.role_loading()} />
  if (error && id && !name) return <ErrorState error={new Error(error)} />

  const title = id ? m.role_edit_title() : m.role_create_title()

  return (
    <div>
      <PageHeader title={title} description={m.role_editor_description()} />
      <form
        className="editor-card"
        onSubmit={async (event) => {
          event.preventDefault()
          setError('')
          const parsed = roleSchema.safeParse({ name, description, root, rule, permissions })
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message || m.role_check())
            return
          }
          setSubmitting(true)
          try {
            await request(id ? `/role/${encodeURIComponent(id)}` : '/role', {
              method: id ? 'PUT' : 'POST',
              body: parsed.data,
            })
            await queryClient.invalidateQueries({ queryKey: queryKeys.roles })
            notify(id ? m.role_updated() : m.role_created(), 'success')
            await navigate({ to: '/roles' })
          } catch (nextError) {
            const message = nextError instanceof Error ? nextError.message : m.common_save_failed()
            setError(message)
            notify(message, 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <div className="editor-card-header">
          <div>
            <strong>{m.role_details()}</strong>
            <span>{m.role_details_help()}</span>
          </div>
          <div className="form-actions">
            <ActionButton
              type="button"
              className="button button-outline"
              onClick={() => navigate({ to: '/roles' })}
            >
              {m.common_cancel()}
            </ActionButton>
            <ActionButton
              type="submit"
              className="button button-primary"
              loading={submitting}
              disabled={submitting}
            >
              {submitting && <span className="spinner spinner-light" />}
              {submitting ? m.common_saving() : m.common_save()}
            </ActionButton>
          </div>
        </div>
        <div className="profile-form-lead">
          <span className="profile-form-avatar">
            <ShieldCheck size={22} />
          </span>
          <div>
            <strong>{name || m.role_new()}</strong>
            <span>{root ? m.role_root_access() : m.role_custom_permissions()}</span>
          </div>
        </div>
        <div className="form-grid form-grid-two">
          <label className="field">
            <span>
              {m.common_name()} <em>*</em>
            </span>
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={system}
            />
          </label>
          <label className="field">
            <span>{m.field_rule()}</span>
            <TextInput
              value={rule}
              onChange={(event) => setRule(event.target.value)}
              placeholder={m.role_rule_placeholder()}
            />
          </label>
          <label className="field field-span-two">
            <span>{m.common_description()}</span>
            <TextAreaInput
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </label>
        </div>
        <label className="switch-field form-section-switch">
          <span>
            <strong>{m.role_root_access()}</strong>
            <small>{m.role_root_help()}</small>
          </span>
          <Toggle checked={root} onChange={setRoot} disabled={system} />
        </label>

        {!root && (
          <section className="form-section permissions-editor">
            <header>
              <div>
                <h2>{m.field_permissions()}</h2>
                <p>{m.role_permission_patterns()}</p>
              </div>
              <ActionButton
                type="button"
                className="button button-outline"
                onClick={() => setPermissions((current) => [...current, emptyPermission()])}
              >
                <Plus size={15} />
                {m.role_add_permission()}
              </ActionButton>
            </header>
            <div className="permission-table">
              <div className="permission-row permission-row-header">
                <span>{m.field_resource()}</span>
                <span>{m.field_value()}</span>
                <span />
              </div>
              {permissions.length ? (
                permissions.map((permission, index) => (
                  <div className="permission-row" key={`${permission.resource}-${index}`}>
                    <TextInput
                      value={permission.resource}
                      onChange={(event) =>
                        setPermissions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, resource: event.target.value } : item,
                          ),
                        )
                      }
                      aria-label={m.role_permission_resource_label({ index: index + 1 })}
                    />
                    <SelectInput
                      value={permission.value}
                      onChange={(event) =>
                        setPermissions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, value: event.target.value } : item,
                          ),
                        )
                      }
                      aria-label={m.role_permission_value_label({ index: index + 1 })}
                    >
                      <option value="allow">{m.role_allow()}</option>
                      <option value="deny">{m.role_deny()}</option>
                    </SelectInput>
                    <ActionButton
                      type="button"
                      className="icon-button danger-button"
                      aria-label={m.role_remove_permission_label({ index: index + 1 })}
                      onClick={() =>
                        setPermissions((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </ActionButton>
                  </div>
                ))
              ) : (
                <p className="permission-empty">{m.role_no_permissions()}</p>
              )}
            </div>
          </section>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
