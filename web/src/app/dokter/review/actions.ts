"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { SCAN_CLASSES } from "@/lib/analysis"
import { requireRole } from "@/lib/auth"
import { isPng, SCAN_BUCKET, scanPaths } from "@/lib/scans"
import { createClient } from "@/lib/supabase/server"

export type SaveReviewResult = { ok: true } | { ok: false; error: string }

// Mask anotasi grayscale biasanya puluhan KB; batas ini di bawah limit body Server Action (1 MB).
const MAX_MASK_BYTES = 900 * 1024

const saveReviewSchema = z.object({
  caseId: z.uuid(),
  finalClass: z.enum(SCAN_CLASSES),
  notes: z.string().trim().max(2000, "Catatan maksimal 2000 karakter."),
  // keep: mask lama tetap dipakai; none: anotasi dikosongkan; upload: mask baru di field "mask".
  maskAction: z.enum(["keep", "none", "upload"]),
})

// Simpan diagnosis dokter (insert atau perbarui), tandai kasus selesai, dan catat di activity_logs.
// Kelas AI dan id prediksi diambil dari database, bukan dari browser.
export async function saveReview(formData: FormData): Promise<SaveReviewResult> {
  const profile = await requireRole("doctor")

  const parsed = saveReviewSchema.safeParse({
    caseId: formData.get("caseId"),
    finalClass: formData.get("finalClass"),
    notes: formData.get("notes") ?? "",
    maskAction: formData.get("maskAction"),
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." }
  const { caseId, finalClass, notes, maskAction } = parsed.data

  let maskBytes: Uint8Array | null = null
  if (maskAction === "upload") {
    const mask = formData.get("mask")
    if (!(mask instanceof Blob) || mask.size === 0) return { ok: false, error: "Anotasi tidak terbaca." }
    if (mask.size > MAX_MASK_BYTES) return { ok: false, error: "Ukuran anotasi terlalu besar." }
    maskBytes = new Uint8Array(await mask.arrayBuffer())
    if (!isPng(maskBytes)) return { ok: false, error: "Format anotasi tidak valid." }
  }

  const supabase = await createClient()
  const [caseResult, predictionResult, reviewResult] = await Promise.all([
    supabase.from("cases").select("id, patient_id, status").eq("id", caseId).maybeSingle(),
    supabase
      .from("predictions")
      .select("id, predicted_class")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("reviews").select("doctor_id, mask_path").eq("case_id", caseId).maybeSingle(),
  ])
  const caseRow = caseResult.data
  const prediction = predictionResult.data
  const existing = reviewResult.data
  if (caseResult.error || predictionResult.error || reviewResult.error) {
    return { ok: false, error: "Kasus gagal dimuat. Coba lagi." }
  }
  if (!caseRow) return { ok: false, error: "Kasus tidak ditemukan." }
  if (!prediction || !["priority", "awaiting_review", "done"].includes(caseRow.status)) {
    return { ok: false, error: "Kasus belum memiliki hasil AI untuk direview." }
  }
  if (existing && existing.doctor_id !== profile.id) {
    return { ok: false, error: "Kasus ini sudah didiagnosis dokter lain." }
  }

  let maskPath: string | null = maskAction === "keep" ? (existing?.mask_path ?? null) : null
  if (maskBytes) {
    const path = scanPaths.annotation(caseRow.patient_id, caseId)
    const { error } = await supabase.storage
      .from(SCAN_BUCKET)
      .upload(path, maskBytes, { contentType: "image/png", upsert: true })
    if (error) return { ok: false, error: "Anotasi gagal disimpan. Diagnosis belum tersimpan." }
    maskPath = path
  }

  const { error: reviewError } = await supabase.from("reviews").upsert(
    {
      case_id: caseId,
      prediction_id: prediction.id,
      doctor_id: profile.id,
      ai_class: prediction.predicted_class,
      final_class: finalClass,
      notes: notes || null,
      mask_path: maskPath,
    },
    { onConflict: "case_id" }
  )
  if (reviewError) return { ok: false, error: "Diagnosis gagal disimpan. Coba lagi." }

  const { error: statusError } = await supabase.from("cases").update({ status: "done" }).eq("id", caseId)
  if (statusError) return { ok: false, error: "Diagnosis tersimpan, tetapi status kasus gagal diperbarui." }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    action: "review.submit",
    target_type: "case",
    target_id: caseId,
    meta: {
      final_class: finalClass,
      ai_class: prediction.predicted_class,
      agrees_with_ai: finalClass === prediction.predicted_class,
      prediction_id: prediction.id,
      has_mask: maskPath !== null,
      updated: existing !== null,
    },
  })

  revalidatePath("/dokter")
  revalidatePath(`/dokter/review/${caseId}`)
  return { ok: true }
}
