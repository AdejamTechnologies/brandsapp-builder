import { useEffect, useRef, useState } from "react"
import { Layers2, X } from "lucide-react"
import { componentVariants, type ElementVariant } from "@brandsapp/builder-core"

import { cn } from "../lib/utils"

/**
 * The generic variant picker, driven by the module → catalog registry rather than
 * by per-element wiring: adding a catalog is all a new component needs.
 *
 * Navbar and Dropdown keep their own pickers because their thumbnails are worth
 * drawing — a bar and a menu have a shape you can recognise at 4rem. These
 * components don't: a card, an alert and a badge all reduce to the same rounded
 * rectangle, so a schematic would be decoration that tells you nothing. The label
 * and its one-line description carry the meaning instead.
 */
export function ElementVariantsChip({
  module,
  variant,
  onOpen,
}: {
  module: string
  variant?: string
  onOpen: () => void
}) {
  const catalog = componentVariants(module)
  if (!catalog) return null
  const current = catalog.variants.find((v) => v.id === variant)
  return (
    <button
      type="button"
      onClick={onOpen}
      title={catalog.title}
      className="flex cursor-pointer items-center gap-1 rounded-md bg-primary px-1.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
    >
      <Layers2 className="size-3" />
      {current?.label ?? "Variants"}
    </button>
  )
}

export function ElementVariants({
  module,
  variant,
  hasContent,
  onApply,
  onClose,
}: {
  module: string
  variant?: string
  hasContent: boolean
  onApply: (v: ElementVariant) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [confirming, setConfirming] = useState<ElementVariant | null>(null)
  const catalog = componentVariants(module)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onDown)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("mousedown", onDown)
    }
  }, [onClose])

  if (!catalog) return null

  const pick = (v: ElementVariant) => {
    if (hasContent && v.id !== variant) setConfirming(v)
    else {
      onApply(v)
      onClose()
    }
  }

  return (
    <div
      ref={ref}
      className="absolute top-7 left-0 z-50 max-h-[26rem] w-72 overflow-y-auto rounded-xl border border-border bg-background p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold">{catalog.title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close variants"
          className="flex size-5 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {confirming ? (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs leading-relaxed text-foreground">
            Replace this element's contents with <span className="font-semibold">{confirming.label}</span>?
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Everything currently inside it is removed. Undo (⌘Z) restores it.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(confirming)
                setConfirming(null)
                onClose()
              }}
              className="cursor-pointer rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Replace
            </button>
          </div>
        </div>
      ) : (
        catalog.groups.map((group) => {
          const items = catalog.variants.filter((v) => v.group === group)
          if (!items.length) return null
          return (
            <div key={group} className="mb-3 last:mb-0">
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </div>
              <div className="flex flex-col gap-0.5">
                {items.map((v) => {
                  const active = v.id === variant
                  return (
                    <button
                      key={v.id}
                      type="button"
                      title={v.hint}
                      onClick={() => pick(v)}
                      className={cn(
                        "flex cursor-pointer flex-col gap-0.5 rounded-md border px-2.5 py-1.5 text-left transition-colors",
                        active ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted"
                      )}
                    >
                      <span className="text-xs font-medium text-foreground">{v.label}</span>
                      <span className="text-[11px] leading-snug text-muted-foreground">{v.hint}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
