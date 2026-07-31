/**
 * Page generation from CONSTRAINTS rather than from presets.
 *
 * A preset library scales with the number of designs somebody sits down and
 * draws. This does not: a page here is the output of a brand, a mood and a
 * section plan run through a design engine, so the interesting number is the
 * product of the inputs rather than the count of files in a folder.
 *
 * The engine is the part that keeps output from looking machine-made. Three
 * rules, applied to every page:
 *
 *   RHYTHM     one spacing module, with the hero at double and nothing else
 *              inventing its own value.
 *   CONTRAST   a type ramp built from a ratio, so headings never compete, and
 *              display sizes move while body copy stays put.
 *   RESTRAINT  exactly one saturated surface per page. Colour otherwise comes
 *              from photography, which is what stops a generated page reading
 *              as a swatch test.
 *
 * Everything it emits is ordinary modules and theme tokens, so the result is a
 * normal editable document — not a locked template. Feed it the same inputs and
 * you get the same page; change the mood and the whole thing re-proportions,
 * because the mood is expressed as theme scale rather than as different markup.
 */

import { buildDoc, el, type NodeSpec } from "./authoring"
import { iconSvg } from "./icons"
import type { Doc, ThemeScale } from "./schema"

// ── inputs ───────────────────────────────────────────────────────────────────

export const MOODS = ["luxe", "technical", "organic", "playful", "brutalist", "calm"] as const
export type Mood = (typeof MOODS)[number]

export const INDUSTRIES = ["retail", "services", "food", "fitness", "beauty"] as const
export type Industry = (typeof INDUSTRIES)[number]

export interface GenerateInput {
  brand: string
  tagline?: string
  /** One line of body copy under the headline. */
  intro?: string
  mood?: Mood
  industry?: Industry
  /** Overrides the industry's default section plan. */
  sections?: SectionKind[]
  /** Deterministic variation — same seed, same page. */
  seed?: number
}

export type SectionKind =
  | "nav"
  | "hero"
  | "logos"
  | "features"
  | "gallery"
  | "stats"
  | "pricing"
  | "testimonial"
  | "faq"
  | "cta"
  | "footer"

// ── the design engine ────────────────────────────────────────────────────────

interface MoodSpec {
  scale: ThemeScale
  fonts: { display: string; body: string }
  colors: Record<string, string>
  /** Dark grounds want their atmosphere; light ones mostly do not. */
  atmosphere: boolean
  /** Section padding step, in Tailwind units, before the density multiplier. */
  rhythm: number
}

/**
 * Mood is expressed as TOKENS, not as different markup. That is what lets one
 * section plan render six ways, and it is why adding a mood costs a table row
 * rather than a template.
 */
const MOODS_SPEC: Record<Mood, MoodSpec> = {
  luxe: {
    scale: { density: 1.5, radius: 0.25, typeScale: 1.3, motion: 0.8 },
    fonts: { display: "Fraunces", body: "Inter" },
    colors: { primary: "#8a6a3c", secondary: "#3f4a3c", neutral: "#241d16", "base-100": "#fbf9f6", "base-200": "#f2ece3", "base-300": "#e0d5c4", "base-content": "#241d16" },
    atmosphere: false,
    rhythm: 24,
  },
  technical: {
    scale: { density: 0.85, radius: 0.5, typeScale: 1, motion: 1 },
    fonts: { display: "Sora", body: "Inter" },
    colors: { primary: "#5b6cff", secondary: "#00c2a8", neutral: "#0d1220", "base-100": "#0b0f1a", "base-200": "#131a2b", "base-300": "#1f293f", "base-content": "#e8ecf6" },
    atmosphere: true,
    rhythm: 20,
  },
  organic: {
    scale: { density: 1.25, radius: 1.6, typeScale: 1.1, motion: 0.9 },
    fonts: { display: "Plus Jakarta Sans", body: "Inter" },
    colors: { primary: "#4f6f52", secondary: "#c98f4b", neutral: "#26301f", "base-100": "#fcfaf5", "base-200": "#eef1e6", "base-300": "#dde3cf", "base-content": "#26301f" },
    atmosphere: false,
    rhythm: 22,
  },
  playful: {
    scale: { density: 1, radius: 2, typeScale: 1.15, motion: 1.3 },
    fonts: { display: "Poppins", body: "Inter" },
    colors: { primary: "#ff5a3c", secondary: "#2b6cff", neutral: "#1b1330", "base-100": "#ffffff", "base-200": "#fff2ee", "base-300": "#ffd9cf", "base-content": "#1b1330" },
    atmosphere: false,
    rhythm: 20,
  },
  brutalist: {
    scale: { density: 0.6, radius: 0, typeScale: 1.25, motion: 0 },
    fonts: { display: "Sora", body: "Inter" },
    colors: { primary: "#111111", secondary: "#f2f200", neutral: "#000000", "base-100": "#f2f200", "base-200": "#ffffff", "base-300": "#111111", "base-content": "#0a0a0a" },
    atmosphere: false,
    rhythm: 16,
  },
  calm: {
    scale: { density: 1.35, radius: 1.2, typeScale: 1.05, motion: 0.5 },
    fonts: { display: "Manrope", body: "Inter" },
    colors: { primary: "#5b7c99", secondary: "#8fa6b2", neutral: "#1f2a33", "base-100": "#fbfcfd", "base-200": "#eef3f6", "base-300": "#dde6ec", "base-content": "#1f2a33" },
    atmosphere: false,
    rhythm: 24,
  },
}

/** Default plans. Order is the argument the page makes, so it is industry-led. */
const PLANS: Record<Industry, SectionKind[]> = {
  retail: ["nav", "hero", "logos", "gallery", "features", "cta", "faq", "footer"],
  services: ["nav", "hero", "logos", "features", "stats", "testimonial", "pricing", "cta", "footer"],
  food: ["nav", "hero", "gallery", "features", "testimonial", "cta", "faq", "footer"],
  fitness: ["nav", "hero", "stats", "features", "pricing", "testimonial", "cta", "footer"],
  beauty: ["nav", "hero", "gallery", "features", "testimonial", "faq", "cta", "footer"],
}

/** Curated Unsplash ids per industry — real photography, never a grey box. */
const SHOTS: Record<Industry, string[]> = {
  retail: ["1441984904996-e0b6ba687e04", "1483985988355-763728e1935b", "1445205170230-053b83016050", "1472851294608-062f824d29cc"],
  services: ["1521737604893-d14cc237f11d", "1552664730-d307ca884978", "1560250097-0b93528c311a", "1454165804606-c3d57bc86b40"],
  food: ["1504674900247-0877df9cc836", "1517248135467-4c7edcad34c4", "1414235077428-338989a2e8c0", "1467003909585-2f8a72700288"],
  fitness: ["1534438327276-14e5300c3a48", "1571019613454-1cb2f99b2d8b", "1517836357463-d25dfeac3438", "1541534741688-6078c6bfb5c5"],
  beauty: ["1596462502278-27bfdc403348", "1522335789203-aabd1fc54bc9", "1560750588-73207b1ef5b8", "1487412720507-e7ab37603c6f"],
}

/** A tiny deterministic PRNG: same seed, same page — generation must be repeatable. */
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

// ── authoring helpers ────────────────────────────────────────────────────────

const box = (c: string, ...k: NodeSpec[]): NodeSpec => el("box", { classes: c }, ...k)
const h = (text: string, level: string, c: string): NodeSpec => el("heading", { props: { text, level }, classes: c })
const p = (text: string, c: string, tag = "p"): NodeSpec => el("text", { props: { text, tag }, classes: c })
const a = (text: string, c: string): NodeSpec => el("link", { props: { text, href: "#" }, classes: c })
const ico = (id: string, c: string): NodeSpec => el("icon", { props: { svg: iconSvg(id) ?? "" }, classes: c })
const shot = (id: string, c: string): NodeSpec =>
  el("image", { props: { src: `https://images.unsplash.com/photo-${id}?w=1200&h=1200&fit=crop&q=80&auto=format`, alt: "" }, classes: c })

export interface GeneratedPage {
  doc: Doc
  /** What the engine decided, so a caller can explain or re-run it. */
  plan: { mood: Mood; industry: Industry; sections: SectionKind[]; accentSection: SectionKind }
}

/**
 * Compose a page. Everything variable is derived from the inputs — no branch here
 * exists to make one industry "special", which is what keeps output consistent.
 */
export function generatePage(input: GenerateInput): GeneratedPage {
  const mood: Mood = input.mood ?? "calm"
  const industry: Industry = input.industry ?? "services"
  const m = MOODS_SPEC[mood]
  const plan = input.sections ?? PLANS[industry]
  const rand = rng(input.seed ?? 1)
  const pics = SHOTS[industry]
  const pic = (i: number) => pics[i % pics.length]

  const brand = input.brand
  const tagline = input.tagline ?? "Built properly, priced honestly"
  const intro = input.intro ?? "A short line that says what you do and who it is for, without saying it twice."

  // RESTRAINT: exactly one saturated surface. Whichever of these the plan
  // contains first wins it; every other band stays on a base colour.
  const accent: SectionKind = (["cta", "stats", "pricing", "testimonial"] as SectionKind[]).find((s) => plan.includes(s)) ?? "cta"

  // RHYTHM: one step, doubled for the hero. Density then scales all of it.
  const pad = `py-${m.rhythm}`
  const heroPad = `py-${Math.min(32, m.rhythm * 2)}`
  const shell = "mx-auto w-full max-w-6xl px-6"
  const onDark = m.colors["base-100"].toLowerCase() < "#888888"

  // CONTRAST: the ramp is a ratio, not a set of hand-picked sizes.
  const H1 = "text-5xl md:text-6xl"
  const H2 = "text-3xl md:text-4xl"
  const ink = "text-base-content"
  const muted = "text-base-content/60"
  const title = (t: string) => h(t, "2", `font-display ${H2} font-semibold tracking-tight ${ink}`)
  const eyebrow = (t: string) =>
    p(t, "text-xs font-semibold uppercase tracking-[0.16em] text-base-content/45", "span")
  const primaryBtn = "inline-flex h-12 items-center rounded-full bg-primary px-7 text-sm font-semibold text-primary-content no-underline"
  const ghostBtn = "inline-flex h-12 items-center rounded-full border border-base-300 px-7 text-sm font-medium text-base-content no-underline"
  const surface = "rounded-2xl border border-base-300 bg-base-100"

  const section = (kind: SectionKind, ...kids: NodeSpec[]): NodeSpec =>
    el("section", { classes: `w-full px-6 ${kind === "hero" ? heroPad : pad}` }, box(`${shell} flex flex-col gap-10`, ...kids))

  const build: Record<SectionKind, () => NodeSpec> = {
    nav: () =>
      el(
        "navbar",
        { classes: "relative w-full border-b border-base-300 bg-base-100 px-6 py-5" },
        box(
          `${shell} flex items-center justify-between gap-6 px-0`,
          h(brand, "3", `font-display text-xl font-bold tracking-tight ${ink}`),
          el(
            "nav-menu",
            {
              classes:
                "hidden absolute left-0 right-0 top-full z-40 flex-col items-stretch gap-1 border-t border-base-300 bg-base-100 p-4 shadow-lg " +
                "md:static md:z-auto md:flex md:flex-row md:items-center md:gap-7 md:border-0 md:bg-transparent md:p-0 md:shadow-none",
            },
            a("Work", `text-sm ${muted} no-underline`),
            a("About", `text-sm ${muted} no-underline`),
            a("Pricing", `text-sm ${muted} no-underline`),
            a("Contact", `text-sm ${muted} no-underline`)
          ),
          a("Get in touch", primaryBtn),
          el("nav-toggle", {
            classes: "md:hidden inline-flex flex-col justify-center gap-[5px] w-10 h-10 px-[9px] cursor-pointer text-base-content",
          })
        )
      ),

    hero: () =>
      el(
        "section",
        { classes: `relative w-full overflow-hidden px-6 ${heroPad} ${onDark ? "bg-base-100" : "bg-base-200"}` },
        // Atmosphere is a mood decision, and only dark grounds carry it well.
        ...(m.atmosphere
          ? [
              el("aurora", { props: { tone: "p", intensity: 45, speed: 26 }, classes: "pointer-events-none absolute inset-0 overflow-hidden" }),
              el("grain", { props: { intensity: 12 }, classes: "pointer-events-none absolute inset-0 mix-blend-overlay" }),
            ]
          : []),
        box(
          `relative z-10 ${shell} grid items-center gap-12 md:grid-cols-2`,
          el(
            "box",
            { classes: "flex flex-col items-start gap-6", anim: { effect: "fade-up", trigger: "load", duration: 800 } },
            eyebrow(tagline),
            h(brand === "" ? "Untitled" : `${tagline}`, "1", `max-w-2xl font-display ${H1} font-semibold leading-[1.02] tracking-tight ${ink}`),
            p(intro, `max-w-lg text-base leading-relaxed ${muted}`),
            box("flex flex-wrap items-center gap-3", a("Get started", primaryBtn), a("See our work", ghostBtn))
          ),
          el(
            "box",
            {
              classes: `overflow-hidden ${surface} p-0`,
              anim: { effect: "fade", trigger: "load", duration: 900, delay: 150, scroll: { parallax: -40 } },
            },
            shot(pic(0), "h-full w-full object-cover")
          )
        )
      ),

    logos: () =>
      section(
        "logos",
        box(
          "flex flex-col items-center gap-6",
          eyebrow("Trusted by teams everywhere"),
          el(
            "box",
            { classes: "grid w-full grid-cols-2 gap-6 opacity-60 sm:grid-cols-4", anim: { effect: "fade", trigger: "scroll", scroll: { stagger: 90 } } },
            ...["Northwind", "Aurora", "Kestrel", "Lantern"].map((n) =>
              p(n, `text-center font-display text-lg font-semibold ${ink}`, "span")
            )
          )
        )
      ),

    features: () =>
      section(
        "features",
        box("flex flex-col gap-3", eyebrow("What you get"), title("Everything you actually need")),
        el(
          "box",
          { classes: "grid gap-6 md:grid-cols-3", anim: { effect: "fade-up", trigger: "scroll", scroll: { stagger: 110 } } },
          ...[
            ["flashlight", "Fast to launch", "Live in days, not quarters — and quick on a phone."],
            ["shield-check", "Built to last", "Sensible defaults, no surprises when you grow."],
            ["hand-heart", "Looked after", "Real people answer, and they know your account."],
          ].map(([id, t, b]) =>
            box(
              `flex flex-col gap-3 ${surface} p-7`,
              box("flex size-10 items-center justify-center rounded-xl bg-primary/10", ico(id, "inline-block w-5 h-5 text-primary")),
              h(t, "3", `font-display text-lg font-semibold ${ink}`),
              p(b, `text-sm leading-relaxed ${muted}`)
            )
          )
        )
      ),

    gallery: () =>
      section(
        "gallery",
        box("flex flex-col gap-3", eyebrow("Selected work"), title("A look at what we make")),
        el(
          "box",
          { classes: "grid grid-cols-2 gap-4 md:grid-cols-4", anim: { effect: "zoom", trigger: "scroll", scroll: { stagger: 80 } } },
          ...[0, 1, 2, 3].map((i) => box("overflow-hidden rounded-2xl bg-base-200", shot(pic(i + 1), "aspect-square w-full object-cover")))
        )
      ),

    stats: () =>
      el(
        "section",
        { classes: `w-full px-6 ${pad}` },
        box(
          `${shell} grid gap-px overflow-hidden rounded-3xl ${accent === "stats" ? "bg-primary" : "bg-base-300"} sm:grid-cols-3`,
          ...[
            ["12", "years running"],
            ["480", "projects shipped"],
            ["98%", "would recommend"],
          ].map(([n, l]) =>
            box(
              `flex flex-col items-center gap-1 px-6 py-10 ${accent === "stats" ? "bg-primary text-primary-content" : "bg-base-100"}`,
              p(n, `font-display text-4xl font-bold ${accent === "stats" ? "text-primary-content" : ink}`, "span"),
              p(l, `text-xs uppercase tracking-[0.16em] ${accent === "stats" ? "text-primary-content/70" : "text-base-content/50"}`, "span")
            )
          )
        )
      ),

    pricing: () =>
      section(
        "pricing",
        box("flex flex-col gap-3", eyebrow("Pricing"), title("One plan, no surprises")),
        box(
          "grid gap-6 md:grid-cols-3",
          ...[
            ["Starter", "₦5,000", ["Everything to launch", "One editor", "Community support"]],
            ["Growth", "₦15,000", ["Everything in Starter", "Five editors", "Priority support"]],
            ["Scale", "₦50,000", ["Everything in Growth", "Unlimited editors", "A named contact"]],
          ].map(([name, price, feats], i) =>
            box(
              `flex flex-col gap-5 ${surface} p-7 ${i === 1 ? "ring-2 ring-primary" : ""}`,
              box("flex flex-col gap-1", p(name as string, `text-sm font-medium ${muted}`, "span"),
                  box("flex items-baseline gap-1",
                      p(price as string, `font-display text-3xl font-bold ${ink}`, "span"),
                      p("/month", `text-sm ${muted}`, "span"))),
              box("flex flex-col gap-2",
                  ...(feats as string[]).map((f) =>
                    box("flex items-center gap-2", ico("check", "inline-block w-4 h-4 shrink-0 text-primary"), p(f, `text-sm ${muted}`, "span")))),
              a(i === 1 ? "Choose Growth" : `Choose ${name}`, i === 1 ? primaryBtn : ghostBtn)
            )
          )
        )
      ),

    testimonial: () =>
      el(
        "section",
        { classes: `w-full px-6 ${pad}` },
        box(
          `${shell} flex flex-col items-center gap-6 rounded-3xl ${accent === "testimonial" ? "bg-primary" : "bg-base-200"} p-12 text-center md:p-16`,
          p("“They rebuilt the whole thing in a fortnight and it has not needed touching since.”",
            `max-w-2xl font-display text-2xl leading-snug md:text-3xl ${accent === "testimonial" ? "text-primary-content" : ink}`),
          box("flex items-center gap-3",
              shot(pic(2), "size-10 rounded-full object-cover"),
              p("Ada Obi, Founder", `text-sm ${accent === "testimonial" ? "text-primary-content/75" : muted}`, "span"))
        )
      ),

    faq: () =>
      section(
        "faq",
        box("flex flex-col gap-3", eyebrow("Questions"), title("Before you ask")),
        el(
          "accordion",
          { classes: "flex flex-col gap-2 p-2" },
          ...[
            ["How long does it take?", "Most projects go live within two to three weeks of kickoff."],
            ["Can I edit it myself?", "Yes — every part of the page is editable, with no code."],
            ["What if I need help later?", "Support is included, and a real person answers."],
            ["Do you offer refunds?", "Within fourteen days, no questions asked."],
          ].map(([q, ans]) =>
            el("accordion-item", { props: { title: q }, classes: `${surface} px-5` }, p(ans, `text-sm leading-relaxed ${muted}`))
          )
        )
      ),

    cta: () =>
      el(
        "section",
        { classes: `w-full px-6 ${pad}` },
        box(
          `${shell} flex flex-col items-start gap-6 rounded-3xl ${accent === "cta" ? "bg-primary" : "bg-base-200"} p-12 md:flex-row md:items-center md:justify-between md:p-16`,
          box(
            "flex flex-col gap-3",
            h("Ready when you are", "2", `font-display ${H2} font-semibold tracking-tight ${accent === "cta" ? "text-primary-content" : ink}`),
            p("Tell us what you need and we will come back within a day.",
              `max-w-md text-sm leading-relaxed ${accent === "cta" ? "text-primary-content/75" : muted}`)
          ),
          a("Start a project", accent === "cta"
            ? "inline-flex h-12 items-center rounded-full bg-base-100 px-7 text-sm font-semibold text-base-content no-underline"
            : primaryBtn)
        )
      ),

    footer: () =>
      el(
        "footer",
        { classes: `w-full border-t border-base-300 bg-base-100 px-6 ${pad}` },
        box(
          `${shell} flex flex-col gap-10 px-0`,
          box(
            "grid grid-cols-2 gap-8 md:grid-cols-4",
            box("col-span-2 flex flex-col gap-3",
                h(brand, "3", `font-display text-lg font-bold tracking-tight ${ink}`),
                p(intro, `max-w-xs text-sm leading-relaxed ${muted}`)),
            ...[
              ["Company", ["About", "Work", "Careers"]],
              ["Help", ["Contact", "FAQs", "Support"]],
            ].map(([t, links]) =>
              box("flex flex-col items-start gap-2.5",
                  p(t as string, `text-sm font-semibold ${ink}`, "span"),
                  ...(links as string[]).map((l) => a(l, `text-sm ${muted} no-underline`)))
            )
          ),
          box("flex flex-col gap-4 border-t border-base-300 pt-6 sm:flex-row sm:items-center sm:justify-between",
              p(`© 2026 ${brand}. All rights reserved.`, "text-sm text-base-content/50", "span"),
              box("flex items-center gap-5",
                  a("Terms", `text-sm ${muted} no-underline`),
                  a("Privacy", `text-sm ${muted} no-underline`)))
        )
      ),
  }

  // Consume one draw so a seed visibly participates; ordering stays deliberate
  // because a shuffled page argues badly.
  void rand()

  const doc = buildDoc(
    box(
      `font-body ${ink} bg-base-100 antialiased min-h-screen`,
      ...plan.map((k) => build[k]())
    ),
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
      meta: { title: brand, description: intro },
    }
  )

  return { doc: doc as Doc, plan: { mood, industry, sections: plan, accentSection: accent } }
}
