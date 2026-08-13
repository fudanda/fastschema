import { Link, useNavigate } from '@tanstack/react-router'
import Button from '@douyinfe/semi-ui/lib/es/button'
import Tag from '@douyinfe/semi-ui/lib/es/tag'
import { Pencil, Trash2, UserRound } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { DataTable, type DataColumn } from '../components/data-table'
import { ErrorState, LoadingState, PageHeader } from '../components/page'
import {
  ActionButton,
  CheckInput,
  TextAreaInput,
  TextInput,
  Toggle,
} from '../components/semi-controls'
import { useAuth } from '../lib/auth'
import { confirmDanger } from '../lib/confirm'
import { formatDate } from '../lib/format'
import { queryKeys, recordQueryOptions, rolesQueryOptions, usersQueryOptions } from '../lib/queries'
import { useToast } from '../lib/toast'
import { m } from '../paraglide/messages.js'
import type { User } from '../lib/types'

const userSchema = z.object({
  username: z.string().trim().min(2, m.user_username_min()),
  email: z.string().email(m.auth_email_invalid()),
  password: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  bio: z.string().optional(),
  active: z.boolean(),
  roles: z.array(z.string()),
})

export function UsersPage() {
  const { request, user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const usersQuery = useQuery(usersQueryOptions())
  const { notify } = useToast()
  const users = usersQuery.data || []

  const columns = useMemo<Array<DataColumn<User>>>(
    () => [
      {
        dataIndex: 'id',
        title: m.common_id(),
        sorter: (left, right) => left.id.localeCompare(right.id),
        render: (_value, record) => (
          <Link className="table-link monospace-cell" to="/users/edit" search={{ id: record.id }}>
            {record.id}
          </Link>
        ),
      },
      {
        dataIndex: 'username',
        title: m.field_username(),
        sorter: (left, right) => (left.username || '').localeCompare(right.username || ''),
        render: (_value, record) => (
          <Link className="table-link" to="/users/edit" search={{ id: record.id }}>
            {record.username || '—'}
          </Link>
        ),
      },
      { dataIndex: 'email', title: m.common_email() },
      {
        dataIndex: 'active',
        title: m.common_active(),
        render: (value) => (
          <Tag color={value ? 'green' : 'grey'}>
            {value ? m.common_active() : m.common_inactive()}
          </Tag>
        ),
      },
      {
        key: 'roles',
        title: m.field_roles(),
        render: (_value, record) => (
          <div className="badge-list">
            {record.roles?.map((role) => (
              <Tag color="grey" key={role.id}>
                {role.name}
              </Tag>
            )) || '—'}
          </div>
        ),
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
              to="/users/edit"
              search={{ id: record.id }}
              aria-label={m.user_edit_label({
                name: record.username || record.email || m.common_user(),
              })}
            >
              <Button theme="borderless" icon={<Pencil size={15} />} />
            </Link>
            <Button
              theme="borderless"
              type="danger"
              icon={<Trash2 size={15} />}
              disabled={record.id === currentUser?.id}
              aria-label={m.user_delete_label({
                name: record.username || record.email || m.common_user(),
              })}
              onClick={async () => {
                if (
                  !(await confirmDanger(
                    m.user_delete_confirm({
                      name: record.username || record.email || m.common_user(),
                    }),
                  ))
                )
                  return
                try {
                  await request(`/content/user/${encodeURIComponent(record.id)}`, {
                    method: 'DELETE',
                  })
                  notify(m.user_deleted(), 'success')
                  await queryClient.invalidateQueries({ queryKey: queryKeys.users })
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
    [currentUser?.id, notify, queryClient, request],
  )

  return (
    <div>
      <PageHeader title={m.user_list_title()} description={m.user_list_description()} />
      {usersQuery.isPending ? (
        <LoadingState label={m.user_loading_list()} />
      ) : usersQuery.error ? (
        <ErrorState error={usersQuery.error} retry={() => void usersQuery.refetch()} />
      ) : (
        <DataTable
          data={users}
          columns={columns}
          createTo="/users/create"
          searchPlaceholder={m.user_search()}
        />
      )}
    </div>
  )
}

export function UserEditorPage({ id }: { id?: string }) {
  const { request } = useAuth()
  const queryClient = useQueryClient()
  const rolesQuery = useQuery(rolesQueryOptions())
  const recordQuery = useQuery(recordQueryOptions('user', id || ''))
  const { notify } = useToast()
  const navigate = useNavigate()
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
    const record = recordQuery.data as User | undefined
    if (!record) return
    setUsername(record.username || '')
    setEmail(record.email || '')
    setFirstName(record.first_name || '')
    setLastName(record.last_name || '')
    setBio(record.bio || '')
    setActive(record.active !== false)
    setRoleIds(record.roles?.map((role) => role.id) || [])
  }, [recordQuery.data])

  useEffect(() => {
    const queryError = rolesQuery.error || recordQuery.error
    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : m.user_load_failed())
    }
    setLoading(rolesQuery.isPending || Boolean(id && recordQuery.isPending))
  }, [id, recordQuery.error, recordQuery.isPending, rolesQuery.error, rolesQuery.isPending])

  if (loading) return <LoadingState label={m.user_loading()} />
  if (error && id) return <ErrorState error={new Error(error)} />

  const title = id ? m.user_edit_title() : m.user_create_title()

  return (
    <div>
      <PageHeader
        title={title}
        description={m.user_editor_description({
          action: id ? m.user_action_update() : m.user_action_create(),
        })}
      />
      <form
        className="editor-card"
        onSubmit={async (event) => {
          event.preventDefault()
          setError('')
          const parsed = userSchema.safeParse({
            username,
            email,
            password,
            first_name: firstName,
            last_name: lastName,
            bio,
            active,
            roles: roleIds,
          })
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message || m.common_check_form())
            return
          }
          if (!id && password.length < 8) {
            setError(m.user_password_min())
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
            await request(id ? `/content/user/${encodeURIComponent(id)}` : '/content/user', {
              method: id ? 'PUT' : 'POST',
              body: payload,
            })
            await queryClient.invalidateQueries({ queryKey: queryKeys.users })
            notify(id ? m.user_updated() : m.user_created(), 'success')
            await navigate({ to: '/users' })
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
            <strong>{m.user_account_details()}</strong>
            <span>{m.user_account_details_help()}</span>
          </div>
          <div className="form-actions">
            <ActionButton
              type="button"
              className="button button-outline"
              onClick={() => navigate({ to: '/users' })}
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
            <UserRound size={22} />
          </span>
          <div>
            <strong>{username || m.user_new()}</strong>
            <span>{email || m.user_add_information()}</span>
          </div>
        </div>
        <div className="form-grid form-grid-two">
          <label className="field">
            <span>
              {m.field_username()} <em>*</em>
            </span>
            <TextInput
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="field">
            <span>
              {m.common_email()} <em>*</em>
            </span>
            <TextInput
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span>{m.field_first_name()}</span>
            <TextInput value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </label>
          <label className="field">
            <span>{m.field_last_name()}</span>
            <TextInput value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </label>
          <label className="field field-span-two">
            <span>
              {m.common_password()} {!id && <em>*</em>}
            </span>
            <TextInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              placeholder={id ? m.user_keep_password() : m.user_password_placeholder()}
            />
          </label>
          <label className="field field-span-two">
            <span>{m.field_bio()}</span>
            <TextAreaInput value={bio} onChange={(event) => setBio(event.target.value)} rows={4} />
          </label>
        </div>
        <section className="form-section">
          <h2>{m.field_roles()}</h2>
          <p>{m.user_roles_help()}</p>
          <div className="choice-grid">
            {(rolesQuery.data || []).map((role) => (
              <label
                key={role.id}
                className={`choice-card ${roleIds.includes(role.id) ? 'choice-card-selected' : ''}`}
              >
                <CheckInput
                  type="checkbox"
                  checked={roleIds.includes(role.id)}
                  onChange={(event) =>
                    setRoleIds((current) =>
                      event.target.checked
                        ? [...current, role.id]
                        : current.filter((roleId) => roleId !== role.id),
                    )
                  }
                />
                <span>
                  <strong>{role.name}</strong>
                  <small>
                    {role.description ||
                      (role.root ? m.user_full_access() : m.user_standard_role())}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </section>
        <label className="switch-field form-section-switch">
          <span>
            <strong>{m.user_active_account()}</strong>
            <small>{m.user_inactive_help()}</small>
          </span>
          <Toggle checked={active} onChange={setActive} />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
