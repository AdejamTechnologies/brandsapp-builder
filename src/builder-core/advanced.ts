import type { CSSProperties } from "react"

import type { ModuleRenderProps, PropSchema } from "./registry"

/**
 * The shared "advanced" capability set — four things every module gets for
 * free, mirroring how `LINK_SCHEMA`/`LINK_DEFAULTS` (see link.ts) give every
 * linkable module one consistent destination model instead of each
 * reinventing it:
 *
 *   elementId         → a real `id` on the published element, so the link
 *                       model's "section" destination (`#<id>`, see link.ts
 *                       resolveHref) has something to land on.
 *   customAttributes  → author-supplied `{ name, value }` pairs applied to the
 *                       root element, for the odd case a module's own schema
 *                       doesn't cover (a `data-*` hook some external script
 *                       expects, an `aria-*` override, …).
 *   keepInHtml        → when the node is authored `hidden`, render it anyway
 *                       (inert) instead of dropping it — see render.tsx.
 *   excludeFromSearch → emit `data-nosnippet` so crawlers skip the block.
 *
 * A module's own `schema`/`defaults` only need to spread these in when the
 * Inspector should surface them (see registry.ts modules); `rootAttrs` below
 * reads straight off resolved props regardless, so the capability still works
 * even for a module that didn't spread the schema fragment (e.g. set via
 * bindings, or a generic "Advanced" panel in the editor that isn't
 * per-module-schema-driven).
 */
export const ADVANCED_SCHEMA: PropSchema = {
  elementId: { type: "plain", label: "element id" },
  customAttributes: { type: "json", label: "custom attributes" },
  keepInHtml: { type: "boolean", label: "keep in HTML when hidden" },
  excludeFromSearch: { type: "boolean", label: "exclude from search" },
}

export interface CustomAttributeEntry {
  name: string
  value: string
}

export const ADVANCED_DEFAULTS: {
  elementId: string
  customAttributes: CustomAttributeEntry[]
  keepInHtml: boolean
  excludeFromSearch: boolean
} = {
  elementId: "",
  customAttributes: [],
  keepInHtml: false,
  excludeFromSearch: false,
}

/** Same boolean coercion every module's local `bool()` helper already uses. */
export function truthyProp(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1"
}

const ELEMENT_ID_RE = /^[A-Za-z][\w:.-]*$/

/**
 * Sanitise an author-supplied element id. HTML ids technically tolerate a wide
 * character set, but the id is meant to be TARGETABLE — by a CSS `#selector`,
 * by an in-page link's `#fragment` (see link.ts `resolveHref`'s "section"
 * case), by `document.getElementById`. All three choke on an id that doesn't
 * start with a letter or that contains whitespace/`#`/quotes/etc. Rather than
 * escaping (which would silently change the id from what the author typed —
 * and break any link already pointing at it), we just refuse anything unsafe:
 * dropping the id is safer than emitting one that doesn't actually work as an
 * anchor, or that could be abused to break out of the attribute it's in.
 */
export function sanitizeElementId(raw: unknown): string {
  const s = raw == null ? "" : String(raw).trim()
  return ELEMENT_ID_RE.test(s) ? s : ""
}

// Attribute NAMES refused outright, and why:
//  - `on*` (any case) — an event-handler attribute runs arbitrary JS the
//    instant the element mounts. This is THE reason inline handlers exist as
//    an attack vector; there is no safe value for one, so the name alone is
//    enough to reject it.
//  - `style` — a second, unsanitized CSS-injection point that bypasses the
//    style system's own escaping (and could be used to fake other elements'
//    positioning/visibility). Styling belongs in the node's style/classes.
//  - `id` / `class` / `data-node-id` — these are RENDERER/EDITOR-owned. `id`
//    is the dedicated `elementId` capability's job (so it goes through
//    `sanitizeElementId`, not raw author input); `class` is the style
//    system's; `data-node-id` is how the editor canvas maps a DOM element back
//    to its node for selection — letting a custom attribute clobber it would
//    silently break editor selection for that node.
// A few more React/DOM-reserved names are blocked defensively even though they
// aren't a security hole per se: `ref`/`key` are consumed specially by React
// itself (a string "ref" is legacy and can throw/warn), and
// `dangerouslysetinnerhtml`/`children` could otherwise fight the element's
// real children depending on how a module spreads its props.
const BLOCKED_NAMES = new Set([
  "style",
  "id",
  "class",
  "data-node-id",
  "ref",
  "key",
  "children",
  "dangerouslysetinnerhtml",
])
const EVENT_HANDLER_RE = /^on/i
// A plausible HTML/XML attribute name: letters/underscore/colon to start,
// then letters/digits/`-`/`_`/`:`/`.`. Rejects anything containing spaces,
// quotes, `=`, `<`, `>`, or other characters that have no business in an
// attribute name and could otherwise indicate a malformed/malicious entry.
const ATTR_NAME_RE = /^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/

/**
 * Filter + validate author-supplied custom attributes before they reach the
 * DOM. This is the dangerous capability — it lets an author (or, on a
 * multi-tenant marketplace, a fragment/template AUTHORED BY SOMEONE ELSE) put
 * arbitrary attributes on a published element — so it's written as a small,
 * pure, exported function specifically so it can be unit-tested on its own
 * rather than only indirectly through `rootAttrs`/rendering.
 *
 * Returns only the entries considered safe to render; everything else is
 * silently dropped (never "fixed up" — a rejected attribute has no safe
 * rewritten form worth guessing at).
 */
export function filterCustomAttributes(raw: unknown): CustomAttributeEntry[] {
  if (!Array.isArray(raw)) return []
  const out: CustomAttributeEntry[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const name = String((entry as Record<string, unknown>).name ?? "").trim()
    const value = String((entry as Record<string, unknown>).value ?? "")
    if (!name || !ATTR_NAME_RE.test(name)) continue
    const lower = name.toLowerCase()
    if (EVENT_HANDLER_RE.test(lower)) continue // onclick, onerror, onmouseover, …
    if (BLOCKED_NAMES.has(lower)) continue // renderer/editor/React-owned names
    if (/^\s*javascript:/i.test(value.trim().toLowerCase())) continue // javascript: URI in ANY attribute
    out.push({ name, value })
  }
  return out
}

/**
 * The shared root-attrs helper. Every module already spreads a local `ed(p)`
 * onto its root element for the editor's `data-node-id`; this REPLACES that
 * (same key, same editor-only behaviour) and adds the four advanced
 * capabilities on top, so there's exactly one place that knows how to turn
 * "hidden/hidden-but-kept, elementId, customAttributes, excludeFromSearch"
 * into real DOM attributes — not one reimplementation per module.
 *
 * Keys are only ever included when they apply (never emitted as `undefined`),
 * so spreading this into a module's own attrs object never clobbers something
 * the module set itself UNLESS the capability is actually active — e.g. a
 * module's own inline `style` survives untouched except in the `keptHidden`
 * case, where overriding it is exactly the point (the element is invisible
 * either way, so losing its layout style doesn't matter).
 */
/**
 * HTML attribute name → the prop name React wants for it.
 *
 * React keeps its own list of DOM properties and warns — "Invalid DOM property
 * `colspan`. Did you mean `colSpan`?" — for the lowercase HTML spelling of any
 * of them, once per element per render, in the editor canvas and in the
 * Worker log alike. An author (or the HTML importer, which carries `colspan`
 * through from a `<td>`) should not have to know React's spelling to avoid
 * that.
 *
 * React 19 no longer rewrites the name on the server: it emits the camelCase
 * prop verbatim, so the published markup says `colSpan="5"`. That is correct
 * HTML — attribute names are case-insensitive in every HTML parser — and
 * re-importing our own output normalises it, since the importer stores the
 * lowercase name. `htmlFor` is the one that is rewritten, to `for`.
 *
 * Only the names that actually differ are listed; everything else passes
 * through untouched.
 */
const REACT_ATTR_NAME: Record<string, string> = {
  for: "htmlFor",
  colspan: "colSpan",
  rowspan: "rowSpan",
  maxlength: "maxLength",
  minlength: "minLength",
  readonly: "readOnly",
  autocomplete: "autoComplete",
  autoplay: "autoPlay",
  playsinline: "playsInline",
  srcset: "srcSet",
  datetime: "dateTime",
  referrerpolicy: "referrerPolicy",
  crossorigin: "crossOrigin",
  tabindex: "tabIndex",
  accesskey: "accessKey",
  contenteditable: "contentEditable",
  spellcheck: "spellCheck",
  enctype: "encType",
  novalidate: "noValidate",
  formaction: "formAction",
  usemap: "useMap",
  hreflang: "hrefLang",
  marginwidth: "marginWidth",
  marginheight: "marginHeight",
  frameborder: "frameBorder",
  allowfullscreen: "allowFullScreen",
}

/**
 * Attributes whose PRESENCE is the value.
 *
 * `<input disabled>` and `<input disabled="disabled">` mean the same thing and
 * both arrive here with the empty string or the name as their value — and the
 * empty string is falsy, so React would render neither. These are passed as
 * `true` instead, which is how React spells "this attribute is present".
 */
const BOOLEAN_ATTRS = new Set([
  "checked", "disabled", "readonly", "required", "multiple", "selected",
  "open", "controls", "autoplay", "loop", "muted", "playsinline", "reversed",
  "novalidate", "allowfullscreen", "default", "ismap", "nomodule", "async",
  "defer", "hidden", "inert", "itemscope",
])

export function rootAttrs(p: ModuleRenderProps): Record<string, unknown> {
  const out: Record<string, unknown> = {}

  if (p.isEditor) out["data-node-id"] = p.nodeId

  const elementId = sanitizeElementId(p.props.elementId)
  if (elementId) out.id = elementId

  if (truthyProp(p.props.excludeFromSearch)) out["data-nosnippet"] = ""

  if (p.keptHidden) {
    // Belt AND braces: the `hidden` attribute is what a script/anchor should
    // rely on for "this exists but is inert", and browsers already default
    // `[hidden]` to `display:none` — but several modules (stack, grid, …) set
    // an explicit inline `display` themselves, which would otherwise win over
    // the attribute-driven UA rule. Force it here so it always actually hides.
    out.hidden = true
    const style: CSSProperties = { display: "none" }
    out.style = style
  }

  /**
   * A form control's initial content is `defaultValue`, not `value`.
   *
   * React treats `value`/`checked` on an input, select or textarea as a
   * CONTROLLED field and warns that it will render read-only unless an
   * `onChange` comes with it. A published page is static markup: what the
   * import read off `<input value="…">` is the field's starting content, which
   * is what `defaultValue` means, and it renders as the same `value=""`
   * attribute. Only these three tags behave that way — `value` on an
   * `<option>`, a `<button>` or an `<li>` is an ordinary attribute and is left
   * alone.
   */
  const tag = String(p.props.tag ?? "").toLowerCase()
  const controlled = tag === "input" || tag === "select" || tag === "textarea"

  for (const attr of filterCustomAttributes(p.props.customAttributes)) {
    const lower = attr.name.toLowerCase()
    let name = REACT_ATTR_NAME[lower] ?? attr.name
    if (controlled && lower === "value") name = "defaultValue"
    if (controlled && lower === "checked") name = "defaultChecked"
    const bare = attr.value === "" || attr.value.toLowerCase() === lower
    out[name] = BOOLEAN_ATTRS.has(lower) && bare ? true : attr.value
  }

  return out
}
