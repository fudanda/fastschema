import { Link, useNavigate } from '@tanstack/react-router'
import Button from '@douyinfe/semi-ui/lib/es/button'
import Tag from '@douyinfe/semi-ui/lib/es/tag'
import { Box, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { DataTable, type DataColumn } from '../components/data-table'
import { EmptyState, PageHeader } from '../components/page'
import {
  ActionButton,
  CheckInput,
  SelectInput,
  TextInput,
  Toggle,
} from '../components/semi-controls'
import { useAuth } from '../lib/auth'
import { confirmDanger } from '../lib/confirm'
import { titleCase } from '../lib/format'
import { useToast } from '../lib/toast'
import { m } from '../paraglide/messages.js'
import type { Schema, SchemaField } from '../lib/types'

const schemaInputSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/, m.schema_name_pattern()),
  namespace: z.string().trim().min(1, m.schema_namespace_required()),
  label_field: z.string().trim().optional(),
  fields: z.array(
    z
      .object({
        name: z
          .string()
          .trim()
          .regex(/^[a-z][a-z0-9_]*$/, m.schema_field_name_invalid()),
        label: z.string().trim().min(1, m.schema_field_label_required()),
        type: z.string().min(1),
        optional: z.boolean().optional(),
      })
      .passthrough(),
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

  const columns = useMemo<Array<DataColumn<Schema>>>(
    () => [
      {
        dataIndex: 'name',
        title: m.common_name(),
        sorter: (left, right) => left.name.localeCompare(right.name),
        render: (_value, record) => (
          <Link className="table-link" to="/schemas/edit" search={{ schema: record.name }}>
            {titleCase(record.name)}
          </Link>
        ),
      },
      { dataIndex: 'namespace', title: m.field_namespace() },
      {
        dataIndex: 'label_field',
        title: m.field_label_field(),
        render: (value) => String(value || '—'),
      },
      {
        dataIndex: 'is_system_schema',
        title: m.field_system(),
        render: (value) => (
          <Tag color={value ? 'grey' : 'orange'}>{value ? m.common_yes() : m.common_no()}</Tag>
        ),
      },
      { key: 'fields', title: m.field_fields(), render: (_value, record) => record.fields.length },
      {
        key: 'actions',
        title: m.common_actions(),
        width: 112,
        render: (_value, record) => (
          <div className="row-actions">
            <Link
              aria-label={m.schema_edit_label({ name: record.name })}
              to="/schemas/edit"
              search={{ schema: record.name }}
            >
              <Button theme="borderless" icon={<Pencil size={15} />} />
            </Link>
            <Button
              theme="borderless"
              type="danger"
              icon={<Trash2 size={15} />}
              aria-label={m.schema_delete_label({ name: record.name })}
              onClick={async () => {
                if (!(await confirmDanger(m.schema_delete_confirm({ name: record.name })))) return
                try {
                  await request(`/schema/${encodeURIComponent(record.name)}`, {
                    method: 'DELETE',
                  })
                  await refreshConfig()
                  notify(m.schema_deleted(), 'success')
                } catch (error) {
                  notify(error instanceof Error ? error.message : m.common_delete_failed(), 'error')
                }
              }}
            />
          </div>
        ),
      },
    ],
    [notify, refreshConfig, request],
  )

  return (
    <div>
      <PageHeader title={m.schema_title()} description={m.schema_description()} />
      <DataTable
        data={schemas}
        columns={columns}
        createTo="/schemas/new"
        createLabel={m.schema_create()}
        searchPlaceholder={m.schema_search()}
      />
    </div>
  )
}

function nextField(fields: Array<SchemaField>): SchemaField {
  const number = fields.length + 1
  return {
    name: `field_${number}`,
    label: m.schema_default_field({ number }),
    type: 'string',
    optional: true,
  }
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
  const [fields, setFields] = useState<Array<SchemaField>>(
    () =>
      source?.fields.map((field) => ({
        ...field,
        relation: field.relation ? { ...field.relation } : undefined,
      })) || [],
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (schemaName && !source) {
    return (
      <EmptyState
        icon={<Box size={22} />}
        title={m.schema_not_found()}
        description={m.schema_not_found_description({ name: schemaName })}
      />
    )
  }

  const isEditing = Boolean(schemaName)
  const title = isEditing
    ? m.schema_edit_title({ name: titleCase(source?.name || '') })
    : m.schema_create_title()

  const updateField = (index: number, patch: Partial<SchemaField>) => {
    setFields((current) =>
      current.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...patch } : field)),
    )
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={isEditing ? m.schema_edit_description() : m.schema_create_description()}
      />
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
            setError(parsed.error.issues[0]?.message || m.schema_check_fields())
            return
          }
          setSubmitting(true)
          try {
            await request(
              isEditing ? `/schema/${encodeURIComponent(schemaName || '')}` : '/schema',
              {
                method: isEditing ? 'PUT' : 'POST',
                body: payload,
              },
            )
            await refreshConfig()
            notify(isEditing ? m.schema_updated() : m.schema_created(), 'success')
            await navigate({ to: '/schemas' })
          } catch (nextError) {
            const message = nextError instanceof Error ? nextError.message : m.common_save_failed()
            setError(message)
            notify(message, 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <section className="schema-summary-card">
          <div>
            <span className="schema-icon">
              <Box size={20} />
            </span>
            <div>
              <strong>
                {m.schema_summary({ name: name ? titleCase(name) : m.schema_no_name() })}
              </strong>
              <small>
                {source?.is_system_schema ? m.schema_system() : m.schema_user()} ·{' '}
                {timestamps ? m.schema_timestamps() : m.schema_no_timestamps()}
              </small>
            </div>
          </div>
          <div className="schema-summary-meta">
            <span>
              {m.field_namespace()}: <strong>{namespace || m.schema_no_namespace()}</strong>
            </span>
            <span>
              {m.field_label_field()}: <strong>{labelField || m.schema_no_label()}</strong>
            </span>
          </div>
          <ActionButton
            type="submit"
            className="button button-primary"
            loading={submitting}
            disabled={submitting}
          >
            {submitting ? <span className="spinner spinner-light" /> : <Save size={15} />}
            {submitting ? m.common_saving() : m.common_save()}
          </ActionButton>
        </section>

        <section className="editor-card schema-details">
          <div className="form-grid form-grid-three">
            <label className="field">
              <span>
                {m.common_name()} <em>*</em>
              </span>
              <TextInput
                value={name}
                onChange={(event) => setName(event.target.value.toLowerCase().replace(/\s+/g, '_'))}
                disabled={isEditing}
                placeholder="article"
              />
              <small>{m.schema_name_help()}</small>
            </label>
            <label className="field">
              <span>
                {m.field_namespace()} <em>*</em>
              </span>
              <TextInput
                value={namespace}
                onChange={(event) =>
                  setNamespace(event.target.value.toLowerCase().replace(/\s+/g, '_'))
                }
                placeholder="articles"
              />
              <small>{m.schema_namespace_help()}</small>
            </label>
            <label className="field">
              <span>{m.field_label_field()}</span>
              <SelectInput
                value={labelField}
                onChange={(event) => setLabelField(event.target.value)}
              >
                <option value="">{m.schema_no_label_option()}</option>
                {fields.map((field) => (
                  <option key={field.name} value={field.name}>
                    {field.label || field.name}
                  </option>
                ))}
              </SelectInput>
              <small>{m.schema_label_help()}</small>
            </label>
          </div>
          <label className="switch-field schema-timestamp-switch">
            <span>
              <strong>{m.schema_automatic_timestamps()}</strong>
              <small>{m.schema_timestamps_help()}</small>
            </span>
            <Toggle checked={timestamps} onChange={setTimestamps} />
          </label>
        </section>

        <section className="editor-card fields-editor">
          <header>
            <div>
              <strong>{m.field_fields()}</strong>
              <span>{m.schema_fields_help()}</span>
            </div>
            <ActionButton
              type="button"
              className="button button-outline"
              onClick={() => setFields((current) => [...current, nextField(current)])}
            >
              <Plus size={15} />
              {m.schema_add_field()}
            </ActionButton>
          </header>
          <div className="fields-table">
            <div className="field-row field-row-header">
              <span>{m.common_name()}</span>
              <span>{m.field_label()}</span>
              <span>{m.field_type()}</span>
              <span>{m.field_optional()}</span>
              <span />
            </div>
            {fields.length ? (
              fields.map((field, index) => (
                <div className="field-row" key={`${field.name}-${index}`}>
                  <TextInput
                    value={field.name}
                    onChange={(event) =>
                      updateField(index, {
                        name: event.target.value.toLowerCase().replace(/\s+/g, '_'),
                      })
                    }
                    disabled={field.is_system_field || field.immutable}
                    aria-label={m.schema_field_name_label({ index: index + 1 })}
                  />
                  <TextInput
                    value={field.label || ''}
                    onChange={(event) => updateField(index, { label: event.target.value })}
                    aria-label={m.schema_field_label_label({ index: index + 1 })}
                  />
                  <SelectInput
                    value={field.type}
                    onChange={(event) => updateField(index, { type: event.target.value })}
                    disabled={field.is_system_field || field.immutable}
                    aria-label={m.schema_field_type_label({ index: index + 1 })}
                  >
                    {fieldTypes.map((type) => (
                      <option key={type} value={type}>
                        {titleCase(type)}
                      </option>
                    ))}
                  </SelectInput>
                  <CheckInput
                    type="checkbox"
                    checked={Boolean(field.optional)}
                    onChange={(event) => updateField(index, { optional: event.target.checked })}
                    disabled={field.immutable}
                    aria-label={m.schema_field_optional_label({ index: index + 1 })}
                  />
                  <ActionButton
                    type="button"
                    className="icon-button danger-button"
                    aria-label={m.schema_remove_field_label({ name: field.name })}
                    disabled={field.is_system_field || field.immutable}
                    onClick={() =>
                      setFields((current) =>
                        current.filter((_, fieldIndex) => fieldIndex !== index),
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </ActionButton>
                </div>
              ))
            ) : (
              <EmptyState title={m.schema_no_fields()} description={m.schema_no_fields_help()} />
            )}
          </div>
        </section>

        {error && (
          <p className="form-error schema-error" role="alert">
            {error}
          </p>
        )}
        <footer className="sticky-form-actions">
          <ActionButton
            type="button"
            className="button button-outline"
            onClick={() => navigate({ to: '/schemas' })}
          >
            {m.common_cancel()}
          </ActionButton>
          <ActionButton
            type="submit"
            className="button button-primary"
            loading={submitting}
            disabled={submitting}
          >
            <Save size={15} />
            {m.schema_save()}
          </ActionButton>
        </footer>
      </form>
    </div>
  )
}
