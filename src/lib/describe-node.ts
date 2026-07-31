import type { Node } from "@brandsapp/builder-core"

/**
 * How a node introduces itself on the canvas: a short TYPE badge plus a name.
 *
 * For text-bearing elements the name is the content itself, truncated — on a
 * real page every paragraph is called "Paragraph", so the label only earns its
 * space if it says WHICH paragraph. An author-set label always wins.
 */
export interface NodeDescription {
  /** Compact type token, e.g. "H1", "P", "UL". Empty when the name says enough. */
  badge: string
  name: string
}

const clean = (v: unknown): string =>
  String(v ?? "")
    .replace(/<[^>]*>/g, " ") // richtext/embed props carry markup
    .replace(/\s+/g, " ")
    .trim()

const trunc = (s: string, n = 42): string => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

/** Webflow-style names for modules that have no content of their own. */
const MODULE_LABELS: Record<string, string> = {
  box: "Div Block",
  "page-root": "Body",
  stack: "Flex Block",
  grid: "Quick Stack",
  section: "Section",
  container: "Container",
  navbar: "Navbar",
  // Webflow's names for the two halves of a collapsible nav.
  "nav-menu": "Nav Menu",
  "nav-toggle": "Menu Button",
  "dropdown-trigger": "Dropdown Toggle",
  "dropdown-menu": "Dropdown List",
  card: "Card",
  alert: "Alert",
  badge: "Badge",
  avatar: "Avatar",
  breadcrumb: "Breadcrumb",
  pagination: "Pagination",
  footer: "Footer",
  aurora: "Aurora",
  light: "Light",
  grain: "Grain",
  vignette: "Vignette",
  form: "Form Block",
  submit: "Form Button",
  "form-label": "Label",
  "select-field": "Select",
  radio: "Radio Button",
  textarea: "Text Area",
  "file-upload": "File Upload",
  embed: "Code Embed",
  "code-block": "Code Block",
  "custom-element": "Custom Element",
  "background-video": "Background Video",
  youtube: "YouTube",
  divider: "Divider",
  spacer: "Spacer",
}

const titleCase = (m: string) => m.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

export function describeNode(node: Node, friendly?: (module: string) => string): NodeDescription {
  const nameFor = (m: string) => friendly?.(m) ?? MODULE_LABELS[m] ?? titleCase(m)
  const p = (node.props ?? {}) as Record<string, unknown>
  const preview = (v: unknown, fallback: string) => node.label ?? (trunc(clean(v)) || fallback)

  switch (node.module) {
    case "heading": {
      const level = Math.min(Math.max(Number(p.level) || 2, 1), 6)
      return { badge: `H${level}`, name: preview(p.text, `Heading ${level}`) }
    }
    case "text": {
      // Paragraph / Text Block / Block Quote are all this module, told apart by tag.
      const tag = String(p.tag ?? "p").toLowerCase()
      const badge = tag === "blockquote" ? "BQ" : tag === "p" ? "P" : "T"
      const fallback = tag === "blockquote" ? "Block Quote" : tag === "p" ? "Paragraph" : "Text Block"
      return { badge, name: preview(p.text, fallback) }
    }
    case "richtext":
      return { badge: "RT", name: preview(p.html, "Rich Text Block") }
    case "link":
      return { badge: "A", name: preview(p.text, "Link Block") }
    case "button":
      return { badge: "BTN", name: preview(p.label, "Button") }
    case "list":
      return { badge: String(p.ordered) === "true" ? "OL" : "UL", name: node.label ?? "List" }
    case "list-item":
      return { badge: "LI", name: preview(p.text, "List Item") }
    case "image":
      return { badge: "IMG", name: node.label ?? "Image" }
    default:
      return { badge: "", name: node.label ?? nameFor(node.module) }
  }
}
