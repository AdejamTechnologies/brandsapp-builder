import { useEffect, useRef, useState } from "react"
import { Menu, X } from "lucide-react"
import { NAVBAR_VARIANTS, NAVBAR_VARIANT_GROUPS, type NavbarVariant } from "@brandsapp/builder-core"

import { cn } from "../lib/utils"

/**
 * The Navbar's variant picker, opened from the chip on the selection ring —
 * same affordance as Quick Stack's presets, because picking an arrangement is
 * the first thing you do after dropping a nav.
 *
 * Applying a variant REPLACES the navbar's children with ordinary nodes, so
 * everything here is a starting point the author immediately owns. That is why
 * the picker warns before overwriting work: there is no "revert to variant".
 */

/** How each variant is drawn in the thumbnail — schematic, not a live render. */
type Slot = "brand" | "links" | "cta" | "search" | "icons" | "avatar" | "burger" | "wide"
type Thumb = { left: Slot[]; center: Slot[]; right: Slot[]; tone?: "dark" | "primary" | "boxed"; strip?: boolean }

const THUMBS: Record<string, Thumb> = {
  simple: { left: ["brand"], center: [], right: ["links"] },
  left: { left: ["brand", "links"], center: [], right: [] },
  "centered-links": { left: ["brand"], center: ["links"], right: ["cta"] },
  "brand-center": { left: ["links"], center: ["brand"], right: ["cta"] },
  cta: { left: ["brand"], center: [], right: ["links", "cta"] },
  scrollable: { left: ["brand"], center: [], right: ["wide"] },
  topbar: { left: ["brand"], center: [], right: ["links"], strip: true },
  boxed: { left: ["brand"], center: [], right: ["links", "cta"], tone: "boxed" },
  dark: { left: ["brand"], center: [], right: ["links", "cta"], tone: "dark" },
  primary: { left: ["brand"], center: [], right: ["links"], tone: "primary" },
  dropdown: { left: ["brand"], center: [], right: ["links", "burger"] },
  mega: { left: ["brand"], center: [], right: ["links", "cta"] },
  search: { left: ["brand"], center: [], right: ["links", "search"] },
  avatar: { left: ["brand"], center: [], right: ["links", "avatar"] },
  ecommerce: { left: ["brand"], center: [], right: ["links", "icons"] },
  social: { left: ["brand"], center: [], right: ["links", "icons"] },
}

function SlotMark({ kind, ink }: { kind: Slot; ink: string }) {
  switch (kind) {
    case "brand":
      return <span className={cn("h-1.5 w-4 rounded-[1px]", ink)} />
    case "links":
      return (
        <span className="flex items-center gap-[3px]">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn("h-1 w-2.5 rounded-[1px] opacity-55", ink)} />
          ))}
        </span>
      )
    case "wide":
      return (
        <span className="flex items-center gap-[3px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={cn("h-1 w-2 rounded-[1px]", ink, i > 3 ? "opacity-25" : "opacity-55")} />
          ))}
        </span>
      )
    case "cta":
      return <span className="h-2.5 w-6 rounded-full bg-primary" />
    case "search":
      return <span className={cn("h-2.5 w-7 rounded-full border opacity-55", ink.replace("bg-", "border-"))} />
    case "icons":
      return (
        <span className="flex items-center gap-[3px]">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn("size-1.5 rounded-full opacity-55", ink)} />
          ))}
        </span>
      )
    case "avatar":
      return <span className={cn("size-2.5 rounded-full opacity-70", ink)} />
    case "burger":
      return (
        <span className="flex flex-col gap-[2px]">
          {[0, 1].map((i) => (
            <span key={i} className={cn("h-[1.5px] w-2.5 rounded-full opacity-55", ink)} />
          ))}
        </span>
      )
  }
}

function VariantThumb({ id, active }: { id: string; active: boolean }) {
  const t = THUMBS[id] ?? THUMBS.simple
  const dark = t.tone === "dark"
  const primary = t.tone === "primary"
  const ink = dark || primary ? "bg-white" : "bg-foreground"
  const ground = dark
    ? "bg-neutral-800"
    : primary
      ? "bg-primary"
      : t.tone === "boxed"
        ? "bg-background border border-border rounded-lg mx-1.5"
        : "bg-background"

  const bar = (
    <span className={cn("flex h-7 items-center gap-2 px-2", ground, t.tone === "boxed" && "my-1 h-6")}>
      <span className="flex flex-1 items-center gap-2">{t.left.map((s, i) => <SlotMark key={i} kind={s} ink={ink} />)}</span>
      {!!t.center.length && <span className="flex items-center gap-2">{t.center.map((s, i) => <SlotMark key={i} kind={s} ink={ink} />)}</span>}
      <span className="flex flex-1 items-center justify-end gap-2">{t.right.map((s, i) => <SlotMark key={i} kind={s} ink={ink} />)}</span>
    </span>
  )

  return (
    <span
      aria-hidden
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-md border",
        active ? "border-primary" : "border-border"
      )}
    >
      {t.strip && (
        <span className="flex h-2.5 items-center justify-end gap-1 bg-muted px-2">
          <span className="h-[2px] w-3 rounded-full bg-foreground opacity-35" />
          <span className="h-[2px] w-4 rounded-full bg-foreground opacity-35" />
        </span>
      )}
      {bar}
    </span>
  )
}

export function NavbarChip({ variant, onOpen }: { variant?: string; onOpen: () => void }) {
  const current = NAVBAR_VARIANTS.find((v) => v.id === variant)
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Navbar variants"
      className="flex cursor-pointer items-center gap-1 rounded-md bg-primary px-1.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
    >
      <Menu className="size-3" />
      {current?.label ?? "Variants"}
    </button>
  )
}

export function NavbarVariants({
  variant,
  hasContent,
  onApply,
  onClose,
}: {
  variant?: string
  /** True when the navbar holds anything the author could lose. */
  hasContent: boolean
  onApply: (v: NavbarVariant) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [confirming, setConfirming] = useState<NavbarVariant | null>(null)

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

  const pick = (v: NavbarVariant) => {
    // Swapping variants replaces the subtree. Only worth a confirm when there is
    // something to lose — an untouched navbar just swaps.
    if (hasContent && v.id !== variant) setConfirming(v)
    else {
      onApply(v)
      onClose()
    }
  }

  return (
    <div
      ref={ref}
      className="absolute top-7 left-0 z-50 max-h-[26rem] w-80 overflow-y-auto rounded-xl border border-border bg-background p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold">Navbar variants</span>
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
            Replace this navbar's contents with <span className="font-semibold">{confirming.label}</span>?
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Everything currently inside the navbar is removed. Undo (⌘Z) restores it.
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
        NAVBAR_VARIANT_GROUPS.map((group) => {
          const items = NAVBAR_VARIANTS.filter((v) => v.group === group)
          if (!items.length) return null
          return (
            <div key={group} className="mb-3 last:mb-0">
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {items.map((v) => {
                  const active = v.id === variant
                  return (
                    <button
                      key={v.id}
                      type="button"
                      title={v.hint}
                      onClick={() => pick(v)}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1.5 rounded-lg border p-1.5 text-left transition-colors",
                        active ? "border-primary bg-primary/5" : "border-border hover:border-ring"
                      )}
                    >
                      <VariantThumb id={v.id} active={active} />
                      <span className="truncate px-0.5 text-[11px] font-medium text-foreground">{v.label}</span>
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
