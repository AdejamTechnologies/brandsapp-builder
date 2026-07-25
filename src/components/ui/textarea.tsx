import type { TextareaHTMLAttributes } from "react"

import { cn } from "../../lib/utils"

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-line bg-panel px-2.5 py-2 text-xs text-ink outline-none transition-[color,box-shadow,border-color] placeholder:text-subtle focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20",
        className
      )}
      {...props}
    />
  )
}
