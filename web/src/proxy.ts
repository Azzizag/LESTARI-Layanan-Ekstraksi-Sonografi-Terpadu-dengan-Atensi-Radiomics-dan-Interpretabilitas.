import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { roleHome } from "@/config/site"
import type { Database } from "@/lib/database.types"
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env"

const AREA_ROLE = [
  { prefix: "/admin", role: "admin" },
  { prefix: "/dokter", role: "doctor" },
] as const

function areaOf(pathname: string) {
  return AREA_ROLE.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
      },
    },
  })

  // Jangan sisipkan kode di antara createServerClient dan getClaims (refresh session).
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub

  const { pathname } = request.nextUrl
  const area = areaOf(pathname)
  const isLogin = pathname === "/login"
  if (!area && !isLogin) return response

  // Redirect tetap membawa cookie session yang baru di-refresh.
  const redirectTo = (target: string) => {
    const url = request.nextUrl.clone()
    const [path, query] = target.split("?")
    url.pathname = path
    url.search = query ? `?${query}` : ""
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  if (!userId) {
    if (isLogin) return response
    return redirectTo(`/login?next=${encodeURIComponent(pathname)}`)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle()

  if (!profile?.is_active) {
    await supabase.auth.signOut()
    if (isLogin) return response
    return redirectTo("/login?error=nonaktif")
  }

  if (isLogin) return redirectTo(roleHome[profile.role])
  if (area && area.role !== profile.role) return redirectTo(roleHome[profile.role])

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
