import { Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Braces, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DataTable } from '../components/data-table'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/page'
import { withQuery } from '../lib/api'
import { useAuth } from '../lib/auth'
import { displayValue, formatDate, titleCase } from '../lib/format'
import { useToast } from '../lib/toast'
import type {
  ContentRecord,
  Pagination,
  Schema,
  SchemaField,
} from '../lib/types'

const hiddenFields = new Set(['deleted_at', 'password'])

function useSchema(schemaName: string) {
  const { config } = useAuth()
  return config?.schemas.find((schema) => schema.name === schemaName)
}

function recordId(record: ContentRecord) {
  return String(record.id ?? '')
}

export function ContentListPage({ schemaName }: { schemaName: string }) {
  const schema = useSchema(schemaName)
  const { request } = useAuth()
  const { notify } = useToast()
  const [data, setData] = useState<Array<ContentRecord>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>()

  const load = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const result = await request<Pagination<ContentRecord>>(
        withQuery(`/content/${encodeURIComponent(schemaName)}`, { limit: 100 }),
      )
      setData(result.items || [])
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [request, schemaName])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo<Array<ColumnDef<ContentRecord>>>(() => {
    if (!schema) return []
    const visibleFields = schema.fields
      .filter((field) => !hiddenFields.has(field.name) && field.type !== 'file')
      .slice(0, 7)

    return [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select all"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label="Select row"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        enableSorting: false,
      },
      ...visibleFields.map<ColumnDef<ContentRecord>>((field) => ({
        id: field.name,
        accessorFn: (row) => row[field.name],
        header: field.label || titleCase(field.name),
        cell: ({ row }) => {
          const value = row.original[field.name]
          const label = field.type === 'time' ? formatDate(value) : displayValue(value)
          if (field.name === 'id' || field.name === schema.label_field) {
            return (
              <Link
                className="table-link"
                to="/content/$schemaName/edit"
                params={{ schemaName }}
                search={{ id: recordId(row.original) }}
              >
                {label}
              </Link>
            )
          }
          return <span className="cell-truncate">{label}</span>
        },
      })),
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="row-actions">
            <Link
              className="icon-button"
              aria-label="Edit record"
              to="/content/$schemaName/edit"
              params={{ schemaName }}
              search={{ id: recordId(row.original) }}
            >
              <Pencil size={15} />
            </Link>
            <button
              type="button"
              className="icon-button danger-button"
              aria-label="Delete record"
              onClick={async () => {
                if (!window.confirm('Delete this record? This action cannot be undone.')) return
                try {
                  await request(`/content/${encodeURIComponent(schemaName)}/${encodeURIComponent(recordId(row.original))}`, {
                    method: 'DELETE',
                  })
                  notify('Record deleted', 'success')
                  await load()
                } catch (nextError) {
                  notify(nextError instanceof Error ? nextError.message : 'Delete failed', 'error')
                }
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      },
    ]
  }, [load, notify, request, schema, schemaName])

  if (!schema) {
    return (
      <EmptyState
        icon={<Braces size={22} />}
        title="Schema not found"
        description={`FastSchema did not return a schema named “${schemaName}”.`}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title={`${titleCase(schema.name)} List`}
        description={`Manage your ${titleCase(schema.name)} entries here.`}
      />
      {loading ? (
        <LoadingState label={`Loading ${schema.namespace || schema.name}…`} />
      ) : error ? (
        <ErrorState error={error} retry={() => void load()} />
      ) : (
        <DataTable
          data={data}
          columns={columns}
          createTo={`/content/${schemaName}/create`}
          searchPlaceholder={`Search ${schema.namespace || schema.name}…`}
        />
      )}
    </div>
  )
}

type FormValue = string | boolean

function editableFields(schema: Schema) {
  return schema.fields.filter(
    (field) =>
      !field.immutable &&
      !hiddenFields.has(field.name) &&
      !['id', 'created_at', 'updated_at', 'deleted_at'].includes(field.name),
  )
}

function initialValue(field: SchemaField, value?: unknown): FormValue {
  if (field.type === 'bool') return Boolean(value ?? field.default ?? false)
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  if (field.type === 'time') {
    const date = new Date(String(value))
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 16)
  }
  return String(value)
}

function parseValue(field: SchemaField, value: FormValue) {
  if (field.type === 'bool') return Boolean(value)
  if (value === '') return field.optional ? null : value
  if (['int', 'int8', 'int16', 'int32', 'int64', 'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'float32', 'float64'].includes(field.type)) {
    return Number(value)
  }
  if (['json', 'relation', 'file'].includes(field.type)) {
    try {
      return JSON.parse(String(value))
    } catch {
      throw new Error(`${field.label || field.name} must contain valid JSON`)
    }
  }
  if (field.type === 'time') return new Date(String(value)).toISOString()
  return value
}

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: SchemaField
  value: FormValue
  onChange: (value: FormValue) => void
}) {
  const id = `field-${field.name}`
  if (field.type === 'bool') {
    return (
      <label className="switch-field" htmlFor={id}>
        <span>
          <strong>{field.label || titleCase(field.name)}</strong>
          <small>{field.optional ? 'Optional' : 'Required'}</small>
        </span>
        <input id={id} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
      </label>
    )
  }

  const isTextarea = ['text', 'json', 'relation', 'file'].includes(field.type)
  return (
    <label className="field" htmlFor={id}>
      <span>
        {field.label || titleCase(field.name)}
        {!field.optional && <em>*</em>}
      </span>
      {field.enums?.length ? (
        <select id={id} value={String(value)} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select…</option>
          {field.enums.map((option) => <option key={String(option)} value={String(option)}>{String(option)}</option>)}
        </select>
      ) : isTextarea ? (
        <textarea
          id={id}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          rows={field.type === 'text' ? 5 : 3}
          placeholder={field.type === 'relation' ? 'Relation value as JSON' : undefined}
        />
      ) : (
        <input
          id={id}
          type={field.type === 'time' ? 'datetime-local' : field.type.includes('int') || field.type.includes('float') ? 'number' : 'text'}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <small>{titleCase(field.type)} field{field.optional ? ' · Optional' : ''}</small>
    </label>
  )
}

export function ContentEditorPage({
  schemaName,
  id,
}: {
  schemaName: string
  id?: string
}) {
  const schema = useSchema(schemaName)
  const { request } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [values, setValues] = useState<Record<string, FormValue>>({})
  const [loading, setLoading] = useState(Boolean(id))
  const [submitting, setSubmitting] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<unknown>()

  const fields = useMemo(() => (schema ? editableFields(schema) : []), [schema])

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  useEffect(() => {
    if (!schema) return
    if (!id) {
      setValues(Object.fromEntries(fields.map((field) => [field.name, initialValue(field)])))
      return
    }

    setLoading(true)
    request<ContentRecord>(`/content/${encodeURIComponent(schemaName)}/${encodeURIComponent(id)}`)
      .then((record) => {
        setValues(Object.fromEntries(fields.map((field) => [field.name, initialValue(field, record[field.name])])))
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [fields, id, request, schema, schemaName])

  if (!schema) return <EmptyState title="Schema not found" />
  if (loading) return <LoadingState label="Loading record…" />
  if (error) return <ErrorState error={error} />

  const title = `${id ? 'Edit' : 'Create'} ${titleCase(schema.name)}`

  return (
    <div>
      <PageHeader title={title} description={`${id ? 'Update' : 'Add'} a ${titleCase(schema.name)} entry.`} />
      <form
        className="editor-card"
        onSubmit={async (event) => {
          event.preventDefault()
          setSubmitting(true)
          try {
            const payload = Object.fromEntries(fields.map((field) => [field.name, parseValue(field, values[field.name] ?? '')]))
            const path = id
              ? `/content/${encodeURIComponent(schemaName)}/${encodeURIComponent(id)}`
              : `/content/${encodeURIComponent(schemaName)}`
            await request(path, { method: id ? 'PUT' : 'POST', body: payload })
            setDirty(false)
            notify(`${titleCase(schema.name)} ${id ? 'updated' : 'created'}`, 'success')
            await navigate({ to: '/content/$schemaName', params: { schemaName } })
          } catch (nextError) {
            notify(nextError instanceof Error ? nextError.message : 'Save failed', 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <div className="editor-card-header">
          <div>
            <strong>{title}</strong>
            <span>{fields.length} editable fields</span>
          </div>
          <div className="form-actions">
            <button type="button" className="button button-outline" onClick={() => navigate({ to: '/content/$schemaName', params: { schemaName } })}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting && <span className="spinner spinner-light" />}
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        <div className="form-grid">
          {fields.map((field) => (
            <DynamicField
              key={field.name}
              field={field}
              value={values[field.name] ?? initialValue(field)}
              onChange={(value) => {
                setDirty(true)
                setValues((current) => ({ ...current, [field.name]: value }))
              }}
            />
          ))}
        </div>
      </form>
    </div>
  )
}
