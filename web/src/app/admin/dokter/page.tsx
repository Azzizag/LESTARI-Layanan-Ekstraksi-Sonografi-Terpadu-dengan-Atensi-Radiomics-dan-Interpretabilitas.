import type { Metadata } from "next"

import { DoctorsView, type DoctorRow } from "@/app/admin/dokter/doctors-view"
import { requireRole } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Dokter" }

export default async function Page() {
  await requireRole("admin")
  const supabase = await createClient()

  // Email tidak disimpan di profiles; dibaca dari Supabase Auth dengan service role (server saja,
  // setelah peran admin diperiksa). Skala demo cukup satu halaman listUsers.
  const [profiles, reviews, users] = await Promise.all([
    supabase.from("profiles").select("id, full_name, is_active").eq("role", "doctor").order("full_name"),
    supabase.from("reviews").select("doctor_id"),
    createAdminClient().auth.admin.listUsers({ perPage: 1000 }),
  ])
  if (profiles.error || reviews.error) throw new Error("Data dokter gagal dimuat.")

  const emailById = new Map((users.data?.users ?? []).map((u) => [u.id, u.email ?? null]))
  const reviewCount = new Map<string, number>()
  for (const r of reviews.data) reviewCount.set(r.doctor_id, (reviewCount.get(r.doctor_id) ?? 0) + 1)

  const rows: DoctorRow[] = profiles.data
    .map((p) => ({
      id: p.id,
      fullName: p.full_name,
      email: emailById.get(p.id) ?? null,
      isActive: p.is_active,
      reviewCount: reviewCount.get(p.id) ?? 0,
    }))
    // Akun aktif di atas.
    .sort((a, b) => Number(b.isActive) - Number(a.isActive))

  return <DoctorsView doctors={rows} />
}
