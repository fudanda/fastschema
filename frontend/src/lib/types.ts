export type ApiErrorPayload = {
  code?: string
  message?: string
}

export type ApiEnvelope<T> = {
  data: T
  error?: ApiErrorPayload
}

export type RelationConfig = {
  schema: string
  field: string
  type: string
  owner?: boolean
  optional?: boolean
  source_column?: string
  on_delete?: string
}

export type SchemaField = {
  type: string
  name: string
  label?: string
  optional?: boolean
  unique?: boolean
  immutable?: boolean
  sortable?: boolean
  filterable?: boolean
  default?: unknown
  enums?: Array<string | number>
  relation?: RelationConfig
  is_system_field?: boolean
  db?: Record<string, unknown>
}

export type Schema = {
  name: string
  namespace: string
  label_field?: string
  fields: Array<SchemaField>
  is_system_schema?: boolean
  is_junction_schema?: boolean
  disable_timestamp?: boolean
  db?: Record<string, unknown>
}

export type AppConfig = {
  version: string
  schemas: Array<Schema>
}

export type User = {
  id: string
  username?: string
  email?: string
  first_name?: string
  last_name?: string
  bio?: string
  active?: boolean
  provider?: string
  avatar?: MediaFile
  roles?: Array<Role>
  created_at?: string
  updated_at?: string
}

export type Role = {
  id: string
  name: string
  description?: string
  root?: boolean
  system?: boolean
  rule?: string
  permissions?: Array<Permission>
  users?: Array<User>
  created_at?: string
}

export type Permission = {
  id?: string
  resource: string
  value: string
  modifier?: Record<string, unknown> | null
}

export type MediaFile = {
  id: string
  disk?: string
  name: string
  path?: string
  type?: string
  size?: number
  url?: string
  created_at?: string
  owner?: User
}

export type Pagination<T> = {
  total: number
  per_page: number
  current_page: number
  last_page: number
  items: Array<T>
}

export type RecordValue = string | number | boolean | null | undefined | object
export type ContentRecord = Record<string, RecordValue>
