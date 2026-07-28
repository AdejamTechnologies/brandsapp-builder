/**
 * Structural / page-chrome modules — the semantic scaffolding a page is built
 * FROM (section → container → content), plus list markup, a real nav bar, and a
 * code sample block. Like the other module files, each applies the node's
 * `className` to its root element and spreads `...rootAttrs(p)` (shared helper,
 * see advanced.ts) so the editor canvas can select it via `data-node-id`, and the
 * elementId/customAttributes/keepInHtml/excludeFromSearch capabilities apply;
 * props arrive already sanitized by control type.
 */

import { createElement, type CSSProperties } from "react"

import { ADVANCED_DEFAULTS, ADVANCED_SCHEMA, rootAttrs } from "../advanced"
import type { DefaultChild, ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))
const bool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1"

// ── page chrome ────────────────────────────────────────────────────────────────

const Section: ModuleDefinition = {
  name: "section",
  category: "layout",
  // Same escape hatch as `box`: the semantic tag a page band renders as, so one
  // section can be the page's <header>/<footer>/<main> and another a plain <section>.
  schema: { tag: { type: "plain" }, ...ADVANCED_SCHEMA },
  defaults: { ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  // A full-bleed BAND, not a card — no border/background of its own (the page or a
  // theme pack supplies that). Generous vertical rhythm is what makes it read as a
  // section break; the py-20 alone gives it height even before anything is dropped in.
  defaultClasses: "w-full py-20 px-6",
  Component: (p: ModuleRenderProps) =>
    createElement(str(p.props.tag, "section"), { className: p.className, ...rootAttrs(p) }, p.children),
}

const MAX_WIDTH_STYLE: Record<string, string> = {
  sm: "40rem",
  md: "56rem",
  lg: "72rem",
  xl: "80rem",
  full: "100%",
}

const Container: ModuleDefinition = {
  name: "container",
  category: "layout",
  schema: {
    maxWidth: {
      type: "select",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
        { label: "Extra large", value: "xl" },
        { label: "Full", value: "full" },
      ],
    },
    ...ADVANCED_SCHEMA,
  },
  // No maxWidth set by default — the class already on `defaultClasses` (max-w-6xl,
  // i.e. "lg") applies untouched. Picking a value in the Inspector overrides it with
  // an inline style rather than swapping Tailwind classes, so it's a single
  // predictable code path instead of a class-name lookup table living in two places.
  defaults: { ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  defaultClasses: "w-full max-w-6xl mx-auto px-6 min-h-24",
  Component: (p: ModuleRenderProps) => {
    const mw = p.props.maxWidth != null ? MAX_WIDTH_STYLE[str(p.props.maxWidth)] : undefined
    const style: CSSProperties | undefined = mw ? { maxWidth: mw } : undefined
    return createElement("div", { className: p.className, style, ...rootAttrs(p) }, p.children)
  },
}

// ── nav ──────────────────────────────────────────────────────────────────────

const NAV_LINK_CLASSES = "text-sm text-base-content/70 hover:text-base-content no-underline"

const navLink = (text: string): DefaultChild => ({
  module: "link",
  props: { text, href: "#" },
  classes: NAV_LINK_CLASSES,
})

const Navbar: ModuleDefinition = {
  name: "navbar",
  category: "layout",
  schema: { ...ADVANCED_SCHEMA },
  defaults: { ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  defaultClasses: "w-full max-w-6xl mx-auto flex items-center justify-between gap-6 px-6 py-4",
  // Drops in as a working nav: a wordmark on the left, a row of links on the
  // right — not an empty bar the author has to populate from scratch.
  defaultChildren: [
    {
      module: "heading",
      props: { text: "Brand", level: "3" },
      classes: "font-display text-lg font-bold tracking-tight text-base-content",
    },
    {
      module: "stack",
      props: { direction: "row", gap: "1.5rem", align: "center" },
      classes: "flex items-center gap-6",
      children: [navLink("Home"), navLink("About"), navLink("Pricing"), navLink("Contact")],
    },
  ],
  Component: (p: ModuleRenderProps) => createElement("nav", { className: p.className, ...rootAttrs(p) }, p.children),
}

// ── lists ────────────────────────────────────────────────────────────────────

const ListItem: ModuleDefinition = {
  name: "list-item",
  category: "content",
  schema: { text: { type: "plain" } },
  defaults: { text: "List item" },
  contentModel: { children: "any" },
  // An <li> outside a list is invalid HTML, so the drag layer refuses to drop one
  // anywhere else (see ModuleRegistry.allowsChild).
  allowedParents: ["list"],
  inlineTextEdit: { prop: "text" },
  defaultClasses: "text-base-content/70 leading-relaxed",
  // Same convention as `link`: prefer real children (an icon + text row, say) and
  // fall back to the plain `text` prop when the item has none.
  Component: (p: ModuleRenderProps) =>
    createElement("li", { className: p.className, ...rootAttrs(p) }, p.children ?? str(p.props.text)),
}

const List: ModuleDefinition = {
  name: "list",
  category: "content",
  schema: {
    ordered: {
      type: "select",
      label: "type",
      options: [
        { label: "Unordered", value: "false" },
        { label: "Ordered", value: "true" },
      ],
    },
    bullets: {
      type: "select",
      label: "style",
      options: [
        { label: "Bullets", value: "bullets" },
        { label: "No bullets", value: "none" },
      ],
    },
    ...ADVANCED_SCHEMA,
  },
  defaults: { ordered: "false", bullets: "bullets", ...ADVANCED_DEFAULTS },
  contentModel: { children: ["list-item"] },
  defaultClasses: "flex flex-col gap-2 pl-5 text-base-content",
  // Bullet vs. number is driven by an inline style rather than swapping
  // list-disc/list-decimal utility classes, so it stays correct regardless of
  // what the author does to `classes` in the Inspector afterwards.
  defaultChildren: [
    { module: "list-item", props: { text: "First item" } },
    { module: "list-item", props: { text: "Second item" } },
    { module: "list-item", props: { text: "Third item" } },
  ],
  Component: (p: ModuleRenderProps) => {
    const ordered = bool(p.props.ordered)
    const marker = str(p.props.bullets, "bullets") === "none" ? "none" : ordered ? "decimal" : "disc"
    const style: CSSProperties = {
      listStyleType: marker,
      // Without markers the indent is dead space, so drop it too.
      ...(marker === "none" ? { paddingLeft: 0 } : {}),
    }
    return createElement(ordered ? "ol" : "ul", { className: p.className, style, ...rootAttrs(p) }, p.children)
  },
}

// ── code ─────────────────────────────────────────────────────────────────────

const CodeBlock: ModuleDefinition = {
  name: "code-block",
  category: "advanced",
  schema: { code: { type: "plain" }, language: { type: "plain" } },
  defaults: { code: 'console.log("Hello, world!")', language: "javascript" },
  contentModel: { children: "none" },
  defaultClasses: "font-mono text-sm rounded-2xl bg-base-200 text-base-content p-6 overflow-x-auto",
  // `code` is rendered as a plain text child (React escapes it), never as HTML —
  // this module DISPLAYS source, it must never execute or inject it.
  Component: (p: ModuleRenderProps) =>
    createElement(
      "pre",
      { className: p.className, ...rootAttrs(p) },
      createElement("code", { "data-language": str(p.props.language) || undefined }, str(p.props.code))
    ),
}

export const STRUCTURE_MODULES: ModuleDefinition[] = [Section, Container, Navbar, List, ListItem, CodeBlock]
