// Shared page header: brand mark, page subtitle, page-specific actions and the light/dark switch.
import React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BrandMark() {
  return (
    <svg viewBox="0 0 34 34" className="h-[34px] w-[34px] shrink-0" aria-hidden="true">
      <rect width="34" height="34" rx="9" fill="hsl(var(--ink))" />
      <path d="M5 23h9l7-7h8" fill="none" stroke="hsl(var(--line-red))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6v6l4 4" fill="none" stroke="hsl(var(--line-teal))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21" cy="16" r="3.6" fill="hsl(var(--card))" stroke="hsl(var(--ink))" strokeWidth="1.6" />
    </svg>
  )
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === "dark"
  return (
    <Button variant="outline" size="icon" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={`Switch to ${dark ? "light" : "dark"} mode`}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  )
}

interface AppHeaderProps {
  subtitle: string
  plain?: boolean // login page: no bar, sits on the map
  children?: React.ReactNode
}

export default function AppHeader({ subtitle, plain, children }: AppHeaderProps) {
  return (
    <header className={plain ? "relative z-10" : "topbar"}>
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-2 sm:px-8">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <div>
            <p className="font-display text-[21px] font-bold leading-none tracking-tight">CareerPath Analyzer</p>
            <p className="eyebrow mt-1 text-[11px]">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {children}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
