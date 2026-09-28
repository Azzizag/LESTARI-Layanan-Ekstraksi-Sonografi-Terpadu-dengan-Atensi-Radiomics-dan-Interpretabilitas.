// Tanpa "use client": hanya diimpor oleh ReviewConsole (komponen client).
import { ActivityIcon, DatabaseIcon, InfoIcon } from "lucide-react"

import { PipelineTrace } from "@/components/pipeline-trace"
import { PredictionBadge } from "@/components/prediction-badge"
import { ProbabilityBars } from "@/components/probability-bars"
import { ShapPanel } from "@/components/review/shap-panel"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { siteConfig } from "@/config/site"
import { formatMs } from "@/lib/analysis"
import type { ReviewCase } from "@/lib/review"

const warningText: Record<string, string> = {
  empty_roi: "Mask ROI kosong setelah Otsu, fitur radiomics diisi nilai median.",
}

const areaFormat = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 1 })

export function AiPanel({
  prediction,
  images,
  patientCode,
  processedLabel,
}: {
  prediction: NonNullable<ReviewCase["prediction"]>
  images: ReviewCase["images"]
  patientCode: string
  processedLabel: string
}) {
  return (
    <section aria-label="Hasil AI" className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Hasil AI</h2>
          {prediction.cached ? (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <DatabaseIcon className="size-3.5" aria-hidden="true" />
              Hasil tersimpan (mode demo)
            </span>
          ) : null}
        </div>

        <PredictionBadge value={prediction.predictedClass} size="lg" />
        <ProbabilityBars probabilities={prediction.probabilities} predicted={prediction.predictedClass} />

        {prediction.warnings.map((w) => (
          <p key={w} className="text-xs text-benign">
            {warningText[w] ?? `Peringatan model: ${w}`}
          </p>
        ))}

        <div className="border-t pt-3">
          <h3 className="mb-2.5 text-sm font-semibold">Fitur paling berpengaruh</h3>
          <ShapPanel features={prediction.shapTop} predicted={prediction.predictedClass} />
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t pt-3 text-xs">
          <dt className="text-muted-foreground">Versi model</dt>
          <dd className="tabular text-right">{prediction.modelVersion}</dd>
          <dt className="text-muted-foreground">Latensi total</dt>
          <dd className="tabular text-right">{formatMs(prediction.latencyMs.total)}</dd>
          <dt className="text-muted-foreground">Luas ROI</dt>
          <dd className="tabular text-right">{areaFormat.format(prediction.roi.areaRatio)} citra</dd>
          <dt className="text-muted-foreground">Diproses</dt>
          <dd className="text-right">{processedLabel}</dd>
        </dl>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <ActivityIcon />
              Lihat jejak pipeline
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Jejak pipeline</SheetTitle>
              <SheetDescription>Langkah metode yang dijalankan untuk kasus {patientCode}.</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-6">
              <PipelineTrace result={prediction} images={images} />
              <p className="flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Heatmap Grad-CAM dari DenseNet-201 diubah menjadi mask ROI dengan ambang Otsu, lalu radiomics
                diekstraksi hanya dari area itu. Heatmap menunjukkan area yang berpengaruh pada prediksi, bukan
                batas lesi.
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <p className="flex gap-2 border-t bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {siteConfig.disclaimer}
      </p>
    </section>
  )
}
