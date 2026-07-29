import {
  AlignLeft, AtSign, Box, Boxes, Braces, ChevronDown, CircleDot, ClipboardList, Code, Code2,
  Columns3, CornerDownRight, Expand, Film, FormInput, Frame, Heading, Image as ImageIcon,
  LayoutGrid, Link, Link2, List, MapPin, Menu, MousePointerClick, PanelTop, Pilcrow, Play,
  Quote, Rows3, Search, Shapes, ShieldCheck, Sparkles, Square, SquareCheck, Tag, ThumbsUp,
  Type, Upload, Video,
  AlertCircle, Badge as BadgeIcon, ChevronsRight, CircleUser, CreditCard, Ellipsis,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

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
  /**
   * Glyph shown in the panel. Per ENTRY rather than per module, because entries
   * that share a module still need telling apart at a glance — V Flex and H Flex
   * are one `stack`, and the icon is the only thing distinguishing them.
   */
  icon: LucideIcon
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
      { label: "Section", icon: PanelTop, module: "section", keywords: "band region" },
      { label: "Container", icon: Frame, module: "container", keywords: "wrapper centred" },
      { label: "Quick Stack", icon: LayoutGrid, module: "grid", props: { columns: 2 }, keywords: "layout responsive" },
      { label: "V Flex", icon: Rows3, module: "stack", props: { direction: "column" }, keywords: "vertical column flex" },
      { label: "H Flex", icon: Columns3, module: "stack", props: { direction: "row" }, keywords: "horizontal row flex" },
    ],
  },
  {
    id: "basic",
    label: "Basic",
    entries: [
      { label: "Div Block", icon: Square, module: "box", keywords: "div container block" },
      { label: "List", icon: List, module: "list", keywords: "ul ol bullets" },
      { label: "List Item", icon: CornerDownRight, module: "list-item", keywords: "li" },
      {
        label: "Link Block", icon: Link,
        module: "link",
        classes: "block no-underline text-inherit",
        keywords: "anchor wrapper clickable",
      },
      { label: "Button", icon: MousePointerClick, module: "button", keywords: "cta" },
    ],
  },
  {
    id: "typography",
    label: "Typography",
    entries: [
      { label: "Heading", icon: Heading, module: "heading", keywords: "h1 h2 title" },
      { label: "Paragraph", icon: Pilcrow, module: "text", props: { tag: "p" }, keywords: "copy body" },
      { label: "Text Link", icon: Link2, module: "link", keywords: "anchor href" },
      { label: "Text Block", icon: Type, module: "text", props: { tag: "div" }, keywords: "copy span" },
      {
        label: "Block Quote", icon: Quote,
        module: "text",
        props: { tag: "blockquote", text: "A quote worth pulling out of the copy." },
        classes: "border-l-2 border-primary pl-5 text-lg italic leading-relaxed text-base-content/80",
        keywords: "quote pullquote",
      },
      { label: "Rich Text", icon: AlignLeft, module: "richtext", keywords: "wysiwyg html prose" },
    ],
  },
  {
    id: "media",
    label: "Media",
    entries: [
      { label: "Image", icon: ImageIcon, module: "image", keywords: "picture photo img" },
      // Not one of Webflow's elements, added deliberately: we ship a curated icon
      // library, and without an entry here the picker is only reachable on icon
      // nodes that a variant already placed.
      { label: "Icon", icon: Shapes, module: "icon", keywords: "svg glyph symbol pictogram" },
      { label: "Video", icon: Video, module: "video", keywords: "mp4 player embed vimeo" },
      { label: "YouTube", icon: Play, module: "youtube", keywords: "video embed" },
      { label: "Lottie Animation", icon: Sparkles, module: "lottie", keywords: "animation json motion" },
      { label: "Spline Scene", icon: Box, module: "spline", keywords: "3d scene splinecode" },
      { label: "Rive", icon: Boxes, module: "rive", keywords: "animation riv interactive state machine" },
      { label: "Lightbox", icon: Expand, module: "lightbox", keywords: "gallery modal zoom image popup" },
    ],
  },
  {
    id: "forms",
    label: "Forms",
    entries: [
      { label: "Form Block", icon: ClipboardList, module: "form", keywords: "contact" },
      { label: "Label", icon: Tag, module: "form-label", keywords: "field label" },
      { label: "Input", icon: FormInput, module: "input", keywords: "text field" },
      { label: "File Upload", icon: Upload, module: "file-upload", keywords: "attachment file" },
      { label: "Text Area", icon: AlignLeft, module: "textarea", keywords: "message multiline" },
      { label: "Checkbox", icon: SquareCheck, module: "checkbox", keywords: "tick" },
      { label: "Radio Button", icon: CircleDot, module: "radio", keywords: "option" },
      { label: "Select", icon: ChevronDown, module: "select-field", keywords: "dropdown options" },
      { label: "Form Button", icon: MousePointerClick, module: "submit", keywords: "submit send" },
      { label: "reCAPTCHA", icon: ShieldCheck, module: "recaptcha", keywords: "captcha spam bot verify" },
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    entries: [
      { label: "Search", icon: Search, module: "search", keywords: "find query" },
      { label: "Background Video", icon: Film, module: "background-video", keywords: "hero video" },
      { label: "Dropdown", icon: ChevronDown, module: "dropdown", keywords: "menu" },
      { label: "Code Embed", icon: Code2, module: "embed", keywords: "html iframe script" },
      { label: "Navbar", icon: Menu, module: "navbar", keywords: "nav menu header" },
      { label: "Tabs", icon: PanelTop, module: "tabs", keywords: "tabbed panels" },
      { label: "Map", icon: MapPin, module: "map", keywords: "location address" },
      { label: "Custom Element", icon: Braces, module: "custom-element", keywords: "tag web component" },
      { label: "Code Block", icon: Code, module: "code-block", keywords: "pre snippet syntax" },
      { label: "Facebook", icon: ThumbsUp, module: "facebook", keywords: "social like share" },
      { label: "X (Twitter)", icon: AtSign, module: "x-twitter", keywords: "social tweet follow" },
    ],
  },
  {
    id: "other",
    label: "Other",
    entries: [
      { label: "Grid", icon: LayoutGrid, module: "grid", keywords: "columns rows layout" },
      { label: "Columns", icon: Columns3, module: "grid", props: { columns: 2 }, keywords: "two column" },
      // Composed components — the common ground of shadcn/Preline/Meraki/HyperUI/
      // daisyUI. Each carries a variant catalog (see component-variants.ts), so the
      // drop-in state is a starting point rather than the only thing on offer.
      { label: "Card", icon: CreditCard, module: "card", keywords: "panel tile box surface" },
      { label: "Alert", icon: AlertCircle, module: "alert", keywords: "notice banner callout message" },
      { label: "Badge", icon: BadgeIcon, module: "badge", keywords: "chip tag pill label status" },
      { label: "Avatar", icon: CircleUser, module: "avatar", keywords: "profile photo user face" },
      { label: "Breadcrumb", icon: ChevronsRight, module: "breadcrumb", keywords: "trail path navigation" },
      { label: "Pagination", icon: Ellipsis, module: "pagination", keywords: "pages pager next previous" },
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
