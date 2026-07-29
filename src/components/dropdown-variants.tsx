import { useEffect, useRef, useState } from "react"
import { ChevronDown, X } from "lucide-react"
import { DROPDOWN_VARIANTS, DROPDOWN_VARIANT_GROUPS, type DropdownVariant } from "@brandsapp/builder-core"

import { cn } from "../lib/utils"

/**
 * The Dropdown's variant picker — the same affordance as Quick Stack and Navbar.
 *
 * Applying one replaces the dropdown's contents, so it warns first when there is
 * something to lose. Thumbnails are schematic rather than live: a real menu is
 * absolutely positioned and would escape a 4rem preview box.
 */

type Row = "text" | "icon" | "rule" | "check" | "radio" | "avatar" | "shortcut" | "title" | "header" | "sub"
type Thumb = { trigger: "pill" | "square" | "avatar"; rows: Row[]; align?: "right" | "up" | "side" }

const THUMBS: Record<string, Thumb> = {
  button: { trigger: "pill", rows: ["text", "text", "text"] },
  "icon-only": { trigger: "square", rows: ["icon", "icon", "rule", "icon"] },
  avatar: { trigger: "avatar", rows: ["icon", "icon", "rule", "icon"] },
  plain: { trigger: "pill", rows: ["text", "text", "text", "text"] },
  icons: { trigger: "pill", rows: ["icon", "icon", "icon", "icon"] },
  dividers: { trigger: "pill", rows: ["icon", "rule", "icon", "rule", "icon"] },
  sections: { trigger: "pill", rows: ["title", "icon", "title", "icon"] },
  header: { trigger: "pill", rows: ["header", "icon", "icon"] },
  shortcuts: { trigger: "pill", rows: ["shortcut", "shortcut", "shortcut"] },
  checkboxes: { trigger: "pill", rows: ["title", "check", "check", "check"] },
  radios: { trigger: "pill", rows: ["title", "radio", "radio", "radio"] },
  destructive: { trigger: "pill", rows: ["icon", "icon", "rule", "sub"] },
  submenu: { trigger: "pill", rows: ["icon", "sub", "rule", "icon"] },
  notifications: { trigger: "square", rows: ["header", "avatar", "avatar", "avatar"] },
  switcher: { trigger: "pill", rows: ["title", "avatar", "avatar", "avatar"] },
  "below-start": { trigger: "pill", rows: ["text", "text", "text"] },
  "below-end": { trigger: "pill", rows: ["text", "text", "text"], align: "right" },
  above: { trigger: "pill", rows: ["text", "text", "text"], align: "up" },
  side: { trigger: "pill", rows: ["text", "text", "text"], align: "side" },
}

function RowMark({ kind }: { kind: Row }) {
  if (kind === "rule") return <span className="my-[2px] block h-px w-full bg-border" />
  if (kind === "title") return <span className="block h-[3px] w-1/3 rounded-full bg-muted-foreground/70" />
  if (kind === "header")
    return (
      <span className="mb-[2px] flex items-center gap-1 border-b border-border pb-[3px]">
        <span className="size-2 shrink-0 rounded-full bg-muted-foreground/50" />
        <span className="h-[3px] flex-1 rounded-full bg-muted-foreground/35" />
      </span>
    )
  return (
    <span className="flex items-center gap-1">
      {(kind === "icon" || kind === "sub") && <span className="size-1.5 shrink-0 rounded-[1px] bg-muted-foreground/55" />}
      {kind === "check" && <span className="size-1.5 shrink-0 rounded-[1px] border border-muted-foreground/70 bg-primary/70" />}
      {kind === "radio" && <span className="size-1.5 shrink-0 rounded-full border border-muted-foreground/70" />}
      {kind === "avatar" && <span className="size-2 shrink-0 rounded-full bg-muted-foreground/45" />}
      <span className={cn("h-[3px] rounded-full bg-muted-foreground/35", kind === "shortcut" ? "flex-1" : "w-full")} />
      {kind === "shortcut" && <span className="h-[3px] w-2 shrink-0 rounded-full bg-muted-foreground/25" />}
      {kind === "sub" && <span className="size-1 shrink-0 rotate-45 border-r border-t border-muted-foreground/50" />}
    </span>
  )
}

function VariantThumb({ id }: { id: string }) {
  const t = THUMBS[id] ?? THUMBS.button
  const trigger =
    t.trigger === "square" ? (
      <span className="size-3.5 rounded-[3px] border border-border" />
    ) : t.trigger === "avatar" ? (
      <span className="flex items-center gap-1 rounded-full border border-border py-[2px] pl-[2px] pr-1.5">
        <span className="size-2.5 rounded-full bg-muted-foreground/45" />
        <span className="h-[3px] w-4 rounded-full bg-muted-foreground/45" />
      </span>
    ) : (
      <span className="flex items-center gap-1 rounded-[3px] border border-border px-1.5 py-[3px]">
        <span className="h-[3px] w-5 rounded-full bg-muted-foreground/55" />
        <ChevronDown className="size-2 text-muted-foreground/60" />
      </span>
    )

  const panel = (
    <span className="flex w-[4.25rem] flex-col gap-[3px] rounded-md border border-border bg-background p-1 shadow-sm">
      {t.rows.map((r, i) => (
        <RowMark key={i} kind={r} />
      ))}
    </span>
  )

  // The placement group is the whole point of those entries, so the thumbnail has
  // to show it — otherwise all four look identical.
  return (
    <span
      aria-hidden
      className={cn(
        "flex min-h-[4.5rem] w-full gap-1 rounded-md bg-muted/40 p-2",
        t.align === "side" ? "flex-row items-start" : "flex-col",
        t.align === "up" ? "justify-end" : "",
        t.align === "right" ? "items-end" : t.align === "side" ? "" : "items-start"
      )}
    >
      {t.align === "up" ? (
        <>
          {panel}
          {trigger}
        </>
      ) : (
        <>
          {trigger}
          {panel}
        </>
      )}
    </span>
  )
}

export function DropdownChip({ variant, onOpen }: { variant?: string; onOpen: () => void }) {
  const current = DROPDOWN_VARIANTS.find((v) => v.id === variant)
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Dropdown variants"
      className="flex cursor-pointer items-center gap-1 rounded-md bg-primary px-1.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
    >
      <ChevronDown className="size-3" />
      {current?.label ?? "Variants"}
    </button>
  )
}

export function DropdownVariants({
  variant,
  hasContent,
  onApply,
  onClose,
}: {
  variant?: string
  hasContent: boolean
  onApply: (v: DropdownVariant) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [confirming, setConfirming] = useState<DropdownVariant | null>(null)

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

  const pick = (v: DropdownVariant) => {
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
        <span className="text-xs font-semibold">Dropdown variants</span>
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
            Replace this dropdown's contents with <span className="font-semibold">{confirming.label}</span>?
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
        DROPDOWN_VARIANT_GROUPS.map((group) => {
          const items = DROPDOWN_VARIANTS.filter((v) => v.group === group)
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
                      <VariantThumb id={v.id} />
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
