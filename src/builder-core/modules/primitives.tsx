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

import { ADVANCED_DEFAULTS, ADVANCED_SCHEMA, rootAttrs, truthyProp } from "../advanced"
import { LINK_DEFAULTS, LINK_SCHEMA, linkAttrs, resolveHref } from "../link"
import type { ModuleDefinition, ModuleRenderProps } from "../registry"

/**
 * Button variants, in shadcn's vocabulary so the naming is familiar. Each maps to
 * theme tokens rather than fixed colours, so a tenant's palette re-skins them.
 */
const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium no-underline transition-colors disabled:pointer-events-none disabled:opacity-50"
const BUTTON_VARIANTS: Record<string, string> = {
  default: "bg-primary text-primary-content hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-content hover:bg-secondary/85",
  outline: "border border-base-300 bg-base-100 text-base-content hover:bg-base-200",
  ghost: "text-base-content hover:bg-base-200",
  link: "text-primary underline underline-offset-4 hover:decoration-primary",
  destructive: "bg-error text-error-content hover:bg-error/90",
}
const BUTTON_SIZES: Record<string, string> = {
  sm: "h-9 px-4 text-sm",
  default: "h-11 px-6 text-sm",
  lg: "h-12 px-8 text-base",
  icon: "size-11 p-0",
}
/** Every class any variant/size can contribute — the Inspector strips these
 *  before applying a new pair, so switching variants doesn't accumulate. */
export const ALL_BUTTON_TOKENS: string[] = [
  ...new Set(
    [BUTTON_BASE, ...Object.values(BUTTON_VARIANTS), ...Object.values(BUTTON_SIZES)]
      .join(" ")
      .split(/\s+/)
      .filter(Boolean)
  ),
]

/** Classes for a variant+size pair, used as the button's defaultClasses. */
export const buttonClasses = (variant = "default", size = "default"): string =>
  [BUTTON_BASE, BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.default, BUTTON_SIZES[size] ?? BUTTON_SIZES.default].join(" ")

const str = (v: unknown, d = "") => (v == null ? d : String(v))
const num = (v: unknown, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

/**
 * Image `width`/`height`: author types "Auto" (or leaves it blank) to emit no
 * attribute at all — the element sizes itself from CSS/its own intrinsic size
 * — or a plain number/`px` value to pin it, matching Webflow's own field. Never
 * returns 0/negative: an attribute of `width="0"` would hide the image, which
 * is never what a blank-ish value means here.
 */
const parseDimension = (v: unknown): number | undefined => {
  const s = str(v).trim()
  if (!s || /^auto$/i.test(s)) return undefined
  const n = Number(s.replace(/px$/i, "").trim())
  return Number.isFinite(n) && n > 0 ? n : undefined
}

// ── containers ──────────────────────────────────────────────────────────────

const PageRoot: ModuleDefinition = {
  name: "page-root",
  category: "layout",
  schema: {},
  defaults: {},
  contentModel: { children: "any" },
  Component: (p: ModuleRenderProps) =>
    createElement("div", { className: p.className, ...rootAttrs(p) }, p.children),
}

const Box: ModuleDefinition = {
  name: "box",
  category: "layout",
  schema: { tag: { type: "plain" }, ...ADVANCED_SCHEMA },
  defaults: { ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  defaultClasses: "p-8 rounded-2xl border border-base-300 bg-base-100 min-h-24",
  Component: (p: ModuleRenderProps) =>
    createElement(str(p.props.tag, "div"), { className: p.className, ...rootAttrs(p) }, p.children),
}

const Stack: ModuleDefinition = {
  name: "stack",
  category: "layout",
  schema: {
    direction: { type: "select", options: [{ label: "Column", value: "column" }, { label: "Row", value: "row" }] },
    gap: { type: "plain" },
    align: { type: "plain" },
    justify: { type: "plain" },
    ...ADVANCED_SCHEMA,
  },
  defaults: { direction: "column", ...ADVANCED_DEFAULTS },
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
    return createElement("div", { className: p.className, style, ...rootAttrs(p) }, p.children)
  },
}

const Grid: ModuleDefinition = {
  name: "grid",
  category: "layout",
  schema: { columns: { type: "number" }, rows: { type: "number" }, gap: { type: "plain" }, ...ADVANCED_SCHEMA },
  defaults: { columns: 3, rows: 1, ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  defaultClasses: "p-6 rounded-2xl border border-base-300 bg-base-100 min-h-24",
  Component: (p: ModuleRenderProps) => {
    const cols = Math.min(Math.max(num(p.props.columns, 3), 1), 12)
    const rows = Math.min(Math.max(num(p.props.rows, 1), 1), 12)
    const style: CSSProperties = {
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      // Only pin row tracks when more than one is asked for — an implicit single
      // row lets content size itself, which is what most grids want.
      ...(rows > 1 ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` } : {}),
      gap: p.props.gap != null ? str(p.props.gap) : "1rem",
    }
    // EDITOR ONLY: an empty grid is an empty box — you can't see the shape you
    // just picked. Draw the tracks as dashed cell ghosts so the structure is
    // visible before anything is in it (Webflow does the same). Never emitted on
    // a published page, and they disappear as soon as the grid has content.
    const kids = Array.isArray(p.children) ? p.children.filter(Boolean) : p.children
    const isEmpty = !kids || (Array.isArray(kids) && kids.length === 0)
    const ghosts =
      p.isEditor && isEmpty
        ? Array.from({ length: cols * rows }, (_, i) =>
            createElement("div", {
              key: `cell${i}`,
              "data-bapp-cell": "",
              style: {
                border: "1px dashed rgba(10, 132, 255, 0.4)",
                borderRadius: "4px",
                minHeight: "56px",
              },
            })
          )
        : null
    return createElement("div", { className: p.className, style, ...rootAttrs(p) }, ghosts ?? p.children)
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
  Component: (p: ModuleRenderProps) => createElement("hr", { className: p.className, ...rootAttrs(p) }),
}

const Spacer: ModuleDefinition = {
  name: "spacer",
  category: "layout",
  schema: { size: { type: "plain" } },
  defaults: { size: "2rem" },
  contentModel: { children: "none" },
  Component: (p: ModuleRenderProps) =>
    createElement("div", { className: p.className, style: { height: str(p.props.size, "2rem") }, ...rootAttrs(p) }),
}

// ── content ─────────────────────────────────────────────────────────────────

const Heading: ModuleDefinition = {
  name: "heading",
  category: "content",
  schema: {
    text: { type: "plain" },
    level: {
      type: "select",
      label: "tag",
      segmented: true,
      options: [1, 2, 3, 4, 5, 6].map((n) => ({ label: `H${n}`, value: String(n) })),
    },
    ...ADVANCED_SCHEMA,
  },
  defaults: { text: "Heading", level: "2", ...ADVANCED_DEFAULTS },
  // Typography carries the page, so a dropped heading should already sit on the
  // house scale — display face, tight tracking, theme ink — instead of falling
  // back to the browser's default h2. Same vocabulary the sample pages use.
  defaultClasses: "font-display text-3xl font-bold tracking-tight text-base-content",
  contentModel: { children: "none" },
  inlineTextEdit: { prop: "text" },
  Component: (p: ModuleRenderProps) => {
    const lvl = Math.min(Math.max(num(p.props.level, 2), 1), 6)
    return createElement(`h${lvl}`, { className: p.className, ...rootAttrs(p) }, str(p.props.text))
  },
}

const Text: ModuleDefinition = {
  name: "text",
  category: "content",
  schema: { text: { type: "plain", multiline: true }, tag: { type: "plain" }, ...ADVANCED_SCHEMA },
  defaults: { text: "Text", tag: "p", ...ADVANCED_DEFAULTS },
  defaultClasses: "text-base leading-relaxed text-base-content/70",
  contentModel: { children: "none" },
  inlineTextEdit: { prop: "text", multiline: true },
  Component: (p: ModuleRenderProps) =>
    createElement(str(p.props.tag, "p"), { className: p.className, ...rootAttrs(p) }, str(p.props.text)),
}

// The only tags richtext is allowed to render as — all plain flow containers,
// so wrapping arbitrary sanitized HTML in any of them is always valid markup.
const RICHTEXT_TAGS = new Set(["div", "section", "article", "main", "aside"])
const sanitizeRichTextTag = (v: unknown): string => {
  const s = str(v, "div")
  return RICHTEXT_TAGS.has(s) ? s : "div"
}

const RichText: ModuleDefinition = {
  name: "richtext",
  category: "content",
  schema: {
    html: { type: "richtext" },
    tag: {
      type: "select",
      label: "tag",
      options: [
        { label: "Div", value: "div" },
        { label: "Section", value: "section" },
        { label: "Article", value: "article" },
        { label: "Main", value: "main" },
        { label: "Aside", value: "aside" },
      ],
    },
  },
  // Placeholder copy, the same convention heading/text use. Empty content plus no
  // styling made this drop in as a zero-height div — invisible AND unselectable.
  // It's replaced the moment you type.
  defaults: { html: "<p>Rich text. Double-click to edit, or paste HTML in Settings.</p>", tag: "div" },
  contentModel: { children: "none" },
  // Edited in place like heading/text, but committed as HTML so formatting the
  // author applied (and the tags they pasted) survive the round-trip.
  inlineTextEdit: { prop: "html", multiline: true, html: true },
  defaultClasses: "leading-relaxed text-base-content/70",
  Component: (p: ModuleRenderProps) =>
    createElement(sanitizeRichTextTag(p.props.tag), {
      className: p.className,
      dangerouslySetInnerHTML: { __html: str(p.props.html) },
      ...rootAttrs(p),
    }),
}

const Image: ModuleDefinition = {
  name: "image",
  category: "media",
  schema: {
    src: { type: "media" },
    altMode: {
      type: "select",
      label: "alt text",
      options: [
        { label: "Use asset's alt text", value: "asset" },
        { label: "Set custom alt text", value: "custom" },
        { label: "Decorative image", value: "decorative" },
      ],
    },
    // Free-typed only in "custom" mode. In "asset" mode the VALUE still renders
    // (see Component) — it's meant to be populated by the media picker off the
    // chosen asset's own stored alt text rather than hand-typed here, so the box
    // is hidden rather than the capability being dropped. In "decorative" mode
    // the value is ignored outright and forced to "".
    alt: { type: "plain", label: "alt text", showIf: { altMode: ["custom"] } },
    hiDpi: { type: "boolean", label: "HiDPI image" },
    disableResponsive: { type: "boolean", label: "disable responsive sizes" },
    width: { type: "plain", label: "width" },
    height: { type: "plain", label: "height" },
    loading: {
      type: "select",
      label: "loading",
      options: [
        { label: "Lazy: loads on scroll", value: "lazy" },
        { label: "Eager: loads immediately", value: "eager" },
      ],
    },
    ...ADVANCED_SCHEMA,
  },
  defaults: {
    src: "https://placehold.co/600x300/e2e8f0/94a3b8?text=Image",
    altMode: "asset",
    alt: "",
    hiDpi: false,
    disableResponsive: false,
    width: "Auto",
    height: "Auto",
    loading: "lazy",
    ...ADVANCED_DEFAULTS,
  },
  contentModel: { children: "none" },
  // min-h + a tinted ground so the slot is visible even while the image is still
  // loading, or if its src is cleared/broken — an <img> with no usable source
  // collapses to zero height and the element vanishes off the canvas.
  defaultClasses: "w-full max-w-md rounded-2xl min-h-40 bg-base-200",
  Component: (p: ModuleRenderProps) => {
    const src = str(p.props.src)
    const decorative = str(p.props.altMode, "asset") === "decorative"
    const width = parseDimension(p.props.width)
    const height = parseDimension(p.props.height)
    const loading = str(p.props.loading, "lazy") === "eager" ? "eager" : "lazy"
    return createElement("img", {
      className: p.className,
      src,
      // Decorative MUST both blank the alt AND take the image out of the
      // accessibility tree — `alt=""` alone still leaves some assistive tech
      // free to fall back to the filename/title; `role="presentation"` is what
      // actually suppresses that. That pairing is the entire point of the option.
      alt: decorative ? "" : str(p.props.alt),
      ...(decorative ? { role: "presentation" } : {}),
      // One 2x descriptor is the whole of our responsive story today — there is
      // no width-descriptor srcset, so no accompanying `sizes` to withhold.
      // `disableResponsive` simply refuses to emit even that, hiDpi or not.
      ...(truthyProp(p.props.hiDpi) && !truthyProp(p.props.disableResponsive) && src
        ? { srcSet: `${src} 2x` }
        : {}),
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
      loading,
      ...rootAttrs(p),
    })
  },
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
      ...rootAttrs(p),
    }),
}

// ── interactive ─────────────────────────────────────────────────────────────

const Button: ModuleDefinition = {
  name: "button",
  category: "interactive",
  schema: {
    label: { type: "plain" },
    variant: {
      type: "select",
      label: "variant",
      options: ["default", "secondary", "outline", "ghost", "link", "destructive"].map((v) => ({
        label: v[0].toUpperCase() + v.slice(1),
        value: v,
      })),
    },
    size: {
      type: "select",
      label: "size",
      options: [
        { label: "Small", value: "sm" },
        { label: "Default", value: "default" },
        { label: "Large", value: "lg" },
        { label: "Icon", value: "icon" },
      ],
    },
    ...LINK_SCHEMA,
    ...ADVANCED_SCHEMA,
  },
  defaults: { label: "Button", variant: "default", size: "default", ...LINK_DEFAULTS, href: "", ...ADVANCED_DEFAULTS },
  contentModel: { children: "none" },
  inlineTextEdit: { prop: "label" },
  defaultClasses: buttonClasses(),
  Component: (p: ModuleRenderProps) => {
    const href = resolveHref(p.props)
    // Variant/size drive the LOOK only when the author hasn't taken over the
    // classes themselves — otherwise switching variant would silently discard
    // their styling. `className` already carries whatever they set.
    return href
      ? createElement(
          "a",
          { className: p.className, href, ...linkAttrs(p.props), ...rootAttrs(p) },
          str(p.props.label)
        )
      : createElement("button", { className: p.className, type: "button", ...rootAttrs(p) }, str(p.props.label))
  },
}

const Link: ModuleDefinition = {
  name: "link",
  category: "interactive",
  schema: { text: { type: "plain" }, ...LINK_SCHEMA, ...ADVANCED_SCHEMA },
  defaults: { text: "Link", ...LINK_DEFAULTS, ...ADVANCED_DEFAULTS },
  contentModel: { children: "any" },
  inlineTextEdit: { prop: "text" },
  defaultClasses:
    "text-primary underline underline-offset-4 decoration-primary/30 transition-colors hover:decoration-primary",
  Component: (p: ModuleRenderProps) =>
    createElement(
      "a",
      { className: p.className, href: resolveHref(p.props) || "#", ...linkAttrs(p.props), ...rootAttrs(p) },
      p.children ?? str(p.props.text)
    ),
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
    createElement("div", {
      className: p.className,
      dangerouslySetInnerHTML: { __html: str(p.props.html) },
      ...rootAttrs(p),
    }),
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
