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
  /** May this pattern take the page's one saturated surface? */
  canAccent?: boolean
}

const PATTERNS: Record<Pattern, PatternSpec> = {
  "hero-split": { usable: (c) => !!c.images?.length, media: "heavy", priority: 100 },
  "hero-centred": { usable: () => true, media: "none", priority: 99 },
  "logo-row": { usable: (c) => (c.logos?.length ?? 0) >= 3, media: "light", priority: 80 },
  "feature-grid": { usable: (c) => (c.features?.length ?? 0) >= 3, media: "light", priority: 70 },
  "feature-rows": { usable: (c) => (c.features?.length ?? 0) >= 2 && !!c.images?.length, media: "heavy", priority: 68 },
  "gallery-grid": { usable: (c) => (c.images?.length ?? 0) >= 4, media: "heavy", priority: 60 },
  "gallery-wide": { usable: (c) => (c.images?.length ?? 0) >= 1, media: "heavy", priority: 58 },
  "stat-band": { usable: (c) => (c.stats?.length ?? 0) >= 3, media: "none", priority: 55, canAccent: true },
  "quote-band": { usable: (c) => (c.quotes?.length ?? 0) >= 1, media: "none", priority: 50, canAccent: true },
  "quote-columns": { usable: (c) => (c.quotes?.length ?? 0) >= 2, media: "light", priority: 48 },
  "price-grid": { usable: (c) => (c.prices?.length ?? 0) >= 2, media: "none", priority: 45, canAccent: true },
  "faq-list": { usable: (c) => (c.faqs?.length ?? 0) >= 2, media: "none", priority: 35 },
  "cta-band": { usable: () => true, media: "none", priority: 20, canAccent: true },
  "cta-split": { usable: (c) => !!c.images?.length, media: "heavy", priority: 19, canAccent: true },
}

const rng = (seed: number) => {
  let s = seed >>> 0 || 1
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

// ── arrangement ──────────────────────────────────────────────────────────────

export interface ComposedPlan {
  bands: Array<{ pattern: Pattern; accent: boolean }>
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

  // The hero is whichever hero the content supports, not a fixed choice.
  const hero: Pattern = available.includes("hero-split") && rand() > 0.35 ? "hero-split" : "hero-centred"

  const pool = available.filter((p) => !p.startsWith("hero") && !p.startsWith("cta"))
  // Sort by priority with a seeded jitter, so two runs of the same content can
  // differ without the order becoming arbitrary.
  pool.sort((a, b) => PATTERNS[b].priority - PATTERNS[a].priority + (rand() - 0.5) * 12)

  const body: Pattern[] = []
  let lastMedia: PatternSpec["media"] = "heavy" // the hero already spent the eye
  for (const p of pool) {
    if (body.length >= max - 3) break
    const spec = PATTERNS[p]
    // ALTERNATION: never two media-heavy bands in a row.
    if (spec.media === "heavy" && lastMedia === "heavy") continue
    // VARIETY: never the same pattern twice running.
    if (body[body.length - 1] === p) continue
    body.push(p)
    lastMedia = spec.media
  }

  const closer: Pattern = available.includes("cta-split") && lastMedia !== "heavy" && rand() > 0.6 ? "cta-split" : "cta-band"
  const order: Pattern[] = [hero, ...body, closer]

  // RESTRAINT: one accent, in the last third, on a band that can carry it.
  const accentable = order.map((p, i) => ({ p, i })).filter(({ p, i }) => PATTERNS[p].canAccent && i >= Math.floor(order.length * 0.6))
  const accentAt = accentable.length ? accentable[Math.floor(rand() * accentable.length)].i : order.length - 1

  return { bands: order.map((p, i) => ({ pattern: p, accent: i === accentAt })), mood }
}

// ── rendering ────────────────────────────────────────────────────────────────

const box = (c: string, ...k: NodeSpec[]): NodeSpec => el("box", { classes: c }, ...k)
const h = (text: string, level: string, c: string): NodeSpec => el("heading", { props: { text, level }, classes: c })
const p = (text: string, c: string, tag = "p"): NodeSpec => el("text", { props: { text, tag }, classes: c })
const a = (text: string, c: string): NodeSpec => el("link", { props: { text, href: "#" }, classes: c })
const ico = (id: string, c: string): NodeSpec => el("icon", { props: { svg: iconSvg(id) ?? "" }, classes: c })
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

  const shell = "mx-auto w-full max-w-6xl px-6"
  const pad = `py-${m.rhythm}`
  const heroPad = `py-${Math.min(32, m.rhythm * 2)}`
  const ink = "text-base-content"
  const muted = "text-base-content/60"
  const surface = "rounded-2xl border border-base-300 bg-base-100"
  const primaryBtn = "inline-flex h-12 items-center rounded-full bg-primary px-7 text-sm font-semibold text-primary-content no-underline"
  const ghostBtn = "inline-flex h-12 items-center rounded-full border border-base-300 px-7 text-sm font-medium text-base-content no-underline"
  const eyebrow = (t: string) => p(t, "text-xs font-semibold uppercase tracking-[0.16em] text-base-content/45", "span")
  const title = (t: string) => h(t, "2", `font-display text-3xl md:text-4xl font-semibold tracking-tight ${ink}`)
  const action = c.action ?? "Get started"

  const band = (accent: boolean, ...kids: NodeSpec[]): NodeSpec =>
    el("section", { classes: `w-full px-6 ${pad} ${accent ? "bg-primary" : ""}` }, box(`${shell} flex flex-col gap-10`, ...kids))

  const onAccent = (accent: boolean) => (accent ? "text-primary-content" : ink)
  const onAccentMuted = (accent: boolean) => (accent ? "text-primary-content/75" : "text-base-content/60")

  const render: Record<Pattern, (accent: boolean, i: number) => NodeSpec> = {
    "hero-split": (_ac, i) =>
      el(
        "section",
        { classes: `relative w-full overflow-hidden px-6 ${heroPad} ${m.atmosphere ? "" : "bg-base-200"}` },
        ...(m.atmosphere
          ? [el("aurora", { props: { tone: "p", intensity: 45, speed: 26 } }), el("grain", { props: { intensity: 12 } })]
          : []),
        box(
          `relative z-10 ${shell} grid items-center gap-12 md:grid-cols-2`,
          el(
            "box",
            { classes: "flex flex-col items-start gap-6", anim: { effect: "fade-up", trigger: "load", duration: 800 } },
            eyebrow(c.tagline ?? "Introducing"),
            h(c.brand, "1", `max-w-2xl font-display text-5xl md:text-6xl font-semibold leading-[1.02] tracking-tight ${ink}`),
            p(c.intro ?? "", `max-w-lg text-base leading-relaxed ${muted}`),
            box("flex flex-wrap gap-3", a(action, primaryBtn), a("Learn more", ghostBtn))
          ),
          el(
            "box",
            { classes: `overflow-hidden ${surface} p-0`, anim: { effect: "fade", trigger: "load", delay: 150, scroll: { parallax: -40 } } },
            shot(pic(i), "h-full w-full object-cover")
          )
        )
      ),

    "hero-centred": () =>
      el(
        "section",
        { classes: `relative w-full overflow-hidden px-6 ${heroPad} ${m.atmosphere ? "" : "bg-base-200"}` },
        ...(m.atmosphere ? [el("aurora", { props: { tone: "p", intensity: 50 } }), el("grain", { props: { intensity: 12 } })] : []),
        box(
          "relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center",
          eyebrow(c.tagline ?? "Introducing"),
          h(c.brand, "1", `font-display text-5xl md:text-6xl font-semibold leading-[1.02] tracking-tight ${ink}`),
          p(c.intro ?? "", `max-w-xl text-base leading-relaxed ${muted}`),
          box("flex flex-wrap justify-center gap-3", a(action, primaryBtn), a("Learn more", ghostBtn))
        )
      ),

    "logo-row": () =>
      band(
        false,
        box(
          "flex flex-col items-center gap-6",
          eyebrow("Working with"),
          el(
            "box",
            { classes: "grid w-full grid-cols-2 gap-6 opacity-60 sm:grid-cols-4", anim: { effect: "fade", trigger: "scroll", scroll: { stagger: 90 } } },
            ...(c.logos ?? []).slice(0, 4).map((n) => p(n, `text-center font-display text-lg font-semibold ${ink}`, "span"))
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
              `flex flex-col gap-3 ${surface} p-7`,
              box("flex size-10 items-center justify-center rounded-xl bg-primary/10", ico(f.icon ?? "flashlight", "inline-block w-5 h-5 text-primary")),
              h(f.title, "3", `font-display text-lg font-semibold ${ink}`),
              p(f.body, `text-sm leading-relaxed ${muted}`)
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
                 box("flex flex-col gap-3", h(f.title, "3", `font-display text-2xl font-semibold ${ink}`), p(f.body, `text-sm leading-relaxed ${muted}`))]
              : [box("flex flex-col gap-3", h(f.title, "3", `font-display text-2xl font-semibold ${ink}`), p(f.body, `text-sm leading-relaxed ${muted}`)),
                 box(`overflow-hidden ${surface} p-0`, shot(pic(i + 1), "aspect-[4/3] w-full object-cover"))])
          )
        )
      ),

    "gallery-grid": () =>
      band(
        false,
        box("flex flex-col gap-3", eyebrow("Selected work"), title("A look at what we make")),
        el(
          "box",
          { classes: "grid grid-cols-2 gap-4 md:grid-cols-4", anim: { effect: "zoom", trigger: "scroll", scroll: { stagger: 80 } } },
          ...pics.slice(0, 8).map((id) => box("overflow-hidden rounded-2xl bg-base-200", shot(id, "aspect-square w-full object-cover")))
        )
      ),

    "gallery-wide": (_ac, i) =>
      el(
        "section",
        { classes: "w-full" },
        el(
          "box",
          { classes: "relative h-[60vh] w-full overflow-hidden", anim: { effect: "fade", trigger: "scroll", scroll: { zoom: 0.12 } } },
          shot(pic(i), "h-full w-full object-cover"),
          el("vignette", { props: { intensity: 45, edge: "bottom" } })
        )
      ),

    "stat-band": (ac) =>
      el(
        "section",
        { classes: `w-full px-6 ${pad}` },
        box(
          `${shell} grid gap-px overflow-hidden rounded-3xl ${ac ? "bg-primary" : "bg-base-300"} sm:grid-cols-3`,
          ...(c.stats ?? []).slice(0, 3).map((s) =>
            box(
              `flex flex-col items-center gap-1 px-6 py-10 ${ac ? "bg-primary" : "bg-base-100"}`,
              p(s.value, `font-display text-4xl font-bold ${onAccent(ac)}`, "span"),
              p(s.label, `text-xs uppercase tracking-[0.16em] ${ac ? "text-primary-content/70" : "text-base-content/50"}`, "span")
            )
          )
        )
      ),

    "quote-band": (ac) =>
      el(
        "section",
        { classes: `w-full px-6 ${pad}` },
        box(
          `${shell} flex flex-col items-center gap-6 rounded-3xl ${ac ? "bg-primary" : "bg-base-200"} p-12 text-center md:p-16`,
          p(`“${c.quotes?.[0]?.text ?? ""}”`, `max-w-2xl font-display text-2xl leading-snug md:text-3xl ${onAccent(ac)}`),
          p(c.quotes?.[0]?.who ?? "", `text-sm ${onAccentMuted(ac)}`, "span")
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
            box(`flex flex-col gap-4 ${surface} p-7`, p(`“${q.text}”`, `text-base leading-relaxed ${ink}`), p(q.who, `text-sm ${muted}`, "span"))
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
              `flex flex-col gap-5 ${surface} p-7 ${i === 1 ? "ring-2 ring-primary" : ""}`,
              box("flex flex-col gap-1", p(pl.name, `text-sm font-medium ${muted}`, "span"),
                  p(pl.price, `font-display text-3xl font-bold ${ink}`, "span")),
              box("flex flex-col gap-2", ...pl.features.slice(0, 4).map((f) =>
                box("flex items-center gap-2", ico("check", "inline-block w-4 h-4 shrink-0 text-primary"), p(f, `text-sm ${muted}`, "span")))),
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
          { classes: "flex flex-col gap-2 p-2" },
          ...(c.faqs ?? []).slice(0, 6).map((f) =>
            el("accordion-item", { props: { title: f.q }, classes: `${surface} px-5` }, p(f.a, `text-sm leading-relaxed ${muted}`))
          )
        )
      ),

    "cta-band": (ac) =>
      el(
        "section",
        { classes: `w-full px-6 ${pad}` },
        box(
          `${shell} flex flex-col items-start gap-6 rounded-3xl ${ac ? "bg-primary" : "bg-base-200"} p-12 md:flex-row md:items-center md:justify-between md:p-16`,
          box("flex flex-col gap-3",
              h("Ready when you are", "2", `font-display text-3xl font-semibold tracking-tight ${onAccent(ac)}`),
              p(c.intro ?? "", `max-w-md text-sm leading-relaxed ${onAccentMuted(ac)}`)),
          a(action, ac ? "inline-flex h-12 items-center rounded-full bg-base-100 px-7 text-sm font-semibold text-base-content no-underline" : primaryBtn)
        )
      ),

    "cta-split": (ac, i) =>
      el(
        "section",
        { classes: "w-full" },
        box(
          "grid w-full items-stretch md:grid-cols-2",
          box(`flex flex-col justify-center gap-5 px-10 py-20 md:px-16 ${ac ? "bg-primary" : "bg-base-200"}`,
              h("Ready when you are", "2", `font-display text-3xl font-semibold tracking-tight ${onAccent(ac)}`),
              p(c.intro ?? "", `max-w-sm text-sm leading-relaxed ${onAccentMuted(ac)}`),
              box("flex", a(action, ac ? "inline-flex h-12 items-center rounded-full bg-base-100 px-7 text-sm font-semibold text-base-content no-underline" : primaryBtn))),
          el("box", { classes: "min-h-[22rem] overflow-hidden", anim: { effect: "fade", trigger: "scroll", scroll: { parallax: -30 } } },
             shot(pic(i + 2), "h-full w-full object-cover"))
        )
      ),
  }

  const nav = el(
    "navbar",
    { classes: "relative w-full border-b border-base-300 bg-base-100 px-6 py-5" },
    box(
      `${shell} flex items-center justify-between gap-6 px-0`,
      h(c.brand, "3", `font-display text-xl font-bold tracking-tight ${ink}`),
      el(
        "nav-menu",
        {
          classes:
            "hidden absolute left-0 right-0 top-full z-40 flex-col items-stretch gap-1 border-t border-base-300 bg-base-100 p-4 shadow-lg " +
            "md:static md:z-auto md:flex md:flex-row md:items-center md:gap-7 md:border-0 md:bg-transparent md:p-0 md:shadow-none",
        },
        ...["Work", "About", "Pricing", "Contact"].map((t) => a(t, `text-sm ${muted} no-underline`))
      ),
      a(action, primaryBtn),
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
    box(`font-body ${ink} bg-base-100 antialiased min-h-screen`, nav, ...plan.bands.map((b, i) => render[b.pattern](b.accent, i)), footer),
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
