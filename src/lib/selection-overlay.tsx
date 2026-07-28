import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react"

interface Box {
  x: number
  y: number
  w: number
  h: number
}

interface OverlayProps {
  /** The scrolling canvas viewport that holds the rendered `[data-node-id]` nodes. */
  scrollRef: RefObject<HTMLDivElement | null>
  selectedId: string | null
  label?: string
  /** Optional control pinned to the ring's top-right (e.g. Quick Stack presets). */
  badge?: ReactNode
}

const same = (a: Box | null, b: Box | null) =>
  a === b ||
  (!!a && !!b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5)

/**
 * The selection ring. Borrowed from Instatic: a separate absolutely-positioned
 * layer measured every animation frame via getBoundingClientRect — NOT a CSS
 * outline on the node itself (an outline changes the node's layout box and breaks
 * inline/flex authoring). Coordinates are relative to the non-scrolling wrapper,
 * so the ring tracks the node as the canvas scrolls or the layout reflows.
 */
export function SelectionOverlay({ scrollRef, selectedId, label, badge }: OverlayProps) {
  const [box, setBox] = useState<Box | null>(null)
  const boxRef = useRef<Box | null>(null)

  useEffect(() => {
    if (!selectedId) {
      boxRef.current = null
      setBox(null)
      return
    }
    let raf = 0
    const tick = () => {
      const scroll = scrollRef.current
      const wrap = scroll?.parentElement
      let next: Box | null = null
      if (scroll && wrap) {
        const el = scroll.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(selectedId)}"]`)
        if (el) {
          const wb = wrap.getBoundingClientRect()
          const b = el.getBoundingClientRect()
          next = { x: b.left - wb.left, y: b.top - wb.top, w: b.width, h: b.height }
        }
      }
      if (!same(next, boxRef.current)) {
        boxRef.current = next
        setBox(next)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [scrollRef, selectedId])

  if (!box) return null
  return (
    <div className="sel-ring" style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h }}>
      {label && <span className="sel-label">{label}</span>}
      {badge && <span className="sel-badge">{badge}</span>}
    </div>
  )
}
