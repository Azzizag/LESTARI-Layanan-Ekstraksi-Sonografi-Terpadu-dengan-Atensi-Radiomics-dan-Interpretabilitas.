import "server-only"

import demoCache from "@/content/demo-cache.json"
import { parsePredictResponse, type PredictResponse } from "@/lib/validators"

// Hasil /predict yang disimpan untuk citra contoh, dengan kunci SHA-256 file asli.
// Dipakai hanya saat mode demo aktif dan layanan AI gagal (PRD F10). Diisi di Fase 8.
const entries = demoCache as unknown as Record<string, unknown>

export function lookupDemoCache(sha256: string): PredictResponse | null {
  const entry = entries[sha256]
  if (!entry) return null
  // Cache tetap harus lolos kontrak yang sama dengan respons API asli.
  const checked = parsePredictResponse(entry)
  return checked.ok ? checked.data : null
}
