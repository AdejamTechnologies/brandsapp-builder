import type { ReactNode } from "react"
import { Tooltip as T } from "@base-ui/react/tooltip"

import { cn } from "../../lib/utils"

export function TooltipProvider(props: T.Provider.Props) {
  return <T.Provider delay={200} {...props} />
}

export const Tooltip = T.Root
export const TooltipTrigger = T.Trigger

interface TooltipContentProps extends T.Popup.Props {
  side?: T.Positioner.Props["side"]
  children: ReactNode
}

export function TooltipContent({ className, side = "top", children, ...props }: TooltipContentProps) {
  return (
    <T.Portal>
      <T.Positioner side={side} sideOffset={6} className="z-50">
        <T.Popup
          className={cn(
            "z-50 rounded-md bg-foreground px-2.5 py-1 text-xs text-background shadow-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0",
            className
          )}
          {...props}
        >
          {children}
        </T.Popup>
      </T.Positioner>
    </T.Portal>
  )
}
