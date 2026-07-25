import { buildFragment, el, type Fragment, type NodeSpec } from "@brandsapp/builder-core"

const rand = () => crypto.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)

export interface Template {
  name: string
  category: string
  make: () => Fragment
}

function tpl(category: string, name: string, root: NodeSpec): Template {
  return {
    category,
    name,
    make: () => buildFragment(root, { manifest: { id: rand(), name, category: "section", version: "1.0.0" } }),
  }
}

// ── authoring helpers ─────────────────────────────────────────────────────────
const box = (classes: string, ...children: NodeSpec[]): NodeSpec => el("box", { classes }, ...children)
const h = (text: string, level: string, classes: string): NodeSpec => el("heading", { props: { text, level }, classes })
const p = (text: string, classes: string, tag = "p"): NodeSpec => el("text", { props: { text, tag }, classes })
const btn = (label: string, classes: string): NodeSpec => el("button", { props: { label, href: "#" }, classes })
const nav = (text: string): NodeSpec =>
  el("link", { props: { text, href: "#" }, classes: "text-sm text-slate-600 hover:text-slate-900 no-underline" })
const img = (w: number, ht: number, classes: string): NodeSpec =>
  el("image", { props: { src: `https://placehold.co/${w}x${ht}/e2e8f0/94a3b8?text=Image`, alt: "" }, classes })

const PRIMARY = "inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
const SECONDARY =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm font-medium hover:bg-slate-50"

const featureCard = (title: string, body: string): NodeSpec =>
  box(
    "p-6 rounded-2xl border border-slate-200 bg-white",
    box("w-10 h-10 rounded-xl bg-slate-900 mb-4"),
    h(title, "3", "text-lg font-semibold text-slate-900 mb-2"),
    p(body, "text-slate-500 text-sm leading-relaxed m-0")
  )

const stat = (n: string, label: string): NodeSpec =>
  box("", h(n, "2", "text-4xl font-extrabold text-slate-900 m-0"), p(label, "text-slate-500 text-sm mt-1 m-0"))

const priceCard = (name: string, price: string, desc: string, highlight: boolean): NodeSpec =>
  box(
    highlight
      ? "p-8 rounded-2xl border-2 border-slate-900 bg-white flex flex-col"
      : "p-8 rounded-2xl border border-slate-200 bg-white flex flex-col",
    h(name, "3", "text-lg font-semibold text-slate-900 mb-1"),
    box("flex items-end gap-1 mb-4", h(price, "2", "text-4xl font-extrabold text-slate-900 m-0"), p("/mo", "text-slate-500 mb-1 m-0")),
    p(desc, "text-slate-500 text-sm mb-6 grow", ),
    btn("Choose plan", (highlight ? PRIMARY : SECONDARY) + " w-full")
  )

const footerCol = (title: string, links: string[]): NodeSpec =>
  box(
    "flex flex-col gap-2",
    h(title, "4", "text-sm font-semibold text-slate-900 mb-1"),
    ...links.map((l) => el("link", { props: { text: l, href: "#" }, classes: "text-sm text-slate-500 hover:text-slate-900 no-underline" }))
  )

// ── the library ───────────────────────────────────────────────────────────────
export const TEMPLATES: Template[] = [
  tpl("Layout", "Container", box("max-w-5xl mx-auto px-6 py-12 min-h-24 border border-dashed border-slate-300 rounded-xl")),
  tpl(
    "Layout",
    "Card",
    box(
      "p-6 rounded-2xl border border-slate-200 bg-white shadow-sm max-w-sm",
      box("w-full h-40 rounded-xl bg-slate-100 mb-4"),
      h("Card title", "3", "text-lg font-semibold text-slate-900 mb-1"),
      p("Supporting text that describes this card in a sentence or two.", "text-slate-500 text-sm mb-4"),
      btn("Action", PRIMARY)
    )
  ),

  tpl(
    "Navigation",
    "Navbar",
    box(
      "flex items-center justify-between px-6 py-4 border-b border-slate-200",
      h("Brand", "3", "text-lg font-bold text-slate-900 m-0"),
      box("flex items-center gap-6", nav("Features"), nav("Pricing"), nav("About"), btn("Get started", PRIMARY))
    )
  ),
  tpl(
    "Navigation",
    "Footer",
    box(
      "px-6 py-14 border-t border-slate-200",
      box(
        "grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto",
        footerCol("Product", ["Features", "Pricing", "Docs"]),
        footerCol("Company", ["About", "Blog", "Careers"]),
        footerCol("Legal", ["Privacy", "Terms"]),
        box("", h("Brand", "3", "text-lg font-bold text-slate-900 mb-2"), p("© 2026 Brand Inc.", "text-slate-500 text-sm m-0"))
      )
    )
  ),

  tpl(
    "Hero",
    "Hero — centered",
    box(
      "px-6 py-24 text-center",
      p("NEW", "inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold mb-5", "span"),
      h("The fastest way to build your site", "1", "text-5xl font-extrabold tracking-tight text-slate-900 mb-5 max-w-3xl mx-auto"),
      p("A clear, benefit-driven subheadline that tells visitors exactly what you do and why it matters.", "text-lg text-slate-500 max-w-xl mx-auto mb-8"),
      box("flex items-center justify-center gap-3", btn("Get started", PRIMARY), btn("Learn more", SECONDARY))
    )
  ),
  tpl(
    "Hero",
    "Hero — split",
    box(
      "grid grid-cols-1 md:grid-cols-2 gap-10 items-center max-w-6xl mx-auto px-6 py-20",
      box(
        "",
        h("Build beautiful pages, fast", "1", "text-4xl font-extrabold tracking-tight text-slate-900 mb-4"),
        p("Compose your site from clean, responsive sections. No code, no lock-in.", "text-lg text-slate-500 mb-6"),
        box("flex gap-3", btn("Start free", PRIMARY), btn("Book a demo", SECONDARY))
      ),
      img(640, 480, "w-full rounded-2xl border border-slate-200")
    )
  ),

  tpl(
    "Content",
    "Feature grid",
    box(
      "px-6 py-20 max-w-6xl mx-auto",
      h("Everything you need to ship", "2", "text-3xl font-bold text-center text-slate-900 mb-3"),
      p("Powerful building blocks that stay out of your way.", "text-slate-500 text-center mb-12 max-w-xl mx-auto"),
      box(
        "grid grid-cols-1 md:grid-cols-3 gap-6",
        featureCard("Fast", "Ship pages in minutes, not weeks."),
        featureCard("Flexible", "Compose any layout from primitives."),
        featureCard("Yours", "Own the design end to end — no lock-in.")
      )
    )
  ),
  tpl(
    "Content",
    "Stats",
    box(
      "grid grid-cols-2 md:grid-cols-4 gap-8 px-6 py-16 max-w-5xl mx-auto text-center",
      stat("10k+", "Active users"),
      stat("99.9%", "Uptime"),
      stat("4.9/5", "Rating"),
      stat("24/7", "Support")
    )
  ),
  tpl(
    "Content",
    "Testimonial",
    box(
      "px-6 py-20 max-w-3xl mx-auto text-center",
      p("“This completely changed how we ship pages. What used to take days now takes minutes.”", "text-2xl font-medium text-slate-900 leading-relaxed mb-6"),
      box(
        "flex items-center justify-center gap-3",
        box("w-10 h-10 rounded-full bg-slate-200"),
        box("text-left", h("Jane Doe", "4", "text-sm font-semibold text-slate-900 m-0"), p("CEO, Acme", "text-slate-500 text-xs m-0"))
      )
    )
  ),

  tpl(
    "Commerce",
    "Pricing",
    box(
      "px-6 py-20 max-w-6xl mx-auto",
      h("Simple, transparent pricing", "2", "text-3xl font-bold text-center text-slate-900 mb-12"),
      box(
        "grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch",
        priceCard("Starter", "$9", "For individuals getting started.", false),
        priceCard("Pro", "$29", "For growing teams that need more.", true),
        priceCard("Scale", "$99", "For organisations at scale.", false)
      )
    )
  ),

  tpl(
    "Call to action",
    "CTA banner",
    box(
      "mx-6 my-12 px-8 py-14 rounded-3xl bg-slate-900 text-center",
      h("Ready to get started?", "2", "text-3xl font-bold text-white mb-3"),
      p("Join thousands of teams building faster.", "text-slate-300 mb-7"),
      box(
        "flex items-center justify-center gap-3",
        btn("Start free", "inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-white text-slate-900 text-sm font-medium hover:bg-slate-100"),
        btn("Contact sales", "inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-white/30 text-white text-sm font-medium hover:bg-white/10")
      )
    )
  ),
]
