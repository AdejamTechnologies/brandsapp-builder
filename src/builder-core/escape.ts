/**
 * Escapers for the builder renderer. Dispatch is by a prop's DECLARED control
 * type (see registry PropSchema), never by guessing from its key name — the
 * single most important safety rule when rendering untrusted, marketplace-authored
 * trees (borrowed from Instatic).
 *
 * v1 is conservative and dependency-free (runs on Cloudflare Workers): rich HTML
 * and SVG are allow-list-ish sanitized by stripping scripts / event handlers /
 * javascript: URLs rather than a full DOMPurify pass. Tighten before enabling
 * user-pasted raw HTML at scale.
 */

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

// Remove these elements AND their contents (a bare tag-strip would leave the
// script body as visible text).
const STRIP_ELEMENTS = /<(script|style|iframe|object|embed|form|template|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi
// Remove remaining dangerous standalone/void tags.
const STRIP_TAGS = /<\/?(script|style|iframe|object|embed|link|meta|base|form)\b[^>]*>/gi
const STRIP_EVENT_ATTRS = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const STRIP_JS_URLS = /\s(href|src|xlink:href)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi

/** Conservative HTML sanitizer for `richtext` props. */
export function sanitizeHtml(value: unknown): string {
  const s = value == null ? "" : String(value)
  return s
    .replace(STRIP_ELEMENTS, "")
    .replace(STRIP_TAGS, "")
    .replace(STRIP_EVENT_ATTRS, "")
    .replace(STRIP_JS_URLS, "")
}

/** Conservative SVG sanitizer for `svg` props. */
export function sanitizeSvg(value: unknown): string {
  const s = value == null ? "" : String(value)
  if (!/^\s*<svg[\s>]/i.test(s)) return "" // must be an <svg> root
  return s
    .replace(/<(script|foreignObject|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(script|foreignObject|style)\b[^>]*>/gi, "")
    .replace(STRIP_EVENT_ATTRS, "")
    .replace(STRIP_JS_URLS, "")
}

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
