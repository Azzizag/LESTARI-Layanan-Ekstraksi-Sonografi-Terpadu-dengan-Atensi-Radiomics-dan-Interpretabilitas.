// Tipe dan label hasil analisis yang dipakai bersama oleh /api/analyze dan komponen UI.

import type { Enums } from "@/lib/database.types"

export type ScanClass = Enums<"scan_class">
export type CaseStatus = Enums<"case_status">

// Urutan kelas mengikuti docs/API_CONTRACT.md dan dipakai di seluruh UI: Normal, Benign, Malignant.
export const SCAN_CLASSES = ["normal", "benign", "malignant"] as const satisfies readonly ScanClass[]

export const classLabel: Record<ScanClass, string> = {
  normal: "Normal",
  benign: "Benign",
  malignant: "Malignant",
}

export const caseStatusLabel: Record<CaseStatus, string> = {
  analyzing: "Menganalisis",
  analysis_failed: "Analisis gagal",
  awaiting_review: "Menunggu review",
  priority: "Prioritas",
  done: "Selesai",
}

export type PipelineStep = { step: string; detail: string; ms: number }

export type LatencyMs = {
  preprocess: number
  deep_features: number
  gradcam_mask: number
  radiomics: number
  lightgbm: number
  total: number
}

export type AnalysisImages = {
  original: string | null
  preprocessed: string | null
  overlay: string | null
  heatmap: string | null
  roiMask: string | null
}

export type AnalysisResult = {
  predictionId: string
  predictedClass: ScanClass
  probabilities: Record<ScanClass, number>
  modelVersion: string
  cached: boolean
  warnings: string[]
  latencyMs: LatencyMs
  pipeline: PipelineStep[]
  roi: { areaRatio: number; otsuThreshold: number }
}

export type AnalyzeResponse =
  | { ok: true; caseId: string; status: CaseStatus; result: AnalysisResult; images: AnalysisImages }
  | { ok: false; caseId: string | null; status: CaseStatus | null; error: string }

// Pengelompokan langkah pipeline paper (docs/METODOLOGI.md bagian 4) untuk PipelineTrace.
// Waktu tiap kelompok diambil dari latency_ms API, bukan angka paper.
export const pipelineGroups = [
  {
    key: "preprocess",
    label: "Preprocessing",
    steps: ["median_blur", "clahe", "resize", "normalize"],
  },
  { key: "deep_features", label: "Deep features DenseNet-201", steps: ["deep_features"] },
  { key: "gradcam_mask", label: "Grad-CAM dan mask ROI Otsu", steps: ["gradcam_mask"] },
  { key: "radiomics", label: "Radiomics", steps: ["radiomics"] },
  { key: "fusion_selection", label: "Fusi dan seleksi MI-150", steps: ["fusion_selection"] },
  { key: "lightgbm", label: "Klasifikasi LightGBM", steps: ["lightgbm"] },
] as const

export const pipelineStepLabel: Record<string, string> = {
  median_blur: "Median filter",
  clahe: "CLAHE",
  resize: "Resize",
  normalize: "Normalisasi",
  deep_features: "Deep features",
  gradcam_mask: "Grad-CAM + Otsu",
  radiomics: "Radiomics",
  fusion_selection: "Fusi dan seleksi",
  lightgbm: "LightGBM",
}

const percentFormat = new Intl.NumberFormat("id-ID", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const msFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 })

// Nilai ekstrem tidak dibulatkan menjadi 100% atau 0% (docs/LUMIRA_AUDIT.md A2).
export function formatPercent(value: number) {
  if (value >= 0.9995 && value < 1) return `> ${percentFormat.format(0.999)}`
  if (value > 0 && value < 0.0005) return `< ${percentFormat.format(0.001)}`
  return percentFormat.format(value)
}
export const formatMs = (value: number) =>
  value >= 1000 ? `${msFormat.format(value / 1000)} dtk` : `${msFormat.format(value)} ms`
