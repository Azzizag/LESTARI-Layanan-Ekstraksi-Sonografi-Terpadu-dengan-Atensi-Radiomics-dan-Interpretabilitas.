import type { Enums } from "@/lib/database.types"

export type UserRole = Enums<"user_role">

export const siteConfig = {
  name: "LESTARI",
  fullName:
    "Layanan Ekstraksi Sonografi Terpadu dengan Atensi Radiomics dan Interpretabilitas",
  description:
    "Asisten deteksi dini kanker payudara dari citra USG, dijelaskan AI dan divalidasi dokter.",
  disclaimer:
    "Hasil AI adalah alat bantu skrining. Diagnosis akhir ditetapkan oleh dokter.",
  // Kasus dengan prediksi Malignant atau P(Malignant) >= ambang ini masuk tab Prioritas.
  priorityMalignantThreshold: 0.3,
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
} as const

// Halaman awal setiap peran setelah login.
export const roleHome: Record<UserRole, string> = {
  admin: "/admin",
  doctor: "/dokter",
}

export const roleLabel: Record<UserRole, string> = {
  admin: "Panel Admin",
  doctor: "Ruang Dokter",
}
