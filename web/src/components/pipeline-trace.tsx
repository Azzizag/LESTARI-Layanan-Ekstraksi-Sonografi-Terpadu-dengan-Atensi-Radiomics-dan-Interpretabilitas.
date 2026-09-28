"use client"

import { CircleCheckIcon, CircleDashedIcon, LoaderCircleIcon } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { useEffect, useState } from "react"

import {
  formatMs,
  pipelineGroups,
  pipelineStepLabel,
  type AnalysisImages,
  type AnalysisResult,
} from "@/lib/analysis"
import { cn } from "@/lib/utils"

type Group = (typeof pipelineGroups)[number]

// Waktu kelompok dari data API: preprocessing dari latency_ms, lainnya dari langkah pipeline.
function groupMs(group: Group, result: AnalysisResult) {
  if (group.key === "preprocess") return result.latencyMs.preprocess
  const steps = result.pipeline.filter((s) => (group.steps as readonly string[]).includes(s.step))
  return steps.reduce((sum, s) => sum + s.ms, 0)
}

function groupDetail(group: Group, result: AnalysisResult | null) {
  if (!result) return null
  return result.pipeline
    .filter((s) => (group.steps as readonly string[]).includes(s.step))
    .map((s) => s.detail)
    .filter(Boolean)
    .join(" · ")
}

function ElapsedTime() {
  const [start] = useState(() => Date.now())
  const [now, setNow] = useState(start)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [])
  return <span className="tabular">{formatMs(now - start)}</span>
}

const thumbnails: { key: keyof AnalysisImages; label: string }[] = [
  { key: "original", label: "Asli" },
  { key: "preprocessed", label: "Preprocessing" },
  { key: "heatmap", label: "Heatmap Grad-CAM" },
  { key: "roiMask", label: "Mask ROI" },
]

// Jejak pipeline paper. Tidak ada waktu yang ditampilkan sebelum hasil model datang:
// API mengembalikan hasil sekaligus, jadi angka per langkah hanya dari latency_ms dan pipeline.
export function PipelineTrace({
  result,
  images,
}: {
  result: AnalysisResult | null
  images?: AnalysisImages | null
}) {
  const reduceMotion = useReducedMotion()
  const done = result !== null

  return (
    <div className="space-y-4">
      {!done ? (
        <div role="status" className="flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-2 text-sm">
          <LoaderCircleIcon className="size-4 animate-spin text-primary" aria-hidden="true" />
          <span className="flex-1">Menganalisis citra. Biasanya selesai dalam beberapa detik.</span>
          <ElapsedTime />
        </div>
      ) : null}

      <ol className="space-y-1" aria-label="Langkah pipeline analisis">
        {pipelineGroups.map((group, i) => {
          const detail = groupDetail(group, result)
          const subSteps =
            done && group.steps.length > 1
              ? result.pipeline.filter((s) => (group.steps as readonly string[]).includes(s.step))
              : []
          return (
            <motion.li
              key={`${group.key}-${done}`}
              initial={done ? { opacity: 0, y: 4 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.18,
                ease: "easeOut",
                delay: done && !reduceMotion ? i * 0.15 : 0,
              }}
              className="flex gap-3 rounded-lg px-2 py-2"
            >
              {done ? (
                <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={cn("font-medium", !done && "text-muted-foreground")}>
                    {group.label}
                  </span>
                  {done ? (
                    <span className="tabular shrink-0 text-xs text-muted-foreground">
                      {formatMs(groupMs(group, result))}
                    </span>
                  ) : null}
                </div>
                {subSteps.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {subSteps.map((s) => (
                      <li key={s.step} className="flex justify-between gap-3">
                        <span>
                          {pipelineStepLabel[s.step] ?? s.step}
                          {s.detail ? ` (${s.detail})` : ""}
                        </span>
                        <span className="tabular">{formatMs(s.ms)}</span>
                      </li>
                    ))}
                  </ul>
                ) : detail ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>
                ) : null}
              </div>
            </motion.li>
          )
        })}
      </ol>

      {done ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
          <span>
            Total <span className="tabular font-medium text-foreground">{formatMs(result.latencyMs.total)}</span>{" "}
            (diukur di server model)
          </span>
          <span className="tabular">model {result.modelVersion}</span>
        </div>
      ) : null}

      {done && images ? (
        <div className="grid grid-cols-4 gap-2">
          {thumbnails.map(({ key, label }) => (
            <figure key={key} className="space-y-1">
              {images[key] ? (
                // Signed URL berumur pendek dari bucket private; tidak lewat optimasi next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[key]}
                  alt={label}
                  className="aspect-square w-full rounded-md bg-viewer object-contain"
                />
              ) : (
                <div className="aspect-square w-full rounded-md bg-muted" />
              )}
              <figcaption className="text-center text-xs text-muted-foreground">{label}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  )
}
