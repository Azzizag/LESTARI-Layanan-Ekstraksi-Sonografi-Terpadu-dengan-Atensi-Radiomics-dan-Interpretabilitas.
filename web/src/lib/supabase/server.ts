import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import type { Database } from "@/lib/database.types"
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env"

// Client per request untuk Server Component, Server Action, dan Route Handler. RLS berlaku sesuai user.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Dipanggil dari Server Component: aman diabaikan karena proxy.ts me-refresh session.
        }
      },
    },
  })
}
