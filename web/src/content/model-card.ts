// Kartu model LESTARI. Satu-satunya sumber angka penelitian di aplikasi, disalin persis dari
// docs/METODOLOGI.md (paper "Klasifikasi Kanker Payudara pada Ultrasonografi Berbasis Fusi
// Fitur Hibrida dengan Atensi Grad-CAM"). Jangan membulatkan ulang atau menambah angka lain.
// Nilai null berarti masih [ISI] di METODOLOGI.md dan ditampilkan sebagai placeholder.
//
// File ini hanya memakai sintaks TypeScript yang bisa dihapus tipenya, agar bisa diuji langsung
// dengan `node --test` (lihat model-card.test.ts).

export type PaperClass = "normal" | "benign" | "malignant"

// Persen ditulis sebagai angka persen dengan 2 desimal, sama dengan paper (92.36 = 92,36%).
export type Metrics = { accuracy: number; precision: number; recall: number; f1: number }

export const modelCard = {
  paperTitle:
    "Klasifikasi Kanker Payudara pada Ultrasonografi Berbasis Fusi Fitur Hibrida dengan Atensi Grad-CAM",
  team: "Salsabila Rahayu Putri, Gena Darma, Azziz Abdul Ghofur, I Wayan Palton Anuwiksa",
  affiliation: "Universitas Telkom, CoE HUMIC",
  modelName: "DenseNet-201 + Radiomics + MI-150",
  fullModelName: "DenseNet-201 + Radiomics (ROI Grad-CAM) + seleksi MI 150 fitur + LightGBM",
  classifier: "LightGBM",
  version: "v1.0",

  dataset: {
    sources: [
      { name: "Mendeley", benign: 100, malignant: 150, normal: 0, total: 250 },
      { name: "BUSI", benign: 436, malignant: 209, normal: 133, total: 778 },
    ],
    combined: { benign: 536, malignant: 359, normal: 133, total: 1028 },
    initialTotal: 1030,
    removedNote: "2 citra identik berlabel ganda (benign dan malignant) di BUSI dibuang.",
    split: "70:15:15",
    splitNote: "Pembagian per kelas dengan splitfolders dan seed tetap.",
    test: { benign: 81, malignant: 55, normal: 21, total: 157 },
    augmentation: "Rotasi acak plus minus 15 derajat dan flip horizontal, hanya pada data latih.",
    license: null as string | null,
    demoImages: null as string | null,
  },

  preprocessing: [
    "Konversi ke PNG",
    "Median filter 5 x 5 (reduksi speckle noise)",
    "CLAHE, clip limit 2,0, tile grid 8 x 8",
    "Resize 224 x 224",
    "Konversi ke RGB (3 kanal)",
    "Normalisasi mean dan standar deviasi ImageNet",
  ],

  // Diagram pipeline inferensi (METODOLOGI.md bagian 4).
  pipeline: [
    { title: "Citra USG", detail: "BUSI + Mendeley" },
    { title: "Preprocessing", detail: "median 5x5, CLAHE 2.0/8x8, resize 224, RGB, norm ImageNet" },
    { title: "DenseNet-201", detail: "deep features dari Global Average Pooling" },
    { title: "Grad-CAM + Otsu", detail: "heatmap lapisan konvolusi terakhir menjadi mask ROI biner" },
    { title: "Radiomics", detail: "PyRadiomics pada citra asli dengan mask ROI + DCT/FFT" },
    { title: "Fusi + MI-150", detail: "concat, imputasi median, robust scaling, seleksi 150 fitur" },
    { title: "LightGBM", detail: "probabilitas Normal / Benign / Malignant" },
    { title: "SHAP + dokter", detail: "penjelasan dan keputusan akhir" },
  ],

  radiomicsConfig: "force2D, bin width 25, tanpa resampling; first-order, shape2D, GLCM, GLRLM, GLSZM, GLDM, NGTDM, + versi wavelet",

  // Tabel III
  training: {
    input: "224 x 224",
    weights: "ImageNet",
    optimizer: "Adam",
    learningRate: "0,0001",
    epochs: 20,
    batchSize: 32,
    loss: "cross-entropy dengan class weights",
  },

  // Tabel IV
  lightgbm: {
    nEstimators: 2000,
    learningRate: "0,01",
    numLeaves: 31,
    minDataInLeaf: 20,
    subsample: "0,7",
    colsample: "0,5",
    classWeight: "balanced",
  },

  environment: "JupyterLab, NVIDIA GeForce RTX 3050 6 GB, Intel i5-12450H, RAM 16 GB",

  // Komposisi fitur model yang dipakai aplikasi (dibaca dari bundel model v1.0, dicek 28-09-2026).
  implementation: {
    featuresIntoSelection: 2219,
    selected: { total: 150, deep: 150, radiomics: 0 },
  },

  // 5.1 Model terbaik pada data uji 157 citra (macro).
  best: { accuracy: 92.36, precision: 93.35, recall: 93.51, f1: 93.32 } satisfies Metrics,

  // Gambar 8. confusionMatrix[labelAsli][prediksi].
  confusionMatrix: {
    benign: { benign: 77, malignant: 3, normal: 1 },
    malignant: { benign: 8, malignant: 47, normal: 0 },
    normal: { benign: 0, malignant: 0, normal: 21 },
  } satisfies Record<PaperClass, Record<PaperClass, number>>,

  perClass: {
    benign: { precision: 90.59, recall: 95.06, f1: 92.77 },
    malignant: { precision: 94.0, recall: 85.45, f1: 89.52 },
    normal: { precision: 95.45, recall: 100.0, f1: 97.67 },
  } satisfies Record<PaperClass, Omit<Metrics, "accuracy">>,

  // Tabel V: baseline deep features saja.
  baseline: [
    { model: "ResNet-50", accuracy: 89.81, precision: 89.15, recall: 90.29, f1: 89.38 },
    { model: "DenseNet-201", accuracy: 89.17, precision: 88.59, recall: 90.27, f1: 89.36 },
    { model: "DenseNet-121", accuracy: 90.45, precision: 88.91, recall: 89.34, f1: 88.65 },
    { model: "MobileViT", accuracy: 88.54, precision: 87.37, recall: 88.3, f1: 87.5 },
  ],

  // Tabel VI: fusi radiomics tanpa seleksi. deltaF1 dalam poin persen terhadap baseline.
  fusion: [
    { model: "DenseNet-201", accuracy: 90.45, precision: 90.78, recall: 91.1, f1: 90.87, deltaF1: 1.51 },
    { model: "DenseNet-121", accuracy: 92.36, precision: 90.49, recall: 91.15, f1: 90.64, deltaF1: 1.99 },
    { model: "ResNet-50", accuracy: 91.08, precision: 90.32, recall: 90.53, f1: 90.35, deltaF1: 0.97 },
    { model: "MobileViT", accuracy: 87.9, precision: 86.96, recall: 86.9, f1: 86.83, deltaF1: -0.67 },
  ],
  selectionGain: { from: 90.87, to: 93.32, deltaF1: 2.45 },

  // Tabel VII: pembanding state of the art, direproduksi pada data yang sama.
  sota: [
    { model: "MobileNetV3", accuracy: 85.99, precision: 83.84, recall: 87.63, f1: 85.2 },
    { model: "VGG16", accuracy: 52.86, precision: 56.98, recall: 59.02, f1: 49.39 },
    { model: "MobileNetV2 + CBAM", accuracy: 87.89, precision: 86.73, recall: 87.3, f1: 86.3 },
  ],

  // Tabel IX dan X: ablasi per dataset (F1).
  ablation: [
    { config: "DenseNet-201", busiF1: 84.49, mendeleyF1: 96.93 },
    { config: "+ Radiomics", busiF1: 86.54, mendeleyF1: 96.93 },
    { config: "+ Radiomics + MI_150", busiF1: 86.79, mendeleyF1: 96.93 },
  ],

  // Tabel VIII: kompleksitas dan waktu inferensi, diukur di RTX 3050.
  complexity: {
    parameters: 18092928,
    flops: 4388557952,
    sizeMb: 72.96,
    device: "RTX 3050",
    timingMs: [
      { component: "Ekstraksi deep feature", ms: 41.76 },
      { component: "Pembuatan mask Grad-CAM", ms: 106.98 },
      { component: "Ekstraksi fitur radiomics", ms: 387.62 },
      { component: "Prediksi LightGBM", ms: 1.0 },
    ],
    totalMs: 537.37,
    radiomicsSharePercent: 72,
  },

  // 5.7 SHAP (Gambar 9).
  shap: {
    topFeatures: {
      normal: ["deep_1505", "deep_1612"],
      benign: ["deep_1684", "deep_1798"],
      malignant: ["deep_1749", "deep_1698"],
    } satisfies Record<PaperClass, string[]>,
    note: "20 fitur teratas didominasi deep features; fitur radiomics tidak muncul di 20 teratas.",
  },

  // 6. Keterbatasan.
  limitations: [
    "Belum divalidasi eksternal atau multi-institusi.",
    "Ekstraksi radiomics adalah komponen paling lambat (72% waktu inferensi) dan berjalan di CPU.",
    "Manfaat radiomics bergantung data: naik di BUSI, tidak berubah di Mendeley (efek ceiling).",
    "Grad-CAM di beberapa kasus bisa menyorot area yang kurang relevan secara diagnostik, sehingga kualitas ROI ikut terpengaruh.",
    "Semua citra Normal berasal dari BUSI karena Mendeley tidak memiliki kelas Normal, sehingga model bisa ikut belajar ciri sumber dataset. Recall Normal 100% perlu dibaca dengan catatan ini.",
    "BUSI berisi beberapa citra dari pasien yang sama. Pembagian acak per citra berisiko menempatkan pasien yang sama di data latih dan uji.",
  ],
} as const
