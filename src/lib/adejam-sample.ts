import { buildDoc, el, type NodeSpec } from "@brandsapp/builder-core"

// ── real imagery (verified Unsplash ids, mirrored from the tenant's curated
//    lib/pages/stock-images.ts — Unsplash License, free, no attribution) ────────
const hero = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`
const shot = (id: string) => `https://images.unsplash.com/photo-${id}?w=1000&h=760&fit=crop&q=80&auto=format`
const face = (id: string) => `https://images.unsplash.com/photo-${id}?w=160&h=160&fit=crop&q=80&auto=format`

const IMG = {
  heroProduct: hero("1498050108023-c5249f4df085"), // code on screen
  teamCoding: shot("1519389950473-47ba0277781c"), // team coding
  collab: shot("1573164713988-8665fc963095"), // tech team collaborating
  office: shot("1552664730-d307ca884978"), // modern office
}
const AVATARS = [
  face("1531123897727-8f129e1688ce"),
  face("1489424731084-a5d8b219a5bb"),
  face("1500648767791-00dcc994a43e"),
  face("1517841905240-472988babdf9"),
]
const TEAM = [
  { name: "Ada Okoye", role: "Founder & CEO", img: face("1580489944761-15a19d654956") },
  { name: "James Bello", role: "Head of Product", img: face("1633332755192-727a05c4013d") },
  { name: "Mara Lindqvist", role: "Lead Engineer", img: face("1531123897727-8f129e1688ce") },
  { name: "Deo Santos", role: "Design Lead", img: face("1489424731084-a5d8b219a5bb") },
]

// ── authoring helpers ─────────────────────────────────────────────────────────
const box = (classes: string, ...ch: NodeSpec[]): NodeSpec => el("box", { classes }, ...ch)
const rbox = (classes: string, delay: number, ...ch: NodeSpec[]): NodeSpec =>
  el("box", { classes, anim: { effect: "fade-up", trigger: "scroll", duration: 700, delay } }, ...ch)
const lbox = (classes: string, delay: number, effect: string, ...ch: NodeSpec[]): NodeSpec =>
  el("box", { classes, anim: { effect, trigger: "load", duration: 700, delay } }, ...ch)
const h = (text: string, level: string, classes: string): NodeSpec => el("heading", { props: { text, level }, classes })
const p = (text: string, classes: string, tag = "p"): NodeSpec => el("text", { props: { text, tag }, classes })
const btn = (label: string, classes: string): NodeSpec => el("button", { props: { label, href: "#" }, classes })
const img = (src: string, alt: string, classes: string): NodeSpec => el("image", { props: { src, alt }, classes })
const navlink = (text: string): NodeSpec =>
  el("link", { props: { text, href: "#" }, classes: "text-sm font-medium text-base-content/70 hover:text-primary no-underline" })

const PRIMARY =
  "inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/30 hover:shadow-xl no-underline"
const GHOST =
  "inline-flex items-center justify-center px-6 py-3 rounded-full border border-base-300 bg-base-100 text-base-content text-sm font-semibold hover:border-primary hover:text-primary no-underline"

/** Alternating photo + copy row. */
const featureRow = (badge: string, title: string, body: string, image: string, alt: string, reverse: boolean, delay: number): NodeSpec => {
  const text = box(
    "flex flex-col justify-center",
    p(badge, "text-xs font-bold uppercase tracking-widest text-primary mb-3"),
    h(title, "3", "font-display text-3xl md:text-4xl font-bold text-base-content mb-4 leading-tight"),
    p(body, "text-base-content/60 leading-relaxed m-0")
  )
  const pic = box(
    "relative",
    box("absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-violet-500/20 to-cyan-500/20 blur-xl"),
    img(image, alt, "relative w-full rounded-3xl shadow-xl object-cover aspect-[4/3]")
  )
  return rbox(
    "grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center",
    delay,
    ...(reverse ? [pic, text] : [text, pic])
  )
}

const teamCard = (name: string, role: string, image: string, delay: number): NodeSpec =>
  rbox(
    "text-center",
    delay,
    img(image, name, "w-24 h-24 rounded-2xl object-cover mx-auto mb-4 shadow-md"),
    p(name, "font-display text-base font-bold text-base-content m-0", "span"),
    p(role, "text-xs text-base-content/60 mt-1 m-0")
  )

const footCol = (title: string, links: string[]): NodeSpec =>
  box(
    "flex flex-col gap-3",
    p(title, "text-xs font-bold uppercase tracking-widest text-base-content/50 m-0", "span"),
    ...links.map((t) => el("link", { props: { text: t, href: "#" }, classes: "text-sm text-base-content/70 hover:text-primary no-underline" }))
  )

// A LIVE section: bound to the `products.featured` feed. On publish it renders the
// tenant's real featured products (and auto-hides via requireFeed if there are
// none); in the editor it previews with sample rows.
const productCard = box(
  "rounded-2xl border border-base-300 overflow-hidden bg-base-100 shadow-sm hover:shadow-lg transition-shadow",
  el("image", { bindings: { src: { source: "item", field: "image" } }, props: { src: "", alt: "Product" }, classes: "w-full aspect-square object-cover bg-base-200" }),
  box(
    "p-5",
    el("heading", { bindings: { text: { source: "item", field: "title" } }, props: { text: "Product", level: "3" }, classes: "font-display text-lg font-bold text-base-content m-0" }),
    el("text", { bindings: { text: { source: "item", field: "price" } }, props: { text: "₦0", tag: "p" }, classes: "text-primary font-semibold mt-1 m-0" }),
    el("link", { bindings: { href: { source: "item", field: "url" } }, props: { text: "View product →", href: "#" }, classes: "inline-block mt-3 text-sm text-base-content/60 hover:text-primary no-underline" })
  )
)
const featuredProducts = el(
  "box",
  { props: { requireFeed: "products.featured" }, classes: "px-8 py-24 bg-base-200" },
  rbox(
    "max-w-6xl mx-auto",
    0,
    p("FROM THE STORE", "text-xs font-bold uppercase tracking-widest text-primary mb-3 text-center"),
    h("Featured products", "2", "font-display text-4xl font-bold text-base-content mb-12 text-center"),
    el("loop", { props: { source: "products.featured", limit: 3, tag: "div" }, classes: "grid grid-cols-1 md:grid-cols-3 gap-6" }, productCard)
  )
)

/** Adejam — image-anchored, bold, colorful, animated (original copy, real photos). */
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
      box("hidden md:flex items-center gap-8", navlink("Products"), navlink("Platform"), navlink("Company"), navlink("Careers")),
      btn("Get started", PRIMARY)
    ),

    // ── hero (split: copy + real product photo) ──
    box(
      "px-8 pt-10 pb-24 max-w-6xl mx-auto",
      box(
        "grid grid-cols-1 md:grid-cols-2 gap-12 items-center",
        box(
          "flex flex-col",
          lbox(
            "inline-flex items-center gap-2 self-start px-4 py-1.5 rounded-full border border-base-300 bg-base-100 text-xs font-semibold text-base-content/70 mb-7",
            0,
            "fade",
            p("✦ Adejam Technologies", "m-0", "span")
          ),
          el("heading", {
            props: { text: "We build software the world actually loves to use.", level: "1" },
            classes:
              "font-display text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-5 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent",
            anim: { effect: "fade-up", trigger: "load", duration: 800, delay: 80 },
          }),
          el("text", {
            props: { text: "From commerce to community, Adejam ships bold, reliable products that turn ambitious ideas into everyday tools — beautifully." },
            classes: "text-lg text-base-content/60 max-w-md mb-8 leading-relaxed",
            anim: { effect: "fade-up", trigger: "load", duration: 700, delay: 200 },
          }),
          lbox("flex items-center gap-3 mb-9", 300, "fade-up", btn("Explore products", PRIMARY), btn("Talk to us", GHOST)),
          // social proof — real avatar photos
          lbox(
            "flex items-center gap-4",
            420,
            "fade",
            box(
              "flex -space-x-3",
              ...AVATARS.map((src) => img(src, "Adejam customer", "w-10 h-10 rounded-full border-2 border-white object-cover"))
            ),
            p("Trusted by 1M+ builders worldwide", "text-sm text-base-content/60 m-0")
          )
        ),
        // hero image with a colorful glow
        lbox(
          "relative",
          240,
          "fade-up",
          box("absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-violet-500/30 via-fuchsia-400/20 to-cyan-400/30 blur-2xl"),
          img(IMG.heroProduct, "Adejam product in action", "relative w-full rounded-[2rem] shadow-2xl object-cover aspect-[4/5]")
        )
      )
    ),

    // ── alternating photo feature rows ──
    box(
      "px-8 py-8 max-w-6xl mx-auto flex flex-col gap-24",
      featureRow(
        "Speed",
        "Ship products in days, not quarters.",
        "Opinionated foundations and a shared component system mean your team goes from idea to launch without rebuilding the basics every time.",
        IMG.teamCoding,
        "Adejam team building software",
        false,
        0
      ),
      featureRow(
        "Scale",
        "Grow calmly — from your first user to your millionth.",
        "Infrastructure that scales with you and never blinks under load, so you can focus on the product instead of the plumbing.",
        IMG.office,
        "Adejam engineering workspace",
        true,
        80
      ),
      featureRow(
        "Craft",
        "Design people remember, on every screen.",
        "Motion, polish and accessibility are built in from the start — the details that make software feel effortless are the default, not an afterthought.",
        IMG.collab,
        "Adejam team collaborating",
        false,
        80
      )
    ),

    // ── live: featured products (auto-hides when the store is empty) ──
    featuredProducts,

    // ── stats band (gradient) ──
    box(
      "px-8 py-20 mt-20 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500",
      box(
        "grid grid-cols-2 md:grid-cols-4 gap-10 max-w-5xl mx-auto text-center",
        rbox("", 0, p("12+", "font-display text-4xl md:text-5xl font-bold text-white m-0"), p("Products shipped", "text-white/70 text-xs uppercase tracking-widest mt-2 m-0")),
        rbox("", 80, p("1M+", "font-display text-4xl md:text-5xl font-bold text-white m-0"), p("People reached", "text-white/70 text-xs uppercase tracking-widest mt-2 m-0")),
        rbox("", 160, p("99.99%", "font-display text-4xl md:text-5xl font-bold text-white m-0"), p("Uptime", "text-white/70 text-xs uppercase tracking-widest mt-2 m-0")),
        rbox("", 240, p("6", "font-display text-4xl md:text-5xl font-bold text-white m-0"), p("Countries", "text-white/70 text-xs uppercase tracking-widest mt-2 m-0"))
      )
    ),

    // ── team (real portraits) ──
    box(
      "px-8 py-28 max-w-6xl mx-auto",
      rbox(
        "text-center max-w-2xl mx-auto mb-14",
        0,
        p("THE MAKERS", "text-xs font-bold uppercase tracking-widest text-primary mb-4"),
        h("A small team with an outsized obsession.", "2", "font-display text-4xl font-bold text-base-content m-0")
      ),
      box(
        "grid grid-cols-2 md:grid-cols-4 gap-8",
        ...TEAM.map((m, i) => teamCard(m.name, m.role, m.img, i * 90))
      )
    ),

    // ── CTA ──
    box(
      "px-8 pb-24",
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
        primary: "#7c3aed",
        secondary: "#06b6d4",
        accent: "#fb7185",
        neutral: "#0f172a",
        "base-100": "#ffffff",
        "base-200": "#f5f3ff",
        "base-300": "#ede9fe",
        "base-content": "#1e1b4b",
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
