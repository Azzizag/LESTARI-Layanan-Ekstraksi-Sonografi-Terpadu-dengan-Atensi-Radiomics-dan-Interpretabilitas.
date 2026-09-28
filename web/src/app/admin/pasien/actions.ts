"use server"

import { revalidatePath } from "next/cache"

import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { patientFormSchema, type PatientFormInput } from "@/lib/validators"

export type CreatedPatient = { id: string; code: string; fullName: string }

export type CreatePatientResult =
  | { ok: true; patient: CreatedPatient }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof PatientFormInput, string>> }

// Langkah 1 dialog tambah pasien. Insert memakai session admin, jadi RLS tetap berlaku.
export async function createPatient(input: PatientFormInput): Promise<CreatePatientResult> {
  const profile = await requireRole("admin")

  const parsed = patientFormSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof PatientFormInput, string>> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof PatientFormInput
      fieldErrors[key] ??= issue.message
    }
    return { ok: false, error: "Periksa kembali data pasien.", fieldErrors }
  }
  const { fullName, birthDate, phone } = parsed.data

  const supabase = await createClient()
  const { data: patient, error } = await supabase
    .from("patients")
    .insert({ full_name: fullName, birth_date: birthDate, phone, created_by: profile.id })
    .select("id, code, full_name")
    .single()
  if (error || !patient) return { ok: false, error: "Pasien gagal disimpan. Coba lagi." }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    action: "patient.create",
    target_type: "patient",
    target_id: patient.id,
    meta: { code: patient.code },
  })

  revalidatePath("/admin")
  return { ok: true, patient: { id: patient.id, code: patient.code, fullName: patient.full_name } }
}
