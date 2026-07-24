/** A sample Doc so the editor renders something meaningful out of the box. */
export const SAMPLE_DOC = {
  version: 1,
  rootId: "root",
  nodes: {
    root: { id: "root", module: "box", styleIds: ["page"], children: ["h", "p", "cta"] },
    h: { id: "h", module: "heading", props: { text: "We build software that ships.", level: "1" }, styleIds: ["title"] },
    p: { id: "p", module: "text", props: { text: "Edit this JSON and watch the preview update live." }, styleIds: ["lead"] },
    cta: { id: "cta", module: "button", props: { label: "Start a project", href: "/contact" }, styleIds: ["btn"] },
  },
  styles: {
    page: { id: "page", kind: "local", base: { display: "flex", flexDirection: "column", gap: "1.25rem", alignItems: "flex-start", padding: "4rem", maxWidth: "820px", margin: "0 auto" } },
    title: { id: "title", kind: "token", base: { fontSize: "3.25rem", fontWeight: "800", letterSpacing: "-0.02em", margin: "0", color: "var(--color-text)" }, context: { mobile: { fontSize: "2.25rem" } } },
    lead: { id: "lead", kind: "token", base: { fontSize: "1.125rem", color: "var(--color-muted)", margin: "0" } },
    btn: { id: "btn", kind: "token", base: { background: "var(--color-accent)", color: "#fff", padding: "0.85rem 1.75rem", borderRadius: "999px", fontWeight: "600", textDecoration: "none", display: "inline-block" } },
  },
  theme: {
    colors: { accent: "#4F46E5", text: "#0c111d", muted: "#5b6472" },
    fonts: { body: "Inter, ui-sans-serif, system-ui, sans-serif" },
    radius: {},
    breakpoints: [{ id: "mobile", label: "Mobile", maxWidth: 767 }],
  },
} as const
