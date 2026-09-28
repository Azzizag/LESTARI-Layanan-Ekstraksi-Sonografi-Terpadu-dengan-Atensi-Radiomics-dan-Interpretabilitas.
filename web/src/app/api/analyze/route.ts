import { createHash, randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { siteConfig } from "@/config/site"
import { aiFailureMessage, predictScan, type AiFailure } from "@/lib/ai-client"
import type { AnalysisImages, AnalyzeResponse, CaseStatus } from "@/lib/analysis"
import { getCurrentProfile } from "@/lib/auth"
import type { Json } from "@/lib/database.types"
import { lookupDemoCache } from "@/lib/demo-cache"
import {
  ACCEPTED_SCAN_TYPES,
  MAX_SCAN_BYTES,
  SCAN_BUCKET,
  scanPaths,
  sniffScanType,
} from "@/lib/scans"
import { createClient } from "@/lib/supabase/server"
import { analyzeRequestSchema, type PredictResponse } from "@/lib/validators"

// Batas waktu API model 30 detik ditambah unggah hasil ke storage.
export const maxDuration = 60

const SIGNED_URL_TTL_S = 60 * 10

function reply(body: AnalyzeResponse, status = 200) {
  return NextResponse.json(body, { status })
}

function rejectRequest(error: string, status: number) {
  return reply({ ok: false, caseId: null, status: null, error }, status)
}

function describeFailure(failure: AiFailure) {
  const message = aiFailureMessage[failure.reason]
  return failure.reason === "http_error" ? `${message} (HTTP ${failure.status})` : message
}

// Alur docs/ARCHITECTURE.md bagian 4. Semua query memakai session admin, jadi RLS tetap berlaku.
export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile) return rejectRequest("Sesi berakhir. Silakan masuk kembali.", 401)
  if (profile.role !== "admin") return rejectRequest("Hanya admin yang dapat mengunggah citra.", 403)

  const parsed = analyzeRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return rejectRequest("Permintaan tidak valid.", 400)
  const input = parsed.data

  const supabase = await createClient()

  // 1. Tentukan kasus dan lokasi citra asli.
  let patientId: string
  let originalPath: string
  if (input.mode === "new") {
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("id", input.patientId)
      .maybeSingle()
    if (!patient) return rejectRequest("Pasien tidak ditemukan.", 404)
    patientId = patient.id
    originalPath = scanPaths.original(patientId, input.caseId, input.extension)
  } else {
    const { data: existing } = await supabase
      .from("cases")
      .select("patient_id, original_path, status")
      .eq("id", input.caseId)
      .maybeSingle()
    if (!existing) return rejectRequest("Kasus tidak ditemukan.", 404)
    if (existing.status === "done") {
      return rejectRequest("Kasus sudah didiagnosis dokter dan tidak dianalisis ulang.", 409)
    }
    patientId = existing.patient_id
    originalPath = existing.original_path
  }
  const caseId = input.caseId

  // 2. Ambil citra asli yang sudah diunggah browser, lalu validasi isi dan ukurannya.
  const { data: blob, error: downloadError } = await supabase.storage
    .from(SCAN_BUCKET)
    .download(originalPath)
  if (downloadError || !blob) return rejectRequest("Citra belum terunggah ke penyimpanan.", 400)

  const image = await blob.arrayBuffer()
  if (image.byteLength > MAX_SCAN_BYTES) return rejectRequest("Ukuran citra lebih dari 10 MB.", 413)
  const mimeType = sniffScanType(new Uint8Array(image, 0, Math.min(8, image.byteLength)))
  if (!mimeType || !originalPath.endsWith(`.${ACCEPTED_SCAN_TYPES[mimeType]}`)) {
    return rejectRequest("File bukan citra PNG atau JPG yang valid.", 415)
  }
  const sha256 = createHash("sha256").update(new Uint8Array(image)).digest("hex")

  // 3. Catat kasus dengan status "analyzing".
  if (input.mode === "new") {
    const { error } = await supabase.from("cases").insert({
      id: caseId,
      patient_id: patientId,
      status: "analyzing",
      original_path: originalPath,
      image_sha256: sha256,
      uploaded_by: profile.id,
    })
    if (error) return rejectRequest("Kasus gagal dibuat.", error.code === "23505" ? 409 : 500)
  } else {
    await supabase.from("cases").update({ status: "analyzing" }).eq("id", caseId)
  }

  const log = (action: string, meta: Json) =>
    supabase.from("activity_logs").insert({
      actor_id: profile.id,
      action,
      target_type: "case",
      target_id: caseId,
      meta,
    })

  const fail = async (error: string, meta: Json) => {
    await supabase.from("cases").update({ status: "analysis_failed" }).eq("id", caseId)
    await log("case.analyze_failed", meta)
    return reply({ ok: false, caseId, status: "analysis_failed", error })
  }

  // 4. Panggil API model. Jika gagal dan mode demo aktif, pakai hasil tersimpan untuk citra yang sama.
  const ai = await predictScan(image, mimeType, originalPath.split("/").pop() ?? "scan.png")
  let prediction: PredictResponse
  let cached = false
  if (ai.ok) {
    prediction = ai.data
  } else {
    const hit = siteConfig.demoMode ? lookupDemoCache(sha256) : null
    if (!hit) return fail(describeFailure(ai), { ...ai })
    prediction = hit
    cached = true
  }

  // 5. Simpan 4 citra hasil model.
  const predictionId = randomUUID()
  const outputs = {
    preprocessed: prediction.images.preprocessed_png_base64,
    gradcam: prediction.images.gradcam_overlay_png_base64,
    heatmap: prediction.images.gradcam_heatmap_png_base64,
    roi_mask: prediction.images.roi_mask_png_base64,
  } as const
  const paths = {
    preprocessed: scanPaths.predictionImage(patientId, caseId, predictionId, "preprocessed"),
    gradcam: scanPaths.predictionImage(patientId, caseId, predictionId, "gradcam"),
    heatmap: scanPaths.predictionImage(patientId, caseId, predictionId, "heatmap"),
    roi_mask: scanPaths.predictionImage(patientId, caseId, predictionId, "roi_mask"),
  }
  const uploads = await Promise.all(
    (Object.keys(outputs) as (keyof typeof outputs)[]).map((name) =>
      supabase.storage
        .from(SCAN_BUCKET)
        .upload(paths[name], Buffer.from(outputs[name], "base64"), {
          contentType: "image/png",
          upsert: false,
        })
    )
  )
  if (uploads.some((u) => u.error)) {
    return fail("Hasil analisis gagal disimpan.", { reason: "storage_upload" })
  }

  // 6. Simpan prediksi lengkap: probabilitas mentah, versi model, dan latensi dari API.
  const { probabilities: p } = prediction
  const { error: insertError } = await supabase.from("predictions").insert({
    id: predictionId,
    case_id: caseId,
    model_version: prediction.model_version,
    predicted_class: prediction.predicted_class,
    prob_normal: p.normal,
    prob_benign: p.benign,
    prob_malignant: p.malignant,
    latency_ms: prediction.latency_ms,
    pipeline: prediction.pipeline,
    preprocessed_path: paths.preprocessed,
    gradcam_path: paths.gradcam,
    heatmap_path: paths.heatmap,
    roi_mask_path: paths.roi_mask,
    roi: prediction.roi,
    shap_top: prediction.shap_top,
    warnings: prediction.warnings,
    cached,
  })
  if (insertError) return fail("Hasil analisis gagal disimpan.", { reason: "insert_prediction" })

  // 7. Masukkan ke antrean dokter. Malignant atau P(Malignant) di atas ambang masuk Prioritas.
  const status: CaseStatus =
    prediction.predicted_class === "malignant" ||
    p.malignant >= siteConfig.priorityMalignantThreshold
      ? "priority"
      : "awaiting_review"
  await supabase.from("cases").update({ status }).eq("id", caseId)
  await log("case.analyze", {
    prediction_id: predictionId,
    model_version: prediction.model_version,
    predicted_class: prediction.predicted_class,
    cached,
    latency_total_ms: prediction.latency_ms.total,
  })

  // 8. Signed URL singkat untuk pratinjau di dialog unggah (bucket bersifat private).
  const { data: signed } = await supabase.storage
    .from(SCAN_BUCKET)
    .createSignedUrls(
      [originalPath, paths.preprocessed, paths.gradcam, paths.heatmap, paths.roi_mask],
      SIGNED_URL_TTL_S
    )
  const urlAt = (i: number) => signed?.[i]?.signedUrl ?? null
  const images: AnalysisImages = {
    original: urlAt(0),
    preprocessed: urlAt(1),
    overlay: urlAt(2),
    heatmap: urlAt(3),
    roiMask: urlAt(4),
  }

  return reply({
    ok: true,
    caseId,
    status,
    images,
    result: {
      predictionId,
      predictedClass: prediction.predicted_class,
      probabilities: p,
      modelVersion: prediction.model_version,
      cached,
      warnings: prediction.warnings,
      latencyMs: prediction.latency_ms,
      pipeline: prediction.pipeline,
      roi: { areaRatio: prediction.roi.area_ratio, otsuThreshold: prediction.roi.otsu_threshold },
    },
  })
}
