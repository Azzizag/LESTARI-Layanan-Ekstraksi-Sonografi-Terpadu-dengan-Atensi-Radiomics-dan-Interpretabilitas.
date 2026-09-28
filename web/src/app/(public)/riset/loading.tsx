import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] p-6" aria-busy="true" aria-label="Memuat halaman">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-[28rem] max-w-full" />
      <Skeleton className="mt-6 h-44 rounded-xl" />
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
