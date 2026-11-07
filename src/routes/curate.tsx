import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  Search,
  Upload,
  X,
} from "lucide-react"

import {
  ANIMATION_KEYFRAMES,
  DEFAULT_BREAKPOINTS,
  generateUtilityCss,
  themeToCss,
  themeTokens,
} from "@brandsapp/builder-core"
import blocksData from "../lib/blocks-data.json"
import { landingCategoryRaw, landingIndex } from "../lib/landing-blocks"
import type { CuratedRef } from "../lib/curated"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Select } from "../components/ui/select"
import { cn } from "../lib/utils"

interface Block {
  category: string
  name: string
  html: string
}
/**
 * The blocks that ride along in this bundle. The other 2,212 are fetched.
 *
 * The screen used to be built on this constant alone, which meant curation
 * governed 304 of the library's 2,516 blocks and had no say over the landing
 * bands at all — an owner could rule on everything in front of them, export,
 * and find the panel unchanged for the overwhelming majority of what it shows.
 * A landing industry is loaded when it is selected, because 7.8MB is not a
 * thing to download before anybody has asked for it.
 */
const BUNDLED = blocksData as Block[]

const STORAGE_KEY = "bapp.curation.v1"
type Decision = "keep" | "drop"
type Selections = Record<string, Decision>
type ViewFilter = "all" | "kept" | "undecided" | "dropped"

// U+241F "SYMBOL FOR UNIT SEPARATOR" — safe join char, won't collide with real names.
const blockKey = (b: { category: string; name: string }) => `${b.category}␟${b.name}`

// A neutral default theme so daisyUI's CSS vars (bg-primary, btn-primary, …) have
// sane fallbacks even though these library blocks carry no doc theme of their own.
/**
 * With the standard breakpoints, so a block's responsive layer works.
 *
 * `themeTokens.parse({})` has an EMPTY breakpoint list, and a responsive
 * override whose breakpoint the document does not declare is dropped (it used
 * to be emitted bare, which put every block's phone layout on the desktop
 * preview). A block imported from real HTML carries its `@media` rules as
 * overrides on tablet/mobile/sm, so the preview has to know those widths.
 */
const DEFAULT_THEME = themeTokens.parse({ breakpoints: DEFAULT_BREAKPOINTS })
const THEME_CSS = themeToCss(DEFAULT_THEME, ".bapp-root")

// Every class token used across the loaded blocks, collected in one pass so
// generateUtilityCss (the exact mechanism canvas.tsx uses) runs once covering
// every card, instead of once per card.
const CLASS_ATTR_RE = /\bclass\s*=\s*"([^"]*)"/g
function extractClassTokens(html: string): string[] {
  const out: string[] = []
  CLASS_ATTR_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = CLASS_ATTR_RE.exec(html))) out.push(m[1])
  return out
}


function loadSelections(): Selections {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === "object" ? (parsed as Selections) : {}
  } catch {
    return {}
  }
}

/** Renders once its wrapper scrolls near the viewport; keeps a fixed-height
 *  placeholder beforehand so the grid never jumps (measured perf trade-off:
 *  304 simultaneous `.bapp-root` mounts was visibly janky on scroll, lazy
 *  mount-and-keep fixed it with no re-render cost once seen). */
function useInView<T extends Element>(rootMargin = "800px") {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (inView) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true)
      },
      { rootMargin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView, rootMargin])
  return { ref, inView }
}

const PREVIEW_W = 1280 // authoring width the block was designed at
const CARD_SCALE = 300 / PREVIEW_W // fixed card width (300px) ÷ authoring width
// The frame FITS the block instead of being uniform: a one-line announcement bar
// and a full hero are wildly different shapes, and a fixed frame rendered the
// short ones as a sliver marooned in white — useless for judging whether a block
// is any good. Cards therefore size to their content (clamped), giving a masonry
// grid where each thumbnail is mostly the block itself.
const MIN_H = 70 // keeps a one-line banner clickable
const MAX_H = 320 // long pages crop rather than dominate the grid
const FALLBACK_H = 180 // before measurement / while off-screen

function BlockThumb({ html }: { html: string }) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const inner = useRef<HTMLDivElement>(null)
  const [h, setH] = useState<number | null>(null)

  useEffect(() => {
    if (!inView) return
    const measure = () => {
      const natural = inner.current?.scrollHeight ?? 0
      if (natural > 0) setH(Math.min(MAX_H, Math.max(MIN_H, Math.round(natural * CARD_SCALE))))
    }
    measure()
    // Images and webfonts land after first paint and change the real height.
    const t = setTimeout(measure, 500)
    return () => clearTimeout(t)
  }, [inView, html])

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden bg-white transition-[height] duration-200"
      style={{ height: h ?? FALLBACK_H }}
    >
      {inView ? (
        <div
          ref={inner}
          className="bapp-root absolute top-0 left-0 origin-top-left"
          style={{ width: PREVIEW_W, transform: `scale(${CARD_SCALE})` }}
          // Trusted, local, build-time block markup — not user input.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-muted/50" />
      )}
    </div>
  )
}

function BlockCard({
  block,
  decision,
  onKeep,
  onDrop,
  onOpen,
}: {
  block: Block
  decision: Decision | undefined
  onKeep: () => void
  onDrop: () => void
  onOpen: () => void
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-background transition-colors",
        decision === "keep" && "border-primary ring-1 ring-primary/30",
        decision === "drop" && "border-border opacity-45 grayscale",
        !decision && "border-border hover:border-ring"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        title="Click to preview full size"
        className="block w-full shrink-0 border-b border-border text-left outline-none"
      >
        <BlockThumb html={block.html} />
      </button>
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-foreground">{block.name}</div>
          <div className="truncate text-[10.5px] text-muted-foreground">{block.category}</div>
        </div>
        <button
          type="button"
          onClick={onDrop}
          title="Drop"
          aria-pressed={decision === "drop"}
          className={cn(
            "flex size-6.5 shrink-0 items-center justify-center rounded-md border transition-colors",
            decision === "drop"
              ? "border-destructive bg-destructive/10 text-destructive"
              : "border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive"
          )}
        >
          <X className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onKeep}
          title="Keep"
          aria-pressed={decision === "keep"}
          className={cn(
            "flex size-6.5 shrink-0 items-center justify-center rounded-md border transition-colors",
            decision === "keep"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
          )}
        >
          <Check className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

/** Full-size lightbox for a close look before deciding — arrow keys move through
 *  the current filtered set, K/D decide, Escape closes. */
function Lightbox({
  blocks,
  index,
  decisionOf,
  onKeep,
  onDrop,
  onNavigate,
  onClose,
}: {
  blocks: Block[]
  index: number
  decisionOf: (b: Block) => Decision | undefined
  onKeep: (b: Block) => void
  onDrop: (b: Block) => void
  onNavigate: (index: number) => void
  onClose: () => void
}) {
  const block = blocks[index]
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowRight") onNavigate(Math.min(index + 1, blocks.length - 1))
      else if (e.key === "ArrowLeft") onNavigate(Math.max(index - 1, 0))
      else if (e.key.toLowerCase() === "k" && block) onKeep(block)
      else if (e.key.toLowerCase() === "d" && block) onDrop(block)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [index, blocks.length, block, onKeep, onDrop, onNavigate, onClose])

  // Deciding inside the lightbox can shrink the (filtered) list out from under the
  // current index — e.g. keeping the last "Undecided" item removes it from view.
  // Close rather than render blank when the index falls off the end.
  useEffect(() => {
    if (index >= blocks.length) onClose()
  }, [index, blocks.length, onClose])

  if (!block) return null
  const decision = decisionOf(block)
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-foreground/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="m-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">{block.name}</div>
            <div className="truncate text-xs text-muted-foreground">{block.category}</div>
          </div>
          <span className="mr-1 hidden text-[11px] text-muted-foreground sm:inline">
            ← → navigate · K keep · D drop · Esc close
          </span>
          <Button
            variant={decision === "drop" ? "destructive" : "outline"}
            size="sm"
            onClick={() => onDrop(block)}
          >
            <X className="size-3.5" />
            Drop
          </Button>
          <Button variant={decision === "keep" ? "default" : "outline"} size="sm" onClick={() => onKeep(block)}>
            <Check className="size-3.5" />
            Keep
          </Button>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button variant="ghost" size="iconSm" onClick={() => onNavigate(Math.max(index - 1, 0))} disabled={index === 0}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => onNavigate(Math.min(index + 1, blocks.length - 1))}
            disabled={index === blocks.length - 1}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="iconSm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-white">
          <div className="bapp-root" dangerouslySetInnerHTML={{ __html: block.html }} />
        </div>
      </div>
    </div>
  )
}

const VIEW_TABS: { id: ViewFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "kept", label: "Kept" },
  { id: "undecided", label: "Undecided" },
  { id: "dropped", label: "Dropped" },
]

export function CuratePage() {
  const [selections, setSelections] = useState<Selections>(() => loadSelections())
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selections))
    } catch {
      /* storage full / disabled — curation still works for this session */
    }
  }, [selections])

  /** Landing industries that have been fetched, keyed by slug. */
  const [loaded, setLoaded] = useState<Record<string, Block[]>>({})
  const [industries, setIndustries] = useState<
    Array<{ slug: string; label: string; count: number }>
  >([])
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // The index is 21 rows, so the categories can all be listed having fetched
  // almost nothing — the blocks themselves come one industry at a time.
  useEffect(() => {
    let cancelled = false
    landingIndex()
      .then((rows) => {
        if (!cancelled) setIndustries(rows.map((r) => ({ slug: r.slug, label: r.label, count: r.count })))
      })
      .catch(() => {
        // Not fatal: the bundled blocks are still curatable, and saying so is
        // better than an empty category list with no explanation.
        if (!cancelled) setLoadError("The landing library could not be reached; only the bundled blocks are shown.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const BLOCKS = useMemo(
    () => [...BUNDLED, ...Object.values(loaded).flat()],
    [loaded]
  )
  const ALL_CLASS_TOKENS = useMemo(
    () => BLOCKS.flatMap((b) => extractClassTokens(b.html)),
    [BLOCKS]
  )

  // Scoped utility CSS (Tailwind utilities + daisyUI component classes),
  // generated for the union of every LOADED block's classes — the same
  // generateUtilityCss the canvas uses, injected under `@scope (.bapp-root)`
  // so it cannot touch the chrome. Regenerated when an industry arrives,
  // because its bands bring class names the bundled set never used.
  const [utilCss, setUtilCss] = useState("")
  useEffect(() => {
    let cancelled = false
    generateUtilityCss(ALL_CLASS_TOKENS).then((css) => {
      if (!cancelled) setUtilCss(css)
    })
    return () => {
      cancelled = true
    }
  }, [ALL_CLASS_TOKENS])

  const [q, setQ] = useState("")
  const [category, setCategory] = useState("all")
  const [view, setView] = useState<ViewFilter>("all")
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const categories = useMemo(() => {
    const set = new Set(BUNDLED.map((b) => b.category))
    const bundled = [...set].sort().map((c) => ({ value: c, label: c }))
    // Prefixed, so choosing one is what triggers the fetch — and so an
    // industry nobody has opened still appears, with its real count.
    const landing = industries.map((i) => ({
      value: `landing:${i.slug}`,
      label: `${i.label} (${i.count})${loaded[i.slug] ? "" : " — not loaded"}`,
    }))
    return [
      { value: "all", label: `All loaded categories (${BLOCKS.length})` },
      ...bundled,
      ...landing,
    ]
  }, [industries, loaded, BLOCKS.length])

  /**
   * Choosing an industry fetches it, once.
   *
   * `landingCategoryRaw`, not `landingCategory`: this screen has to show what
   * curation has already dropped as well as what it kept, so it must see the
   * list before the filter, not after.
   */
  const chooseCategory = (value: string) => {
    setCategory(value)
    const slug = value.startsWith("landing:") ? value.slice("landing:".length) : null
    if (!slug || loaded[slug] || loadingSlug === slug) return
    setLoadingSlug(slug)
    setLoadError(null)
    landingCategoryRaw(slug)
      .then((rows) => setLoaded((prev) => ({ ...prev, [slug]: rows as Block[] })))
      .catch(() => setLoadError(`Could not load ${slug}. Try choosing it again.`))
      .finally(() => setLoadingSlug((cur) => (cur === slug ? null : cur)))
  }

  /** The category name the blocks themselves carry, for the chosen industry. */
  const categoryNames = useMemo(() => {
    if (category === "all") return null
    if (!category.startsWith("landing:")) return new Set([category])
    const slug = category.slice("landing:".length)
    return new Set((loaded[slug] ?? []).map((b) => b.category))
  }, [category, loaded])

  const decisionOf = useCallback((b: Block) => selections[blockKey(b)], [selections])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return BLOCKS.filter((b) => {
      if (categoryNames && !categoryNames.has(b.category)) return false
      if (query && !`${b.name} ${b.category}`.toLowerCase().includes(query)) return false
      const d = decisionOf(b)
      if (view === "kept") return d === "keep"
      if (view === "dropped") return d === "drop"
      if (view === "undecided") return !d
      return true
    })
  }, [q, categoryNames, view, decisionOf, BLOCKS])

  const keptCount = useMemo(() => BLOCKS.reduce((n, b) => n + (decisionOf(b) === "keep" ? 1 : 0), 0), [decisionOf, BLOCKS])
  const droppedCount = useMemo(() => BLOCKS.reduce((n, b) => n + (decisionOf(b) === "drop" ? 1 : 0), 0), [decisionOf, BLOCKS])
  const undecidedCount = BLOCKS.length - keptCount - droppedCount

  const setDecision = (b: Block, d: Decision | undefined) => {
    setSelections((prev) => {
      const key = blockKey(b)
      if (d === undefined) {
        if (!(key in prev)) return prev
        const next = { ...prev }
        delete next[key]
        return next
      }
      if (prev[key] === d) return prev
      return { ...prev, [key]: d }
    })
  }
  const toggleKeep = (b: Block) => setDecision(b, decisionOf(b) === "keep" ? undefined : "keep")
  const toggleDrop = (b: Block) => setDecision(b, decisionOf(b) === "drop" ? undefined : "drop")

  const bulkSet = (d: Decision) =>
    setSelections((prev) => {
      const next = { ...prev }
      for (const b of filtered) next[blockKey(b)] = d
      return next
    })
  const resetAll = () => {
    if (BLOCKS.length === 0 || window.confirm(`Reset all curation decisions? This clears keep/drop for all ${BLOCKS.length} blocks.`)) {
      setSelections({})
    }
  }

  /**
   * Only what is loaded can be exported, and that is the honest thing.
   *
   * A kept list is an allowlist, and `filterCurated` treats a category nobody
   * ruled on as a category to leave whole — so exporting after ruling on three
   * industries narrows those three and leaves the rest exactly as they are,
   * rather than deleting 2,000 bands the owner was never shown.
   */
  const doExport = () => {
    /**
     * Every kept key, including ones whose blocks are not loaded right now.
     *
     * `selections` is keyed by `category␟name` and survives an industry being
     * closed again (and a reload, via localStorage), so exporting from the
     * loaded blocks alone would quietly drop whatever was decided earlier in
     * the session about an industry no longer on screen.
     */
    const kept: CuratedRef[] = Object.entries(selections)
      .filter(([, d]) => d === "keep")
      .map(([key]) => {
        const [category = "", name = ""] = key.split("\u241f")
        return { category, name }
      })
      .filter((r) => r.category && r.name)
    const blob = new Blob([JSON.stringify(kept, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "curated.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const importRef = useRef<HTMLInputElement>(null)
  const doImport = (file: File) => {
    file
      .text()
      .then((text) => {
        const list = JSON.parse(text) as CuratedRef[]
        if (!Array.isArray(list)) throw new Error("not an array")
        /**
         * Keyed from the FILE, not from the loaded blocks.
         *
         * The library is fetched one industry at a time, so "mark every loaded
         * block the file mentions" would have silently thrown away every
         * decision about an industry nobody had opened yet — and then
         * re-exported the loss. A key needs only a category and a name, both
         * of which the file carries, so the block itself does not have to be
         * in memory for its decision to be remembered.
         */
        const next: Selections = {}
        for (const ref of list) next[blockKey(ref)] = "keep"
        setSelections(next)
      })
      .catch(() => window.alert("That file doesn't look like a valid curated.json export — expected an array of {category, name}."))
  }

  // "/" focuses search, unless a field already has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightboxIndex !== null) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (e.key === "/") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightboxIndex])

  return (
    <div className="curate">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-3">
        <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary">
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <div className="mx-1 h-5 w-px bg-border" />
        <h1 className="text-sm font-semibold text-foreground">Curate library blocks</h1>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {keptCount} kept of {BLOCKS.length} loaded
        </span>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={doExport}>
          <Download className="size-3.5" />
          Export curated.json
        </Button>
        <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
          <Upload className="size-3.5" />
          Import
        </Button>
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) doImport(file)
            e.target.value = ""
          }}
        />
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2.5">
        <div className="relative w-56">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or category…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Select
          value={category}
          onValueChange={chooseCategory}
          options={categories}
          placeholder="Category"
          className="w-64"
        />
        <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {VIEW_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                view === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              <span className="ml-1 text-muted-foreground">
                {t.id === "all" ? BLOCKS.length : t.id === "kept" ? keptCount : t.id === "dropped" ? droppedCount : undecidedCount}
              </span>
            </button>
          ))}
        </div>
        {loadingSlug && (
          <span className="text-xs text-muted-foreground">Loading {loadingSlug}…</span>
        )}
        {loadError && <span className="text-xs text-destructive">{loadError}</span>}
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
        <Button variant="outline" size="sm" onClick={() => bulkSet("keep")} disabled={filtered.length === 0}>
          <Check className="size-3.5" />
          Keep all shown
        </Button>
        <Button variant="outline" size="sm" onClick={() => bulkSet("drop")} disabled={filtered.length === 0}>
          <X className="size-3.5" />
          Drop all shown
        </Button>
        <Button variant="ghost" size="sm" onClick={resetAll}>
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      </div>

      {/* Scoped render environment — identical mechanism to lib/canvas.tsx: theme
          CSS vars + generated utility CSS, both confined to `.bapp-root` so they
          can never leak into (or clash with) this chrome's own Tailwind classes. */}
      <style>{THEME_CSS}</style>
      <style>{utilCss ? `@scope (.bapp-root) { ${utilCss} }` : ""}</style>
      <style>{ANIMATION_KEYFRAMES}</style>
      {/* Preview-only. Some blocks are pinned with `fixed`/`sticky` (bottom
          announcement bars, cookie strips). Out of normal flow they measure as
          zero height AND escape the card's clipped frame, so the card rendered
          blank. In a thumbnail we want them laid out inline like any other
          block — this does not affect the editor canvas or published output. */}
      <style>{".bapp-root .fixed,.bapp-root .sticky{position:static!important}"}</style>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No blocks match this filter.</div>
        ) : (
          // items-start so a short card keeps its own height instead of being
          // stretched to the tallest in its row (order stays row-major — CSS
          // columns would scramble reading order across 304 blocks).
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-start gap-3">
            {filtered.map((b, idx) => (
              <BlockCard
                key={blockKey(b)}
                block={b}
                decision={decisionOf(b)}
                onKeep={() => toggleKeep(b)}
                onDrop={() => toggleDrop(b)}
                onOpen={() => setLightboxIndex(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          blocks={filtered}
          index={lightboxIndex}
          decisionOf={decisionOf}
          onKeep={toggleKeep}
          onDrop={toggleDrop}
          onNavigate={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
