"use client"

import { Bar, BarChart, CartesianGrid, LabelList, Pie, PieChart, XAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { classLabel, SCAN_CLASSES, type ScanClass } from "@/lib/analysis"

export type DailyCount = { date: string; label: string; count: number }

const dailyConfig = {
  count: { label: "Citra dianalisis", color: "var(--primary)" },
} satisfies ChartConfig

export function AnalysisChart({ data }: { data: DailyCount[] }) {
  return (
    <ChartContainer config={dailyConfig} className="aspect-auto h-52 w-full">
      <BarChart data={data} margin={{ top: 20, left: 4, right: 4 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
            />
          }
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false}>
          <LabelList
            dataKey="count"
            position="top"
            offset={6}
            className="fill-foreground font-mono text-xs"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

const classConfig = {
  normal: { label: classLabel.normal, color: "var(--normal)" },
  benign: { label: classLabel.benign, color: "var(--benign)" },
  malignant: { label: classLabel.malignant, color: "var(--malignant)" },
} satisfies ChartConfig

const countFormat = new Intl.NumberFormat("id-ID")
const shareFormat = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 0 })

// Donut prediksi AI terbaru per kasus. Urutan kelas selalu Normal, Benign, Malignant.
export function PredictionChart({ counts }: { counts: Record<ScanClass, number> }) {
  const total = SCAN_CLASSES.reduce((sum, c) => sum + counts[c], 0)
  const data = SCAN_CLASSES.map((c) => ({ class: c, count: counts[c], fill: `var(--color-${c})` }))

  return (
    <div className="flex w-full items-center gap-5">
      <div className="relative size-36 shrink-0">
        <ChartContainer config={classConfig} className="aspect-square size-36">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="class" hideLabel />} />
            <Pie
              data={data}
              dataKey="count"
              nameKey="class"
              innerRadius={46}
              outerRadius={64}
              strokeWidth={2}
              stroke="var(--card)"
              isAnimationActive={false}
            />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="tabular text-2xl leading-none font-semibold">{countFormat.format(total)}</span>
          <span className="mt-1 text-xs text-muted-foreground">kasus</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5">
        {SCAN_CLASSES.map((c) => (
          <li key={c} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: `var(--${c})` }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-medium">{classLabel[c]}</span>
            <span className="tabular">{countFormat.format(counts[c])}</span>
            <span className="tabular w-9 text-right text-xs text-muted-foreground">
              {shareFormat.format(total ? counts[c] / total : 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
