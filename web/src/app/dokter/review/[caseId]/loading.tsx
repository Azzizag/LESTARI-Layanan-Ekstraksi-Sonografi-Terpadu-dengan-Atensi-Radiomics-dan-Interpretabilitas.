import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem-3rem)] flex-col gap-3" aria-busy="true" aria-label="Memuat kasus">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-24" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] gap-3 xl:grid-cols-[minmax(0,1fr)_320px_320px]">
        <div className="rounded-xl bg-viewer" />
        <Skeleton className="rounded-xl" />
        <Skeleton className="hidden rounded-xl xl:block" />
      </div>
    </div>
  )
}
