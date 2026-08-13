import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import Button from '@douyinfe/semi-ui/lib/es/button'
import { Braces, Check, FileImage, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { DataTable, type DataColumn } from '../components/data-table'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/page'
import {
  ActionButton,
  SelectInput,
  TextAreaInput,
  TextInput,
  Toggle,
} from '../components/semi-controls'
import { useAuth } from '../lib/auth'
import { confirmDanger } from '../lib/confirm'
import { displayValue, formatDate, titleCase } from '../lib/format'
import { contentQueryOptions, queryKeys, recordQueryOptions } from '../lib/queries'
import { useToast } from '../lib/toast'
import { m } from '../paraglide/messages.js'
import type { ContentRecord, MediaFile, Schema, SchemaField } from '../lib/types'

const hiddenFields = new Set(['deleted_at', 'password'])
type FormValue = string | boolean | Array<string>

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
  const queryClient = useQueryClient()
  const contentQuery = useQuery(contentQueryOptions(schemaName))
  const { notify } = useToast()
  const data = contentQuery.data || []

  const columns = useMemo<Array<DataColumn<ContentRecord>>>(() => {
    if (!schema) return []
    const visibleFields = schema.fields
      .filter((field) => !hiddenFields.has(field.name) && field.type !== 'file')
      .slice(0, 7)

    return [
      ...visibleFields.map<DataColumn<ContentRecord>>((field) => ({
        key: field.name,
        dataIndex: field.name,
        title: field.label || titleCase(field.name),
        sorter: (left, right) =>
          displayValue(left[field.name]).localeCompare(displayValue(right[field.name])),
        render: (_value, record) => {
          const value = record[field.name]
          const label = field.type === 'time' ? formatDate(value) : displayValue(value)
          if (field.name === 'id' || field.name === schema.label_field) {
            return (
              <Link
                className="table-link"
                to="/content/$schemaName/edit"
                params={{ schemaName }}
                search={{ id: recordId(record) }}
              >
                {label}
              </Link>
            )
          }
          return <span className="cell-truncate">{label}</span>
        },
      })),
      {
        key: 'actions',
        title: m.common_actions(),
        width: 112,
        render: (_value, record) => (
          <div className="row-actions">
            <Link
              aria-label={m.content_edit_record()}
              to="/content/$schemaName/edit"
              params={{ schemaName }}
              search={{ id: recordId(record) }}
            >
              <Button
                theme="borderless"
                icon={<Pencil size={15} />}
                aria-label={m.content_edit_record()}
              />
            </Link>
            <Button
              theme="borderless"
              type="danger"
              icon={<Trash2 size={15} />}
              aria-label={m.content_delete_record()}
              onClick={async () => {
                if (!(await confirmDanger(m.content_delete_confirm()))) return
                try {
                  await request(
                    `/content/${encodeURIComponent(schemaName)}/${encodeURIComponent(recordId(record))}`,
                    { method: 'DELETE' },
                  )
                  await queryClient.invalidateQueries({
                    queryKey: queryKeys.content(schemaName),
                  })
                  notify(m.content_deleted(), 'success')
                } catch (error) {
                  notify(error instanceof Error ? error.message : m.common_delete_failed(), 'error')
                }
              }}
            />
          </div>
        ),
      },
    ]
  }, [notify, queryClient, request, schema, schemaName])

  if (!schema) {
    return (
      <EmptyState
        icon={<Braces size={22} />}
        title={m.schema_not_found()}
        description={m.content_schema_not_found_description({ name: schemaName })}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title={m.content_list_title({ name: titleCase(schema.name) })}
        description={m.content_list_description({ name: titleCase(schema.name) })}
      />
      {contentQuery.isPending ? (
        <LoadingState label={m.content_loading_list({ name: schema.namespace || schema.name })} />
      ) : contentQuery.error ? (
        <ErrorState error={contentQuery.error} retry={() => void contentQuery.refetch()} />
      ) : (
        <DataTable
          data={data}
          columns={columns}
          createTo={`/content/${schemaName}/create`}
          searchPlaceholder={m.content_search({ name: schema.namespace || schema.name })}
        />
      )}
    </div>
  )
}

function editableFields(schema: Schema) {
  return schema.fields.filter(
    (field) =>
      !field.immutable &&
      !hiddenFields.has(field.name) &&
      !['id', 'created_at', 'updated_at', 'deleted_at'].includes(field.name),
  )
}

function relationIsMany(field: SchemaField) {
  return (
    field.relation?.type === 'm2m' ||
    (field.relation?.type === 'o2m' && field.relation.owner === true)
  )
}

function initialValue(field: SchemaField, value?: unknown): FormValue {
  if (field.type === 'bool') return Boolean(value ?? field.default ?? false)
  if (field.type === 'relation' || field.type === 'file') {
    if (Array.isArray(value)) {
      return value.map((item) =>
        typeof item === 'object' && item && 'id' in item ? String(item.id) : String(item),
      )
    }
    if (typeof value === 'object' && value && 'id' in value) return String(value.id)
    return value == null ? '' : String(value)
  }
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
  if (value === '' || (Array.isArray(value) && value.length === 0)) {
    return field.optional ? null : value
  }
  if (field.type.includes('int') || field.type.includes('float')) return Number(value)
  if (field.type === 'relation' || field.type === 'file') {
    return Array.isArray(value) ? value.map((id) => ({ id })) : { id: String(value) }
  }
  if (field.type === 'json') return JSON.parse(String(value))
  if (field.type === 'time') return new Date(String(value)).toISOString()
  return value
}

function relationLabel(record: ContentRecord, schema?: Schema) {
  const labelField = schema?.label_field || 'name'
  return String(record[labelField] || record.name || record.username || record.email || record.id)
}

function RelationPicker({
  field,
  value,
  onChange,
}: {
  field: SchemaField
  value: FormValue
  onChange: (value: FormValue) => void
}) {
  const { config } = useAuth()
  const targetName = field.type === 'file' ? 'file' : field.relation?.schema || ''
  const targetSchema = config?.schemas.find((schema) => schema.name === targetName)
  const recordsQuery = useQuery(contentQueryOptions(targetName))
  const multiple = relationIsMany(field)
  const selected = Array.isArray(value) ? value : value ? [String(value)] : []

  if (recordsQuery.isPending)
    return <LoadingState label={m.content_loading_options({ name: targetName })} />
  if (recordsQuery.error) {
    return <ErrorState error={recordsQuery.error} retry={() => void recordsQuery.refetch()} />
  }

  if (field.type === 'file') {
    return (
      <div className="media-picker" role="group" aria-label={field.label || field.name}>
        {(recordsQuery.data || []).map((record) => {
          const file = record as unknown as MediaFile
          const checked = selected.includes(String(file.id))
          return (
            <ActionButton
              type="button"
              key={String(file.id)}
              className={`media-picker-item ${checked ? 'media-picker-item-selected' : ''}`}
              onClick={() => {
                const fileID = String(file.id)
                if (!multiple) {
                  onChange(checked ? '' : fileID)
                  return
                }
                onChange(
                  checked
                    ? selected.filter((selectedID) => selectedID !== fileID)
                    : [...selected, fileID],
                )
              }}
              aria-pressed={checked}
            >
              {file.url && file.type?.startsWith('image/') ? (
                <img src={file.url} alt="" />
              ) : (
                <span>
                  <FileImage size={20} />
                </span>
              )}
              <small>{file.name || m.content_unnamed_file()}</small>
              {checked && <Check className="media-picker-check" size={14} />}
            </ActionButton>
          )
        })}
        {!recordsQuery.data?.length && <p className="field-help">{m.content_no_files()}</p>}
      </div>
    )
  }

  return (
    <SelectInput
      multiple={multiple}
      value={multiple ? selected : selected[0] || ''}
      onChange={(event) => {
        if (multiple) {
          onChange(Array.from(event.target.selectedOptions, (option) => option.value))
        } else {
          onChange(event.target.value)
        }
      }}
    >
      {!multiple && <option value="">{m.common_select()}</option>}
      {(recordsQuery.data || []).map((record) => (
        <option key={String(record.id)} value={String(record.id)}>
          {relationLabel(record, targetSchema)}
        </option>
      ))}
    </SelectInput>
  )
}

function recordFormSchema(fields: Array<SchemaField>) {
  return z.record(z.string(), z.unknown()).superRefine((values, context) => {
    for (const field of fields) {
      const value = values[field.name]
      const empty = value === '' || (Array.isArray(value) && value.length === 0)
      const label = field.label || titleCase(field.name)
      if (!field.optional && field.type !== 'bool' && empty) {
        context.addIssue({
          code: 'custom',
          path: [field.name],
          message: m.content_required({ label }),
        })
        continue
      }
      if (empty) continue
      if (
        (field.type.includes('int') || field.type.includes('float')) &&
        !Number.isFinite(Number(value))
      ) {
        context.addIssue({
          code: 'custom',
          path: [field.name],
          message: m.content_number_required({ label }),
        })
      }
      if (field.type === 'json') {
        try {
          JSON.parse(String(value))
        } catch {
          context.addIssue({
            code: 'custom',
            path: [field.name],
            message: m.content_json_required({ label }),
          })
        }
      }
      if (field.type === 'time' && Number.isNaN(new Date(String(value)).getTime())) {
        context.addIssue({
          code: 'custom',
          path: [field.name],
          message: m.content_datetime_required({ label }),
        })
      }
    }
  })
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
          <small>{field.optional ? m.field_optional() : m.common_required()}</small>
        </span>
        <Toggle id={id} checked={Boolean(value)} onChange={onChange} />
      </label>
    )
  }

  if (field.type === 'relation' || field.type === 'file') {
    return (
      <div className="field" id={id}>
        <span>
          {field.label || titleCase(field.name)}
          {!field.optional && <em>*</em>}
        </span>
        <RelationPicker field={field} value={value} onChange={onChange} />
        <small>
          {field.type === 'file'
            ? m.content_media_picker_help()
            : relationIsMany(field)
              ? m.content_multiple_relation()
              : m.content_single_relation()}
        </small>
      </div>
    )
  }

  const isTextarea = ['text', 'json'].includes(field.type)
  const inputType =
    field.type === 'time'
      ? 'datetime-local'
      : field.type.includes('int') || field.type.includes('float')
        ? 'number'
        : field.name.toLowerCase().includes('email')
          ? 'email'
          : 'text'

  return (
    <label className="field" htmlFor={id}>
      <span>
        {field.label || titleCase(field.name)}
        {!field.optional && <em>*</em>}
      </span>
      {field.enums?.length ? (
        <SelectInput
          id={id}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{m.common_select()}</option>
          {field.enums.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </SelectInput>
      ) : isTextarea ? (
        <TextAreaInput
          id={id}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          rows={field.type === 'text' ? 5 : 4}
          placeholder={field.type === 'json' ? '{ }' : undefined}
        />
      ) : (
        <TextInput
          id={id}
          type={inputType}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <small>
        {m.content_field_help({
          type: titleCase(field.type),
          optional: field.optional ? m.content_optional_suffix() : '',
        })}
      </small>
    </label>
  )
}

export function ContentEditorPage({ schemaName, id }: { schemaName: string; id?: string }) {
  const schema = useSchema(schemaName)
  const { request } = useAuth()
  const queryClient = useQueryClient()
  const recordQuery = useQuery(recordQueryOptions(schemaName, id || ''))
  const { notify } = useToast()
  const navigate = useNavigate()
  const [values, setValues] = useState<Record<string, FormValue>>({})
  const [submitting, setSubmitting] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [formError, setFormError] = useState('')
  const fields = useMemo(() => (schema ? editableFields(schema) : []), [schema])

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  useEffect(() => {
    if (!schema || dirty) return
    if (!id) {
      setValues(Object.fromEntries(fields.map((field) => [field.name, initialValue(field)])))
      return
    }
    if (recordQuery.data) {
      setValues(
        Object.fromEntries(
          fields.map((field) => [field.name, initialValue(field, recordQuery.data[field.name])]),
        ),
      )
    }
  }, [dirty, fields, id, recordQuery.data, schema])

  if (!schema) return <EmptyState title={m.schema_not_found()} />
  if (id && recordQuery.isPending) return <LoadingState label={m.content_loading_record()} />
  if (recordQuery.error) {
    return <ErrorState error={recordQuery.error} retry={() => void recordQuery.refetch()} />
  }

  const schemaLabel = titleCase(schema.name)
  const title = id
    ? m.content_edit_title({ name: schemaLabel })
    : m.content_create_title({ name: schemaLabel })

  return (
    <div>
      <PageHeader
        title={title}
        description={
          id
            ? m.content_edit_description({ name: schemaLabel })
            : m.content_create_description({ name: schemaLabel })
        }
      />
      <form
        className="editor-card"
        onSubmit={async (event) => {
          event.preventDefault()
          setFormError('')
          const validation = recordFormSchema(fields).safeParse(values)
          if (!validation.success) {
            setFormError(validation.error.issues[0]?.message || m.common_check_form())
            return
          }
          setSubmitting(true)
          try {
            const payload = Object.fromEntries(
              fields.map((field) => [field.name, parseValue(field, values[field.name] ?? '')]),
            )
            const path = id
              ? `/content/${encodeURIComponent(schemaName)}/${encodeURIComponent(id)}`
              : `/content/${encodeURIComponent(schemaName)}`
            await request(path, { method: id ? 'PUT' : 'POST', body: payload })
            await queryClient.invalidateQueries({ queryKey: queryKeys.content(schemaName) })
            setDirty(false)
            notify(
              id
                ? m.content_updated({ name: schemaLabel })
                : m.content_created({ name: schemaLabel }),
              'success',
            )
            await navigate({ to: '/content/$schemaName', params: { schemaName } })
          } catch (error) {
            const message = error instanceof Error ? error.message : m.common_save_failed()
            setFormError(message)
            notify(message, 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        <div className="editor-card-header">
          <div>
            <strong>{title}</strong>
            <span>{m.content_editable_fields({ count: fields.length })}</span>
          </div>
          <div className="form-actions">
            <ActionButton
              type="button"
              className="button button-outline"
              onClick={() => navigate({ to: '/content/$schemaName', params: { schemaName } })}
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
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
      </form>
    </div>
  )
}
