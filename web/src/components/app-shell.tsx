import { cookies } from "next/headers"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { CurrentProfile } from "@/lib/auth"

export async function AppShell({
  profile,
  children,
}: {
  profile: CurrentProfile
  children: React.ReactNode
}) {
  // Komponen sidebar shadcn menyimpan status buka/tutup di cookie ini.
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ "--sidebar-width": "15rem" } as React.CSSProperties}
    >
      <AppSidebar role={profile.role} fullName={profile.fullName} email={profile.email} />
      <SidebarInset className="min-w-0">
        <AppHeader role={profile.role} />
        <div className="w-full max-w-[1440px] flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
