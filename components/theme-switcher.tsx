"use client"

import { startTransition, useCallback } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

function disableTransitionsTemporarily() {
  const style = document.createElement("style")
  style.appendChild(
    document.createTextNode(`* { transition-duration: 0s !important; animation-duration: 0s !important; }`),
  )
  document.head.appendChild(style)
  let removed = false
  const cleanup = () => {
    if (removed) return
    removed = true
    document.head.removeChild(style)
  }
  // Fallback cleanup in case rAF doesn't fire
  setTimeout(cleanup, 250)
  requestAnimationFrame(() => cleanup())
}

export function ThemeSwitcher() {
  const { setTheme } = useTheme()

  const applyTheme = useCallback((theme: string) => {
    // Avoid costly color transitions on whole app to reduce INP
    disableTransitionsTemporarily()
    startTransition(() => {
      setTheme(theme)
    })
  }, [setTheme])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); applyTheme("light") }}>Light</DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); applyTheme("dark") }}>Dark</DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); applyTheme("purple") }}>Purple</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
