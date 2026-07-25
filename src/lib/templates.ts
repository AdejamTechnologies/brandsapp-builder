import { buildFragment, el, type Fragment, type NodeSpec } from "@brandsapp/builder-core"

const rand = () => crypto.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)

const ACCENT = "#4f46e5"

function section(name: string, root: NodeSpec): { name: string; make: () => Fragment } {
  return {
    name,
    make: () => buildFragment(root, { manifest: { id: rand(), name, category: "section", version: "1.0.0" } }),
  }
}

const feature = (title: string, body: string): NodeSpec =>
  el(
    "box",
    { style: { padding: "20px", border: "1px solid #e5e7eb", borderRadius: "12px", background: "#fff" } },
    el("heading", { props: { text: title, level: "3" }, style: { fontSize: "18px", margin: "0 0 8px" } }),
    el("text", { props: { text: body }, style: { color: "#6b7280", margin: "0" } })
  )

/** Pre-built sections you can drop into a page (they insert like a marketplace Fragment). */
export const TEMPLATES: { name: string; make: () => Fragment }[] = [
  section(
    "Hero",
    el(
      "box",
      { style: { padding: "88px 24px", textAlign: "center", background: "#0b1020", color: "#ffffff" } },
      el("heading", {
        props: { text: "Build something people love", level: "1" },
        style: { fontSize: "48px", fontWeight: "800", margin: "0 0 16px", color: "#ffffff" },
      }),
      el("text", {
        props: { text: "A clear one-liner about your product and exactly who it is for." },
        style: { fontSize: "18px", color: "#c7ccd8", maxWidth: "620px", margin: "0 auto 28px" },
      }),
      el("button", {
        props: { label: "Get started", href: "#" },
        style: { background: ACCENT, color: "#fff", padding: "13px 26px", borderRadius: "10px", fontWeight: "600" },
      })
    )
  ),
  section(
    "Feature grid",
    el(
      "box",
      { style: { padding: "64px 24px" } },
      el("heading", {
        props: { text: "Everything you need", level: "2" },
        style: { textAlign: "center", fontSize: "32px", margin: "0 0 36px" },
      }),
      el(
        "grid",
        { props: { columns: 3 }, style: { gap: "20px", maxWidth: "1040px", margin: "0 auto" } },
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
      { style: { padding: "72px 24px", textAlign: "center", background: "#f6f7f9" } },
      el("heading", {
        props: { text: "Ready to start?", level: "2" },
        style: { fontSize: "28px", margin: "0 0 18px" },
      }),
      el("button", {
        props: { label: "Create your page", href: "#" },
        style: { background: ACCENT, color: "#fff", padding: "13px 26px", borderRadius: "10px", fontWeight: "600" },
      })
    )
  ),
  section(
    "Two columns",
    el(
      "grid",
      { props: { columns: 2 }, style: { gap: "32px", padding: "64px 24px", maxWidth: "1040px", margin: "0 auto", alignItems: "center" } },
      el(
        "box",
        {},
        el("heading", { props: { text: "Tell your story", level: "2" }, style: { fontSize: "30px", margin: "0 0 12px" } }),
        el("text", {
          props: { text: "Use this space to explain the value, back it with detail, and lead to one clear action." },
          style: { color: "#6b7280", fontSize: "16px", margin: "0 0 20px" },
        }),
        el("button", { props: { label: "Learn more", href: "#" }, style: { background: ACCENT, color: "#fff", padding: "11px 22px", borderRadius: "10px" } })
      ),
      el("image", {
        props: { src: "https://placehold.co/600x420/e5e7eb/9aa1ac?text=Image", alt: "" },
        style: { width: "100%", borderRadius: "14px" },
      })
    )
  ),
]
