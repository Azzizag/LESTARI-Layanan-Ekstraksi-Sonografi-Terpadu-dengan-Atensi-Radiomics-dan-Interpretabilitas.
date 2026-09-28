# LESTARI

**Layanan Ekstraksi Sonografi Terpadu dengan Atensi Radiomics dan Interpretabilitas.** Aplikasi web Computer-Aided Diagnosis untuk deteksi dini kanker payudara dari citra USG, dengan tiga kelas: Normal, Benign, Malignant. AI memberi prediksi awal, probabilitas tiap kelas, dan heatmap Grad-CAM; dokter memvalidasi dan menetapkan diagnosis akhir.

Dibuat untuk final GEMASTIK KTI.

> Hasil AI adalah alat bantu skrining. Diagnosis akhir ditetapkan oleh dokter. Aplikasi ini adalah prototipe penelitian, bukan perangkat medis.

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS v4, shadcn/ui
- Supabase (Auth, Postgres dengan RLS, Storage private)
- Layanan klasifikasi terpisah yang dipanggil dari server lewat HTTP (tidak termasuk di repo ini)

## Menjalankan web

```bash
cd web
pnpm install
cp .env.example .env.local   # isi URL dan key Supabase serta alamat layanan AI
pnpm dev                     # http://localhost:3000
```

Perintah lain: `pnpm lint`, `pnpm build`.
