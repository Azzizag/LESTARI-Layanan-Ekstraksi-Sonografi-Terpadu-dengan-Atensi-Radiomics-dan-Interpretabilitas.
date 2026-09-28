"use client"

import { ConstructionIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat halaman">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-80" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-4 h-72 rounded-xl" />
    </div>
  )
}

export function PageError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="mx-auto mt-10 max-w-md items-center px-6 py-10 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-malignant-bg text-malignant">
        <TriangleAlertIcon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-base font-semibold">Halaman gagal dimuat</h2>
        <p className="mt-1 text-muted-foreground">
          Periksa koneksi internet, lalu coba muat ulang.
        </p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        <RotateCcwIcon />
        Coba lagi
      </Button>
    </Card>
  )
}

// Penanda halaman yang isinya dibangun di fase berikutnya (docs/ROADMAP.md).
export function PhasePlaceholder({ phase, items }: { phase: number; items: string[] }) {
  return (
    <Card className="border border-dashed bg-transparent px-6 py-10 ring-0">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
          <ConstructionIcon className="size-5" aria-hidden="true" />
        </span>
        <h2 className="mt-3 text-base font-semibold">Dibangun pada Fase {phase}</h2>
        <ul className="mt-2 space-y-0.5 text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
