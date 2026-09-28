import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"

import { roleHome, type UserRole } from "@/config/site"
import { createClient } from "@/lib/supabase/server"

export type CurrentProfile = {
  id: string
  fullName: string
  email: string | null
  role: UserRole
}

// Profil user yang sedang login, dari tabel profiles (bukan dari metadata atau localStorage).
// null jika belum login, profil tidak ada, atau akun nonaktif.
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", claims.sub)
    .maybeSingle()
  if (!profile?.is_active) return null

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: typeof claims.email === "string" ? claims.email : null,
    role: profile.role,
  }
})

// Dipakai di layout server dan setiap Server Action yang butuh peran tertentu.
export async function requireRole(role: UserRole): Promise<CurrentProfile> {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.role !== role) redirect(roleHome[profile.role])
  return profile
}
