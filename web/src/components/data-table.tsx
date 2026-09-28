// Tanpa "use client": hanya diimpor oleh komponen client (tabel pasien, tabel dokter), jadi ikut bundel client-nya.
import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

// Fitur TanStack Table v9 didaftarkan eksplisit. Kolom dibuat dengan
// createColumnHelper<DataTableFeatures, Row>() agar tipenya cocok.
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, datetime: sortFn_datetime },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})

export type DataTableFeatures = typeof dataTableFeatures

export function TableSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}) {
  return (
    <div className="relative w-72 max-w-full">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="bg-card pl-8"
      />
    </div>
  )
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  globalFilter,
  onGlobalFilterChange,
  noResults,
  pageSize = 10,
  label,
  onRowClick,
  getRowClassName,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- kolom punya tipe nilai yang berbeda-beda
  columns: ColumnDef<DataTableFeatures, TData, any>[]
  data: TData[]
  getRowId: (row: TData) => string
  globalFilter: string
  onGlobalFilterChange: (value: string) => void
  noResults: string
  pageSize?: number
  label: string
  // Baris bisa diklik (mis. membuka konsol review). Tombol di dalam baris tetap bisa difokus keyboard.
  onRowClick?: (row: TData) => void
  getRowClassName?: (row: TData) => string | undefined
}) {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    globalFilterFn: "includesString",
    initialState: { pagination: { pageIndex: 0, pageSize } },
    state: { globalFilter },
    onGlobalFilterChange: (updater) =>
      onGlobalFilterChange(typeof updater === "function" ? updater(globalFilter) : updater),
  })

  const rows = table.getRowModel().rows
  const total = table.getFilteredRowModel().rows.length
  const { pageIndex } = table.state.pagination
  const first = total === 0 ? 0 : pageIndex * pageSize + 1
  const last = Math.min(total, (pageIndex + 1) * pageSize)

  return (
    <div>
      <Table aria-label={label} className="text-[13px]">
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                return (
                  <TableHead
                    key={header.id}
                    className="h-10 px-4 text-xs font-semibold text-muted-foreground"
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="-mx-1 inline-flex items-center gap-1 rounded px-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <table.FlexRender header={header} />
                        {sorted === "asc" ? (
                          <ArrowUpIcon className="size-3.5" aria-hidden="true" />
                        ) : sorted === "desc" ? (
                          <ArrowDownIcon className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowUpDownIcon className="size-3.5 opacity-50" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(onRowClick && "cursor-pointer", getRowClassName?.(row.original))}
              >
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className="h-12 px-4">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {noResults}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5 text-xs text-muted-foreground">
        <span className="tabular">
          {first}-{last} dari {total}
        </span>
        <div className={cn("flex items-center gap-1", table.getPageCount() <= 1 && "invisible")}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeftIcon />
          </Button>
          <span className="tabular px-1">
            {pageIndex + 1} / {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Halaman berikutnya"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
