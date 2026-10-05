// Isi home page: tujuan pilot project, tahapan, dan tim.
// Ubah teks atau anggota tim di file ini, bukan di komponen. Angka penelitian tetap diambil
// dari model-card.ts agar tidak ada dua sumber angka.

export type TeamMember = {
  name: string
  affiliation: string
  // Opsional: path foto di folder public, mis. "/tim/salsabila.jpg". Tanpa foto, inisial yang tampil.
  photo?: string
}

export type PilotStageStatus = "done" | "active" | "planned"

export const team = {
  name: "Tim Ayam Lestari",
  institution: "Universitas Telkom",
  // Urutan sesuai daftar penulis paper. Afiliasi mengikuti catatan kaki paper.
  members: [
    { name: "Salsabila Rahayu Putri", affiliation: "Fakultas Informatika, Universitas Telkom" },
    { name: "Gena Darma", affiliation: "Fakultas Informatika, Universitas Telkom" },
    { name: "Azziz Abdul Ghofur", affiliation: "Fakultas Informatika, Universitas Telkom" },
    {
      name: "I Wayan Palton Anuwiksa",
      affiliation: "Fakultas Informatika dan CoE Human Centric Engineering, Universitas Telkom",
    },
  ] satisfies TeamMember[],
}

export const pilot = {
  badge: "Pilot project",
  title: "Pilot project deteksi dini kanker payudara dari citra USG",
  lead:
    "LESTARI menerapkan hasil riset tim ke alur kerja skrining. AI memberi prediksi beserta penjelasannya, lalu dokter menetapkan diagnosis akhir.",
  about: [
    "Pilot project ini adalah uji coba awal untuk melihat apakah model dari riset kami bisa dipakai dalam alur kerja yang mirip dengan fasilitas kesehatan: petugas mengunggah citra USG, sistem menganalisis, dan dokter memvalidasi hasilnya.",
    "Hasil dari tahap ini menjadi dasar sebelum uji coba bersama dokter dan validasi dengan data dari fasilitas kesehatan di Indonesia.",
  ],
  limits: [
    "Belum menjadi alat diagnosis tersertifikasi dan belum melalui uji klinis.",
    "Model diuji pada dataset publik (BUSI dan Mendeley), belum pada data eksternal dari Indonesia.",
    "Seluruh data pasien pada demo ini fiktif.",
  ],
  stages: [
    {
      title: "Riset dan pengembangan model",
      detail: "Fusi deep features DenseNet-201 dan radiomics berbasis ROI Grad-CAM.",
      status: "done",
    },
    {
      title: "Aplikasi pilot",
      detail: "Alur admin dan dokter, jejak metode per kasus, laporan PDF.",
      status: "active",
    },
    {
      title: "Uji coba bersama dokter",
      detail: "Mengumpulkan masukan pengguna dan data kesepakatan dokter dengan AI.",
      status: "planned",
    },
    {
      title: "Validasi dengan data eksternal",
      detail: "Menguji model pada citra dari fasilitas kesehatan lain.",
      status: "planned",
    },
  ] satisfies { title: string; detail: string; status: PilotStageStatus }[],
}

export const goals = [
  {
    key: "riset",
    title: "Membawa riset ke praktik",
    text: "Menjalankan metode paper dalam aplikasi yang bisa dipakai langsung, bukan hanya di notebook penelitian.",
  },
  {
    key: "skrining",
    title: "Mempercepat skrining awal",
    text: "Kasus dengan risiko Malignant tinggi otomatis naik ke antrean prioritas dokter.",
  },
  {
    key: "penjelasan",
    title: "Hasil yang bisa dijelaskan",
    text: "Setiap prediksi disertai probabilitas, heatmap Grad-CAM, mask ROI, dan fitur yang paling berpengaruh.",
  },
  {
    key: "dokter",
    title: "Dokter tetap memutuskan",
    text: "Diagnosis akhir di tangan dokter. Kesepakatan dokter dengan AI dicatat sebagai bahan evaluasi tahap berikutnya.",
  },
] as const

export const steps = [
  { title: "Unggah citra", text: "Petugas mendaftarkan pasien dan mengunggah citra USG." },
  { title: "Preprocessing", text: "Median filter dan CLAHE meredam speckle noise, sama seperti saat pelatihan model." },
  {
    title: "Analisis hibrida",
    text: "Grad-CAM menentukan ROI, radiomics dan deep features difusikan, lalu LightGBM mengklasifikasi.",
  },
  { title: "Validasi dokter", text: "Dokter meninjau penjelasan AI, menandai area, dan menetapkan diagnosis." },
] as const
