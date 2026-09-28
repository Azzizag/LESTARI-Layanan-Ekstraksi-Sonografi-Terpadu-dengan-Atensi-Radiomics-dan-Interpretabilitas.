"use client"

import { DatabaseIcon, RotateCcwIcon, ScanSearchIcon, TriangleAlertIcon } from "lucide-react"
import { useState } from "react"

import { PipelineTrace } from "@/components/pipeline-trace"
import { PredictionBadge } from "@/components/prediction-badge"
import { ProbabilityBars } from "@/components/probability-bars"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UploadDropzone } from "@/components/upload-dropzone"
import { siteConfig } from "@/config/site"
import { caseStatusLabel, type AnalyzeResponse } from "@/lib/analysis"
import { ACCEPTED_SCAN_TYPES, isAcceptedScanType, SCAN_BUCKET, scanPaths } from "@/lib/scans"
import { createClient } from "@/lib/supabase/client"
import type { AnalyzeRequest } from "@/lib/validators"

export type PatientOption = { id: string; code: string; fullName: string }

type Phase = "idle" | "uploading" | "analyzing" | "done" | "failed"

const warningText: Record<string, string> = {
  empty_roi: "Mask ROI kosong setelah Otsu, fitur radiomics diisi nilai median.",
}

// Unggah citra langsung ke bucket private (policy admin), lalu minta server menjalankan analisis.
// Citra tidak lewat fungsi server web, sehingga tidak terkena batas ukuran body request di Vercel.
export function AnalyzePanel({ patients }: { patients: PatientOption[] }) {
  const [patientId, setPatientId] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [response, setResponse] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCaseId, setRetryCaseId] = useState<string | null>(null)

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

  async function start() {
    if (!file || !patientId) return
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

  const success = response?.ok ? response : null

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Unggah citra USG</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="patient">Pasien</Label>
            <Select value={patientId} onValueChange={setPatientId} disabled={busy || retryCaseId !== null}>
              <SelectTrigger id="patient" className="w-full">
                <SelectValue placeholder="Pilih pasien" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="tabular text-muted-foreground">{p.code}</span> {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <UploadDropzone file={file} onFileChange={changeFile} disabled={busy || phase === "done"} />
          {phase === "done" ? (
            <Button variant="outline" className="w-full" onClick={reset}>
              Unggah citra lain
            </Button>
          ) : (
            // Saat analisis gagal, citra ini sudah tersimpan sebagai kasus: pakai "Analisis ulang" agar tidak dobel.
            <Button
              className="w-full"
              size="lg"
              disabled={!file || !patientId || busy || retryCaseId !== null}
              onClick={start}
            >
              <ScanSearchIcon />
              {phase === "uploading" ? "Mengunggah citra..." : phase === "analyzing" ? "Menganalisis..." : "Analisis citra"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card aria-live="polite">
        <CardHeader>
          <CardTitle>Jejak pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {phase === "idle" || phase === "uploading" ? (
            <p className="py-10 text-center text-muted-foreground">
              {phase === "uploading"
                ? "Mengunggah citra ke penyimpanan aman..."
                : "Pilih pasien dan citra, lalu jalankan analisis. Langkah metode akan tampil di sini."}
            </p>
          ) : null}

          {phase === "analyzing" ? <PipelineTrace result={null} /> : null}

          {phase === "failed" ? (
            <div role="alert" className="space-y-3 rounded-lg bg-malignant-bg p-4 text-malignant">
              <p className="flex items-center gap-2 font-medium">
                <TriangleAlertIcon className="size-4" aria-hidden="true" />
                {retryCaseId
                  ? "Analisis belum berhasil. Citra sudah tersimpan, coba analisis ulang."
                  : "Analisis belum dapat dijalankan."}
              </p>
              {error ? <p className="text-sm">{error}</p> : null}
              {retryCaseId ? (
                <Button
                  variant="outline"
                  className="bg-card"
                  onClick={() => analyze({ mode: "retry", caseId: retryCaseId })}
                >
                  <RotateCcwIcon />
                  Analisis ulang
                </Button>
              ) : null}
            </div>
          ) : null}

          {success ? (
            <>
              <PipelineTrace result={success.result} images={success.images} />
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Prediksi AI</span>
                    <PredictionBadge value={success.result.predictedClass} size="lg" />
                  </div>
                  {success.result.cached ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <DatabaseIcon className="size-3.5" aria-hidden="true" />
                      Hasil tersimpan (mode demo).
                    </span>
                  ) : null}
                </div>
                <ProbabilityBars
                  probabilities={success.result.probabilities}
                  predicted={success.result.predictedClass}
                />
                {success.result.warnings.map((w) => (
                  <p key={w} className="text-xs text-benign">
                    {warningText[w] ?? `Peringatan model: ${w}`}
                  </p>
                ))}
                <p className="text-sm">
                  Kasus masuk antrean dokter dengan status{" "}
                  <span className="font-medium">{caseStatusLabel[success.status]}</span>.
                </p>
                <p className="text-xs text-muted-foreground">{siteConfig.disclaimer}</p>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
