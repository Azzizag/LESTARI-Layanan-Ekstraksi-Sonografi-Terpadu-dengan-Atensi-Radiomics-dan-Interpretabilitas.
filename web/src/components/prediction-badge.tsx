import { CircleCheckIcon, CircleDotIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { classLabel, type ScanClass } from "@/lib/analysis"
import { cn } from "@/lib/utils"

// Kelas selalu tampil sebagai ikon + teks + warna (tidak bergantung warna saja).
const classStyle: Record<ScanClass, { icon: LucideIcon; className: string }> = {
  normal: { icon: CircleCheckIcon, className: "bg-normal-bg text-normal" },
  benign: { icon: CircleDotIcon, className: "bg-benign-bg text-benign" },
  malignant: { icon: TriangleAlertIcon, className: "bg-malignant-bg text-malignant" },
}

export function PredictionBadge({
  value,
  size = "default",
  className,
}: {
  value: ScanClass
  size?: "default" | "lg"
  className?: string
}) {
  const { icon: Icon, className: tone } = classStyle[value]
  return (
    <Badge
      className={cn(
        tone,
        size === "lg" && "h-8 gap-1.5 px-3 text-sm font-semibold [&>svg]:size-4!",
        className
      )}
    >
      <Icon aria-hidden="true" />
      {classLabel[value]}
    </Badge>
  )
}
