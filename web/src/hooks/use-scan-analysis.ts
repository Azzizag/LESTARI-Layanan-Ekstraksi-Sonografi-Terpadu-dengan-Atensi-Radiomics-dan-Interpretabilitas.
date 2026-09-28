"use client"

import { useState } from "react"

import type { AnalyzeResponse } from "@/lib/analysis"
import { ACCEPTED_SCAN_TYPES, isAcceptedScanType, SCAN_BUCKET, scanPaths } from "@/lib/scans"
import { createClient } from "@/lib/supabase/client"
import type { AnalyzeRequest } from "@/lib/validators"

export type ScanAnalysisPhase = "idle" | "uploading" | "analyzing" | "done" | "failed"

// Unggah citra langsung ke bucket private (policy admin), lalu minta server menjalankan analisis.
// Citra tidak lewat fungsi server web, sehingga tidak terkena batas ukuran body request di Vercel.
export function useScanAnalysis(initialFailedCaseId: string | null = null) {
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<ScanAnalysisPhase>(initialFailedCaseId ? "failed" : "idle")
  const [response, setResponse] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Kasus yang sudah tersimpan tetapi analisisnya gagal: dipakai "Analisis ulang" agar tidak dobel.
  const [retryCaseId, setRetryCaseId] = useState<string | null>(initialFailedCaseId)

  const busy = phase === "uploading" || phase === "analyzing"

  async function analyze(body: AnalyzeRequest) {
    setPhase("analyzing")
    setError(null)
    let result: AnalyzeResponse
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      result = (await res.json()) as AnalyzeResponse
    } catch {
      result = { ok: false, caseId: body.caseId, status: null, error: "Server tidak dapat dihubungi." }
    }
    setResponse(result)
    if (result.ok) {
      setPhase("done")
      setRetryCaseId(null)
    } else {
      setPhase("failed")
      setError(result.error)
      setRetryCaseId(result.status === "analysis_failed" ? result.caseId : null)
    }
  }

  async function start(patientId: string) {
    if (!file) return
    if (!isAcceptedScanType(file.type)) {
      setError("Format harus PNG atau JPG.")
      return
    }
    const extension = ACCEPTED_SCAN_TYPES[file.type]
    const caseId = crypto.randomUUID()

    setPhase("uploading")
    setError(null)
    setResponse(null)
    const { error: uploadError } = await createClient()
      .storage.from(SCAN_BUCKET)
      .upload(scanPaths.original(patientId, caseId, extension), file, {
        contentType: file.type,
        upsert: false,
      })
    if (uploadError) {
      setPhase("failed")
      setError("Citra gagal diunggah. Periksa koneksi lalu coba lagi.")
      setRetryCaseId(null)
      return
    }
    await analyze({ mode: "new", patientId, caseId, extension })
  }

  function retry() {
    if (retryCaseId) return analyze({ mode: "retry", caseId: retryCaseId })
  }

  // Citra baru membatalkan kasus gagal yang sedang ditampilkan (kasus itu tetap tersimpan).
  function changeFile(next: File | null) {
    setFile(next)
    if (phase === "failed") {
      setPhase("idle")
      setError(null)
      setRetryCaseId(null)
    }
  }

  function reset() {
    setFile(null)
    setPhase("idle")
    setResponse(null)
    setError(null)
    setRetryCaseId(null)
  }

  return {
    file,
    phase,
    busy,
    error,
    retryCaseId,
    success: response?.ok ? response : null,
    start,
    retry,
    changeFile,
    reset,
  }
}
