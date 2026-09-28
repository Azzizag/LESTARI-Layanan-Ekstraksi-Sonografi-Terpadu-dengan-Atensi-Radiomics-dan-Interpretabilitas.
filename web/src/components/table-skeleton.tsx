import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Skeleton halaman berisi judul, toolbar, dan tabel (Pasien, Dokter).
export function TableSkeleton({ columns, rows = 8 }: { columns: number; rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Memuat halaman">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <Card className="gap-0 py-0">
        <div className="flex gap-6 border-b px-4 py-3">
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-6 border-b px-4 py-4 last:border-0">
            {Array.from({ length: columns }, (_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </Card>
    </div>
  )
}
