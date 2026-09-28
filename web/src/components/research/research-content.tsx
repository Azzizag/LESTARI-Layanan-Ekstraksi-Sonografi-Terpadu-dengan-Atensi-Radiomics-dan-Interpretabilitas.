import { ArrowRightIcon, InfoIcon, LogInIcon, UsersRoundIcon } from "lucide-react"
import Link from "next/link"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { LatencyStack, MatrixTable, PercentBars, type BarItem } from "@/components/research/research-charts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { modelCard, type Metrics } from "@/content/model-card"
import { classLabel, formatMs, SCAN_CLASSES, type ScanClass } from "@/lib/analysis"
import { formatInteger, formatPaperMs, formatPaperPercent, formatPoints } from "@/lib/format"
import type { HitlStats } from "@/lib/hitl"

const mc = modelCard

// Kesalahan klasifikasi terbesar dihitung dari confusion matrix, bukan teks tetap.
function largestConfusion() {
  let best = { actual: "benign" as ScanClass, predicted: "benign" as ScanClass, count: 0 }
  for (const a of SCAN_CLASSES) {
    for (const p of SCAN_CLASSES) {
      if (a !== p && mc.confusionMatrix[a][p] > best.count) best = { actual: a, predicted: p, count: mc.confusionMatrix[a][p] }
    }
  }
  return best
}

const f1Bars: BarItem[] = [
  ...mc.sota.map((s) => ({ label: `${s.model} (reproduksi)`, value: s.f1, tone: "sota" as const })),
  {
    label: "DenseNet-201 (deep features saja)",
    value: mc.baseline.find((b) => b.model === "DenseNet-201")!.f1,
    tone: "baseline",
  },
  { label: "+ Radiomics", value: mc.selectionGain.from, tone: "method" },
  { label: "+ Radiomics + MI-150 (dipakai aplikasi)", value: mc.best.f1, tone: "best" },
]

function MetricTable({
  rows,
  withDelta = false,
}: {
  rows: readonly ({ model: string; deltaF1?: number } & Metrics)[]
  withDelta?: boolean
}) {
  return (
    <Table className="text-[13px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Model</TableHead>
          <TableHead className="text-right">Akurasi</TableHead>
          <TableHead className="text-right">Precision</TableHead>
          <TableHead className="text-right">Recall</TableHead>
          <TableHead className="text-right">F1</TableHead>
          {withDelta ? <TableHead className="text-right">Selisih F1</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.model} className="hover:bg-transparent">
            <TableCell className="font-medium">{r.model}</TableCell>
            <TableCell className="tabular text-right">{formatPaperPercent(r.accuracy)}</TableCell>
            <TableCell className="tabular text-right">{formatPaperPercent(r.precision)}</TableCell>
            <TableCell className="tabular text-right">{formatPaperPercent(r.recall)}</TableCell>
            <TableCell className="tabular text-right">{formatPaperPercent(r.f1)}</TableCell>
            {withDelta && r.deltaF1 !== undefined ? (
              <TableCell className="tabular text-right">{formatPoints(r.deltaF1)}</TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function Meta({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Placeholder({ label }: { label: string }) {
  return <span className="text-muted-foreground/70 italic">Belum diisi ({label})</span>
}

export function ResearchContent({ hitl, signedIn }: { hitl: HitlStats | null; signedIn: boolean }) {
  const confusion = largestConfusion()
  const bestRow = { model: mc.modelName, ...mc.best }

  return (
    <>
      <PageHeader
        title="Riset & Model"
        description={mc.paperTitle}
        actions={<Badge variant="outline">Angka dari paper · data uji {mc.dataset.test.total} citra</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle>Pipeline metode</CardTitle>
          <CardDescription>
            Grad-CAM tidak hanya untuk visualisasi: heatmap-nya menentukan ROI tempat fitur radiomics diekstraksi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {mc.pipeline.map((step, i) => (
              <li key={step.title} className="flex gap-3 rounded-lg border bg-background/60 p-3">
                <span className="tabular text-xs font-semibold text-primary">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Kartu model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Meta
              items={[
                ["Model", <span key="m" className="font-medium">{mc.modelName}</span>],
                ["Klasifier", mc.classifier],
                ["Versi", <span key="v" className="tabular">{mc.version}</span>],
                ["Parameter backbone", <span key="p" className="tabular">{formatInteger(mc.complexity.parameters)}</span>],
                ["FLOPs backbone", <span key="f" className="tabular">{formatInteger(mc.complexity.flops)}</span>],
                ["Ukuran model", <span key="s" className="tabular">{mc.complexity.sizeMb.toLocaleString("id-ID")} MB</span>],
                ["Dataset", `BUSI + Mendeley, ${formatInteger(mc.dataset.combined.total)} citra`],
                ["Split", mc.dataset.split],
              ]}
            />
            <div className="rounded-lg bg-muted p-3 text-xs">
              <p className="font-medium">
                Fitur terpilih MI-150: {mc.implementation.selected.deep} deep, {mc.implementation.selected.radiomics}{" "}
                radiomics
              </p>
              <p className="mt-1 text-muted-foreground">
                Radiomics ikut difusikan ({formatInteger(mc.implementation.featuresIntoSelection)} fitur masuk seleksi),
                tetapi pada model yang dipakai aplikasi seluruh {mc.implementation.selected.total} fitur terpilih berasal
                dari deep features. Sumber: bundel model v1.0.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hasil data uji</CardTitle>
            <CardDescription>Macro, {mc.dataset.test.total} citra</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ["F1", mc.best.f1],
                  ["Akurasi", mc.best.accuracy],
                  ["Precision", mc.best.precision],
                  ["Recall", mc.best.recall],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="tabular text-lg leading-tight font-semibold">{formatPaperPercent(value)}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Kelas</TableHead>
                  <TableHead className="text-right">Precision</TableHead>
                  <TableHead className="text-right">Recall</TableHead>
                  <TableHead className="text-right">F1</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SCAN_CLASSES.map((c) => (
                  <TableRow key={c} className="hover:bg-transparent">
                    <TableCell className="font-medium">{classLabel[c]}</TableCell>
                    <TableCell className="tabular text-right">{formatPaperPercent(mc.perClass[c].precision)}</TableCell>
                    <TableCell className="tabular text-right">{formatPaperPercent(mc.perClass[c].recall)}</TableCell>
                    <TableCell className="tabular text-right">{formatPaperPercent(mc.perClass[c].f1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confusion matrix</CardTitle>
            <CardDescription>Data uji paper (Gambar 8)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <MatrixTable
              matrix={mc.confusionMatrix}
              rowLabel="Label asli"
              colLabel="Prediksi"
              caption="Baris: label asli · Kolom: prediksi model"
            />
            <p className="text-xs text-muted-foreground">
              Kesalahan terbesar: {confusion.count} citra {classLabel[confusion.actual]} diprediksi{" "}
              {classLabel[confusion.predicted]}.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Perbandingan F1-score</CardTitle>
            <CardDescription>Tahapan metode tim dan model pembanding pada data yang sama</CardDescription>
          </CardHeader>
          <CardContent>
            <PercentBars items={f1Bars} />
            <p className="mt-3 text-xs text-muted-foreground">
              Seleksi MI-150 menaikkan F1 dari {formatPaperPercent(mc.selectionGain.from)} ke{" "}
              {formatPaperPercent(mc.selectionGain.to)} ({formatPoints(mc.selectionGain.deltaF1)}).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waktu inferensi per citra</CardTitle>
            <CardDescription>Tabel VIII, diukur di {mc.complexity.device}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="tabular text-2xl font-semibold">{formatPaperMs(mc.complexity.totalMs)}</p>
            <LatencyStack parts={mc.complexity.timingMs} totalMs={mc.complexity.totalMs} />
            {hitl?.averageLatencyMs ? (
              <p className="border-t pt-3 text-xs text-muted-foreground">
                Di server aplikasi (CPU): rata-rata{" "}
                <span className="tabular font-medium text-foreground">{formatMs(hitl.averageLatencyMs)}</span> dari{" "}
                {formatInteger(hitl.analyses)} analisis.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <HitlCard hitl={hitl} signedIn={signedIn} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card className="gap-3">
          <CardHeader>
            <CardTitle>Tabel hasil lengkap</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="sota">
              <TabsList>
                <TabsTrigger value="sota">State of the art</TabsTrigger>
                <TabsTrigger value="baseline">Baseline</TabsTrigger>
                <TabsTrigger value="fusion">Fusi radiomics</TabsTrigger>
                <TabsTrigger value="ablation">Ablasi dataset</TabsTrigger>
              </TabsList>
              <TabsContent value="sota" className="pt-2">
                <p className="text-xs text-muted-foreground">Tabel VII. Pembanding direproduksi pada data yang sama.</p>
                <MetricTable rows={[...mc.sota, bestRow]} />
              </TabsContent>
              <TabsContent value="baseline" className="pt-2">
                <p className="text-xs text-muted-foreground">Tabel V. Deep features saja.</p>
                <MetricTable rows={mc.baseline} />
              </TabsContent>
              <TabsContent value="fusion" className="pt-2">
                <p className="text-xs text-muted-foreground">Tabel VI. Fusi radiomics tanpa seleksi fitur.</p>
                <MetricTable rows={mc.fusion} withDelta />
              </TabsContent>
              <TabsContent value="ablation" className="pt-2">
                <p className="text-xs text-muted-foreground">Tabel IX dan X. F1 per dataset.</p>
                <Table className="text-[13px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Konfigurasi</TableHead>
                      <TableHead className="text-right">BUSI</TableHead>
                      <TableHead className="text-right">Mendeley</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mc.ablation.map((a) => (
                      <TableRow key={a.config} className="hover:bg-transparent">
                        <TableCell className="font-medium">{a.config}</TableCell>
                        <TableCell className="tabular text-right">{formatPaperPercent(a.busiF1)}</TableCell>
                        <TableCell className="tabular text-right">{formatPaperPercent(a.mendeleyF1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="gap-3">
          <CardHeader>
            <CardTitle>Dataset</CardTitle>
            <CardDescription>
              {formatInteger(mc.dataset.combined.total)} citra dari {formatInteger(mc.dataset.initialTotal)} awal.{" "}
              {mc.dataset.removedNote}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Sumber</TableHead>
                  {SCAN_CLASSES.map((c) => (
                    <TableHead key={c} className="text-right">
                      {classLabel[c]}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...mc.dataset.sources, { name: "Gabungan", ...mc.dataset.combined }].map((s) => (
                  <TableRow key={s.name} className="hover:bg-transparent">
                    <TableCell className="font-medium">{s.name}</TableCell>
                    {SCAN_CLASSES.map((c) => (
                      <TableCell key={c} className="tabular text-right">
                        {formatInteger(s[c])}
                      </TableCell>
                    ))}
                    <TableCell className="tabular text-right font-medium">{formatInteger(s.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Meta
              items={[
                ["Split", `${mc.dataset.split}, data uji ${mc.dataset.test.total} citra`],
                ["Augmentasi", mc.dataset.augmentation],
                ["Lisensi", mc.dataset.license ?? <Placeholder key="l" label="lisensi BUSI dan Mendeley" />],
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card className="gap-3">
          <CardHeader>
            <CardTitle>Keterbatasan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {mc.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
              <li>
                Heatmap Grad-CAM menunjukkan area yang berpengaruh pada prediksi, bukan segmentasi lesi. Data pasien
                pada demo ini fiktif.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="gap-3">
          <CardHeader>
            <CardTitle>Konfigurasi pelatihan</CardTitle>
            <CardDescription>Tabel III dan IV</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Meta
              items={[
                ["Backbone", `${mc.training.input}, bobot ${mc.training.weights}`],
                ["Optimizer", `${mc.training.optimizer}, lr ${mc.training.learningRate}`],
                ["Epoch / batch", `${mc.training.epochs} / ${mc.training.batchSize}`],
                ["Loss", mc.training.loss],
                ["LightGBM", `${formatInteger(mc.lightgbm.nEstimators)} estimator, lr ${mc.lightgbm.learningRate}`],
                ["Leaves / min data", `${mc.lightgbm.numLeaves} / ${mc.lightgbm.minDataInLeaf}`],
                ["Subsample / colsample", `${mc.lightgbm.subsample} / ${mc.lightgbm.colsample}`],
              ]}
            />
            <p className="flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              SHAP: {mc.shap.note}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function HitlCard({ hitl, signedIn }: { hitl: HitlStats | null; signedIn: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Di aplikasi ini</CardTitle>
          <Badge className="bg-primary-soft text-primary">Data langsung</Badge>
        </div>
        <CardDescription>Validasi dokter atas prediksi AI (Human-in-the-Loop)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!signedIn || !hitl ? (
          <EmptyState
            icon={LogInIcon}
            title="Masuk untuk melihat statistik"
            description="Jumlah kasus direview dan kesepakatan AI dengan dokter hanya tersedia bagi staf."
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/login">
                  Masuk
                  <ArrowRightIcon />
                </Link>
              </Button>
            }
            className="py-4"
          />
        ) : hitl.reviewed === 0 ? (
          <EmptyState
            icon={UsersRoundIcon}
            title="Belum ada kasus yang direview"
            description="Statistik muncul setelah dokter menyimpan diagnosis pertama."
            className="py-4"
          />
        ) : (
          <>
            <div className="flex gap-6">
              <div>
                <p className="tabular text-2xl leading-tight font-semibold">{formatInteger(hitl.reviewed)}</p>
                <p className="text-xs text-muted-foreground">kasus direview</p>
              </div>
              <div>
                <p className="tabular text-2xl leading-tight font-semibold">
                  {Math.round((hitl.agreed / hitl.reviewed) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  sepakat AI dan dokter ({formatInteger(hitl.agreed)} dari {formatInteger(hitl.reviewed)})
                </p>
              </div>
            </div>
            <MatrixTable
              matrix={hitl.matrix}
              rowLabel="AI"
              colLabel="Dokter"
              caption="Baris: prediksi AI · Kolom: diagnosis dokter"
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
