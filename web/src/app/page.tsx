import Link from "next/link"

import { LogoMark } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/config/site"

// Sementara. Landing page lengkap dibangun di Fase 7 (DESIGN.md 5.1).
export default function Home() {
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <div className="max-w-md text-center">
        <LogoMark size={44} className="mx-auto" />
        <h1 className="mt-4 text-2xl font-semibold">{siteConfig.name}</h1>
        <p className="mt-2 text-muted-foreground">{siteConfig.description}</p>
        <Button asChild size="lg" className="mt-6 h-10 px-5">
          <Link href="/login">Masuk</Link>
        </Button>
        <p className="mt-8 text-xs text-muted-foreground">{siteConfig.disclaimer}</p>
      </div>
    </main>
  )
}
