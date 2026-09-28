import { classLabel, formatPercent, SCAN_CLASSES, type ScanClass } from "@/lib/analysis"
import { cn } from "@/lib/utils"

const barTone: Record<ScanClass, string> = {
  normal: "bg-normal",
  benign: "bg-benign",
  malignant: "bg-malignant",
}

// Probabilitas ketiga kelas, selalu berurutan Normal, Benign, Malignant. Bar kelas prediksi lebih tebal.
export function ProbabilityBars({
  probabilities,
  predicted,
}: {
  probabilities: Record<ScanClass, number>
  predicted: ScanClass
}) {
  return (
    <dl className="space-y-2.5">
      {SCAN_CLASSES.map((c) => {
        const isPredicted = c === predicted
        return (
          <div key={c} className="grid grid-cols-[5.5rem_1fr_4.25rem] items-center gap-3">
            <dt className={cn("text-sm", isPredicted ? "font-semibold" : "text-muted-foreground")}>
              {classLabel[c]}
            </dt>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className={cn(
                  "rounded-full",
                  barTone[c],
                  isPredicted ? "h-2.5" : "mt-0.5 h-1.5 opacity-70"
                )}
                style={{ width: `${Math.max(probabilities[c] * 100, 0.5)}%` }}
              />
            </div>
            <dd className={cn("tabular text-right text-sm whitespace-nowrap", isPredicted && "font-semibold")}>
              {formatPercent(probabilities[c])}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
