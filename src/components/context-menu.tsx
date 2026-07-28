import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "../lib/utils"

/**
 * The canvas right-click menu, arranged like Webflow's: element actions first,
 * then clipboard, then classes, then navigation. Submenus open on hover and are
 * flipped back on screen when they would overflow.
 *
 * Rendered fixed at the pointer, dismissed on Escape / outside click / scroll.
 */
export interface MenuItem {
  /** A separator row. */
  separator?: true
  label?: string
  /** Right-aligned shortcut hint, e.g. "⌘D". Display only — the real binding lives with the editor's key handler. */
  shortcut?: string
  disabled?: boolean
  /** A tick on the left (used by Select parent to mark the immediate parent). */
  checked?: boolean
  onSelect?: () => void
  children?: MenuItem[]
}

function Row({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const [openSub, setOpenSub] = useState(false)
  const rowRef = useRef<HTMLButtonElement>(null)
  const subRef = useRef<HTMLDivElement>(null)
  const [flip, setFlip] = useState(false)

  useLayoutEffect(() => {
    if (!openSub || !subRef.current || !rowRef.current) return
    const r = rowRef.current.getBoundingClientRect()
    setFlip(r.right + subRef.current.offsetWidth + 8 > window.innerWidth)
  }, [openSub])

  if (item.separator) return <div className="my-1 h-px bg-border" />

  const hasSub = !!item.children?.length
  return (
    <div className="relative" onMouseLeave={() => setOpenSub(false)}>
      <button
        ref={rowRef}
        type="button"
        disabled={item.disabled}
        onMouseEnter={() => setOpenSub(hasSub)}
        onClick={() => {
          if (hasSub) return setOpenSub((v) => !v)
          item.onSelect?.()
          onClose()
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-[5px] px-2 py-[5px] text-left text-[12.5px] transition-colors",
          item.disabled
            ? "cursor-not-allowed text-muted-foreground/50"
            : "text-foreground hover:bg-muted"
        )}
      >
        {item.checked !== undefined && (
          <span className="w-3 shrink-0 text-[11px] text-primary">{item.checked ? "✓" : ""}</span>
        )}
        <span className="flex-1 truncate">{item.label}</span>
        {item.shortcut && (
          <span className="shrink-0 text-[11px] tracking-wide text-muted-foreground">{item.shortcut}</span>
        )}
        {hasSub && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
      </button>

      {hasSub && openSub && (
        <div
          ref={subRef}
          className={cn(
            "absolute top-0 z-50 min-w-44 rounded-lg border border-border bg-background p-1 shadow-lg",
            flip ? "right-full mr-1" : "left-full ml-1"
          )}
        >
          {item.children!.map((sub, i) => (
            <Row key={sub.label ?? `sep${i}`} item={sub} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })

  // Keep the whole menu on screen when opened near an edge.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { offsetWidth: w, offsetHeight: h } = el
    setPos({
      x: Math.min(x, window.innerWidth - w - 8),
      y: Math.min(y, window.innerHeight - h - 8),
    })
  }, [x, y])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onDown)
    window.addEventListener("scroll", onClose, true)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("scroll", onClose, true)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="menu"
      style={{ position: "fixed", left: pos.x, top: pos.y }}
      className="z-50 min-w-56 rounded-lg border border-border bg-background p-1 shadow-lg"
    >
      {items.map((item, i) => (
        <Row key={item.label ?? `sep${i}`} item={item} onClose={onClose} />
      ))}
    </div>
  )
}
