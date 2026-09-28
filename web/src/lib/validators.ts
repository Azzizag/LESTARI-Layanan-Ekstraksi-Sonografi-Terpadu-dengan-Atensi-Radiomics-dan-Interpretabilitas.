import { z } from "zod"

import { SCAN_CLASSES } from "@/lib/analysis"
import { ACCEPTED_SCAN_TYPES, type ScanExtension } from "@/lib/scans"

// ---------------------------------------------------------------------------
// Respons POST /predict. Aturannya sama dengan ai-service/tests/contract.py.
// ---------------------------------------------------------------------------

const probability = z.number().min(0).max(1)
const milliseconds = z.number().nonnegative()

// PNG base64 tanpa prefix "data:". "iVBORw0KGgo" adalah base64 dari magic bytes PNG.
const pngBase64 = z
  .string()
  .refine((v) => !v.startsWith("data:"), "gambar tidak boleh memakai prefix data:")
  .refine((v) => v.startsWith("iVBORw0KGgo"), "gambar bukan PNG")

const predictResponseSchema = z
  .object({
    request_id: z.string().optional(),
    model_version: z.string().min(1, "model_version kosong"),
    predicted_class: z.enum(SCAN_CLASSES),
    probabilities: z.object({
      normal: probability,
      benign: probability,
      malignant: probability,
    }),
    latency_ms: z.object({
      preprocess: milliseconds,
      deep_features: milliseconds,
      gradcam_mask: milliseconds,
      radiomics: milliseconds,
      lightgbm: milliseconds,
      total: milliseconds,
    }),
    images: z.object({
      preprocessed_png_base64: pngBase64,
      gradcam_heatmap_png_base64: pngBase64,
      gradcam_overlay_png_base64: pngBase64,
      roi_mask_png_base64: pngBase64,
    }),
    roi: z.object({
      area_ratio: z.number().min(0).max(1),
      otsu_threshold: z.number(),
    }),
    shap_top: z
      .array(
        z.object({
          feature: z.string(),
          group: z.enum(["deep", "radiomics"]),
          value: z.number(),
        })
      )
      .default([]),
    pipeline: z
      .array(z.object({ step: z.string(), detail: z.string().default(""), ms: milliseconds }))
      .min(1, "pipeline kosong"),
    // API teman mengirim null jika tidak ada peringatan; mock mengirim [].
    warnings: z
      .array(z.string())
      .nullish()
      .transform((v) => v ?? []),
  })
  .superRefine((body, ctx) => {
    const probs = body.probabilities
    const sum = probs.normal + probs.benign + probs.malignant
    if (Math.abs(sum - 1) >= 1e-3) {
      ctx.addIssue({ code: "custom", message: `probabilitas tidak berjumlah 1: ${sum}` })
    }
    const argmax = SCAN_CLASSES.reduce((best, c) => (probs[c] > probs[best] ? c : best))
    if (body.predicted_class !== argmax) {
      ctx.addIssue({ code: "custom", message: "predicted_class bukan kelas dengan probabilitas tertinggi" })
    }
  })

export type PredictResponse = z.output<typeof predictResponseSchema>

export type ContractCheck =
  | { ok: true; data: PredictResponse }
  | { ok: false; issues: string[] }

export function parsePredictResponse(raw: unknown): ContractCheck {
  // zod menyusun ulang kunci objek, jadi urutan kunci probabilitas dicek dari data mentah.
  const rawProbs = (raw as { probabilities?: unknown } | null)?.probabilities
  if (rawProbs && typeof rawProbs === "object") {
    const keys = Object.keys(rawProbs)
    if (keys.join() !== SCAN_CLASSES.join()) {
      return { ok: false, issues: [`urutan/nama kelas salah: ${keys.join(", ")}`] }
    }
  }

  const parsed = predictResponseSchema.safeParse(raw)
  if (parsed.success) return { ok: true, data: parsed.data }
  return {
    ok: false,
    issues: parsed.error.issues.map((i) => `${i.path.join(".") || "respons"}: ${i.message}`),
  }
}

// ---------------------------------------------------------------------------
// Body POST /api/analyze
// ---------------------------------------------------------------------------

const scanExtensions = Object.values(ACCEPTED_SCAN_TYPES) as [ScanExtension, ...ScanExtension[]]

export const analyzeRequestSchema = z.discriminatedUnion("mode", [
  // Citra baru: browser sudah mengunggah original ke scans/{patientId}/{caseId}/original.{ext}.
  z.object({
    mode: z.literal("new"),
    patientId: z.uuid(),
    caseId: z.uuid(),
    extension: z.enum(scanExtensions),
  }),
  // Analisis ulang kasus yang sudah ada (mis. setelah analisis gagal).
  z.object({
    mode: z.literal("retry"),
    caseId: z.uuid(),
  }),
])

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>
