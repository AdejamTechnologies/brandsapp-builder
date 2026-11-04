/**
 * HTML → Doc importer — the "reproduce any external design as data, no redeploy"
 * capability (spec §8). Dependency-free + Worker-safe: a small stack tokenizer
 * (no DOM/parse5) maps common tags to primitives and inline `style=""` to node
 * styles. Best-effort by design — it gives an editable starting Doc, not a
 * pixel-perfect clone.
 */

import { DEFAULT_BREAKPOINTS } from "./migrate"
import { applyStylesheetToDoc } from "./import-css"
import { CORE_DOC_VERSION, type Doc, type Node } from "./schema"

const TAG_MODULE: Record<string, string> = {
  div: "box", section: "box", main: "box", header: "box", footer: "box",
  article: "box", nav: "box", aside: "box", figure: "box", ul: "box", ol: "box", li: "box",
  p: "text", span: "text", strong: "text", em: "text", small: "text",
  label: "text", figcaption: "text", blockquote: "text",
  h1: "heading", h2: "heading", h3: "heading", h4: "heading", h5: "heading", h6: "heading",
  a: "link", button: "button", img: "image",
}
const VOID_TAGS = new Set(["img", "br", "hr", "input", "meta", "link", "source", "area"])
const SKIP_TAGS = new Set(["script", "style", "head", "svg", "noscript", "template", "iframe"])
const TEXTY = new Set(["heading", "text", "link", "button"])
/**
 * Tags that map to `text` and must KEEP being what they were.
 *
 * `text` defaults to `<p>`, a block element. An empty `<span class="spacer">`
 * holding a flex row apart therefore came back as a paragraph and broke the
 * row — and `<strong>`/`<em>` inside a sentence became paragraphs mid-line.
 */
const TEXT_TAGS = new Set([
  "p",
  "span",
  "strong",
  "em",
  "small",
  "label",
  "figcaption",
  "blockquote",
])

/**
 * Elements that are the DOCUMENT, not content.
 *
 * A whole page arrives as `<html><body>…`, and `box` happily made real
 * `<html>` and `<body>` elements nested inside the page's own div — invalid
 * markup that browsers reparent, which is enough on its own to scatter a
 * layout. Their children are walked in their place; the stylesheet's `body{}`
 * rules are handled by `applyStylesheetToDoc`, which matches on the recorded
 * tag and not on an element existing.
 */
const TRANSPARENT_TAGS = new Set(["html", "body"])

/**
 * Modules that render their PROP and ignore their children.
 *
 * `text`, `heading` and `button` all declare `children: "none"` and their
 * Components return `str(props.text)` — so anything nested inside one is
 * parsed, stored in the document, and never drawn. Across 200 real pages that
 * silently swallowed 695 paragraphs, 423 images and 166 links: a heading with
 * an `<em>` in it, a paragraph containing a link, a `<blockquote><p>`. The
 * document looked right in the tree and the page was missing a third of
 * itself.
 *
 * So an element whose module is one of these and which HAS element children
 * becomes a `box` carrying its original tag instead. `<h2>` is still an
 * `<h2>`; it is just one that can hold what was inside it. `link` is absent
 * from this set deliberately — it renders `children ?? text` and can.
 */
const PROP_ONLY = new Set(["text", "heading", "button"])

interface El {
  tag: string
  attrs: Record<string, string>
  children: Array<El | string>
}

/**
 * Text arrives as raw source, so an entity would otherwise survive into a `text`
 * prop and the renderer — which escapes props, correctly — would print the entity
 * itself: real pages shipped reading "&copy; 2022". Only the handful HTML requires
 * plus numeric refs; anything else is left alone rather than guessed at.
 */
const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  middot: "·",
  bull: "•",
  laquo: "«",
  raquo: "»",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  times: "×",
  // The arrows a marketing page actually uses — "Learn more &rarr;" printed
  // the entity itself, which is the failure this map exists to prevent and
  // the only one the 200-page corpus still had.
  rarr: "→",
  larr: "←",
  uarr: "↑",
  darr: "↓",
  harr: "↔",
  deg: "°",
  euro: "€",
  pound: "£",
  yen: "¥",
}

export function decodeEntities(s: string): string {
  if (!s.includes("&")) return s
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
    }
    return NAMED[body.toLowerCase()] ?? whole
  })
}

function parseAttrs(str: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(str))) {
    const name = m[1].toLowerCase()
    let val = m[2] ?? ""
    if (val && (val[0] === '"' || val[0] === "'")) val = val.slice(1, -1)
    out[name] = val
  }
  return out
}

function parseStyleAttr(s: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const decl of s.split(";")) {
    const i = decl.indexOf(":")
    if (i < 0) continue
    const prop = decl.slice(0, i).trim()
    const val = decl.slice(i + 1).trim()
    if (prop && val) out[prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = val
  }
  return out
}

/**
 * The stylesheet the tokenizer walks past.
 *
 * `<style>` is in SKIP_TAGS because its contents are CSS, not markup — but
 * skipping the TAG should not mean throwing away the DESIGN. Every generated
 * template hangs its entire look off one of these blocks, so it is collected
 * here and resolved onto the nodes afterwards by import-css.ts.
 */
export function extractStylesheets(html: string): string {
  const out: string[] = []
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) out.push(m[1])
  return out.join("\n")
}

function tokenize(html: string): El[] {
  const root: El = { tag: "#root", attrs: {}, children: [] }
  const stack: El[] = [root]
  const skip: string[] = []
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>|([^<]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const [full, closing, rawTag, attrStr, selfClose, text] = m
    if (text != null) {
      if (skip.length) continue
      const t = text.replace(/\s+/g, " ")
      if (t.trim()) stack[stack.length - 1].children.push(t)
      continue
    }
    if (full.startsWith("<!--") || !rawTag) continue
    const tag = rawTag.toLowerCase()
    if (closing) {
      if (skip.length && skip[skip.length - 1] === tag) skip.pop()
      else if (!skip.length) {
        for (let i = stack.length - 1; i > 0; i--) {
          if (stack[i].tag === tag) {
            stack.length = i
            break
          }
        }
      }
      continue
    }
    if (SKIP_TAGS.has(tag)) {
      if (!selfClose && !VOID_TAGS.has(tag)) skip.push(tag)
      continue
    }
    if (skip.length) continue
    const el: El = { tag, attrs: parseAttrs(attrStr ?? ""), children: [] }
    stack[stack.length - 1].children.push(el)
    if (!VOID_TAGS.has(tag) && !selfClose) stack.push(el)
  }
  return root.children.filter((c): c is El => typeof c !== "string")
}

export function htmlToDoc(html: string): Doc {
  const nodes: Record<string, Node> = {}
  /** id → original tag, so `body`/`h2`/`li` selectors can be resolved. */
  const tags: Record<string, string> = {}
  let counter = 0
  /**
   * Ids unique to THIS import, not just within it.
   *
   * A node's style is emitted as `.n-<id>` (see `classForNode`), and the ids
   * used to restart at `i0` for every document — so two imported blocks on one
   * page both defined `.n-i4`, with different declarations, and the last one
   * rendered won for both. In the Sections panel, where a dozen previews share
   * a DOM, that is every block after the first wearing another block's layout:
   * 26 of 49 generated classes were defined more than once, one of them 24
   * times. It looks like the import is broken and is a name collision.
   *
   * A short random prefix per import costs nothing and ends the whole class of
   * problem — previewing, inserting two blocks into one page, or inserting the
   * same block twice.
   */
  const prefix = Math.random().toString(36).slice(2, 8)
  const nextId = () => `${prefix}${(counter++).toString(36)}`

  /**
   * Walk an element into `out`.
   *
   * Returns ids rather than one id because `<html>` and `<body>` contribute
   * their CHILDREN and no element of their own.
   */
  const walkInto = (el: El, out: string[]): void => {
    if (TRANSPARENT_TAGS.has(el.tag)) {
      for (const c of el.children) if (typeof c !== "string") walkInto(c, out)
      return
    }
    out.push(walk(el))
  }

  const walk = (el: El): string => {
    /**
     * Children that will actually be DRAWN — `<svg>`, `<script>` and the rest
     * of SKIP_TAGS are parsed and thrown away, so an `<a><svg/>Label</a>` has
     * no renderable element child and keeps its label on the prop.
     */
    const elementKids = el.children.filter(
      (c): c is El => typeof c !== "string" && !SKIP_TAGS.has(c.tag)
    )
    const hasElementChildren = elementKids.length > 0

    let module = TAG_MODULE[el.tag] ?? "box"
    // See PROP_ONLY: a module that draws only its prop cannot hold children.
    if (PROP_ONLY.has(module) && hasElementChildren) module = "box"
    const id = nextId()
    const props: Record<string, unknown> = {}
    const children: string[] = []
    const style = el.attrs.style ? parseStyleAttr(el.attrs.style) : undefined
    // Preserve utility classes (Tailwind/Preline) — the renderer turns them into
    // CSS at render time (UnoCSS), so an imported block keeps its styling.
    let classes = el.attrs.class?.trim() || undefined

    // Keep the original tag on box elements (ul/li/section/nav/…) so structure —
    // and CSS that targets real tags (e.g. daisyUI menu/breadcrumbs) — is faithful.
    if (module === "box" && el.tag !== "div") props.tag = el.tag
    // Imported markup was authored against Tailwind's PREFLIGHT, which strips a
    // list's markers and indent. Our generator runs preflight OFF, so an imported
    // <ul> arrives with UA bullets and a 40px indent it never had at the source.
    // Only applied when the author set no list-style of their own.
    if ((el.tag === "ul" || el.tag === "ol") && !/\blist-/.test(el.attrs.class ?? "")) {
      classes = `list-none m-0 p-0 ${classes ?? ""}`.trim()
    }
    if (module === "heading") props.level = el.tag.replace("h", "")
    // See TEXT_TAGS: a `<span>` that comes back as a `<p>` is a broken row.
    if (module === "text" && TEXT_TAGS.has(el.tag)) props.tag = el.tag
    if (module === "image") {
      props.src = el.attrs.src ?? ""
      props.alt = el.attrs.alt ?? ""
    }
    if (module === "link" || module === "button") props.href = el.attrs.href ?? ""

    const text = decodeEntities(
      el.children
        .filter((c): c is string => typeof c === "string")
        .join(" ")
        .trim()
    )
    /**
     * Its own words — and the empty case, which is the one that bit.
     *
     * The prop was only set when there WERE words, and the renderer merges a
     * module's defaults under the node's props: an empty `<span>` therefore
     * rendered the word "Text", an empty `<a>` rendered "Link". Spacers,
     * icon-only buttons and decorative rules all came back with a word in
     * them. Set always, empty included.
     *
     * A TEXTY element that also has ELEMENT children keeps its words as a
     * child instead, because `link` renders `children ?? text` — so a logo
     * link (`<a><img>Backlot</a>`) silently lost the brand name, which is the
     * sort of thing that reads as a design decision rather than a bug.
     */
    const textAsChild = TEXTY.has(module) && hasElementChildren && !!text
    if (TEXTY.has(module)) {
      if (module === "button") props.label = textAsChild ? "" : text
      else props.text = textAsChild ? "" : text
    }
    /**
     * Children, in source order — and text among them.
     *
     * The loop used to keep only ELEMENT children, which quietly threw away
     * every word held by a tag that maps to `box`. Importing a pricing block
     * produced the section, the grid, the cards and their borders, with the
     * prices and the feature lists gone: `<div class="price">$18</div>` became
     * an empty box, and `<li>Custom domain</li>` became nothing at all. The
     * markup rendered, so the audit called it clean.
     *
     * TEXTY modules already carry their words as a prop, so their strings are
     * skipped here to avoid printing them twice. Everything else gets a real
     * `text` child, in place, which also keeps mixed content ("Cancel
     * <b>whenever</b> you like") in the order it was written.
     */
    for (const c of el.children) {
      if (typeof c !== "string") {
        walkInto(c, children)
        continue
      }
      // Its words are on the prop, unless they had to become a child.
      if (TEXTY.has(module) && !textAsChild) continue
      const chunk = decodeEntities(c).trim()
      if (!chunk) continue
      const textId = nextId()
      nodes[textId] = {
        id: textId,
        module: "text",
        /**
         * A `span`, not the module's default `p`.
         *
         * This node exists because a run of text sat BESIDE an element —
         * "Cancel <b>whenever</b> you like", or a brand name next to its logo.
         * A paragraph there breaks the line it belongs to, and inside an `<a>`
         * it puts a block element inside an inline one. It was already
         * recorded as a span for selector matching; this makes it render as
         * one too.
         */
        props: { text: chunk, tag: "span" },
        styleIds: [],
        children: [],
      }
      tags[textId] = "span"
      children.push(textId)
    }
    nodes[id] = { id, module, props, styleIds: [], children, ...(style ? { style } : {}), ...(classes ? { classes } : {}) }
    tags[id] = el.tag
    return id
  }

  const rootId = nextId()
  const rootChildren: string[] = []
  for (const el of tokenize(html)) walkInto(el, rootChildren)
  nodes[rootId] = { id: rootId, module: "page-root", props: {}, styleIds: [], children: rootChildren }
  /**
   * The page root IS the body, as far as the stylesheet is concerned.
   *
   * `<body>` no longer becomes an element (see TRANSPARENT_TAGS), so without
   * this there is nothing for `body{background;color;font-family;line-height}`
   * to resolve onto — and that rule is the ground every imported page is drawn
   * on. Recording the tag here lets `applyStylesheetToDoc` match it the normal
   * way and put the declarations on the root, which wraps everything.
   */
  tags[rootId] = "body"

  const doc: Doc = {
    version: CORE_DOC_VERSION,
    rootId,
    nodes,
    styles: {},
    theme: { colors: {}, fonts: {}, radius: {}, breakpoints: DEFAULT_BREAKPOINTS },
    meta: {},
  }

  // The design, not just the structure. Failure here must not lose the import:
  // an unstyled but correct tree is a usable starting point, a thrown parser
  // is not.
  const css = extractStylesheets(html)
  if (css.trim()) {
    try {
      const result = applyStylesheetToDoc(doc, css, tags, (px) => {
        // Widest breakpoint at or under the query, so `max-width: 880px` lands
        // on the tablet slot rather than inventing one.
        const candidates = DEFAULT_BREAKPOINTS.filter(
          (b) => typeof b.maxWidth === "number" && b.maxWidth <= px
        )
        return candidates.sort((a, b) => (b.maxWidth ?? 0) - (a.maxWidth ?? 0))[0]?.id
      })
      if (result.residual.trim()) {
        doc.meta = { ...(doc.meta ?? {}), residualCss: result.residual }
      }
    } catch {
      // keep the structural import
    }
  }

  return doc
}
