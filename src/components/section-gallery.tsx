import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronRight, X } from "lucide-react"
import {
  ANIMATION_KEYFRAMES,
  generateUtilityCss,
  parseDoc,
  renderDocToReact,
  themeToCss,
  themeTokens,
  type Doc,
} from "@brandsapp/builder-core"

import { registry } from "../lib/registry"
import type { Template } from "../lib/templates"
import { cn } from "../lib/utils"

/**
 * The Sections browser: categories on the left, a flyout of LIVE previews on the
 * right.
 *
 * The old panel was a flat list of 300 text buttons — "footers 7" tells you
 * nothing about what you are about to drop, so picking a block meant dropping it,
 * looking, and undoing. Previews are the whole point.
 *
 * They are real renders, not screenshots: the same engine, registry and utility
 * CSS the canvas uses, so a preview cannot drift from what actually lands. The
 * cost is managed three ways — one category renders at a time, cards mount only
 * as they scroll near the viewport, and the utility CSS is generated once per
 * category rather than once per card.
 */

const DEFAULT_THEME = themeTokens.parse({})
const THEME_CSS = themeToCss(DEFAULT_THEME, ".bapp-root")

const PREVIEW_W = 1024 // authoring width; narrower than desktop so the
// down-scale into a card is gentler and the preview text stays readable
const MIN_H = 70 // a one-line announcement bar stays clickable
const MAX_H = 340 // a long block crops rather than dominating the list
const FALLBACK_H = 170 // before measurement / while off-screen

/** A Fragment is a Doc without a theme, so previewing one is just adding it. */
function docOf(t: Template): Doc | null {
  try {
    const frag = t.make()
    return parseDoc({ ...frag, theme: DEFAULT_THEME })
  } catch {
    return null
  }
}

/** Nearest ancestor that actually scrolls — the sidebar's visible box. */
function scrollViewport(from: HTMLElement | null): HTMLElement | null {
  for (let el = from?.parentElement ?? null; el && el !== document.body; el = el.parentElement) {
    const oy = getComputedStyle(el).overflowY
    if ((oy === "auto" || oy === "scroll") && el.clientHeight > 0) return el
  }
  return from
}

function useInView<T extends Element>(rootMargin = "600px") {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (inView) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setInView(true), { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [inView, rootMargin])
  return { ref, inView }
}

function Thumb({ doc }: { doc: Doc | null }) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const inner = useRef<HTMLDivElement>(null)
  const [h, setH] = useState<number | null>(null)
  const [w, setW] = useState(600)

  // The card is fluid, so the scale has to follow its measured width rather than
  // a constant — a hardcoded ratio left a gap on one side at other panel widths.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth || 600))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  const scale = w / PREVIEW_W

  useEffect(() => {
    if (!inView) return
    const measure = () => {
      const natural = inner.current?.scrollHeight ?? 0
      if (natural > 0) setH(Math.min(MAX_H, Math.max(MIN_H, Math.round(natural * scale))))
    }
    measure()
    // Images and webfonts land after first paint and change the real height.
    const t = setTimeout(measure, 500)
    return () => clearTimeout(t)
  }, [inView, doc, scale])

  const rendered = useMemo(() => {
    if (!inView || !doc) return null
    try {
      return renderDocToReact(doc, { registry, isEditor: false }).node
    } catch {
      return null
    }
  }, [inView, doc])

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden rounded-lg bg-white transition-[height] duration-200"
      style={{ height: h ?? FALLBACK_H }}
    >
      {rendered && (
        <div
          ref={inner}
          className="bapp-root pointer-events-none absolute top-0 left-0 origin-top-left"
          style={{ width: PREVIEW_W, transform: `scale(${scale})` }}
        >
          {rendered}
        </div>
      )}
    </div>
  )
}

export function SectionGallery({
  items,
  onDragStart,
}: {
  items: Template[]
  onDragStart: (t: Template, e: React.PointerEvent) => void
}) {
  const [q, setQ] = useState("")
  const [open, setOpen] = useState<string | null>(null)
  const flyout = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState({ left: 0, top: 0, height: 0 })

  // The flyout is fixed, so it needs the sidebar's live coordinates — and they
  // move when the window resizes.
  useEffect(() => {
    if (!open) return
    const measure = () => {
      // Anchor to the scrolling PANEL, not to this component's own box. The panel
      // is the scroller and this root grows to its full content height, so its
      // rect reported top:-631 height:2094 once the list was scrolled — the
      // flyout then hung off the top of the window and over the toolbar.
      const el = scrollViewport(rootRef.current)
      if (!el) return
      const r = el.getBoundingClientRect()
      // Vertically the flyout matches the CANVAS, not the sidebar: the sidebar
      // starts level with the toolbar, so anchoring to it buried Code, Interact
      // and the breakpoint switcher behind the panel.
      const canvas = document.querySelector(".canvas-wrap")?.getBoundingClientRect()
      setAnchor({
        left: Math.round(r.right),
        top: Math.round(canvas?.top ?? r.top),
        height: Math.round(canvas?.height ?? r.height),
      })
    }
    measure()
    // Once more after layout settles: the flyout mounts in the same commit that
    // opens it, so the first paint would otherwise use the initial zero anchor
    // and sit over the toolbar.
    const raf = requestAnimationFrame(measure)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [open])

  const query = q.trim().toLowerCase()
  const matched = useMemo(
    () => (query ? items.filter((t) => `${t.name} ${t.category}`.toLowerCase().includes(query)) : items),
    [items, query]
  )

  // Keyed on the DISPLAY name: HyperUI and Meraki both ship a "footers"
  // category, and grouping on the raw string gave two rows both labelled
  // "Footers" with the blocks split arbitrarily between them.
  const categories = useMemo(() => {
    const m = new Map<string, Template[]>()
    for (const t of matched) {
      const key = prettyCategory(t.category)
      const list = m.get(key)
      if (list) list.push(t)
      else m.set(key, [t])
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [matched])

  const shown = open ? (categories.find(([c]) => c === open)?.[1] ?? []) : []

  // Rendered lazily and cached per category: building 300 docs up front is work
  // nobody asked for, and only one category is ever on screen.
  const docs = useMemo(() => shown.map((t) => ({ t, doc: docOf(t) })), [shown])

  // One pass for the open category's classes, mirroring what the canvas does.
  const [utilCss, setUtilCss] = useState("")
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const tokens = new Set<string>()
    for (const { doc } of docs) {
      if (!doc) continue
      for (const n of Object.values(doc.nodes)) if (n.classes) tokens.add(n.classes)
    }
    generateUtilityCss(tokens).then((css) => !cancelled && setUtilCss(css))
    return () => {
      cancelled = true
    }
  }, [open, docs])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        setOpen(null)
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [open])

  return (
    <div ref={rootRef} className="relative flex h-full flex-col">
      <div className="p-3 pb-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${items.length} blocks…`}
          className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        {categories.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Nothing matches “{q}”.</p>
        )}
        {categories.map(([cat, list]) => (
          <button
            key={cat}
            type="button"
            onClick={() => setOpen((c) => (c === cat ? null : cat))}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-[13px] transition-colors",
              open === cat ? "bg-muted font-medium text-foreground" : "text-foreground hover:bg-muted/60"
            )}
          >
            <span className="min-w-0 flex-1 truncate">{prettyCategory(cat)}</span>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{list.length}</span>
            <ChevronRight
              className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open === cat && "rotate-90")}
            />
          </button>
        ))}
      </div>

      {open &&
        createPortal(
          <>
            {/* Scoped exactly like the canvas: the blocks' own .bg-primary etc. must
                not leak into the editor chrome, whose Tailwind uses the same names. */}
            <style>{THEME_CSS}</style>
            <style>{utilCss ? `@scope (.bapp-root) { ${utilCss} }` : ""}</style>
            <style>{ANIMATION_KEYFRAMES}</style>
            {/* Portalled and FIXED, not absolutely positioned inside the sidebar:
                the panel scrolls, so a child hanging off its right edge was simply
                clipped away and the flyout never appeared. */}
            <div
              ref={flyout}
              style={{ left: anchor.left, top: anchor.top, height: anchor.height }}
              className="fixed z-40 flex w-[38rem] flex-col border-l border-border bg-background shadow-xl"
            >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                {prettyCategory(open)}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground">
                  {shown.length} {shown.length === 1 ? "variation" : "variations"}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  aria-label="Close section previews"
                  className="flex size-5 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
              {docs.map(({ t, doc }, i) => (
                <button
                  key={`${t.category}:${t.name}:${i}`}
                  onPointerDown={(e) => onDragStart(t, e)}
                  title={`Drag ${t.name} onto the canvas`}
                  className="group flex cursor-grab flex-col gap-2 rounded-xl border border-border bg-background p-2 text-left transition-colors hover:border-ring active:cursor-grabbing"
                >
                  <span className="px-1 text-xs font-medium text-foreground">{t.name}</span>
                  {doc ? (
                    <Thumb doc={doc} />
                  ) : (
                    <span className="rounded-lg bg-muted px-3 py-6 text-center text-[11px] text-muted-foreground">
                      Preview unavailable
                    </span>
                  )}
                </button>
              ))}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}

/** "HyperUI · marketing/footers" → "Footers". The source and its folder path are
 *  provenance, not something to scan a list by. */
function prettyCategory(cat: string): string {
  const tail = cat.split("/").pop() ?? cat
  const clean = tail.replace(/^.*·\s*/, "").replace(/[-_]/g, " ").trim()
  return clean.replace(/\b\w/g, (c) => c.toUpperCase())
}
