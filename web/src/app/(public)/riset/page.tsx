import type { Metadata } from "next"
import Link from "next/link"

import { LogoMark } from "@/components/logo"
import { PhasePlaceholder } from "@/components/page-states"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = { title: "Riset & Model" }

// Sementara. Halaman Riset lengkap dibangun di Fase 5 (DESIGN.md 5.7).
export default function RisetPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <Link href="/" className="mb-8 inline-flex items-center gap-2.5 font-bold">
        <LogoMark size={30} />
        {siteConfig.name}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Riset & Model</h1>
      <PhasePlaceholder
        phase={5}
        items={["Kartu model dan metrik dari paper", "Diagram pipeline metode", "Statistik kesepakatan AI dan dokter"]}
      />
    </main>
  )
}
