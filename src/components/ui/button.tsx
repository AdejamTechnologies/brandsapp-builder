import { cva, type VariantProps } from "class-variance-authority"
import type { ButtonHTMLAttributes } from "react"

import { cn } from "../../lib/utils"

const button = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-ink hover:bg-accent/90",
        soft: "bg-accent-soft text-accent hover:bg-accent-soft/70",
        outline: "border border-line-strong bg-panel text-ink hover:bg-canvas",
        ghost: "text-muted hover:bg-canvas hover:text-ink",
        subtle: "bg-canvas text-ink hover:bg-line",
      },
      size: {
        sm: "h-7 px-2.5",
        default: "h-8 px-3.5",
        icon: "h-8 w-8 p-0",
        iconSm: "h-7 w-7 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(button({ variant, size }), className)} {...props} />
}
