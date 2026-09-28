import "server-only"

import { SCAN_CLASSES, type ScanClass } from "@/lib/analysis"
import type { createClient } from "@/lib/supabase/server"

type Supabase = Awaited<ReturnType<typeof createClient>>

export type HitlStats = {
  reviewed: number
  agreed: number
  // matrix[prediksiAI][diagnosisDokter]
  matrix: Record<ScanClass, Record<ScanClass, number>>
  analyses: number
  averageLatencyMs: number | null
}

// Statistik Human-in-the-Loop dari database aplikasi (bukan angka paper).
// Memakai session pengguna, jadi RLS tetap berlaku (hanya staf aktif yang dapat membaca).
export async function getHitlStats(supabase: Supabase): Promise<HitlStats> {
  const [reviews, predictions] = await Promise.all([
    supabase.from("reviews").select("ai_class, final_class"),
    supabase.from("predictions").select("latency_ms").eq("cached", false),
  ])
  if (reviews.error || predictions.error) throw new Error("Statistik aplikasi gagal dimuat.")

  const matrix = Object.fromEntries(
    SCAN_CLASSES.map((ai) => [ai, Object.fromEntries(SCAN_CLASSES.map((dx) => [dx, 0]))])
  ) as HitlStats["matrix"]
  let reviewed = 0
  let agreed = 0
  for (const r of reviews.data) {
    if (!r.ai_class) continue
    reviewed += 1
    matrix[r.ai_class][r.final_class] += 1
    if (r.ai_class === r.final_class) agreed += 1
  }

  // Latensi total yang diukur server model untuk analisis nyata (hasil cache demo tidak dihitung).
  const totals = predictions.data
    .map((p) => (p.latency_ms as { total?: unknown } | null)?.total)
    .filter((t): t is number => typeof t === "number")
  const averageLatencyMs = totals.length ? totals.reduce((s, t) => s + t, 0) / totals.length : null

  return { reviewed, agreed, matrix, analyses: totals.length, averageLatencyMs }
}
