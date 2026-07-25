import { buildFragment, el, type Fragment, type NodeSpec } from "@brandsapp/builder-core"

const rand = () => crypto.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)

const CTA = "inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl"

function section(name: string, root: NodeSpec): { name: string; make: () => Fragment } {
  return {
    name,
    make: () => buildFragment(root, { manifest: { id: rand(), name, category: "section", version: "1.0.0" } }),
  }
}

const feature = (title: string, body: string): NodeSpec =>
  el(
    "box",
    { classes: "p-5 rounded-2xl border border-slate-200 bg-white" },
    el("heading", { props: { text: title, level: "3" }, classes: "text-lg font-semibold mb-2" }),
    el("text", { props: { text: body }, classes: "text-slate-500 leading-relaxed m-0" })
  )

/**
 * Pre-built sections (insert like a marketplace Fragment). Styled with utility
 * classes — the renderer generates their CSS at render time (UnoCSS), so they look
 * good out of the box and stay editable via the Inspector's Classes field.
 */
export const TEMPLATES: { name: string; make: () => Fragment }[] = [
  section(
    "Hero",
    el(
      "box",
      { classes: "px-6 py-24 text-center bg-slate-900 text-white" },
      el("heading", {
        props: { text: "Build something people love", level: "1" },
        classes: "text-5xl font-extrabold tracking-tight mb-4 text-white",
      }),
      el("text", {
        props: { text: "A clear one-liner about your product and exactly who it is for." },
        classes: "text-lg text-slate-300 max-w-xl mx-auto mb-8",
      }),
      el("button", { props: { label: "Get started", href: "#" }, classes: CTA })
    )
  ),
  section(
    "Feature grid",
    el(
      "box",
      { classes: "px-6 py-16" },
      el("heading", {
        props: { text: "Everything you need", level: "2" },
        classes: "text-3xl font-bold text-center mb-10",
      }),
      el(
        "box",
        { classes: "grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto" },
        feature("Fast", "Ship pages in minutes, not weeks."),
        feature("Flexible", "Compose any layout from primitives."),
        feature("Yours", "Own the design end to end — no lock-in.")
      )
    )
  ),
  section(
    "Call to action",
    el(
      "box",
      { classes: "px-6 py-20 text-center bg-slate-50" },
      el("heading", { props: { text: "Ready to start?", level: "2" }, classes: "text-3xl font-bold mb-5" }),
      el("button", { props: { label: "Create your page", href: "#" }, classes: CTA })
    )
  ),
  section(
    "Two columns",
    el(
      "box",
      { classes: "grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto px-6 py-16" },
      el(
        "box",
        {},
        el("heading", { props: { text: "Tell your story", level: "2" }, classes: "text-3xl font-bold mb-3" }),
        el("text", {
          props: { text: "Use this space to explain the value, back it with detail, and lead to one clear action." },
          classes: "text-slate-500 leading-relaxed mb-5",
        }),
        el("button", { props: { label: "Learn more", href: "#" }, classes: CTA })
      ),
      el("image", {
        props: { src: "https://placehold.co/600x420/e2e8f0/94a3b8?text=Image", alt: "" },
        classes: "w-full rounded-2xl",
      })
    )
  ),
]
