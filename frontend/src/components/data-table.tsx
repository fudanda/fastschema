import Button from '@douyinfe/semi-ui/lib/es/button'
import Empty from '@douyinfe/semi-ui/lib/es/empty'
import Input from '@douyinfe/semi-ui/lib/es/input'
import Table from '@douyinfe/semi-ui/lib/es/table'
import { IconFilter, IconPlus, IconSearch } from '@douyinfe/semi-icons'
import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table/interface'
import { m } from '../paraglide/messages.js'

export type DataColumn<T> = {
  key?: string
  dataIndex?: keyof T & string
  title: ReactNode
  render?: (value: unknown, record: T, index: number) => ReactNode
  sorter?: (left: T, right: T) => number
  width?: number | string
  fixed?: 'left' | 'right'
}

function searchableValue(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(searchableValue).join(' ')
  if (typeof value === 'object') return Object.values(value).map(searchableValue).join(' ')
  return String(value)
}

export function DataTable<T extends object>({
  data,
  columns,
  createTo,
  createLabel = m.common_create(),
  emptyLabel = m.common_no_results(),
  searchPlaceholder = m.common_search_records(),
  getRowKey,
}: {
  data: Array<T>
  columns: Array<DataColumn<T>>
  createTo?: string
  createLabel?: string
  emptyLabel?: string
  searchPlaceholder?: string
  getRowKey?: (record: T, index: number) => string
}) {
  const [filterOpen, setFilterOpen] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<string | number>>([])

  const filteredData = useMemo(() => {
    const query = globalFilter.trim().toLocaleLowerCase()
    if (!query) return data
    return data.filter((record) => searchableValue(record).toLocaleLowerCase().includes(query))
  }, [data, globalFilter])

  return (
    <section className="table-card semi-table-card">
      <div className="table-toolbar">
        <div className="toolbar-actions">
          <Button
            theme={filterOpen ? 'solid' : 'light'}
            type={filterOpen ? 'primary' : 'tertiary'}
            icon={<IconFilter />}
            onClick={() => setFilterOpen((value) => !value)}
          >
            {m.datatable_filter()}
          </Button>
          {createTo && (
            <Link to={createTo}>
              <Button theme="solid" type="primary" icon={<IconPlus />}>
                {createLabel}
              </Button>
            </Link>
          )}
        </div>
        <span className="table-selection-summary">
          {m.datatable_selected_rows({
            selected: selectedRowKeys.length,
            total: filteredData.length,
          })}
        </span>
      </div>

      {filterOpen && (
        <div className="table-filterbar">
          <Input
            prefix={<IconSearch />}
            value={globalFilter}
            onChange={setGlobalFilter}
            placeholder={searchPlaceholder}
            showClear
            autoFocus
          />
        </div>
      )}

      <Table<Record<string, unknown>>
        className="data-table"
        columns={columns as unknown as Array<ColumnProps<Record<string, unknown>>>}
        dataSource={filteredData as Array<Record<string, unknown>>}
        rowKey={(record) => {
          const typedRecord = record as T
          const candidate = record as Record<string, unknown>
          const index = filteredData.indexOf(typedRecord)
          return getRowKey?.(typedRecord, index) ?? String(candidate.id ?? candidate.name ?? index)
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys ?? []),
        }}
        pagination={{
          pageSize: 10,
          pageSizeOpts: [10, 20, 50],
          showSizeChanger: true,
          showQuickJumper: filteredData.length > 50,
        }}
        empty={<Empty description={emptyLabel} />}
        scroll={{ x: 'max-content' }}
        size="middle"
      />
    </section>
  )
}
