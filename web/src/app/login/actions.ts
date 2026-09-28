"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { roleHome, siteConfig, type UserRole } from "@/config/site"
import { createClient } from "@/lib/supabase/server"

export type SignInState = { error?: string; email?: string }

const credentialsSchema = z.object({
  email: z.email("Format email tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
})

const intentSchema = z.enum(["password", "demo-admin", "demo-doctor"])

// Hanya path internal di area peran yang bersangkutan, untuk mencegah open redirect.
function safeNext(next: FormDataEntryValue | null, role: UserRole) {
  const home = roleHome[role]
  if (typeof next !== "string") return home
  if (next === home || next.startsWith(`${home}/`)) return next
  return home
}

// Kredensial demo hanya dibaca di server, tidak pernah dikirim ke browser.
function demoCredentials(role: UserRole) {
  const email = role === "admin" ? process.env.DEMO_ADMIN_EMAIL : process.env.DEMO_DOCTOR_EMAIL
  const password =
    role === "admin" ? process.env.DEMO_ADMIN_PASSWORD : process.env.DEMO_DOCTOR_PASSWORD
  return email && password ? { email, password } : null
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const intent = intentSchema.safeParse(formData.get("intent"))
  if (!intent.success) return { error: "Permintaan tidak valid." }

  let credentials: { email: string; password: string }
  if (intent.data === "password") {
    const parsed = credentialsSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    })
    const typedEmail = String(formData.get("email") ?? "")
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message, email: typedEmail }
    }
    credentials = parsed.data
  } else {
    if (!siteConfig.demoMode) return { error: "Mode demo tidak aktif." }
    const demo = demoCredentials(intent.data === "demo-admin" ? "admin" : "doctor")
    if (!demo) return { error: "Akun demo belum dikonfigurasi di server." }
    credentials = demo
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(credentials)
  if (error || !data.user) {
    return {
      error:
        error?.code === "invalid_credentials"
          ? "Email atau kata sandi salah."
          : error?.code === "user_banned"
            ? "Akun Anda nonaktif. Hubungi admin faskes."
            : "Gagal masuk. Periksa koneksi lalu coba lagi.",
      email: intent.data === "password" ? credentials.email : undefined,
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle()
  if (!profile?.is_active) {
    await supabase.auth.signOut()
    return { error: "Akun Anda nonaktif. Hubungi admin faskes." }
  }

  redirect(safeNext(formData.get("next"), profile.role))
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
