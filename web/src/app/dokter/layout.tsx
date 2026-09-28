import { AppShell } from "@/components/app-shell"
import { requireRole } from "@/lib/auth"

// Guard kedua setelah proxy.ts: peran dicek lagi di server dari tabel profiles.
export default async function Layout({ children }: LayoutProps<"/dokter">) {
  const profile = await requireRole("doctor")
  return <AppShell profile={profile}>{children}</AppShell>
}
