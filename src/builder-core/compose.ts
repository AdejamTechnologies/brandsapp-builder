/**
 * The COMPOSE engine — the second way to build a page, alongside `generate.ts`.
 *
 * The difference is where the decisions come from. `generate` runs a fixed plan
 * per industry: retail always gets nav → hero → logos → gallery → … in that
 * order. Reliable, and predictable to the point of being recognisable.
 *
 * This one is content-first. You hand it whatever you have — some features, a
 * couple of quotes, four photographs, a price list — and the engine decides what
 * bands the page should contain, which pattern each should take, and in what
 * order. Two brands with different content get structurally different pages
 * rather than the same skeleton with the words swapped.
 *
 * Three rules govern the arrangement, and they are what stop combinatorial
 * output from reading as noise:
 *
 *   ALTERNATION  a media-heavy band is never followed by another. The eye needs
 *                somewhere to rest, and back-to-back galleries read as a dump.
 *   VARIETY      the same pattern is never used twice in a row, and a pattern
 *                already used is deprioritised over one that has not been.
 *   RESTRAINT    exactly one saturated band per page, placed in the last third
 *                where it functions as an arrival rather than an interruption.
 *
 * Everything it emits is ordinary modules and theme tokens, so the output is a
 * normal editable document. Same content and seed in, same page out.
 */

import { buildDoc, el, type NodeSpec } from "./authoring"
import { iconSvg } from "./icons"
import { MOODS_SPEC, type Mood } from "./moods"
import { isDarkHex } from "./style"
import type { Doc } from "./schema"

// ── the content model ────────────────────────────────────────────────────────

export interface ComposeContent {
  brand: string
  tagline?: string
  intro?: string
  /** Short value propositions. Three or more invite a grid; one or two a row. */
  features?: Array<{ title: string; body: string; icon?: string }>
  /** Unsplash photo ids, already curated. Drives every media decision. */
  images?: string[]
  quotes?: Array<{ text: string; who: string }>
  stats?: Array<{ value: string; label: string }>
  prices?: Array<{ name: string; price: string; features: string[] }>
  faqs?: Array<{ q: string; a: string }>
  logos?: string[]
  /** What the primary action should say. */
  action?: string
  /**
   * Content the engine has never been taught.
   *
   * Everything above is a NAMED kind, which means adding one — a menu, a class
   * timetable, a list of stockists — meant writing a pattern for it. This is the
   * escape from that: hand over arbitrary groups of items and the engine picks a
   * layout from their SHAPE rather than their name. Four short items with images
   * is a grid whether they are products, staff or venues; one long item with an
   * image is a split; items carrying a number are a figure row.
   */
  groups?: ContentGroup[]
}

export interface ContentGroup {
  /** Shown as the band's heading. The only thing the engine cannot infer. */
  title?: string
  eyebrow?: string
  items: ContentItem[]
}

export interface ContentItem {
  title?: string
  body?: string
  /** An Unsplash id. Its presence is what makes the group visual. */
  image?: string
  /** A figure — turns the group into a stat row rather than a card grid. */
  value?: string
  meta?: string
}

/** Layouts an untyped group can take, chosen from the shape of its items. */
type GroupShape = "figures" | "media-grid" | "split" | "card-grid" | "list"

/**
 * Read the shape of a group. Deliberately based on countable, checkable facts —
 * how many items, do they carry images, do they carry numbers, how long is the
 * prose — rather than on anything the caller has to declare correctly.
 */
export function shapeOf(g: ContentGroup): GroupShape {
  const n = g.items.length
  const withImage = g.items.filter((i) => i.image).length
  const withValue = g.items.filter((i) => i.value).length
  // A figure is a number and a one-word label — nothing else. The moment an item
  // also carries prose it is a priced or specified ROW, which reads as a list:
  // "₦4,500 / Suya skewers / beef, yaji, red onion" is a menu, not a statistic.
  const figureLike = g.items.filter((i) => i.value && !i.body).length
  const longProse = g.items.some((i) => (i.body?.length ?? 0) > 160)

  if (n >= 3 && figureLike >= Math.ceil(n * 0.6)) return "figures"
  if (n === 1 && withImage === 1) return "split"
  if (withImage >= Math.ceil(n * 0.6)) return n >= 3 ? "media-grid" : "split"
  if (withValue >= Math.ceil(n * 0.6)) return "list"
  if (longProse && n <= 3) return "split"
  if (n >= 3) return "card-grid"
  return "list"
}

export interface ComposeInput {
  content: ComposeContent
  mood?: Mood
  seed?: number
  /** Cap the page length; the engine drops the weakest bands first. */
  maxBands?: number
}

/** Patterns the engine can reach for. Each declares what it needs to be usable. */
type Pattern =
  | "gallery-run"
  | "hero-full"
  | "hero-split"
  | "hero-centred"
  | "feature-grid"
  | "feature-rows"
  | "gallery-grid"
  | "gallery-wide"
  | "stat-band"
  | "quote-band"
  | "quote-columns"
  | "price-grid"
  | "faq-list"
  | "logo-row"
  | "cta-band"
  | "cta-split"

interface PatternSpec {
  /** Is there enough content for this to be worth a band? */
  usable: (c: ComposeContent) => boolean
  /** How much visual weight it carries — used for alternation. */
  media: "heavy" | "light" | "none"
  /** Higher sorts earlier; ties broken by the seed. */
  priority: number
  /**
   * Which field of the content this band SPENDS. Two bands drawing on the same
   * field would print the same three sentences twice — which is exactly what a
   * feature grid followed by feature rows did — so only the first is kept.
   */
  source?: keyof ComposeContent
  /** May this pattern take the page's one saturated surface? */
  canAccent?: boolean
}

const PATTERNS: Record<Pattern, PatternSpec> = {
  // A photograph at full bleed with the name over it. The most cinematic opening
  // available, and the one a page with strong imagery should usually take.
  "hero-full": { usable: (c) => !!c.images?.length, media: "heavy", priority: 101 },
  "hero-split": { usable: (c) => !!c.images?.length, media: "heavy", priority: 100 },
  "hero-centred": { usable: () => true, media: "none", priority: 99 },
  "logo-row": { usable: (c) => (c.logos?.length ?? 0) >= 3, media: "light", priority: 80, source: "logos" },
  "feature-grid": { usable: (c) => (c.features?.length ?? 0) >= 3, media: "light", priority: 70, source: "features" },
  "feature-rows": { usable: (c) => (c.features?.length ?? 0) >= 2 && !!c.images?.length, media: "heavy", priority: 68, source: "features" },
  "gallery-run": { usable: (c) => (c.images?.length ?? 0) >= 5, media: "heavy", priority: 61, source: "images" },
  "gallery-grid": { usable: (c) => (c.images?.length ?? 0) >= 4, media: "heavy", priority: 60, source: "images" },
  // No `source`: this band is PUNCTUATION, not a gallery. It reuses one
  // photograph as a full-bleed interval, so it does not spend the imagery a
  // grid or a set of rows still wants.
  "gallery-wide": { usable: (c) => (c.images?.length ?? 0) >= 1, media: "heavy", priority: 58 },
  "stat-band": { usable: (c) => (c.stats?.length ?? 0) >= 3, media: "none", priority: 55, canAccent: true, source: "stats" },
  "quote-band": { usable: (c) => (c.quotes?.length ?? 0) >= 1, media: "none", priority: 50, canAccent: true, source: "quotes" },
  "quote-columns": { usable: (c) => (c.quotes?.length ?? 0) >= 2, media: "light", priority: 48, source: "quotes" },
  "price-grid": { usable: (c) => (c.prices?.length ?? 0) >= 2, media: "none", priority: 45, canAccent: true, source: "prices" },
  "faq-list": { usable: (c) => (c.faqs?.length ?? 0) >= 2, media: "none", priority: 35, source: "faqs" },
  "cta-band": { usable: () => true, media: "none", priority: 20, canAccent: true },
  "cta-split": { usable: (c) => !!c.images?.length, media: "heavy", priority: 19, canAccent: true },
}

const rng = (seed: number) => {
  let s = seed >>> 0 || 1
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

// ── arrangement ──────────────────────────────────────────────────────────────

export interface ComposedPlan {
  /** `group` carries the index of the ComposeContent.groups entry it renders. */
  bands: Array<{ pattern: Pattern | "group"; accent: boolean; group?: number; shape?: GroupShape }>
  mood: Mood
}

/**
 * Decide the page's bands. Kept separate from rendering so the arrangement can be
 * inspected, tested and explained without building a document.
 */
export function planPage(input: ComposeInput): ComposedPlan {
  const c = input.content
  const mood: Mood = input.mood ?? "calm"
  const rand = rng(input.seed ?? 1)
  const max = input.maxBands ?? 9

  const available = (Object.keys(PATTERNS) as Pattern[]).filter((p) => PATTERNS[p].usable(c))

  // The hero is whichever hero the content supports, not a fixed choice. With
  // photography the full-bleed opening is the default and the split is the
  // variation; with none, the page opens typographically.
  const heroes: Pattern[] = available.includes("hero-full") ? ["hero-full", "hero-full", "hero-split", "hero-centred"] : ["hero-centred"]
  const hero: Pattern = heroes[Math.floor(rand() * heroes.length)]

  const pool = available.filter((p) => !p.startsWith("hero") && !p.startsWith("cta"))
  // Sort by priority with a seeded jitter, so two runs of the same content can
  // differ without the order becoming arbitrary.
  pool.sort((a, b) => PATTERNS[b].priority - PATTERNS[a].priority + (rand() - 0.5) * 12)

  const body: Pattern[] = []
  const spent = new Set<string>()
  let lastMedia: PatternSpec["media"] = "heavy" // the hero already spent the eye
  for (const p of pool) {
    if (body.length >= max - 3) break
    const spec = PATTERNS[p]
    // One band per content field: whichever pattern sorted highest gets it.
    if (spec.source) {
      if (spent.has(spec.source)) continue
      spent.add(spec.source)
    }
    // ALTERNATION: never two media-heavy bands in a row.
    if (spec.media === "heavy" && lastMedia === "heavy") continue
    // VARIETY: never the same pattern twice running.
    if (body[body.length - 1] === p) continue
    body.push(p)
    lastMedia = spec.media
  }

  const closer: Pattern = available.includes("cta-split") && lastMedia !== "heavy" && rand() > 0.6 ? "cta-split" : "cta-band"

  // Untyped groups are bands like any other. They interleave rather than being
  // appended, so a page built entirely from them still alternates properly.
  const groupBands = (c.groups ?? []).map((g, i) => ({ group: i, shape: shapeOf(g) }))
  const woven: Array<Pattern | { group: number; shape: GroupShape }> = []
  const heavyShape = (sh: GroupShape) => sh === "media-grid" || sh === "split"
  let media = lastMedia
  const named = [...body]
  while (named.length || groupBands.length) {
    const wantLight = media === "heavy"
    const gi = groupBands.findIndex((g) => (wantLight ? !heavyShape(g.shape) : true))
    const takeGroup = gi >= 0 && (named.length === 0 || rand() > 0.45)
    if (takeGroup) {
      const g = groupBands.splice(gi, 1)[0]
      woven.push(g)
      media = heavyShape(g.shape) ? "heavy" : "light"
    } else if (named.length) {
      const p = named.shift()!
      if (PATTERNS[p].media === "heavy" && media === "heavy") continue
      woven.push(p)
      media = PATTERNS[p].media
    } else {
      const g = groupBands.shift()!
      woven.push(g)
      media = heavyShape(g.shape) ? "heavy" : "light"
    }
  }
  const order: Array<Pattern | { group: number; shape: GroupShape }> = [hero, ...woven, closer]

  // RESTRAINT: one accent, in the last third, on a band that can carry it.
  const accentable = order
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => typeof p === "string" && PATTERNS[p].canAccent && i >= Math.floor(order.length * 0.6))
  const accentAt = accentable.length ? accentable[Math.floor(rand() * accentable.length)].i : order.length - 1

  return {
    bands: order.map((p, i) =>
      typeof p === "string"
        ? { pattern: p, accent: i === accentAt }
        : { pattern: "group" as const, accent: i === accentAt, group: p.group, shape: p.shape }
    ),
    mood,
  }
}

// ── rendering ────────────────────────────────────────────────────────────────

const box = (c: string, ...k: NodeSpec[]): NodeSpec => el("box", { classes: c }, ...k)
const h = (text: string, level: string, c: string): NodeSpec => el("heading", { props: { text, level }, classes: c })
const p = (text: string, c: string, tag = "p"): NodeSpec => el("text", { props: { text, tag }, classes: c })
const a = (text: string, c: string): NodeSpec => el("link", { props: { text, href: "#" }, classes: c })
// An unknown id must never render an empty box: fall back to a real glyph, so a
// typo in the content costs a wrong icon rather than a hole in the design.
const ico = (id: string, c: string): NodeSpec =>
  el("icon", { props: { svg: iconSvg(id) ?? iconSvg("star") ?? "" }, classes: c })
const shot = (id: string, c: string): NodeSpec =>
  el("image", { props: { src: `https://images.unsplash.com/photo-${id}?w=1400&h=1400&fit=crop&q=80&auto=format`, alt: "" }, classes: c })

export interface ComposedPage {
  doc: Doc
  plan: ComposedPlan
}

export function composePage(input: ComposeInput): ComposedPage {
  const c = input.content
  const plan = planPage(input)
  const m = MOODS_SPEC[plan.mood]
  const rand = rng((input.seed ?? 1) + 977)

  const pics = c.images ?? []
  const pic = (i: number) => pics[i % Math.max(1, pics.length)] ?? "1441984904996-e0b6ba687e04"

  // Rhythm is a pair, not a number: phones get the tight step and desktops open
  // out to roughly half again, which is where a page stops reading as a stack of
  // cards and starts reading as a designed sequence of rooms.
  const STEPS = [12, 14, 16, 20, 24, 28, 32, 36, 40]
  const nearest = (n: number) => STEPS.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a), STEPS[0])
  const shell = "mx-auto w-full max-w-7xl px-6 md:px-10"
  const reading = "mx-auto w-full max-w-3xl px-6"
  const pad = `py-${m.rhythm} md:py-${nearest(m.rhythm * 1.5)}`
  const ink = "text-base-content"
  const muted = "text-base-content/60"
  // A card has to read as raised. On a light page that means it stays white and
  // the page steps down; on a dark one it has to step UP, or the card is nothing
  // but a hairline rectangle — which is exactly how it looked before this.
  const dark = isDarkHex(m.colors["base-100"])
  const surface = `rounded-2xl border border-base-300 ${dark ? "bg-base-200" : "bg-base-100"}`
  const primaryBtn = "inline-flex h-12 items-center rounded-full bg-primary px-7 text-sm font-semibold text-primary-content no-underline"
  const ghostBtn = "inline-flex h-12 items-center rounded-full border border-base-300 px-7 text-sm font-medium text-base-content no-underline"
  const eyebrow = (t: string) => p(t, "text-xs font-semibold uppercase tracking-[0.16em] text-base-content/45", "span")
  // Over a photograph the same label at 45% disappears — and which photograph it
  // is cannot be known in advance, so type on media gets its own contrast.
  const eyebrowOnMedia = (t: string) => p(t, "text-xs font-semibold uppercase tracking-[0.16em] text-base-content/80", "span")
  // Display type is set once, here, so every band shares one voice. Tight tracking
  // and sub-1 leading are what separate a display size from merely-large body copy.
  const display = "font-display font-semibold tracking-[-0.02em] leading-[1.05]"
  const title = (t: string) => h(t, "2", `${display} text-4xl md:text-5xl ${ink}`)
  const action = c.action ?? "Get started"

  // Every band arrives on scroll. Doing it here rather than per-pattern is what
  // makes the whole page move as one thing: no band is silently static because
  // whoever wrote it forgot, and the effect is identical everywhere.
  const band = (accent: boolean, ...kids: NodeSpec[]): NodeSpec =>
    el(
      "section",
      { classes: `w-full ${pad} ${accent ? "bg-primary" : ""}` },
      el(
        "box",
        { classes: `${shell} flex flex-col gap-12 md:gap-16`, anim: { effect: "fade-up", trigger: "scroll", duration: 900 } },
        ...kids
      )
    )

  const onAccent = (accent: boolean) => (accent ? "text-primary-content" : ink)
  const onAccentMuted = (accent: boolean) => (accent ? "text-primary-content/75" : "text-base-content/60")

  // Column count from item count, so a grid never ends in a ragged half-row.
  const cols = (n: number) => (n <= 2 ? "md:grid-cols-2" : n % 3 === 0 ? "md:grid-cols-3" : n % 4 === 0 ? "sm:grid-cols-2 md:grid-cols-4" : "sm:grid-cols-2 md:grid-cols-3")

  const render: Record<Pattern, (accent: boolean, i: number) => NodeSpec> = {
    // A photograph at full bleed, the name over it, everything else out of the way.
    "hero-full": (_ac, i) =>
      el(
        "section",
        { classes: "relative flex min-h-[88vh] w-full items-end overflow-hidden" },
        el(
          "box",
          { classes: "absolute inset-0", anim: { effect: "fade", trigger: "load", duration: 1200, scroll: { parallax: -80, zoom: 0.08 } } },
          shot(pic(i), "h-full w-full object-cover")
        ),
        // Over the photograph, not instead of it: a slow field of colour that
        // keeps the hero alive while nothing else on it moves. This is also the
        // hook the WebGL upgrade attaches to.
        el("aurora", { props: { tone: "p", intensity: 42, speed: 22 } }),
        // …and, on a mood that wants it, an actual 3D field the camera moves
        // through as the page scrolls. It is the last thing on the page that can
        // fail: every device that cannot run it keeps the gradient underneath.
        ...(m.atmosphere ? [el("scene", { props: { preset: "field", tone: "p", intensity: 55, speed: 26 } })] : []),
        el("vignette", { props: { intensity: 55, edge: "bottom" } }),
        el("grain", { props: { intensity: 10 } }),
        // A scrim, not just a vignette: the copy has to hold against a photograph
        // nobody has seen yet, and a vignette alone cannot promise that.
        box("absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-base-100 via-base-100/75 to-transparent"),
        box(
          `relative z-10 ${shell} flex flex-col items-start gap-8 pb-20 md:pb-28`,
          el(
            "box",
            { classes: "flex flex-col items-start gap-6", anim: { effect: "fade-up", trigger: "load", duration: 900 } },
            eyebrowOnMedia(c.tagline ?? "Introducing"),
            h(c.brand, "1", `${display} max-w-4xl text-6xl md:text-8xl text-base-content`),
            p(c.intro ?? "", "max-w-xl text-lg leading-relaxed text-base-content/85")
          ),
          el(
            "box",
            { classes: "flex flex-wrap gap-3", anim: { effect: "fade-up", trigger: "load", delay: 220, duration: 900 } },
            a(action, primaryBtn),
            a("Learn more", ghostBtn)
          )
        )
      ),

    "hero-split": (_ac, i) =>
      el(
        "section",
        { classes: `relative w-full overflow-hidden ${pad} ${m.atmosphere ? "" : "bg-base-200"}` },
        ...(m.atmosphere
          ? [el("aurora", { props: { tone: "p", intensity: 45, speed: 26 } }), el("grain", { props: { intensity: 12 } })]
          : []),
        box(
          `relative z-10 ${shell} grid items-center gap-14 md:grid-cols-[1.1fr_1fr]`,
          el(
            "box",
            { classes: "flex flex-col items-start gap-7", anim: { effect: "fade-up", trigger: "load", duration: 800 } },
            eyebrow(c.tagline ?? "Introducing"),
            h(c.brand, "1", `${display} max-w-2xl text-5xl md:text-7xl ${ink}`),
            p(c.intro ?? "", `max-w-lg text-lg leading-relaxed ${muted}`),
            box("flex flex-wrap gap-3", a(action, primaryBtn), a("Learn more", ghostBtn))
          ),
          el(
            "box",
            { classes: `overflow-hidden ${surface} p-0`, anim: { effect: "fade", trigger: "load", delay: 150, scroll: { parallax: -40 } } },
            shot(pic(i), "aspect-[4/5] h-full w-full object-cover")
          )
        )
      ),

    "hero-centred": () =>
      el(
        "section",
        { classes: `relative flex min-h-[80vh] w-full items-center overflow-hidden ${pad} ${m.atmosphere ? "" : "bg-base-200"}` },
        ...(m.atmosphere ? [el("aurora", { props: { tone: "p", intensity: 50 } }), el("grain", { props: { intensity: 12 } })] : []),
        el(
          "box",
          { classes: "relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center gap-7 px-6 text-center", anim: { effect: "fade-up", trigger: "load", duration: 900 } },
          eyebrow(c.tagline ?? "Introducing"),
          h(c.brand, "1", `${display} text-6xl md:text-8xl ${ink}`),
          p(c.intro ?? "", `max-w-xl text-lg leading-relaxed ${muted}`),
          box("flex flex-wrap justify-center gap-3", a(action, primaryBtn), a("Learn more", ghostBtn))
        )
      ),

    // Deliberately the quietest band on the page: a border-to-border strip, half
    // the rhythm of everything else. A logo wall given a full band reads as filler.
    "logo-row": () =>
      el(
        "section",
        { classes: "w-full border-y border-base-300 py-10" },
        box(
          `${shell} flex flex-col items-center gap-6 md:flex-row md:justify-between`,
          eyebrow("Working with"),
          el(
            "box",
            { classes: "flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-70", anim: { effect: "fade", trigger: "scroll", scroll: { stagger: 90 } } },
            ...(c.logos ?? []).slice(0, 5).map((n) => p(n, `font-display text-xl font-semibold ${ink}`, "span"))
          )
        )
      ),

    "feature-grid": (ac) =>
      band(
        ac,
        box("flex flex-col gap-3", eyebrow("What you get"), title("Built around what matters")),
        el(
          "box",
          { classes: "grid gap-6 md:grid-cols-3", anim: { effect: "fade-up", trigger: "scroll", scroll: { stagger: 110 } } },
          ...(c.features ?? []).slice(0, 6).map((f) =>
            box(
              `flex flex-col gap-4 ${surface} p-8 md:p-10`,
              box("flex size-12 items-center justify-center rounded-2xl bg-primary/15", ico(f.icon ?? "flashlight", "inline-block w-6 h-6 text-primary")),
              h(f.title, "3", `${display} text-2xl ${ink}`),
              p(f.body, `text-base leading-relaxed ${muted}`)
            )
          )
        )
      ),

    "feature-rows": () =>
      band(
        false,
        // Alternating sides: a column of identical rows reads as a spreadsheet.
        ...(c.features ?? []).slice(0, 3).map((f, i) =>
          el(
            "box",
            { classes: "grid items-center gap-8 md:grid-cols-2", anim: { effect: "fade-up", trigger: "scroll", scroll: { parallax: i % 2 ? 20 : -20 } } },
            ...(i % 2
              ? [box(`overflow-hidden ${surface} p-0`, shot(pic(i + 1), "aspect-[4/3] w-full object-cover")),
                 box("flex flex-col gap-4", h(f.title, "3", `${display} text-3xl md:text-4xl ${ink}`), p(f.body, `max-w-md text-base leading-relaxed ${muted}`))]
              : [box("flex flex-col gap-4", h(f.title, "3", `${display} text-3xl md:text-4xl ${ink}`), p(f.body, `max-w-md text-base leading-relaxed ${muted}`)),
                 box(`overflow-hidden ${surface} p-0`, shot(pic(i + 1), "aspect-[4/3] w-full object-cover"))])
          )
        )
      ),

    // Five or more photographs read better as a run the reader travels along
    // than as a grid that scrolls past — and it is the one band where the page
    // stops moving down and starts moving sideways.
    "gallery-run": () =>
      el(
        "section",
        { classes: "w-full" },
        el(
          "horizontal",
          { props: { hold: Math.min(3, 1 + pics.length * 0.25), gap: "1.5rem" }, classes: "relative w-full" },
          box(
            "flex w-[24vw] shrink-0 flex-col justify-end gap-3 pr-6",
            eyebrow("Selected work"),
            h("A look at what we make", "2", `${display} text-4xl ${ink}`)
          ),
          ...pics.slice(0, 8).map((id, n) =>
            el(
              "box",
              { classes: "h-[52vh] w-[34vw] shrink-0 overflow-hidden rounded-2xl bg-base-200", anim: { effect: "fade", trigger: "load", scroll: { parallax: n % 2 ? 18 : -18 } } },
              shot(id, "h-full w-full object-cover")
            )
          )
        )
      ),

    "gallery-grid": () =>
      band(
        false,
        box("flex flex-col gap-3", eyebrow("Selected work"), title("A look at what we make")),
        el(
          "box",
          { classes: `grid grid-cols-2 items-start gap-4 ${cols(Math.min(pics.length, 8))}`, anim: { effect: "zoom", trigger: "scroll", scroll: { stagger: 80 } } },
          ...pics.slice(0, 8).map((id, n) =>
            el(
              "box",
              { classes: "overflow-hidden rounded-2xl bg-base-200", anim: { effect: "fade", trigger: "scroll", scroll: { parallax: [-30, 18, -14, 26][n % 4], rotate: n % 2 ? 1.2 : -1.2 } } },
              shot(id, "aspect-square w-full object-cover")
            )
          )
        )
      ),

    // The one place the page stops. The section pins for an extra viewport and the
    // photograph scrubs across the hold — motion the reader drives, rather than
    // motion that happens at them.
    "gallery-wide": (_ac, i) =>
      el(
        "section",
        { classes: "w-full" },
        el(
          "box",
          { classes: "relative h-screen w-full overflow-hidden", anim: { effect: "fade", trigger: "load", scroll: { pin: 1 } } },
          el(
            "box",
            { classes: "absolute inset-0", anim: { effect: "fade", trigger: "load", scroll: { zoom: 0.22, parallax: -70, driver: "pin" } } },
            shot(pic(i), "h-full w-full object-cover")
          ),
          el("vignette", { props: { intensity: 45, edge: "bottom" } })
        )
      ),

    // Figures are the one place a page can be genuinely large without shouting, so
    // they are set at display size and separated by a rule rather than boxed.
    "stat-band": (ac) =>
      el(
        "section",
        { classes: `w-full ${pad} ${ac ? "bg-primary" : ""}` },
        el(
          "box",
          { classes: `${shell} grid gap-10 border-t ${ac ? "border-primary-content/25" : "border-base-300"} pt-12 sm:grid-cols-3`, anim: { effect: "fade-up", trigger: "scroll", scroll: { stagger: 120 } } },
          ...(c.stats ?? []).slice(0, 3).map((s) =>
            box(
              "flex flex-col gap-2",
              p(s.value, `${display} text-6xl md:text-7xl ${onAccent(ac)}`, "span"),
              p(s.label, `text-xs uppercase tracking-[0.16em] ${ac ? "text-primary-content/70" : "text-base-content/50"}`, "span")
            )
          )
        )
      ),

    // The loudest sentence on the page, so it is set like one — on its own ground,
    // at display size, with nothing else in the band to share the attention.
    "quote-band": (ac) =>
      el(
        "section",
        { classes: `relative w-full overflow-hidden ${pad} ${ac ? "bg-primary" : "bg-base-200"}` },
        ...(m.atmosphere && !ac ? [el("aurora", { props: { tone: "s", intensity: 48, speed: 28 } }), el("grain", { props: { intensity: 8 } })] : []),
        el(
          "box",
          { classes: "relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-6 text-center", anim: { effect: "fade-up", trigger: "scroll", duration: 900 } },
          p(`“${c.quotes?.[0]?.text ?? ""}”`, `${display} text-3xl md:text-5xl ${onAccent(ac)}`),
          p(c.quotes?.[0]?.who ?? "", `text-xs uppercase tracking-[0.16em] ${onAccentMuted(ac)}`, "span")
        )
      ),

    "quote-columns": () =>
      band(
        false,
        box("flex flex-col gap-3", eyebrow("In their words"), title("What people say")),
        el(
          "box",
          { classes: "grid gap-6 md:grid-cols-2", anim: { effect: "fade-up", trigger: "scroll", scroll: { stagger: 120 } } },
          ...(c.quotes ?? []).slice(0, 4).map((q) =>
            box(`flex flex-col gap-5 ${surface} p-8 md:p-10`, p(`“${q.text}”`, `text-xl leading-relaxed ${ink}`), p(q.who, `text-sm ${muted}`, "span"))
          )
        )
      ),

    "price-grid": (ac) =>
      band(
        ac,
        box("flex flex-col gap-3", eyebrow("Pricing"), title("Simple, and the same for everyone")),
        box(
          "grid gap-6 md:grid-cols-3",
          ...(c.prices ?? []).slice(0, 3).map((pl, i) =>
            box(
              `flex flex-col gap-6 ${surface} p-8 md:p-10 ${i === 1 ? "ring-2 ring-primary" : ""}`,
              box("flex flex-col gap-2", p(pl.name, `text-xs uppercase tracking-[0.16em] ${muted}`, "span"),
                  p(pl.price, `${display} text-4xl md:text-5xl ${ink}`, "span")),
              box("flex flex-col gap-3", ...pl.features.slice(0, 4).map((f) =>
                box("flex items-center gap-3", ico("check", "inline-block w-4 h-4 shrink-0 text-primary"), p(f, `text-sm ${muted}`, "span")))),
              a(`Choose ${pl.name}`, i === 1 ? primaryBtn : ghostBtn)
            )
          )
        )
      ),

    "faq-list": () =>
      band(
        false,
        box("flex flex-col gap-3", eyebrow("Questions"), title("Before you ask")),
        el(
          "accordion",
          { classes: "flex w-full max-w-3xl flex-col gap-3" },
          ...(c.faqs ?? []).slice(0, 6).map((f) =>
            el("accordion-item", { props: { title: f.q }, classes: `${surface} px-6` }, p(f.a, `text-base leading-relaxed ${muted}`))
          )
        )
      ),

    "cta-band": (ac) =>
      el(
        "section",
        { classes: `w-full ${pad}` },
        box(
          `${shell} flex flex-col items-start gap-8 rounded-3xl ${ac ? "bg-primary" : "bg-base-200"} p-12 md:flex-row md:items-end md:justify-between md:p-20`,
          box("flex flex-col gap-4",
              h("Ready when you are", "2", `${display} text-4xl md:text-6xl ${onAccent(ac)}`),
              p(c.intro ?? "", `max-w-md text-base leading-relaxed ${onAccentMuted(ac)}`)),
          a(action, ac ? "inline-flex h-12 items-center rounded-full bg-base-100 px-7 text-sm font-semibold text-base-content no-underline" : primaryBtn)
        )
      ),

    "cta-split": (ac, i) =>
      el(
        "section",
        { classes: "w-full" },
        box(
          "grid w-full items-stretch md:grid-cols-2",
          box(`flex flex-col justify-center gap-6 px-10 py-24 md:px-20 ${ac ? "bg-primary" : "bg-base-200"}`,
              h("Ready when you are", "2", `${display} text-4xl md:text-6xl ${onAccent(ac)}`),
              p(c.intro ?? "", `max-w-sm text-base leading-relaxed ${onAccentMuted(ac)}`),
              box("flex", a(action, ac ? "inline-flex h-12 items-center rounded-full bg-base-100 px-7 text-sm font-semibold text-base-content no-underline" : primaryBtn))),
          el("box", { classes: "min-h-[22rem] overflow-hidden", anim: { effect: "fade", trigger: "scroll", scroll: { parallax: -30 } } },
             shot(pic(i + 2), "h-full w-full object-cover"))
        )
      ),
  }

  /**
   * Untyped groups. There is no per-kind renderer here on purpose — the layout
   * comes from `shapeOf`, so a menu, a class timetable and a list of stockists
   * all find a sensible band without the engine knowing any of those words.
   */
  const groupHead = (g: ContentGroup, ac: boolean): NodeSpec[] =>
    g.title || g.eyebrow
      ? [
          box(
            "flex flex-col gap-3",
            ...(g.eyebrow ? [p(g.eyebrow, `text-xs font-semibold uppercase tracking-[0.16em] ${ac ? "text-primary-content/70" : "text-base-content/45"}`, "span")] : []),
            ...(g.title ? [h(g.title, "2", `${display} text-4xl md:text-5xl ${onAccent(ac)}`)] : [])
          ),
        ]
      : []

  const renderGroup = (shape: GroupShape, g: ContentGroup, ac: boolean, i: number): NodeSpec => {
    const items = g.items.slice(0, 12)

    if (shape === "figures")
      return el(
        "section",
        { classes: `w-full ${pad}` },
        box(
          `${shell} flex flex-col gap-10`,
          ...groupHead(g, false),
          el(
            "box",
            { classes: `grid gap-px overflow-hidden rounded-3xl bg-base-300 ${cols(items.length)}`, anim: { effect: "fade-up", trigger: "scroll", scroll: { stagger: 90 } } },
            ...items.map((it) =>
              box(
                "flex flex-col items-center gap-1 bg-base-100 px-6 py-10 text-center",
                p(it.value ?? "", `${display} text-5xl md:text-6xl ${ink}`, "span"),
                p(it.title ?? it.body ?? "", "text-xs uppercase tracking-[0.16em] text-base-content/50", "span")
              )
            )
          )
        )
      )

    if (shape === "media-grid")
      return band(
        false,
        ...groupHead(g, false),
        el(
          "box",
          { classes: `grid items-start gap-6 ${cols(items.length)}`, anim: { effect: "fade-up", trigger: "scroll", scroll: { stagger: 90 } } },
          ...items.map((it, n) =>
            el(
              "box",
              {
                classes: `flex flex-col gap-4 overflow-hidden ${surface} p-0`,
                // Columns drift at different rates, so a row of cards reads as
                // depth rather than as one slab sliding past.
                anim: { effect: "fade", trigger: "scroll", scroll: { parallax: n % 2 ? 34 : -22 } },
              },
              shot(it.image ?? pic(i), "aspect-[4/3] w-full object-cover"),
              box(
                "flex flex-col gap-2 px-6 pb-6",
                ...(it.meta ? [p(it.meta, "text-xs uppercase tracking-[0.14em] text-base-content/45", "span")] : []),
                ...(it.title ? [h(it.title, "3", `${display} text-2xl ${ink}`)] : []),
                ...(it.body ? [p(it.body, `text-base leading-relaxed ${muted}`)] : [])
              )
            )
          )
        )
      )

    if (shape === "split") {
      const it = items[0] ?? {}
      const flip = i % 2 === 1
      const words = box(
        "flex flex-col items-start gap-4",
        ...(it.meta ? [p(it.meta, "text-xs uppercase tracking-[0.16em] text-base-content/45", "span")] : []),
        ...(g.title || it.title ? [h(it.title ?? g.title ?? "", "2", `${display} text-4xl md:text-5xl ${ink}`)] : []),
        ...(it.body ? [p(it.body, `max-w-lg text-lg leading-relaxed ${muted}`)] : []),
        ...items
          .slice(1)
          .map((rest) => box("flex flex-col gap-1", ...(rest.title ? [h(rest.title, "3", `font-display text-lg font-semibold ${ink}`)] : []), ...(rest.body ? [p(rest.body, `text-sm leading-relaxed ${muted}`)] : [])))
      )
      const media = el(
        "box",
        { classes: `overflow-hidden ${surface} p-0`, anim: { effect: "fade", trigger: "scroll", scroll: { parallax: flip ? 44 : -44 } } },
        shot(it.image ?? pic(i), "aspect-[4/3] h-full w-full object-cover")
      )
      return band(false, box("grid items-center gap-12 md:grid-cols-2", ...(flip ? [media, words] : [words, media])))
    }

    if (shape === "card-grid")
      return band(
        ac,
        ...groupHead(g, ac),
        el(
          "box",
          { classes: `grid gap-6 ${cols(items.length)}`, anim: { effect: "fade-up", trigger: "scroll", scroll: { stagger: 110 } } },
          ...items.map((it) =>
            box(
              `flex flex-col gap-3 ${surface} p-8 md:p-10`,
              ...(it.meta ? [p(it.meta, "text-xs uppercase tracking-[0.14em] text-base-content/45", "span")] : []),
              ...(it.title ? [h(it.title, "3", `${display} text-2xl ${ink}`)] : []),
              ...(it.body ? [p(it.body, `text-base leading-relaxed ${muted}`)] : [])
            )
          )
        )
      )

    // list — a reading column, with the label and the value on one line.
    return band(
      false,
      ...groupHead(g, false),
      el(
        "box",
        { classes: "flex w-full max-w-3xl flex-col", anim: { effect: "fade-up", trigger: "scroll", scroll: { stagger: 70 } } },
        ...items.map((it) =>
          box(
            "flex flex-col gap-1 border-b border-base-300 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8",
            box("flex flex-col gap-1", ...(it.title ? [h(it.title, "3", `${display} text-2xl ${ink}`)] : []), ...(it.body ? [p(it.body, `text-base leading-relaxed ${muted}`)] : [])),
            ...(it.value || it.meta ? [p(it.value ?? it.meta ?? "", `shrink-0 ${display} text-2xl ${ink}`, "span")] : [])
          )
        )
      )
    )
  }

  const nav = el(
    "navbar",
    { classes: "relative w-full border-b border-base-300 bg-base-100 px-6 py-5" },
    box(
      `${shell} flex items-center justify-between gap-6 px-0`,
      h(c.brand, "3", `font-display text-xl font-bold tracking-tight whitespace-nowrap ${ink}`),
      el(
        "nav-menu",
        {
          classes:
            "hidden absolute left-0 right-0 top-full z-40 flex-col items-stretch gap-1 border-t border-base-300 bg-base-100 p-4 shadow-lg " +
            "md:static md:z-auto md:flex md:flex-row md:items-center md:gap-7 md:border-0 md:bg-transparent md:p-0 md:shadow-none",
        },
        ...["Work", "About", "Pricing", "Contact"].map((t) => a(t, `text-sm ${muted} no-underline`))
      ),
      a(action, primaryBtn.replace("inline-flex", "hidden sm:inline-flex")),
      el("nav-toggle", { classes: "md:hidden inline-flex flex-col justify-center gap-[5px] w-10 h-10 px-[9px] cursor-pointer text-base-content" })
    )
  )

  const footer = el(
    "footer",
    { classes: `w-full border-t border-base-300 bg-base-100 px-6 ${pad}` },
    box(
      `${shell} flex flex-col gap-8 px-0`,
      box("flex flex-col gap-3", h(c.brand, "3", `font-display text-lg font-bold tracking-tight ${ink}`),
          p(c.intro ?? "", `max-w-xs text-sm leading-relaxed ${muted}`)),
      box("flex flex-col gap-4 border-t border-base-300 pt-6 sm:flex-row sm:items-center sm:justify-between",
          p(`© 2026 ${c.brand}. All rights reserved.`, "text-sm text-base-content/50", "span"),
          box("flex items-center gap-5", a("Terms", `text-sm ${muted} no-underline`), a("Privacy", `text-sm ${muted} no-underline`)))
    )
  )

  void rand()

  const doc = buildDoc(
    box(`font-body ${ink} bg-base-100 antialiased min-h-screen`, nav, ...plan.bands.map((b, i) =>
        b.pattern === "group"
          ? renderGroup(b.shape ?? "card-grid", (c.groups ?? [])[b.group ?? 0] ?? { items: [] }, b.accent, i)
          : render[b.pattern](b.accent, i)
      ), footer),
    {
      theme: {
        colors: m.colors,
        fonts: m.fonts,
        radius: {},
        scale: m.scale,
        breakpoints: [
          { id: "tablet", label: "Tablet", maxWidth: 1023 },
          { id: "mobile", label: "Mobile", maxWidth: 767 },
        ],
      },
      meta: { title: c.brand, description: c.intro },
    }
  )

  return { doc: doc as Doc, plan }
}
