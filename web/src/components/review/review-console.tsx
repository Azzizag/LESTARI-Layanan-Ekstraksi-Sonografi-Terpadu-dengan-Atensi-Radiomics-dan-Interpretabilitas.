"use client"

import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, LoaderCircleIcon } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useCallback, useRef, useSyncExternalStore } from "react"

import { CaseStatusBadge } from "@/components/case-status-badge"
import { AiPanel } from "@/components/review/ai-panel"
import type { AnnotationExport } from "@/components/review/annotation"
import { CollapseSidebar } from "@/components/review/collapse-sidebar"
import { DecisionPanel, type ExistingReview } from "@/components/review/decision-panel"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ReviewCase } from "@/lib/review"

// Konva membutuhkan DOM kanvas, jadi viewer hanya dirender di browser.
const ScanViewer = dynamic(() => import("@/components/review/scan-viewer"), {
  ssr: false,
  loading: () => (
    <div className="grid place-items-center rounded-xl bg-viewer text-sm text-white/70">
      <span className="flex items-center gap-2" role="status">
        <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
        Menyiapkan viewer...
      </span>
    </div>
  ),
})

// Tiga kolom mulai 1280 px; di bawahnya panel AI dan keputusan menjadi tab (DESIGN.md 5.6).
const WIDE_QUERY = "(min-width: 1280px)"
function useWideLayout() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(WIDE_QUERY)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true
  )
}

// nextPendingId: kasus berikutnya yang belum direview, untuk tombol "Kasus berikutnya" setelah simpan.
export type CaseNavigation = { previousId: string | null; nextId: string | null; nextPendingId: string | null }

export function ReviewConsole({
  data,
  prediction,
  navigation,
  labels,
  existingReview,
}: {
  data: ReviewCase
  prediction: NonNullable<ReviewCase["prediction"]>
  navigation: CaseNavigation
  labels: { uploaded: string; processed: string }
  existingReview: ExistingReview | null
}) {
  const wide = useWideLayout()
  const { patient } = data

  // Viewer mendaftarkan fungsi ekspor mask anotasi; panel keputusan memanggilnya saat menyimpan.
  const exporter = useRef<(() => Promise<AnnotationExport>) | null>(null)
  const registerExporter = useCallback((fn: () => Promise<AnnotationExport>) => {
    exporter.current = fn
  }, [])
  const getAnnotation = useCallback(
    (): Promise<AnnotationExport> => exporter.current?.() ?? Promise.resolve({ kind: "keep" }),
    []
  )

  const viewer = <ScanViewer images={data.images} onExporterReady={registerExporter} />
  const decisionPanel = (
    <DecisionPanel
      caseId={data.caseId}
      patientCode={patient.code}
      aiClass={prediction.predictedClass}
      existing={existingReview}
      nextCaseId={navigation.nextPendingId}
      getAnnotation={getAnnotation}
    />
  )

  const aiPanel = (
    <AiPanel
      prediction={prediction}
      images={data.images}
      patientCode={patient.code}
      processedLabel={labels.processed}
    />
  )

  return (
    <div className="flex h-[calc(100dvh-3.5rem-3rem)] min-h-[600px] flex-col gap-3">
      <CollapseSidebar />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/dokter">
              <ArrowLeftIcon />
              Antrean
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">
              Kasus <span className="tabular">{patient.code}</span> · {patient.fullName}
              {patient.age !== undefined ? `, ${patient.age} th` : ""}
            </h1>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              Diunggah {labels.uploaded}
              <CaseStatusBadge status={data.status} />
            </p>
          </div>
        </div>
        <nav aria-label="Navigasi kasus" className="flex items-center gap-2">
          <NavButton href={navigation.previousId} label="Sebelumnya" direction="previous" />
          <NavButton href={navigation.nextId} label="Berikutnya" direction="next" />
        </nav>
      </header>

      {wide ? (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px_320px] gap-3">
          {viewer}
          {aiPanel}
          {decisionPanel}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] gap-3">
          {viewer}
          <Tabs defaultValue="decision" className="flex min-h-0 flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="ai">Hasil AI</TabsTrigger>
              <TabsTrigger value="decision">Keputusan</TabsTrigger>
            </TabsList>
            {/* forceMount: pilihan dan catatan tidak hilang saat berpindah tab. */}
            <TabsContent value="ai" forceMount className="flex min-h-0 flex-col data-[state=inactive]:hidden">
              {aiPanel}
            </TabsContent>
            <TabsContent value="decision" forceMount className="flex min-h-0 flex-col data-[state=inactive]:hidden">
              {decisionPanel}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

function NavButton({
  href,
  label,
  direction,
}: {
  href: string | null
  label: string
  direction: "previous" | "next"
}) {
  const icon = direction === "previous" ? <ChevronLeftIcon /> : <ChevronRightIcon />
  if (!href) {
    return (
      <Button variant="outline" size="sm" disabled>
        {direction === "previous" ? icon : null}
        {label}
        {direction === "next" ? icon : null}
      </Button>
    )
  }
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={`/dokter/review/${href}`}>
        {direction === "previous" ? icon : null}
        {label}
        {direction === "next" ? icon : null}
      </Link>
    </Button>
  )
}
