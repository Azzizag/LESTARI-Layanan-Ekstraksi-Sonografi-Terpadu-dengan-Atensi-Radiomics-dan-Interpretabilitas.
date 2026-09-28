import type { Metadata } from "next"
import Link from "next/link"

import { AppShell } from "@/components/app-shell"
import { LogoMark } from "@/components/logo"
import { ResearchContent } from "@/components/research/research-content"
import { Button } from "@/components/ui/button"
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
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 rounded-lg font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <LogoMark size={28} />
            {siteConfig.name}
          </Link>
          <Button asChild size="sm">
            <Link href="/login">Masuk</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] p-6">
        {content}
        <p className="mt-6 text-center text-xs text-muted-foreground">{siteConfig.disclaimer}</p>
      </main>
    </div>
  )
}
