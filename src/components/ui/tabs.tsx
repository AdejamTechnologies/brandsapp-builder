import { Tabs as T } from "@base-ui/react/tabs"

import { cn } from "../../lib/utils"

export const Tabs = T.Root
export const TabsPanel = T.Panel

export function TabsList({ className, ...props }: T.List.Props) {
  return <T.List className={cn("flex items-center gap-1", className)} {...props} />
}

export function TabsTab({ className, ...props }: T.Tab.Props) {
  return (
    <T.Tab
      className={cn(
        "flex-1 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors outline-none hover:bg-muted/70 hover:text-foreground",
        // Base UI marks the active tab with aria-selected, NOT data-selected —
        // the old data-[selected]: rules never matched, so a selected tab looked
        // exactly like an idle one. Accent + raised surface makes it unmissable.
        "aria-selected:bg-background aria-selected:text-primary aria-selected:shadow-sm aria-selected:ring-1 aria-selected:ring-border",
        "focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    />
  )
}
