import { LayoutDashboardIcon } from "lucide-react"
import Link from "next/link"

import { LogoMark } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { roleHome, siteConfig, type UserRole } from "@/config/site"

const NAV = [
  { href: "/#tujuan", label: "Tujuan" },
  { href: "/#cara-kerja", label: "Cara kerja" },
  { href: "/#tim", label: "Tim" },
  { href: "/riset", label: "Riset" },
] as const

// Header halaman publik (home dan riset). Staf yang sudah login diarahkan ke dasbornya.
export function PublicHeader({ role }: { role: UserRole | null }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogoMark size={28} />
          {siteConfig.name}
        </Link>
        <nav aria-label="Navigasi utama" className="hidden items-center gap-6 text-sm font-medium md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {role ? (
          <Button asChild size="sm">
            <Link href={roleHome[role]}>
              <LayoutDashboardIcon data-icon="inline-start" />
              Buka dasbor
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link href="/login">Masuk</Link>
          </Button>
        )}
      </div>
    </header>
  )
}
