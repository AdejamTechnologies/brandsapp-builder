import { Select as S } from "@base-ui/react/select"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "../../lib/utils"

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

/** A compact Base UI Select with a simple value/options API (used across the inspector). */
export function Select({ value, onValueChange, options, placeholder, className }: SelectProps) {
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]))
  return (
    <S.Root value={value} onValueChange={(v) => onValueChange(v ?? "")} items={items}>
      <S.Trigger
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-transparent px-2.5 text-xs outline-none transition-colors data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20",
          className
        )}
      >
        <S.Value placeholder={placeholder ?? "—"} className="truncate" />
        <S.Icon render={<ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />} />
      </S.Trigger>
      <S.Portal>
        <S.Positioner side="bottom" sideOffset={4} align="start" className="z-50">
          <S.Popup className="max-h-72 min-w-[--anchor-width] overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0">
            <S.List>
              {options.map((o) => (
                <S.Item
                  key={o.value}
                  value={o.value}
                  className="relative flex cursor-pointer items-center rounded-md py-1.5 pr-7 pl-2 text-xs outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                >
                  <S.ItemText>{o.label}</S.ItemText>
                  <S.ItemIndicator className="absolute right-2 flex items-center">
                    <Check className="size-3.5" />
                  </S.ItemIndicator>
                </S.Item>
              ))}
            </S.List>
          </S.Popup>
        </S.Positioner>
      </S.Portal>
    </S.Root>
  )
}
