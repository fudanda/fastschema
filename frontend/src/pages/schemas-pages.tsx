import { Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Box, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { DataTable } from '../components/data-table'
import { EmptyState, PageHeader } from '../components/page'
import { useAuth } from '../lib/auth'
import { titleCase } from '../lib/format'
import { useToast } from '../lib/toast'
import type { Schema, SchemaField } from '../lib/types'

const schemaInputSchema = z.object({
  name: z.string().trim().regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers, and underscores'),
  namespace: z.string().trim().min(1, 'Namespace is required'),
  label_field: z.string().trim().optional(),
  fields: z.array(
    z.object({
      name: z.string().trim().regex(/^[a-z][a-z0-9_]*$/, 'Each field needs a valid name'),
      label: z.string().trim().min(1, 'Each field needs a label'),
      type: z.string().min(1),
      optional: z.boolean().optional(),
    }).passthrough(),
  ),
})

const fieldTypes = [
  'string',
  'text',
  'bool',
  'int',
  'uint',
  'float64',
  'decimal',
  'time',
  'uuid',
  'json',
  'enum',
  'relation',
  'file',
]

export function SchemasPage() {
  const { config, request, refreshConfig } = useAuth()
  const { notify } = useToast()
  const schemas = useMemo(
    () => (config?.schemas || []).filter((schema) => !schema.is_junction_schema),
    [config],
  )

  const columns = useMemo<Array<ColumnDef<Schema>>>(() => [
    {
      id: 'select',
      header: ({ table }) => <input type="checkbox" aria-label="Select all" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />,
      cell: ({ row }) => <input type="checkbox" aria-label="Select row" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />,
      enableSorting: false,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <Link className="table-link" to="/schemas/edit" search={{ schema: row.original.name }}>{titleCase(row.original.name)}</Link>,
    },
    { accessorKey: 'namespace', header: 'Namespace' },
    { accessorKey: 'label_field', header: 'Label Field', cell: ({ getValue }) => String(getValue() || '—') },
    { accessorKey: 'is_system_schema', header: 'System', cell: ({ getValue }) => <span className={`status-badge ${getValue() ? 'status-neutral' : 'status-accent'}`}>{getValue() ? 'Yes' : 'No'}</span> },
    { id: 'fields', accessorFn: (row) => row.fields.length, header: 'Fields' },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="row-actions">
          <Link className="icon-button" aria-label={`Edit ${row.original.name}`} to="/schemas/edit" search={{ schema: row.original.name }}><Pencil size={15} /></Link>
          <button
            type="button"
            className="icon-button danger-button"
            aria-label={`Delete ${row.original.name}`}
            onClick={async () => {
              if (!window.confirm(`Delete the ${row.original.name} schema and its data?`)) return
              try {
                await request(`/schema/${encodeURIComponent(row.original.name)}`, { method: 'DELETE' })
                await refreshConfig()
                notify('Schema deleted', 'success')
              } catch (error) {
                notify(error instanceof Error ? error.message : 'Delete failed', 'error')
              }
            }}
          ><Trash2 size={15} /></button>
        </div>
      ),
    },
  ], [notify, refreshConfig, request])

  return (
    <div>
      <PageHeader title="Schemas" description="Define the structure of your FastSchema content." />
      <DataTable data={schemas} columns={columns} createTo="/schemas/new" createLabel="Create Schema" searchPlaceholder="Search schemas…" />
    </div>
  )
}

function nextField(fields: Array<SchemaField>): SchemaField {
  const number = fields.length + 1
  return { name: `field_${number}`, label: `Field ${number}`, type: 'string', optional: true }
}

export function SchemaEditorPage({ schemaName }: { schemaName?: string }) {
  const { config, request, refreshConfig } = useAuth()
  const navigate = useNavigate()
  const { notify } = useToast()
  const source = config?.schemas.find((schema) => schema.name === schemaName)
  const [name, setName] = useState(source?.name || '')
  const [namespace, setNamespace] = useState(source?.namespace || '')
  const [labelField, setLabelField] = useState(source?.label_field || '')
  const [timestamps, setTimestamps] = useState(!source?.disable_timestamp)
  const [fields, setFields] = useState<Array<SchemaField>>(() => source?.fields.map((field) => ({ ...field, relation: field.relation ? { ...field.relation } : undefined })) || [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (schemaName && !source) {
    return <EmptyState icon={<Box size={22} />} title="Schema not found" description={`No schema named “${schemaName}” is available.`} />
  }

  const isEditing = Boolean(schemaName)
  const title = isEditing ? `Edit ${titleCase(source?.name || '')}` : 'Create Schema'

  const updateField = (index: number, patch: Partial<SchemaField>) => {
    setFields((current) => current.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field))
  }

  return (
    <div>
      <PageHeader title={title} description={isEditing ? 'Update schema metadata and fields.' : 'Create a reusable content model.'} />
      <form
        className="schema-editor"
        onSubmit={async (event) => {
          event.preventDefault()
          setError('')
          const payload = {
            name,
            namespace,
            label_field: labelField || undefined,
            disable_timestamp: !timestamps,
            fields,
          }
          const parsed = schemaInputSchema.safeParse(payload)
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message || 'Check the schema fields')
            return
          }
          setSubmitting(true)
          try {
            await request(isEditing ? `/schema/${encodeURIComponent(schemaName || '')}` : '/schema', {
              method: isEditing ? 'PUT' : 'POST',
              body: payload,
            })
            await refreshConfig()
            notify(`Schema ${isEditing ? 'updated' : 'created'}`, 'success')
            await navigate({ to: '/schemas' })
          } catch (nextError) {
            const message = nextError instanceof Error ? nextError.message : 'Save failed'
            setError(message)
            notify(message, 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <section className="schema-summary-card">
          <div>
            <span className="schema-icon"><Box size={20} /></span>
            <div>
              <strong>Schema: {name ? titleCase(name) : 'No Name'}</strong>
              <small>{source?.is_system_schema ? 'System Schema' : 'User Schema'} · {timestamps ? 'Timestamps' : 'No timestamps'}</small>
            </div>
          </div>
          <div className="schema-summary-meta">
            <span>Namespace: <strong>{namespace || 'No Namespace'}</strong></span>
            <span>Label Field: <strong>{labelField || 'No Label'}</strong></span>
          </div>
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? <span className="spinner spinner-light" /> : <Save size={15} />}
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </section>

        <section className="editor-card schema-details">
          <div className="form-grid form-grid-three">
            <label className="field">
              <span>Name <em>*</em></span>
              <input value={name} onChange={(event) => setName(event.target.value.toLowerCase().replace(/\s+/g, '_'))} disabled={isEditing} placeholder="article" />
              <small>Database-safe singular identifier</small>
            </label>
            <label className="field">
              <span>Namespace <em>*</em></span>
              <input value={namespace} onChange={(event) => setNamespace(event.target.value.toLowerCase().replace(/\s+/g, '_'))} placeholder="articles" />
              <small>Plural API collection name</small>
            </label>
            <label className="field">
              <span>Label Field</span>
              <select value={labelField} onChange={(event) => setLabelField(event.target.value)}>
                <option value="">No label</option>
                {fields.map((field) => <option key={field.name} value={field.name}>{field.label || field.name}</option>)}
              </select>
              <small>Used when displaying records</small>
            </label>
          </div>
          <label className="switch-field schema-timestamp-switch">
            <span><strong>Automatic timestamps</strong><small>Add created_at, updated_at, and deleted_at fields</small></span>
            <input type="checkbox" checked={timestamps} onChange={(event) => setTimestamps(event.target.checked)} />
          </label>
        </section>

        <section className="editor-card fields-editor">
          <header>
            <div><strong>Fields</strong><span>Configure the data stored by this schema.</span></div>
            <button type="button" className="button button-outline" onClick={() => setFields((current) => [...current, nextField(current)])}><Plus size={15} />Add Field</button>
          </header>
          <div className="fields-table">
            <div className="field-row field-row-header"><span>Name</span><span>Label</span><span>Type</span><span>Optional</span><span /></div>
            {fields.length ? fields.map((field, index) => (
              <div className="field-row" key={`${field.name}-${index}`}>
                <input value={field.name} onChange={(event) => updateField(index, { name: event.target.value.toLowerCase().replace(/\s+/g, '_') })} disabled={field.is_system_field || field.immutable} aria-label={`Field ${index + 1} name`} />
                <input value={field.label || ''} onChange={(event) => updateField(index, { label: event.target.value })} aria-label={`Field ${index + 1} label`} />
                <select value={field.type} onChange={(event) => updateField(index, { type: event.target.value })} disabled={field.is_system_field || field.immutable} aria-label={`Field ${index + 1} type`}>
                  {fieldTypes.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}
                </select>
                <input type="checkbox" checked={Boolean(field.optional)} onChange={(event) => updateField(index, { optional: event.target.checked })} disabled={field.immutable} aria-label={`Field ${index + 1} optional`} />
                <button type="button" className="icon-button danger-button" aria-label={`Remove ${field.name}`} disabled={field.is_system_field || field.immutable} onClick={() => setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index))}><Trash2 size={15} /></button>
              </div>
            )) : <EmptyState title="No fields yet" description="Add your first field to define this schema." />}
          </div>
        </section>

        {error && <p className="form-error schema-error" role="alert">{error}</p>}
        <footer className="sticky-form-actions">
          <button type="button" className="button button-outline" onClick={() => navigate({ to: '/schemas' })}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={submitting}><Save size={15} />Save Schema</button>
        </footer>
      </form>
    </div>
  )
}
