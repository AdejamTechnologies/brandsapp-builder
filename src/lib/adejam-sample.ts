import { buildDoc, el, type NodeSpec } from "@brandsapp/builder-core"

// ── authoring helpers ─────────────────────────────────────────────────────────
const box = (classes: string, ...ch: NodeSpec[]): NodeSpec => el("box", { classes }, ...ch)
/** box that reveals on scroll (staggered by delay). */
const rbox = (classes: string, delay: number, ...ch: NodeSpec[]): NodeSpec =>
  el("box", { classes, anim: { effect: "fade-up", trigger: "scroll", duration: 700, delay } }, ...ch)
/** box that animates on load (hero). */
const lbox = (classes: string, delay: number, effect: string, ...ch: NodeSpec[]): NodeSpec =>
  el("box", { classes, anim: { effect, trigger: "load", duration: 700, delay } }, ...ch)
const h = (text: string, level: string, classes: string): NodeSpec => el("heading", { props: { text, level }, classes })
const p = (text: string, classes: string, tag = "p"): NodeSpec => el("text", { props: { text, tag }, classes })
const btn = (label: string, classes: string): NodeSpec => el("button", { props: { label, href: "#" }, classes })
const navlink = (text: string): NodeSpec =>
  el("link", { props: { text, href: "#" }, classes: "text-sm font-medium text-base-content/70 hover:text-primary no-underline" })

const PRIMARY =
  "inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/30 hover:shadow-xl no-underline"
const GHOST =
  "inline-flex items-center justify-center px-6 py-3 rounded-full border border-base-300 bg-base-100 text-base-content text-sm font-semibold hover:border-primary hover:text-primary no-underline"

// A vibrant feature card with a gradient face + reveal.
const featureCard = (badge: string, title: string, body: string, grad: string, delay: number): NodeSpec =>
  rbox(
    `p-8 rounded-3xl text-white shadow-xl bg-gradient-to-br ${grad}`,
    delay,
    p(badge, "inline-flex px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-widest mb-6", "span"),
    h(title, "3", "font-display text-2xl font-bold mb-2"),
    p(body, "text-white/85 text-sm leading-relaxed m-0")
  )

const stat = (n: string, label: string, delay: number): NodeSpec =>
  rbox(
    "text-center",
    delay,
    p(n, "font-display text-4xl md:text-5xl font-bold text-white m-0"),
    p(label, "text-white/70 text-xs uppercase tracking-widest mt-2 m-0")
  )

const footCol = (title: string, links: string[]): NodeSpec =>
  box(
    "flex flex-col gap-3",
    p(title, "text-xs font-bold uppercase tracking-widest text-base-content/50 m-0", "span"),
    ...links.map((t) => el("link", { props: { text: t, href: "#" }, classes: "text-sm text-base-content/70 hover:text-primary no-underline" }))
  )

/** Adejam — a bold, colorful, animated capability landing page (original copy). */
export const ADEJAM_DOC = buildDoc(
  box(
    "font-body text-base-content bg-base-100 antialiased overflow-hidden",

    // ── nav ──
    box(
      "flex items-center justify-between px-8 py-5 max-w-6xl mx-auto",
      box(
        "flex items-center gap-2",
        box("w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500"),
        h("Adejam", "3", "font-display text-2xl font-bold text-base-content m-0")
      ),
      box(
        "hidden md:flex items-center gap-8",
        navlink("Products"),
        navlink("Platform"),
        navlink("Company"),
        navlink("Careers")
      ),
      btn("Get started", PRIMARY)
    ),

    // ── hero ──
    box(
      "relative px-8 pt-16 pb-28",
      // colorful blurred blobs
      box("absolute -top-24 -left-24 w-96 h-96 rounded-full bg-violet-400/30 blur-3xl"),
      box("absolute top-8 -right-16 w-80 h-80 rounded-full bg-cyan-400/30 blur-3xl"),
      box("absolute top-40 left-1/2 w-72 h-72 rounded-full bg-fuchsia-400/20 blur-3xl"),
      box(
        "relative max-w-4xl mx-auto text-center",
        lbox(
          "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-base-300 bg-base-100/80 text-xs font-semibold text-base-content/70 mb-8",
          0,
          "fade",
          p("✦ Adejam Technologies", "m-0", "span")
        ),
        el("heading", {
          props: { text: "We build software the world actually loves to use.", level: "1" },
          classes:
            "font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.02] mb-6 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent",
          anim: { effect: "fade-up", trigger: "load", duration: 800, delay: 80 },
        }),
        el("text", {
          props: {
            text: "From commerce to community, Adejam ships bold, reliable products that turn ambitious ideas into everyday tools — beautifully.",
          },
          classes: "text-lg text-base-content/60 max-w-2xl mx-auto mb-10 leading-relaxed",
          anim: { effect: "fade-up", trigger: "load", duration: 700, delay: 200 },
        }),
        lbox(
          "flex items-center justify-center gap-3",
          320,
          "fade-up",
          btn("Explore products", PRIMARY),
          btn("Talk to us", GHOST)
        )
      )
    ),

    // ── colorful feature cards ──
    box(
      "px-8 pb-28 max-w-6xl mx-auto",
      rbox(
        "text-center max-w-2xl mx-auto mb-14",
        0,
        p("WHY ADEJAM", "text-xs font-bold uppercase tracking-widest text-primary mb-4"),
        h("Built to move fast — and stay beautiful.", "2", "font-display text-4xl font-bold text-base-content m-0")
      ),
      box(
        "grid grid-cols-1 md:grid-cols-3 gap-6",
        featureCard(
          "Speed",
          "Ship in days",
          "Opinionated foundations and a component system so teams launch products in days, not quarters.",
          "from-violet-500 to-fuchsia-500",
          0
        ),
        featureCard(
          "Scale",
          "Grow calmly",
          "Infrastructure that scales with you and never blinks under load — from first user to your millionth.",
          "from-cyan-500 to-blue-600",
          140
        ),
        featureCard(
          "Craft",
          "Design that delights",
          "Interfaces people remember, on every screen, with motion and polish built in from the start.",
          "from-rose-500 to-orange-400",
          280
        )
      )
    ),

    // ── stats band (gradient) ──
    box(
      "px-8 py-20 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500",
      box(
        "grid grid-cols-2 md:grid-cols-4 gap-10 max-w-5xl mx-auto",
        stat("12+", "Products shipped", 0),
        stat("1M+", "People reached", 100),
        stat("99.99%", "Uptime", 200),
        stat("6", "Countries", 300)
      )
    ),

    // ── big statement ──
    box(
      "px-8 py-28 bg-base-200",
      rbox(
        "max-w-4xl mx-auto text-center",
        0,
        h(
          "One team. A studio of products. A single obsession — making software feel effortless.",
          "2",
          "font-display text-3xl md:text-5xl font-bold text-base-content leading-tight"
        )
      )
    ),

    // ── CTA ──
    box(
      "px-8 py-24",
      rbox(
        "max-w-4xl mx-auto rounded-[2rem] bg-gradient-to-br from-violet-600 to-cyan-500 px-8 py-16 text-center shadow-2xl shadow-violet-500/30",
        0,
        h("Let's build something unforgettable.", "2", "font-display text-4xl md:text-5xl font-bold text-white mb-4"),
        p("Tell us what you're dreaming up — we'll help you make it real.", "text-white/85 mb-8 max-w-xl mx-auto"),
        btn("Start a project", "inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-white text-violet-700 text-sm font-bold hover:bg-white/90 no-underline shadow-lg")
      )
    ),

    // ── footer ──
    box(
      "px-8 py-16 border-t border-base-300 max-w-6xl mx-auto",
      box(
        "grid grid-cols-2 md:grid-cols-5 gap-10",
        box(
          "col-span-2 flex flex-col gap-3",
          box(
            "flex items-center gap-2",
            box("w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500"),
            h("Adejam", "3", "font-display text-xl font-bold text-base-content m-0")
          ),
          p("Bold products for modern business.", "text-sm text-base-content/60 max-w-xs m-0")
        ),
        footCol("Products", ["BrandsApp", "Commerce", "Community", "Studio"]),
        footCol("Company", ["About", "Careers", "Blog", "Contact"]),
        footCol("Legal", ["Privacy", "Terms", "Security"])
      ),
      p("© 2026 Adejam Technologies. All rights reserved.", "text-xs text-base-content/40 mt-12")
    )
  ),
  {
    theme: {
      colors: {
        primary: "#7c3aed", // violet-600 — CTAs, links
        secondary: "#06b6d4", // cyan-500
        accent: "#fb7185", // rose-400
        neutral: "#0f172a", // slate-900 — dark
        "base-100": "#ffffff", // page background
        "base-200": "#f5f3ff", // violet-50 surface
        "base-300": "#ede9fe", // violet-100 borders
        "base-content": "#1e1b4b", // indigo-950 text
      },
      fonts: { display: "Space Grotesk", body: "Inter" },
      radius: {},
      breakpoints: [
        { id: "tablet", label: "Tablet", maxWidth: 1023 },
        { id: "mobile", label: "Mobile", maxWidth: 767 },
      ],
    },
  }
)
