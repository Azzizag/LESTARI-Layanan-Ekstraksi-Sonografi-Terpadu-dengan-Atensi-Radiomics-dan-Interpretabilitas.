import "server-only"

import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import { supabaseUrl } from "@/lib/supabase/env"

// Service role melewati RLS. Hanya untuk Server Action/Route Handler yang sudah memeriksa peran pemanggil.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diatur")
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
