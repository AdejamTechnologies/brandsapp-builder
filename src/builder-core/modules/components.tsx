/**
 * Composed UI components — the pieces that appear in every Tailwind component
 * library (shadcn/ui, Preline, Meraki UI, HyperUI, daisyUI) and that a landing
 * page actually needs.
 *
 * Every one here is COMPOSITION, not behaviour: markup plus classes, assembled
 * from primitives that already exist. That is deliberate — nothing in this file
 * needs the runtime, so each drops in working, publishes as plain HTML, and stays
 * fully editable rather than being a black box the author cannot take apart.
 * Components that genuinely need JS (modal, drawer, carousel, toast) are NOT here;
 * they would need runtime hooks and their own tests, and pretending otherwise
 * would ship dead controls.
 *
 * Each carries a variant catalog (see ../variants.ts) reachable from the chip on
 * the selection ring, so the drop-in state is a starting point rather than the
 * only thing on offer.
 */

import { createElement, Children, isValidElement, type ReactNode } from "react"

import { ADVANCED_DEFAULTS, ADVANCED_SCHEMA, rootAttrs } from "../advanced"
import type { DefaultChild, ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))

/**
 * Breadcrumb and pagination render real <ol>/<ul>, and the utility generator runs
 * with PREFLIGHT OFF — so without this a breadcrumb reads "1. Home" and sits 40px
 * indented. Exported so the variant catalog applies the same reset.
 */
export const LIST_RESET = "list-none m-0 p-0"

/** Page-link looks, shared by the module defaults and the variant catalog. */
export const PAGE_LINK =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm text-base-content/70 no-underline hover:bg-base-200 hover:text-base-content"
export const PAGE_CURRENT =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-content no-underline"

/** Wrap each child in an <li> so list semantics survive an arbitrary subtree. */
function asListItems(children: ReactNode): ReactNode {
  return Children.map(children, (c, i) => (isValidElement(c) ? createElement("li", { key: i }, c) : c))
}

// ── card ─────────────────────────────────────────────────────────────────────

const Card: ModuleDefinition = {
  name: "card",
  category: "content",
  schema: { ...ADVANCED_SCHEMA },
  defaults: { ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  defaultClasses: "flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-6",
  defaultChildren: [
    {
      module: "heading",
      props: { text: "Card title", level: "3" },
      classes: "font-display text-lg font-semibold text-base-content",
    },
    {
      module: "text",
      props: { tag: "p", text: "A short description of what this card is about." },
      classes: "text-sm leading-relaxed text-base-content/70",
    },
  ],
  Component: (p: ModuleRenderProps) => createElement("div", { className: p.className, ...rootAttrs(p) }, p.children),
}

// ── alert ────────────────────────────────────────────────────────────────────

const Alert: ModuleDefinition = {
  name: "alert",
  category: "content",
  schema: {
    // `role` rather than a look-only prop: an assertive alert has to interrupt a
    // screen reader, and a decorative one must not. The colour is classes.
    live: {
      type: "select",
      label: "announce",
      segmented: true,
      options: [
        { label: "Polite", value: "status" },
        { label: "Assertive", value: "alert" },
      ],
    },
    ...ADVANCED_SCHEMA,
  },
  defaults: { live: "status", ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  defaultClasses: "flex items-start gap-3 rounded-xl border border-info/30 bg-info/10 p-4 text-info-content",
  defaultChildren: [
    {
      module: "text",
      props: { tag: "p", text: "Heads up — this is something worth knowing." },
      classes: "text-sm leading-relaxed text-base-content",
    },
  ],
  Component: (p: ModuleRenderProps) =>
    createElement(
      "div",
      { className: p.className, role: str(p.props.live, "status"), ...rootAttrs(p) },
      p.children
    ),
}

// ── badge ────────────────────────────────────────────────────────────────────

const Badge: ModuleDefinition = {
  name: "badge",
  category: "content",
  schema: { text: { type: "plain" }, ...ADVANCED_SCHEMA },
  defaults: { text: "Badge", ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  inlineTextEdit: { prop: "text" },
  defaultClasses:
    "inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-content",
  // Same convention as `link`: real children win, the text prop is the fallback.
  Component: (p: ModuleRenderProps) =>
    createElement("span", { className: p.className, ...rootAttrs(p) }, p.children ?? str(p.props.text)),
}

// ── avatar ───────────────────────────────────────────────────────────────────

const Avatar: ModuleDefinition = {
  name: "avatar",
  category: "media",
  schema: { ...ADVANCED_SCHEMA },
  defaults: { ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  // A wrapper, not an <img>: the ring, the status dot and the initials fallback
  // are all siblings of the image, and a bare img has nowhere to put them.
  defaultClasses: "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-base-200",
  defaultChildren: [
    {
      module: "image",
      props: { src: "https://i.pravatar.cc/160?img=12", alt: "" },
      classes: "size-full rounded-full object-cover",
    },
  ],
  Component: (p: ModuleRenderProps) => createElement("span", { className: p.className, ...rootAttrs(p) }, p.children),
}

// ── breadcrumb ───────────────────────────────────────────────────────────────

const Breadcrumb: ModuleDefinition = {
  name: "breadcrumb",
  category: "layout",
  schema: { label: { type: "plain", label: "aria label" }, ...ADVANCED_SCHEMA },
  defaults: { label: "Breadcrumb", ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  defaultClasses: LIST_RESET + " flex items-center gap-2 text-sm text-base-content/60",
  defaultChildren: [
    { module: "link", props: { text: "Home", href: "#" }, classes: "no-underline hover:text-base-content" },
    { module: "text", props: { tag: "span", text: "/" }, classes: "text-base-content/30" },
    { module: "link", props: { text: "Products", href: "#" }, classes: "no-underline hover:text-base-content" },
    { module: "text", props: { tag: "span", text: "/" }, classes: "text-base-content/30" },
    { module: "text", props: { tag: "span", text: "Current page" }, classes: "text-base-content" },
  ],
  // <nav><ol> is the semantic shape assistive tech expects; the separators are
  // authored nodes so they can be restyled or swapped for a chevron.
  Component: (p: ModuleRenderProps) =>
    createElement(
      "nav",
      { "aria-label": str(p.props.label, "Breadcrumb"), ...rootAttrs(p) },
      createElement("ol", { className: p.className }, asListItems(p.children))
    ),
}

// ── pagination ───────────────────────────────────────────────────────────────

const Pagination: ModuleDefinition = {
  name: "pagination",
  category: "layout",
  schema: { label: { type: "plain", label: "aria label" }, ...ADVANCED_SCHEMA },
  defaults: { label: "Pagination", ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  defaultClasses: LIST_RESET + " flex items-center gap-1",
  defaultChildren: [
    { module: "link", props: { text: "Previous", href: "#" }, classes: PAGE_LINK },
    { module: "link", props: { text: "1", href: "#" }, classes: PAGE_CURRENT },
    { module: "link", props: { text: "2", href: "#" }, classes: PAGE_LINK },
    { module: "link", props: { text: "3", href: "#" }, classes: PAGE_LINK },
    { module: "link", props: { text: "Next", href: "#" }, classes: PAGE_LINK },
  ],
  Component: (p: ModuleRenderProps) =>
    createElement(
      "nav",
      { "aria-label": str(p.props.label, "Pagination"), ...rootAttrs(p) },
      createElement("ul", { className: p.className }, asListItems(p.children))
    ),
}

// ── footer ───────────────────────────────────────────────────────────────────

const Footer: ModuleDefinition = {
  name: "footer",
  category: "layout",
  schema: { ...ADVANCED_SCHEMA },
  defaults: { ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  // A real <footer>, not a div: it is a landmark, and assistive tech offers it as
  // one. Full-bleed with its own top rule, because a footer marks the end of the
  // page rather than sitting inside the content column.
  defaultClasses: "w-full border-t border-base-300 bg-base-100 px-6 py-12",
  defaultChildren: [
    {
      module: "box",
      classes: "mx-auto flex w-full max-w-6xl flex-col gap-8",
      children: [
        {
          module: "heading",
          props: { text: "Brand", level: "3" },
          classes: "font-display text-lg font-bold tracking-tight text-base-content",
        },
        {
          module: "text",
          props: { tag: "p", text: "© 2026 Brand. All rights reserved." },
          classes: "text-sm text-base-content/55",
        },
      ],
    },
  ],
  Component: (p: ModuleRenderProps) =>
    createElement("footer", { className: p.className, ...rootAttrs(p) }, p.children),
}

export const COMPONENT_MODULES: ModuleDefinition[] = [
  Card,
  Alert,
  Badge,
  Avatar,
  Breadcrumb,
  Pagination,
  Footer,
]
