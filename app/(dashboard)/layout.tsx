"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Header } from "@/components/header"
import { InstagramConnectionStatus } from "@/components/instagram-status"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const [showConnectionAlert, setShowConnectionAlert] = useState(true)

  // Dismiss the alert after it's acknowledged
  const handleConnected = () => {
    setShowConnectionAlert(false)
  }

  // Reset the alert when navigating between pages
  useEffect(() => {
    setShowConnectionAlert(true)
  }, [children])

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          {showConnectionAlert && status === "authenticated" && !session?.user?.accounts?.some(account => account.provider === "instagram") && (
            <div className="px-6 pt-6">
              <InstagramConnectionStatus onConnected={handleConnected} />
            </div>
          )}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
