// Aturan file citra USG, dipakai di browser (validasi awal) dan server (validasi final).

export const SCAN_BUCKET = "scans"
export const MAX_SCAN_BYTES = 10 * 1024 * 1024

export const ACCEPTED_SCAN_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
} as const

export type ScanMimeType = keyof typeof ACCEPTED_SCAN_TYPES
export type ScanExtension = (typeof ACCEPTED_SCAN_TYPES)[ScanMimeType]

export function isAcceptedScanType(type: string): type is ScanMimeType {
  return type in ACCEPTED_SCAN_TYPES
}

// Struktur path di bucket "scans" (lihat supabase/migrations/0001_init.sql).
export const scanPaths = {
  original: (patientId: string, caseId: string, ext: ScanExtension) =>
    `${patientId}/${caseId}/original.${ext}`,
  // Hasil tiap prediksi di subfolder sendiri agar analisis ulang tidak menimpa hasil lama.
  predictionImage: (
    patientId: string,
    caseId: string,
    predictionId: string,
    name: "preprocessed" | "gradcam" | "heatmap" | "roi_mask"
  ) => `${patientId}/${caseId}/${predictionId}/${name}.png`,
  // Anotasi dokter (PNG grayscale, lihat components/review/annotation.ts). Policy storage
  // hanya mengizinkan dokter menulis ke path berakhiran /mask.png.
  annotation: (patientId: string, caseId: string) => `${patientId}/${caseId}/mask.png`,
}

export function isPng(bytes: Uint8Array) {
  return sniffScanType(bytes) === "image/png"
}

// Jenis file dari isi (magic bytes), bukan dari nama atau header yang bisa dipalsukan.
export function sniffScanType(bytes: Uint8Array): ScanMimeType | null {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (png.every((b, i) => bytes[i] === b)) return "image/png"
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  return null
}
