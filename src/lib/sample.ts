import { buildDoc, el, type NodeSpec } from "@brandsapp/builder-core"

// Authoring helpers (utility-class styled — rendered by UnoCSS).
const box = (classes: string, ...ch: NodeSpec[]): NodeSpec => el("box", { classes }, ...ch)
const h = (text: string, level: string, classes: string): NodeSpec => el("heading", { props: { text, level }, classes })
const p = (text: string, classes: string, tag = "p"): NodeSpec => el("text", { props: { text, tag }, classes })
const btn = (label: string, classes: string): NodeSpec => el("button", { props: { label, href: "#" }, classes })
const link = (text: string): NodeSpec =>
  el("link", { props: { text, href: "#" }, classes: "text-sm text-slate-600 hover:text-slate-900 no-underline" })
const feat = (title: string, body: string): NodeSpec =>
  box(
    "p-6 rounded-2xl border border-slate-200",
    box("w-10 h-10 rounded-xl bg-slate-900 mb-4"),
    h(title, "3", "text-lg font-semibold text-slate-900 mb-2"),
    p(body, "text-slate-500 text-sm m-0")
  )

const PRIMARY = "inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"

/** An attractive default landing page so a fresh editor opens on something real. */
export const SAMPLE_DOC = buildDoc(
  box(
    "font-sans text-slate-900 bg-white",
    box(
      "flex items-center justify-between px-6 py-4 border-b border-slate-200",
      h("Brand", "3", "text-lg font-bold text-slate-900 m-0"),
      box(
        "flex items-center gap-6",
        link("Features"),
        link("Pricing"),
        link("About"),
        btn("Get started", "inline-flex items-center px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium")
      )
    ),
    box(
      "px-6 py-24 text-center",
      p("BUILD WITHOUT LIMITS", "inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold mb-5", "span"),
      h("Design your site, your way", "1", "text-5xl font-extrabold tracking-tight text-slate-900 mb-5 max-w-3xl mx-auto"),
      p("Compose beautiful, responsive pages from clean building blocks — no code, and fully yours.", "text-lg text-slate-500 max-w-xl mx-auto mb-8"),
      box(
        "flex items-center justify-center gap-3",
        btn("Start free", PRIMARY),
        btn("Live demo", "inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm font-medium hover:bg-slate-50")
      )
    ),
    box(
      "px-6 pb-20 max-w-6xl mx-auto",
      box(
        "grid grid-cols-1 md:grid-cols-3 gap-6",
        feat("Drag & drop", "Build visually with real, responsive components."),
        feat("Responsive", "Design once — it looks great on every screen."),
        feat("Own it", "Export, publish, and keep full control. No lock-in.")
      )
    ),
    box(
      "mx-6 my-12 px-8 py-14 rounded-3xl bg-slate-900 text-center",
      h("Ready to build?", "2", "text-3xl font-bold text-white mb-3"),
      p("Join teams shipping faster with BrandsApp.", "text-slate-300 mb-7"),
      btn("Get started free", "inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-white text-slate-900 text-sm font-medium hover:bg-slate-100")
    ),
    box("px-6 py-10 border-t border-slate-200 text-center", p("© 2026 Brand Inc. Built with BrandsApp.", "text-slate-500 text-sm m-0"))
  ),
  {
    theme: {
      colors: { accent: "#4f46e5", text: "#0f172a", muted: "#64748b" },
      fonts: { body: "Inter, ui-sans-serif, system-ui, sans-serif" },
      radius: {},
      breakpoints: [
        { id: "tablet", label: "Tablet", maxWidth: 1023 },
        { id: "mobile", label: "Mobile", maxWidth: 767 },
      ],
    },
  }
)
