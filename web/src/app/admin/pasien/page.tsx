import type { Metadata } from "next"

import { PatientsView, type PatientRow } from "@/app/admin/pasien/patients-view"
import { requireRole } from "@/lib/auth"
import { ageFromBirthDate, formatRelative } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Pasien" }

export default async function Page({ searchParams }: PageProps<"/admin/pasien">) {
  await requireRole("admin")
  const supabase = await createClient()

  const [patients, cases] = await Promise.all([
    supabase
      .from("patients")
      .select("id, code, full_name, birth_date")
      .order("created_at", { ascending: false }),
    supabase
      .from("case_overview")
      .select("case_id, patient_id, status, created_at, predicted_class")
      .order("created_at", { ascending: false }),
  ])
  if (patients.error || cases.error) throw new Error("Data pasien gagal dimuat.")

  // Kasus terbaru per pasien (hasil query sudah terurut dari yang terbaru).
  const latestCase = new Map<string, (typeof cases.data)[number]>()
  for (const c of cases.data) {
    if (c.patient_id && !latestCase.has(c.patient_id)) latestCase.set(c.patient_id, c)
  }

  const now = new Date()
  const rows: PatientRow[] = patients.data.map((p) => {
    const last = latestCase.get(p.id)
    return {
      id: p.id,
      code: p.code,
      fullName: p.full_name,
      age: ageFromBirthDate(p.birth_date, now) ?? undefined,
      lastCaseId: last?.case_id ?? undefined,
      lastCaseAt: last?.created_at ?? undefined,
      lastCaseLabel: last?.created_at ? formatRelative(last.created_at, now) : undefined,
      predictedClass: last?.predicted_class ?? undefined,
      status: last?.status ?? null,
    }
  })

  const { tambah } = await searchParams
  return <PatientsView patients={rows} openNew={tambah === "1"} />
}
