import { classLabel, SCAN_CLASSES, type ScanClass } from "@/lib/analysis"
import { formatInteger, formatPaperMs, formatPaperPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

// Matriks 3x3 sebagai tabel heatmap. Urutan kelas selalu Normal, Benign, Malignant.
// Sel diagonal (benar/sepakat) berwarna primary, sel lain berwarna malignant; intensitas mengikuti nilai.
export function MatrixTable({
  matrix,
  rowLabel,
  colLabel,
  caption,
}: {
  matrix: Record<ScanClass, Record<ScanClass, number>>
  rowLabel: string
  colLabel: string
  caption: string
}) {
  const max = Math.max(1, ...SCAN_CLASSES.flatMap((r) => SCAN_CLASSES.map((c) => matrix[r][c])))
  return (
    <table className="w-full table-fixed border-separate border-spacing-1 text-center text-[13px]">
      <caption className="mb-1 text-left text-xs text-muted-foreground">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className="w-[30%] text-left text-[11px] font-medium text-muted-foreground">
            {rowLabel} / {colLabel}
          </th>
          {SCAN_CLASSES.map((c) => (
            <th key={c} scope="col" className="text-xs font-medium text-muted-foreground">
              {classLabel[c]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {SCAN_CLASSES.map((r) => (
          <tr key={r}>
            <th scope="row" className="text-left text-xs font-medium">
              {classLabel[r]}
            </th>
            {SCAN_CLASSES.map((c) => {
              const value = matrix[r][c]
              const diagonal = r === c
              const strength = value === 0 ? 0 : 12 + (value / max) * 58
              return (
                <td
                  key={c}
                  className={cn("tabular h-10 rounded-md font-semibold", value === 0 && "bg-muted text-muted-foreground")}
                  style={
                    value === 0
                      ? undefined
                      : {
                          background: `color-mix(in srgb, var(--${diagonal ? "primary" : "malignant"}) ${strength}%, transparent)`,
                          color: strength > 45 ? "white" : undefined,
                        }
                  }
                >
                  {formatInteger(value)}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export type BarItem = { label: string; value: number; tone: "best" | "method" | "baseline" | "sota" }

const barTone: Record<BarItem["tone"], string> = {
  best: "bg-primary",
  method: "bg-primary/55",
  baseline: "bg-primary/30",
  sota: "bg-muted-foreground/35",
}

// Bar horizontal skala 0 sampai 100 persen (tidak dipotong agar selisih tidak dibesar-besarkan).
export function PercentBars({ items }: { items: BarItem[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex justify-between gap-3 text-xs">
            <span className={cn(item.tone === "best" && "font-semibold")}>{item.label}</span>
            <span className={cn("tabular", item.tone === "best" && "font-semibold")}>
              {formatPaperPercent(item.value)}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className={cn("h-full rounded-full", barTone[item.tone])} style={{ width: `${item.value}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

const segmentTone = ["bg-primary/35", "bg-primary/60", "bg-primary", "bg-muted-foreground/50"]

// Bar bertumpuk waktu inferensi per komponen (Tabel VIII).
export function LatencyStack({
  parts,
  totalMs,
}: {
  parts: readonly { component: string; ms: number }[]
  totalMs: number
}) {
  return (
    <div className="space-y-3">
      <div className="flex h-3.5 overflow-hidden rounded-md bg-muted" aria-hidden="true">
        {parts.map((p, i) => (
          <span key={p.component} className={segmentTone[i % segmentTone.length]} style={{ width: `${(p.ms / totalMs) * 100}%` }} />
        ))}
      </div>
      <ul className="space-y-1.5 text-xs">
        {parts.map((p, i) => (
          <li key={p.component} className="flex items-center gap-2">
            <span className={cn("size-2.5 shrink-0 rounded-sm", segmentTone[i % segmentTone.length])} aria-hidden="true" />
            <span className="min-w-0 flex-1">{p.component}</span>
            <span className="tabular text-muted-foreground">{formatPaperMs(p.ms)}</span>
            <span className="tabular w-9 text-right font-medium">{Math.round((p.ms / totalMs) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
