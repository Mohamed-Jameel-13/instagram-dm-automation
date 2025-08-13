"use client"

import { Home, Zap, User, HelpCircle, LogOut, Link as LinkIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Automations",
    href: "/automations",
    icon: Zap,
  },
  {
    title: "Integrations",
    href: "/integrations",
    icon: LinkIcon,
  },
  {
    title: "Profile",
    href: "/profile",
    icon: User,
  },
  {
    title: "Help",
    href: "/help",
    icon: HelpCircle,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="flex items-center justify-center py-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <span className="text-2xl font-bold">Slide</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
