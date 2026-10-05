import type { Metadata } from "next"

import { AppShell } from "@/components/app-shell"
import { PublicHeader } from "@/components/public-header"
import { ResearchContent } from "@/components/research/research-content"
import { siteConfig } from "@/config/site"
import { getCurrentProfile } from "@/lib/auth"
import { getHitlStats } from "@/lib/hitl"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Riset & Model",
  description: "Metode, hasil pengujian, dan keterbatasan model klasifikasi USG payudara LESTARI.",
}

// Halaman publik. Staf yang login melihatnya di dalam shell aplikasi beserta statistik HITL
// dari database; pengunjung hanya melihat angka paper.
export default async function RisetPage() {
  const profile = await getCurrentProfile()
  const hitl = profile ? await getHitlStats(await createClient()) : null
  const content = <ResearchContent hitl={hitl} signedIn={profile !== null} />

  if (profile) return <AppShell profile={profile}>{content}</AppShell>

  return (
    <div className="min-h-svh">
      <PublicHeader role={null} />
      <main className="mx-auto w-full max-w-[1440px] p-6">
        {content}
        <p className="mt-6 text-center text-xs text-muted-foreground">{siteConfig.disclaimer}</p>
      </main>
    </div>
  )
}
