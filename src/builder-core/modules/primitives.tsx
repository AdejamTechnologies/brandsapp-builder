/**
 * The v1 primitive module set (primitives-as-code). Low-level, flow-layout blocks
 * that a Fragment/template composes. Each applies the node's `className` (style
 * sources + per-node CSS) to its root element; props are already sanitized by
 * control type before they arrive here.
 *
 * In editor mode each root element also carries `data-node-id` so the canvas can
 * map a click/drag to its node WITHOUT a wrapper element (a wrapper would break
 * flex/grid authoring). Outside the editor (`isEditor` false — i.e. SSR/publish)
 * nothing extra is emitted.
 */

import { createElement, type CSSProperties } from "react"

import type { ModuleDefinition, ModuleRenderProps } from "../registry"

const str = (v: unknown, d = "") => (v == null ? d : String(v))
const num = (v: unknown, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

/** Editor-only DOM attrs: tag the real element with its node id for selection. */
const ed = (p: ModuleRenderProps): { "data-node-id"?: string } =>
  p.isEditor ? { "data-node-id": p.nodeId } : {}

// ── containers ──────────────────────────────────────────────────────────────

const PageRoot: ModuleDefinition = {
  name: "page-root",
  category: "layout",
  schema: {},
  defaults: {},
  contentModel: { children: "any" },
  Component: (p: ModuleRenderProps) =>
    createElement("div", { className: p.className, ...ed(p) }, p.children),
}

const Box: ModuleDefinition = {
  name: "box",
  category: "layout",
  schema: { tag: { type: "plain" } },
  defaults: {},
  contentModel: { children: "any" },
  defaultClasses: "p-8 rounded-2xl border border-base-300 bg-base-100 min-h-24",
  Component: (p: ModuleRenderProps) =>
    createElement(str(p.props.tag, "div"), { className: p.className, ...ed(p) }, p.children),
}

const Stack: ModuleDefinition = {
  name: "stack",
  category: "layout",
  schema: {
    direction: { type: "select", options: [{ label: "Column", value: "column" }, { label: "Row", value: "row" }] },
    gap: { type: "plain" },
    align: { type: "plain" },
    justify: { type: "plain" },
  },
  defaults: { direction: "column" },
  contentModel: { children: "any" },
  defaultClasses: "p-6 rounded-2xl border border-base-300 bg-base-100 min-h-24",
  Component: (p: ModuleRenderProps) => {
    const style: CSSProperties = {
      display: "flex",
      flexDirection: str(p.props.direction, "column") === "row" ? "row" : "column",
      gap: p.props.gap != null ? str(p.props.gap) : undefined,
      alignItems: p.props.align != null ? str(p.props.align) : undefined,
      justifyContent: p.props.justify != null ? str(p.props.justify) : undefined,
    }
    return createElement("div", { className: p.className, style, ...ed(p) }, p.children)
  },
}

const Grid: ModuleDefinition = {
  name: "grid",
  category: "layout",
  schema: { columns: { type: "number" }, gap: { type: "plain" } },
  defaults: { columns: 3 },
  contentModel: { children: "any" },
  defaultClasses: "p-6 rounded-2xl border border-base-300 bg-base-100 min-h-24",
  Component: (p: ModuleRenderProps) => {
    const cols = Math.min(Math.max(num(p.props.columns, 3), 1), 12)
    const style: CSSProperties = {
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: p.props.gap != null ? str(p.props.gap) : "1rem",
    }
    return createElement("div", { className: p.className, style, ...ed(p) }, p.children)
  },
}

const Divider: ModuleDefinition = {
  name: "divider",
  category: "layout",
  schema: {},
  defaults: {},
  contentModel: { children: "none" },
  // Drawn as a 1px BACKGROUND, not a border. A bare <hr> was invisible when
  // dropped: utilities are generated with `preflights: false`, so `border-t`
  // sets a width against a default border-style of `none`, and the editor's own
  // Tailwind reset zeroes hr borders anyway. h-px + bg needs neither reset.
  defaultClasses: "w-full h-px border-0 bg-base-300 my-6",
  Component: (p: ModuleRenderProps) => createElement("hr", { className: p.className, ...ed(p) }),
}

const Spacer: ModuleDefinition = {
  name: "spacer",
  category: "layout",
  schema: { size: { type: "plain" } },
  defaults: { size: "2rem" },
  contentModel: { children: "none" },
  Component: (p: ModuleRenderProps) =>
    createElement("div", { className: p.className, style: { height: str(p.props.size, "2rem") }, ...ed(p) }),
}

// ── content ─────────────────────────────────────────────────────────────────

const Heading: ModuleDefinition = {
  name: "heading",
  category: "content",
  schema: {
    text: { type: "plain" },
    level: { type: "select", options: [1, 2, 3, 4, 5, 6].map((n) => ({ label: `H${n}`, value: String(n) })) },
  },
  defaults: { text: "Heading", level: "2" },
  // Typography carries the page, so a dropped heading should already sit on the
  // house scale — display face, tight tracking, theme ink — instead of falling
  // back to the browser's default h2. Same vocabulary the sample pages use.
  defaultClasses: "font-display text-3xl font-bold tracking-tight text-base-content",
  contentModel: { children: "none" },
  inlineTextEdit: { prop: "text" },
  Component: (p: ModuleRenderProps) => {
    const lvl = Math.min(Math.max(num(p.props.level, 2), 1), 6)
    return createElement(`h${lvl}`, { className: p.className, ...ed(p) }, str(p.props.text))
  },
}

const Text: ModuleDefinition = {
  name: "text",
  category: "content",
  schema: { text: { type: "plain" }, tag: { type: "plain" } },
  defaults: { text: "Text", tag: "p" },
  defaultClasses: "text-base leading-relaxed text-base-content/70",
  contentModel: { children: "none" },
  inlineTextEdit: { prop: "text", multiline: true },
  Component: (p: ModuleRenderProps) =>
    createElement(str(p.props.tag, "p"), { className: p.className, ...ed(p) }, str(p.props.text)),
}

const RichText: ModuleDefinition = {
  name: "richtext",
  category: "content",
  schema: { html: { type: "richtext" } },
  // Placeholder copy, the same convention heading/text use. Empty content plus no
  // styling made this drop in as a zero-height div — invisible AND unselectable.
  // It's replaced the moment you type.
  defaults: { html: "<p>Rich text. Double-click to edit, or paste HTML in Settings.</p>" },
  contentModel: { children: "none" },
  // Edited in place like heading/text, but committed as HTML so formatting the
  // author applied (and the tags they pasted) survive the round-trip.
  inlineTextEdit: { prop: "html", multiline: true, html: true },
  defaultClasses: "leading-relaxed text-base-content/70",
  Component: (p: ModuleRenderProps) =>
    createElement("div", { className: p.className, dangerouslySetInnerHTML: { __html: str(p.props.html) }, ...ed(p) }),
}

const Image: ModuleDefinition = {
  name: "image",
  category: "media",
  schema: { src: { type: "media" }, alt: { type: "plain" } },
  defaults: { src: "https://placehold.co/600x300/e2e8f0/94a3b8?text=Image", alt: "" },
  contentModel: { children: "none" },
  // min-h + a tinted ground so the slot is visible even while the image is still
  // loading, or if its src is cleared/broken — an <img> with no usable source
  // collapses to zero height and the element vanishes off the canvas.
  defaultClasses: "w-full max-w-md rounded-2xl min-h-40 bg-base-200",
  Component: (p: ModuleRenderProps) =>
    createElement("img", { className: p.className, src: str(p.props.src), alt: str(p.props.alt), loading: "lazy", ...ed(p) }),
}

// A neutral placeholder glyph so a dropped icon is visible and selectable before
// you paste your own SVG (an empty <span> measures 0x0 and cannot be clicked).
const PLACEHOLDER_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2.5"/></svg>'

const Icon: ModuleDefinition = {
  name: "icon",
  category: "media",
  schema: { svg: { type: "svg" } },
  defaults: { svg: PLACEHOLDER_ICON },
  contentModel: { children: "none" },
  defaultClasses: "inline-block w-6 h-6 text-base-content",
  Component: (p: ModuleRenderProps) =>
    createElement("span", {
      className: p.className,
      "aria-hidden": true,
      dangerouslySetInnerHTML: { __html: str(p.props.svg) },
      ...ed(p),
    }),
}

// ── interactive ─────────────────────────────────────────────────────────────

const Button: ModuleDefinition = {
  name: "button",
  category: "interactive",
  schema: { label: { type: "plain" }, href: { type: "url" } },
  defaults: { label: "Button", href: "" },
  contentModel: { children: "none" },
  inlineTextEdit: { prop: "label" },
  defaultClasses:
    "inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary text-primary-content text-sm font-medium no-underline transition-colors hover:bg-primary/90",
  Component: (p: ModuleRenderProps) => {
    const href = str(p.props.href)
    return href
      ? createElement("a", { className: p.className, href, ...ed(p) }, str(p.props.label))
      : createElement("button", { className: p.className, type: "button", ...ed(p) }, str(p.props.label))
  },
}

const Link: ModuleDefinition = {
  name: "link",
  category: "interactive",
  schema: { href: { type: "url" }, text: { type: "plain" } },
  defaults: { href: "#", text: "Link" },
  contentModel: { children: "any" },
  defaultClasses:
    "text-primary underline underline-offset-4 decoration-primary/30 transition-colors hover:decoration-primary",
  Component: (p: ModuleRenderProps) =>
    createElement("a", { className: p.className, href: str(p.props.href, "#"), ...ed(p) }, p.children ?? str(p.props.text)),
}

const Embed: ModuleDefinition = {
  name: "embed",
  category: "advanced",
  schema: { html: { type: "richtext" } },
  // Placeholder markup rather than a styled empty-state frame: it disappears as
  // soon as real embed code is pasted, whereas a dashed placeholder BORDER would
  // linger around the author's iframe and follow it into the published page.
  defaults: { html: '<p style="text-align:center;opacity:.6">Embed — paste HTML or an iframe in Settings.</p>' },
  contentModel: { children: "none" },
  defaultClasses: "w-full py-6",
  Component: (p: ModuleRenderProps) =>
    createElement("div", { className: p.className, dangerouslySetInnerHTML: { __html: str(p.props.html) }, ...ed(p) }),
}

export const PRIMITIVES: ModuleDefinition[] = [
  PageRoot,
  Box,
  Stack,
  Grid,
  Divider,
  Spacer,
  Heading,
  Text,
  RichText,
  Image,
  Icon,
  Button,
  Link,
  Embed,
]
