import { Switch as SW } from "@base-ui/react/switch"

import { cn } from "../../lib/utils"

export function Switch({ className, ...props }: SW.Root.Props) {
  return (
    <SW.Root
      className={cn(
        "relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/30 data-[checked]:bg-primary data-[unchecked]:bg-input",
        className
      )}
      {...props}
    >
      <SW.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform data-[checked]:translate-x-[15px]" />
    </SW.Root>
  )
}
