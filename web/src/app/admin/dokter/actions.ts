"use server"

import { revalidatePath } from "next/cache"

import { requireRole } from "@/lib/auth"
import type { Json } from "@/lib/database.types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  doctorActiveSchema,
  doctorCreateSchema,
  doctorUpdateSchema,
  type DoctorCreateInput,
  type DoctorUpdateInput,
} from "@/lib/validators"

export type DoctorActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof DoctorCreateInput, string>> }

// Pemblokiran login di Supabase Auth selama kira-kira 100 tahun untuk akun nonaktif.
const BAN_FOREVER = "876000h"

function firstErrors<T extends string>(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Partial<Record<T, string>> = {}
  for (const issue of issues) {
    const key = issue.path[0] as T
    fieldErrors[key] ??= issue.message
  }
  return fieldErrors
}

async function log(actorId: string, action: string, doctorId: string, meta: Json) {
  const supabase = await createClient()
  await supabase.from("activity_logs").insert({
    actor_id: actorId,
    action,
    target_type: "profile",
    target_id: doctorId,
    meta,
  })
}

function refresh() {
  revalidatePath("/admin/dokter")
  revalidatePath("/admin")
}

// Akun Auth dibuat dengan service role (hanya di server). Profil role doctor dibuat trigger handle_new_user.
export async function createDoctor(input: DoctorCreateInput): Promise<DoctorActionResult> {
  const admin = await requireRole("admin")
  const parsed = doctorCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Periksa kembali data dokter.", fieldErrors: firstErrors(parsed.error.issues) }
  }
  const { fullName, email, password } = parsed.data

  const { data, error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "doctor" },
  })
  if (error || !data.user) {
    if (error?.code === "email_exists") {
      return { ok: false, error: "Email sudah terdaftar.", fieldErrors: { email: "Email sudah terdaftar." } }
    }
    if (error?.code === "weak_password") {
      return {
        ok: false,
        error: "Kata sandi terlalu lemah.",
        fieldErrors: { password: "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka." },
      }
    }
    return { ok: false, error: "Akun dokter gagal dibuat. Coba lagi." }
  }

  await log(admin.id, "doctor.create", data.user.id, { full_name: fullName })
  refresh()
  return { ok: true }
}

export async function updateDoctor(input: DoctorUpdateInput): Promise<DoctorActionResult> {
  const admin = await requireRole("admin")
  const parsed = doctorUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Periksa kembali data dokter.", fieldErrors: firstErrors(parsed.error.issues) }
  }
  const { id, fullName } = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", id)
    .eq("role", "doctor")
    .select("id")
    .maybeSingle()
  if (error || !data) return { ok: false, error: "Data dokter gagal disimpan." }

  await log(admin.id, "doctor.update", id, { full_name: fullName })
  refresh()
  return { ok: true }
}

// Menonaktifkan lebih diutamakan daripada menghapus agar riwayat diagnosis tetap utuh.
// profiles.is_active menutup akses lewat RLS dan proxy; blokir Auth mencegah login baru.
export async function setDoctorActive(input: { id: string; active: boolean }): Promise<DoctorActionResult> {
  const admin = await requireRole("admin")
  const parsed = doctorActiveSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Permintaan tidak valid." }
  const { id, active } = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: active })
    .eq("id", id)
    .eq("role", "doctor")
    .select("full_name")
    .maybeSingle()
  if (error || !data) return { ok: false, error: "Status akun gagal diubah." }

  const { error: banError } = await createAdminClient().auth.admin.updateUserById(id, {
    ban_duration: active ? "none" : BAN_FOREVER,
  })

  await log(admin.id, active ? "doctor.activate" : "doctor.deactivate", id, {
    full_name: data.full_name,
    auth_ban_synced: !banError,
  })
  refresh()
  return { ok: true }
}
