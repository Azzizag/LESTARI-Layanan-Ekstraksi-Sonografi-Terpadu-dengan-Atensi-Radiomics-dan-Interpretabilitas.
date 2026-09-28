import { AppShell } from "@/components/app-shell"
import { requireRole } from "@/lib/auth"

// Guard kedua setelah proxy.ts: peran dicek lagi di server dari tabel profiles.
export default async function Layout({ children }: LayoutProps<"/admin">) {
  const profile = await requireRole("admin")
  return <AppShell profile={profile}>{children}</AppShell>
}
