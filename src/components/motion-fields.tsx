import type { Node } from "@brandsapp/builder-core"

import { cn } from "../lib/utils"

/**
 * The Motion panel — scroll-linked motion, reachable by a designer.
 *
 * These properties existed in the AST and could only be written in code, which
 * meant the one capability that separates a composed page from a static one was
 * unavailable to the people who make the design decisions.
 *
 * Everything here writes to `node.anim.scroll`. The entrance effect above it is a
 * separate thing that plays once; these track the element's progress through the
 * viewport continuously, so they are grouped apart rather than mixed in.
 */

type Scroll = NonNullable<NonNullable<Node["anim"]>["scroll"]>

const ROWS: Array<{
  key: keyof Scroll
  label: string
  hint: string
  min: number
  max: number
  step: number
  unit: string
}> = [
  { key: "parallax", label: "Parallax", hint: "Vertical drift as it passes. Negative rises.", min: -300, max: 300, step: 10, unit: "px" },
  { key: "zoom", label: "Zoom", hint: "Scales across the pass.", min: -0.4, max: 0.4, step: 0.05, unit: "×" },
  { key: "rotate", label: "Rotate", hint: "Degrees across the pass.", min: -30, max: 30, step: 1, unit: "°" },
  { key: "stagger", label: "Stagger", hint: "Delay between each child's entrance.", min: 0, max: 300, step: 20, unit: "ms" },
  { key: "pin", label: "Pin", hint: "Hold still for N extra screens while contents advance.", min: 0, max: 3, step: 0.5, unit: "screens" },
]

export function MotionFields({
  node,
  onChange,
}: {
  node: Node
  onChange: (patch: Partial<Node>, coalesceKey?: string) => void
}) {
  const anim = node.anim
  const scroll = (anim?.scroll ?? {}) as Scroll

  // Motion needs an `anim` to hang off; default the entrance to a plain fade so
  // turning on parallax alone cannot produce an element that never appears.
  const setScroll = (patch: Partial<Scroll>, key: string) => {
    const next = { ...scroll, ...patch }
    for (const k of Object.keys(next) as Array<keyof Scroll>) {
      if (next[k] === undefined || next[k] === 0 || next[k] === false) delete next[k]
    }
    const hasAny = Object.keys(next).length > 0
    if (!hasAny && !anim?.effect) {
      onChange({ anim: undefined }, key)
      return
    }
    onChange(
      { anim: { effect: anim?.effect ?? "fade", trigger: anim?.trigger, duration: anim?.duration, delay: anim?.delay, ...(hasAny ? { scroll: next } : {}) } },
      key
    )
  }

  const active = Object.keys(scroll).length > 0

  return (
    <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Motion</span>
        {active && (
          <button
            type="button"
            onClick={() => setScroll({ parallax: undefined, zoom: undefined, rotate: undefined, stagger: undefined, pin: undefined, fade: undefined }, "motion:clear")}
            className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted"
          >
            Clear
          </button>
        )}
      </div>

      {ROWS.map((r) => {
        const raw = scroll[r.key]
        const value = typeof raw === "number" ? raw : 0
        return (
          <label key={r.key} className="flex flex-col gap-1" title={r.hint}>
            <span className="flex items-center justify-between text-xs text-foreground">
              {r.label}
              <span className={cn("tabular-nums", value ? "text-foreground" : "text-muted-foreground/50")}>
                {value}
                {value ? ` ${r.unit}` : ""}
              </span>
            </span>
            <input
              type="range"
              min={r.min}
              max={r.max}
              step={r.step}
              value={value}
              onChange={(e) => setScroll({ [r.key]: Number(e.target.value) } as Partial<Scroll>, `motion:${r.key}`)}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
          </label>
        )
      })}

      <label className="flex cursor-pointer items-center justify-between text-xs text-foreground" title="Fade in as it enters.">
        Fade with scroll
        <input
          type="checkbox"
          checked={!!scroll.fade}
          onChange={(e) => setScroll({ fade: e.target.checked }, "motion:fade")}
          className="size-3.5 cursor-pointer accent-primary"
        />
      </label>

      <p className="text-[10.5px] leading-relaxed text-muted-foreground">
        Motion plays on the published page and in Interact — the canvas stays still so it can be edited.
      </p>
    </div>
  )
}
