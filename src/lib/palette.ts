import { registry } from "./registry"
import type { ModuleInfo } from "./registry"

/**
 * The Add-panel taxonomy, arranged to match Webflow's element panel.
 *
 * A palette ENTRY is not the same thing as a module: several entries can share
 * one module with different starting props, which is how Webflow presents things
 * too. "V Flex" and "H Flex" are one `stack` in two directions; Paragraph, Text
 * Block and Block Quote are one `text` with different tags. That keeps the AST
 * small while the panel stays familiar.
 *
 * Modules absent from this list stay REGISTERED and keep rendering wherever they
 * are already used — they are simply not offered as new elements here.
 */
export interface PaletteEntry {
  /** Shown in the panel (Webflow's wording). */
  label: string
  /** The module this inserts. */
  module: string
  /** Merged over the module's own `defaults`. */
  props?: Record<string, unknown>
  /** Replaces the module's `defaultClasses` when set. */
  classes?: string
  /** Extra words to match when searching (aliases, our own naming). */
  keywords?: string
}

export interface PaletteSection {
  id: string
  label: string
  entries: PaletteEntry[]
}

const NAV_LINK = "text-sm text-base-content/70 hover:text-base-content no-underline"

export const PALETTE: PaletteSection[] = [
  {
    id: "structure",
    label: "Structure",
    entries: [
      { label: "Section", module: "section", keywords: "band region" },
      { label: "Container", module: "container", keywords: "wrapper centred" },
      { label: "Quick Stack", module: "grid", props: { columns: 2 }, keywords: "layout responsive" },
      { label: "V Flex", module: "stack", props: { direction: "column" }, keywords: "vertical column flex" },
      { label: "H Flex", module: "stack", props: { direction: "row" }, keywords: "horizontal row flex" },
    ],
  },
  {
    id: "basic",
    label: "Basic",
    entries: [
      { label: "Div Block", module: "box", keywords: "div container block" },
      { label: "List", module: "list", keywords: "ul ol bullets" },
      { label: "List Item", module: "list-item", keywords: "li" },
      {
        label: "Link Block",
        module: "link",
        classes: "block no-underline text-inherit",
        keywords: "anchor wrapper clickable",
      },
      { label: "Button", module: "button", keywords: "cta" },
    ],
  },
  {
    id: "typography",
    label: "Typography",
    entries: [
      { label: "Heading", module: "heading", keywords: "h1 h2 title" },
      { label: "Paragraph", module: "text", props: { tag: "p" }, keywords: "copy body" },
      { label: "Text Link", module: "link", keywords: "anchor href" },
      { label: "Text Block", module: "text", props: { tag: "div" }, keywords: "copy span" },
      {
        label: "Block Quote",
        module: "text",
        props: { tag: "blockquote", text: "A quote worth pulling out of the copy." },
        classes: "border-l-2 border-primary pl-5 text-lg italic leading-relaxed text-base-content/80",
        keywords: "quote pullquote",
      },
      { label: "Rich Text", module: "richtext", keywords: "wysiwyg html prose" },
    ],
  },
  {
    id: "media",
    label: "Media",
    entries: [
      { label: "Image", module: "image", keywords: "picture photo img" },
      { label: "Video", module: "video", keywords: "mp4 player" },
      { label: "YouTube", module: "youtube", keywords: "video embed" },
    ],
  },
  {
    id: "forms",
    label: "Forms",
    entries: [
      { label: "Form Block", module: "form", keywords: "contact" },
      { label: "Label", module: "form-label", keywords: "field label" },
      { label: "Input", module: "input", keywords: "text field" },
      { label: "File Upload", module: "file-upload", keywords: "attachment file" },
      { label: "Text Area", module: "textarea", keywords: "message multiline" },
      { label: "Checkbox", module: "checkbox", keywords: "tick" },
      { label: "Radio Button", module: "radio", keywords: "option" },
      { label: "Select", module: "select-field", keywords: "dropdown options" },
      { label: "Form Button", module: "submit", keywords: "submit send" },
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    entries: [
      { label: "Search", module: "search", keywords: "find query" },
      { label: "Background Video", module: "background-video", keywords: "hero video" },
      { label: "Dropdown", module: "dropdown", keywords: "menu" },
      { label: "Code Embed", module: "embed", keywords: "html iframe script" },
      { label: "Navbar", module: "navbar", keywords: "nav menu header" },
      { label: "Tabs", module: "tabs", keywords: "tabbed panels" },
      { label: "Map", module: "map", keywords: "location address" },
      { label: "Custom Element", module: "custom-element", keywords: "tag web component" },
      { label: "Code Block", module: "code-block", keywords: "pre snippet syntax" },
    ],
  },
  {
    id: "other",
    label: "Other",
    entries: [
      { label: "Grid", module: "grid", keywords: "columns rows layout" },
      { label: "Columns", module: "grid", props: { columns: 2 }, keywords: "two column" },
    ],
  },
]

/**
 * Resolve an entry into the shape the insert/drag paths already take, layering
 * the entry's overrides over the module's own defaults. Returns undefined when
 * the module isn't registered, so a palette entry can be declared ahead of the
 * module without crashing the panel.
 */
export function entryToModuleInfo(entry: PaletteEntry): (ModuleInfo & { label: string }) | undefined {
  const def = registry.get(entry.module)
  if (!def) return undefined
  return {
    label: entry.label,
    name: entry.module,
    category: def.category,
    schema: def.schema,
    defaults: { ...def.defaults, ...(entry.props ?? {}) },
    defaultClasses: entry.classes ?? def.defaultClasses,
    canHaveChildren: def.contentModel.children !== "none",
  }
}

/** Sections with unregistered entries dropped, ready to render. */
export function paletteSections(): Array<{
  id: string
  label: string
  items: Array<{ entry: PaletteEntry; info: ModuleInfo & { label: string } }>
}> {
  return PALETTE.map((s) => ({
    id: s.id,
    label: s.label,
    items: s.entries
      .map((entry) => {
        const info = entryToModuleInfo(entry)
        return info ? { entry, info } : null
      })
      .filter((x): x is { entry: PaletteEntry; info: ModuleInfo & { label: string } } => x !== null),
  })).filter((s) => s.items.length > 0)
}

/** Case-insensitive match over the label, module name and keywords. */
export function entryMatches(entry: PaletteEntry, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return `${entry.label} ${entry.module} ${entry.keywords ?? ""}`.toLowerCase().includes(q)
}
