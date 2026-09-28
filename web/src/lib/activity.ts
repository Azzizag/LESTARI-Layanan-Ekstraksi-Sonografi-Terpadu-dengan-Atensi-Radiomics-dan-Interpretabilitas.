import "server-only"

import { classLabel, formatMs, SCAN_CLASSES, type ScanClass } from "@/lib/analysis"
import type { Json } from "@/lib/database.types"
import type { createClient } from "@/lib/supabase/server"

type Supabase = Awaited<ReturnType<typeof createClient>>

// Kelompok ikon di UI. Aksi baru yang belum dikenal jatuh ke "other".
export type ActivityKind = "patient" | "analysis" | "analysis_failed" | "review" | "doctor" | "other"

export type ActivityItem = {
  id: number
  kind: ActivityKind
  text: string
  actorName: string
  createdAt: string
}

type Meta = Record<string, Json | undefined>

function asMeta(meta: Json | null): Meta {
  return meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {}
}

function asClass(value: Json | undefined): ScanClass | null {
  return typeof value === "string" && (SCAN_CLASSES as readonly string[]).includes(value)
    ? (value as ScanClass)
    : null
}

// Kalimat aksi dalam Bahasa Indonesia. Kelas dan latensi diambil dari meta log (output model), bukan teks statis.
function describe(action: string, meta: Meta, target: string): { kind: ActivityKind; text: string } {
  switch (action) {
    case "patient.create":
      return { kind: "patient", text: `Menambahkan pasien ${target}` }
    case "case.analyze": {
      const cls = asClass(meta.predicted_class)
      const ms = typeof meta.latency_total_ms === "number" ? formatMs(meta.latency_total_ms) : null
      const detail = [cls ? classLabel[cls] : null, ms].filter(Boolean).join(", ")
      const cached = meta.cached === true ? " dari hasil tersimpan (mode demo)" : ""
      return {
        kind: "analysis",
        text: `Analisis AI selesai untuk ${target}${detail ? ` (${detail})` : ""}${cached}`,
      }
    }
    case "case.analyze_failed":
      return { kind: "analysis_failed", text: `Analisis AI gagal untuk ${target}` }
    case "review.submit": {
      const cls = asClass(meta.final_class)
      const agree =
        meta.agrees_with_ai === true ? ", sesuai AI" : meta.agrees_with_ai === false ? ", berbeda dengan AI" : ""
      return {
        kind: "review",
        text: `Menyimpan diagnosis ${target}${cls ? ` (${classLabel[cls]}${agree})` : ""}`,
      }
    }
    case "doctor.create":
      return { kind: "doctor", text: `Menambahkan akun dokter ${target}` }
    case "doctor.update":
      return { kind: "doctor", text: `Mengubah data dokter ${target}` }
    case "doctor.deactivate":
      return { kind: "doctor", text: `Menonaktifkan akun dokter ${target}` }
    case "doctor.activate":
      return { kind: "doctor", text: `Mengaktifkan kembali akun dokter ${target}` }
    default:
      return { kind: "other", text: `Aktivitas ${action}` }
  }
}

// Aktivitas terbaru dengan nama pelaku dan nama target (kode pasien atau nama dokter).
// RLS: hanya admin yang dapat membaca activity_logs.
export async function getRecentActivity(supabase: Supabase, limit = 10): Promise<ActivityItem[]> {
  const { data: logs, error } = await supabase
    .from("activity_logs")
    .select("id, action, target_type, target_id, meta, created_at, actor:profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error("Aktivitas gagal dimuat.")

  const idsOf = (type: string) => [
    ...new Set(logs.filter((l) => l.target_type === type && l.target_id).map((l) => l.target_id!)),
  ]
  const caseIds = idsOf("case")
  const patientIds = idsOf("patient")
  const profileIds = idsOf("profile")

  const [cases, patients, profiles] = await Promise.all([
    caseIds.length
      ? supabase.from("cases").select("id, patient:patients(code)").in("id", caseIds)
      : null,
    patientIds.length ? supabase.from("patients").select("id, code").in("id", patientIds) : null,
    profileIds.length ? supabase.from("profiles").select("id, full_name").in("id", profileIds) : null,
  ])

  const targetName = new Map<string, string>()
  cases?.data?.forEach((c) => c.patient && targetName.set(c.id, c.patient.code))
  patients?.data?.forEach((p) => targetName.set(p.id, p.code))
  profiles?.data?.forEach((p) => targetName.set(p.id, p.full_name))

  return logs.map((log) => {
    const meta = asMeta(log.meta)
    const fallback =
      typeof meta.code === "string" ? meta.code : typeof meta.full_name === "string" ? meta.full_name : "(terhapus)"
    const target = (log.target_id && targetName.get(log.target_id)) || fallback
    return {
      id: log.id,
      ...describe(log.action, meta, target),
      actorName: log.actor?.full_name ?? "Sistem",
      createdAt: log.created_at,
    }
  })
}
