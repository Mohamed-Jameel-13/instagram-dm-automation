"use client"

import { Search } from "lucide-react"
import { ThemeSwitcher } from "./theme-switcher"
import { Input } from "./ui/input"

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="flex h-16 items-center px-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search automations..." className="w-full pl-8 bg-background" />
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
