import { useEffect, useRef } from "react"
import { LayoutGrid, Minus, Plus, X } from "lucide-react"

import { cn } from "../lib/utils"

/**
 * Quick Stack's presets, opened from the chip on the selection ring — the
 * layout controls that belong ON the element rather than buried in the Style
 * panel, because picking a shape is the first thing you do after dropping one.
 *
 * Only elements that actually have presets get the chip; most don't.
 */
const PRESETS: Array<{ cols: number; rows: number }> = [
  { cols: 1, rows: 1 },
  { cols: 2, rows: 1 },
  { cols: 3, rows: 1 },
  { cols: 4, rows: 1 },
  { cols: 2, rows: 2 },
  { cols: 3, rows: 2 },
  { cols: 4, rows: 2 },
  { cols: 2, rows: 3 },
]

const MAX = 12

function PresetThumb({ cols, rows, active }: { cols: number; rows: number; active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("grid h-6 w-9 gap-[2px] rounded-[3px] p-[2px]", active ? "bg-primary/15" : "bg-transparent")}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => (
        <span key={i} className={cn("rounded-[1.5px]", active ? "bg-primary" : "bg-muted-foreground/45")} />
      ))}
    </span>
  )
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1 rounded-md border border-border">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= 1}
          onClick={() => onChange(value - 1)}
          className="flex size-6 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Minus className="size-3" />
        </button>
        <span className="min-w-5 text-center text-xs tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= MAX}
          onClick={() => onChange(value + 1)}
          className="flex size-6 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Plus className="size-3" />
        </button>
      </div>
      <span className="text-[10.5px] text-muted-foreground">{label}</span>
    </div>
  )
}

export function QuickStackChip({ cols, rows, onOpen }: { cols: number; rows: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Quick Stack presets"
      className="flex items-center gap-1 rounded-md bg-primary px-1.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
    >
      <LayoutGrid className="size-3" />
      {cols}x{rows}
    </button>
  )
}

export function QuickStackPresets({
  cols,
  rows,
  onApply,
  onClose,
}: {
  cols: number
  rows: number
  onApply: (next: { columns: number; rows: number }) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

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

  return (
    <div
      ref={ref}
      className="absolute top-9 right-0 z-50 w-56 rounded-xl border border-border bg-background p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold">Presets</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close presets"
          className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-1.5">
        {PRESETS.map((p) => {
          const active = p.cols === cols && p.rows === rows
          return (
            <button
              key={`${p.cols}x${p.rows}`}
              type="button"
              title={`${p.cols} × ${p.rows}`}
              onClick={() => onApply({ columns: p.cols, rows: p.rows })}
              className={cn(
                "flex items-center justify-center rounded-md border p-1 transition-colors",
                active ? "border-primary bg-primary/5" : "border-border hover:border-ring"
              )}
            >
              <PresetThumb cols={p.cols} rows={p.rows} active={active} />
            </button>
          )
        })}
      </div>

      <div className="flex items-start justify-center gap-4 border-t border-border pt-3">
        <Stepper label="Columns" value={cols} onChange={(n) => onApply({ columns: n, rows })} />
        <Stepper label="Rows" value={rows} onChange={(n) => onApply({ columns: cols, rows: n })} />
      </div>
    </div>
  )
}
