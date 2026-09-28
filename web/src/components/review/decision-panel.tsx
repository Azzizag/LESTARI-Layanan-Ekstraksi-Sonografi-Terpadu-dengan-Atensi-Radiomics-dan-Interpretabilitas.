// Tanpa "use client": hanya diimpor oleh ReviewConsole (komponen client).
import {
  ArrowRightIcon,
  CircleCheckIcon,
  InfoIcon,
  LoaderCircleIcon,
  LockIcon,
  TriangleAlertIcon,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { saveReview } from "@/app/dokter/review/actions"
import type { AnnotationExport } from "@/components/review/annotation"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { classLabel, SCAN_CLASSES, type ScanClass } from "@/lib/analysis"
import { cn } from "@/lib/utils"

const choiceTone: Record<ScanClass, { dot: string; selected: string }> = {
  normal: { dot: "bg-normal", selected: "border-normal bg-normal-bg text-normal" },
  benign: { dot: "bg-benign", selected: "border-benign bg-benign-bg text-benign" },
  malignant: { dot: "bg-malignant", selected: "border-malignant bg-malignant-bg text-malignant" },
}

export type ExistingReview = {
  finalClass: ScanClass
  notes: string
  doctorName: string | null
  isOwn: boolean
  savedLabel: string
}

export function DecisionPanel({
  caseId,
  patientCode,
  aiClass,
  existing,
  nextCaseId,
  getAnnotation,
}: {
  caseId: string
  patientCode: string
  aiClass: ScanClass
  existing: ExistingReview | null
  nextCaseId: string | null
  getAnnotation: () => Promise<AnnotationExport>
}) {
  const router = useRouter()
  const readOnly = existing !== null && !existing.isOwn
  const [choice, setChoice] = useState<ScanClass | null>(existing?.finalClass ?? null)
  const [notes, setNotes] = useState(existing?.notes ?? "")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [savedNow, setSavedNow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const agreement = choice === null ? "none" : choice === aiClass ? "agree" : "differ"
  const nextHref = nextCaseId ? `/dokter/review/${nextCaseId}` : null

  // Pintasan 1/2/3 memilih kelas (tidak aktif saat mengetik catatan atau saat dialog terbuka).
  const pick = useRef((value: ScanClass) => setChoice(value))
  useEffect(() => {
    pick.current = (value: ScanClass) => {
      if (readOnly || pending) return
      setChoice(value)
      setSavedNow(false)
    }
  })
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest("input, textarea, select, [contenteditable=true], [role=dialog], [role=alertdialog]")) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const index = ["1", "2", "3"].indexOf(e.key)
      if (index >= 0) pick.current(SCAN_CLASSES[index])
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function submit() {
    if (!choice) return
    setError(null)
    startTransition(async () => {
      const annotation = await getAnnotation()
      const form = new FormData()
      form.set("caseId", caseId)
      form.set("finalClass", choice)
      form.set("notes", notes)
      form.set("maskAction", annotation.kind === "png" ? "upload" : annotation.kind)
      if (annotation.kind === "png") form.set("mask", annotation.blob, "mask.png")

      const result = await saveReview(form)
      if (!result.ok) {
        setError(result.error)
        setConfirmOpen(false)
        return
      }
      setConfirmOpen(false)
      setSavedNow(true)
      toast.success(`Diagnosis ${patientCode} tersimpan.`, {
        action: nextHref ? { label: "Kasus berikutnya", onClick: () => router.push(nextHref) } : undefined,
      })
      router.refresh()
    })
  }

  return (
    <section aria-label="Keputusan dokter" className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <h2 className="font-semibold">Diagnosis dokter</h2>
          <p className="text-xs text-muted-foreground">Pilih kelas akhir untuk kasus ini.</p>
        </div>

        {readOnly ? (
          <p className="flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Kasus ini sudah didiagnosis oleh {existing?.doctorName ?? "dokter lain"} dan hanya dapat dilihat.
          </p>
        ) : null}

        <div role="radiogroup" aria-label="Kelas diagnosis" className="grid gap-2">
          {SCAN_CLASSES.map((c, i) => {
            const selected = choice === c
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={readOnly || pending}
                onClick={() => pick.current(c)}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-lg border-2 px-3 text-left font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70",
                  selected ? choiceTone[c].selected : "border-border hover:bg-muted"
                )}
              >
                <span className={cn("size-3 rounded-full", choiceTone[c].dot)} aria-hidden="true" />
                <span className="flex-1">{classLabel[c]}</span>
                {c === aiClass ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Prediksi AI
                  </span>
                ) : null}
                <kbd className="rounded border bg-background px-1.5 font-mono text-[11px] font-normal text-muted-foreground">
                  {i + 1}
                </kbd>
              </button>
            )
          })}
        </div>

        <p
          aria-live="polite"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
            agreement === "agree" && "bg-normal-bg text-normal",
            agreement === "differ" && "bg-benign-bg text-benign",
            agreement === "none" && "bg-muted text-muted-foreground"
          )}
        >
          {agreement === "agree" ? (
            <>
              <CircleCheckIcon className="size-4 shrink-0" aria-hidden="true" />
              Sesuai dengan prediksi AI
            </>
          ) : agreement === "differ" ? (
            <>
              <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
              Berbeda dengan prediksi AI ({classLabel[aiClass]})
            </>
          ) : (
            <>
              <InfoIcon className="size-4 shrink-0" aria-hidden="true" />
              Belum ada pilihan
            </>
          )}
        </p>

        <div className="grid gap-1.5">
          <Label htmlFor="clinical-notes">Catatan klinis</Label>
          <Textarea
            id="clinical-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            rows={4}
            disabled={readOnly || pending}
            placeholder="Temuan, rekomendasi tindak lanjut, atau alasan jika berbeda dengan AI"
            className="resize-none"
          />
        </div>

        {error ? (
          <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
            <TriangleAlertIcon className="size-4" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        {!readOnly ? (
          <Button size="lg" className="w-full" disabled={!choice || pending} onClick={() => setConfirmOpen(true)}>
            {existing ? "Perbarui diagnosis" : "Simpan diagnosis"}
          </Button>
        ) : null}

        {existing && !savedNow ? (
          <p className="text-center text-xs text-muted-foreground">
            Tersimpan {existing.savedLabel}
            {existing.doctorName ? ` oleh ${existing.doctorName}` : ""}
          </p>
        ) : null}

        {savedNow ? (
          <div className="space-y-2 rounded-lg border border-normal/40 bg-normal-bg p-3 text-sm text-normal">
            <p className="flex items-center gap-2 font-medium">
              <CircleCheckIcon className="size-4" aria-hidden="true" />
              Diagnosis {patientCode} tersimpan.
            </p>
            {nextHref ? (
              <Button asChild size="sm" className="w-full">
                <Link href={nextHref}>
                  Kasus berikutnya
                  <ArrowRightIcon />
                </Link>
              </Button>
            ) : (
              <p className="text-xs">Tidak ada kasus lain yang menunggu review.</p>
            )}
          </div>
        ) : null}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !pending && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Simpan diagnosis?</AlertDialogTitle>
            <AlertDialogDescription>
              Simpan diagnosis {choice ? classLabel[choice] : ""} untuk {patientCode}?
              {agreement === "differ" ? ` Pilihan ini berbeda dengan prediksi AI (${classLabel[aiClass]}).` : ""}{" "}
              Diagnosis bisa diubah kembali dari riwayat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <Button onClick={submit} disabled={pending}>
              {pending ? (
                <>
                  <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
