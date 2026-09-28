"use client"

import { usePathname } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { roleLabel, type UserRole } from "@/config/site"

// Urutan penting: prefix yang lebih spesifik lebih dulu.
const pageTitles: { prefix: string; title: string }[] = [
  { prefix: "/admin/pasien", title: "Pasien" },
  { prefix: "/admin/dokter", title: "Dokter" },
  { prefix: "/admin", title: "Dashboard" },
  { prefix: "/dokter/review", title: "Konsol Review" },
  { prefix: "/dokter", title: "Antrean" },
]

function titleFor(pathname: string) {
  return pageTitles.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )?.title
}

export function AppHeader({ role }: { role: UserRole }) {
  const title = titleFor(usePathname())

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
      <SidebarTrigger className="-ml-1 text-muted-foreground" aria-label="Buka atau tutup sidebar" />
      <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-center" />
      <nav aria-label="Lokasi halaman" className="text-[13px] text-muted-foreground">
        {roleLabel[role]}
        {title ? (
          <>
            <span className="mx-1.5" aria-hidden="true">
              /
            </span>
            <span className="font-semibold text-foreground" aria-current="page">
              {title}
            </span>
          </>
        ) : null}
      </nav>
    </header>
  )
}
