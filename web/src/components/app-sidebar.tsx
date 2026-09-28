"use client"

import {
  ClipboardListIcon,
  FlaskConicalIcon,
  LayoutGridIcon,
  LogOutIcon,
  StethoscopeIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { signOut } from "@/app/login/actions"
import { LogoMark } from "@/components/logo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { roleHome, roleLabel, siteConfig, type UserRole } from "@/config/site"
import { initials } from "@/lib/utils"

type NavItem = { href: string; label: string; icon: LucideIcon }
type NavGroup = { label: string; items: NavItem[] }

const navByRole: Record<UserRole, NavGroup[]> = {
  admin: [
    {
      label: "Menu",
      items: [
        { href: "/admin", label: "Dashboard", icon: LayoutGridIcon },
        { href: "/admin/pasien", label: "Pasien", icon: UsersIcon },
        { href: "/admin/dokter", label: "Dokter", icon: StethoscopeIcon },
      ],
    },
    {
      label: "Informasi",
      items: [{ href: "/riset", label: "Riset & Model", icon: FlaskConicalIcon }],
    },
  ],
  doctor: [
    {
      label: "Menu",
      items: [
        { href: "/dokter", label: "Antrean", icon: ClipboardListIcon },
        { href: "/riset", label: "Riset & Model", icon: FlaskConicalIcon },
      ],
    },
  ],
}

function isActive(pathname: string, href: string, role: UserRole) {
  // Halaman awal peran tidak ikut menyala di subhalaman lain (mis. /admin/pasien),
  // kecuali konsol review dokter yang merupakan bagian dari antrean.
  if (href === roleHome[role]) {
    return pathname === href || pathname.startsWith(`${href}/review`)
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar({
  role,
  fullName,
  email,
}: {
  role: UserRole
  fullName: string
  email: string | null
}) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <Link
          href={roleHome[role]}
          className="flex items-center gap-2.5 rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:p-0"
        >
          <LogoMark size={30} />
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block text-[17px] leading-tight font-bold">{siteConfig.name}</span>
            <span className="block text-[11px] font-medium tracking-wide text-muted-foreground">
              {roleLabel[role]}
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {navByRole[role].map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(pathname, item.href, role)}
                    tooltip={item.label}
                    className="h-9 font-medium data-active:font-semibold"
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-2.5 rounded-xl border border-sidebar-border p-2.5 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:p-0">
          <Avatar>
            <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
              {initials(fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-[13px] font-semibold">{fullName}</p>
            {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
          </div>
          <form action={signOut} className="group-data-[collapsible=icon]:hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" variant="ghost" size="icon-sm" aria-label="Keluar">
                  <LogOutIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Keluar</TooltipContent>
            </Tooltip>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
