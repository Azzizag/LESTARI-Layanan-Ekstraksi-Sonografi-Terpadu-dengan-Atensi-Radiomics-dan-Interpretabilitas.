import {
  CircleCheckIcon,
  ClockIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { caseStatusLabel, type CaseStatus } from "@/lib/analysis"
import { cn } from "@/lib/utils"

const statusStyle: Record<CaseStatus, { icon: LucideIcon; className: string }> = {
  analyzing: { icon: LoaderCircleIcon, className: "bg-muted text-muted-foreground" },
  analysis_failed: { icon: XCircleIcon, className: "bg-benign-bg text-benign" },
  awaiting_review: { icon: ClockIcon, className: "bg-muted text-foreground" },
  priority: { icon: TriangleAlertIcon, className: "bg-malignant-bg text-malignant" },
  done: { icon: CircleCheckIcon, className: "bg-primary-soft text-primary" },
}

// Status kasus dengan ikon + teks + warna. null berarti pasien belum punya citra.
export function CaseStatusBadge({ status, className }: { status: CaseStatus | null; className?: string }) {
  if (!status) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        Belum ada citra
      </Badge>
    )
  }
  const { icon: Icon, className: tone } = statusStyle[status]
  return (
    <Badge className={cn(tone, className)}>
      <Icon aria-hidden="true" />
      {caseStatusLabel[status]}
    </Badge>
  )
}
