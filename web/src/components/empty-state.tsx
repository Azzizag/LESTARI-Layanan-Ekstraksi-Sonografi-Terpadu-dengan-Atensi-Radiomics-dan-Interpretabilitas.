import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Keadaan kosong: ikon garis, judul, satu kalimat, dan paling banyak satu aksi.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
