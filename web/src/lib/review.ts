import "server-only"

import { z } from "zod"

import {
  type AnalysisResult,
  type CaseStatus,
  type ScanClass,
} from "@/lib/analysis"
import { ageFromBirthDate } from "@/lib/format"
import { SCAN_BUCKET } from "@/lib/scans"
import type { createClient } from "@/lib/supabase/server"

type Supabase = Awaited<ReturnType<typeof createClient>>

// Status yang tampil di antrean dokter. Kasus yang masih dianalisis atau gagal belum bisa direview.
export type QueueStatus = Extract<CaseStatus, "priority" | "awaiting_review" | "done">
export const QUEUE_STATUSES = ["priority", "awaiting_review", "done"] as const satisfies QueueStatus[]

export type QueueCase = {
  caseId: string
  patientCode: string
  patientName: string
  age: number | undefined
  status: QueueStatus
  predictedClass: ScanClass
  probMalignant: number
  createdAt: string
  reviewedAt: string | undefined
  finalClass: ScanClass | undefined
  agreesWithAi: boolean | undefined
}

// Urutan kerja: Prioritas lalu Menunggu review, masing-masing dari P(Malignant) tertinggi;
// kasus selesai paling akhir, yang terbaru direview lebih dulu.
function compareQueue(a: QueueCase, b: QueueCase) {
  const rank = { priority: 0, awaiting_review: 1, done: 2 } as const
  if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
  if (a.status === "done") return (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? "")
  return b.probMalignant - a.probMalignant
}

export async function getQueueCases(supabase: Supabase): Promise<QueueCase[]> {
  const { data, error } = await supabase
    .from("case_overview")
    .select(
      "case_id, status, created_at, patient_id, patient_code, patient_name, predicted_class, prob_malignant, final_class, agrees_with_ai, reviewed_at"
    )
    .in("status", QUEUE_STATUSES)
  if (error) throw new Error("Antrean gagal dimuat.")

  const patientIds = [...new Set(data.map((c) => c.patient_id).filter((id): id is string => !!id))]
  const { data: patients, error: patientError } = patientIds.length
    ? await supabase.from("patients").select("id, birth_date").in("id", patientIds)
    : { data: [], error: null }
  if (patientError) throw new Error("Antrean gagal dimuat.")
  const birthDate = new Map(patients.map((p) => [p.id, p.birth_date]))

  const now = new Date()
  return data
    .filter((c) => c.case_id && c.predicted_class && c.prob_malignant !== null)
    .map((c) => ({
      caseId: c.case_id!,
      patientCode: c.patient_code ?? "",
      patientName: c.patient_name ?? "",
      age: ageFromBirthDate(birthDate.get(c.patient_id ?? "") ?? null, now) ?? undefined,
      status: c.status as QueueStatus,
      predictedClass: c.predicted_class!,
      probMalignant: c.prob_malignant!,
      createdAt: c.created_at ?? "",
      reviewedAt: c.reviewed_at ?? undefined,
      finalClass: c.final_class ?? undefined,
      agreesWithAi: c.agrees_with_ai ?? undefined,
    }))
    .sort(compareQueue)
}

// ---------------------------------------------------------------------------
// Detail satu kasus untuk Konsol Review
// ---------------------------------------------------------------------------

// Kolom jsonb prediksi divalidasi ulang saat dibaca agar UI tidak menampilkan data setengah jadi.
const storedPredictionSchema = z.object({
  latency_ms: z.object({
    preprocess: z.number(),
    deep_features: z.number(),
    gradcam_mask: z.number(),
    radiomics: z.number(),
    lightgbm: z.number(),
    total: z.number(),
  }),
  pipeline: z.array(z.object({ step: z.string(), detail: z.string().default(""), ms: z.number() })),
  roi: z.object({ area_ratio: z.number(), otsu_threshold: z.number() }),
  shap_top: z
    .array(z.object({ feature: z.string(), group: z.enum(["deep", "radiomics"]), value: z.number() }))
    .nullish()
    .transform((v) => v ?? []),
})

export type ShapFeature = { feature: string; group: "deep" | "radiomics"; value: number }

export type ReviewImages = {
  original: string | null
  preprocessed: string | null
  heatmap: string | null
  overlay: string | null
  roiMask: string | null
  annotation: string | null
}

export type ReviewCase = {
  caseId: string
  status: CaseStatus
  createdAt: string
  patient: { id: string; code: string; fullName: string; age: number | undefined }
  prediction: (AnalysisResult & { shapTop: ShapFeature[]; createdAt: string }) | null
  review: {
    doctorId: string
    doctorName: string | null
    finalClass: ScanClass
    notes: string
    hasMask: boolean
    updatedAt: string
  } | null
  images: ReviewImages
}

// Signed URL cukup lama untuk satu sesi review.
const SIGNED_URL_TTL_S = 60 * 60

export async function getReviewCase(supabase: Supabase, caseId: string): Promise<ReviewCase | null> {
  const { data: row, error } = await supabase
    .from("cases")
    .select("id, status, created_at, original_path, patient:patients(id, code, full_name, birth_date)")
    .eq("id", caseId)
    .maybeSingle()
  if (error) throw new Error("Kasus gagal dimuat.")
  if (!row?.patient) return null

  const [predictionResult, reviewResult] = await Promise.all([
    supabase
      .from("predictions")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("reviews")
      .select("doctor_id, final_class, notes, mask_path, updated_at, doctor:profiles(full_name)")
      .eq("case_id", caseId)
      .maybeSingle(),
  ])
  if (predictionResult.error || reviewResult.error) throw new Error("Kasus gagal dimuat.")
  const p = predictionResult.data
  const rv = reviewResult.data

  let prediction: ReviewCase["prediction"] = null
  if (p) {
    const stored = storedPredictionSchema.safeParse(p)
    if (stored.success) {
      prediction = {
        predictionId: p.id,
        predictedClass: p.predicted_class,
        probabilities: { normal: p.prob_normal, benign: p.prob_benign, malignant: p.prob_malignant },
        modelVersion: p.model_version,
        cached: p.cached,
        warnings: p.warnings,
        latencyMs: stored.data.latency_ms,
        pipeline: stored.data.pipeline,
        roi: { areaRatio: stored.data.roi.area_ratio, otsuThreshold: stored.data.roi.otsu_threshold },
        shapTop: stored.data.shap_top,
        createdAt: p.created_at,
      }
    }
  }

  const paths = [
    row.original_path,
    p?.preprocessed_path ?? null,
    p?.heatmap_path ?? null,
    p?.gradcam_path ?? null,
    p?.roi_mask_path ?? null,
    rv?.mask_path ?? null,
  ]
  const existing = paths.filter((path): path is string => !!path)
  const { data: signed } = existing.length
    ? await supabase.storage.from(SCAN_BUCKET).createSignedUrls(existing, SIGNED_URL_TTL_S)
    : { data: [] }
  const urlFor = (path: string | null) =>
    (path && signed?.find((s) => s.path === path)?.signedUrl) || null

  return {
    caseId: row.id,
    status: row.status,
    createdAt: row.created_at,
    patient: {
      id: row.patient.id,
      code: row.patient.code,
      fullName: row.patient.full_name,
      age: ageFromBirthDate(row.patient.birth_date) ?? undefined,
    },
    prediction,
    review: rv
      ? {
          doctorId: rv.doctor_id,
          doctorName: rv.doctor?.full_name ?? null,
          finalClass: rv.final_class,
          notes: rv.notes ?? "",
          hasMask: !!rv.mask_path,
          updatedAt: rv.updated_at,
        }
      : null,
    images: {
      original: urlFor(paths[0]),
      preprocessed: urlFor(paths[1]),
      heatmap: urlFor(paths[2]),
      overlay: urlFor(paths[3]),
      roiMask: urlFor(paths[4]),
      annotation: urlFor(paths[5]),
    },
  }
}
