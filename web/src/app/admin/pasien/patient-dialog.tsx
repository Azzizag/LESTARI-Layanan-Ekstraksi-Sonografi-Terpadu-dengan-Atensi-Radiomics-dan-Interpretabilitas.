// Tanpa "use client": hanya diimpor oleh patients-view (komponen client).
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRightIcon, DatabaseIcon, RotateCcwIcon, ScanSearchIcon, SendIcon, TriangleAlertIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createPatient, type CreatedPatient } from "@/app/admin/pasien/actions"
import { CaseStatusBadge } from "@/components/case-status-badge"
import { PipelineTrace } from "@/components/pipeline-trace"
import { PredictionBadge } from "@/components/prediction-badge"
import { ProbabilityBars } from "@/components/probability-bars"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { UploadDropzone } from "@/components/upload-dropzone"
import { siteConfig } from "@/config/site"
import { useScanAnalysis } from "@/hooks/use-scan-analysis"
import { formatMs } from "@/lib/analysis"
import { dayKey } from "@/lib/format"
import { cn } from "@/lib/utils"
import { patientFormSchema, type PatientFormInput, type PatientFormOutput } from "@/lib/validators"

export type PatientDialogTarget =
  | { mode: "new" }
  | { mode: "upload"; patient: CreatedPatient }
  | { mode: "retry"; patient: CreatedPatient; caseId: string }

const warningText: Record<string, string> = {
  empty_roi: "Mask ROI kosong setelah Otsu, fitur radiomics diisi nilai median.",
}

// Dialog tambah pasien (langkah 1 data, langkah 2 unggah) sekaligus dialog unggah citra
// dan analisis ulang untuk pasien yang sudah ada. `openKey` mereset isi dialog setiap dibuka.
export function PatientDialog({
  target,
  openKey,
  onClose,
}: {
  target: PatientDialogTarget | null
  openKey: number
  onClose: () => void
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      {target ? <PatientDialogBody key={openKey} target={target} onClose={onClose} /> : null}
    </Dialog>
  )
}

function PatientDialogBody({ target, onClose }: { target: PatientDialogTarget; onClose: () => void }) {
  const [patient, setPatient] = useState<CreatedPatient | null>(target.mode === "new" ? null : target.patient)
  const scan = useScanAnalysis(target.mode === "retry" ? target.caseId : null)
  const wide = scan.phase === "analyzing" || scan.phase === "done"

  function close() {
    // Pasien baru yang belum diberi citra tetap tersimpan; beri tahu admin.
    if (target.mode === "new" && patient && scan.phase !== "done") {
      toast(`Pasien ${patient.code} tersimpan. Citra dapat diunggah nanti dari tabel pasien.`)
    }
    onClose()
  }

  return (
    <DialogContent
      showCloseButton={!scan.busy}
      // Dialog tidak bisa ditutup saat citra sedang diunggah atau dianalisis.
      onEscapeKeyDown={(e) => scan.busy && e.preventDefault()}
      onInteractOutside={(e) => scan.busy && e.preventDefault()}
      className={cn(
        // Header dan footer tetap terlihat; hanya isi langkah unggah yang di-scroll (layar 768 px).
        "max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-5 overflow-hidden p-6",
        wide ? "sm:max-w-3xl" : "sm:max-w-xl"
      )}
    >
      {patient ? (
        <UploadStep target={target} patient={patient} scan={scan} onClose={close} />
      ) : (
        <PatientStep onCreated={setPatient} onCancel={onClose} />
      )}
    </DialogContent>
  )
}

function PatientStep({
  onCreated,
  onCancel,
}: {
  onCreated: (patient: CreatedPatient) => void
  onCancel: () => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<PatientFormInput, unknown, PatientFormOutput>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: { fullName: "", birthDate: "", phone: "" },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async () => {
    setServerError(null)
    const result = await createPatient(form.getValues())
    if (result.ok) return onCreated(result.patient)
    setServerError(result.error)
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      form.setError(field as keyof PatientFormInput, { message })
    }
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="text-lg">Tambah pasien</DialogTitle>
        <DialogDescription>Langkah 1 dari 2 · Data pasien</DialogDescription>
      </DialogHeader>

      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Field id="fullName" label="Nama lengkap" error={errors.fullName?.message} className="sm:col-span-2">
          <Input id="fullName" autoFocus autoComplete="off" {...form.register("fullName")} />
        </Field>
        <Field id="birthDate" label="Tanggal lahir (opsional)" error={errors.birthDate?.message}>
          <Input id="birthDate" type="date" max={dayKey(new Date())} {...form.register("birthDate")} />
        </Field>
        <Field id="phone" label="No. telepon (opsional)" error={errors.phone?.message}>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="0812 3456 7890"
            autoComplete="off"
            {...form.register("phone")}
          />
        </Field>
      </div>

      {serverError ? (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <TriangleAlertIcon className="size-4" aria-hidden="true" />
          {serverError}
        </p>
      ) : null}

      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Lanjut"}
          <ArrowRightIcon />
        </Button>
      </DialogFooter>
    </form>
  )
}

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)} data-invalid={error ? true : undefined}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function UploadStep({
  target,
  patient,
  scan,
  onClose,
}: {
  target: PatientDialogTarget
  patient: CreatedPatient
  scan: ReturnType<typeof useScanAnalysis>
  onClose: () => void
}) {
  const { phase, success } = scan
  const title =
    phase === "analyzing" ? "Menganalisis citra" : phase === "done" ? "Hasil analisis AI" : "Unggah citra USG"
  const step = target.mode === "new" ? "Langkah 2 dari 2 · " : ""

  function sendToQueue() {
    if (!success) return
    const queue = success.status === "priority" ? "antrean prioritas" : "antrean review"
    toast.success(`Kasus ${patient.code} masuk ${queue} dokter.`)
    onClose()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg">{title}</DialogTitle>
        <DialogDescription>
          {step}
          <span className="tabular">{patient.code}</span> · {patient.fullName}
        </DialogDescription>
      </DialogHeader>

      {phase === "analyzing" || phase === "done" ? (
        <div
          className="-mx-6 grid min-h-0 gap-5 overflow-y-auto px-6 md:grid-cols-[minmax(0,1fr)_280px]"
          aria-live="polite"
        >
          <PipelineTrace result={success?.result ?? null} images={success?.images} />
          {success ? (
            <div className="space-y-3 self-start rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Prediksi AI</p>
                  <p className="tabular text-xs text-muted-foreground">
                    total {formatMs(success.result.latencyMs.total)}
                  </p>
                </div>
                <PredictionBadge value={success.result.predictedClass} size="lg" />
              </div>
              <ProbabilityBars
                probabilities={success.result.probabilities}
                predicted={success.result.predictedClass}
              />
              {success.result.cached ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DatabaseIcon className="size-3.5" aria-hidden="true" />
                  Hasil tersimpan (mode demo).
                </p>
              ) : null}
              {success.result.warnings.map((w) => (
                <p key={w} className="text-xs text-benign">
                  {warningText[w] ?? `Peringatan model: ${w}`}
                </p>
              ))}
              <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                Status kasus <CaseStatusBadge status={success.status} />
              </div>
              <p className="text-xs text-muted-foreground">{siteConfig.disclaimer}</p>
            </div>
          ) : (
            <div className="space-y-3 self-start rounded-lg border p-4" aria-hidden="true">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          )}
        </div>
      ) : (
        <div className="-mx-6 min-h-0 space-y-3 overflow-y-auto px-6">
          <UploadDropzone file={scan.file} onFileChange={scan.changeFile} disabled={scan.busy} />
          {phase === "failed" ? (
            <div role="alert" className="space-y-1 rounded-lg bg-malignant-bg p-3 text-malignant">
              <p className="flex items-center gap-2 font-medium">
                <TriangleAlertIcon className="size-4" aria-hidden="true" />
                {scan.retryCaseId
                  ? "Analisis belum berhasil. Citra sudah tersimpan, coba analisis ulang."
                  : "Analisis belum dapat dijalankan."}
              </p>
              {scan.error ? <p className="text-sm">{scan.error}</p> : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Citra disimpan di penyimpanan private.</p>
          )}
        </div>
      )}

      <DialogFooter className="-mx-6 -mb-6 px-6">
        {phase === "done" ? (
          <>
            <Button variant="outline" onClick={scan.reset}>
              Unggah citra lain
            </Button>
            <Button onClick={sendToQueue}>
              <SendIcon />
              Kirim ke antrean dokter
            </Button>
          </>
        ) : phase === "analyzing" ? (
          <Button disabled>
            <ScanSearchIcon />
            Menganalisis...
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={scan.busy}>
              {target.mode === "new" ? "Nanti saja" : "Tutup"}
            </Button>
            {scan.retryCaseId && !scan.file ? (
              <Button onClick={scan.retry}>
                <RotateCcwIcon />
                Analisis ulang
              </Button>
            ) : (
              <Button onClick={() => scan.start(patient.id)} disabled={!scan.file || scan.busy}>
                <ScanSearchIcon />
                {phase === "uploading" ? "Mengunggah citra..." : "Analisis citra"}
              </Button>
            )}
          </>
        )}
      </DialogFooter>
    </>
  )
}
