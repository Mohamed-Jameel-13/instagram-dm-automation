"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { ThemeSwitcher } from "./theme-switcher"
import { Input } from "./ui/input"

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState("")

  // Sync input with current route/search param when on Automations
  useEffect(() => {
    if (pathname === "/automations") {
      setQuery(searchParams.get("search") || "")
    } else {
      setQuery("")
    }
  }, [pathname, searchParams])

  const buildAutomationsUrl = (q: string) => {
    const params = new URLSearchParams()
    if (q.trim()) params.set("search", q.trim())
    const qs = params.toString()
    return "/automations" + (qs ? `?${qs}` : "")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    if (pathname === "/automations") {
      router.replace(buildAutomationsUrl(value))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const url = buildAutomationsUrl(query)
      if (pathname === "/automations") router.replace(url)
      else router.push(url)
    }
  }

  return (
    <header className="border-b border-border">
      <div className="flex h-16 items-center px-4 md:px-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search automations..."
            className="w-full pl-8 bg-background"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitcher />
          <div className="relative h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-foreground">
            <span className="text-sm font-medium">JD</span>
          </div>
        </div>
      </div>
    </header>
  )
}
