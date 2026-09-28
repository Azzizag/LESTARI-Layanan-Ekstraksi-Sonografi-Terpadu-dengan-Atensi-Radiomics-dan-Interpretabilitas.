import { renderToBuffer } from "@react-pdf/renderer"
import { z } from "zod"

import { siteConfig } from "@/config/site"
import { modelCard } from "@/content/model-card"
import { formatMs } from "@/lib/analysis"
import { getCurrentProfile } from "@/lib/auth"
import { ageFromBirthDate, formatDateTime } from "@/lib/format"
import { ReportDocument, type ReportImage } from "@/lib/report/report-document"
import { SCAN_BUCKET, sniffScanType } from "@/lib/scans"
import { createClient } from "@/lib/supabase/server"

function textResponse(message: string, status: number) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } })
}

// Laporan kasus PDF (PRD F7). Hanya untuk kasus yang sudah didiagnosis dokter, agar tidak ada
// laporan berisi hasil AI saja. Semua query memakai session pengguna, jadi RLS tetap berlaku.
export async function GET(_request: Request, { params }: RouteContext<"/api/report/[caseId]">) {
  const profile = await getCurrentProfile()
  if (!profile) return textResponse("Sesi berakhir. Silakan masuk kembali.", 401)

  const { caseId } = await params
  if (!z.uuid().safeParse(caseId).success) return textResponse("Kasus tidak ditemukan.", 404)

  const supabase = await createClient()
  const [caseResult, predictionResult, reviewResult] = await Promise.all([
    supabase
      .from("cases")
      .select("id, created_at, original_path, patient:patients(code, full_name, birth_date)")
      .eq("id", caseId)
      .maybeSingle(),
    supabase
      .from("predictions")
      .select("predicted_class, prob_normal, prob_benign, prob_malignant, model_version, latency_ms, cached, gradcam_path")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("reviews")
      .select("final_class, ai_class, agrees_with_ai, notes, updated_at, doctor:profiles(full_name)")
      .eq("case_id", caseId)
      .maybeSingle(),
  ])
  if (caseResult.error || predictionResult.error || reviewResult.error) {
    return textResponse("Data kasus gagal dimuat.", 500)
  }
  const caseRow = caseResult.data
  const prediction = predictionResult.data
  const review = reviewResult.data
  if (!caseRow?.patient || !prediction) return textResponse("Kasus tidak ditemukan.", 404)
  if (!review) return textResponse("Kasus belum didiagnosis dokter, laporan belum dapat dibuat.", 409)

  async function loadImage(path: string | null): Promise<ReportImage> {
    if (!path) return null
    const { data } = await supabase.storage.from(SCAN_BUCKET).download(path)
    if (!data) return null
    const bytes = Buffer.from(await data.arrayBuffer())
    const type = sniffScanType(bytes)
    return type ? { data: bytes, format: type === "image/png" ? "png" : "jpg" } : null
  }
  const [original, overlay] = await Promise.all([
    loadImage(caseRow.original_path),
    loadImage(prediction.gradcam_path),
  ])

  const latencyTotal = (prediction.latency_ms as { total?: unknown } | null)?.total
  const pdf = await renderToBuffer(
    ReportDocument({
      appName: siteConfig.name,
      appFullName: siteConfig.fullName,
      disclaimer: siteConfig.disclaimer,
      generatedAt: formatDateTime(new Date()),
      patient: {
        code: caseRow.patient.code,
        fullName: caseRow.patient.full_name,
        age: ageFromBirthDate(caseRow.patient.birth_date),
      },
      uploadedAt: formatDateTime(caseRow.created_at),
      images: { original, overlay },
      prediction: {
        predictedClass: prediction.predicted_class,
        probabilities: {
          normal: prediction.prob_normal,
          benign: prediction.prob_benign,
          malignant: prediction.prob_malignant,
        },
        modelName: modelCard.modelName,
        modelVersion: prediction.model_version,
        latency: typeof latencyTotal === "number" ? formatMs(latencyTotal) : "-",
        cached: prediction.cached,
      },
      review: {
        finalClass: review.final_class,
        // Kesepakatan dicatat saat dokter menyimpan diagnosis (kolom generated di reviews).
        agreesWithAi: review.agrees_with_ai ?? review.final_class === (review.ai_class ?? prediction.predicted_class),
        notes: review.notes,
        doctorName: review.doctor?.full_name ?? "-",
        reviewedAt: formatDateTime(review.updated_at),
      },
    })
  )

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    action: "report.download",
    target_type: "case",
    target_id: caseId,
    meta: { final_class: review.final_class },
  })

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laporan-${caseRow.patient.code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
}
