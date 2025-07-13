import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/toaster"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Slide - Instagram DM Automation",
  description: "Transform Your Instagram Engagement with Slide",
  generator: 'v0.dev'
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerSession(authOptions)
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers session={session}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} themes={["light", "dark", "purple"]}>
            {children}
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}