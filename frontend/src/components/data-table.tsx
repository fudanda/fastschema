import { Link } from '@tanstack/react-router'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Filter,
  Plus,
  Search,
} from 'lucide-react'
import { useState } from 'react'

export function DataTable<T>({
  data,
  columns,
  createTo,
  createLabel = 'Create',
  emptyLabel = 'No results.',
  searchPlaceholder = 'Search records…',
}: {
  data: Array<T>
  columns: Array<ColumnDef<T>>
  createTo?: string
  createLabel?: string
  emptyLabel?: string
  searchPlaceholder?: string
}) {
  const [filterOpen, setFilterOpen] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="toolbar-actions">
          <button
            type="button"
            className={`button button-outline ${filterOpen ? 'button-active' : ''}`}
            onClick={() => setFilterOpen((value) => !value)}
          >
            <Filter size={15} />
            Filter
          </button>
          {createTo && (
            <Link to={createTo} className="button button-primary">
              <Plus size={15} />
              {createLabel}
            </Link>
          )}
        </div>
        <button type="button" className="icon-button" aria-label="Choose visible columns">
          <Columns3 size={17} />
        </button>
      </div>

      {filterOpen && (
        <div className="table-filterbar">
          <Search size={16} />
          <input
            type="search"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
          />
        </div>
      )}

      <div className="table-scroll">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  return (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button type="button" onClick={header.column.getToggleSortingHandler()}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUp size={14} />
                          ) : sorted === 'desc' ? (
                            <ArrowDown size={14} />
                          ) : (
                            <ArrowUpDown size={14} />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} data-selected={row.getIsSelected() || undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="table-empty" colSpan={columns.length}>
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="table-footer">
        <span>
          {Object.keys(rowSelection).length} of {table.getFilteredRowModel().rows.length} row(s) selected
        </span>
        <div className="pagination">
          <label>
            Rows per page
            <select
              value={table.getState().pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
          </span>
          <div className="pagination-buttons">
            <button type="button" onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()} aria-label="Go to first page">
              <ChevronFirst size={16} />
            </button>
            <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Go to previous page">
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Go to next page">
              <ChevronRight size={16} />
            </button>
            <button type="button" onClick={() => table.lastPage()} disabled={!table.getCanNextPage()} aria-label="Go to last page">
              <ChevronLast size={16} />
            </button>
          </div>
        </div>
      </footer>
    </section>
  )
}
