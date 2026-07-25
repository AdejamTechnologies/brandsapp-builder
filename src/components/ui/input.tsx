import type { InputHTMLAttributes } from "react"

import { cn } from "../../lib/utils"

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-8 w-full rounded-md border border-line bg-panel px-2.5 text-xs text-ink outline-none transition-[color,box-shadow,border-color] placeholder:text-subtle focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}
