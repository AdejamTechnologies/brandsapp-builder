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
        "flex-1 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground data-[selected]:bg-muted data-[selected]:text-foreground",
        className
      )}
      {...props}
    />
  )
}
