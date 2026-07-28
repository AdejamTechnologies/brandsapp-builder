import { useEffect, useRef, type ReactNode } from "react"
import { ArrowRight, Settings2, X } from "lucide-react"

/**
 * The on-canvas settings popover — the panel behind the gear on an element's
 * label. It exists because the settings you reach for immediately after placing
 * something (a link's destination, a list's markers) shouldn't need a trip to
 * the right-hand panel and a tab switch.
 *
 * It renders whatever fields it is GIVEN rather than knowing about schemas, so
 * the same field renderer serves both this and the Inspector and the two can't
 * drift apart.
 */
export function ElementSettingsChip({ onOpen, active }: { onOpen: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Element settings"
      aria-label="Element settings"
      aria-expanded={!!active}
      className="flex items-center justify-center rounded-md bg-primary px-1.5 py-1 text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
    >
      <Settings2 className="size-3" />
    </button>
  )
}

export function ElementSettings({
  title,
  onClose,
  onShowAll,
  children,
}: {
  title: string
  onClose: () => void
  /** Jump to the full Settings tab in the Inspector. */
  onShowAll: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      // Ignore clicks inside the panel, and inside anything it opened in a
      // portal — our Select popups render outside this subtree, so a naive
      // outside-click check would close the panel the moment a value is picked.
      if (ref.current?.contains(t)) return
      if (t.closest?.("[role='listbox'], [role='option'], [role='dialog']")) return
      onClose()
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onDown)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("mousedown", onDown)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute top-7 left-0 z-50 flex max-h-[70vh] w-72 flex-col rounded-xl border border-border bg-background shadow-lg"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-xs font-semibold">{title} settings</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1.5">{children}</div>

      <div className="shrink-0 border-t border-border p-2">
        <button
          type="button"
          onClick={onShowAll}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
        >
          Show all settings
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
