import type { SelectHTMLAttributes } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "../../lib/utils"

/** Native select with a shadcn look (no Radix — keeps it dependency-free). */
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-8 w-full appearance-none rounded-md border border-line bg-panel pl-2.5 pr-7 text-xs text-ink outline-none transition-[color,box-shadow,border-color] focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
    </div>
  )
}
