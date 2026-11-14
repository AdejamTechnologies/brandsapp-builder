/**
 * Escapers for the builder renderer. Dispatch is by a prop's DECLARED control
 * type (see registry PropSchema), never by guessing from its key name — the
 * single most important safety rule when rendering untrusted, marketplace-authored
 * trees (borrowed from Instatic).
 *
 * Dependency-free, because it runs on Cloudflare Workers. Rich HTML goes
 * through the ALLOW-list in ./sanitize-html — this file used to carry its own
 * block-list of tags and a ` on…=` regex, which let `<img src=x/onerror=…>`
 * through untouched and turned `<scr<script>ipt …>` into a working script
 * tag. SVG is allow-listed below for the same reason.
 */

import { sanitizeHtml as sanitizeRichHtml } from "./sanitize-html"

export type ControlType =
  | "plain"
  | "richtext"
  | "url"
  | "media"
  | "svg"
  | "number"
  | "boolean"
  | "select"
  | "color"
  | "json"

export function escapeHtml(value: unknown): string {
  const s = value == null ? "" : String(value)
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Allow only http(s), mailto, tel, relative, and anchor URLs. Blocks javascript:/vbscript:/data:. */
export function isSafeUrl(value: unknown): string {
  const s = value == null ? "" : String(value).trim()
  if (s === "") return ""
  if (/^(https?:|mailto:|tel:|\/|#|\.\/|\.\.\/)/i.test(s)) return s
  // bare domain or path without scheme is fine
  if (/^[a-z0-9]/i.test(s) && !/^[a-z][a-z0-9+.-]*:/i.test(s)) return s
  return "#" // unknown/dangerous scheme (javascript:, data:, vbscript:, …)
}

/** Media (image/video) src — same URL policy but data:image is allowed. */
export function safeMediaUrl(value: unknown): string {
  const s = value == null ? "" : String(value).trim()
  if (/^data:image\//i.test(s)) return s
  return isSafeUrl(s)
}

/** HTML sanitizer for `richtext` props — the shared allow-list. */
export function sanitizeHtml(value: unknown): string {
  return sanitizeRichHtml(value == null ? "" : String(value))
}

/**
 * The SVG an authored document may carry: shapes, paths, and nothing else.
 *
 * An allow-list, for the same reason the HTML one is. The block-list here
 * stripped three element names and used a ` on…=` regex that `onerror`
 * preceded by a slash walks straight past — and an SVG is a document that can
 * carry script, foreign HTML, external references and animation that sets an
 * attribute after the sanitiser has finished looking.
 *
 * Anything not named is dropped. `<use>` keeps only a local `#id` reference,
 * never a url: a remote `use` pulls a document from somebody else's server
 * into the page.
 */
const SVG_TAGS = new Set([
  "svg", "g", "defs", "symbol", "use", "title", "desc",
  "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "text", "tspan", "textPath",
  "linearGradient", "radialGradient", "stop", "clipPath", "mask", "pattern",
  "filter", "feGaussianBlur", "feOffset", "feBlend", "feColorMatrix",
  "feComposite", "feFlood", "feMerge", "feMergeNode", "marker",
])
const SVG_VOID = new Set([
  "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "stop",
  "use", "feGaussianBlur", "feOffset", "feBlend", "feColorMatrix",
  "feComposite", "feFlood", "feMergeNode",
])
/** Dropped WITH their contents: these carry script or foreign markup. */
const SVG_DROP_SUBTREE = new Set([
  "script", "style", "foreignObject", "animate", "animateTransform",
  "animateMotion", "set", "handler", "a", "image", "iframe", "audio", "video",
])
const SVG_ATTR = /^(d|cx|cy|r|rx|ry|x|y|x1|x2|y1|y2|width|height|points|transform|viewBox|preserveAspectRatio|fill|fill-rule|fill-opacity|stroke|stroke-width|stroke-linecap|stroke-linejoin|stroke-dasharray|stroke-dashoffset|stroke-opacity|stroke-miterlimit|opacity|class|id|xmlns|version|offset|stop-color|stop-opacity|gradientUnits|gradientTransform|spreadMethod|clip-path|clip-rule|mask|marker-end|marker-start|marker-mid|font-family|font-size|font-weight|text-anchor|dominant-baseline|letter-spacing|dx|dy|vector-effect|shape-rendering|patternUnits|filterUnits|in|in2|result|stdDeviation|mode|values|type|k1|k2|k3|k4|flood-color|flood-opacity|refX|refY|markerWidth|markerHeight|orient)$/i

const SVG_TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g
const SVG_ATTR_RE = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

export function sanitizeSvg(value: unknown): string {
  const input = value == null ? "" : String(value)
  if (!/^\s*<svg[\s>]/i.test(input)) return "" // must be an <svg> root
  const html = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
    .replace(/<![^>]*>/g, "")
    .replace(/<\?[\s\S]*?\?>/g, "")

  let out = ""
  let last = 0
  const stack: string[] = []
  let skipUntil: string | null = null

  SVG_TAG_RE.lastIndex = 0
  for (let m = SVG_TAG_RE.exec(html); m; m = SVG_TAG_RE.exec(html)) {
    const text = html.slice(last, m.index)
    last = m.index + m[0].length
    const closing = m[1] === "/"
    const raw = m[2] ?? ""
    const tag = SVG_LOOKUP.get(raw.toLowerCase()) ?? raw.toLowerCase()

    if (skipUntil) {
      if (closing && tag === skipUntil) skipUntil = null
      continue
    }
    if (text) out += text.replace(/&(?!#?\w+;)/g, "&amp;").replace(/</g, "&lt;")

    if (!closing && SVG_DROP_SUBTREE.has(tag)) {
      if (!m[4]) skipUntil = tag
      continue
    }
    if (!SVG_TAGS.has(tag)) continue

    if (closing) {
      const at = stack.lastIndexOf(tag)
      if (at === -1) continue
      while (stack.length > at) out += `</${stack.pop()}>`
      continue
    }

    let attrs = ""
    SVG_ATTR_RE.lastIndex = 0
    for (let a = SVG_ATTR_RE.exec(m[3] ?? ""); a; a = SVG_ATTR_RE.exec(m[3] ?? "")) {
      const name = a[1] ?? ""
      const lower = name.toLowerCase()
      const value2 = a[2] ?? a[3] ?? a[4] ?? ""
      if (lower === "href" || lower === "xlink:href") {
        // Local references only — never somebody else's document.
        if (!/^#[A-Za-z0-9_:.-]+$/.test(value2.trim())) continue
        attrs += ` ${lower}="${value2.trim()}"`
        continue
      }
      if (!SVG_ATTR.test(lower)) continue
      attrs += ` ${name}="${value2.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}"`
    }

    if (SVG_VOID.has(tag) || m[4]) out += `<${tag}${attrs}/>`
    else {
      out += `<${tag}${attrs}>`
      stack.push(tag)
    }
  }
  if (!skipUntil) {
    const tail = html.slice(last)
    if (tail) out += tail.replace(/&(?!#?\w+;)/g, "&amp;").replace(/</g, "&lt;")
  }
  while (stack.length) out += `</${stack.pop()}>`
  return out
}

/** SVG element names are case-sensitive; this restores the camelCase ones. */
const SVG_LOOKUP = new Map<string, string>(
  [...SVG_TAGS, ...SVG_DROP_SUBTREE].map((t) => [t.toLowerCase(), t])
)

/**
 * Sanitize a value for a React renderer according to its declared control type.
 *
 * NOTE: plain text is returned UNCHANGED — React escapes text children and
 * attribute values on its own, so pre-escaping here would double-encode. We only
 * actively sanitize the things React does NOT protect: attribute URLs (React will
 * happily emit `href="javascript:…"`) and raw HTML/SVG injected via
 * dangerouslySetInnerHTML by a module.
 */
export function escapeByControl(value: unknown, control: ControlType | undefined): unknown {
  switch (control) {
    case "richtext":
      return sanitizeHtml(value)
    case "svg":
      return sanitizeSvg(value)
    case "url":
      return isSafeUrl(value)
    case "media":
      return safeMediaUrl(value)
    default:
      return value // React escapes text/attrs; leave numbers/booleans/json/plain as-is
  }
}
