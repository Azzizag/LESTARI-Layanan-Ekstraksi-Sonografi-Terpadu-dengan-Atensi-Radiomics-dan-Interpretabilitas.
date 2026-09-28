import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"

const countFormat = new Intl.NumberFormat("id-ID")

export function StatCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string
  value: number
  caption?: string
  icon: LucideIcon
}) {
  return (
    <Card className="gap-1 px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="tabular text-[28px] leading-tight font-semibold">{countFormat.format(value)}</p>
      {caption ? <p className="text-xs text-muted-foreground">{caption}</p> : null}
    </Card>
  )
}
