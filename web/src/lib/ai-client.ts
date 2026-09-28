import "server-only"

import type { ScanMimeType } from "@/lib/scans"
import { parsePredictResponse, type PredictResponse } from "@/lib/validators"

// Klien API klasifikasi (docs/API_CONTRACT.md). Hanya dipanggil dari server; API key tidak pernah ke browser.

const TIMEOUT_MS = 30_000

export type AiFailure =
  | { reason: "not_configured" }
  | { reason: "timeout" }
  | { reason: "unreachable"; detail: string }
  | { reason: "http_error"; status: number; detail: string }
  | { reason: "invalid_contract"; issues: string[] }

export type AiResult = ({ ok: true; data: PredictResponse }) | ({ ok: false } & AiFailure)

export const aiFailureMessage: Record<AiFailure["reason"], string> = {
  not_configured: "Alamat layanan AI belum diatur di server.",
  timeout: "Layanan AI tidak merespons dalam 30 detik.",
  unreachable: "Layanan AI tidak dapat dihubungi.",
  http_error: "Layanan AI mengembalikan error.",
  invalid_contract: "Respons layanan AI tidak sesuai kontrak.",
}

export async function predictScan(
  image: ArrayBuffer,
  type: ScanMimeType,
  fileName: string
): Promise<AiResult> {
  const baseUrl = process.env.AI_SERVICE_URL?.replace(/\/+$/, "")
  if (!baseUrl) return { ok: false, reason: "not_configured" }

  const form = new FormData()
  form.append("file", new Blob([image], { type }), fileName)

  let response: Response
  try {
    response = await fetch(`${baseUrl}/predict`, {
      method: "POST",
      headers: { "X-API-Key": process.env.AI_SERVICE_API_KEY ?? "" },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return { ok: false, reason: "timeout" }
    }
    return { ok: false, reason: "unreachable", detail: String(error) }
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300)
    return { ok: false, reason: "http_error", status: response.status, detail }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return { ok: false, reason: "invalid_contract", issues: ["respons bukan JSON"] }
  }

  const checked = parsePredictResponse(body)
  if (!checked.ok) return { ok: false, reason: "invalid_contract", issues: checked.issues }
  return { ok: true, data: checked.data }
}
