// Tanpa "use client": hanya diimpor oleh panel AI (komponen client).
import { ChevronDownIcon } from "lucide-react"
import { useState } from "react"

import { classLabel, type ScanClass } from "@/lib/analysis"
import type { ShapFeature } from "@/lib/review"
import { cn } from "@/lib/utils"

const INITIAL_COUNT = 5

const barTone: Record<ScanClass, string> = {
  normal: "bg-normal",
  benign: "bg-benign",
  malignant: "bg-malignant",
}

const valueFormat = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "always",
})
const shareFormat = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 0 })

// Fitur paling berpengaruh dari shap_top: nilai SHAP untuk kelas prediksi.
// Bar ke kanan mendukung kelas prediksi, ke kiri melawan.
export function ShapPanel({ features, predicted }: { features: ShapFeature[]; predicted: ScanClass }) {
  const [expanded, setExpanded] = useState(false)

  if (features.length === 0) {
    return <p className="text-sm text-muted-foreground">SHAP tidak tersedia untuk prediksi ini.</p>
  }

  const shown = expanded ? features : features.slice(0, INITIAL_COUNT)
  const max = Math.max(...features.map((f) => Math.abs(f.value)), 1e-9)
  const total = features.reduce((sum, f) => sum + Math.abs(f.value), 0)
  const deepShare = total ? features.filter((f) => f.group === "deep").reduce((s, f) => s + Math.abs(f.value), 0) / total : 0

  return (
    <div className="space-y-3">
      <ul className="space-y-2.5" aria-label="Fitur SHAP teratas">
        {shown.map((f) => {
          const width = (Math.abs(f.value) / max) * 50
          return (
            <li key={f.feature} className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="tabular min-w-0 flex-1 truncate" title={f.feature}>
                  {f.feature}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-px text-[10px] font-medium",
                    f.group === "deep" ? "bg-primary-soft text-primary" : "border text-muted-foreground"
                  )}
                >
                  {f.group === "deep" ? "Deep" : "Radiomics"}
                </span>
                <span className="tabular w-11 shrink-0 text-right text-muted-foreground">
                  {valueFormat.format(f.value)}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-muted" aria-hidden="true">
                <span className="absolute inset-y-[-2px] left-1/2 w-px bg-muted-foreground/50" />
                <span
                  className={cn(
                    "absolute inset-y-0 rounded-full",
                    f.value >= 0 ? cn("left-1/2", barTone[predicted]) : "right-1/2 bg-muted-foreground/60"
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      {features.length > INITIAL_COUNT ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 rounded text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-expanded={expanded}
        >
          <ChevronDownIcon className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
          {expanded ? "Tampilkan 5 teratas" : `Tampilkan semua (${features.length})`}
        </button>
      ) : null}

      <div className="space-y-1.5">
        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <span className="bg-primary" style={{ width: `${deepShare * 100}%` }} />
          <span className="bg-muted-foreground/40" style={{ width: `${(1 - deepShare) * 100}%` }} />
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Kanan mendukung {classLabel[predicted]}, kiri melawan. Porsi kontribusi {features.length} fitur teratas:
          Deep <span className="tabular font-medium text-foreground">{shareFormat.format(deepShare)}</span> ·
          Radiomics <span className="tabular font-medium text-foreground">{shareFormat.format(1 - deepShare)}</span>
        </p>
      </div>
    </div>
  )
}
