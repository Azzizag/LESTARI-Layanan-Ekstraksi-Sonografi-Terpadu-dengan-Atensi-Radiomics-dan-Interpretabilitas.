// Jalankan: pnpm test. Memastikan angka metrik di model-card.ts konsisten dengan confusion matrix
// paper (Gambar 8), sama seperti pemeriksaan konsistensi di docs/METODOLOGI.md bagian 7.
import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { modelCard, type PaperClass } from "./model-card.ts"

const classes: PaperClass[] = ["normal", "benign", "malignant"]
const cm = modelCard.confusionMatrix

// Persen dengan 2 desimal, sama dengan cara paper menulis angka.
const pct = (value: number) => Math.round(value * 10000) / 100

function perClassMetrics(c: PaperClass) {
  const tp = cm[c][c]
  const actual = classes.reduce((sum, p) => sum + cm[c][p], 0)
  const predicted = classes.reduce((sum, a) => sum + cm[a][c], 0)
  const precision = tp / predicted
  const recall = tp / actual
  return { precision, recall, f1: (2 * precision * recall) / (precision + recall) }
}

describe("model-card", () => {
  it("jumlah data uji per kelas sama dengan confusion matrix", () => {
    for (const c of classes) {
      const actual = classes.reduce((sum, p) => sum + cm[c][p], 0)
      assert.equal(actual, modelCard.dataset.test[c], `jumlah ${c}`)
    }
    const total = classes.reduce((sum, c) => sum + modelCard.dataset.test[c], 0)
    assert.equal(total, modelCard.dataset.test.total)
  })

  it("akurasi dan metrik macro sama dengan hasil model terbaik", () => {
    const correct = classes.reduce((sum, c) => sum + cm[c][c], 0)
    const metrics = classes.map(perClassMetrics)
    const macro = (key: "precision" | "recall" | "f1") =>
      metrics.reduce((sum, m) => sum + m[key], 0) / classes.length

    assert.equal(pct(correct / modelCard.dataset.test.total), modelCard.best.accuracy, "akurasi")
    assert.equal(pct(macro("precision")), modelCard.best.precision, "precision macro")
    assert.equal(pct(macro("recall")), modelCard.best.recall, "recall macro")
    assert.equal(pct(macro("f1")), modelCard.best.f1, "F1 macro")
  })

  it("metrik per kelas sama dengan hasil hitung dari confusion matrix", () => {
    for (const c of classes) {
      const m = perClassMetrics(c)
      assert.equal(pct(m.precision), modelCard.perClass[c].precision, `precision ${c}`)
      assert.equal(pct(m.recall), modelCard.perClass[c].recall, `recall ${c}`)
      assert.equal(pct(m.f1), modelCard.perClass[c].f1, `F1 ${c}`)
    }
  })

  it("total waktu inferensi dan porsi radiomics sesuai Tabel VIII", () => {
    const { timingMs, totalMs, radiomicsSharePercent } = modelCard.complexity
    const sum = timingMs.reduce((s, t) => s + t.ms, 0)
    // Total paper (537,37 ms) mencakup overhead di luar 4 komponen; komponen tidak boleh melebihi total.
    assert.ok(sum <= totalMs, `jumlah komponen ${sum} melebihi total ${totalMs}`)
    const radiomics = timingMs.find((t) => t.component.includes("radiomics"))!
    assert.equal(Math.round((radiomics.ms / totalMs) * 100), radiomicsSharePercent)
  })

  it("jumlah dataset gabungan sama dengan jumlah per sumber", () => {
    for (const key of ["benign", "malignant", "normal", "total"] as const) {
      const sum = modelCard.dataset.sources.reduce((s, src) => s + src[key], 0)
      assert.equal(sum, modelCard.dataset.combined[key], key)
    }
  })

  it("selisih F1 fusi dan seleksi MI-150 sesuai teks paper", () => {
    const dense = modelCard.baseline.find((b) => b.model === "DenseNet-201")!
    const fused = modelCard.fusion.find((f) => f.model === "DenseNet-201")!
    assert.equal(Math.round((fused.f1 - dense.f1) * 100) / 100, fused.deltaF1)
    const { from, to, deltaF1 } = modelCard.selectionGain
    assert.equal(Math.round((to - from) * 100) / 100, deltaF1)
    assert.equal(to, modelCard.best.f1)
  })
})
